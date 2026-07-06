'use client';

// 제3자 정보제공 동의서 = 데이터 계약(Data Contract) — 발송 / 이력 / 회신 양식 확인.
// 원청이 협력사에 동의서를 발송하고, 회신(서명) 상태와 받은 양식 데이터를 확인한다.
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, FileSignature, Loader2, X } from 'lucide-react';
import { getDataConsents, type DataConsent, type SupplierBrief } from '@/lib/api';
import { PURPOSE_LABEL, SCOPE_LABEL } from '@/lib/consent-clauses';
import ConsentReplyForm from './ConsentReplyForm';
import ConsentDetailView from './ConsentDetailView';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  requested: { label: '발송됨', cls: 'border-info-border bg-info-bg text-info-text' },
  returned:  { label: '회신',   cls: 'border-info-border bg-info-bg text-info-text' },
  agreed:    { label: '동의완료', cls: 'border-ok-border bg-ok-bg text-ok-text' },
  rejected:  { label: '거절',   cls: 'border-alert-border bg-alert-bg text-alert-text' },
  revoked:   { label: '철회',   cls: 'border-alert-border bg-alert-bg text-alert-text' },
  expired:   { label: '만료',   cls: 'border-warn-border bg-warn-bg text-warn-text' },
};

export default function DataConsentModal({ supplier, onClose }: { supplier: SupplierBrief; onClose: () => void }) {
  const [consents, setConsents] = useState<DataConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTarget, setReplyTarget] = useState<DataConsent | null>(null);
  const [viewTarget, setViewTarget] = useState<DataConsent | null>(null);

  async function load() {
    setLoading(true);
    try { setConsents(await getDataConsents(supplier.supplierId)); }
    catch { setConsents([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [supplier.supplierId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 px-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-sm border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.2)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-ink-100"><FileSignature className="h-4 w-4 text-brand" />제3자 정보제공 동의서 · 데이터 계약</div>
            <p className="mt-1 text-sm text-slate-500">{supplier.companyName} — 동의서 발송 / 회신·서명 / 이력. Catena-X 데이터 계약 관점으로 DB에 보존됩니다.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-100" aria-label="닫기"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">
          <span className="text-xs font-bold text-ink-400">계약 이력 {consents.length}건</span>
          <span className="text-[11px] font-medium text-slate-500">발송은 "정보 입력 요청 메일 · 동의서"에서</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm font-semibold">불러오는 중…</span></div>
          ) : consents.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500">발송된 동의서가 없습니다. 상단 "정보 입력 요청 메일 · 동의서"에서 발송하면 여기에 이력이 쌓입니다.</div>
          ) : (
            <ul className="space-y-2.5">
              {consents.map(c => {
                const sm = STATUS_META[c.status] ?? { label: c.status, cls: 'border-slate-200 bg-slate-50 text-slate-500' };
                return (
                  <li key={c.consentId} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={clsx('rounded-full border px-2 py-0.5 text-xs font-bold', sm.cls)}>{sm.label}</span>
                        <span className="text-sm font-bold text-ink-100">{PURPOSE_LABEL[c.purpose] ?? c.purpose}</span>
                        {c.thirdPartySharing && <span className="rounded-sm bg-warn-bg px-1.5 py-0.5 text-[11px] font-bold text-warn-text">제3자 재공유</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setViewTarget(c)}
                          className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-ink-400 hover:bg-slate-50">
                          <FileSignature className="h-3.5 w-3.5" /> {c.formData ? '양식 보기' : '발송 내용 보기'}
                        </button>
                        {c.status !== 'agreed' && c.status !== 'revoked' && (
                          <button type="button" onClick={() => setReplyTarget(c)}
                            className="inline-flex items-center gap-1.5 rounded-sm border border-ok-border bg-white px-2.5 py-1 text-xs font-bold text-ok-text hover:bg-ok-bg">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 회신·동의 처리
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                      {c.dataScope.map(s => <span key={s} className="rounded-sm bg-slate-100 px-1.5 py-0.5 font-semibold text-ink-400">{SCOPE_LABEL[s] ?? s}</span>)}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>유효기간: {c.validFrom ?? '-'} ~ {c.validTo ?? '-'}</span>
                      <span>재공유 대상: {(c.allowedRecipients ?? []).join(', ') || '-'}</span>
                      <span>발송: {c.requestedAt?.slice(0, 10) ?? '-'} · 동의: {c.agreedAt?.slice(0, 10) ?? '-'}</span>
                      <span>서명자: {c.signerName ?? '-'} {c.signerTitle ?? ''}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {replyTarget && (
        <ConsentReplyForm
          consent={replyTarget}
          companyName={supplier.companyName}
          onClose={() => setReplyTarget(null)}
          onDone={() => { setReplyTarget(null); load(); }}
        />
      )}

      {viewTarget && (
        <ConsentDetailView
          consent={viewTarget}
          companyName={supplier.companyName}
          statusLabel={(STATUS_META[viewTarget.status] ?? { label: viewTarget.status }).label}
          statusClassName={(STATUS_META[viewTarget.status] ?? { cls: 'border-slate-200 bg-slate-50 text-slate-500' }).cls}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}
