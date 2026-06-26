'use client';

// 담당자(PIC) 등록 — 1차: 하위 협력사 담당자 / n차: 본인 담당자. 최대 3명, 이름·이메일·전화 필수.
import { Plus, Trash2, UserPlus } from 'lucide-react';
import type { OnboardingType, PicContact } from './SupplierOnboarding';
import StepFooter from './StepFooter';

const MAX_PICS = 3;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPicValid(p: PicContact, needCompany: boolean) {
  if (needCompany && !p.company.trim()) return false;
  return Boolean(p.name.trim()) && emailRe.test(p.email.trim()) && Boolean(p.phone.trim());
}

export default function PicRegister({
  type,
  pics,
  onChange,
  onBack,
  onSubmit,
}: {
  type: OnboardingType;
  pics: PicContact[];
  onChange: (pics: PicContact[]) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const isFirstTier = type === 'firstTier';

  function update(index: number, patch: Partial<PicContact>) {
    onChange(pics.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }
  function add() {
    if (pics.length >= MAX_PICS) return;
    onChange([...pics, { company: '', name: '', email: '', phone: '' }]);
  }
  function remove(index: number) {
    if (pics.length <= 1) return;
    onChange(pics.filter((_, i) => i !== index));
  }

  const allValid = pics.length > 0 && pics.every(p => isPicValid(p, isFirstTier));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-base font-bold text-ink-100">
        <UserPlus className="h-5 w-5 text-brand" />
        {isFirstTier ? '하위 협력사 담당자(PIC) 등록' : '담당자(PIC) 등록'}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {isFirstTier
          ? '하위 협력사의 담당자 정보를 최대 3명까지 등록하세요. 등록된 담당자에게 회원가입 요청 메일이 발송됩니다.'
          : '회사 담당자 정보를 최대 3명까지 등록하세요. (이름·이메일·전화번호)'}
      </p>

      <div className="mt-5 space-y-3">
        {pics.map((pic, i) => (
          <div key={i} className="rounded-md border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">PIC {i + 1}</span>
              {pics.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </button>
              )}
            </div>
            {isFirstTier && (
              <input
                value={pic.company}
                onChange={e => update(i, { company: e.target.value })}
                placeholder="하위 협력사 회사명"
                className="mb-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand"
              />
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={pic.name}
                onChange={e => update(i, { name: e.target.value })}
                placeholder="담당자명"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand"
              />
              <input
                value={pic.email}
                onChange={e => update(i, { email: e.target.value })}
                placeholder="이메일"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand"
              />
              <input
                value={pic.phone}
                onChange={e => update(i, { phone: e.target.value })}
                placeholder="전화번호"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>
        ))}
      </div>

      {pics.length < MAX_PICS && (
        <button
          type="button"
          onClick={add}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-500 hover:border-brand hover:text-brand"
        >
          <Plus className="h-4 w-4" />
          담당자 추가 ({pics.length}/{MAX_PICS})
        </button>
      )}

      <StepFooter onBack={onBack} onNext={onSubmit} nextDisabled={!allValid} nextLabel="제출하기" />
    </div>
  );
}
