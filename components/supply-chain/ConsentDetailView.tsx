'use client';

// 제3자 정보제공 동의서 = 데이터 계약(Data Contract) — 원청이 보는 회신 내용 읽기전용 뷰.
// ConsentReplyForm과 동일한 레이아웃(계약조건 요약 → 서명자 정보 → 회신 정보)을 그대로 재사용하되,
// 입력 필드 대신 협력사가 실제로 제출한 값을 표시한다. (기존엔 formData를 JSON.stringify로만 노출)
import { FileSignature, X } from 'lucide-react';
import clsx from 'clsx';
import { type DataConsent } from '@/lib/api';
import { PURPOSE_LABEL, SCOPE_LABEL, SIGNATURE_METHODS } from './ConsentReplyForm';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <div className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm leading-[2.5rem] text-ink-100">{value}</div>
    </div>
  );
}

export default function ConsentDetailView({
  consent,
  companyName,
  statusLabel,
  statusClassName,
  onClose,
}: {
  consent: DataConsent;
  companyName: string;
  statusLabel: string;
  statusClassName: string;
  onClose: () => void;
}) {
  const formData = consent.formData ?? {};
  const signatureLabel = SIGNATURE_METHODS.find(m => m.key === consent.signatureMethod)?.label ?? (consent.signatureMethod || '-');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-sm border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-ink-100">
              <FileSignature className="h-4 w-4 text-brand" />제3자 정보 제공 동의서 · 회신 내용
            </div>
            <p className="mt-1 text-sm text-slate-500">{companyName} — 협력사가 제출한 양식 그대로입니다.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-100" aria-label="닫기"><X className="h-5 w-5" /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* 계약 조건 요약 */}
          <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-bold text-ink-100">동의 대상 · 제공 조건</div>
            <dl className="mt-2 grid grid-cols-1 gap-y-1.5 text-xs sm:grid-cols-2">
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-slate-500">이용 목적</dt><dd className="font-semibold text-ink-300">{PURPOSE_LABEL[consent.purpose] ?? consent.purpose}</dd></div>
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-slate-500">유효 기간</dt><dd className="font-semibold text-ink-300">{consent.validFrom ?? '-'} ~ {consent.validTo ?? '-'}</dd></div>
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-slate-500">제3자 재공유</dt><dd className="font-semibold text-ink-300">{consent.thirdPartySharing ? '허용' : '불허'}</dd></div>
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-slate-500">철회 가능</dt><dd className="font-semibold text-ink-300">{consent.revocable ? '가능' : '불가'}</dd></div>
              <div className="col-span-full flex gap-2"><dt className="w-20 shrink-0 text-slate-500">재공유 대상</dt><dd className="font-semibold text-ink-300">{(consent.allowedRecipients ?? []).join(', ') || '-'}</dd></div>
            </dl>
            <div className="mt-3">
              <div className="text-[11px] font-bold text-slate-500">제공 데이터 항목</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {consent.dataScope.map(s => (
                  <span key={s} className="rounded-sm bg-white px-1.5 py-0.5 text-[11px] font-semibold text-ink-400 ring-1 ring-slate-200">{SCOPE_LABEL[s] ?? s}</span>
                ))}
              </div>
            </div>
          </section>

          {/* 서명자 정보 */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 text-sm font-bold text-ink-100">서명자 정보</div>
            <Field label="서명자 이름" value={consent.signerName || '-'} />
            <Field label="직책" value={consent.signerTitle || '-'} />
            <Field label="이메일" value={consent.signerEmail || '-'} />
            <Field label="서명 방식" value={signatureLabel} />
          </section>

          {/* 회신 양식 데이터 (form_data) */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 text-sm font-bold text-ink-100">회신 정보</div>
            <Field label="정보주체(회사)" value={(formData.data_subject as string) || '-'} />
            <Field label="데이터 보존 기간(년)" value={formData.retention_years != null ? `${formData.retention_years}년` : '-'} />
            <div className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold text-ink-300">
              <span className={clsx('h-4 w-4 rounded-sm border', formData.sub_supplier_consent ? 'border-brand bg-brand' : 'border-slate-300 bg-white')} />
              하위 협력사 정보 제공에도 동의함
            </div>
          </section>

          {/* 동의 상태 */}
          <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-ink-100">
            <span>동의 상태</span>
            <span className={clsx('rounded-full border px-2.5 py-1 text-xs font-bold', statusClassName)}>{statusLabel}</span>
          </div>
          {consent.agreementHash && (
            <p className="break-all font-mono text-[11px] text-slate-400">무결성 해시: {consent.agreementHash}</p>
          )}
        </div>
      </div>
    </div>
  );
}
