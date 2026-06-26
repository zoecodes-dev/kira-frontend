# 프론트 API 연동 체크리스트

[KIRA_백엔드_API_명세서.md](./KIRA_백엔드_API_명세서.md)의 엔드포인트가 구현된 뒤, 프론트가 **mock → 실제 API**로 갈아끼우는 작업 목록.

- **작성일**: 2026-06-26
- **핵심 사실**: 백엔드 구현 ≠ 데이터 자동 표시. 프론트는 ① `lib/api.ts` 함수 + ② 20개 화면 파일을 고쳐야 한다.
- **현재 배선 상태**: fetch 배관(`lib/api.ts` 래퍼·JWT·snake→camel)은 ✅ 완성. 화면 연결은 대부분 ❌ mock.
- **mock을 그리는 화면 20개**(grep `@/lib/data` · `@/lib/supplier-detail-data` · `@/lib/supply-chain-mock`):
  `dashboard` · `dpp` · `dpp/center` · `dpp/readiness` · `due-diligence` · `submission-review` · `submission-status` · `suppliers/check-info` · `supplier` · `audit` · `audit/package` · `supply-chain/SupplyChainHub` · `supply-chain/SupplyChainMapPageContent` · `supplier/SupplyChainMap` · `supplier-pages/sections/info/*`(6) 등

---

## A. 지금 시작 가능 (백엔드 라이브 엔드포인트 불필요)

라이브 응답 없이도 진행 가능한 선작업. 백엔드 대기 시간을 줄인다.

- [ ] **A-1. env 세팅** — `.env.local`에 `NEXT_PUBLIC_USE_API=true`, `BACKEND_ORIGIN=http://<EC2_IP>` (또는 로컬 `:8000`). 안 켜면 `lib/data.ts:311`이 계속 mock 폴백.
- [ ] **A-2. `lib/api.ts`에 🆕 함수 추가** — 경로가 확정된 신규 엔드포인트의 호출 함수 + 타입을 미리 작성(§명세서 B의 🆕 목록). 🟡 재합의 3건(BOM·dpp 단건·readiness 목록)은 **보류**.
- [ ] **A-3. 목록 헬퍼** — `X-Total-Count` 헤더를 읽는 목록 변형 함수 추가(§0.6 확정). 현재 `request()`는 본문만 반환하므로 헤더 노출 변형이 필요. suppliers·submissions·reports가 사용.
  - ⏸ **보류(백엔드 회신 2026-06-26 #3)**: 헤더가 아직 미발행 → 지금 읽어도 빈 값. **전체 페이지 수 계산은 다음 배포까지 보류**. 목록 본문(bare array)은 정상이므로 목록 자체는 연동 진행 가능.
- [ ] **A-4. 공통 로딩/에러/빈 상태 패턴** — mock은 항상 즉시 존재해서 이 분기가 없다. 화면 교체 전에 재사용 컴포넌트(스피너/에러배너/빈상태) 정리.
- [x] **A-5. 인증 연동** ✅ 완료(2026-06-26) — `app/login/page.tsx` → `login()`(`POST /auth/login`) → `setToken()` → 응답 `role`로 분기. `NEXT_PUBLIC_USE_API!=='true'`면 데모 흐름 유지. `lib/api.ts`에 `login`/`LoginResponse` 추가.
  - ⚠ **선결 조건 해소**: 백엔드 인증 배포(`/suppliers·/products·/batches·/dashboard` 토큰 필수, 회신 #1)와 **동시/선행**이어야 그 화면들이 401로 안 깨짐.
  - 🟡 **역할 분기 주의(회신 #2)**: 로그인 응답 `supplierId`는 현재 항상 `null`(users↔suppliers 매핑 컬럼 미도입). 협력사 포털이 `supplierId`에 의존하면 아직 동작 안 함 → 매핑 도입 후 재연동.
  - 🟢 **로그아웃(회신 #4)**: `/auth/logout`은 204 무상태. 서버 블랙리스트 없음 → `clearToken()`만으로 처리(엔드포인트 호출은 선택).

---

## B. 백엔드 도메인별 연동 (구현 완료된 도메인부터 순차)

각 행: **화면 파일 → 현재 mock 출처 → 대상 API 함수(상태) → 할 일**.
권장 순서 = 명세서 우선순위 P1 → P2 → P3.

### B-1. 협력사(Suppliers) — ✅ 함수 대부분 존재, 가장 먼저 가능
| 화면 | 현재 출처 | 대상 API | 할 일 |
|------|----------|---------|-------|
| `app/suppliers/page.tsx` | `getSuppliers`+`getSupplierReliability`(일부 연동) + "미등록" 하드코딩 | ✅ 기존 + 🆕 `getSupplierContacts` | 주담당자 mock 제거, total 헤더로 페이지네이션 |
| `components/supplier-pages/sections/info/*` (6개) | `supplier-detail-data.ts` | ✅ esg/factories/reliability/detail + 🆕 `extended`·`contacts`·`completeness` | InfoContactsSection(비어있음)·InfoCompletenessSection(0/[]) 실데이터로 |
| `app/suppliers/check-info/page.tsx` | `supplierCompleteness` mock + 하드코딩 sections | 🆕 `completeness`·`data-collection`·`request-items` | 섹션별 상태/코멘트 실데이터, "추가 자료 요청" POST 연결 |
| `app/suppliers/invitations/page.tsx` | mock 후보/템플릿 | 🆕 `downstream-candidates`·`send-invitation`·`invitation` | 후보 검색·발송·임시저장 연결 |

### B-2. 인증/테넌트 (P1) — 전 화면 선행
| 작업 | 할 일 |
|------|-------|
| 로그인 | A-5 참조. 토큰 저장 후 모든 보호 화면 동작 확인 |
| 401 핸들링 | `ApiError(401)` → 로그인 리다이렉트 동작 점검(이미 `clearToken` 됨) |

### B-3. 운영 대시보드/배치/HITL/감사
| 화면 | 현재 출처 | 대상 API | 할 일 |
|------|----------|---------|-------|
| `app/dashboard/page.tsx` | `getDashboardKpis`+`getBatches`(연동) + `violationsByRegulation`·`dppRecords`·`suppliers` mock | ✅ kpis/batches + 🆕 `violations` | 위반 위젯 등 mock 블록 교체 |
| `app/hitl/page.tsx` | `getHitlQueue`(연동) + `reviewQueue` mock 상세 | ✅ queue + 🆕 `review/{id}`·`decision` | 상세 패널·승인/반려 POST 연결 |
| `app/audit/page.tsx` | `getAuditTrail`(연동) | ✅ 기존 | 거의 완료 — 검증만 |
| `app/audit/package/page.tsx` | `packages`·`checklist` mock | 🆕 `audit-packages`(목록/상세) | 전체 교체 |
| `app/my-task/page.tsx` | `getActions` + `_MOCK_TASKS` | ✅ actions | mock 폴백 제거 |

### B-4. 보고/결재·제출검토·입력현황
| 화면 | 현재 출처 | 대상 API | 할 일 |
|------|----------|---------|-------|
| `app/report/page.tsx`·`report/inbox` | `reports`·`inboxReports` mock | 🆕 reports(7종) | 목록/상세/결재 전체 |
| `app/submission-review/page.tsx` | `submissions` mock + `supplier-detail-data` | 🆕 submissions(5종) | 승인/보완/반려 PATCH |
| `app/submission-status/page.tsx` | `submissions`·`supplierCompleteness` mock | 🆕 completeness·submission-summary·request-data·reminder | 완성도·리마인드 |

### B-5. DPP (🔵/🟡 경로 정합 주의)
| 화면 | 현재 출처 | 대상 API | 할 일 |
|------|----------|---------|-------|
| `app/dpp/page.tsx` | `dppRecords` mock | 🔵 `GET /dpp/records` | 경로 `dpp_id` 기준, 필터 쿼리 확정 후 |
| `app/dpp/readiness/page.tsx` | `readinessRows` mock | 🔵 `GET /dpp/products/{id}/readiness` + 🟡 목록경로 + 🆕 `issue` | **serialNumber→productId 단위 전환**(화면 구조 영향), 발행은 `dppId` |
| `app/dpp/center/page.tsx` | `heldProducts` 등 mock | 🆕 status/held-products/blockers/trend/avg | 위젯별 교체 |

### B-6. 규제결과·실사
| 화면 | 현재 출처 | 대상 API | 할 일 |
|------|----------|---------|-------|
| `app/materials/regulation-results/page.tsx` | `results` mock | 🆕 `regulation-results` | 전체 교체 |
| `app/due-diligence/page.tsx` | `audits` mock + `supplierRiskProfiles` | 🆕 due-diligence(5종) | 보고서 업로드(multipart)·CAPA |

### B-7. 공급망 맵·제품/BOM (🟡 BOM 재합의 선행)
| 화면 | 현재 출처 | 대상 API | 할 일 |
|------|----------|---------|-------|
| `SupplyChainHub`·`SupplyChainMapPageContent` | `supply-chain-mock.ts` | ✅ `getProducts` + 🟡 `getProductBom` + 🆕 `supply-chain-map` | **BOM 응답 트리 vs 평면 확정 후** 타입·렌더링 수정 |

### B-8. 협력사 포털·온보딩·제출
| 화면 | 현재 출처 | 대상 API | 할 일 |
|------|----------|---------|-------|
| `app/supplier/page.tsx` | `getSupplierFactories`+`getSupplierEsg`(일부) + mock 알림/요청 | 🆕 profile·supply-chain·request-items·notifications | `supplierId='S-CELL-001'` 하드코딩 → 토큰 기반 |
| `components/supplier/SubmitWizardModal` | props mock + 로컬 파일상태 | 🆕 submissions(multipart)·submission-status | 파일 업로드 §0.8 |
| `components/supplier/AiParsingView` | mock | 🆕 ai-parsing·confirm | |
| `components/supplier/onboarding/*` | query param + 로컬 | 🆕 `onboarding/register` | |
| `components/supplier/supply-chain-entry/*` | 로컬 초기값 | 🆕 `supply-chain-map`(큰 페이로드)·PATCH | |
| `components/supplier/ViolationReportModal`·`SelfReportModal` | mock 기본값 | 🆕 violations·remediation·current-suppliers·self-report | multipart |

---

## C. 화면별 공통 교체 패턴

각 화면에서 반복되는 작업:

1. **mock import 제거** → `useEffect`에서 api 함수 호출, `useState`로 보관.
2. **로딩/에러/빈 상태** 분기 추가 (mock엔 없던 것).
3. **응답 → 화면 모델 어댑터**:
   - 이미 있는 것 재사용: status 매핑(`supplier_verified→verified`), 좌표 `[lng,lat]`, 인증서 상태 파생 — `SupplierInfoPage.tsx` 참고.
   - mock으로 채우던 빈 구멍(연락처, `filledFieldCount`/`missingFields`)은 새 응답에 맞춰 신규 작성.
4. **쓰기 액션**: 버튼 onClick → POST/PATCH 호출 → 성공 시 재조회 또는 낙관적 갱신. (⚠ AGENTS.md: `<form>` 금지, onClick/onChange로)
5. **검증**: 라이브 엔드포인트로 실제 렌더 확인 후 다음 도메인으로.

---

## D. 진행 권장 순서

big-bang 금지. **백엔드 1개 도메인 완료 → 프론트 그 화면만 B 작업 → 검증** 반복.

1. A 선작업(env·함수·로딩패턴·로그인)
2. B-2 인증 → B-1 협력사(✅ 함수 많아 빠름) → B-3 운영
3. B-4 보고/제출 → B-5 DPP(경로 정합) → B-6 규제/실사
4. B-7 공급망맵(BOM 합의 후) → B-8 협력사 포털

(문서 끝)
