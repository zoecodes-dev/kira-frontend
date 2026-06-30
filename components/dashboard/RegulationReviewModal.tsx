'use client';

// 규제 검증 검토 — AI가 낸 판정 결과(판정·대조한 규제 조항·신뢰도·판단 근거)를
// 협력사가 제출한 근거 자료(AI 파싱 뷰)와 '함께' 보여준다.
// "근거 자료의 어느 부분을 규제의 어느 조항과 대조했더니 어떻더라"를 한 화면에서 확인.
import clsx from 'clsx';
import { Scale, ShieldAlert, X, FileText, ArrowLeftRight } from 'lucide-react';
import AiParsingView from '@/components/supplier/AiParsingView';
import type { RegReviewRow } from './RegulationResultsCard';

const VERDICT_META: Record<string, { label: string; cls: string }> = {
  passed: { label: '적합 (통과)', cls: 'border-ok-border bg-ok-bg text-ok-text' },
  warning: { label: '주의 (검토 필요)', cls: 'border-warn-border bg-warn-bg text-warn-text' },
  gray_zone: { label: '회색지대', cls: 'border-info-border bg-info-bg text-info-text' },
  violation: { label: '위반 (차단)', cls: 'border-alert-border bg-alert-bg text-alert-text' },
  reject: { label: '반려', cls: 'border-alert-border bg-alert-bg text-alert-text' },
};

export default function RegulationReviewModal({ row, onClose }: { row: RegReviewRow; onClose: () => void }) {
  const vm = VERDICT_META[row.verdict] ?? { label: row.verdict, cls: 'border-slate-200 bg-slate-50 text-slate-500' };
  const lowConf = row.confidence < 0.85;

  return (
    <div className="fixed inset-0 z-[60] flex bg-black/50 p-4" onClick={onClose}>
      <div className="m-auto flex h-[92vh] w-[96vw] max-w-[1440px] flex-col overflow-hidden rounded-md bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-white px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-brand" />
            <span className="text-sm font-bold text-ink-100">AI 규제 검증 · {row.material}</span>
            <span className="text-xs text-slate-400">· {row.supplier}</span>
          </div>
          <button type="button" onClick={onClose} className="rounded-sm p-1 text-ink-400 hover:bg-slate-100 hover:text-ink-100"><X className="h-4 w-4" /></button>
        </div>

        {/* AI 판정 결과 패널 — 근거 ↔ 규제 조항 대조 */}
        <div className="shrink-0 border-b border-ink-700 bg-slate-50 px-5 py-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_auto_1fr]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">판정</div>
              <span className={clsx('mt-1 inline-flex rounded-full border px-2.5 py-1 text-sm font-bold', vm.cls)}>{vm.label}</span>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">신뢰도</span>
                <span className={clsx('font-mono font-bold', lowConf ? 'text-alert-text' : 'text-ok-text')}>{Math.round(row.confidence * 100)}%</span>
                {lowConf && <span className="inline-flex items-center gap-1 rounded-full border border-warn-border bg-warn-bg px-1.5 py-0.5 text-[11px] font-bold text-warn-text"><ShieldAlert className="h-3 w-3" />HITL</span>}
              </div>
            </div>

            <div className="lg:border-l lg:border-slate-200 lg:pl-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">대조한 규제 조항</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(row.citedClauses.length ? row.citedClauses : [row.regulation]).map(c => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-sm border border-ink-700/30 bg-white px-2 py-1 font-mono text-xs font-semibold text-ink-200">
                    <FileText className="h-3 w-3 text-accent-700" />{c}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:border-l lg:border-slate-200 lg:pl-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <ArrowLeftRight className="h-3 w-3" />AI 판단 근거 (근거 자료 ↔ 조항 대조)
              </div>
              <p className={clsx('mt-1.5 rounded-sm border px-3 py-2 text-sm font-medium leading-relaxed', vm.cls)}>
                {row.reasoning || '판단 근거가 기록되지 않았습니다.'}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">아래 근거 자료(AI 파싱 결과)에서 해당 항목을 확인하고, 위 판정이 타당한지 검토하세요.</p>
            </div>
          </div>
        </div>

        {/* 근거 자료 — AI 파싱 뷰(협력사 제출 자료의 추출 결과) */}
        <div className="min-h-0 flex-1">
          {row.supplierId && <AiParsingView supplierId={row.supplierId} onConfirmComplete={onClose} realOnly mode="oem" />}
        </div>
      </div>
    </div>
  );
}
