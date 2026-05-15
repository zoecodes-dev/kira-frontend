'use client';

import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import { batchesInProgress, AgentStage } from '@/lib/data';
import { Clock, AlertCircle, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const stages = [
  { key: 'supervisor',   label: '지혜',   model: 'Coordinator' },
  { key: 'extraction',   label: '은진',   model: 'Gateway' },
  { key: 'verification', label: '은진',   model: 'Verifier' },
  { key: 'geo-analysis', label: '영수',   model: 'Geo Audit' },
  { key: 'compliance',   label: '은지',   model: 'Analyst' },
  { key: 'readiness',    label: '차윤',   model: 'Readiness' },
  { key: 'hitl-wait',    label: 'HITL',   model: 'Human' },
  { key: 'action',       label: '차윤',   model: 'Controller' },
];

function stageIndex(stage: AgentStage): number {
  if (stage === 'completed') return stages.length;
  if (stage === 'rejected') return -1;
  if (stage === 'queued') return 0;
  return stages.findIndex(s => s.key === stage);
}

export default function QueuePage() {
  return (
    <>
      <PageHeader 
        title="검증 대기열"
        description="LangGraph 워크플로우 진행 상황 · 각 배치가 어느 에이전트 단계에 있는지 추적"
        badge="실시간"
      />

      <div className="p-8 space-y-6">
        {/* 단계별 통계 */}
        <div className="grid grid-cols-4 gap-4">
          <SummaryTile 
            label="처리 중" 
            count={batchesInProgress.filter(b => !['completed', 'rejected', 'hitl-wait'].includes(b.currentStage)).length}
            icon={Clock}
            tone="info"
          />
          <SummaryTile 
            label="HITL 대기" 
            count={batchesInProgress.filter(b => b.currentStage === 'hitl-wait').length}
            icon={AlertCircle}
            tone="warn"
          />
          <SummaryTile 
            label="완료" 
            count={batchesInProgress.filter(b => b.currentStage === 'completed').length}
            icon={CheckCircle2}
            tone="ok"
          />
          <SummaryTile 
            label="반려" 
            count={batchesInProgress.filter(b => b.currentStage === 'rejected').length}
            icon={XCircle}
            tone="alert"
          />
        </div>

        {/* 진행 상황 카드들 */}
        <div className="space-y-3">
          {batchesInProgress.map(batch => (
            <BatchProgressCard key={batch.id} batch={batch} />
          ))}
        </div>
      </div>
    </>
  );
}

function SummaryTile({ label, count, icon: Icon, tone }: any) {
  const styles: any = {
    info:  { border: 'border-blue-700/30',    bg: 'bg-blue-500/5',    text: 'text-blue-400' },
    warn:  { border: 'border-amber-700/30',   bg: 'bg-amber-500/5',   text: 'text-amber-400' },
    ok:    { border: 'border-emerald-700/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400' },
    alert: { border: 'border-red-700/30',     bg: 'bg-red-500/5',     text: 'text-red-400' },
  };
  const s = styles[tone];
  
  return (
    <div className={`rounded-sm border ${s.border} ${s.bg} p-4 flex items-center justify-between`}>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-1">{label}</div>
        <div className={`text-3xl font-semibold num-mono ${s.text}`}>{count}</div>
      </div>
      <Icon className={`w-6 h-6 ${s.text} opacity-50`} strokeWidth={1.5} />
    </div>
  );
}

function BatchProgressCard({ batch }: { batch: any }) {
  const currentIdx = stageIndex(batch.currentStage);
  const isRejected = batch.currentStage === 'rejected';
  const isCompleted = batch.currentStage === 'completed';
  const isWaiting = batch.currentStage === 'hitl-wait';

  return (
    <div className={clsx(
      'rounded-sm border p-5',
      isRejected ? 'border-red-700/40 bg-red-500/5' :
      isCompleted ? 'border-emerald-700/40 bg-emerald-500/5' :
      isWaiting ? 'border-amber-700/40 bg-amber-500/5' :
      'border-ink-700 bg-ink-800/40'
    )}>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-ink-50 num-mono">{batch.batchId}</span>
            <Badge tone="neutral">→ {batch.destination}</Badge>
            {batch.agentModel && <Badge tone="info">{batch.agentModel}</Badge>}
          </div>
          <div className="text-xs text-ink-400">
            {batch.supplier} <span className="divider-dot" />
            <span className="num-mono">접수 {batch.receivedAt.slice(11)}</span>
            {batch.confidence !== undefined && (
              <>
                <span className="divider-dot" />
                <span className="num-mono">신뢰도 {batch.confidence}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          {isRejected && <Badge tone="alert" dot>반려</Badge>}
          {isCompleted && <Badge tone="ok" dot>완료</Badge>}
          {isWaiting && <Badge tone="warn" dot>HITL 대기</Badge>}
          {!isRejected && !isCompleted && !isWaiting && <Badge tone="info" dot>처리 중</Badge>}
        </div>
      </div>

      {/* 진행 단계 표시 */}
      <div className="flex items-center gap-1">
        {stages.map((stage, idx) => {
          const isPast = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;
          
          return (
            <div key={stage.key} className="flex items-center flex-1">
              <div className="flex-1">
                <div className={clsx(
                  'h-1.5 rounded-xs transition-all',
                  isRejected && idx <= currentIdx + 1 ? 'bg-red-500/60' :
                  isPast ? 'bg-accent-500' :
                  isCurrent ? 'bg-accent-400 pulse-soft' :
                  'bg-ink-700'
                )} />
                <div className="mt-2">
                  <div className={clsx(
                    'text-[10px] font-medium',
                    isCurrent ? 'text-accent-300' :
                    isPast ? 'text-ink-200' :
                    'text-ink-500'
                  )}>
                    {stage.label}
                  </div>
                  <div className="text-[9px] text-ink-500 num-mono">{stage.model}</div>
                </div>
              </div>
              {idx < stages.length - 1 && (
                <ChevronRight className={clsx(
                  'w-3 h-3 mx-0.5 shrink-0',
                  isPast ? 'text-accent-500' : 'text-ink-600'
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* 위반/대기 사유 (해당 시) */}
      {isRejected && (
        <div className="mt-4 pt-4 border-t border-red-700/30">
          <div className="text-[11px] text-red-300 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">UFLPA §3(a)(1) 위반 감지</span> · 
              Geo-Analysis 에이전트가 3차 광산 좌표를 신장 폴리곤 내부로 판정.
              MES 출고 잠금 트리거, 협력사 통지 메일 초안 생성됨.
            </div>
          </div>
        </div>
      )}
      {isWaiting && (
        <div className="mt-4 pt-4 border-t border-amber-700/30">
          <div className="text-[11px] text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div>
              Compliance 에이전트 신뢰도 0.74 — 임계치 0.85 미만으로 HITL 검토 요청. 
              ESG팀장의 승인 또는 반려가 필요합니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
