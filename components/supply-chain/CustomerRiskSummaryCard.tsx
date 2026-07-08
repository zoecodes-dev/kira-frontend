'use client';

// 고객사 전송용 다국어 리스크 요약 미리보기 — 이 맵(제품+BOM버전)의 협력사로만 집계.
// 최종 검증에서 고객사에 보낼 내용을 실제 전송 전에 언어별로 확인하는 카드.
import { useEffect, useState } from 'react';
import { Globe2, Loader2 } from 'lucide-react';
import { getOutboundRiskSummary, type OutboundRiskSummary } from '@/lib/api';

const LOCALE_LABEL: Record<string, string> = { ko: '한국어', en: 'English', de: 'Deutsch' };

export default function CustomerRiskSummaryCard({
  productId,
  customerId,
  bomVersionId,
  className = '',
}: {
  productId?: string;
  customerId?: string;
  bomVersionId?: string;
  className?: string;
}) {
  const [summary, setSummary] = useState<OutboundRiskSummary | null>(null);
  const [locale, setLocale] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId || !customerId) { setSummary(null); return; }
    let cancelled = false;
    setLoading(true);
    getOutboundRiskSummary(productId, customerId, bomVersionId)
      .then(s => { if (!cancelled) { setSummary(s); setLocale(s.locales[0] ?? null); } })
      .catch(() => { if (!cancelled) setSummary(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId, customerId, bomVersionId]);

  if (!customerId) return null;
  if (loading) {
    return (
      <section className={`flex items-center gap-2 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        고객사 전송용 요약 생성 중…
      </section>
    );
  }
  if (!summary) return null;

  const render = summary.renders.find(r => r.locale === locale) ?? summary.renders[0];
  if (!render) return null;

  return (
    <section className={`rounded-md border border-slate-200 bg-white p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-brand" />
          <span className="text-sm font-bold text-ink-100">고객사 전송용 요약</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            {summary.customer.customerName}
          </span>
        </div>
        {summary.locales.length > 1 && (
          <div className="flex gap-1">
            {summary.locales.map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocale(loc)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                  loc === locale
                    ? 'border-brand bg-brand text-white'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-brand hover:text-brand'
                }`}
              >
                {LOCALE_LABEL[loc] ?? loc.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {summary.note && (
        <p className="mt-2 rounded-xs border border-warn-border bg-warn-bg px-2.5 py-1.5 text-xs text-warn-text">
          {summary.note}
        </p>
      )}

      <h4 className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">{render.sectionTitle}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-200">{render.summaryText}</p>

      {render.keyPoints.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {render.keyPoints.map((point, i) => (
            <li
              key={i}
              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-ink-300"
            >
              {point}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
