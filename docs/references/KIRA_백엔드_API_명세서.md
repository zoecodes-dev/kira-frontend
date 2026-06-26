# KIRA 백엔드 API 명세서

프론트(Vercel/Next.js) ↔ 백엔드(EC2 Docker) 연동 계약 문서.
프론트가 호출하는(또는 호출해야 하는) 모든 HTTP 엔드포인트를 한 곳에 모았다.

- **작성일**: 2026-06-26
- **정합 기준**
  - 공통 fetch 규약: [`lib/api.ts`](../../lib/api.ts)
  - 상태/enum SSOT: [`STATE_DICTIONARY.md`](./STATE_DICTIONARY.md)
  - DB 스키마 SSOT: [`schema.sql`](./schema.sql) (PostgreSQL 16 + PostGIS + pgvector, 54 테이블)
- **표기**
  - ✅ **기존** — 이미 `lib/api.ts`에 호출 함수가 정의됨. 백엔드는 이 계약대로 응답만 맞추면 된다.
  - 🔵 **백엔드 기존(경로 고정)** — 백엔드에 이미 구현됨. 경로/키는 백엔드 현행을 따르고, **프론트가 그 경로로 연동**한다(아직 `lib/api.ts`에 호출부 없음).
  - 🟡 **재합의** — 한쪽이 구현돼 있으나 경로·쿼리·응답 구조가 서로 달라 **확정 협의 필요**.
  - 🆕 **신규** — 백엔드 구현 필요. 경로/필드는 **프론트 제안**이며 백엔드와 합의해 확정한다.
  - 🔴 **(2026-06-26 백엔드 회신 반영)** — 라벨/경로 정정 또는 우선순위 격상 항목.
- 모든 응답 필드는 본 문서에서 **camelCase**(프론트가 받는 형태)로 적는다. 실제 백엔드는 **snake_case**로 내려주면 `lib/api.ts`의 `snakeToCamel`이 자동 변환한다. (예: 응답 `risk_level` → 프론트 `riskLevel`)

---

## 0. 공통 규약

### 0.1 Base URL · 프록시
- 프론트는 항상 같은 출처의 **`/api`** 접두어로 호출한다. (`API_BASE_URL = "/api"`)
- `next.config.js`의 rewrite가 `/api/:path*` → `${BACKEND_ORIGIN}/:path*` 로 서버-서버 프록시한다.
  - 즉 프론트 `/api/suppliers` → 백엔드 `GET /suppliers`.
- **본 문서의 모든 경로는 백엔드 기준 경로**(`/api` 접두어 제외)로 표기한다.
- 백엔드는 도메인/인증서 없이 http(80)로 서빙해도 된다(혼합콘텐츠는 프록시가 우회).

### 0.2 인증 · 테넌트 격리 🔴 (목표 규약 — 전 라우터 미배선, **P1**)
> ⚠ **현행 주의(2026-06-26 백엔드 회신)**: 아래는 "이미 되는 규약"이 아니라 **백엔드가 전 라우터에 새로 배선해야 하는 P1 작업**이다.
> 현재 인증은 라우터마다 혼재 상태다. `audit`·`dpp`·`report`·`submission`·`hitl` 계열만 인증이 걸려 있고,
> `/suppliers`(9종)·`/products`·`/dashboard`·`/batches`는 **무인증 조회** 상태다.
> 따라서 "기존 라우터 전수 인증·테넌트 격리 배선"을 별도 P1 항목으로 추적한다(§부록 B).

목표 규약:
- 모든 요청 헤더에 `Authorization: Bearer {token}` 자동 첨부 (토큰은 localStorage `kira_token`).
- 토큰이 없으면 헤더 생략 → 보호 리소스는 **401**.
- **401** 응답 시 프론트는 토큰을 폐기하고 로그인으로 보낸다. 만료/무효 토큰은 401로 통일.
- 테넌트 격리: 토큰의 `tenant_id` 기준으로 **모든** 목록/상세를 필터링한다(현재 무인증 라우터 포함 전수 적용). `tenants.subscription_status != active` 면 접근 차단(403).

### 0.3 요청/응답 포맷
- `Content-Type: application/json` (파일 업로드만 `multipart/form-data`).
- 응답 키는 **snake_case**. 프론트가 camelCase로 변환.
  - ⚠ 예외: `latitude`, `longitude` 처럼 단어 단위 키는 변환되지 않으니 백엔드도 그대로 내려준다.
- **204 No Content** → 프론트는 `undefined`로 처리(쓰기 성공 후 본문 불필요 시 사용 가능).
- 목록은 **envelope 없는 순수 배열**을 기본으로 한다. 빈 결과는 `[]` (404 아님). 페이지네이션이 필요한 목록만 §0.6 형태.

### 0.4 에러 포맷
프론트는 `ApiError`로 받으며, 에러 메시지는 응답 본문의 **`detail`** 필드를 우선 사용한다.

```json
{ "detail": "사람이 읽을 한글 메시지", "code": "VALIDATION_ERROR" }
```

| status | 의미 | 프론트 처리 |
|--------|------|------------|
| 400 / 422 | 잘못된 요청 / 검증 실패 | `detail` 표시 |
| 401 | 토큰 만료·무효 | 토큰 폐기 → 로그인 |
| 403 | 권한 없음(역할/테넌트) | `detail` 표시 |
| 404 | 리소스 없음 | 화면별 빈 상태 |
| 5xx | 서버 오류 | 공통 오류 토스트 |

### 0.5 역할(Role)
- 토큰에 역할이 담긴다: **원청(OEM)** / **협력사(Supplier)**.
- `/supplier*` 계열 엔드포인트는 협력사 본인(또는 위임) 데이터만, 그 외 운영 엔드포인트는 원청만 접근.
- 화면-역할 매핑은 §부록 D 참고.

### 0.6 페이지네이션 ✅ 확정 (2026-06-26)
페이지네이션이 필요한 목록의 쿼리/응답 규약(현재 `/suppliers`가 채택).

- 쿼리: `?page={1-base}&size={n}` + 도메인 필터(snake_case).
- 응답 본문: **순수 배열 그대로 유지**(현재 페이지의 항목들). envelope로 감싸지 않는다.
- 총건수: **`X-Total-Count` 응답 헤더**로 전달한다. 값은 필터 적용 후 전체 건수(현재 페이지 건수가 아님).
  ```
  GET /suppliers?page=1&size=20
  200 OK
  X-Total-Count: 187
  [ { "supplier_id": "...", ... }, ... ]   // 20건
  ```
- 프론트는 페이지 수를 `ceil(X-Total-Count / size)`로 계산한다.
- **적용 범위**: `X-Total-Count`는 **페이지로 잘라 보는 목록**(suppliers·submissions·reports 등) 전용이다. 통째로 그리는 합성 응답(예: §10.2 공급망 맵 — 배열 4개 + 통계)에는 **해당 없음(N/A)**. 그런 화면의 요약 개수는 헤더가 아니라 **응답 본문의 집계 필드**(`counts`)로 내려준다.
- **확정 사유**: 모든 (페이징) 목록 응답을 bare array로 통일 유지(envelope 혼재 방지). `lib/api.ts`는 헤더를 읽는 목록 변형 헬퍼만 추가하면 되고 기존 bare-array 소비부는 그대로다.
- 프록시 주의: 헤더가 `next.config.js` rewrite를 통과해 그대로 전달돼야 한다(현재 단순 rewrite라 통과). 향후 CORS 직결 시엔 백엔드가 `Access-Control-Expose-Headers: X-Total-Count` 설정 필요.

### 0.7 공통 값 규약
- 날짜시각: ISO8601 (`2026-05-14T09:12:03.124Z`). 날짜만: `YYYY-MM-DD`.
- 좌표: `latitude` / `longitude` 분리된 number (프론트가 `[lng, lat]` 튜플로 조립).
- 모든 status/verdict/level enum은 **§부록 A**(= STATE_DICTIONARY)의 값만 사용.

### 0.8 파일 업로드 🆕
첨부가 있는 화면(자료 제출, 위반 시정, 실사 보고서, 온보딩 등쪽)이 공통으로 사용.

- `POST /files` — `multipart/form-data`, field `file` + 선택 `context`.
  - 응답: `{ fileId, fileName, sizeBytes, contentType, url }`
- `GET /files/{fileId}` — 메타 + 서명된 `downloadUrl`.
- `DELETE /files/{fileId}` — 204.
- 제약: 허용 확장자 `pdf, xlsx, xls, csv, docx, doc, png, jpg, jpeg`, 최대 50MB.
- 대안: 각 제출 엔드포인트가 `multipart`로 파일을 직접 받고 내부에서 `submission_documents`에 저장해도 된다(백엔드 합의).

---

## 1. 인증 (Auth) 🆕

현재 프론트 로그인은 **데모용 하드코딩**(`app/login/page.tsx`)이다. 실제 백엔드 연동 시 아래가 필요.

| # | 메서드 | 경로 | 상태 | 설명 |
|---|--------|------|------|------|
| 1.1 | POST | `/auth/login` | 🆕 | 이메일·비밀번호 → JWT 발급 |
| 1.2 | POST | `/auth/logout` | 🆕(선택) | 서버측 토큰 폐기(블랙리스트). 없으면 프론트 localStorage 삭제로 대체 |
| 1.3 | GET | `/auth/me` | 🆕 | 현재 토큰 사용자/역할/테넌트 조회 |

**1.1 `POST /auth/login`**
```jsonc
// 요청
{ "email": "oem@kira-dpp.com", "password": "********" }
// 응답 200
{
  "token": "eyJ...",            // JWT
  "role": "oem",                // oem | supplier
  "userId": "u-...",
  "tenantId": "t-...",
  "supplierId": null,           // 협력사 계정이면 본인 supplier_id
  "displayName": "김정민"
}
```
- 실패: 401 `{ "detail": "이메일 또는 비밀번호가 올바르지 않습니다." }`
- 참조 테이블: `users`, `tenants`, `view_permissions`.

---

## 2. 운영 대시보드 · 배치 · HITL · 감사 (원청)

### 2.1 대시보드 KPI
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 2.1 | GET | `/dashboard/kpis` | ✅ 기존 |

응답: `DashboardKpis` (lib/api.ts:205)
`{ totalBatches, processingBatches, hitlWaitBatches, completedBatches, rejectedBatches, dppIssuedCount, compliancePassRate, avgConfidenceScore }`

### 2.2 배치(AI 파이프라인) 현황
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 2.2 | GET | `/batches?status={processing\|hitl_wait\|completed\|rejected}` | ✅ 기존 |

응답: `BatchesResponse` `{ status, total, byStage: { [stage]: BatchItem[] } }`
`BatchItem = { batchId, productId, tenantId, destination, currentStage, status, confidenceScore, receivedAt, sourceSystem, externalId }`
- `status`/`currentStage` enum: §A-6 / §A-7. 테이블: `batches`.

### 2.3 위반 케이스(대시보드 위젯) 🆕
대시보드의 "규제 위반 사례", 협력사 포털의 위반 목록 공용.
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 2.3a | GET | `/violations?limit={n}&supplier_id={id}` | 🆕 |

응답(배열): `{ violationId, batchId, supplierId, regulation, regulationLabel, region, severity, summary, detectedAt, status }`
- `severity`: critical \| high \| minor. 출처: `compliance_results`(verdict=violation) 조인.

### 2.4 HITL 검토
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 2.4a | GET | `/hitl/queue` | ✅ 기존 |
| 2.4b | GET | `/hitl/review/{reviewId}` | 🆕 |
| 2.4c | POST | `/hitl/review/{reviewId}/decision` | 🆕 |

- 2.4a 응답: `HitlQueueItem[]` `{ reviewId, batchId, reason, triggerStage, status, createdAt, confidenceScore }` (테이블 `hitl_reviews`)
- 2.4b 응답(상세): 위 필드 + `{ agentVerdict, evidenceRows: [{ source, label, value, verdict }], attachments: [{ fileId, fileName, pageCount }], productName, supplierName }`
- 2.4c 요청: `{ "decision": "approve|reject|escalate", "reason": "string", "additionalActions": ["notify_supplier","audit","legal_review"] }`
  - `decision`은 `hitl_reviews.resolution`에 기록, 상태는 `hitl_resolved`로 전이(§A-9). 응답 200 또는 204.

### 2.5 감사 추적 / 감사 패키지
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 2.5a | GET | `/audit/trail/{batchId}` | ✅ 기존 |
| 2.5b | GET | `/audit-packages` | 🆕 |
| 2.5c | GET | `/audit-packages/{packageId}` | 🆕 |
| 2.5d | POST | `/audit-packages/{packageId}/export` | 🆕(선택) |

- 2.5a 응답: `AuditTrailItem[]` (lib/api.ts:216, 테이블 `audit_trail`)
  `{ stepNumber, timestamp, nodeType(agent\|tool\|human), nodeName, model, promptVersion, durationMs, inputHash, outputHash, decision, citations[] }`
- 2.5b 응답(배열): `{ packageId, target, type, status, evidenceCount, gapCount, owner, createdAt }`
- 2.5c 응답: 2.5b + `{ checklist: [{ key, label, status }], dppRef, hashChain: AuditTrailItem[] }`
  - 출처: `audit_data_snapshots`, `gap_analysis_results`, `dpp_records`.
- 2.5d 응답: `{ exportUrl }` 또는 파일 스트림.

---

## 3. My Task · 보고 · 결재 (원청)

### 3.1 My Task / Actions
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 3.1 | GET | `/actions?status={code}` | ✅ 기존 |

응답: `ActionItem[]` `{ actionId, sourceType, title, supplierId, assignedTo, dueDate, actionStatus }`

### 3.2 보고서 (작성/제출)
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 3.2a | GET | `/reports` | 🆕 |
| 3.2b | GET | `/reports/{reportId}` | 🆕 |
| 3.2c | POST | `/reports` | 🆕 |
| 3.2d | PATCH | `/reports/{reportId}/status` | 🆕 |

- 3.2a(배열): `{ reportId, type, title, author, authorRole, relatedBatch, submittedAt, status }`
- 3.2b: + `{ summary, rejectReason, approvalSteps: [{ approver, role, status, decidedAt }] }` (테이블 `reports`, `report_approval_steps`)
- 3.2c 요청: `{ title, type, relatedBatch, summary, approverIds: [] }` → 응답 `{ reportId }`
- 3.2d 요청: `{ status: "submitted" }`

### 3.3 결재함(받은 결재)
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 3.3a | GET | `/reports/inbox` | 🆕 |
| 3.3b | PATCH | `/reports/{reportId}/approve` | 🆕 |
| 3.3c | PATCH | `/reports/{reportId}/reject` | 🆕 |

- 3.3a(배열): `{ reportId, title, status, severity, submittedAt, deadline, previousReviewers: [], keyPoints: [] }`
- 3.3b 요청: `{ comment?: string }` / 3.3c 요청: `{ comment: string }` (반려 사유 필수)
  - `report_approval_steps`에 결재 한 단계 기록.

---

## 4. 제출 검토 · 입력 현황 (원청)

### 4.1 제출 자료 검토
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 4.1a | GET | `/submissions` | 🆕 |
| 4.1b | GET | `/submissions/{submissionId}` | 🆕 |
| 4.1c | PATCH | `/submissions/{submissionId}/approve` | 🆕 |
| 4.1d | PATCH | `/submissions/{submissionId}/rework` | 🆕 |
| 4.1e | PATCH | `/submissions/{submissionId}/reject` | 🆕 |

- 4.1a(배열): `{ submissionId, supplierId, supplierName, type, status, dueDate, submittedAt, fileCount }`
- 4.1b: + `{ dataSource, supplierContact, reviewerName, files: [{ fileId, fileName, sizeBytes }], checks: [{ label, result(pass\|review\|fail), reason }], relatedPOs: [] }`
  - 테이블: `data_request_log`(submission_status §A-2), `submission_documents`, `document_extraction_results`.
- 4.1c/d/e 요청: `{ reason: string }`. 상태 전이: approve→`submission_approved`, rework→`submission_in_progress`(재요청), reject→`submission_rejected`. (`submission_status_history` 기록)

### 4.2 입력 현황(완성도)
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 4.2a | GET | `/suppliers/{id}/completeness` | 🆕 |
| 4.2b | GET | `/suppliers/{id}/data-collection` | 🆕 |
| 4.2c | POST | `/suppliers/{id}/request-items` | 🆕 |

- 4.2a: `{ completionRate, filledFieldCount, requiredFieldCount, missingFields: [], lastUpdatedAt, reviewStatus }` (테이블 `data_completeness_status`)
  - ⚠ 현재 프론트는 `reliability.completenessScore`만 받고 `filledFieldCount/missingFields`는 0/[]로 채운다. 이 엔드포인트로 보강.
- 4.2b(섹션별 검토): `{ sections: [{ key, title, completed, total, status, missing: [], comment }] }`
  - 섹션 key: company \| contacts \| factories \| certificates \| items \| origin.
- 4.2c 요청: `{ items: ["section:field", ...], note: string }` → 응답 `{ requestId, sentAt }` (추가 자료 요청 발송, `data_request_log` insert + `notifications`)

---

## 5. 공급망 실사 (원청) 🆕

| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 5.1 | GET | `/due-diligence?status={code}&search={q}` | 🆕 |
| 5.2 | GET | `/due-diligence/{auditId}` | 🆕 |
| 5.3 | POST | `/due-diligence` | 🆕 |
| 5.4 | PATCH | `/due-diligence/{auditId}/report` | 🆕(multipart) |
| 5.5 | PATCH | `/due-diligence/{auditId}/capa/{capaId}` | 🆕 |

- 5.1(배열): `{ auditId, supplierId, supplierName, factoryId, type, status, result, score, riskScore, capaCount, hasReport }`
- 5.2: + `{ scope, agency, completedAt, findings: [{ title, severity, description }], capa: [{ capaId, title, status, dueDate }], reportFileId }`
- 5.3 요청: `{ supplierId?, factoryId?, name, scope }` → `{ auditId }`
- 5.4: `multipart` (field `file`) → 보고서 업로드, `result/score` 갱신.
- 5.5 요청: `{ status: "완료" }` (CAPA 과제 완료 승인).
- 테이블: `supplier_audit_records`, `due_diligence_policies`, `detention_cases`.

---

## 6. DPP (발행 이력 · 센터 · Readiness)

> 🔴 **2026-06-26 백엔드 회신 반영**: 발행/이력/readiness는 백엔드에 **이미 구현돼 있고 키는 `dpp_id`(UUID)·`/records`·제품 단위**다.
> 프론트가 임의 경로(`/dpp-history`, `serialNumber` 키)로 새로 파면 **발행 엔드포인트가 두 벌로 갈라지고 불변 Lock 대상이 분리**되므로,
> 아래는 모두 **백엔드 현행 경로·키 기준**으로 정정했다(🔵). 추가 필드는 응답 확장으로 협의.

### 6.1 발행 이력
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 6.1a | GET | `/dpp/records?destination=&approved_by=&status=&start_date=&end_date=` | 🔵 백엔드 기존 |
| 6.1b | GET | `/dpp/records/{dppId}` | 🟡 재합의(단건 경로 확인) |

- 6.1a(배열): `{ dppId, productId, productCode, modelName, manufacturer, destination, approvedBy, status, issuedAt, carbonFootprint, recycledContent: { Co, Ni, Li } }`
  - ⚠ 필터 쿼리는 백엔드 현행과 대조해 확정(현 `/dpp/records`에 어떤 필터가 붙는지 확인 필요).
- 6.1b: + `{ serialNumber, producedAtFactoryId, producedAt, capacity, supplyChainVersion, dppVersion }`. 단건 경로(`/dpp/records/{dppId}` vs `/dpp/{dppId}`)는 백엔드 현행에 맞춘다.
- 키는 **`dppId`(UUID)** 로 통일. `serialNumber`로 조회/발행하지 않는다. enum `status`: §A-10. 테이블 `dpp_records`.

### 6.2 DPP 센터(모니터링)
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 6.2a | GET | `/dpp/status` | 🆕 |
| 6.2b | GET | `/dpp/held-products` | 🆕 |
| 6.2c | GET | `/dpp/blockers` | 🆕 |
| 6.2d | GET | `/dpp/carbon-footprint/trend?days={n}` | 🆕 |
| 6.2e | GET | `/dpp/recycled-content/avg` | 🆕 |

- 6.2a: `{ readyCount, holdCount, hitlCount, blockerCount, issuedCount }`
- 6.2b(배열): `{ productId, productName, readiness, blockerKey, lastUpdatedAt }` (제품 단위 — 행 클릭 시 6.3a로 이동)
- 6.2c: `{ feoc, origin, hitl, audit }` (각 지연 원인 건수)
- 6.2d: `{ labels: [], series: [{ name, points: [] }] }` / 6.2e: `{ coAvg, niAvg, liAvg }`

### 6.3 DPP Readiness · 발행
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 6.3a | GET | `/dpp/products/{productId}/readiness` | 🔵 백엔드 기존(제품 단위) |
| 6.3b | GET | `/dpp/readiness?status=hold` (보완 대기 제품 목록) | 🟡 재합의(목록 경로 미정) |
| 6.3c | POST | `/dpp/{dppId}/issue` | 🔵 백엔드 기존(UUID 키) |

- 6.3a(제품 단위 readiness): `{ productId, productName, readiness, checks: [{ key, label, passed }], blockers: [{ name, relatedDoc, dueDate, severity }] }`
  - checks key: required_data \| compliance \| reliability \| due_diligence \| hitl.
  - ⚠ **단위 정정**: readiness는 **제품(product_id) 단위**다. 프론트 readiness 화면이 쓰던 `serialNumber`(제품 인스턴스) 단위가 아니다 → 화면은 제품 단위 응답을 받아 표시하도록 조정.
- 6.3b(목록): 보완 대기 제품 목록 경로는 백엔드와 확정(예: `/dpp/products?readiness_status=hold`). 응답 배열 `{ productId, productName, destination, readiness, blockerCount, status }`.
- 6.3c 요청: `{ approver: string }` → 발행. **키는 `dppId`(UUID)**. 발행 후 `dpp_records.status=dpp_issued`(immutable, 불변 Lock). `serialNumber`로 발행하는 별도 엔드포인트를 만들지 않는다.

---

## 7. 규제 검증 결과 (원청) 🆕

| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 7.1 | GET | `/materials/regulation-results` | 🆕 |

응답(배열): `{ resultId, material, supplierId, supplierName, regulation, verdict, confidence, evidence: [{ fileId, label }] }`
- `verdict` enum: §A-8 (passed \| violation \| warning \| reject) + `needsHumanReview: bool`(회색지대).
- HITL 후보 = `confidence < 0.85`. 테이블 `compliance_results`, `regulations`.

---

## 8. 협력사 — 원청 뷰 (Suppliers)

§부록 A의 enum을 따른다. 좌표는 latitude/longitude(§0.7).

### 8.1 목록 · 상세 (기존)
| # | 메서드 | 경로 | 상태 | 응답 타입(lib/api.ts) |
|---|--------|------|------|------|
| 8.1a | GET | `/suppliers?status=&risk_level=&feoc_status=&page=&size=` | ✅ | `SupplierBrief[]` |
| 8.1b | GET | `/suppliers/{id}` | ✅ | `SupplierBrief` |
| 8.1c | GET | `/suppliers/{id}/detail` | ✅ | `SupplierDetail` (CTI: manufacturer/recycler/trader/miner 중 1종) |
| 8.1d | GET | `/suppliers/{id}/risk-profile` | ✅ | `SupplierRiskProfileResponse` |
| 8.1e | PATCH | `/suppliers/{id}/risk-score` | ✅ | body `{ score: 0~100 }` → 갱신된 risk-profile |
| 8.1f | GET | `/suppliers/{id}/esg` | ✅ | `SupplierEsgResponse` (certifications/humanRightsIssues/industrialAccidents/auditRecords) |
| 8.1g | GET | `/suppliers/{id}/training` | ✅ | `SupplierTrainingResponse` |
| 8.1h | GET | `/suppliers/{id}/reliability` | ✅ | `SupplierReliabilityResponse` |
| 8.1i | GET | `/suppliers/{id}/factories` | ✅ | `SupplierFactoriesResponse` (latitude/longitude) |

> 위 9종의 정확한 응답 필드는 `lib/api.ts`(L262~510)에 타입으로 고정돼 있다. 백엔드는 그 키를 snake_case로 그대로 채운다.
> ⚠ 빈 결과 처리: supplier 자체가 없으면 404, supplier는 있으나 하위 항목(esg/training/factories)이 비면 **200 + 빈 배열**.
> ⚠ `risk-score`는 0~100 밖이면 422.

### 8.2 상세 보강 (신규 — 현재 mock으로 채워진 부분)
| # | 메서드 | 경로 | 상태 | 채우는 화면 |
|---|--------|------|------|------|
| 8.2a | GET | `/suppliers/{id}/extended` | 🆕 | 일반정보 탭 — 사업자/법인 정보 |
| 8.2b | GET | `/suppliers/{id}/contacts` | 🆕 | 담당자 연락처 섹션(현재 비어 있음) |
| 8.2c | GET | `/suppliers/{id}/completeness` | 🆕 | 데이터 완성도 섹션 (= 4.2a) |

- 8.2a: `{ nameEn, nameKo, businessRegNo, corporateRegNo, dunsNumber, taxNumber, ceoName, website, establishedYear, employeeCount }` (테이블 `suppliers`)
  - 대안: `SupplierBrief`에 `nameEn/nameKo` 추가해도 됨.
- 8.2b(배열): `{ contactId, name, nameEn, role, department, email, phone, mobile, isPrimary, language, factoryId }` (테이블 `supplier_contacts`)

---

## 9. 협력사 초대 · 자료 요청 (원청) 🆕

| # | 메서드 | 경로 | 상태 | 화면 |
|---|--------|------|------|------|
| 9.1 | GET | `/suppliers/{id}/downstream-candidates?query={q}` | 🆕 | Invitation 작성 — 하위 후보 검색 |
| 9.2 | POST | `/suppliers/{id}/send-invitation` | 🆕 | 초대 메일 발송 |
| 9.3 | PATCH | `/suppliers/{id}/invitation/{invitationId}` | 🆕 | 초대 임시저장/상태변경 |
| 9.4 | POST | `/suppliers/{id}/data-requests` | 🆕 | 자료 업데이트 요청(맵 허브) |
| 9.5 | POST | `/suppliers/{id}/send-reminder` | 🆕 | SLA 리마인드 재발송 |

- 9.1(배열): `{ supplierName, email, itemName }`
- 9.2 요청: `{ targetSupplierId, recipientEmail, subject, body, attachments: [] }` → `{ invitationId, sentAt, status:"sent" }`
  - 초대-로그인은 `consent_status`(§A-5), `supplier_onboarding`에 기록.
- 9.3 요청: `{ status: "draft|ready|sent", subject, body }`
- 9.4 요청: `{ category: "material|cert|origin|reg", items: [], note }` → `{ requestId, createdAt, status:"sent" }` (`data_request_log`, `onboarding_data_requirements`)
- 9.5 요청: `{ type: "remind_1|remind_2|final" }` → `response_status`(§A-3) 갱신, `notifications` 발송.

---

## 10. 공급망 맵 · 제품/BOM (원청)

### 10.1 제품 / BOM
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 10.1a | GET | `/products` | ✅ 기존 (단, §0.2 무인증 → P1 인증 배선 대상) |
| 10.1b | GET | `/products/{productId}/bom?as_of=YYYY-MM-DD` | ✅ 프론트 어댑터로 흡수 (percentage만 백엔드 협의) |

- 10.1a: `ApiProduct[]` `{ productId, productCode, productName, type }` (테이블 `products`)
- 10.1b ✅ **2026-06-26 해결 — 프론트 어댑터(anti-corruption layer)로 흡수**:
  - 백엔드 실제: `GET /products/{product_id}/bom`. `as_of` 없으면 **중첩 BOM 트리**(`{ product_*, bom_version(번호), bom_status, only_confirmed, tree:{…children} }`), `as_of` 있으면 **버전 메타데이터만**(트리 아님). `bom_version_id` 쿼리는 없고 버전 선택은 별도 `GET /{id}/bom-versions` 목록 사용.
  - 프론트 결정: `lib/api.ts`의 `getProductBom`이 트리(`BomTreeResponse`)를 받아 `normalizeProductBom()`으로 **평면 3배열(`ApiProductBom`)로 평탄화**해 반환. 소비부(`mergeProductBom`·`buildTraceRows` 등)는 **무수정**.
  - 어댑터 파생 규칙: `kind`= tier_level/leaf 여부로 파생, `purchaseUnit`= `required_quantity_unit`, `functionPurpose`= 빈값, `bomVersionId`= `productId:versionNumber` 합성키, `bomItems`= `required_quantity` 있는 노드만(백엔드 CTE가 앵커에만 채움).
  - ⚠ **잔여 협의 1건 — `percentage`**: 백엔드 트리 노드에 BOM 비중 필드가 없음. 어댑터는 `node.percentage ?? 0`으로 graceful 처리(백엔드가 추가하면 자동 반영). 정확한 질량비중이 필요하면 백엔드가 노드에 `percentage` 추가 요청.

### 10.2 공급망 맵 데이터 🆕
현재 트리/테이블은 `lib/supply-chain-mock.ts`로 구동된다. 백엔드 연동 시:
| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 10.2a | GET | `/products/{productId}/supply-chain-map?bom_version_id=&period_from=&period_to=&factory_id=&po_number=` | 🆕 |
| 10.2b | POST | `/supply-chain/maps/{mapId}/confirm` | 🆕 |

- 10.2a: `{ supplyChainMap: [{ partId, supplierId, factoryId, tierLevel, linkStatus }], supplyChainRatios: [{ partId, supplierId, ratioPercent }], suppliers: [], supplierFactories: [], counts: { totalNodes, suppliers, rawMaterials, feocReview, dueDiligence, verified } }`
  - `linkStatus` enum §A-4 (declared \| confirmed). 테이블 `supply_chain_map`, `supply_ratio`.
  - ⚠ **페이지네이션 N/A (의도적 제외)**: 맵은 통째로 그리는 화면이라 페이지로 자르지 않는다 → `X-Total-Count` 헤더(§0.6)를 **붙이지 않는다**. 헤더는 페이징 목록(suppliers·submissions·reports) 전용.
  - **`counts`(본문 집계)**: 화면 상단 통계 바([SupplyChainMapPageContent.tsx:846~851](../../app/supply-chain/SupplyChainMapPageContent.tsx#L846-L851))용. 라벨 매핑 — `totalNodes`=전체 공급망 노드, `suppliers`=공급사, `rawMaterials`=원자재/광산, `feocReview`=FEOC 검토 필요, `dueDiligence`=실사 필요, `verified`=검증완료. **배열 길이로 안 나오는 집계(feocReview/dueDiligence/verified)는 백엔드 계산 필요** → 헤더가 아니라 본문이 맞음.
  - ⚠ **현 데모 한계(2026-06-26 결정 A — mock 확장 안 함)**: `lib/supply-chain-mock.ts`는 `prod-bat-ncm811`의 `bomv-ncm811-v32` **단일 체인만** 연결(공급사·노드 각 6). LFP120·deprecated 버전은 bom_items/supply_chain_map이 비어 트리가 빈 화면. 통계 바 숫자(노드 128/공급사 42/원자재 57)는 **하드코딩 플레이스홀더**다. 실데이터·실집계는 **백엔드 10.2a `counts`로 대체** 예정(데모 mock은 확장하지 않음).
- 10.2b 요청: `{ confirmed: true }` → 맵 최종 확정. 응답 `{ mapId, status:"confirmed" }`.

---

## 11. 협력사 포털 (Supplier) 🆕

협력사 본인 데이터. supplierId는 토큰에서 도출(경로 생략 가능하면 `/supplier/...` 형태 권장).

| # | 메서드 | 경로 | 상태 | 화면 |
|---|--------|------|------|------|
| 11.1 | GET | `/suppliers/{id}/profile` | 🆕 | 포털 메인 — 기업/담당자/공장/인증서 묶음 |
| 11.2 | GET | `/suppliers/{id}/supply-chain` | 🆕 | 직접 연결 상/하위 공급사 |
| 11.3 | GET | `/suppliers/{id}/request-items` | 🆕 | 나에게 온 요청 항목 |
| 11.4 | GET | `/suppliers/{id}/notifications` | 🆕 | 알림 벨 |
| 11.5 | PATCH | `/suppliers/{id}/notifications/{notifId}/read` | 🆕 | 알림 읽음 |

- 11.1: `{ companyName, supplierType, status, riskLevel, contacts: [], factories: [], certifications: [] }` (8.1c/h/i/f 재사용 가능 — 묶음 응답이면 호출 1회)
- 11.2: `{ upstream: [{ supplierId, companyName, relationship, tier, material }], downstream: [...] }` (테이블 `supply_chain_map`)
- 11.3(배열): `{ requestId, label, due, status, tone }` (`data_request_log`)
- 11.4(배열): `{ notificationId, notificationType, subject, body, status, createdAt, deepLink }` (테이블 `notifications`, status §B `pending\|sent\|failed\|read`)
- 11.5 → 204.

---

## 12. 협력사 온보딩 · 자료 제출 · 공급망 입력 (Supplier) 🆕

| # | 메서드 | 경로 | 상태 | 화면 |
|---|--------|------|------|------|
| 12.1 | POST | `/suppliers/onboarding/register` | 🆕 | 온보딩 가입 |
| 12.2 | POST | `/suppliers/{id}/submissions` | 🆕(multipart) | 자료 제출 위저드 |
| 12.3 | GET | `/suppliers/{id}/submissions/{submissionId}` | 🆕 | 제출 현황/검증 결과 |
| 12.4 | GET | `/suppliers/{id}/ai-parsing/{submissionId}` | 🆕 | AI 파싱 결과 확인 |
| 12.5 | POST | `/suppliers/{id}/ai-parsing/confirm` | 🆕 | 파싱 결과 수정·확정 |
| 12.6 | POST | `/suppliers/{id}/supply-chain-map` | 🆕 | 공급망 정보 입력(제출) |
| 12.7 | PATCH | `/suppliers/{id}/supply-chain-map/{scmId}` | 🆕 | 임시저장/재제출 |

- **12.1** 요청(분기):
  ```jsonc
  // firstTier(초대받은 1차)
  { "registrationType": "firstTier", "parentSupplierId": "S-CELL-001",
    "consentAgreed": true,
    "pics": [{ "name": "...", "email": "...", "phone": "..." }] }
  // nTier(신규 등록)
  { "registrationType": "nTier", "companyName": "...", "country": "KR",
    "businessRegNo": "...", "dunsNumber": "...", "address": "...",
    "department": "...", "registrationDocFileId": "f-...", "unverified": false,
    "consentAgreed": true, "pics": [ ... ] }
  ```
  응답: `{ supplierId, status: "supplier_pending", createdAt }` (테이블 `supplier_onboarding`, `supplier_contacts`; consent §A-5, agreement §B)
- **12.2** `multipart`: fields `requestLabels[]`, `submissionType(general|supply_chain_map)`, `files[]`
  응답: `{ submissionId, status:"submission_submitted", createdAt }`
  - 제약 §0.8. 공급망 요청(`supply_chain_map`)은 엑셀(xlsx/xls/csv)만 허용.
- **12.3**: `{ submissionId, requestLabels: [], files: [{ fileId, fileName, sizeBytes, uploadStatus }], status, reviewResults: [{ label, result, reason, tone }] }`
- **12.4**(배열): `{ fileId, fileName, parsedFields: [{ fieldName, extractedValue, confidence, userValue }] }` (테이블 `document_extraction_results`)
- **12.5** 요청: `{ fileId, verifiedFields: [{ fieldName, userValue }] }` → `{ status:"confirmed" }` (확정 시 `submission_submitted` 전이)
- **12.6** 요청(공급망 입력 — 큰 페이로드): `{ providerType, selectedPos: [], materials: {...}, regulations: {...}, submissionType: "draft|final" }`
  - `materials`: `{ minerals: [{ mineral, contentPct, recoveryPct }], harmfulSubstances, recycledContentPct, recyclingDocs: [{ label, fileId }], factories: [], childMaterials: [] }`
  - `regulations`: `{ carbonIntensity, energySource, carbonDocs, directOwnershipPct, indirectOwnershipPct, feocDocs, dueDiligenceVerdict, trainingCompletionPct, auditDocs, certifications: [{ type, issuingBody, certNo, expiresAt }], originDocs }`
  - 응답: `{ supplyChainMapId, status, createdAt }` (테이블 `supply_chain_map`, `supplier_certifications`, `origin_certificates`, `training_records`, `manufacturing_process`)

---

## 13. 위반 시정 · 자진 신고 (Supplier) 🆕

| # | 메서드 | 경로 | 상태 |
|---|--------|------|------|
| 13.1 | GET | `/suppliers/{id}/violations` | 🆕 |
| 13.2 | POST | `/suppliers/{id}/violations/{violationId}/remediation` | 🆕(multipart) |
| 13.3 | GET | `/suppliers/{id}/current-suppliers` | 🆕 |
| 13.4 | POST | `/suppliers/{id}/self-report/supply-source-change` | 🆕 |

- 13.1(배열): `{ violationId, regulation, regulationLabel, summary, detectedAt, severity }` (= §2.3, `compliance_results`)
- 13.2 `multipart`: `{ reason, remediationPlan, targetCompletionDate, files[] }` → `{ remediationId, status:"submitted" }`
- 13.3(배열): `{ supplierId, companyName, country, material, contact }` (현재 직속 상위/하위)
- 13.4 요청: `{ changeType: "new|replace|add", currentSupplierId?, newSupplierName, newCountry, newContact, reason }` → `{ reportId, status:"submitted" }`
  - 신고된 연결은 `supply_chain_map.link_status = declared`(§A-4)로 들어가 원청 검증 대기.

---

## 부록 A. Enum 사전 (워크플로우 상태 — SSOT)

전체 정의는 [`STATE_DICTIONARY.md`](./STATE_DICTIONARY.md). API에서 쓰는 핵심만 발췌.

| § | 칼럼 | 허용값 |
|---|------|--------|
| A-1 | `supplier_status` | supplier_pending, supplier_requested, supplier_in_progress, supplier_review, supplier_verified, supplier_violation, supplier_suspended |
| A-2 | `submission_status` | submission_requested, submission_in_progress, submission_submitted, submission_review, submission_approved, submission_rejected (+ `is_archived` bool) |
| A-3 | `response_status` | response_pending, response_responded, response_overdue, response_escalated |
| A-4 | `link_status` | supplychain_declared, supplychain_confirmed |
| A-5 | `consent_status` | consent_pending, consent_agreed, consent_rejected |
| A-6 | `batch_status` | batch_processing, batch_hitl_wait, batch_completed, batch_rejected |
| A-7 | `batch_stage` | stage_queued, stage_extraction, stage_verification, stage_geo, stage_compliance, stage_risk, stage_readiness, stage_issuance |
| A-8 | `compliance_verdict` | compliance_passed, compliance_violation, compliance_warning, compliance_reject (+ `needs_human_review` bool) |
| A-9 | `hitl_status` | hitl_pending, hitl_in_review, hitl_resolved (+ `resolution`: approve/reject/escalate) |
| A-10 | `dpp_status` | dpp_issued, dpp_revoked |

**속성 상태(§B, 접두어 없음)**: `risk_level`(low/medium/high/critical), `feoc_status`(eligible/ineligible/under_review/unknown), `origin_certificates.status`(valid/expiring_soon/expired/under_review), `training_records.status`(completed/in_progress/overdue/not_started), `bom_versions.status`(draft/active/deprecated), `notifications.status`(pending/sent/failed/read), `agreement_status`(pending/agreed/rejected), `tenants.subscription_status`(active/suspended/trial).

---

## 부록 B. 엔드포인트 요약

### ✅ 기존 (lib/api.ts 호출부 존재 + 백엔드 구현 일치) — 15종
`GET /dashboard/kpis` · `GET /batches` · `GET /hitl/queue` · `GET /audit/trail/{batchId}` · `GET /actions` · `GET /suppliers` · `GET /suppliers/{id}` · `GET /suppliers/{id}/detail` · `GET /suppliers/{id}/risk-profile` · `PATCH /suppliers/{id}/risk-score` · `GET /suppliers/{id}/esg` · `GET /suppliers/{id}/training` · `GET /suppliers/{id}/reliability` · `GET /suppliers/{id}/factories` · `GET /products`
> ⚠ 이 중 `/dashboard`·`/batches`·`/suppliers`(9)·`/products`는 현재 **무인증** → P1 인증 배선 대상(§0.2).

### 🔵 백엔드 기존(경로 고정) — 프론트가 실제 경로로 연동
`GET /dpp/records`(6.1a) · `GET /dpp/products/{productId}/readiness`(6.3a) · `POST /dpp/{dppId}/issue`(6.3c)

### 🟡 재합의 (경로/쿼리/응답 구조 확정 필요)
`GET /products/{productId}/bom`(10.1b — as_of vs bom_version_id, 트리 vs 평면) · `GET /dpp/records/{dppId}`(6.1b 단건 경로) · DPP readiness 목록 경로(6.3b)
> ✅ 목록 total 규약(§0.6)은 **X-Total-Count 헤더 방식으로 확정**(2026-06-26).

### 🆕 신규 (백엔드 구현 + 경로 합의 필요)
인증(3) · 위반(2.3) · HITL상세/결정(2) · 감사패키지(3) · 보고/결재(7) · 제출검토(5) · 완성도/자료요청(3) · 실사(5) · DPP 센터 위젯(6.2, 5) · 규제결과(1) · 협력사보강(3) · 초대/요청(5) · 공급망맵(2) · 포털(5) · 온보딩/제출/입력(7) · 위반/자진신고(4) · 파일(3).

### 우선순위 제안
- **P1(연동 차단 해소)**:
  - 🔴 **기존 라우터 전수 인증·테넌트 격리 배선** (§0.2 — `/suppliers`(9)·`/products`·`/dashboard`·`/batches` 무인증 → 전 라우터 Bearer + tenant_id + 401/403)
  - 인증 엔드포인트(§1 `/auth/login`·`/auth/me`), 파일 업로드(§0.8), 협력사 자료 제출(§12.2~12.5), 완성도(§4.2)
  - ✅ 목록 total 규약은 **X-Total-Count 헤더로 확정**(§0.6) — 전 목록 응답에 헤더 부착
- **P2(핵심 업무)**: 제출 검토(§4.1), HITL 상세/결정(§2.4), DPP 발행/이력/readiness 경로 정합(§6 — 🔵/🟡), 초대/자료요청(§9)
- **P3(운영 고도화)**: 보고/결재(§3), 실사(§5), DPP 센터 위젯(§6.2), 감사 패키지(§2.5), 공급망 맵(§10.2)

---

## 부록 C. DB 테이블 ↔ 엔드포인트 매핑 (정합 확인용)

| 테이블 | 관련 엔드포인트 |
|--------|----------------|
| suppliers / supplier_factories / supplier_contacts | §8, §11.1 |
| supplier_{manufacturer\|recycler\|trader\|miner}_details | §8.1c |
| supplier_certifications / origin_certificates | §8.1f, §12.6 |
| supplier_risk_profiles | §8.1d, §8.1e |
| supplier_audit_records / due_diligence_policies / detention_cases | §5 |
| supplier_human_rights_issues / supplier_industrial_accidents | §8.1f |
| training_materials / training_records | §8.1g |
| data_completeness_status | §4.2, §8.2c |
| products / bom_versions / parts / bom_items | §10.1 |
| supply_chain_map / supply_ratio | §10.2, §11.2, §13.4 |
| batches | §2.2 |
| dpp_records | §6 |
| regulations / compliance_results / regulation_applicability | §2.3, §7, §13.1 |
| data_request_log / submission_documents / document_extraction_results / submission_status_history | §4.1, §4.2c, §9, §12.2~12.5 |
| onboarding_data_requirements / supplier_onboarding | §9.4, §12.1 |
| notifications | §9.5, §11.4 |
| hitl_reviews | §2.4 |
| audit_trail / audit_data_snapshots / gap_analysis_results | §2.5 |
| reports / report_approval_steps | §3.2, §3.3 |
| users / tenants / view_permissions | §1, §0.2 |
| processed_jobs | (비동기 파싱 — §12.4 내부) |

---

## 부록 D. 화면 ↔ 역할

- **원청(OEM)**: `/dashboard` `/my-task` `/supply-chain/*` `/suppliers/*` `/due-diligence` `/dpp/*` `/dpp` `/hitl` `/materials/*` `/report/*` `/audit/*` `/submission-review` `/submission-status`
- **협력사(Supplier)**: `/supplier` `/supplier/onboarding` `/supplier/supply-chain`
- **공통**: `/` `/login`

(문서 끝)
