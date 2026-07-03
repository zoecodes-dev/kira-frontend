'use client';

// 하위협력사 담당자 등록 — 하위 협력사의 담당자를 최대 3명까지. 등록 시 회원가입 요청 메일이 발송된다(캐스케이드).
//   공급망 연결고리 유지를 위해 '필수' — 최소 1명(회사명·담당자·이메일). 단, 진짜 말단이면 '없음'을 명시 선언해야만 건너뛴다.
//   (시스템은 말단 여부를 자동 판별할 수 없어, 무심코 넘겨 체인이 끊기는 걸 막기 위한 명시 선언 게이트.)
import { useState } from 'react';
import { Ban, Plus, Trash2, UserPlus } from 'lucide-react';
import type { PicContact } from './SupplierOnboarding';
import StepFooter from './StepFooter';

const MAX_PICS = 3;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 하나라도 입력이 있으면 '작성 중' 행 — 이 행은 회사명·이름·이메일·전화가 모두 유효해야 한다. */
function isPicFilled(p: PicContact) {
  return Boolean(p.company.trim() || p.name.trim() || p.email.trim() || p.phone.trim());
}
function isPicComplete(p: PicContact) {
  return Boolean(p.company.trim()) && Boolean(p.name.trim()) && emailRe.test(p.email.trim()) && Boolean(p.phone.trim());
}

export default function PicRegister({
  pics,
  onChange,
  onBack,
  onSubmit,
  submitting = false,
  submitError = null,
}: {
  pics: PicContact[];
  onChange: (pics: PicContact[]) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  submitError?: string | null;
}) {
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

  // '하위 협력사 없음(말단)' 명시 선언 — 체크해야만 하위 등록 없이 진행할 수 있다.
  const [noSubSuppliers, setNoSubSuppliers] = useState(false);

  const filledPics = pics.filter(isPicFilled);
  const allFilledComplete = filledPics.every(isPicComplete);
  // 제출 가능 조건: (말단 선언) 또는 (하위 최소 1명 && 작성한 행이 모두 완전).
  const canSubmit = noSubSuppliers ? true : filledPics.length > 0 && allFilledComplete;

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-base font-bold text-ink-100">
        <UserPlus className="h-5 w-5 text-brand" />
        하위협력사 담당자 등록
      </div>
      <p className="mt-1 text-sm text-slate-500">
        하위 협력사의 담당자 정보를 <b>최소 1명</b> 등록하세요(최대 3명). 등록된 담당자 이메일로 회원가입 요청 메일이
        발송되어 공급망이 아래로 이어집니다. 하위 협력사가 <b>정말 없는 말단 협력사</b>라면 아래에서 '없음'을 선언해 주세요.
      </p>

      <div className={`mt-5 space-y-3 ${noSubSuppliers ? 'pointer-events-none opacity-40' : ''}`}>
        {pics.map((pic, i) => (
          <div key={i} className="rounded-md border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">하위협력사 {i + 1}</span>
              {pics.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-alert-text"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </button>
              )}
            </div>
            <input
              value={pic.company}
              onChange={e => update(i, { company: e.target.value })}
              placeholder="하위 협력사 회사명"
              className="mb-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand"
            />
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

      {!noSubSuppliers && pics.length < MAX_PICS && (
        <button
          type="button"
          onClick={add}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-500 hover:border-brand hover:text-brand"
        >
          <Plus className="h-4 w-4" />
          담당자 추가 ({pics.length}/{MAX_PICS})
        </button>
      )}

      {/* 말단 선언 게이트 — 무심코 넘겨 공급망이 끊기는 걸 막는다. 체크해야만 하위 등록 없이 진행 가능. */}
      <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-ink-300">
        <input
          type="checkbox"
          checked={noSubSuppliers}
          onChange={e => setNoSubSuppliers(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand"
        />
        <span className="flex items-center gap-1.5">
          <Ban className="h-4 w-4 shrink-0 text-warn-text" />
          <span>
            <b>하위 협력사가 없습니다 (말단 협력사)</b> — 더 이상 아래로 연결할 협력사가 없어 등록을 건너뜁니다.
            <span className="mt-0.5 block text-[11px] text-slate-500">이 선언은 기록으로 남으며, 실제로 하위가 있는데 건너뛰면 공급망 추적이 끊깁니다.</span>
          </span>
        </span>
      </label>

      {!noSubSuppliers && filledPics.length === 0 && (
        <div className="mt-3 text-xs font-semibold text-warn-text">
          하위 협력사 담당자를 최소 1명 등록하거나, 위에서 ‘하위 협력사 없음(말단)’을 선언해 주세요.
        </div>
      )}

      {submitError && (
        <div className="mt-4 rounded-md border border-alert-border bg-alert-bg px-3 py-2 text-xs font-semibold text-alert-text">
          {submitError}
        </div>
      )}

      <StepFooter
        onBack={onBack}
        onNext={onSubmit}
        nextDisabled={!canSubmit || submitting}
        nextLabel={submitting ? '제출 중…' : '제출하기'}
      />
    </div>
  );
}
