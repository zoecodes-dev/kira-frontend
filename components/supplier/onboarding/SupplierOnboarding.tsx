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
import OnboardingConfirm from './OnboardingConfirm';

export type OnboardingType = 'firstTier' | 'nTier';
export type OnboardingStep = 'entry' | 'confirm' | 'form' | 'pic' | 'complete';

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
  department: string;
  registrationDocName: string; // 업로드된 사업자등록증 파일명 (표시용)
  registrationDocS3Key: string; // 업로드 결과 s3 key (제출 payload)
  envReportName: string; // 환경성적서 파일명(표시용)
  envReportS3Key: string; // 환경성적서 s3 key(제출 payload)
  unverified: boolean; // 미확인 상태로 등록 (문서 미보유 예외)
  accountEmail: string; // 로그인 계정 이메일
  password: string; // 로그인 계정 비밀번호
}

const emptySignup: SignupData = {
  companyName: '',
  country: '',
  businessRegNo: '',
  dunsNumber: '',
  address: '',
  department: '',
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

/** 1차는 회원가입(form) 단계를 건너뛴다 */
function stepsFor(type: OnboardingType): OnboardingStep[] {
  return type === 'firstTier' ? ['entry', 'pic', 'complete'] : ['entry', 'confirm', 'form', 'pic', 'complete'];
}

const stepLabel: Record<OnboardingStep, string> = {
  entry: '진입 · 동의 확인',
  confirm: '정보 확인',
  form: '회원가입',
  pic: '담당자(PIC) 등록',
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
  const [prefillDetail, setPrefillDetail] = useState<OnboardingPrefill | null>(null);

  const currentIndex = steps.indexOf(step);

  function handlePrefill(detail: OnboardingPrefill) {
    setPrefillDetail(detail);
    setSignup(prev => ({ ...prev, companyName: prev.companyName || detail.companyName }));
  }

  function goNext() {
    const next = steps[currentIndex + 1];
    if (next) setStep(next);
  }
  function goBack() {
    const prev = steps[currentIndex - 1];
    if (prev) setStep(prev);
  }

  // PIC 단계 '제출하기' — n차는 실제 회원가입 제출(공개 submit), 1차는 하위 PIC 등록(캐스케이드는 Phase 2라 로컬 진행).
  async function handleSubmit() {
    if (type === 'firstTier') {
      goNext();
      return;
    }
    if (!supplierId) {
      setSubmitError('초대 링크가 올바르지 않습니다. (supplierId 없음)');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const input: OnboardingSubmitInput = {
        account: { email: signup.accountEmail, password: signup.password },
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
        // 첫 번째 담당자를 대표(is_primary)로. department는 백엔드가 회사 부서로 보강.
        contacts: pics.map((p, i) => ({ name: p.name, email: p.email, phone: p.phone, isPrimary: i === 0 })),
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
            <div className="text-[11px] text-slate-500">{type === 'firstTier' ? '1차 협력사 — 하위 협력사 정보 등록' : 'n차 협력사 — 회원가입'}</div>
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

        {step === 'confirm' && (
          <OnboardingConfirm detail={prefillDetail} invitedCompany={invitedCompany} onBack={goBack} onNext={goNext} />
        )}

        {step === 'form' && (
          <SignupForm data={signup} onChange={setSignup} supplierId={supplierId} onBack={goBack} onNext={goNext} />
        )}

        {step === 'pic' && (
          <PicRegister
            type={type}
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
