# 협력사 회원가입(온보딩) 구현 계획 — 최종 (결정 완료)

> 목표: **모든 협력사가 회원가입(온보딩)을 거치도록** 한다.
> - **1차 협력사**: 원청 ingest 정보 기반 prefill + 본인은 PIC만 등록 (현재 흐름 유지)
> - **하위(n차) 협력사**: 무조건 회원가입 폼 직접 작성
> - 현재 온보딩은 **전부 프론트 mock** → 실제 백엔드 영속화로 전환 (풀 연동)
>
> 두 저장소(`dpp-dashboard` 프론트 · `ProjectFile` 백엔드)에 걸친다. **저장소별 별도 커밋.**
> 백엔드 규칙: router→service→repository 단방향 · 커밋은 service 일원화(router `db.commit()` 금지) ·
> 이벤트는 커밋 후 발행 · 스키마는 `docker/01_schema.sql` 직접 수정 + ORM 1:1.
>
> **이 문서는 미결 질문이 없다. 모든 결정은 §2에서 확정, 근거는 §3 코드검증.**

---

## 1. 타깃 흐름 (확정)

### A. 1차 협력사 — ingest 기반, PIC만 직접 입력 (Phase 2)
1. 원청이 ingest(SRM/ERP)로 1차 supplier 레코드 확보 → 초대.
2. 1차 링크 진입 `?supplierId=` → **entry**: 공개 prefill(회사명/유형) 확인 + 제3자 동의 체크.
3. **pic**: 하위 협력사 담당자(회사명+유형+이름+이메일+전화) 최대 3명 등록 → 각 하위 `POST /suppliers`(`inviter_supplier_id`=1차 본인) → 하위 생성 + 초대.
4. **complete**: 동의/제출 상태 기록.

### B. 하위(n차) 협력사 — 무조건 회원가입 (Phase 1 핵심)
1. 상위의 PIC 등록으로 생성된 supplier에 대해 초대 링크 `?supplierId=` 진입.
2. **entry**: 제3자 동의 (prefill 없음).
3. **form**: 회사정보(회사명/국가/사업자번호/DUNS/부서/주소) + 사업자등록증 업로드(또는 "미확인 등록") + **로그인 계정(이메일+비밀번호)**.
4. **pic**: 본인 담당자 등록.
5. **complete**: 한 번의 제출로 회사정보 영속화 + 문서 + PIC + **활성 계정 생성** + 온보딩 상태 전이 → 즉시 로그인 가능.

### 강제(거쳐야 한다)
- 협력사 포털은 **토큰 없으면 진입 차단**(클라이언트 가드). 계정은 온보딩 제출 시에만 생기므로 **"미가입 = 로그인 불가 = 온보딩 링크로만 진입"**.
- `/login`·`/supplier/onboarding`만 공개(토큰 없이 진입).

---

## 2. 확정된 결정 (미결 질문 전부 해소)

| # | 항목 | 확정 |
|---|---|---|
| 1 | **인증 방식** | 매직링크·선계정발급 **둘 다 아님**. 온보딩 폼에 **이메일+비밀번호 입력칸** → 제출 즉시 **활성 계정 생성**. **이메일 인프라 의존 없이 회원가입 완결.** 진입은 초대 링크 `?supplierId=`. |
| 2 | **계정 발급 시점/비번** | n차 제출 시 **자동 생성, 비밀번호 즉시 설정**(설정링크 X), `is_active=true` → 바로 로그인. bcrypt `get_password_hash` 재사용. |
| 3 | **테넌트** | **새 테넌트 안 만듦.** 계정 `tenant_id = suppliers.tenant_id`(초대한 OEM), `supplier_id = 본인`, `role = supplier_ceo`. |
| 4 | **계정생성 주체** | **users 도메인에 `create_user` 추가**(현재 없음 — §3 확인), 온보딩 submit이 **동기 호출**. 회원가입은 "제출→즉시 로그인 / 중복 즉시 409"라 이벤트 X, 동기. 도메인 격리는 users **repository 재사용 + 커밋 1회**. |
| 5 | **이메일 인프라** | Phase 1 **불필요**(자가 비번 설정). 자동 캐스케이드 초대 메일은 **Phase 2**(SES). |
| 6 | **1차 prefill 소스** | 별도 ingest 엔드포인트 신설 X. **`suppliers` 테이블 기존 데이터**(OEM 등록/ingest로 채워짐)를 읽는다. 단 공개 온보딩은 토큰이 없으므로 **공개 prefill 엔드포인트 신설**(비민감 필드만). |
| 7 | **하위 provider_type** | `SupplierCreateRequest.provider_type` **필수**(§3 확인). Phase 2의 firstTier `PicRegister`에 **유형 드롭다운 추가**(manufacturer/recycler/trader/miner/smelter), 기본값 없음(필수). |
| 8 | **공개 엔드포인트 보안** | **낮게 — `?supplierId=` 키잉, invite token 없음.** 가드 = **이미 활성 계정이 있는 supplier 재제출 → 409**. (운영 강화는 Phase 2 이메일 후 매직링크로 승격) |
| 9 | **로그인 게이팅 방식** | **클라이언트 가드(`app/supplier/layout.tsx`)로 확정.** ⚠ 토큰이 `localStorage`라 **Next.js middleware(엣지)는 토큰을 못 읽음** → middleware 방식 폐기. 가드가 `getToken()` 없으면 `/login` 리다이렉트. |
| 10 | **supplier 상태 전이** | 제출 완료 시 `supplier_*` → **`supplier_review`**(원청 승인 대기 — `OnboardingComplete`의 "원청 승인 대기 중" 배너와 일치). |
| 11 | **동의(consent) 기록** | 별도 호출 없이 **submit payload에 `consent_agreed:true`** 포함 → `supplier_onboarding.consent_status='consent_agreed'`·`consent_signed_at` 전이. entry 체크박스는 진행용 클라 게이트. |

---

## 3. 코드로 검증한 사실 (이 계획의 근거)

**Phase 1 직접 검증:**
1. `get_password_hash`(bcrypt)·`verify_password`·`create_access_token` 존재 — `infrastructure/security.py:20,25,31`. → 비번 해싱·토큰 발급 그대로 사용.
2. users 도메인 **`create_user` 없음** — `users/repository.py`에 `get_by_email`/`get_by_id`/`get_tenant`만 있음 → **신규 추가 필요**.
3. 로그인은 `users` 행(email+password_hash) 필요 — `users/router.py:42-47`. 계정 없으면 로그인 불가(= 게이팅의 근거).
4. 재사용 가능: `update_supplier_fields(repository.py:39)`(회사정보 부분 갱신) · `write_master_form_contacts(repository.py:479, replace-all)`(PIC) · `_normalize_country_to_iso2(service.py:280)`(국가→ISO2). `MasterFormContact`(models.py:572) = name/email/phone/is_primary/role/department.
5. `SupplierCreateRequest`(models.py:275): `tenant_id·company_name·provider_type·email` **필수** + `inviter_supplier_id?`. → 하위 초대 시 provider_type 필요(결정 #7).
6. `suppliers.business_reg_doc_url` **이미 존재**(`docker/01_schema.sql:101`, ORM models.py:101). `environmental_report_url`·`self_assessment_doc_url`도 기존. → 문서 URL 신규 컬럼 불필요.
7. `is_unverified` **신규 컬럼 맞음**(현재 스키마 없음).
8. 프론트 토큰 = `localStorage('kira_token')` (`lib/api.ts:33,37`). **`middleware.ts` 없음**, supplier 레이아웃 가드 없음 → 게이팅은 클라 가드 신설(결정 #9).
9. `POST /files` 멀티파트 업로드 → `lib/api.ts uploadFile()`로 이미 래핑. 반환 `{fileId,fileName,url,s3Key}`.

**Phase 2 사실(이메일 = "0"이 아니라 "라스트마일만 빠짐"):**
10. `boto3` 의존성 있음(`requirements.txt:19`), AWS IAM Role 패턴 확립(`infrastructure/storage.py` S3, ap-northeast-2) → SES 동일 방식.
11. `notifications` 테이블이 이미 이메일용 설계(`docker/01_schema.sql:745`: `channel IN('email',...)`, `status IN('pending','sent','failed','read')`, `dedup_key UNIQUE`).
12. ARQ 알림 워커 존재(`backend/workers/notification_worker.py`) — `notifications`에 `pending` 적재(outbox). **단 실제 SES 발송·pending→sent 전이 미구현.**
13. `SupplierInvited` 이벤트 **구독자 미등록**(`backend/main.py:56` 주석 예시만) → 지금은 발행해도 소비처 없음.

---

## 4. Phase 1 — n차 회원가입 (이번 핵심 · 이메일 불필요)

### 백엔드 (`ProjectFile/`)
- **스키마**: `suppliers`(또는 `supplier_onboarding`)에 `is_unverified BOOLEAN DEFAULT false` 추가 — `docker/01_schema.sql` + ORM 1:1. (`business_reg_doc_url`는 이미 있음.)
- **users `create_user`**: `users/repository.py`에 `create_user(email, password_hash, role, supplier_id, tenant_id, is_active=True)` + `get_by_email` 중복검사.
- **공개 prefill**: `GET /suppliers/{id}/onboarding/prefill` — **비인증, supplierId 키잉, 비민감 필드만**(company_name, provider_type, country). 없으면 404.
- **공개 submit**: `POST /suppliers/{id}/onboarding/submit` — **비인증, supplierId 키잉.** service에서 **단일 트랜잭션·단일 커밋**으로:
  1. 재제출 가드: 해당 supplier_id에 **활성 user 있으면 409**.
  2. `update_supplier_fields`(회사정보, `country`→`_normalize_country_to_iso2`) + `business_reg_doc_url`/`is_unverified` 저장.
  3. `write_master_form_contacts`(PIC, 대표 1명 `is_primary=true`).
  4. `supplier_onboarding`: `consent_status='consent_agreed'`·`consent_signed_at` 전이.
  5. supplier `status='supplier_review'`.
  6. `create_user`(이메일 중복 → 409, 비번 `get_password_hash`, `tenant_id=suppliers.tenant_id`, `role='supplier_ceo'`).
  7. commit. → 응답 `{supplier_id, status, onboarding_complete:true}`.
- **로그인 응답에 `onboarding_complete`** 추가(`/auth/login`·`/auth/me`). (Phase 1: 계정 존재 ⇒ 항상 true. 전방호환·게이팅 명시용.)

### 프론트 (`dpp-dashboard/`)
- **`SignupForm.tsx`(n차)에 "로그인 계정" 섹션**: 이메일 + 비밀번호 + 비밀번호 확인(일치 검증). `SignupData`(in `SupplierOnboarding.tsx`)에 `accountEmail`·`password` 추가, 필수 검증에 포함.
- **`SignupForm.tsx` 문서 업로드 실연결**: "업로드" 버튼 → 파일 선택 → `uploadFile(file, 'business-reg:'+supplierId)` → 반환 `s3Key`/`fileName` 보관(파일명 stub 대체).
- **`lib/api.ts`**: `getOnboardingPrefill(supplierId)` · `submitSupplierOnboarding(supplierId, payload)` 추가(둘 다 토큰 미첨부여도 동작). 응답 snake→camel 자동.
- **`OnboardingComplete.tsx` / `SupplierOnboarding.tsx`**: 마지막 단계에서 `submitSupplierOnboarding` **실제 호출**(현재 로컬 mock 주석 제거) + 로딩/성공/실패 처리. 성공 시 "원청 승인 대기" + "이제 로그인하세요" 안내(계정 생성됨).
- **로그인 게이팅(클라 가드)**: `app/supplier/layout.tsx` 신설(client) — `getToken()` 없으면 `/login` 리다이렉트. `/login`·`/supplier/onboarding`은 가드 밖(공개). 로그인 응답 `onboardingComplete=false`면 `/supplier/onboarding`로.

### Phase 1 검증(E2E)
1. OEM `POST /suppliers`로 supplier 생성 → `supplier_id` 확보.
2. `GET /suppliers/{id}/onboarding/prefill`(무토큰) 200.
3. 그 링크로 온보딩 제출(회사정보+문서+PIC+이메일+비번) → 200.
4. DB 확인: `suppliers`(회사정보/`is_unverified`/`status=supplier_review`) · `supplier_contacts`(PIC) · `supplier_onboarding`(consent_agreed) · `users`(활성 계정).
5. 생성 계정으로 `POST /auth/login` 성공(토큰에 `supplier_id`/`tenant_id` 클레임).
6. 같은 supplier 재제출 → **409**. 중복 이메일 → **409**.
7. 토큰 없이 `/supplier` 진입 → `/login` 리다이렉트.

---

## 5. Phase 2 — 자동 캐스케이드 초대 (이메일 라스트마일 + SES)

- **(외부 선결) AWS SES** ⚠️ 리드타임 있는 유일 항목: 발신 도메인/이메일 verify + **샌드박스 해제(production access)** + EC2 IAM Role `ses:SendEmail`. (서울 리전 SES 지원.)
- **(BE 신규) `infrastructure/email.py`**: SES 어댑터(~15줄, `storage.py` 본떠 client만 `ses`): `send_email(to, subject, body)`.
- **(BE 연결) 알림 워커 발송**: `notifications` pending email → SES 발송 → `status sent/failed`·`sent_at`(`notification_worker.py` 디스패치 추가).
- **(BE 연결) 생산자**: `SupplierInvited` 구독자(`main.py:56` 슬롯) + SLA 리마인더(`supplier_onboarding.sla_due_date`/`reminder_count`, `SUPPLIER_SLA_DAYS=14`) → `notification_queue` enqueue.
- **(BE 연결) 캐스케이드 트리거**: firstTier 제출 시 `PicRegister` N명 → 각 `POST /suppliers`(`inviter_supplier_id`=본인, **provider_type 포함**) → 하위 생성+초대메일 → 하위 온보딩 → 그 하위 PicRegister → **n차까지 반복.** 하위 입력 양식은 신규 구축 아님(`PicRegister` 재사용).
- **(FE)** firstTier `PicRegister`에 **provider_type 드롭다운 추가**(결정 #7) + 제출 시 하위 초대 호출 배선 + 메일 발송 안내 UX. 1차 entry는 공개 prefill 사용.

---

## 6. API 계약 (양쪽 동기화 — 변경 시 `lib/api.ts`와 동시 수정, 각각 별도 커밋)

```
GET /suppliers/{id}/onboarding/prefill          # 공개(무토큰), supplierId 키잉
  → 200 { company_name, provider_type, country } | 404

POST /suppliers/{id}/onboarding/submit          # 공개(무토큰), supplierId 키잉
  body: {
    account:  { email, password },
    company:  { company_name, country, business_reg_no, duns_number, address, department },
    business_reg_doc: { s3_key, file_name } | null,
    unverified: boolean,
    consent_agreed: true,
    contacts: [{ name, email, phone, is_primary, role?, department? }]
  }
  → 200 { supplier_id, status: "supplier_review", onboarding_complete: true }
  → 409 (이미 완료된 온보딩 | 이메일 중복)

POST /suppliers                                 # 하위 초대 (기존, Phase 2 배선)
  body: { tenant_id, company_name, provider_type, email, inviter_supplier_id }
  → 201 { supplier_id, status }

POST /auth/login | GET /auth/me                 # 응답에 onboarding_complete 추가
```
> 응답 키는 백엔드 snake_case → 프론트 `snakeToCamel` 자동 camelCase 변환.

---

## 7. 작업 순서 / 커밋 분리

**Phase 1 (이메일 불필요 — 먼저 완결):**
1. (BE) 스키마 `is_unverified` + ORM.
2. (BE) `users.create_user`.
3. (BE) 공개 `prefill` + 공개 `submit`(단일 트랜잭션) + 재제출/중복 409.
4. (BE) 로그인 응답 `onboarding_complete`.
5. (FE) `lib/api.ts` 함수.
6. (FE) `SignupForm` 계정 섹션 + 문서 업로드 실연결.
7. (FE) `OnboardingComplete`/`SupplierOnboarding` 실제 제출 배선.
8. (FE) `app/supplier/layout.tsx` 클라 가드.
9. (검증) §4 E2E.

**Phase 2 (이메일):** SES 선결 → `email.py` → 워커 발송 → `SupplierInvited` 구독자/SLA → 캐스케이드 트리거 → FE provider_type/초대 배선.

> BE/FE는 §6 계약 합의 후 **병렬**. 백엔드는 착수 전 `origin/develop` 최신 동기화. 두 저장소 **각각 별도 커밋**, `Co-Authored-By`/생성표기 금지, `feature/eunjin`.

---

## 부록 A. 현재 코드 상태 요약

**프론트 (있음):** 마법사 `app/supplier/onboarding/page.tsx`→`SupplierOnboarding.tsx`. 단계 `entry→form→pic→complete`, `stepsFor()`로 1차=`[entry,pic,complete]`(form 생략)/n차=`[entry,form,pic,complete]` — **구조 변경 불필요**. 컴포넌트 `OnboardingEntry`·`SignupForm`·`PicRegister`·`OnboardingComplete`. API `lib/api.ts`.

**프론트 (mock/없음):** 제출이 백엔드로 안 감(`OnboardingComplete` 로컬 요약만) · 문서 업로드 파일명 stub · 1차 하위 등록 mock · `unverified` 프론트 플래그만.

**백엔드 (있음):** `POST /suppliers`(create_supplier_and_invite: supplier+risk_profile+supplier_onboarding+SupplierInvited 발행, inviter 지원) · `POST /suppliers/{id}/master-form`(authorized_supplier 게이트) · `GET /detail`·`/reliability` · `POST /files` · `supplier_onboarding`(consent/agreement/SLA).

**백엔드 (없음 — 이번 작업):** ① 공개 온보딩 prefill/submit ② `users.create_user`(초대 협력사 계정) ③ `is_unverified` 컬럼 ④ 로그인 `onboarding_complete` ⑤ (Phase 2) 이메일 발송 라스트마일·`SupplierInvited` 구독자·캐스케이드.
