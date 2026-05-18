# Battery DPP Dashboard

배터리 DPP 규제 대응 시스템의 시연용 대시보드입니다. Next.js 14 + TypeScript + Tailwind 기반으로 제작되었으며, Vercel에 즉시 배포 가능합니다.

## 페이지 구성

사이드바는 3개 섹션으로 분리되어 있습니다:

### 관제 · 모니터링 (ESG팀 일상 업무)
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | 대시보드 | 전체 현황 KPI · 일별 처리량 · 실시간 처리 배치 |
| `/supply-chain` | 공급망 맵 | 10개 시연 협력사의 N차 공급망 시각화 |
| `/bom` | **BOM 관리** | 제품 부품 5계층 트리 + 부품 상세 + BOM 버전 이력 |
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
| `/portal` | 협력사 포털 | 협력사 데이터 입력 화면 (공급부품·원자재·제조공정도·증빙) |

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속.

## Vercel 배포

가장 간단한 방법:

1. 이 폴더를 GitHub 저장소에 푸시
2. https://vercel.com 접속 → "Add New Project" → GitHub 저장소 연결
3. 별도 설정 없이 "Deploy" 클릭

또는 CLI 사용:

```bash
npm i -g vercel
vercel
```

## 데이터 위치

모든 시연 데이터는 `lib/` 디렉토리에 모여 있습니다. 실제 운영에서는 이 파일의 export들을 PostgreSQL / S3 / API 호출 결과로 대체하면 됩니다.

### `lib/data.ts`
- `suppliers` — 10개 협력사 정보
- `supplyEdges` — 협력사 간 공급 관계
- `batchesInProgress` — 현재 LangGraph에서 처리 중인 배치들
- `dppRecords` — 발행 완료된 DPP 이력
- `sampleAuditTrail` — 감사 추적 로그
- `kpis`, `dailyProcessing`, `violationsByRegulation` — 대시보드 KPI 데이터

### `lib/bom-data.ts` (신규)
- `products` — 등록 제품 (배터리 팩 모델)
- `bomVersions` — BOM 버전 이력 (draft/active/deprecated)
- `parts` — 5계층 부품 (Pack → Module → Cell → 전구체 → 광물)
- `bomItems` — BOM 항목 (상위 부품 대비 수량·비율·원산지·원가)
- `partCodeMappings` — 협력사 코드 ↔ 원청 코드 매핑
- `manufacturingProcesses` — 제조공정도 단계
- `partSuppliers` — 부품별 공급 협력사
- `partCompleteness` — 부품 데이터 완성도
- `buildPartTree(rootPartId)` — 트리 구조 빌더 헬퍼

`/hitl`과 `/portal` 페이지의 폼 데이터는 각 페이지 파일 상단에 인라인으로 정의되어 있습니다.

## ERD 정책: FTA 영역 흡수

`schema.sql`은 35개 → **32개 테이블**로 축소되었습니다. 영역 8 (FTA) 의 3개 테이블 (`fta_agreements`, `origin_determination_records`, `certificates_of_origin`) 은 완전 삭제되었으며, 해당 항목들은 협력사·부품 마스터로 자연스럽게 흡수되었습니다.

| 원래 FTA 항목 | 흡수된 위치 |
|---|---|
| HS 코드 6자리 | `parts.hs_code` |
| 단가 | `parts.unit_price`, `bom_items.direct_material_cost` |
| 원산지국 | `bom_items.origin_country` |
| 제조공정도 | `manufacturing_process.process_image_url` |

이 정책에 따라:
- `suppliers` 테이블의 `is_authorized_exporter`, `authorized_exporter_no` 컬럼은 제거 (서류 발급 권한은 협력사 본질 정보가 아님)
- `parts.unit_price` 주석에서 "RVC용" 표현 제거 → 단순 단가
- `bom_items.fta_applicable_origin_country` → `origin_country` 로 이름 변경

이 모든 항목은 협력사 포털(`/portal`)에서 협력사가 입력하고, BOM 관리(`/bom`)에서 원청 ESG팀이 확인합니다.

## 기술 스택

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** — 디자인 토큰은 `tailwind.config.ts`에 정의
- **Recharts** — 차트
- **Lucide Icons** — 아이콘
- **Pretendard** — 한글 폰트 (CDN 로드)
- **JetBrains Mono** — 수치 표시 전용

## 디자인 시스템

회사 제출용 톤을 유지하기 위해 다음 원칙을 따릅니다:

- 다크 차콜 (`#0F1419`) 배경 + 차분한 청록 (`#0F766E`) 액센트
- 수치는 모두 monospace 폰트로 정렬감 확보
- 컬러 코딩: 검증 완료(emerald), 검토 대기(blue), 추가 확인(amber), 위반(red)
- 둥근 모서리 최소화 (`border-radius: 2px`)

## 사용자별 동선

발표 시 다음 흐름으로 보여주면 자연스럽습니다:

1. **협력사 포털** (`/portal`) — "협력사가 공급부품·원자재·제조공정을 여기서 올립니다"
2. **BOM 관리** (`/bom`) — "원청이 부품 트리·HS코드·원산지·완성도를 한눈에 확인합니다"
3. **검증 대기열** (`/queue`) — "올린 데이터가 LangGraph 8단계를 거칩니다"
4. **HITL 검토** (`/hitl`) — "신뢰도 미달 시 ESG팀이 직접 검토합니다"
5. **DPP 발행 이력** (`/dpp`) — "통과한 데이터로 여권이 발행됩니다"
6. **감사 추적** (`/audit`) — "모든 결정 과정은 자동 기록되어 감사에 대응합니다"
7. **공급망 맵** (`/supply-chain`) — "여기까지 전체 협력사 관계와 위험을 한눈에"
8. **대시보드** (`/`) — "이 모든 것이 통합된 관제 화면입니다"
