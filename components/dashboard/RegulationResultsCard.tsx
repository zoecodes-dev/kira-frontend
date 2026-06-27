'use client';

// AI 규제 검증 결과 = AI 파싱 결과(verdict + confidence). 협력사 제출 자료를 AI가 규제별로 판정하고,
// 저신뢰(HITL 후보)는 사람이 검증한다. My Task '협력사 승인(HITL)'에 데이터 추출 검토와 함께 편입.
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ArrowRight, FileText, Scale, ShieldAlert } from 'lucide-react';
import { getRegulationResults } from '@/lib/api';

interface ResultRow { id: string; material: string; supplier: string; supplierId: string | null; regulation: string; verdict: string; confidence: number; clause: string; evidence: string }

const VERDICT_CLS: Record<string, string> = {
  passed: 'border-ok-border bg-ok-bg text-ok-text',
  warning: 'border-warn-border bg-warn-bg text-warn-text',
  gray_zone: 'border-info-border bg-info-bg text-info-text',
  violation: 'border-alert-border bg-alert-bg text-alert-text',
  reject: 'border-alert-border bg-alert-bg text-alert-text',
};

const MOCK: ResultRow[] = [
  { id: 'RR-001', material: 'BMW iX3 Cylindrical NCM811 108Ah', supplier: '한양셀 제조(주)', supplierId: null, regulation: 'EU_BATTERY_ART7', verdict: 'passed', confidence: 0.96, clause: '자동 판정', evidence: '-' },
  { id: 'RR-002', material: 'BMW i4 Prismatic NCM 81Ah', supplier: '대성정밀(주)', supplierId: null, regulation: 'EU_BATTERY', verdict: 'warning', confidence: 0.70, clause: 'HITL 후보 · 사람 검토 필요', evidence: '-' },
];

export default function RegulationResultsCard({ onReview }: { onReview?: (supplierId: string, supplierName: string) => void }) {
  const [rows, setRows] = useState<ResultRow[]>(MOCK);
  useEffect(() => {
    getRegulationResults().then(list => {
      if (list && list.length) setRows(list.map((x, i) => ({
        id: `RR-${String(i + 1).padStart(3, '0')}`,
        material: x.material ?? '자재',
        supplier: x.supplierName ?? '협력사',
        supplierId: x.supplierId,
        regulation: x.regulation ?? '-',
        verdict: x.verdict,
        confidence: x.confidence ?? 0,
        clause: x.needsHumanReview ? 'HITL 후보 · 사람 검토 필요' : '자동 판정',
        evidence: (x.evidence && x.evidence[0]) || '-',
      })));
    }).catch(() => { /* mock 유지 */ });
  }, []);

  const hitl = rows.filter(r => r.confidence < 0.85).length;
  const violation = rows.filter(r => r.verdict === 'violation').length;

  return (
    <section className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 px-5 py-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-bold text-ink-100">AI 규제 검증 결과</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-ink-400">{rows.length}건</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full border border-warn-border bg-warn-bg px-2 py-0.5 font-bold text-warn-text"><ShieldAlert className="h-3 w-3" />HITL 후보 {hitl}</span>
          {violation > 0 && <span className="rounded-full border border-alert-border bg-alert-bg px-2 py-0.5 font-bold text-alert-text">위반 {violation}</span>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-500">
            <tr>{['자재(제품)', '협력사', '규제', '판정', '신뢰도', '근거/증빙', ''].map(h => <th key={h} className="px-4 py-2.5 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-semibold text-ink-100">{r.material}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{r.clause}</div>
                </td>
                <td className="px-4 py-3 text-xs text-ink-400">{r.supplier}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-300">{r.regulation}</td>
                <td className="px-4 py-3">
                  <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-xs font-bold', VERDICT_CLS[r.verdict] ?? 'border-slate-200 bg-slate-50 text-slate-500')}>{r.verdict}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                      <div className={clsx('h-full rounded-full', r.confidence >= 0.85 ? 'bg-ok-solid' : r.confidence >= 0.75 ? 'bg-warn-solid' : 'bg-alert-solid')} style={{ width: `${Math.round(r.confidence * 100)}%` }} />
                    </div>
                    <span className={clsx('font-mono text-xs font-bold', r.confidence < 0.85 ? 'text-alert-text' : 'text-ok-text')}>{Math.round(r.confidence * 100)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink-400"><FileText className="h-3.5 w-3.5 text-accent-700" />{r.evidence}</span>
                </td>
                <td className="px-4 py-3">
                  {r.supplierId && (
                    <button type="button" onClick={() => onReview?.(r.supplierId!, r.supplier)} className="inline-flex items-center gap-1 text-xs font-semibold text-accent-700 hover:text-accent-600">
                      검토 <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-500">신뢰도 85% 미만 · 증빙-입력 불일치 · FEOC/원산지 회색지대는 사람이 최종 판단(HITL).</p>
    </section>
  );
}
