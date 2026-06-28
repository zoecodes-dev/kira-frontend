# 백엔드 연동 필요 구간 (프론트 mock 인벤토리)

프론트에서 **mock/하드코딩/플레이스홀더**로 대체되어 있어 실 백엔드 연동이 필요한 구간 목록.
각 항목: `파일:라인` · mock 출처 · 유형 · 필요한 엔드포인트/필드.

**유형 구분**
- **FALLBACK** — 실 API를 먼저 호출하고, 실패(인증/네트워크/미배포) 시에만 mock으로 폴백. 백엔드가 정상이면 실데이터가 뜸. → *데이터/스키마 정합성 확인* 위주.
- **PRIMARY** — API 호출 자체가 없고 mock만 렌더. → *엔드포인트 신설 + 배선* 필요.
- **PLACEHOLDER** — 기능 미구현 자리표시(다운로드/뷰어/업로드 등).

스캔 기준일: 작업 마무리 시점. 라인 번호는 이후 편집으로 달라질 수 있음.

---

## CRITICAL — API 자체가 없음(PRIMARY)

### 1. 협력사 연락처 API 부재
- `app/suppliers/page.tsx:181-182` — 연락처 컬럼이 항상 "미등록" 하드코딩. 주석: `연락처 API 미제공 (md §2) — 백엔드 추가 전까지 미등록 표시`.
- `app/suppliers/page.tsx:359-360` — 연락처 필터가 항상 false(등록됨 분류 불가).
- `components/supplier-pages/SupplierInfoPage.tsx:196-198` — `연락처·사업자정보·제조공정 API 미제공 → 빈 값` (`contacts: never[] = []`, `ext = undefined`).
- **필요:** `GET /suppliers/{id}/contacts` (+ 확장: 사업자정보/제조공정). 신설 시 위 3곳 동시 해소.

> 참고: check-info(`SupplierGeneralReview`)는 `getSupplierContacts`를 이미 호출함 — 연락처 엔드포인트가 **일부만** 연동된 상태. 목록/포털 뷰까지 일관되게 노출 필요.

---

## HIGH — 실 API 폴백(FALLBACK) · 스키마/데이터 정합성 확인

### 2. My Task — 자료 요청
- `app/my-task/page.tsx` — `RequestArea`가 `getDataRequests()` 호출, 실패 시 로컬 `dataRequests` 배열로 폴백(`base = apiRows ?? dataRequests`).
- **필요:** `GET /data-requests` 가 `target_supplier_id · requested_data_type · due_date · missing_count` 포함 반환 보장. (`missing_count` 미집계면 누락 표시 생략됨.)

### 3. My Task — 내 업무 목록(잔존 상수)
- `app/my-task/page.tsx` — `_MOCK_TASKS` / `getActions`/`adaptAction` 상수가 남아있음(현재 탭에서 렌더 안 함, 정리 대상).
- **필요:** 업무 큐를 쓸 경우 `/actions` 가 `ActionItem[]` 반환 확인. 안 쓸 거면 상수 제거.

### 4. 협력사 입력현황 보드
- `components/suppliers/SupplierInputStatusBoard.tsx:44-68` `buildMockRows()` — `getSuppliers()`+`getSupplierCompleteness()` 실패 시 `@/lib/data`·`supplier-detail-data` mock으로 폴백.
- **필요:** `/suppliers`, `/suppliers/{id}/completeness` 실데이터 스키마 일치 확인.

### 5. 협력사 정보 단일 폼(check-info) — 하드코딩 요약/표
- `app/suppliers/check-info/SupplierGeneralReview.tsx:93-108` `supplierSummary`(한양제조 데모 객체) — 실 협력사(UUID)면 API 우선, 비면 `미입력/—/미등록`으로 대체(수정 완료). mock S-ID 데모에서만 노출.
- `:153-190` — `companyRows·contactRows·factoryRows·certificateRows·supplyItemRows·originRows` 6개 하드코딩 표(데모 UI 템플릿). 실 협력사면 API 데이터로 덮어씀.
- **필요:** 상세/연락처/공장/인증/공급품목/원산지 6개 엔드포인트 데이터 완전성. (백엔드 `country` 등 **null** 인 협력사는 화면에 '미입력'으로 정직 표기 중 → 실값 원하면 시드/입력 필요.)
- **관련 데이터 공백:** 백엔드 `supplier.country` 미시드 협력사 다수 / `SupplierDetail`에 **tier 필드 없음**(공급망 관계 개념이라 헤더 tier는 '—').

### 6. AI 추출(데이터 파싱)
- `components/supplier/AiParsingView.tsx:37-71` `MOCK_PARSED_DOCS` — `realOnly=false`(협력사 데모)면 mock, `realOnly=true`(원청 검토)면 실 추출만(없으면 빈 상태). `getAiExtractions()` 폴백.
- `components/dashboard/HitlReviewCard.tsx` — `getAiExtractions()` 실패 시 빈 배열.
- **필요:** `GET /data-requests/ai-extractions` 가 `parsed_fields · confidence_map · unparsed_fields · submission_status · batch_id · hitl_review_id` 반환(연동됨, 데이터 커버리지 확인).

### 7. AI 규제 검증 결과
- `components/dashboard/RegulationResultsCard.tsx:21-24` `MOCK` — `getRegulationResults()` 초기/폴백.
- **필요:** `GET /regulation/materials/regulation-results` (연동 완료) — `verdict · confidence · cited_clauses · reasoning_text · needs_human_review · material(제품명)` 반환.

---

## MEDIUM — 신설 또는 데모 기본값(PRIMARY/FALLBACK)

### 8. 협력사 알림 벨
- `components/supplier/SupplierNotificationBell.tsx:29-57` `MOCK_NOTIFICATIONS`(기본 state) — 외부 prop으로 주입 가능하나 기본은 mock.
- **필요:** `GET /notifications` (또는 `/supplier/notifications`).

### 9. 제출 8단계 트래커
- `components/supplier/EightStageStepper.tsx:64-99` `mockSubmissions`, `:108` `MOCK_BATCH_STATUS`(시나리오 전환용 상수).
- **필요:** `GET /batches` 또는 `/submissions` — 단계/반려 사유 포함.

### 10. 공급망 입력(온보딩) — PO 목록
- `components/supplier/supply-chain-entry/StepContext.tsx:19-23` `MOCK_POS` — 주석: `백엔드 PO 엔드포인트 없어 mock`.
- **필요:** `GET /supplier/{id}/purchase-orders`.

### 11. 공급망 맵/허브 — 데모 dataset 폴백
- `app/supply-chain/page.tsx`, `app/supply-chain/SupplyChainHub.tsx`, `SupplyChainMapPageContent.tsx` — `mockDataset`(`lib/supply-chain-mock.ts`) 폴백. 토큰/배포 없으면 데모.
- 그레이스풀: `BOM 버전 없으면 트리 합성으로 폴백`, `hop_level 미배포면 tierLevel 폴백`.
- **필요:** `/products`, `/products/{id}/bom-versions`, `/products/{id}/supply-chain-map` (대체로 연동됨) + `hop_level`/BOM 버전 배포 확인.

---

## LOW — 자리표시/파생 필드(PLACEHOLDER)

### 12. PDF 뷰어 미연동
- `components/supplier/AiParsingView.tsx:236` — `실제 PDF 렌더링 영역 (react-pdf 연동 예정)` 텍스트만.
- **필요:** `react-pdf` 도입 + 원본 문서 URL(`/files` 또는 `submission_documents.file_url`).

### 13. 문서 업로드 데모
- `app/suppliers/check-info/SupplierGeneralReview.tsx` (DocUploadField 부근) — `데모: 파일명만 doc_url 컬럼에 저장(실 파일 저장은 추후 /files 연동)`.
- **필요:** `POST /files`(S3 업로드) — 로컬은 자격증명 없어 실패, 프로덕션만 동작.

### 14. 완료 증빙 다운로드
- `components/supplier/EightStageStepper.tsx:397` — `alert('완료 증빙 다운로드 (API 연동 예정)')`.
- **필요:** `GET /batches/{id}/proof`.

### 15. 자가신고 모달 — 현재 공급원
- `components/supplier/SelfReportModal.tsx:44-49` `MOCK_CURRENT_SUPPLIER`(대성정밀 데모).
- **필요:** `GET /supplier/{id}/current-supply-source`.

### 16. BOM 파생 필드
- `lib/api.ts:917` — `kind 는 tier_level/leaf 여부로 파생(백엔드 미제공)`.
- `lib/api.ts:952` — `functionPurpose: "" // 백엔드 미제공`.
- **필요:** `/products/{id}/bom` 응답에 `kind`·`function_purpose` 추가.

---

## 요약

| 우선순위 | 구간 | 유형 | 필요 |
|---|---|---|---|
| CRITICAL | 협력사 연락처(목록·포털·필터) | PRIMARY | `GET /suppliers/{id}/contacts` 신설 |
| HIGH | My Task 자료요청 | FALLBACK | `/data-requests` 스키마 |
| HIGH | 입력현황 보드 | FALLBACK | `/suppliers`,`/completeness` |
| HIGH | check-info 6개 표·요약 | FALLBACK/데모 | 상세·연락처·공장·인증·품목·원산지 + `country` 시드 |
| HIGH | AI 추출(HITL) | FALLBACK | `/data-requests/ai-extractions` 커버리지 |
| HIGH | 규제 검증 결과 | FALLBACK | `/regulation/materials/regulation-results`(연동됨) |
| MEDIUM | 알림 / 8단계 / PO / 공급망맵 | PRIMARY/FALLBACK | `/notifications`,`/batches`,`/purchase-orders`, BOM/hop_level |
| LOW | PDF뷰어 / 파일업로드 / 증빙다운 / 자가신고 / BOM필드 | PLACEHOLDER | `react-pdf`,`/files`,`/batches/{id}/proof` 등 |

> 폴백(FALLBACK) 구간은 백엔드가 정상 배포·시드되면 자동으로 실데이터가 뜬다(스키마만 일치하면 됨). PRIMARY/PLACEHOLDER 구간이 실제 신규 작업 대상이다.
