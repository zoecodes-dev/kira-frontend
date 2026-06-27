'use client';

// STEP 4 — 최종 검증. 환경성적서(탄소발자국, EU 배터리법 Art7)를 핵심으로, 인증서 만료를 보조로
// 연결 협력사의 실데이터를 가져와 검증한다.
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Leaf, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import ModalShell from './ModalShell';
import { getSupplierCarbonDeclarations, getSupplierEsg, type CarbonDeclaration, type SupplierBrief } from '@/lib/api';

type EpdStatus = 'verified' | 'declared' | 'expired' | 'missing';

interface VerifyRow {
  supplier: SupplierBrief;
  epd: EpdStatus;
  carbonIntensity: number | null;
  expired: number; // 인증서 만료 건수
  soon: number;    // 인증서 임박 건수
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

/** 환경성적서(탄소) 상태: 미제출 / 만료 / 자기선언 / 제3자검증완료 */
function epdStatusOf(decls: CarbonDeclaration[]): EpdStatus {
  if (decls.length === 0) return 'missing';
  const now = Date.now();
  const valid = decls.filter(d => !d.validTo || new Date(d.validTo).getTime() >= now);
  if (valid.length === 0) return 'expired';
  if (valid.some(d => d.source === 'third_party_verified')) return 'verified';
  return 'declared';
}

const EPD_META: Record<EpdStatus, { label: string; cls: string; pass: boolean }> = {
  verified: { label: '검증완료', cls: 'border-ok-border bg-ok-bg text-ok-text', pass: true },
  declared: { label: '자기선언', cls: 'border-warn-border bg-warn-bg text-warn-text', pass: true },
  expired:  { label: '만료',     cls: 'border-alert-border bg-alert-bg text-alert-text', pass: false },
  missing:  { label: '미제출',   cls: 'border-alert-border bg-alert-bg text-alert-text', pass: false },
};

export default function MapManageModal({
  pool,
  onClose,
  onRequestUpdate,
}: {
  pool: SupplierBrief[];
  onClose: () => void;
  onRequestUpdate: (supplier: SupplierBrief) => void;
}) {
  const [rows, setRows] = useState<VerifyRow[]>([]);
  const [loading, setLoading] = useState(pool.length > 0);
  const [finalConfirmed, setFinalConfirmed] = useState(false);

  useEffect(() => {
    if (pool.length === 0) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await Promise.all(
        pool.map(async supplier => {
          // 환경성적서(핵심) + 인증서 만료(보조) 실데이터 동시 조회.
          const [carbonRes, esgRes] = await Promise.all([
            getSupplierCarbonDeclarations(supplier.supplierId).catch(() => null),
            getSupplierEsg(supplier.supplierId).catch(() => null),
          ]);
          const decls = carbonRes?.declarations ?? [];
          const epd = epdStatusOf(decls);
          const carbonIntensity = decls[0]?.carbonIntensity ?? null;
          let expired = 0, soon = 0;
          (esgRes?.certifications ?? []).forEach(c => {
            const exp = certExpiry(c.expiresAt);
            if (exp === 'expired') expired += 1;
            else if (exp === 'soon') soon += 1;
          });
          return { supplier, epd, carbonIntensity, expired, soon } as VerifyRow;
        }),
      );
      if (!cancelled) { setRows(result); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [pool]);

  const epdFailed = rows.filter(r => !EPD_META[r.epd].pass);   // 환경성적서 미제출/만료 = 검증 실패(핵심)
  const allPass = rows.length > 0 && epdFailed.length === 0;

  return (
    <ModalShell
      title="최종 검증 · 환경성적서(탄소발자국)"
      subtitle="연결 협력사의 환경성적서(EU 배터리법 Art7 탄소발자국)를 핵심으로, 인증서 만료를 보조로 실데이터를 검증합니다."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-300">
            <input type="checkbox" checked={finalConfirmed} onChange={e => setFinalConfirmed(e.target.checked)} className="h-4 w-4 accent-brand" />
            검증 결과를 확인했습니다.
          </label>
          <button
            type="button"
            onClick={onClose}
            disabled={!finalConfirmed}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            검증 완료
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
          <div className="text-xs font-semibold text-slate-500">환경성적서 미비</div>
          <div className={clsx('num-mono mt-1 text-2xl font-bold', epdFailed.length > 0 ? 'text-alert-text' : 'text-ok-text')}>{epdFailed.length}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-center">
          <div className="text-xs font-semibold text-slate-500">검증 결과</div>
          <div className={clsx('mt-1 text-2xl font-bold', loading ? 'text-slate-400' : allPass ? 'text-ok-text' : 'text-alert-text')}>
            {loading ? '검증 중' : allPass ? '통과' : '실패'}
          </div>
        </div>
      </section>

      <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink-100">
        <Leaf className="h-4 w-4 text-ok-text" />
        환경성적서(탄소발자국) 검증 · 협력사별
      </div>
      {pool.length === 0 ? (
        <div className="rounded-md border border-dashed border-warn-border bg-warn-bg px-3 py-6 text-center text-sm text-warn-text">
          먼저 협력사 Pool을 구성하세요.
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div className="text-sm font-semibold">실데이터(환경성적서·인증서)를 가져오는 중…</div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => {
            const meta = EPD_META[r.epd];
            const certIssue = r.expired > 0 || r.soon > 0;
            const needsRequest = !meta.pass || certIssue;
            return (
              <div key={r.supplier.supplierId} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink-100">{r.supplier.companyName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={clsx('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-bold', meta.cls)}>
                      {meta.pass ? <ShieldCheck className="h-3 w-3" /> : <Leaf className="h-3 w-3" />}
                      환경성적서 {meta.label}
                    </span>
                    {r.carbonIntensity != null && (
                      <span className="text-slate-500">{r.carbonIntensity} kgCO₂e/kWh</span>
                    )}
                    {r.expired > 0 && <span className="rounded-full border border-alert-border bg-alert-bg px-1.5 py-0.5 font-bold text-alert-text">인증서 만료 {r.expired}</span>}
                    {r.soon > 0 && <span className="rounded-full border border-warn-border bg-warn-bg px-1.5 py-0.5 font-bold text-warn-text">인증서 임박 {r.soon}</span>}
                  </div>
                </div>
                {needsRequest && (
                  <button
                    type="button"
                    onClick={() => onRequestUpdate(r.supplier)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-brand bg-white px-3 py-1.5 text-xs font-semibold text-brand hover:bg-ok-bg"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    자료 요청
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
