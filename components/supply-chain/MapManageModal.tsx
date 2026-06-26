'use client';

// 단계7 — 공급망 맵 최종 생성 확인 + Pool 협력사 인증서/원산지 만료 점검 팝업
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import ModalShell from './ModalShell';
import { getSupplierEsg, type SupplierBrief } from '@/lib/api';

interface ExpiryRow {
  supplier: SupplierBrief;
  expired: number;
  soon: number;
}

/** 만료일 판정: 경과=expired, 90일 이내=soon, 그 외=valid */
function certExpiry(expiresAt: string): 'expired' | 'soon' | 'valid' {
  const due = new Date(expiresAt).getTime();
  if (Number.isNaN(due)) return 'valid';
  const now = Date.now();
  if (due < now) return 'expired';
  if (due < now + 90 * 24 * 60 * 60 * 1000) return 'soon';
  return 'valid';
}

export default function MapManageModal({
  pool,
  onClose,
  onRequestUpdate,
}: {
  pool: SupplierBrief[];
  onClose: () => void;
  onRequestUpdate: (supplier: SupplierBrief) => void;
}) {
  const [rows, setRows] = useState<ExpiryRow[]>([]);
  const [loading, setLoading] = useState(pool.length > 0);
  const [finalConfirmed, setFinalConfirmed] = useState(false);

  useEffect(() => {
    if (pool.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await Promise.all(
        pool.map(async supplier => {
          try {
            const esg = await getSupplierEsg(supplier.supplierId);
            let expired = 0;
            let soon = 0;
            esg.certifications.forEach(c => {
              const exp = certExpiry(c.expiresAt);
              if (exp === 'expired') expired += 1;
              else if (exp === 'soon') soon += 1;
            });
            return { supplier, expired, soon } as ExpiryRow;
          } catch {
            return { supplier, expired: 0, soon: 0 } as ExpiryRow;
          }
        }),
      );
      if (!cancelled) {
        setRows(result);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pool]);

  const flagged = rows.filter(r => r.expired > 0 || r.soon > 0);

  return (
    <ModalShell
      title="공급망 맵 관리 · 만료 확인"
      subtitle="맵 최종 생성을 확인하고 Pool 협력사의 인증서/원산지 만료 여부를 점검합니다."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-300">
            <input type="checkbox" checked={finalConfirmed} onChange={e => setFinalConfirmed(e.target.checked)} className="h-4 w-4 accent-brand" />
            공급망 맵 최종 생성을 확인했습니다.
          </label>
          <button
            type="button"
            onClick={onClose}
            disabled={!finalConfirmed}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            확인 완료
          </button>
        </div>
      }
    >
      <section className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-center">
          <div className="text-xs font-semibold text-slate-500">Pool 협력사</div>
          <div className="num-mono mt-1 text-2xl font-bold text-ink-100">{pool.length}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-center">
          <div className="text-xs font-semibold text-slate-500">만료 / 임박 협력사</div>
          <div className="num-mono mt-1 text-2xl font-bold text-warn-text">{flagged.length}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-center">
          <div className="text-xs font-semibold text-slate-500">최종 확인</div>
          <div className={clsx('mt-1 text-2xl font-bold', finalConfirmed ? 'text-ok-text' : 'text-slate-400')}>
            {finalConfirmed ? '완료' : '대기'}
          </div>
        </div>
      </section>

      <div className="mb-2 text-sm font-bold text-ink-100">인증서 / 원산지 만료 점검</div>
      {pool.length === 0 ? (
        <div className="rounded-md border border-dashed border-warn-border bg-warn-bg px-3 py-6 text-center text-sm text-warn-text">
          먼저 협력사 Pool을 구성하세요.
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div className="text-sm font-semibold">만료 정보를 점검하는 중…</div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => {
            const hasIssue = r.expired > 0 || r.soon > 0;
            return (
              <div key={r.supplier.supplierId} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink-100">{r.supplier.companyName}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                    {r.expired > 0 && <span className="rounded-full border border-alert-border bg-alert-bg px-1.5 py-0.5 font-bold text-alert-text">만료 {r.expired}</span>}
                    {r.soon > 0 && <span className="rounded-full border border-warn-border bg-warn-bg px-1.5 py-0.5 font-bold text-warn-text">임박 {r.soon}</span>}
                    {!hasIssue && <span className="text-slate-400">유효</span>}
                  </div>
                </div>
                {hasIssue && (
                  <button
                    type="button"
                    onClick={() => onRequestUpdate(r.supplier)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-brand bg-white px-3 py-1.5 text-xs font-semibold text-brand hover:bg-ok-bg"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    자료 업데이트 요청
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
}
