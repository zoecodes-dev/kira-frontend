'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import { auditTrail as sampleAuditTrail, AuditEntry } from '@/lib/data';
import { Search, Bot, Wrench, User, ChevronDown, ChevronRight, Hash, Clock } from 'lucide-react';
import clsx from 'clsx';

export default function AuditPage() {
  const [expandedStep, setExpandedStep] = useState<number | null>(7);

  return (
    <>
      <PageHeader 
        title="감사 추적"
        description="Provenance 미들웨어가 자동 기록한 의사결정 경로 · 규제 당국 감사 대응용"
        badge="DPP-2026-04982"
      />

      <div className="p-8 space-y-6">
        {/* 검색 바 */}
        <Card>
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-ink-400" />
            <input 
              type="text"
              placeholder="DPP ID 또는 배치 ID로 검색 (예: DPP-2026-04982 또는 LOT-MIN-240514-D)"
              defaultValue="LOT-MIN-240514-D"
              className="flex-1 bg-transparent text-sm text-ink-100 placeholder:text-ink-500 outline-none num-mono"
            />
            <button className="px-3 py-1.5 rounded-xs bg-accent-700/20 border border-accent-700/30 text-accent-300 text-xs font-medium hover:bg-accent-700/30 transition-colors">
              조회
            </button>
          </div>
        </Card>

        {/* 조회 결과 요약 */}
        <div className="grid grid-cols-4 gap-4">
          <SummaryStat label="총 단계 수" value="9" unit="steps" />
          <SummaryStat label="총 소요 시간" value="18.3" unit="초" />
          <SummaryStat label="LLM 호출" value="5" unit="회" />
          <SummaryStat label="툴 호출" value="3" unit="회" />
        </div>

        {/* 의사결정 경로 */}
        <Card 
          title="의사결정 경로 (Provenance Chain)"
          subtitle="LOT-MIN-240514-D · Xinjiang Mineral Resources · UFLPA 위반 판정"
          action={
            <div className="flex items-center gap-2 text-[11px] text-ink-400 num-mono">
              <Hash className="w-3 h-3" />
              chain_root: a3f8b2c91d
            </div>
          }
        >
          <div className="space-y-2">
            {sampleAuditTrail.map(entry => (
              <AuditEntryRow 
                key={entry.step}
                entry={entry}
                expanded={expandedStep === entry.step}
                onToggle={() => setExpandedStep(expandedStep === entry.step ? null : entry.step)}
              />
            ))}
          </div>

          {/* 최종 결과 */}
          <div className="mt-6 pt-5 border-t border-ink-700">
            <div className="rounded-xs border border-red-700/40 bg-red-500/5 p-4">
              <div className="flex items-start gap-3">
                <Badge tone="alert" dot>최종 판정: 반려</Badge>
              </div>
              <div className="mt-3 text-xs text-ink-200 leading-relaxed">
                본 배치는 UFLPA §3(a)(1) 강제노동 추정 규정에 따라 반려 처리되었습니다.
                Geo-Analysis 에이전트가 3차 광산 좌표 [87.6177, 43.7928]을 신장 위구르 자치구 폴리곤
                내부로 판정하였으며, Compliance 에이전트가 CBP 가이던스 2024에 의거 위반으로 결정했습니다.
                MES 출고 잠금이 트리거되었고, 협력사 통지 메일이 ESG팀장 승인 대기 상태입니다.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function SummaryStat({ label, value, unit }: any) {
  return (
    <div className="rounded-sm border border-ink-700 bg-ink-800/40 p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold num-mono text-ink-50">{value}</span>
        <span className="text-xs text-ink-400">{unit}</span>
      </div>
    </div>
  );
}

function AuditEntryRow({ entry, expanded, onToggle }: { entry: AuditEntry; expanded: boolean; onToggle: () => void }) {
  const typeStyles = {
    agent: { icon: Bot,    bg: 'bg-accent-700/20', text: 'text-accent-300', border: 'border-accent-700/40' },
    tool:  { icon: Wrench, bg: 'bg-blue-700/20',   text: 'text-blue-300',   border: 'border-blue-700/40' },
    human: { icon: User,   bg: 'bg-amber-700/20',  text: 'text-amber-300',  border: 'border-amber-700/40' },
  };
  const style = typeStyles[entry.nodeType];
  const Icon = style.icon;

  return (
    <div className={clsx('rounded-xs border transition-colors', 
      expanded ? `${style.border} bg-ink-800/40` : 'border-ink-700/60'
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-ink-800/60 transition-colors text-left"
      >
        {/* 스텝 넘버 */}
        <div className="w-7 h-7 rounded-xs bg-ink-700 flex items-center justify-center shrink-0">
          <span className="text-xs num-mono font-semibold text-ink-300">{entry.step}</span>
        </div>

        {/* 아이콘 */}
        <div className={`w-8 h-8 rounded-xs ${style.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${style.text}`} strokeWidth={1.8} />
        </div>

        {/* 노드명 + 결정 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink-100">{entry.nodeName}</span>
            {entry.model && (
              <span className="text-[10px] num-mono px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-400">
                {entry.model}
              </span>
            )}
            {entry.promptVersion && (
              <span className="text-[10px] num-mono text-ink-500">@ {entry.promptVersion}</span>
            )}
          </div>
          {entry.decision && (
            <div className="text-[11px] text-ink-400 mt-0.5 truncate">{entry.decision}</div>
          )}
        </div>

        {/* 소요 시간 */}
        <div className="shrink-0 text-right">
          <div className="text-[10px] text-ink-500 num-mono">{entry.timestamp.slice(11)}</div>
          <div className="text-[11px] text-ink-400 num-mono flex items-center gap-1 justify-end">
            <Clock className="w-2.5 h-2.5" />
            {entry.durationMs}ms
          </div>
        </div>

        {expanded
          ? <ChevronDown className="w-4 h-4 text-ink-400 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-ink-400 shrink-0" />
        }
      </button>

      {/* 확장 영역 */}
      {expanded && (
        <div className="border-t border-ink-700/60 px-3 py-3 bg-ink-900/40">
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <KV label="입력 해시" value={entry.inputHash} mono />
            <KV label="출력 해시" value={entry.outputHash} mono />
            <KV label="타임스탬프" value={entry.timestamp} mono />
            <KV label="소요 시간" value={`${entry.durationMs} ms`} mono />
          </div>

          {entry.decision && (
            <div className="mt-3 pt-3 border-t border-ink-700/60">
              <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-1">의사결정 내용</div>
              <div className="text-xs text-ink-200">{entry.decision}</div>
            </div>
          )}

          {entry.citations && entry.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-ink-700/60">
              <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">인용 근거</div>
              <div className="flex flex-wrap gap-1.5">
                {entry.citations.map(c => (
                  <span key={c} className="text-[10px] num-mono px-2 py-0.5 rounded-xs bg-ink-700 text-ink-300 border border-ink-600">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KV({ label, value, mono }: any) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-0.5">{label}</div>
      <div className={`text-xs text-ink-200 ${mono ? 'num-mono' : ''}`}>{value}</div>
    </div>
  );
}
