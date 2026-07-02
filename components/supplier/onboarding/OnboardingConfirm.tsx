'use client';

// [M2] n차 온보딩 — 상위 협력사가 등록한 회사 정보 확인 step (회원가입 전).
//   flow: "회사명과 컨택포인트상 정보가 맞는지 확인 요청 후 회원가입 진행."
//   공개 prefill(getOnboardingPrefill)만 표시(회사명·유형·국가). 담당자(PIC)는 다음 pic step에서 확인·입력.
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { OnboardingPrefill } from '@/lib/api';
import StepFooter from './StepFooter';

const PROVIDER_LABEL: Record<string, string> = {
  manufacturer: '제조사', recycler: '재활용', trader: '트레이더', miner: '광산', smelter: '제련소',
};

export default function OnboardingConfirm({
  detail,
  invitedCompany,
  onBack,
  onNext,
}: {
  detail: OnboardingPrefill | null;
  invitedCompany?: string;
  onBack: () => void;
  onNext: () => void;
}) {
  // '정보가 맞습니다' 확인은 체크박스로 받고, '다음' 버튼은 체크됐을 때만 활성.
  const [confirmed, setConfirmed] = useState(false);
  const rows: [string, string][] = [
    ['회사명', detail?.companyName || invitedCompany || '—'],
    ['공급자 유형', detail?.providerType ? (PROVIDER_LABEL[detail.providerType] ?? detail.providerType) : '—'],
    ['소재 국가', detail?.country || '—'],
  ];
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-1.5 text-base font-bold text-ink-100">
        <ShieldCheck className="h-4 w-4 text-brand" />
        초대받은 회사 정보 확인
      </div>
      <p className="mt-1 text-sm text-slate-500">
        상위 협력사가 등록한 정보입니다. 맞는지 확인 후 회원가입을 진행하세요. (담당자 정보는 다음 단계에서 확인·입력합니다.)
      </p>
      <dl className="mt-5 divide-y divide-slate-100 rounded-md border border-slate-200">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-4 py-3">
            <dt className="text-xs font-semibold text-slate-500">{k}</dt>
            <dd className="text-sm font-semibold text-ink-100">{v}</dd>
          </div>
        ))}
      </dl>
      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-100">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          className="h-4 w-4 accent-brand"
        />
        정보가 맞습니다
      </label>
      <StepFooter onBack={onBack} onNext={onNext} nextDisabled={!confirmed} nextLabel="다음" />
    </div>
  );
}
