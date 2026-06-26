'use client';

// STEP 1 (n차) — 회원가입 기본 정보 + 필요 문서. "미확인 등록" 예외 경로 지원.
import { useState } from 'react';
import { FileUp, Upload } from 'lucide-react';
import type { SignupData } from './SupplierOnboarding';
import StepFooter from './StepFooter';

function Labeled({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-alert-text">*</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls = 'h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand disabled:bg-slate-50 disabled:text-slate-500';

export default function SignupForm({
  data,
  onChange,
  onBack,
  onNext,
}: {
  data: SignupData;
  onChange: (data: SignupData) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [touched, setTouched] = useState(false);

  function set(patch: Partial<SignupData>) {
    onChange({ ...data, ...patch });
  }

  const requiredFilled =
    data.companyName.trim() &&
    data.country.trim() &&
    data.businessRegNo.trim() &&
    data.address.trim() &&
    data.department.trim();
  const docOk = data.unverified || Boolean(data.registrationDoc.trim());
  const valid = Boolean(requiredFilled) && docOk;

  function handleNext() {
    setTouched(true);
    if (valid) onNext();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-base font-bold text-ink-100">회원가입 · 기본 정보</div>
      <p className="mt-1 text-sm text-slate-500">회사 기본 정보와 필요 문서를 등록하세요. 표시된 항목은 필수입니다.</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Labeled label="회사명" required>
            <input value={data.companyName} onChange={e => set({ companyName: e.target.value })} className={inputCls} placeholder="회사명" />
          </Labeled>
        </div>
        <Labeled label="소재 국가" required>
          <input value={data.country} onChange={e => set({ country: e.target.value })} className={inputCls} placeholder="예: 대한민국 (KR)" />
        </Labeled>
        <Labeled label="사업자 등록번호" required>
          <input value={data.businessRegNo} onChange={e => set({ businessRegNo: e.target.value })} className={inputCls} placeholder="000-00-00000" />
        </Labeled>
        <Labeled label="DUNS 번호 (선택)">
          <input value={data.dunsNumber} onChange={e => set({ dunsNumber: e.target.value })} className={inputCls} placeholder="00-000-0000" />
        </Labeled>
        <Labeled label="담당자(본인) 부서명" required>
          <input value={data.department} onChange={e => set({ department: e.target.value })} className={inputCls} placeholder="예: ESG팀" />
        </Labeled>
        <div className="sm:col-span-2">
          <Labeled label="주소" required>
            <input value={data.address} onChange={e => set({ address: e.target.value })} className={inputCls} placeholder="회사 주소" />
          </Labeled>
        </div>
      </div>

      {/* 필요 문서 */}
      <div className="mt-5 rounded-md border border-slate-200 p-4">
        <div className="flex items-center gap-1.5 text-sm font-bold text-ink-100">
          <FileUp className="h-4 w-4 text-brand" />
          필요 문서
        </div>
        <p className="mt-1 text-xs text-slate-500">사업자 등록증을 첨부하세요. 해외 기업은 기업 정보 서류로 대체합니다.</p>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={data.registrationDoc}
            onChange={e => set({ registrationDoc: e.target.value })}
            disabled={data.unverified}
            placeholder="첨부 파일명 (예: business_registration.pdf)"
            className={inputCls}
          />
          <button
            type="button"
            disabled={data.unverified}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            업로드
          </button>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-warn-text">
          <input type="checkbox" checked={data.unverified} onChange={e => set({ unverified: e.target.checked })} className="h-4 w-4 accent-brand" />
          서류 미보유 — 미확인 상태로 등록 (원청/상위가 검증)
        </label>
      </div>

      {touched && !valid && (
        <div className="mt-4 rounded-md border border-alert-border bg-alert-bg px-3 py-2 text-xs font-semibold text-alert-text">
          필수 항목과 필요 문서(또는 미확인 등록)를 확인해 주세요.
        </div>
      )}

      <StepFooter onBack={onBack} onNext={handleNext} nextDisabled={touched && !valid} />
    </div>
  );
}
