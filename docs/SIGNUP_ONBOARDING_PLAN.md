# 협력사 회원가입(온보딩) 구현 계획 — 백엔드 풀 연동 + 강제

> 목표: **모든 협력사가 회원가입(온보딩)을 거치도록** 한다.
> - **1차 협력사**: 원청 ingest 정보 기반으로 회원가입(prefill) + 본인은 PIC만 등록 (현재 흐름 유지)
> - **하위(n차) 협력사**: 무조건 회원가입 폼을 직접 작성
> - 현재 온보딩은 **전부 프론트 mock** → 실제 백엔드 영속화로 전환 (풀 연동)
>
> 이 문서는 두 저장소(`dpp-dashboard` 프론트 · `ProjectFile` 백엔드)에 걸친다.
> **저장소별로 따로 커밋**한다. 각 저장소 규칙은 해당 폴더 `CLAUDE.md`가 SSOT.

---

## ★ v2 — 결정 확정 + 코드 검증 + Phase 분리 (2026-06-30)

> 이 절이 **현행 SSOT**다. 아래 §2(인증/계정 권장안)·§7(미결 질문)의 미결정은 여기서 **확정**되었으니 이 절이 우선한다. 원문 §0·§1·§3~§6의 메커니즘 설명은 참고용으로 유효.

### v2-1. 확정된 결정 (원문 §2·§7 해소)
| 항목 | 확정 |
|---|---|
| 인증 방식 (원문 §2·§7.1) | 매직링크·선계정발급 **둘 다 아님** → **온보딩 폼에 비밀번호 입력칸 추가 → 제출 즉시 활성 계정 생성.** 협력사는 초대 링크 `?supplierId=`로 진입, 폼에서 이메일+비밀번호 직접 설정. **이메일 인프라 의존 없이 회원가입 완결.** |
| 계정 발급 시점/비번 (원문 §7.2) | 하위(n차) 제출 시 **자동 생성, 비밀번호 즉시 설정**(설정링크 X). `is_active=true`로 바로 로그인. |
| 테넌트 정책 | **새 테넌트 만들지 않음.** 협력사 계정 `tenant_id = 초대한 OEM 테넌트(= suppliers.tenant_id)`, `supplier_id = 본인 supplier 행`, `role=supplier_ceo`. |
| `users` 계정 생성 주체 | **users 도메인에 계정생성 진입점 추가**(`users/service.py` 또는 `users/repository.create_user`), 온보딩 submit이 **동기 호출**. 이벤트 기반 X — 회원가입은 "제출→즉시 로그인 / 중복이메일 즉시 409"라 동기여야 함. 도메인 격리는 users **repository(데이터 계층) 재사용** + **커밋 1회**로 처리. |
| 공개 엔드포인트 보안 | **낮게 — `?supplierId=` 키잉, invite token 없음.** 가드는 "완료된 온보딩 재제출 거부"만. (운영 강화는 이메일 인프라 후 매직링크로 승격) |
| 로그인 게이팅 | **ON — 토큰 없으면 포털 진입 차단.** 단 `/login`·`/supplier/onboarding`은 **공개 유지**(협력사는 토큰 없이 메일링크 진입). |

### v2-2. 코드로 검증한 사실 (원문 정정)
1. **이메일 인프라 = "0"이 아니라 "라스트마일만 빠짐"** (원문 §7.3 정정):
   - `boto3==1.42.42` 이미 의존성(`requirements.txt:19`).
   - AWS IAM Role 패턴 확립 — `infrastructure/storage.py`(S3, 리전 ap-northeast-2). **SES도 동일 방식.**
   - **`notifications` 테이블이 이미 이메일용 설계** (`docker/01_schema.sql:745`): `channel IN ('email',...)`, `notification_type IN ('reminder','sla_warning',...)`, `status IN ('pending','sent','failed','read')`, `sent_at`, `dedup_key UNIQUE`(멱등).
   - **ARQ 알림 워커 존재** — `backend/workers/notification_worker.py`가 `notification_queue`에서 받아 `notifications`에 `status='pending'`으로 적재(outbox). **단 실제 발송(SES 호출)·pending→sent 전이는 미구현.**
   - `SupplierInvited` 이벤트 **구독자 미등록** (`backend/main.py:56` 주석 예시만) → 지금은 발행해도 소비처 없음.
2. **`suppliers.business_reg_doc_url` 이미 존재** (`docker/01_schema.sql:101`) → 원문 §3.2의 "신규 컬럼 필요 시" 불필요. (`environmental_report_url`·`self_assessment_doc_url`도 기존)
3. **`is_unverified`는 신규 컬럼 맞음** (현재 스키마에 없음) — 원문 §3.3 유효.
4. **재사용 가능 헬퍼**: PIC 저장 = `write_master_form_contacts`(supplier_contacts replace-all, `repository.py:479`), 회사정보 갱신 = `update_supplier_fields`(`repository.py:39`).
5. **하위 공급사 입력 경로 = 신규 구축 아님** — 기존 `PicRegister`(firstTier, 회사명+이름+이메일+전화 최대 3명, `PicRegister.tsx:73~99`)가 곧 입력 양식. 캐스케이드는 이 3명을 *소비*만 함.

### v2-3. Phase 분리
이메일 의존성이 다르므로 두 단계로 나눈다.

#### Phase 1 — 회원가입 (이번 핵심 · 이메일 불필요)
- **(BE) 스키마**: `is_unverified` 추가 (`docker/01_schema.sql` + ORM 1:1). *`business_reg_doc_url`는 이미 있음.*
- **(BE) users 계정생성 진입점**: `users` 도메인에 `create_user(email, password_hash, role, supplier_id, tenant_id, is_active=true)` (이메일 중복 시 409).
- **(BE) 공개 온보딩 submit**: `POST /suppliers/{id}/onboarding/submit` — **비인증, `supplierId` 키잉.** 한 트랜잭션·한 커밋으로:
  `update_supplier_fields`(회사정보, country→ISO2 정규화) + `write_master_form_contacts`(PIC) + `supplier_onboarding` 동의완료 전이 + **users 계정 생성**(비번 bcrypt). 완료된 온보딩 재제출 가드.
- **(BE) 로그인 응답에 `onboarding_complete: bool`** 추가 (`/auth/login`·`/auth/me`).
- **(FE) `SignupForm.tsx`(n차)에 "로그인 계정" 섹션**: 이메일+비밀번호+확인. `SignupData` 타입에 `accountEmail`·`password` 추가(`SupplierOnboarding.tsx`).
- **(FE) `lib/api.ts`**: `submitSupplierOnboarding(supplierId, payload)` 추가, `OnboardingComplete` 제출 시 실제 호출(현재 로컬 mock 주석 제거) + 성공/실패/로딩.
- **(FE) 로그인 게이팅**: `middleware.ts` 신설(또는 레이아웃 가드) — 토큰 없으면 `/login` 리다이렉트. **`/login`·`/supplier/onboarding` 화이트리스트.** 로그인 응답 `onboardingComplete=false` 협력사는 `/supplier/onboarding`로.
- **검증**: ① OEM `POST /suppliers`로 초대→supplierId ② 그 링크로 온보딩 제출(폼+PIC+비번) ③ suppliers/contacts/onboarding/users DB 확인 ④ 생성 계정으로 `POST /auth/login` 성공(토큰 supplier_id/tenant_id 클레임) ⑤ 중복 이메일 재제출 409.

#### Phase 2 — 자동 캐스케이드 초대 (이메일 라스트마일 + SES 설정)
- **(외부 선결) AWS SES** ⚠️ 리드타임 있는 유일 항목: 발신자 도메인/이메일 verify + **샌드박스 해제(production access 요청)** + EC2 IAM Role에 `ses:SendEmail`. (서울 리전 SES 지원됨)
- **(BE 신규) `infrastructure/email.py`** — SES 어댑터 ~15줄, `storage.py` 본떠 client만 `ses`로: `send_email(to, subject, body)`. *현재 파일 없음 → 신규.*
- **(BE 연결) 알림 워커 발송 단계** — `notifications`의 pending email → SES 발송 → `status sent/failed`·`sent_at` 기록 (`notification_worker.py`에 디스패치 추가).
- **(BE 연결) 생산자** — `SupplierInvited` 구독자(`main.py:56` 슬롯) + SLA 리마인더 → `notification_queue` enqueue. (SLA: `supplier_onboarding.sla_due_date`/`reminder_count`, `SUPPLIER_SLA_DAYS=14` 기존)
- **(BE 연결) 캐스케이드 트리거** — firstTier 제출 시 `PicRegister` 3명 → 각 `POST /suppliers`(`inviter_supplier_id`=본인) 자동 호출 → 하위 supplier 생성 + 초대메일 발송 → 하위 온보딩 → 그 하위의 PicRegister 3명 → **반복(n차까지 캐스케이드).** *하위 입력 양식은 신규 구축 아님(PicRegister 재사용).*
- **(FE)** firstTier `PicRegister` 제출 → 하위 초대 호출 배선, 메일 발송 안내 UX.

---

## 0. 현재 상태 (코드 기준)

### 프론트 (이미 있음)
- 온보딩 마법사: `app/supplier/onboarding/page.tsx` → `components/supplier/onboarding/SupplierOnboarding.tsx`
  - 단계: `entry(동의) → form(회원가입) → pic → complete`
  - `stepsFor()`: **1차 = `[entry, pic, complete]`(form 생략) / n차 = `[entry, form, pic, complete]`** — ✅ 답변과 일치, **구조 변경 불필요**
  - 진입 파라미터: `?type=firstTier|nTier&supplierId=...&company=...` (메일 URL)
- 각 단계 컴포넌트: `OnboardingEntry`(동의+prefill) · `SignupForm`(회사정보+문서) · `PicRegister`(PIC) · `OnboardingComplete`(요약)
- API 래퍼: `lib/api.ts` (Bearer 자동첨부, snake→camel)

### 프론트 (없음 / mock)
- 온보딩 제출이 **백엔드로 안 감** — `OnboardingComplete`는 로컬 state 요약만 표시 (`// write 엔드포인트 없어 제출은 로컬 mock`)
- `SignupForm` 문서 업로드 = **파일명 stub** (실제 `POST /files` 미연결)
- `PicRegister`(1차) 하위 협력사 등록 = **mock** (초대 API 미호출)
- "미확인 등록"(`unverified`) = 프론트 플래그만 존재, 백엔드 반영 없음

### 백엔드 (이미 있음)
- `POST /suppliers` → `create_supplier_and_invite`: supplier + risk_profile + `supplier_onboarding`(SLA) 생성 + `SupplierInvited` 이벤트 발행. `inviter_supplier_id`로 **협력사→협력사 초대** 지원.
- `POST /suppliers/{id}/master-form`: 회사/공장/PIC/탄소 일괄 영속화 (atomic). `authorized_supplier`(토큰 테넌트 소유) 게이트.
- `GET /suppliers/{id}/detail`, `/master-form/prefill`, `/reliability`(onboarding 상태 노출) 등.
- `POST /files`(멀티파트 업로드) — `lib/api.ts uploadFile()`로 이미 래핑됨.
- `supplier_onboarding`: `consent_status`(consent_pending/agreed/rejected) · `agreement_status`(pending/agreed/rejected) · SLA/리마인더.

### 백엔드 (없음) — ⚠ 이번 작업의 핵심 격차
1. **로그인 전 온보딩 인증 수단 없음** — 메일 URL 진입 시 토큰이 없다. prefill·제출 엔드포인트 전부 Bearer 요구.
2. **초대받은 협력사의 로그인 계정(`users`) 미생성** — `create_supplier_and_invite`는 supplier만 만들고 계정은 안 만든다 → 협력사가 나중에 로그인 불가.
3. **온보딩 "제출/상태 전이" 엔드포인트 없음** — consent 동의, 회원가입 제출 완료(supplier status 전이)를 기록할 write 경로가 없다.
4. **"미확인 등록"(unverified) 저장 위치 없음.**
5. **이메일 실제 발송 여부 확인 필요** (`SupplierInvited` 컨슈머).

---

## 1. 타깃 흐름 (확정)

### A. 1차 협력사 (ingest 기반, PIC만 직접 입력)
1. 원청이 ingest(SRM/ERP)로 1차 supplier 레코드 확보 → 초대 메일(매직링크) 발송.
2. 1차가 링크 진입 → **entry**: ingest prefill 확인 + 제3자 동의 체크.
3. **pic**: 하위 협력사 담당자(회사명+이름+이메일+전화) 최대 3명 등록.
   - 제출 시 각 하위에 대해 `POST /suppliers`(`inviter_supplier_id` = 1차 본인) 호출 → 하위 supplier 생성 + 하위에게 초대 메일 발송.
4. **complete**: 동의/제출 상태 백엔드 기록.

### B. 하위(n차) 협력사 (무조건 회원가입)
1. 상위(1차/n차)의 PIC 등록으로 생성된 초대 메일(매직링크) 진입.
2. **entry**: 제3자 동의 (prefill 없음 — ingest 데이터 없음).
3. **form**: 회사 기본정보(회사명/국가/사업자번호/DUNS/부서/주소) + **사업자등록증 업로드**(또는 "미확인 등록").
4. **pic**: 본인 담당자 등록 (필요 시 추가 하위 초대).
5. **complete**: 제출 → 회사정보 영속화 + 문서 저장 + 온보딩 상태 전이 + **계정 발급(비밀번호 설정)**.

### 강제(거쳐야 한다)
- 온보딩 미완료 협력사는 **포털 진입 차단** — 로그인/접근 시 온보딩 미완료면 온보딩으로 리다이렉트.
- 완료 판정 = `supplier_onboarding` 동의 완료 + supplier status가 제출 단계(`supplier_requested`/`supplier_in_progress` 이상)로 전이.

---

## 2. 핵심 설계 결정 — 인증/계정 (⚠ 착수 전 팀 합의 필요)

문제: 초대받은 협력사는 **로그인 전 상태**로 메일 링크에 진입하는데, 현재 모든 온보딩 엔드포인트가 Bearer 토큰을 요구하고, 계정도 없다.

**권장안 — 서명 초대 토큰(매직링크) + 제출 시 계정 발급**
- 초대 시 `supplier_id`(+만료) 클레임을 담은 **단기 서명 토큰**을 발급, 메일 URL에 `?token=...`로 포함.
- 온보딩 전용 엔드포인트는 일반 JWT 대신 **이 초대 토큰을 받는 인증 의존성**(`get_onboarding_principal`)을 사용 → 토큰의 `supplier_id`로만 스코프 한정.
- 하위(n차) 최종 제출 시 **`users` 계정 생성**(이메일=PIC 이메일, role=`supplier_ceo`/`supplier_esg`, supplier_id 연결) + 비밀번호 설정(설정 링크 또는 즉시 설정).
- 1차는 ingest 단계에서 계정이 이미 있을 수 있음 → 있으면 재사용, 없으면 동일 발급.

> 대안(단순): 초대 시점에 `users` 계정을 임시 비밀번호로 미리 생성하고 메일에 재설정 링크 동봉 → 협력사가 **먼저 로그인 후** 온보딩(이러면 매직링크 불필요, 기존 JWT 그대로). 단, "메일 링크 바로 진입" UX와 어긋남.

**결정 필요**: 매직링크 방식 vs 선(先)계정발급 방식. 아래 백엔드 작업은 **매직링크 권장안 기준**으로 기술. (선계정 방식 택하면 §3.1, §3.4 일부 축소)

---

## 3. 백엔드 작업 (`ProjectFile/` — 별도 커밋)

> 규칙: router→service→repository 단방향 · 커밋은 service 일원화(router에서 `db.commit()` 금지) · 이벤트는 커밋 후 발행 · 스키마 변경은 `docker/01_schema.sql` 직접 수정 + ORM 1:1.

### 3.1 초대 토큰 발급 + 온보딩 인증 의존성
- `infrastructure/auth.py`: 초대 토큰 생성(`create_onboarding_token(supplier_id, exp)`) + 검증 의존성 `get_onboarding_principal`(토큰 → supplier_id, 만료/위조 검증).
- `create_supplier_and_invite`: `SupplierInvited` 이벤트에 토큰 동봉(또는 메일 컨슈머가 발급). 메일 URL을 `/supplier/onboarding?...&token=<초대토큰>`로 구성.

### 3.2 온보딩 제출 엔드포인트 (신설)
- `POST /suppliers/{id}/onboarding/consent` — 제3자 동의 기록: `consent_status=consent_agreed`, `consent_signed_at` 갱신.
- `POST /suppliers/{id}/onboarding/submit` — 회원가입 제출(하위 n차):
  - 회사정보 영속화: 기존 `submit_master_form` 재사용 또는 `PATCH /detail` (company_name/country/business_reg_no/duns_number/주소/부서).
  - 문서 URL 저장: `business_reg_doc_url`(신규 컬럼 필요 시) · `environmental_report_url`(기존).
  - `unverified` 플래그 저장 (§3.3).
  - supplier status 전이: `supplier_pending → supplier_requested/in_progress` (제출 완료 표시).
  - **계정 발급**(§3.4) + (선택) 비밀번호 설정 링크 메일.
  - ※ 인증: `get_onboarding_principal`(초대 토큰) **또는** 로그인된 본인 — 둘 다 supplier_id 일치 강제.

### 3.3 "미확인 등록"(unverified) 저장
- `suppliers` 또는 `supplier_onboarding`에 `is_unverified BOOLEAN DEFAULT false` 추가(`docker/01_schema.sql` + ORM).
- 의미: 서류 미보유로 등록 → 원청/상위 추가 검증 대상. status/리스크 화면에서 플래그 노출(후속).

### 3.4 초대 협력사 계정 발급
- `users` 생성 헬퍼(users 도메인): 이메일/역할/tenant_id/supplier_id 연결, 비밀번호는 미설정(설정 링크) 또는 즉시 설정.
- 중복 이메일 가드(이미 계정 있으면 재사용).
- 발급 위치: 하위 제출(`/onboarding/submit`) 시 또는 1차 PIC 초대(`POST /suppliers`) 시 — 결정 §2 따름.

### 3.5 하위 협력사 초대 (대부분 재사용)
- `POST /suppliers`(`inviter_supplier_id` 지원) 그대로 사용. PIC 1건 = 하위 supplier 1건 생성 + 초대.
- ⚠ 확인: `SupplierInvited` 컨슈머가 **실제 이메일을 발송**하는지. 미발송이면 메일 발송 연동 추가(매직링크 URL 포함).

### 3.6 로그인 게이팅 (강제)
- `POST /auth/login` 응답 또는 `GET /auth/me`에 **온보딩 완료 여부 필드** 추가(예: `onboarding_complete: bool`). 프론트가 이를 보고 미완료 협력사를 온보딩으로 보낸다.

---

## 4. 프론트 작업 (`dpp-dashboard/` — 별도 커밋)

> 규칙: 컴포넌트에서 `<form>` 금지(onClick/onChange) · 절대 URL 금지(`/api/*`) · API는 `lib/api.ts` 단일 진입.

### 4.1 `lib/api.ts` — 온보딩 API 추가
- `getOnboardingToken()` — URL `?token=` 파싱 헬퍼(또는 진입 시 localStorage 임시 보관). 초대 토큰을 Bearer 대신 온보딩 호출에 실어 보낼 경로 마련.
- `submitOnboardingConsent(supplierId)` → `POST /suppliers/{id}/onboarding/consent`
- `submitOnboarding(supplierId, payload)` → `POST /suppliers/{id}/onboarding/submit` (회사정보+문서URL+unverified)
- `inviteSubSupplier(body)` → `POST /suppliers` (`inviter_supplier_id`=본인, company_name/provider_type/email)
- 기존 `uploadFile(file, context)` 재사용 — 업로드 후 받은 `s3Key`/`url`을 제출 payload에 포함.

### 4.2 `OnboardingEntry.tsx`
- prefill: 토큰 기반 진입에서도 동작하도록 `getSupplierDetail` 호출 경로를 초대 토큰 인증으로 전환(또는 prefill 전용 GET).
- 동의 체크 → `submitOnboardingConsent` 호출(다음 단계 진입 시).

### 4.3 `SignupForm.tsx` (n차 전용)
- 문서 "업로드" 버튼 → 실제 파일선택 + `uploadFile(file, 'business-reg:<supplierId>')` → 반환 키 보관.
- 파일명 stub 입력란을 실제 업로드 결과로 대체.

### 4.4 `PicRegister.tsx` (1차: 하위 초대 / n차: 본인 PIC)
- 1차 제출(`onSubmit`) → 각 PIC에 대해 `inviteSubSupplier` 호출(루프, 부분 실패 처리).
- n차 PIC는 제출 payload에 포함하거나 master-form contacts로 전송.

### 4.5 `SupplierOnboarding.tsx` / `OnboardingComplete.tsx`
- 마지막 단계에서 실제 제출 호출(`submitOnboarding`) → 성공/실패 상태 반영(현재 mock 주석 제거).
- 실패 시 재시도 UX, 성공 시 "승인 대기" + (n차) 비밀번호 설정 안내.

### 4.6 로그인 게이팅
- `app/login/page.tsx`: 로그인 응답의 `onboardingComplete=false`면 `/supplier/onboarding`로 리다이렉트(현재는 무조건 `/supplier`).
- 협력사 포털 가드(미들웨어 또는 레이아웃)에서 미완료 시 접근 차단.

---

## 5. API 계약 (초안 — 양쪽 동기화)

```
POST /suppliers/{id}/onboarding/consent
  auth: 초대토큰 | 본인JWT
  → 200 { consentStatus: "consent_agreed" }

POST /suppliers/{id}/onboarding/submit
  auth: 초대토큰 | 본인JWT
  body: {
    company_name, country, business_reg_no, duns_number, address, department,
    business_reg_doc: { s3_key, file_name } | null,
    unverified: boolean,
    contacts: [{ name, email, phone, is_primary }]
  }
  → 200 { supplierId, status, onboardingComplete: true, accountCreated: bool }

POST /suppliers                      # 하위 초대 (기존)
  auth: 본인JWT(1차) | 초대토큰
  body: { company_name, provider_type, email, inviter_supplier_id }
  → 201 { supplier_id, status }
```

> 응답 키는 백엔드 snake_case → 프론트 `snakeToCamel` 자동 변환. 계약 변경 시 `lib/api.ts` 타입과 호출부 동시 수정(각각 별도 커밋).

---

## 6. 작업 순서 / 커밋 분리

1. **(BE) 스키마**: `is_unverified` + (필요 시 `business_reg_doc_url`) 추가 — `docker/01_schema.sql` + ORM.
2. **(BE) 인증**: 초대 토큰 발급/검증 + `get_onboarding_principal`.
3. **(BE) 엔드포인트**: consent / submit / 계정발급 / 로그인 응답 `onboarding_complete`.
4. **(BE) 이메일**: `SupplierInvited` 컨슈머 발송 확인·매직링크 URL 포함.
5. **(FE) api.ts**: 온보딩 함수 + 토큰 처리.
6. **(FE) 컴포넌트 연동**: Entry/SignupForm/PicRegister/Complete 실제 호출.
7. **(FE) 게이팅**: 로그인 리다이렉트 + 포털 가드.
8. **E2E**: 1차(ingest→PIC초대→하위메일) / n차(메일→회원가입→계정→로그인) 풀 시나리오.

> BE 1~4와 FE 5~7은 **계약(§5) 합의 후 병렬** 가능. 백엔드는 `origin/develop` 최신 동기화 후 착수.

---

## 7. 미결 질문 (착수 전 확정)

1. **인증 방식**: 매직링크(권장) vs 선계정발급? (§2)
2. **계정 발급 시점/주체**: 하위 제출 시 자동 vs 원청 승인 후? 비밀번호는 즉시설정 vs 설정링크?
3. **이메일 인프라**: 현재 `SupplierInvited`가 실제 메일을 보내는가? (미확인 — 확인 필요)
4. **1차 ingest 소스**: prefill이 읽는 "ingest 정보"의 실제 출처/엔드포인트는? (현재 `getSupplierDetail` 재사용 가정)
5. **강제 수준**: 로그인 차단까지 vs 배너 유도만? (§1 강제 — 차단 가정)
6. **provider_type**: 하위 초대 시 유형을 1차가 지정하나, 기본값(예: manufacturer)인가?
```
