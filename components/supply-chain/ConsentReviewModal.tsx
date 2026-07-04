'use client';

// STEP 4 — 제3자 정보 동의서 수신 확인.
// STEP3에서 발송한 동의서의 회신·서명 수신 여부를 협력사별로 확인한다.
//   · 동의서가 회신(returned/agreed)되면 '수신됨'으로 자동 판정되고, 사용자가 '확인'으로 확정한다(자동+수동 병행).
//   · 한 차수의 협력사를 전부 수신 확인하면 그 하위(n차)가 맵에 노출된다(차수별 점진 노출 게이트).
import { useEffect, useState } from 'react';
import { Check, CheckCircle2, FileSignature, Loader2, Paperclip, X } from 'lucide-react';
import { getDataConsents, type SupplierBrief } from '@/lib/api';
import DataConsentModal from './DataConsentModal';

const PROVIDER_LABEL: Record<string, string> = {
  manufacturer: '제조사',
  recycler: '재활용',
  trader: '유통',
  miner: '광산',
  smelter: '제련소',
};

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

export default function ConsentReviewModal({
  suppliers,
  confirmed,
  onToggleConfirm,
  onConfirmAll,
  onClose,
}: {
  suppliers: SupplierBrief[];
  confirmed: Set<string>;
  onToggleConfirm: (supplierId: string) => void;   // 협력사 수신 확인 토글(= 차수 노출 게이트)
  onConfirmAll: () => void;                          // 지금 노출된 협력사 전부 수신 확인
  onClose: () => void;
}) {
  // 광산은 동의서 대상이 아님(제련소가 데이터 대행 제공) — 수신 확인 대상에서 제외.
  const targets = suppliers.filter(s => s.providerType !== 'miner');
  const [consentSupplier, setConsentSupplier] = useState<SupplierBrief | null>(null);
  // 협력사별 동의서 회신 수신 여부(returned/agreed) — 표시·자동 판정용.
  const [received, setReceived] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ids = targets.map(s => s.supplierId).filter(isUuid);
      const entries = await Promise.all(
        ids.map(async id => {
          const consents = await getDataConsents(id).catch(() => []);
          const isReceived = (consents ?? []).some(c => c.status === 'returned' || c.status === 'agreed');
          return [id, isReceived] as const;
        }),
      );
      if (!cancelled) {
        setReceived(Object.fromEntries(entries));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers]);

  // 수신 확인됨 = 동의서 회신 수신(자동) 또는 사용자가 수동 확인.
  const isDone = (s: SupplierBrief) => received[s.supplierId] || confirmed.has(s.supplierId);
  const doneCount = targets.filter(isDone).length;
  const allDone = targets.length > 0 && doneCount === targets.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-sm border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.2)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-ink-100">
              <FileSignature className="h-4 w-4 text-brand" />제3자 정보 동의서 수신 확인
            </div>
            <p className="mt-1 text-sm text-slate-500">
              STEP3에서 발송한 동의서의 회신·서명 수신 여부를 확인하세요. 한 차수를 전부 확인하면 하위 협력사(n차)가 맵에 노출됩니다.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-100" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">
          <span className="text-xs font-bold text-ink-400">수신 확인 {doneCount} / {targets.length}</span>
          <button
            type="button"
            onClick={onConfirmAll}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-ink-400 hover:border-ok-border hover:text-ok-text"
          >
            <Check className="h-3.5 w-3.5" /> 전체 확인
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {targets.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">동의서 수신 확인 대상 협력사가 없습니다.</div>
          ) : loading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm font-semibold">불러오는 중…</span></div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {targets.map(s => {
                const done = isDone(s);
                const autoReceived = received[s.supplierId];
                return (
                  <li key={s.supplierId} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-ink-100">{s.companyName}</div>
                      <div className="mt-0.5 text-xs font-medium text-slate-500">
                        {PROVIDER_LABEL[s.providerType] ?? s.providerType}
                        {s.riskLevel ? <span className="ml-2 text-slate-400">· 리스크 {s.riskLevel}</span> : null}
                        {autoReceived && <span className="ml-2 font-bold text-ok-text">· 동의서 회신됨</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConsentSupplier(s)}
                        title={autoReceived ? '수신한 동의서 내용 보기' : '동의서 내역 보기'}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs font-bold transition ${
                          autoReceived
                            ? 'border-ok-border bg-ok-bg text-ok-text'
                            : 'border-slate-200 bg-white text-ink-400 hover:border-brand hover:text-brand'
                        }`}
                      >
                        {autoReceived ? <Paperclip className="h-3.5 w-3.5" /> : <FileSignature className="h-3.5 w-3.5" />}
                        {autoReceived ? '동의서' : '내역'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleConfirm(s.supplierId)}
                        title={done ? '수신 확인을 취소합니다' : '이 협력사의 동의서 수신을 확인 처리합니다'}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-xs font-bold transition ${
                          done
                            ? 'border-ok-border bg-ok-bg text-ok-text hover:border-alert-border hover:bg-alert-bg hover:text-alert-text'
                            : 'border-slate-200 bg-white text-ink-400 hover:border-ok-border hover:text-ok-text'
                        }`}
                      >
                        {done ? <X className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {done ? '확인 취소' : '수신 확인'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
          <span className="text-xs font-medium text-slate-500">
            {allDone ? '모든 동의서를 수신 확인했습니다. 자료 수집·보완으로 넘어갈 수 있어요.' : '노출된 협력사를 전부 수신 확인하면 다음 차수·다음 단계가 열립니다.'}
          </span>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-sm bg-ink-100 px-4 text-sm font-bold text-white hover:opacity-90">
            닫기
          </button>
        </div>
      </div>

      {consentSupplier && <DataConsentModal supplier={consentSupplier} onClose={() => setConsentSupplier(null)} />}
    </div>
  );
}
