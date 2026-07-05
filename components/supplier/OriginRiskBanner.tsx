'use client';

import type { OriginCheckResult } from '@/lib/api';

/**
 * 원산지 UFLPA 규제 판정 배너 (공통).
 *
 * - 위반(violation)/주의(warning)일 때만 배너를 렌더한다. 통과·미판정은 null.
 * - 'loading'이면 "원산지 규제 확인 중…" 텍스트만 표시.
 * - RAG로 대조한 규제 조항(citedClauses)과 AI 신뢰도(confidence)를 함께 노출한다.
 *
 * 재사용처:
 *   1) SupplierGeneralReview(공장정보 테이블) — 국가/지역 직접 입력 실시간 판정
 *   2) AiParsingView(원산지 증명서 파싱) — 파싱된 원산지로 판정
 */
export default function OriginRiskBanner({
  result,
}: {
  result: OriginCheckResult | 'loading' | null | undefined;
}) {
  if (result === 'loading') {
    return <span className="text-xs text-ink-500">원산지 규제 확인 중…</span>;
  }
  if (!result) return null;

  const show = result.isViolated || result.severity === 'warning';
  if (!show) return null;

  const violated = result.isViolated;
  const clauses = result.citedClauses ?? [];

  return (
    <div
      className={`flex items-start gap-2 rounded-xs border px-3 py-2 text-xs ${
        violated
          ? 'border-alert-border bg-alert-bg text-alert-text'
          : 'border-warn-border bg-warn-bg text-warn-text'
      }`}
    >
      <span className="shrink-0 font-bold">⚠</span>
      <div className="min-w-0 space-y-1.5">
        <div>
          <span className="font-bold">
            {violated ? '규제 위반 의심' : '주의'} · {result.regulationName}
          </span>
          <span> — {result.reason}</span>
        </div>

        {/* RAG 근거 — AI가 대조한 규제 조항 */}
        {clauses.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">
              AI 근거 · 대조한 규제 조항 {clauses.length}건
            </div>
            <ul className="space-y-1">
              {clauses.map((c, i) => (
                <li key={i} className="leading-snug">
                  {c.citation && <span className="font-mono font-semibold">{c.citation}</span>}
                  {c.citation && c.content && <span> — </span>}
                  {c.content && <span className="opacity-90">{c.content}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {typeof result.confidence === 'number' && result.confidence > 0 && (
          <div className="text-[10px] font-semibold opacity-70">
            AI 신뢰도 {Math.round(result.confidence * 100)}%
          </div>
        )}
      </div>
    </div>
  );
}
