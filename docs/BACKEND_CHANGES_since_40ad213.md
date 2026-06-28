# 백엔드 변경 내역 — `40ad213` → 현재(`44ff9f7`)

> 기준 커밋 `40ad213` (*Merge pull request #215 from zoecodes-dev/feature/cy*) 이후 현재 HEAD까지의 백엔드 변경을 상세 정리한 문서입니다.

## 0. 요약

| 항목 | 값 |
|---|---|
| 비교 범위 | `40ad213 .. 44ff9f7` |
| 커밋 수 | 약 50개 |
| 변경 파일 | 69 files |
| 라인 변동 | **+1,599 / −2,837** |

핵심 방향:
- **DPP 도메인 전면 제거** + **alembic 마이그레이션 제거**(스키마는 `docker/01_schema.sql` 직접 관리로 일원화)
- **협력사(supplier) 마스터폼·기업정보 입력 영속화 대폭 확장** (소재·규제·문서·기본정보 cross-table 저장)
- **공급망 맵을 1급 엔티티로 ID화**(`supply_chain_maps` 헤더 도입, 엣지 PK `map_id`→`edge_id` 개명)
- **제3자 정보제공 동의서를 데이터 계약(Data Contract) 모델로 재정의**(`data_consent` 도메인 신설, Catena-X 정렬)
- **HITL 협력사 승인 / 규제 검증 결과 근거(인용 조항·추론) 노출** 등 검증 파이프라인 보강

---

## 1. 구조적 변경 (도메인 추가·제거)

### 1-1. DPP 도메인 제거
`backend/domains/dpp/*` 전부 삭제 (~1,400 라인):
- `models.py`(219), `repository.py`(261), `router.py`(251), `service.py`(505), `delivery_service.py`(118), `state_machine.py`(62), `immutable_guard.py`(21), `README.md`(79)
- 관련: `backend/main.py`에서 라우터 등록 제거, `backend/events/types.py` 정리, `requirements.txt` 항목 제거

### 1-2. alembic 마이그레이션 제거
`alembic/` 전체 삭제 (`3b82b3c refactor: dpp 도메인 및 alembic 마이그레이션 제거, 도메인 정리`)
- `env.py`, `script.py.mako`, `versions/0001~0007_*` 제거
- 스키마 변경은 **`docker/01_schema.sql` 직접 편집 + 라이브 `ALTER`** 로 관리하는 방식으로 통일

### 1-3. `data_consent` 도메인 신설
`dpp/__init__.py` → `data_consent/`로 전환하며 신규 구성:
- `models.py`(65), `repository.py`(92), `router.py`(58), `service.py`(32)
- 의미: **제3자 정보제공 동의서 = 데이터 계약(Data Contract)** 으로 모델링. 스키마에 `data_provision_consents` 테이블 추가.
- 커밋: `2625c7b feat(data-consent): 제3자 정보제공 동의서 = 데이터 계약(Data Contract) — Catena-X 정렬`

### 1-4. files 도메인 보강
- `files/router.py`(+12), `service.py`(+20), `repository.py`(+13): **context별 파일 목록 조회** 추가(환경성적서 첨부 확인용)
- 커밋: `799bff5 feat(files): context별 파일 목록 조회 [REVERT-NON-SUPPLIER]`
- 스키마에 `files` 테이블 추가(기존 alembic 0003에서 schema.sql로 이전)

---

## 2. 스키마 변경 (`docker/01_schema.sql`, +189/−)

### 추가된 테이블
| 테이블 | 용도 |
|---|---|
| `files` | 공통 파일 업로드 메타 |
| `data_provision_consents` | 제3자 정보제공 동의 = 데이터 계약 |
| `supply_chain_maps` | **공급망 맵 헤더(맵 그 자체, `map_id` PK)** |

### 제거된 테이블
- `dpp_records` (DPP 도메인 제거)

### `suppliers` 테이블 확장 (협력사 마스터폼)
- `provider_type` CHECK에 **`smelter`** 추가 → `('manufacturer','recycler','trader','miner','smelter')`
- `smelter_type VARCHAR(20)` CHECK `('rmi','private')` — smelter 세부 구분(RMI 인증/사설)
- `core_minerals JSONB` — 소재 구성 핵심광물 함량(%) `{"Li":..,"Co":..,"Ni":..}`
- `country VARCHAR(2)` — 소재 국가(ISO 3166-1 alpha-2)
- `business_reg_doc_url VARCHAR(500)` — 사업자등록증 업로드 URL
- `environmental_report_url VARCHAR(500)` — 환경성적서 업로드 URL
- `self_assessment_doc_url VARCHAR(500)` — **실사 자가진단 보고서 업로드 URL**(내 기업 정보에서 제출·확인)

### `risk_profiles`
- `self_reported_risk_level` — 실사 자가진단(고/중/저, `low/medium/high/critical/unknown`)

### `supply_chain_map` / `supply_ratio` (엣지 ID 개명)
- `supply_chain_map.map_id`(엣지 PK) → **`edge_id`** 로 개명
- `supply_chain_map.map_id` 를 `supply_chain_maps(map_id)` **헤더 FK** 로 재정의
- `supply_ratio.map_id` → `edge_id` (FK `supply_chain_map(edge_id) ON DELETE CASCADE`)

### `users`
- `supplier_id` 추가 — 협력사 계정 ↔ supplier 매핑

---

## 3. 시드 변경 (`docker/02_seed_data.sql`, +156/−)

- **제품명 정정**: OEM 차종 제거 → 자사 브랜드+사양 (`KIRA PRiMX Prismatic NCM 94Ah` 등), `customer_id`(BMW/Mercedes)·`model_name`(납품 차종) 분리 — `73abb52`
- **제조사 정정**: 제품 manufacturer_id 를 KIRA(원청·팩 제조사)로 — `c30126a`
- **데모 협력사 = 한양셀**, `users.supplier_id` 매핑 (`supplier@hanyang-cell.com`) — `4fdf3b7`
- **smelter 재분류**: 제련·정제소를 `provider_type=smelter`(RMI 기준)로, EQS 공급망에 제련소 삽입(광산은 smelter 하위) — `ff2addf`, `a912198`
- **공급망 맵 헤더 백필** + 엣지 `edge_id` 정합 — `483a200`
- **§10.2a 맵 기간/created_at 채움** — `51f9e5e`
- **FEOC 예시 → EU 배터리 탄소발자국 위반**(실 추출 근거) — `41eff3a`

---

## 4. 도메인별 상세

### 4-1. supplier (`models.py`+145, `repository.py`+166, `router.py`+93, `service.py`+94)
협력사 기업정보 입력·조회·검증을 대폭 확장.
- **PATCH `/suppliers/{id}/detail`** — '자료 제출' cross-table 영속화(소유 테넌트만). 보낸 필드만 갱신하며 테이블별 분배:
  - suppliers 컬럼(기본정보·소재 `core_minerals`·문서 doc_url 3종) / `manufacturer_details`(탄소집약도·에너지원) / `risk_profiles`(실사 자가진단) — `9076f04`, `253f6fe`, `44ff9f7`
- **마스터폼 수집항목 확장**: provider_type `smelter`(rmi/private) `02549ab` · 소재 구성(Li/Co/Ni) `f3dd21b` · 실사 자가진단 `c46a76b` · 필요문서 업로드 URL `968489c` · 소재 국가 `22d3532`
- **실사 자가진단·필요문서 업로드 영속화**: `self_assessment_doc_url` 추가, `SupplierDetailResponse`/`SupplierDetailUpdateRequest`에 doc_url 3종 노출 — `44ff9f7`
- **조회 엔드포인트 추가**: `/completeness`(입력 완성도) `bf205b0` · `/contacts`(담당자) `dddd62f` · 원산지 증빙·공급 품목 `dfe3491` · 환경성적서(탄소발자국) `0c7fd70`
- **협력사 목록에서 원청(자기 회사) 제외** — `262b82b`
- `SupplierDetailResponse`에 기업 기본정보 필드 노출 — `923e81b`

### 4-2. supplychain (`models.py`+27, `repository.py`+166, `router.py`+75, `service.py`+40)
- **공급망 맵 헤더(`supply_chain_maps`) 도입** + 엣지 PK `map_id`→`edge_id` 개명 — `483a200`
- **맵 헤더 관리 API** (`GET /supply-chain/maps`, `GET/PATCH /maps/{map_id}`) + 신규 엣지 헤더 자동연결 — `bb302a4`
- **§10.2a 맵 응답 보강**: `hop_level`(차수 SSOT) `3473881` · `part_name`·`part_code` `d6aa3b3` · 납품 단위기간·created_at `51f9e5e`
- **협력사 확인(verify) 엔드포인트** — `c30126a`
- 비-supplier 폴더라 변경부에 `[REVERT-NON-SUPPLIER]` 마킹

### 4-3. submission (`router.py`, `service.py`, `repository.py`, `models.py`)
- **HITL 협력사 승인** — AI 추출 조회 엔드포인트 + `hitl_reviews` 연결 — `bd65564`, `b293ea5`
- **자료요청 누락 건수(`missing_count`)** 계산 — `4e1856d`
- `POST /data-requests` 요청자를 토큰에서 추론 — `faf40de`
- `masterform.py`(94) 제거 — supplier 도메인으로 이관

### 4-4. product (`repository.py`+55, `models.py`, `service.py`)
- `ProductBrief`/응답에 **`customer_name`**(customers 조인) — `3474e45`
- `get_bom_tree` 404 수정 — root_nodes를 앵커(depth=0) 기준으로 — `42b9e7e`

### 4-5. regulation (`repository.py`)
- 검증 결과에 **`cited_clauses`·`reasoning_text`**(인용 조항·추론) 반환 — `58621c3`
- material 을 제품명으로(products 조인) — `aedeaee`
- 검증 신뢰도를 `compliance_results` 기준으로 정합(추출항목 신뢰도와 일치) — `dbaf2d8`
- `regulation-results` 쿼리 `:param::uuid` 구문오류 수정 — `72f56b9`

### 4-6. verification (`router.py`−82, `service.py`)
- 라우터 슬림화·서비스 정리(검증 파이프라인 리팩터)

### 4-7. users / auth
- `users.models` `supplier_id` 추가, `users/router` 보강
- **협력사 계정 ↔ supplier 매핑**(`users.supplier_id`) + 데모 협력사 한양셀 — `4fdf3b7`

---

## 5. 인프라 / 기타

- **agents 데드락 수정**: `setup_graph` 멀티워커 부팅 데드락 해결 — `11bf598` (`agents/graph.py`, `agents/automation.py` 대폭 정리)
- `backend/events/types.py`(−58) DPP 이벤트 제거
- `backend/infrastructure/acl.py`, `queue.py` 소폭 조정
- `docker-compose.yml`(+12/−), `nginx/nginx.conf`, `ci/check_ec2_flow.py` 소폭 변경
- `requirements.txt` 항목 1건 제거

---

## 6. 마킹 규칙 참고

비-supplier 백엔드/agent 폴더 변경에는 `[REVERT-NON-SUPPLIER]` 마커가 줄/블록 단위로 부착되어 있습니다(최종 작업 시 일괄 처리용). `docker/01_schema.sql`·`02_seed_data.sql`·`backend/domains/supplier/*` 는 마킹 대상에서 제외됩니다.

---

*생성: `git diff 40ad213 HEAD` 기준 자동 정리.*
