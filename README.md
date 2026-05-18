# Battery DPP Dashboard

배터리 DPP 규제 대응 시스템의 시연용 대시보드입니다. Next.js 14 + TypeScript + Tailwind 기반으로 제작되었으며, Vercel에 즉시 배포 가능합니다.

## 페이지 구성

사이드바는 3개 섹션으로 분리되어 있습니다:

### 관제 · 모니터링 (ESG팀 일상 업무)
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | 대시보드 | 전체 현황 KPI · 일별 처리량 · Tier 5단계 분포 · 실시간 처리 배치 |
| `/supply-chain` | **공급망 맵** | 통합 검색 · 필터 · 권한 시뮬 · 노드 클릭 시 6탭 모달 |
| `/queue` | 검증 대기열 | LangGraph 8단계 워크플로우 진행 상황 |

### 의사결정 · 발행
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/hitl` | HITL 검토 | 신뢰도 미달·회색지대 사례 검토 · 승인/반려 |
| `/dpp` | DPP 발행 이력 | 발행된 배터리 여권 카드 뷰 |

### 감사 · 외부
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/audit` | 감사 추적 | Provenance 로그 기반 의사결정 경로 |
| `/portal` | 협력사 포털 | 협력사 데이터 입력 (부품·원자재·제조공정도·증빙) |

## Tier 구조 (5단계, 물품 추적 관점)

협력사가 아니라 **부품 계층**을 기준으로 Tier가 매겨집니다. 한 협력사는 여러 Tier 부품을 다룰 수 있어요 (`supplier.tiers` 배열).

| Tier | 부품 계층 | 시연 데이터 |
|------|----------|------------|
| T1 | Pack / Module | Hanyang Cell (T1+T2 통합) |
| T2 | Cell | Hanyang Cell |
| T3 | 활물질 (양/음극재) | POS Cathode, Yantai, Mitsui |
| T4 | 전구체 · 정제 | QZ Precursor, Pilbara, Ganzhou |
| T5 | 원광 | Nori, Kat Cobalt, Xinjiang |

맵 레이아웃: 왼쪽 T5 원광 → 오른쪽 T1 Pack/Module 흐름 (4컬럼 시각화).

## 공급망 맵 (`/supply-chain`) 상세 기능

### 통합 검색
검색창 아래에 **인라인 결과 패널**이 펼쳐집니다. 검색 대상:
- **협력사** (이름·ID·역할·지역·CEO·사업자번호)
- **PO/송장** (PO번호·협력사 부품 코드·원청 부품 코드)
- **부품·HS코드** (부품명·HS코드·소재 분류)
- **담당자** (이름·이메일·역할)
- **원산지국** (ISO 2자리)

결과 클릭 시 해당 협력사 모달 + **관련 탭으로 자동 점프**:
- 협력사 → 데이터·리마인드 탭
- PO/부품 → 공급 부품·PO 탭
- 담당자 → 기업·담당자 탭
- 국가 → 공장 탭

### 필터 칩
- **상태**: 검증 완료 / 검토 대기 / 추가 확인 / 규제 위반
- **Tier**: T1 Pack/Module / T2 Cell / T3 활물질 / T4 전구체·정제 / T5 원광
- **국가**: 시연 데이터에 등장하는 국가별

### 권한 시뮬레이션 토글
페이지 우상단의 **"원청 ESG" ↔ "1차 협력사"** 토글로 시점 전환.
- 원청 ESG: 모든 Tier 협력사 풀 액세스
- 1차 협력사 (Hanyang Cell 시점): 직상위·직하위만 보임. 옆 라인은 맵에서 흐리게 표시 + 모달 클릭 시 "접근 권한 없음" 차단

### 노드 클릭 시 모달 (탭 6개, 위험 우선)
1. **데이터·리마인드** (기본 탭) — 완성도 %·누락 항목·SLA 2주 리마인드 이력
2. **공급 부품·PO** — PO/송장 단위 부품 매핑·협력사↔원청 코드·HS코드·단가·원산지·공급 비율
3. **인증·공정** — ISO/IRMA/IATF 만료 추적·제조공정도 단계별 (외주 표시)
4. **공장(사업장)** — 본사 vs 생산공장 분리·좌표·가동 기간·월 생산능력
5. **상하위 관계** — 직상위·직하위 협력사 (권한 시뮬 영향)
6. **기업·담당자** — 사업자번호·DUNS·Tax·CEO·CEO/ESG/영업/구매전략 컨택

모달 헤더에는 협력사가 다루는 모든 Tier 배지가 표시됩니다 (예: Hanyang Cell = `T1 T2`).

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속.

## Vercel 배포

1. 이 폴더를 GitHub 저장소에 푸시
2. https://vercel.com 접속 → "Add New Project" → GitHub 저장소 연결
3. 별도 설정 없이 "Deploy" 클릭

또는 CLI: `npm i -g vercel && vercel`

## 데이터 위치

### `lib/data.ts` (기본)
- `suppliers` — 10개 협력사 정보 (Tier 5단계, tiers 배열 지원)
- `supplyEdges` — 협력사 간 공급 관계
- `batchesInProgress` — LangGraph 처리 중인 배치
- `dppRecords` — 발행 완료된 DPP
- `sampleAuditTrail` — 감사 추적 로그
- `kpis`, `dailyProcessing`, `violationsByRegulation` — 대시보드 KPI
- `tierLabels`, `tierShortLabels` — Tier 라벨 매핑

### `lib/supplier-detail-data.ts` (모달용 상세)
- `supplierExtended` — 사업자번호/DUNS/Tax/CEO
- `supplierContacts` — 담당자 다중 (CEO/ESG/Sales/Purchasing)
- `factories` — 본사/생산공장/광산 분리, 좌표, 가동 기간
- `certifications` — ISO/IRMA 만료 추적
- `parts` — 5계층 부품 (Pack→Module→Cell→전구체→광물)
- `purchaseOrders` — **PO/송장 단위 부품 매핑** (정의서 핵심)
- `manufacturingProcesses` — 제조공정 단계별
- `supplierCompleteness` — 완성도 + 누락 항목
- `remindLogs` — SLA 2주 리마인드 이력
- `getVisibleSupplierIds()` — 권한 시뮬레이션 헬퍼

## ERD 정책

`schema.sql`은 35개 → **32개 테이블**로 축소. 영역 8 (FTA) 의 3개 테이블 (`fta_agreements`, `origin_determination_records`, `certificates_of_origin`) 은 완전 삭제. FTA 항목은 협력사·부품·공정 마스터로 흡수:

| 원래 FTA 항목 | 흡수된 위치 |
|---|---|
| HS 코드 6자리 | `parts.hs_code` |
| 단가 | `parts.unit_price`, `bom_items.direct_material_cost`, `purchase_orders.unit_price` |
| 원산지국 | `bom_items.origin_country`, `purchase_orders.origin_country` |
| 제조공정도 | `manufacturing_process.process_image_url` |

## 기술 스택

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Recharts** · **Lucide Icons** · **Pretendard** · **JetBrains Mono**

## 디자인 시스템

- 다크 차콜 (`#0F1419`) 배경 + 청록 (`#0F766E`) 액센트
- 수치는 monospace, 둥근 모서리 최소화 (`border-radius: 2px`)
- 컬러: 검증(emerald), 대기(blue), 확인(amber), 위반(red)

## 발표 동선

1. **협력사 포털** (`/portal`) — "협력사가 부품·공정·증빙을 여기서 올립니다"
2. **공급망 맵** (`/supply-chain`) — "원청이 N차 공급망을 한눈에"
   - **통합 검색**: "PO-2026-04891" 검색 → 결과 패널 → 클릭 → 모달의 PO 탭 자동 열림
   - **권한 시뮬 토글**: 1차 협력사 시점에서 옆 라인 마스킹 시연
3. **검증 대기열** (`/queue`) — "LangGraph 8단계 자동 처리"
4. **HITL 검토** (`/hitl`) — "신뢰도 미달은 사람이 확인"
5. **DPP 발행 이력** (`/dpp`) — "통과 데이터로 여권 발행"
6. **감사 추적** (`/audit`) — "모든 결정 자동 기록"
7. **대시보드** (`/`) — "통합 관제 화면 (Tier 5단계 분포 포함)"
