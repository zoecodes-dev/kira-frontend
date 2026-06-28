# 백엔드 연동 필요 구간 — 도메인별 매핑

프론트의 mock/플레이스홀더 구간을 **실제 백엔드 도메인**(`kira-backend/backend/domains/*`)과 대조해 정리.
"어느 도메인에서 연결해야 하는지" + "한 페이지가 여러 도메인에 걸치는지(혼합)" 표기.

## 상태 범례
- ✅ **연동됨(폴백)** — 엔드포인트 존재 + 이 화면이 호출함. mock은 실패 시 폴백일 뿐. (백엔드 정상이면 실데이터)
- 🔌 **배선 필요** — 엔드포인트는 **존재**하나 이 화면이 호출 안 함 → 프론트 배선만 하면 됨.
- 🌱 **데이터 시드** — 엔드포인트·배선 OK인데 백엔드 데이터가 비어(null) mock/“미입력”으로 보임.
- 🆕 **엔드포인트 신설** — 해당 도메인/엔드포인트 자체가 없음.
- 🧩 **자리표시/외부** — react-pdf·S3 등 백엔드 도메인 외 작업.

> 핵심 정정: 원문서가 “미제공”이라던 **연락처 API는 실존**(`supplier` 도메인 `GET /suppliers/{id}/contacts`)하며 check-info는 이미 호출 중. 목록/포털 뷰만 배선하면 됨.

---

# 도메인별

## 🟩 supplier 도메인 — `/suppliers`
실존 엔드포인트: `GET /suppliers`, `/{id}`, `/{id}/detail`, `/{id}/contacts`, `/{id}/factories`, `/{id}/completeness`, `/{id}/origin-certificates`, `/{id}/supplied-items`, `/{id}/esg`, `/{id}/reliability`, `/{id}/risk-profile`, `/{id}/carbon-declarations`, `/{id}/training`, `POST /{id}/master-form`.

| 프론트 구간 | 파일 | 상태 | 조치 |
|---|---|---|---|
| 협력사 목록 연락처 "미등록" | `app/suppliers/page.tsx:181-182,359-360` | 🔌 | `getSupplierContacts` 배선(엔드포인트 존재). 주석 `연락처 API 미제공`은 **stale** |
| 협력사 포털 연락처·사업자정보·제조공정 빈값 | `components/supplier-pages/SupplierInfoPage.tsx:196-198` | 🔌 | contacts=existing, 사업자/제조공정=`/{id}/detail`(CTI provider별) 배선 |
| check-info 요약(국가·담당자 등) | `app/suppliers/check-info/SupplierGeneralReview.tsx:93-108,672-682` | ✅🌱 | 실 UUID면 API 우선(완료). `country` **null 시드 공백** → 시드 필요 |
| check-info 6개 표(회사/연락처/공장/인증/품목/원산지) | 동 `:153-190` | ✅ | 실 협력사면 detail·contacts·factories·esg·supplied-items·origin-certificates로 채움(폴백 데모표) |
| 입력현황 보드 | `components/suppliers/SupplierInputStatusBoard.tsx:44-68` | ✅ | `/suppliers`+`/{id}/completeness` 폴백 |
| 헤더 tier "—" | check-info `:674` | 🆕 | `SupplierDetail`에 tier 필드 없음(공급망 관계 개념) → supplychain hop_level 활용 or 필드 추가 |

## 🟩 submission 도메인 — `/data-requests`, `/submissions`
실존: `GET/POST /data-requests`, `/data-requests/ai-extractions`, `/{id}`, `/{id}/submit|approve|reject|rework`, `/{id}/completeness`, `/send-reminders`, `GET /submissions`, `/{id}` + approve/rework/reject.

| 프론트 구간 | 파일 | 상태 | 조치 |
|---|---|---|---|
| My Task 자료요청 | `app/my-task/page.tsx` RequestArea | ✅ | `/data-requests` 폴백. `missing_count` 미집계 시 누락표시 생략 |
| AI 추출 검토(HITL) | `components/supplier/AiParsingView.tsx:37-71`, `components/dashboard/HitlReviewCard.tsx` | ✅ | `/data-requests/ai-extractions` 폴백/빈. 데이터 커버리지 확인 |
| 제출 8단계 트래커(문서 단위) | `components/supplier/EightStageStepper.tsx:64-99,108` | 🔌 | `GET /submissions` 또는 batches로 배선(현재 `mockSubmissions`+`MOCK_BATCH_STATUS` 데모) |

## 🟩 regulation 도메인 — `/regulation`
| 프론트 구간 | 파일 | 상태 | 조치 |
|---|---|---|---|
| AI 규제 검증 결과 | `components/dashboard/RegulationResultsCard.tsx:21-24` | ✅ | `/regulation/materials/regulation-results` 폴백(이번에 연동) |

## 🟩 audit 도메인 — `/audit`, `/audit-packages`
실존: `GET /actions`, `/actions/mine`, `/trail/{batch_id}`, `/gap-analysis/{regulation_id}`, `/audit-packages`, `POST /audit-packages/{id}/export`.

| 프론트 구간 | 파일 | 상태 | 조치 |
|---|---|---|---|
| My Task 업무 큐(`_MOCK_TASKS`) | `app/my-task/page.tsx` | 🔌 | `getActions`→`/actions(/mine)` 존재. 현재 탭에서 미렌더(잔존 상수) → 쓰면 배선, 안 쓰면 제거 |
| 완료 증빙 다운로드(alert) | `components/supplier/EightStageStepper.tsx:397` | 🔌 | `POST /audit-packages/{id}/export` 로 배선 |

## 🟩 batches 도메인 — `/batches`, `/dashboard`
실존: `GET /batches?status=`, `/batches/{id}`, `/kpis`, `/dashboard`.

| 프론트 구간 | 파일 | 상태 | 조치 |
|---|---|---|---|
| 대시보드 KPI/배치 현황 | `app/dashboard/page.tsx` | ✅/🔌 | `/dashboard`·`/kpis`·`/batches` 확인 |
| 8단계 배치 상태(`MOCK_BATCH_STATUS`) | `components/supplier/EightStageStepper.tsx:108` | 🔌 | `/batches/{id}` 상태로 교체 |

## 🟩 files 도메인 — `/files`
실존: `POST /files`, `GET /files`, `/{id}`, `DELETE /{id}`.

| 프론트 구간 | 파일 | 상태 | 조치 |
|---|---|---|---|
| 문서 업로드(파일명만 저장) | `app/suppliers/check-info/SupplierGeneralReview.tsx` DocUploadField | 🔌🧩 | `POST /files`(존재). 로컬은 S3 자격증명 없어 실패 → **프로덕션만 동작** |
| PDF 뷰어 자리표시 | `components/supplier/AiParsingView.tsx:236` | 🧩 | `react-pdf` 도입 + 원본 URL(`/files` 또는 `submission_documents.file_url`) |

## 🟩 supplychain 도메인 — `/supply-chain`, `/products`
실존: `/tree`, `/by-hop/{n}`, `/gaps`, `/alternatives`, `/geo-risks`, `POST /notifications/correction`, `POST /declarations/source-change`, `/verify`, `/trigger-data-requests`, `/{product_id}/supply-chain-map`, `/maps...`.

| 프론트 구간 | 파일 | 상태 | 조치 |
|---|---|---|---|
| 공급망 맵/허브 데모 dataset | `app/supply-chain/page.tsx`, `SupplyChainHub.tsx`, `SupplyChainMapPageContent.tsx` | ✅ | `mockDataset`(`lib/supply-chain-mock.ts`) 폴백. graceful(미배포 부분만 skip) |
| 자가신고 현재 공급원(`MOCK_CURRENT_SUPPLIER`) | `components/supplier/SelfReportModal.tsx:44-49` | 🔌🆕 | 변경 등록은 `POST /declarations/source-change`(존재). **현재 공급원 조회 GET은 없음** → supplied-items 활용 or 신설 |
| hop_level/tier 폴백 | `SupplyChainHub.tsx` | 🌱 | `hop_level` 미배포 시 tierLevel 폴백 → 배포 확인 |

## 🟩 product 도메인 — `/products`
실존: `GET /products`, `/{id}`, `/{id}/bom-versions`, `/{id}/bom`, 활성/폐기.

| 프론트 구간 | 파일 | 상태 | 조치 |
|---|---|---|---|
| BOM `kind` 파생 | `lib/api.ts:917` | 🌱🆕 | 백엔드 미제공 → `/products/{id}/bom` 응답에 `kind` 추가(현재 tier_level/leaf로 파생) |
| BOM `functionPurpose` 빈값 | `lib/api.ts:952` | 🆕 | `function_purpose` 필드 추가 |

---

# 🆕 신설 필요 — 해당 도메인/엔드포인트 자체가 없음

| 프론트 구간 | 파일 | 제안 위치 |
|---|---|---|
| 협력사 알림 벨(`MOCK_NOTIFICATIONS`) | `components/supplier/SupplierNotificationBell.tsx:29-57` | **notifications 도메인 신설**(또는 users/audit에 `GET /notifications`) |
| 공급망 입력 PO 목록(`MOCK_POS`) | `components/supplier/supply-chain-entry/StepContext.tsx:19-23` | **purchase-order 엔드포인트 신설**(supplychain 또는 신규 도메인) — 주석 `백엔드 PO 엔드포인트 없어 mock` |
| 자가신고 현재 공급원 GET | `SelfReportModal.tsx` | supplychain에 `GET /current-supply-source` 추가 |
| 완료 증빙 파일 | `EightStageStepper.tsx:397` | audit `/audit-packages/{id}/export` 재사용 가능(신설 불요) |

---

# 🧩 멀티 도메인 페이지 — 한 화면에서 여러 도메인을 손봐야 함

| 페이지 | 걸치는 도메인 | 무엇을 어디서 |
|---|---|---|
| **협력사 정보 단일 폼** `app/suppliers/check-info/SupplierGeneralReview.tsx` | **supplier** + **files** + **submission** | 회사/연락처/공장/인증/품목/원산지·완성도 = supplier · 문서 업로드 = files · "추가 자료 요청"(createDataRequest) = submission |
| **My Task** `app/my-task/page.tsx` | **submission** + **audit** + **regulation** + **supplier** + **files** | 자료요청·AI추출 = submission · 업무큐(actions) = audit · 규제검증 카드 = regulation · 입력현황 보드(suppliers/completeness) = supplier · 파싱뷰 업로드 = files |
| **대시보드** `app/dashboard/page.tsx` | **batches** + **submission** + **regulation** | KPI/배치 = batches · HITL AI추출 = submission · 규제검증 = regulation |
| **공급망 맵/허브** `app/supply-chain/*` | **supplychain** + **product** + **submission** | 맵/트리/gaps/alternatives = supplychain · 제품/BOM = product · 노드 자료요청(trigger-data-requests) = submission |
| **협력사 목록** `app/suppliers/page.tsx` | **supplier** (+ contacts 배선) | 목록=supplier brief · 연락처=supplier contacts(배선) |
| **8단계 트래커** `components/supplier/EightStageStepper.tsx` | **submission** + **batches** + **audit** | 제출 단계 = submission/batches · 완료증빙 = audit |

---

# 우선순위 요약
- **즉시(배선만, 엔드포인트 실존)** 🔌: 협력사 목록/포털 **연락처**(supplier), My Task **업무큐**(audit), 8단계 **submissions/batches**, 완료증빙(audit), 문서업로드(files·프로덕션).
- **데이터 시드** 🌱: supplier `country`, supplychain `hop_level`, product BOM `kind/function_purpose`.
- **엔드포인트 신설** 🆕: **알림(notifications)**, **PO(purchase-order)**, 현재 공급원 GET.
- **외부/라이브러리** 🧩: react-pdf 뷰어, S3 파일저장(프로덕션 자격증명).

> 폴백(✅) 구간은 백엔드 배포·시드만 되면 자동 실데이터. 실제 작업 대상은 🔌(배선)·🌱(시드)·🆕(신설)·🧩(외부).
