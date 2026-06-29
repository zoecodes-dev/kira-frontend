# 핸드오프 — 공급원 변경 자진신고(SelfReportModal) / 기획서 E-3

작성: 2026-06-29 · 도메인: supplychain · 관련 파일: `components/supplier/SelfReportModal.tsx`, `lib/api.ts`, `app/supplier/page.tsx`

## 배경
협력사가 하위 공급원을 바꿀 때 자발적으로 신고하는 화면. 백엔드 엔드포인트는 실존한다:
`POST /supply-chain/declarations/source-change` → `service.declare_new_source(...)`.

## 발견한 불일치 (왜 "필드만 맞추기"로 안 됐나)
백엔드 계약은 **이미 등록된 엔티티 ID 4종**을 요구한다:
`bom_version_id`, `parent_supplier_id`, `new_child_supplier_id`, `part_id`, `reason`.
특히 `new_child_supplier_id` 는 **이미 등록된 협력사 UUID** 여야 한다(자유 텍스트 신규 회사명 불가).
그런데 기존 모달은 신규 공급사를 **자유 텍스트(회사명/국가/연락처)** 로 받았다 → 모델 불일치.

## 결정 (옵션 1 채택)
모달을 **"기존 등록 협력사 선택"** 방식으로 변경해 `new_child_supplier_id` 를 채운다.
(대안인 "백엔드에 자유 텍스트 신규 등록+링크 엔드포인트 신설"은 백엔드 작업이라 미채택.)

## 이번에 한 것
- `lib/api.ts`: `declareSourceChange({ bomVersionId, parentSupplierId, newChildSupplierId, partId, reason })` 추가
  (POST `/supply-chain/declarations/source-change`, snake_case 변환).
- `SelfReportModal.tsx`:
  - 자유 텍스트 신규 공급사 입력 → **`getSuppliers()` 로 불러온 기존 협력사 드롭다운**(= new_child_supplier_id).
  - 컨텍스트 props 추가: `bomVersionId?`, `partId?`, `parentSupplierId?`.
  - 제출: **4종 컨텍스트가 모두 있으면 `declareSourceChange` 실호출**, 없으면 데모 접수 모드로 폴백(콘솔 경고).
  - 실패 시 에러 배너 표시.
- `app/supplier/page.tsx`: 모달에 `parentSupplierId={supplierId}`(로그인 협력사 본인) 전달.

## 남은 작업 (PM/백엔드 확인 필요) ⚠️
1. **`bomVersionId` · `partId` 출처 부재** — 협력사 포털에는 원청 BOM 버전 ID가 없다.
   이 둘이 없으면 모달은 실호출을 못 하고 **데모 접수 모드**로만 동작한다.
   → 협력사가 "어느 제품/부품의 공급원을 바꾸는지" 선택하게 하거나(컨텍스트 주입),
     백엔드가 협력사 기준으로 대상 BOM/부품을 역추적해 주는 방식 결정 필요.
2. **현재(기존) 공급원 표시** 는 아직 `MOCK_CURRENT_SUPPLIER` — '현재 공급원 조회 GET' 엔드포인트가 없음(🆕).
   별개 항목(source-change 제출과 무관). 백엔드 신설 또는 supplied-items 활용 필요.

## 검증 메모
- 백엔드 `POST /supply-chain/declarations/source-change` 실존 확인(router.py:192, service.py:118).
- 컨텍스트 충족 시 실호출 경로는 코드상 연결됨. 단 위 1번 때문에 **현 협력사 포털 UX로는 데모 폴백**이 기본.
