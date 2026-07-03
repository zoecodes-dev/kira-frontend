'use client';

// 제3자 정보제공 동의서 = 데이터 계약(Data Contract) — 협력사 회신·동의 화면.
// 원청이 발송한 계약 오퍼(DataConsent)의 조건을 buildConsentDocument로 "그대로" 재조립해
// 협력사에게 보여주고(= 메일에 담겨 나간 문서와 동일), 로그인한 담당자가 "동의합니다" 체크 1개로
// status='agreed' 영속(updateDataConsent). 서명자는 로그인 세션(담당자 표시명)에서 자동 기입.
// 스키마: docker/01_schema.sql:193 data_provision_consents (signer_*, form_data JSONB, agreement_hash).
import { useState } from 'react';
import { CheckCircle2, FileSignature, Loader2, X } from 'lucide-react';
import { updateDataConsent, getSessionUser, type DataConsent } from '@/lib/api';
import { buildConsentDocument } from '@/lib/consent-clauses';

// 라벨은 lib/consent-clauses가 SSOT. ConsentDetailView 등 기존 import 경로 호환을 위해 재노출.
export { SCOPE_LABEL, PURPOSE_LABEL, SIGNATURE_METHODS } from '@/lib/consent-clauses';

// 합의 무결성 해시(데모) — consentId + 서명자 + 시각으로 결정적 해시 생성(Catena-X agreement log 유사).
function agreementHashOf(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0') + Date.now().toString(16).slice(-4);
}

export default function ConsentReplyForm({
  consent,
  companyName,
  onClose,
  onDone,
}: {
  consent: DataConsent;
  companyName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로그인한 담당자(없으면 데모/미로그인 대비 회사명으로 폴백).
  const signerName = getSessionUser()?.displayName?.trim() || companyName;

  // 발송 시점 조건으로 문서를 그대로 재조립 → 메일에 담겨 나간 문서와 글자 단위로 동일.
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

  async function submit() {
    if (!agreed) return;
    setBusy(true);
    setError(null);
    try {
      // form_data(SSOT) — 단일 체크 동의 방식임을 기록. 문서 자체는 조건에서 결정적으로 재생성된다.
      const formData = {
        agreed_via: 'single_checkbox',
        signer_display: signerName,
        agreed_at: new Date().toISOString(),
      };
      await updateDataConsent(consent.consentId, {
        status: 'agreed',
        signerName,
        signatureMethod: 'email_form',
        formData,
        agreementHash: agreementHashOf(`${consent.consentId}|${signerName}|${Date.now()}`),
      });
      onDone();
    } catch {
      setError('동의 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-sm border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-ink-100">
              <FileSignature className="h-4 w-4 text-brand" />제3자 정보 제공 동의서 · 확인 및 동의
            </div>
            <p className="mt-1 text-sm text-slate-500">{companyName} — 아래 동의서 내용을 확인하고 동의해 주세요.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-100" aria-label="닫기"><X className="h-5 w-5" /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* 동의서 원문 — 메일에 담겨 나간 문서와 동일하게 조건에서 재조립 */}
          <pre className="max-h-[46vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-[12px] leading-6 text-ink-200">
            {document}
          </pre>

          {/* 최종 동의 — 로그인한 담당자의 체크 하나로 귀결 */}
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-brand/40 bg-brand/5 p-3 text-sm font-semibold text-ink-100">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" />
            <span>
              위 제3자 정보 제공 동의서의 내용을 모두 확인하였으며, 이에 동의합니다.
              <span className="mt-0.5 block text-xs font-normal text-slate-500">동의 담당자: {signerName}</span>
            </span>
          </label>

          {error && <div className="rounded-md border border-alert-border bg-alert-bg px-3 py-2 text-xs font-semibold text-alert-text">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} disabled={busy} className="inline-flex h-9 items-center rounded-sm border border-slate-200 bg-white px-4 text-sm font-bold text-ink-400 hover:bg-slate-50 disabled:opacity-50">취소</button>
          <button type="button" onClick={submit} disabled={busy || !agreed}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-brand px-4 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            동의 · 회신 제출
          </button>
        </div>
      </div>
    </div>
  );
}
