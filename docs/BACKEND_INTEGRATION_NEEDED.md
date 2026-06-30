# 백엔드 연동 필요 — 신설 / 멀티 도메인 페이지

# 🆕 신설 필요 — 해당 도메인/엔드포인트 자체가 없음

| 프론트 구간 | 파일 | 제안 위치 |
|---|---|---|
| 협력사 알림 벨(`MOCK_NOTIFICATIONS`) | `components/supplier/SupplierNotificationBell.tsx:29-57` | **notifications 도메인 신설**(또는 users/audit에 `GET /notifications`) |
| 자가신고 현재 공급원 GET | `SelfReportModal.tsx` | supplychain에 `GET /current-supply-source` 추가 |
| 완료 증빙 파일 | `EightStageStepper.tsx:397` | audit `/audit-packages/{id}/export` 재사용 가능(신설 불요) |

---

# 🧩 멀티 도메인 페이지 — 한 화면에서 여러 도메인을 손봐야 함

| 페이지 | 걸치는 도메인 | 무엇을 어디서 |
|---|---|---|
| **협력사 정보 단일 폼** `app/suppliers/check-info/SupplierGeneralReview.tsx` | **supplier** + **files** + **submission** | 회사/소재/공장/규제/문서·완성도 = supplier(`PATCH /detail` — 탄소→manufacturer_details, 자가진단→risk_profiles, country는 service가 ISO 정규화) · 문서 업로드 = files · "추가 자료 요청"(createDataRequest) = submission |
| **My Task** `app/my-task/page.tsx` | **submission** + **audit** + **regulation** + **supplier** + **files** | 자료요청·AI추출 = submission · 업무큐(actions) = audit · 규제검증 카드 = regulation · 입력현황 보드(suppliers/completeness) = supplier · 파싱뷰 업로드 = files |
| **대시보드** `app/dashboard/page.tsx` | **batches** + **submission** + **regulation** | KPI/배치 = batches · HITL AI추출 = submission · 규제검증 = regulation |
| **공급망 맵/허브** `app/supply-chain/*` | **supplychain** + **product** + **submission** | 맵/트리/gaps/alternatives = supplychain · 제품/BOM = product · 노드 자료요청(trigger-data-requests) = submission |
| **협력사 목록** `app/suppliers/page.tsx` | **supplier** (+ contacts 배선) | 목록=supplier brief · 연락처=supplier contacts(배선) |
| **8단계 트래커** `components/supplier/EightStageStepper.tsx` | **submission** + **batches** + **audit** | 제출 단계 = submission/batches · 완료증빙 = audit |
