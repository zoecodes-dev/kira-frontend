'use client';

// STEP 1 (n차) — 회원가입 기본 정보 + 필요 문서 + 로그인 계정. "미확인 등록" 예외 경로 지원.
import { useRef, useState } from 'react';
import { FileUp, Loader2, Upload, KeyRound } from 'lucide-react';
import { uploadFile } from '@/lib/api';
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
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupForm({
  data,
  onChange,
  supplierId,
  onBack,
  onNext,
}: {
  data: SignupData;
  onChange: (data: SignupData) => void;
  supplierId?: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set(patch: Partial<SignupData>) {
    onChange({ ...data, ...patch });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      // 컨텍스트에 supplierId를 실어 백엔드가 어느 협력사 문서인지 식별. 반환 s3Key를 제출에 사용.
      const res = await uploadFile(file, supplierId ? `business-reg:${supplierId}` : 'business-reg');
      set({ registrationDocName: res.fileName || file.name, registrationDocS3Key: res.s3Key });
    } catch {
      setUploadError('업로드에 실패했습니다. 문서가 없으면 아래 "미확인 등록"을 선택하세요.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const requiredFilled =
    data.companyName.trim() &&
    data.country.trim() &&
    data.businessRegNo.trim() &&
    data.address.trim() &&
    data.department.trim();
  const docOk = data.unverified || Boolean(data.registrationDocS3Key);
  const accountOk = emailRe.test(data.accountEmail.trim()) && data.password.length >= 8 && data.password === confirm;
  const valid = Boolean(requiredFilled) && docOk && accountOk;

  function handleNext() {
    setTouched(true);
    if (valid) onNext();
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-base font-bold text-ink-100">회원가입 · 기본 정보</div>
      <p className="mt-1 text-sm text-slate-500">회사 기본 정보·필요 문서·로그인 계정을 등록하세요. 표시된 항목은 필수입니다.</p>

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
            value={data.registrationDocName}
            readOnly
            disabled={data.unverified}
            placeholder="첨부된 파일 없음"
            className={inputCls}
          />
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} accept=".pdf,.png,.jpg,.jpeg" />
          <button
            type="button"
            disabled={data.unverified || uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? '업로드 중…' : '업로드'}
          </button>
        </div>
        {uploadError && <div className="mt-2 text-xs font-semibold text-alert-text">{uploadError}</div>}
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-warn-text">
          <input
            type="checkbox"
            checked={data.unverified}
            onChange={e => set({ unverified: e.target.checked })}
            className="h-4 w-4 accent-brand"
          />
          서류 미보유 — 미확인 상태로 등록 (원청/상위가 검증)
        </label>
      </div>

      {/* 로그인 계정 */}
      <div className="mt-5 rounded-md border border-slate-200 p-4">
        <div className="flex items-center gap-1.5 text-sm font-bold text-ink-100">
          <KeyRound className="h-4 w-4 text-brand" />
          로그인 계정
        </div>
        <p className="mt-1 text-xs text-slate-500">제출 후 이 계정으로 바로 로그인합니다. 비밀번호는 8자 이상.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Labeled label="이메일" required>
              <input
                type="email"
                value={data.accountEmail}
                onChange={e => set({ accountEmail: e.target.value })}
                className={inputCls}
                placeholder="name@company.com"
                autoComplete="username"
              />
            </Labeled>
          </div>
          <Labeled label="비밀번호" required>
            <input
              type="password"
              value={data.password}
              onChange={e => set({ password: e.target.value })}
              className={inputCls}
              placeholder="8자 이상"
              autoComplete="new-password"
            />
          </Labeled>
          <Labeled label="비밀번호 확인" required>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className={inputCls}
              placeholder="다시 입력"
              autoComplete="new-password"
            />
          </Labeled>
        </div>
        {touched && data.password.length > 0 && data.password !== confirm && (
          <div className="mt-2 text-xs font-semibold text-alert-text">비밀번호가 일치하지 않습니다.</div>
        )}
      </div>

      {touched && !valid && (
        <div className="mt-4 rounded-md border border-alert-border bg-alert-bg px-3 py-2 text-xs font-semibold text-alert-text">
          필수 항목·필요 문서(또는 미확인 등록)·로그인 계정(이메일/8자 이상 비밀번호 일치)을 확인해 주세요.
        </div>
      )}

      <StepFooter onBack={onBack} onNext={handleNext} nextDisabled={touched && !valid} />
    </div>
  );
}
