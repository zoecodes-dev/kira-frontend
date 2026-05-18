# Battery DPP Dashboard

배터리 DPP 규제 대응 시스템의 시연용 대시보드입니다. Next.js 14 + TypeScript + Tailwind 기반으로 제작되었으며, Vercel에 즉시 배포 가능합니다.

## 페이지 구성

사이드바는 3개 섹션으로 분리되어 있습니다:

### 관제 · 모니터링 (ESG팀 일상 업무)
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | 대시보드 | 전체 현황 KPI · 일별 처리량 · 실시간 처리 배치 |
| `/supply-chain` | **공급망 맵 (확장)** | N차 협력사 시각화 + 검색·필터 + 권한 시뮬 토글 + 노드 클릭 시 상세 모달 |
| `/queue` | 검증 대기열 | LangGraph 8단계 워크플로우 진행 상황 |

### 의사결정 · 발행 (책임 있는 결정 지점)
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/hitl` | HITL 검토 | 신뢰도 미달·회색지대 사례 검토 · 승인/반려 결정 |
| `/dpp` | DPP 발행 이력 | 발행된 배터리 여권 카드 뷰 |

### 감사 · 외부 (규제 대응 + 외부 사용자)
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/audit` | 감사 추적 | Provenance 로그 기반 의사결정 경로 |
| `/portal` | 협력사 포털 | 협력사 데이터 입력 (부품정보·원자재·제조공정도·증빙) |

## 공급망 맵 (`/supply-chain`) 상세 기능

원청 ESG팀의 실제 업무 시나리오 기반으로 설계:

### 상단 영역
- **검색창**: 협력사명·PO번호·부품코드·HS코드·국가·담당자명 통합 검색
- **필터 칩**: 상태(검증/대기/확인/위반) · Tier · 국가
- **권한 시뮬레이션 토글**: "원청 ESG" ↔ "1차 협력사" 시점 전환 (옆 라인 마스킹 시연)

### 본문 영역
- **풀폭 공급망 맵**: Tier 3 원자재 → Tier 1 셀 제조 흐름
- **협력사 테이블**: 완성도 % 컬럼 추가

### 노드 클릭 시 상세 모달 (탭 6개)
1. **기업·담당자**: 사업자번호·DUNS·Tax·CEO·CEO/ESG/영업/구매전략 컨택
2. **공장(사업장)**: 본사 vs 생산공장 분리, 좌표, 가동 기간, 월 생산능력
3. **공급 부품·PO**: PO/송장 단위 부품 매핑, 협력사↔원청 코드, HS코드, 단가, 원산지, 공급 비율(%)
4. **인증·공정**: ISO/IRMA/IATF 만료 추적 + 제조공정도 단계별 (외주 표시)
5. **데이터·리마인드**: 완성도 % + 누락 항목 + SLA 2주 리마인드 이력
6. **상하위 관계**: 직상위/직하위 협력사 (권한 시뮬 영향)

### 1차 협력사 시점 (권한 시뮬)
- 직상위·직하위 협력사만 보임, 옆 라인은 노드 클릭 시 "접근 권한 없음" 표시
- 통계 카드도 보이는 노드 기준으로 재계산

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

모든 시연 데이터는 `lib/` 디렉토리에 있습니다.

### `lib/data.ts`
- `suppliers` — 10개 협력사 정보 (기본)
- `supplyEdges` — 협력사 간 공급 관계
- `batchesInProgress` — 현재 LangGraph에서 처리 중인 배치들
- `dppRecords` — 발행 완료된 DPP 이력
- `sampleAuditTrail` — 감사 추적 로그
- `kpis`, `dailyProcessing`, `violationsByRegulation` — 대시보드 KPI

### `lib/supplier-detail-data.ts` (공급망 맵 모달용)
- `supplierExtended` — 사업자번호/DUNS/Tax/CEO 등 기업 일반정보
- `supplierContacts` — 담당자 다중 (CEO/ESG/Sales/Purchasing)
- `factories` — 본사/생산공장/광산 분리, 좌표, 가동 기간
- `certifications` — ISO/IRMA 등 만료 추적
- `parts` — 5계층 부품 (Pack→Module→Cell→전구체→광물)
- `purchaseOrders` — **PO/송장 단위 부품 매핑** (정의서 핵심)
- `manufacturingProcesses` — 제조공정 단계별 (외주 표시)
- `supplierCompleteness` — 데이터 완성도 + 누락 항목
- `remindLogs` — SLA 2주 리마인드 이력
- `getVisibleSupplierIds()` — 권한 시뮬레이션 헬퍼

`/hitl`과 `/portal` 페이지의 폼 데이터는 각 페이지 파일 상단에 인라인으로 정의되어 있습니다.

## ERD 정책: FTA 영역 흡수

`schema.sql`은 35개 → **32개 테이블**로 축소되었습니다. 영역 8 (FTA) 의 3개 테이블 (`fta_agreements`, `origin_determination_records`, `certificates_of_origin`) 은 완전 삭제되었으며, 해당 항목들은 협력사·부품 마스터로 흡수되었습니다.

| 원래 FTA 항목 | 흡수된 위치 |
|---|---|
| HS 코드 6자리 | `parts.hs_code` |
| 단가 | `parts.unit_price`, `bom_items.direct_material_cost`, `purchase_orders.unit_price` |
| 원산지국 | `bom_items.origin_country`, `purchase_orders.origin_country` |
| 제조공정도 | `manufacturing_process.process_image_url` |

이 모든 항목은 `/portal`에서 협력사가 입력하고, `/supply-chain` 모달에서 원청 ESG팀이 확인합니다.

## 기술 스택

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** — 디자인 토큰은 `tailwind.config.ts`에 정의
- **Recharts** — 차트
- **Lucide Icons** — 아이콘
- **Pretendard** — 한글 폰트 (CDN)
- **JetBrains Mono** — 수치 표시

## 디자인 시스템

- 다크 차콜 (`#0F1419`) 배경 + 차분한 청록 (`#0F766E`) 액센트
- 수치는 monospace 폰트로 정렬감 확보
- 컬러 코딩: 검증 완료(emerald), 검토 대기(blue), 추가 확인(amber), 위반(red)
- 둥근 모서리 최소화 (`border-radius: 2px`)

## 발표 동선

1. **협력사 포털** (`/portal`) — "협력사가 부품·공정·증빙을 여기서 올립니다"
2. **공급망 맵** (`/supply-chain`) — "원청이 N차 공급망을 한눈에 보고, 노드 클릭으로 상세 검증"
   - 시점 토글로 **1차 협력사 권한 시뮬** 시연 (옆 라인 마스킹)
3. **검증 대기열** (`/queue`) — "LangGraph 8단계 자동 처리"
4. **HITL 검토** (`/hitl`) — "신뢰도 미달은 사람이 확인"
5. **DPP 발행 이력** (`/dpp`) — "통과 데이터로 여권 발행"
6. **감사 추적** (`/audit`) — "모든 결정 자동 기록"
7. **대시보드** (`/`) — "통합 관제 화면"
