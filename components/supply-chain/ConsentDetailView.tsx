'use client';

// 제3자 정보제공 동의서 = 데이터 계약(Data Contract) — 원청이 보는 회신 내용 읽기전용 뷰.
// ConsentReplyForm과 동일한 레이아웃(계약조건 요약 → 서명자 정보 → 회신 정보)을 그대로 재사용하되,
// 입력 필드 대신 협력사가 실제로 제출한 값을 표시한다. (기존엔 formData를 JSON.stringify로만 노출)
import { FileSignature, X } from 'lucide-react';
import clsx from 'clsx';
import { type DataConsent } from '@/lib/api';
import { buildConsentDocument } from '@/lib/consent-clauses';
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
  const signatureLabel = SIGNATURE_METHODS.find(m => m.key === consent.signatureMethod)?.label ?? (consent.signatureMethod || '-');
  const hasReply = Boolean(consent.formData) || Boolean(consent.signerName);

  // 메일 발송 시·협력사 회신 화면(ConsentReplyForm)과 동일한 조건으로 문서를 재조립
  // → 원청이 이 화면에서 보는 전문이 실제로 협력사가 확인·동의한 문서와 글자 단위로 동일하다.
  const document = buildConsentDocument({
    providerCompany: companyName,
    purpose: consent.purpose,
    dataScope: consent.dataScope,
    thirdPartySharing: consent.thirdPartySharing,
    allowedRecipients: consent.allowedRecipients,
    validFrom: consent.validFrom,
    validTo: consent.validTo,
    revocable: consent.revocable,
    issuedDate: consent.requestedAt?.slice(0, 10) ?? consent.createdAt?.slice(0, 10) ?? null,
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-sm border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-ink-100">
              <FileSignature className="h-4 w-4 text-brand" />제3자 정보 제공 동의서 · {hasReply ? '회신 내용' : '발송 내용'}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {companyName} — {hasReply ? '협력사가 제출한 양식 그대로입니다.' : '아직 협력사 회신 전입니다. 발송된 동의서 원문을 확인할 수 있습니다.'}
            </p>
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

          {/* 서명자 정보 · 회신 정보 — 아직 회신 전이면 표시할 값이 없으므로 숨김 */}
          {hasReply && (
            <>
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 text-sm font-bold text-ink-100">서명자 정보</div>
                <Field label="서명자 이름" value={consent.signerName || '-'} />
                <Field label="직책" value={consent.signerTitle || '-'} />
                <Field label="이메일" value={consent.signerEmail || '-'} />
                <Field label="서명 방식" value={signatureLabel} />
              </section>

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 text-sm font-bold text-ink-100">회신 정보</div>
                <Field label="정보 제공 회사" value={companyName} />
                <Field label="동의 일시" value={consent.agreedAt?.slice(0, 10) ?? '-'} />
              </section>
            </>
          )}

          {/* 동의서 전문 — 메일 발송·협력사 회신 화면과 동일한 조건으로 재조립한 원문(=첨부 PDF와 동일 내용) */}
          <section>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink-100">
              <FileSignature className="h-4 w-4 text-brand" />
              동의서 전문
              <span className="ml-1 text-xs font-normal text-slate-400">— 메일에 첨부된 동의서와 동일한 문서입니다</span>
            </div>
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-[12px] leading-6 text-ink-200">
              {document}
            </pre>
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
