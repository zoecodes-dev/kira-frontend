'use client';

// 제3자 정보제공 동의서 = 데이터 계약(Data Contract) — 협력사 회신·서명 양식.
// 원청이 발송한 계약 오퍼(DataConsent)에 대해, data contract 조건을 확인하고 서명자 정보 +
// 회신 양식 데이터(form_data)를 입력받아 status='agreed'로 영속(updateDataConsent)한다.
// 스키마: docker/01_schema.sql:193 data_provision_consents (signer_*, form_data JSONB, agreement_hash).
import { useState } from 'react';
import { CheckCircle2, FileSignature, Loader2, X } from 'lucide-react';
import { updateDataConsent, type DataConsent } from '@/lib/api';

const SCOPE_LABEL: Record<string, string> = {
  company: '기업 기본정보',
  contacts: '담당자 연락처',
  factories: '공장·사업장',
  carbon_epd: '환경성적서(탄소)',
  origin: '원산지/규제',
  sub_suppliers: '하위 협력사',
};
const PURPOSE_LABEL: Record<string, string> = {
  EU_BATTERY: 'EU 배터리 규정 대응',
  SUPPLY_CHAIN_DD: '공급망 실사(Due Diligence)',
  CSDDD: 'CSDDD(기업 지속가능성 실사 지침)',
  CONFLICT_MINERALS: '분쟁광물 대응',
};
const SIGNATURE_METHODS: { key: string; label: string }[] = [
  { key: 'email_form', label: '이메일 양식 회신' },
  { key: 'e_sign', label: '전자서명' },
  { key: 'wet_signature', label: '자필 서명(스캔본)' },
];

const inputCls = 'h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand disabled:bg-slate-50 disabled:text-slate-500';
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// 합의 무결성 해시(데모) — consentId + 서명자 + 회신 내용으로 결정적 해시 생성(Catena-X agreement log 유사).
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
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signatureMethod, setSignatureMethod] = useState('email_form');
  const [dataSubject, setDataSubject] = useState(companyName);
  const [retentionYears, setRetentionYears] = useState('7');
  const [subSupplierConsent, setSubSupplierConsent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retention = Number(retentionYears);
  const valid =
    signerName.trim().length > 0 &&
    emailRe.test(signerEmail.trim()) &&
    dataSubject.trim().length > 0 &&
    Number.isFinite(retention) && retention > 0 &&
    agreed;

  async function submit() {
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const formData = {
        data_subject: dataSubject.trim(),
        retention_years: retention,
        sub_supplier_consent: subSupplierConsent,
      };
      await updateDataConsent(consent.consentId, {
        status: 'agreed',
        signerName: signerName.trim(),
        signerTitle: signerTitle.trim() || undefined,
        signerEmail: signerEmail.trim(),
        signatureMethod,
        formData,
        agreementHash: agreementHashOf(`${consent.consentId}|${signerName}|${JSON.stringify(formData)}`),
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
              <FileSignature className="h-4 w-4 text-brand" />제3자 정보 제공 동의서 · 회신
            </div>
            <p className="mt-1 text-sm text-slate-500">{companyName} — 아래 데이터 계약 내용을 확인하고 서명·동의해 주세요.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-100" aria-label="닫기"><X className="h-5 w-5" /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* 계약 조건 요약 + 제3자 정보 제공 동의 문구 */}
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
            <p className="mt-3 border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500">
              본인은 위 <b>제공 데이터 항목</b>을 명시된 <b>이용 목적</b> 범위 내에서 원청이 수집·이용하는 것에 동의합니다.
              {consent.thirdPartySharing ? ' 또한 위 재공유 대상(고객사·규제기관)에 대한 제3자 제공에 동의합니다.' : ' 원청은 본 동의 없이 제3자에게 재공유할 수 없습니다.'}
              {' '}동의는 유효 기간 동안 유지되며{consent.revocable ? ', 언제든지 철회할 수 있습니다.' : '.'}
            </p>
          </section>

          {/* 서명자 정보 */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 text-sm font-bold text-ink-100">서명자 정보</div>
            <Labeled label="서명자 이름" required>
              <input value={signerName} onChange={e => setSignerName(e.target.value)} className={inputCls} placeholder="예: 김철수" />
            </Labeled>
            <Labeled label="직책">
              <input value={signerTitle} onChange={e => setSignerTitle(e.target.value)} className={inputCls} placeholder="예: ESG팀장" />
            </Labeled>
            <Labeled label="이메일" required>
              <input type="email" value={signerEmail} onChange={e => setSignerEmail(e.target.value)} className={inputCls} placeholder="name@company.com" autoComplete="off" />
            </Labeled>
            <Labeled label="서명 방식" required>
              <select value={signatureMethod} onChange={e => setSignatureMethod(e.target.value)} className={inputCls}>
                {SIGNATURE_METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </Labeled>
          </section>

          {/* 회신 양식 데이터 (form_data) */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 text-sm font-bold text-ink-100">회신 정보</div>
            <Labeled label="정보주체(회사)" required>
              <input value={dataSubject} onChange={e => setDataSubject(e.target.value)} className={inputCls} placeholder="정보 제공 주체 회사명" />
            </Labeled>
            <Labeled label="데이터 보존 기간(년)" required>
              <input type="number" min={1} value={retentionYears} onChange={e => setRetentionYears(e.target.value)} className={inputCls} placeholder="예: 7" />
            </Labeled>
            <label className="sm:col-span-2 flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-300">
              <input type="checkbox" checked={subSupplierConsent} onChange={e => setSubSupplierConsent(e.target.checked)} className="h-4 w-4 accent-brand" />
              하위 협력사 정보 제공에도 동의합니다.
            </label>
          </section>

          {/* 최종 동의 */}
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-brand/40 bg-brand/5 p-3 text-sm font-semibold text-ink-100">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" />
            위 제3자 정보 제공 동의서의 내용을 모두 확인하였으며, 이에 동의합니다.
          </label>

          {touched && !valid && (
            <div className="rounded-md border border-alert-border bg-alert-bg px-3 py-2 text-xs font-semibold text-alert-text">
              서명자 이름·이메일, 정보주체, 보존 기간(1년 이상)과 최종 동의를 확인해 주세요.
            </div>
          )}
          {error && <div className="rounded-md border border-alert-border bg-alert-bg px-3 py-2 text-xs font-semibold text-alert-text">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} disabled={busy} className="inline-flex h-9 items-center rounded-sm border border-slate-200 bg-white px-4 text-sm font-bold text-ink-400 hover:bg-slate-50 disabled:opacity-50">취소</button>
          <button type="button" onClick={submit} disabled={busy || (touched && !valid)}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-brand px-4 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            동의 · 회신 제출
          </button>
        </div>
      </div>
    </div>
  );
}
