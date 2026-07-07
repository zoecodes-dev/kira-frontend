'use client';

// 공급망 맵 '평가 리포트' 카드 — 배치 파이프라인 종합판정(batch_final_judgment) 문구를
// 공급망 맵/PageContent에서 공통으로 렌더한다. 문구 SSOT는 백엔드(agents/final_judgment.py).
import { AlertTriangle, CheckCircle2, ClipboardCheck, XCircle } from 'lucide-react';
import type { EvaluationVerdict, SupplyChainEvaluation } from '@/lib/api';

// 판정(verdict) → 라벨/색조/아이콘. Excel 문구에서도 재사용하도록 라벨을 export.
export const VERDICT_META: Record<EvaluationVerdict, {
  label: string;
  badgeCls: string;
  cardCls: string;
  Icon: typeof CheckCircle2;
  iconCls: string;
}> = {
  pass: {
    label: '적합 (pass)',
    badgeCls: 'border-ok-border bg-ok-bg text-ok-text',
    cardCls: 'border-ok-border bg-ok-bg/40',
    Icon: CheckCircle2,
    iconCls: 'text-ok-text',
  },
  conditional: {
    label: '조건부 (conditional)',
    badgeCls: 'border-warn-border bg-warn-bg text-warn-text',
    cardCls: 'border-warn-border bg-warn-bg/40',
    Icon: AlertTriangle,
    iconCls: 'text-warn-text',
  },
  fail: {
    label: '부적합 (fail)',
    badgeCls: 'border-red-300 bg-red-50 text-red-800',
    cardCls: 'border-red-300 bg-red-50/60',
    Icon: XCircle,
    iconCls: 'text-red-600',
  },
};

// 리포트 → 엑셀/CSV에 넣을 텍스트 라인들(순서 유지). 맵 화면과 동일 문구를 파일에도 담기 위해 공유.
export function evaluationTextLines(report: SupplyChainEvaluation): string[] {
  if (!report.available) return [];
  const verdict = report.overallVerdict ? VERDICT_META[report.overallVerdict].label : '-';
  const lines = [
    `[공급망 맵 평가 리포트] 종합 판정: ${verdict}`,
  ];
  if (report.executiveSummary) lines.push(`판정 요약: ${report.executiveSummary}`);
  if (report.keyRisks.length) lines.push(`핵심 리스크: ${report.keyRisks.join(' · ')}`);
  if (report.recommendedAction) lines.push(`권고 조치: ${report.recommendedAction}`);
  return lines;
}

export default function EvaluationReportCard({
  report,
  className = '',
}: {
  report: SupplyChainEvaluation | null;
  className?: string;
}) {
  // 판정 문구가 아직 없으면(파이프라인 미완/데모) 카드 자체를 숨긴다.
  if (!report || !report.available || !report.overallVerdict) return null;
  const meta = VERDICT_META[report.overallVerdict];
  const { Icon } = meta;

  return (
    <section className={`rounded-md border p-4 ${meta.cardCls} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.iconCls}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-ink-100">공급망 맵 평가 리포트</span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${meta.badgeCls}`}>
              {meta.label}
            </span>
          </div>

          {report.executiveSummary && (
            <p className="mt-2 text-sm leading-relaxed text-ink-200">{report.executiveSummary}</p>
          )}

          {report.keyRisks.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {report.keyRisks.map((risk, i) => (
                <li
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-300"
                >
                  <AlertTriangle className="h-3 w-3 text-warn-text" />
                  {risk}
                </li>
              ))}
            </ul>
          )}

          {report.recommendedAction && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-ink-400">
              <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500" />
              <span><span className="font-bold text-ink-300">권고 조치</span> · {report.recommendedAction}</span>
            </div>
          )}

          <div className="mt-2 text-[11px] text-slate-400">
            {report.confidence != null && <>신뢰도 {Math.round(report.confidence * 100)}%</>}
            {report.confidence != null && report.createdAt && ' · '}
            {report.createdAt && <>판정일 {report.createdAt.slice(0, 10)}</>}
          </div>
        </div>
      </div>
    </section>
  );
}
