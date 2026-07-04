'use client';

// 협력사 온보딩 진입 funnel — 메일 URL 진입 → 회원가입/하위 PIC 등록 → 제출 → 승인 대기
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, ShieldCheck } from 'lucide-react';
import { ApiError, submitSupplierOnboarding, type OnboardingPrefill, type OnboardingSubmitInput } from '@/lib/api';
import OnboardingEntry from './OnboardingEntry';
import SignupForm from './SignupForm';
import PicRegister from './PicRegister';
import OnboardingComplete from './OnboardingComplete';

export type OnboardingType = 'firstTier' | 'nTier';
export type OnboardingStep = 'entry' | 'form' | 'pic' | 'complete';

export interface PicContact {
  company: string; // 1차: 하위 협력사 회사명 (n차: 미사용)
  name: string;
  email: string;
  phone: string;
}

export interface SignupData {
  companyName: string;
  country: string;
  businessRegNo: string;
  dunsNumber: string;
  address: string;
  department: string; // 본인(담당자) 부서명
  contactName: string; // 본인(담당자) 이름
  contactEmail: string; // 본인(담당자) 이메일
  contactPhone: string; // 본인(담당자) 연락처
  registrationDocName: string; // 업로드된 사업자등록증 파일명 (표시용)
  registrationDocS3Key: string; // 업로드 결과 s3 key (제출 payload)
  envReportName: string; // 환경성적서 파일명(표시용)
  envReportS3Key: string; // 환경성적서 s3 key(제출 payload)
  unverified: boolean; // 미확인 상태로 등록 (문서 미보유 예외)
  accountEmail: string; // 로그인 계정 이메일 (n차만 — 1차는 MES 계정 사용)
  password: string; // 로그인 계정 비밀번호 (n차만)
}

const emptySignup: SignupData = {
  companyName: '',
  country: '',
  businessRegNo: '',
  dunsNumber: '',
  address: '',
  department: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  registrationDocName: '',
  registrationDocS3Key: '',
  envReportName: '',
  envReportS3Key: '',
  unverified: false,
  accountEmail: '',
  password: '',
};

function emptyPic(): PicContact {
  return { company: '', name: '', email: '', phone: '' };
}

/** 1차·n차 동일한 단계 흐름. 1차는 회원가입 폼이 DB 정보로 prefill되고 로그인계정 섹션만 생략된다. */
function stepsFor(_type: OnboardingType): OnboardingStep[] {
  return ['entry', 'form', 'pic', 'complete'];
}

const stepLabel: Record<OnboardingStep, string> = {
  entry: '진입 · 동의 확인',
  form: '회원가입',
  pic: '하위협력사 담당자 등록',
  complete: '승인 대기',
};

export default function SupplierOnboarding() {
  const params = useSearchParams();
  const type: OnboardingType = params.get('type') === 'firstTier' ? 'firstTier' : 'nTier';
  const supplierId = params.get('supplierId') ?? undefined;
  const invitedCompany = params.get('company') ?? undefined;

  const steps = stepsFor(type);
  const [step, setStep] = useState<OnboardingStep>('entry');
  const [signup, setSignup] = useState<SignupData>({ ...emptySignup, companyName: invitedCompany ?? '' });
  const [pics, setPics] = useState<PicContact[]>([emptyPic()]);
  const [consentChecked, setConsentChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentIndex = steps.indexOf(step);

  // DB에 이미 있는 값으로 회원가입 폼을 전부 채운다(1차: 원청 ingest, n차: 상위가 입력한 stub).
  //   온보딩 submit이 저장하는 경로(suppliers·supplier_contacts·문서 URL·미확인)를 역으로 받아와 채운다.
  //   사용자가 이미 고친 값은 덮어쓰지 않는다(prev 우선) → 확인 후 필요한 부분만 최신화.
  function handlePrefill(detail: OnboardingPrefill) {
    setSignup(prev => ({
      ...prev,
      companyName: prev.companyName || detail.companyName,
      country: prev.country || detail.country || '',
      businessRegNo: prev.businessRegNo || detail.businessRegNo || '',
      dunsNumber: prev.dunsNumber || detail.dunsNumber || '',
      address: prev.address || detail.address || '',
      department: prev.department || detail.contact?.department || '',
      contactName: prev.contactName || detail.contact?.name || '',
      contactEmail: prev.contactEmail || detail.contact?.email || '',
      contactPhone: prev.contactPhone || detail.contact?.phone || '',
      // 이미 업로드된 사업자등록증 — 파일명/키를 채워 '첨부됨'으로 보이게(재확인).
      registrationDocName: prev.registrationDocName || detail.businessRegDoc?.fileName || '',
      registrationDocS3Key: prev.registrationDocS3Key || detail.businessRegDoc?.s3Key || '',
      // 미확인 등록 상태는 DB 값을 반영(사용자가 아직 안 건드렸을 때만).
      unverified: prev.unverified || Boolean(detail.unverified),
    }));
  }

  function goNext() {
    const next = steps[currentIndex + 1];
    if (next) setStep(next);
  }
  function goBack() {
    const prev = steps[currentIndex - 1];
    if (prev) setStep(prev);
  }

  // 최종 '제출하기' — 회사정보 + 본인 담당자 + 문서 + 동의(+ n차 계정)를 공개 submit으로 영속화.
  //   하위협력사 담당자(pics)는 캐스케이드 초대용(Phase 2)이라 여기 제출에 포함하지 않고 로컬로만 유지한다.
  async function handleSubmit() {
    if (!supplierId) {
      setSubmitError('초대 링크가 올바르지 않습니다. (supplierId 없음)');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const input: OnboardingSubmitInput = {
        // 1차는 MES 계정을 이미 보유 → account=null(신규 생성 안 함). n차는 입력한 로그인 계정 생성.
        account: type === 'firstTier' ? null : { email: signup.accountEmail, password: signup.password },
        company: {
          companyName: signup.companyName,
          country: signup.country,
          businessRegNo: signup.businessRegNo,
          dunsNumber: signup.dunsNumber,
          address: signup.address,
          department: signup.department,
        },
        businessRegDoc: signup.registrationDocS3Key
          ? { s3Key: signup.registrationDocS3Key, fileName: signup.registrationDocName }
          : null,
        environmentalReport: signup.envReportS3Key
          ? { s3Key: signup.envReportS3Key, fileName: signup.envReportName }
          : null,
        unverified: signup.unverified,
        // 본인(대표) 담당자 — 회원가입 폼에서 확인·입력한 값. supplier_contacts로 저장된다.
        contacts: [{
          name: signup.contactName,
          email: signup.contactEmail,
          phone: signup.contactPhone,
          department: signup.department,
          isPrimary: true,
        }],
      };
      await submitSupplierOnboarding(supplierId, input);
      setStep('complete');
    } catch (err) {
      setSubmitError(
        err instanceof ApiError && err.status === 409
          ? err.message || '이미 가입이 완료된 협력사입니다.'
          : '제출에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand">
            <ShieldCheck className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-bold text-ink-100">KIRA Battery · 협력사 온보딩</div>
            <div className="text-[11px] text-slate-500">{type === 'firstTier' ? '1차 협력사 — 정보 확인 및 하위협력사 등록' : 'n차 협력사 — 회원가입 및 하위협력사 등록'}</div>
          </div>
        </div>
      </header>

      {/* 단계 인디케이터 */}
      <div className="mx-auto max-w-3xl px-6 pt-6">
        <ol className="flex items-center gap-2">
          {steps.map((s, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li key={s} className="flex flex-1 items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done ? 'bg-brand text-white' : active ? 'border-2 border-brand text-brand' : 'border border-slate-300 text-slate-400'
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={`truncate text-xs font-semibold ${active ? 'text-ink-100' : 'text-slate-400'}`}>{stepLabel[s]}</span>
                {i < steps.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
              </li>
            );
          })}
        </ol>
      </div>

      {/* 단계 본문 */}
      <div className="mx-auto max-w-3xl px-6 py-6">
        {step === 'entry' && (
          <OnboardingEntry
            type={type}
            supplierId={supplierId}
            invitedCompany={invitedCompany}
            consentChecked={consentChecked}
            onConsentChange={setConsentChecked}
            onPrefill={handlePrefill}
            onNext={goNext}
          />
        )}

        {step === 'form' && (
          <SignupForm type={type} data={signup} onChange={setSignup} supplierId={supplierId} onBack={goBack} onNext={goNext} />
        )}

        {step === 'pic' && (
          <PicRegister
            pics={pics}
            onChange={setPics}
            onBack={goBack}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        )}

        {step === 'complete' && (
          <OnboardingComplete type={type} signup={signup} pics={pics} onEdit={goBack} />
        )}
      </div>
    </main>
  );
}
