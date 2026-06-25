'use client';

// 협력사 온보딩 진입 funnel — 메일 URL 진입 → 회원가입/하위 PIC 등록 → 제출 → 승인 대기
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, ShieldCheck } from 'lucide-react';
import type { SupplierDetail } from '@/lib/api';
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
  department: string;
  registrationDoc: string; // 사업자 등록증 / 해외 기업 정보 서류 (파일명 stub)
  unverified: boolean; // 미확인 상태로 등록 (문서 미보유 예외)
}

const emptySignup: SignupData = {
  companyName: '',
  country: '',
  businessRegNo: '',
  dunsNumber: '',
  address: '',
  department: '',
  registrationDoc: '',
  unverified: false,
};

function emptyPic(): PicContact {
  return { company: '', name: '', email: '', phone: '' };
}

/** 1차는 회원가입(form) 단계를 건너뛴다 */
function stepsFor(type: OnboardingType): OnboardingStep[] {
  return type === 'firstTier' ? ['entry', 'pic', 'complete'] : ['entry', 'form', 'pic', 'complete'];
}

const stepLabel: Record<OnboardingStep, string> = {
  entry: '진입 · 동의 확인',
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

  const currentIndex = steps.indexOf(step);

  function handlePrefill(detail: SupplierDetail) {
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

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#046949]">
            <ShieldCheck className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-bold text-ink-100">Battery DPP · 협력사 온보딩</div>
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
                    done ? 'bg-[#046949] text-white' : active ? 'border-2 border-[#046949] text-[#046949]' : 'border border-slate-300 text-slate-400'
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
          <SignupForm data={signup} onChange={setSignup} onBack={goBack} onNext={goNext} />
        )}

        {step === 'pic' && (
          <PicRegister
            type={type}
            pics={pics}
            onChange={setPics}
            onBack={goBack}
            onSubmit={goNext}
          />
        )}

        {step === 'complete' && (
          <OnboardingComplete type={type} signup={signup} pics={pics} onEdit={goBack} />
        )}
      </div>
    </main>
  );
}
