# 프론트엔드 기능 변경 내역 — `d646947` → 현재

> 기준 커밋 `d646947` (*Merge pull request #16 from zoecodes-dev/feature/eunjin*, 2026-06-26) 이후 현재까지의 **기능 변화**를 정리한 문서입니다. (파일 단위가 아니라 기능 단위로 서술)

## 0. 요약

| 항목 | 값 |
|---|---|
| 비교 범위 | `d646947 .. HEAD` |
| 커밋 수 | 219 |
| 변경 파일 | 76 files |
| 라인 변동 | **+5,751 / −8,195** |

한 줄 요약: **목업(mock)·하드코딩 화면을 실 백엔드 데이터로 전면 배선**하고, **공급망 맵 워크스페이스(5-STEP)**·**협력사 표준 입력양식 공유**·**HITL/규제 검증 통합**을 중심으로 재편. **DPP Center·실사관리 페이지는 제거**.

---

## 1. 공급망 맵 워크스페이스 (가장 큰 변화)

협력사 맵을 "조회"가 아니라 **단계별로 생성·검증하는 워크스페이스**로 재설계.

### 맵 생성 진입
- **공급망 목록(랜딩)** 신설 — 생성된 공급망을 **제품 × 고객사 × 단위기간(생산 Lot)** 단위로 묶어 표시, 제품·고객사·단위기간 범위 필터 + 진행 상태 컬럼.
- **맵 생성 게이트** — `제품 · 고객사 · 단위기간` **3개 드롭다운**(고객사→제품→Lot cascading)으로 고른 뒤 '맵 생성'으로 진입.
- **맵 헤더 패널** — 목록 하단에 `supply_chain_maps`(맵 그 자체) 목록·완료/작성중 상태 토글.

### 5-STEP 스텝바
- STEP1 제품 선택 → STEP2 **Pool**(선택 제품의 **tier-1(hop_level=1) 협력사**로 한정) → STEP3 **협력사 확인(백엔드 verify 영속)** → STEP4 **최종 검증(환경성적서/탄소발자국 실데이터, PDF 업로드)** → STEP5.
- **순차 게이팅**: 앞 단계 미완료 시 다음 단계 비활성, 완료 색상 표시.
- **흐름 안내 배너** — 현재 단계·다음 할 일 명시.

### 맵 화면(트리/표)
- **노드 상세를 인라인 카드로** — 기존 팝업/`MapDetailPanel`(선택 노드 상세 정보) 제거, 표준폼 헤더/요약 한 줄 고정.
- **맵 화면 셀렉터에 고객사 추가** + 게이트에서 고른 **버전(Lot) 고정**(첫 버전으로 덮이던 버그 수정).
- **트리 엔진을 주입식 `dataset` 구조로 전환** + BOM 트리→평면 3배열 어댑터(`normalizeProductBom`), `hop_level` 기반 차수.
- **제출 데이터 export** — `exceljs`로 진짜 `.xlsx`(셀 서식), 고객사 데이터(실 고객사명·전체 공급망).

### 데이터 계약(동의서)
- **데이터 계약 동의서 UI** + STEP4 **동의 게이트**, 동의서 발송을 정보입력요청 메일 화면에 통합(`DataConsentModal`).

---

## 2. 협력사 정보·입력 (표준 양식 공유)

### 표준 양식 공유 (`SupplierGeneralReview`)
- **기업정보(확인) ↔ 자료제출(입력)이 동일 표준 양식을 공유** — 화면 전환이 아니라 셀을 입력칸으로 토글(`editable`).
- **5섹션으로 재구성**: 기업 기본정보 · 소재 구성(Li/Co/Ni) · 공장 정보 · 규제(탄소·실사 자가진단) · 필요문서.
- **전 섹션 영속화** — `저장하기`(편집 유지)/`제출하기`(보기 복귀) 모두 DB 영속(cross-table PATCH), provider_type·자가진단은 셀렉트.
- **기업정보·자료제출을 한 페이지로 통합**(내부 view↔input 토글).

### 실데이터 배선
- **포털 스코프를 로그인 토큰의 `supplier_id`로** (하드코딩 협력사 제거).
- 사업장·인증서·연락처·공장·완성도·공급품목·원산지 등 **6개 섹션 전부 실 백엔드(UUID 호출)**.
- 입력현황 보드를 실 `getSuppliers` + `completeness`로 배선.

### 실사관리 페이지 제거
- **실사관리(audit) 페이지 삭제** → 기능을 '내 기업 정보'의 **문서 업로드/확인**(실사 자가진단 보고서·사업자등록증·환경성적서)으로 통합.
- 업종 필드 **`supplierType` → `providerType`** 리네임(백엔드 정합), `smelter`=제련소 추가.

---

## 3. HITL / 규제 검증 통합

- **협력사 승인(HITL)을 자기완결 모듈로** — 대시보드·My Task에서 동일 동작, `hitl_reviews` 연동.
- **AI 파싱 뷰(`AiParsingView`) 공통 모듈화** — 검토 클릭 시 AI 판정 결과 + 파싱 뷰 함께 모달 표시.
- **규제 검증 결과를 실데이터로** — 자재명(제품명 그대로) 표시, HITL 후보 → My Task 연결.
- 대시보드에 **협력사 승인(HITL) 검토 카드** / **규제 검증 결과 카드** 추가.

---

## 4. My Task 재편 (업무 분장 허브)

- **My Task를 업무 분장 허브로 재편** — `자료요청(+추가) · HITL · 공급망 실사` 구역.
- **자료 요청**을 실 백엔드 `GET/POST /data-requests`에 배선 — 발송 루프 닫기, 협력사별 연락처 반영, 누락 건수 실데이터.
- **입력 현황 → 자료 요청** 자연스러운 흐름 연결(협력사 입력현황을 My Task 탭으로 이관, 사이드바 협력사 드롭다운 제거).
- 정보확인 + 자료요청을 **한 페이지로 통합** — 섹션별 인라인 보완 요청.

---

## 5. 제거된 기능 / 화면

- **DPP Center 제거** — Readiness/HITL/발행이력을 통합했다가 최종적으로 개별 뷰(`ReadinessView`·`HitlView`·`HistoryView`)와 `app/dpp/center` 페이지 삭제.
- **실사관리(`AuditView`) 제거** (위 §2).
- **중복 화면 정리** — Invitation 작성 페이지(→허브 팝업으로 일원화), 자료요청 업무 보드(→My Task 흡수), 중복 "공급망 맵 형성하기"(/bom-trace) 라우트 제거.
- 참고 문서 정리 — `docs/references/schema.sql`·`seed.sql`·`front.html`·API 명세서 등 제거, `docs/BACKEND_INTEGRATION_NEEDED.md` 추가.

---

## 6. 디자인 / 레이아웃 / 인증

- **색 토큰 시스템 정의** — raw Tailwind 상태색·하드코딩 그린을 토큰 채널로 전면 치환.
- **공통 `PageHeader`로 상단 통일** (TabBar 도입 후 제거), 풀폭 레이아웃·탭 글자 통일·본문 세로 스택.
- **실제 로그인(`/auth/login`) 연동** + `lib/api.ts`를 실제 구현된 백엔드 엔드포인트 기준으로 정합(§10.2a 맵 실데이터 포함).

---

## 7. 주요 신규/삭제 컴포넌트

| 신규 | 삭제 |
|---|---|
| `app/suppliers/check-info/SupplierGeneralReview.tsx` (표준 양식) | `components/supplier/AuditView.tsx` (실사관리) |
| `components/supply-chain/SupplyChainMapsPanel.tsx` (맵 헤더) | `components/dpp-center/HitlView·HistoryView·ReadinessView.tsx` |
| `components/supply-chain/DataConsentModal.tsx` (데이터 계약) | `app/dpp/center/page.tsx` (DPP Center) |
| `components/supply-chain/ConnectedSuppliersModal.tsx` | `docs/references/schema.sql`·`seed.sql`·`front.html` |
| `components/dashboard/HitlReviewCard.tsx`·`RegulationResultsCard.tsx` | (각종 참고 .md) |
| `components/suppliers/SupplierInputStatusBoard.tsx` | |

---

*생성: `git diff d646947 HEAD` 기준 자동 정리 (커밋 219개).*
