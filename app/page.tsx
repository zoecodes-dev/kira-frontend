'use client';

import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import { kpis, dailyProcessing, violationsByRegulation, batchesInProgress } from '@/lib/data';
import { 
  Layers, AlertTriangle, CheckCircle2, Clock, Users, ShieldAlert,
  ArrowRight, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell
} from 'recharts';
import Link from 'next/link';

export default function DashboardPage() {
  const inProgressCount = batchesInProgress.filter(
    b => b.currentStage !== 'completed' && b.currentStage !== 'rejected'
  ).length;
  
  const hitlWaiting = batchesInProgress.filter(b => b.currentStage === 'hitl-wait').length;

  return (
    <>
      <PageHeader 
        title="대시보드"
        description="전체 규제 검증 현황 · 오늘 처리된 배치와 시스템 상태"
        badge="실시간"
        actions={
          <div className="flex items-center gap-2 text-xs text-ink-400 num-mono">
            <Activity className="w-3.5 h-3.5 text-accent-500" />
            마지막 갱신 14:23:17
          </div>
        }
      />

      <div className="p-8 space-y-8">
        {/* === KPI Row === */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="오늘 처리 배치"
              value={kpis.todayBatches}
              unit="건"
              icon={Layers}
              delta={{ value: '+8 어제 대비', trend: 'up' }}
            />
            <KpiCard
              label="발행 완료 DPP"
              value={kpis.approvedDPP}
              unit="건"
              icon={CheckCircle2}
              tone="ok"
              hint={`승인율 ${kpis.complianceRate}%`}
            />
            <KpiCard
              label="HITL 검토 대기"
              value={hitlWaiting}
              unit="건"
              icon={Clock}
              tone="warn"
              hint="ESG팀장 승인 필요"
            />
            <KpiCard
              label="위반 감지"
              value={kpis.violations}
              unit="건"
              icon={ShieldAlert}
              tone="alert"
              hint="UFLPA 1, FEOC 2"
            />
          </div>
        </section>

        {/* === Charts Row === */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 일별 처리량 (2칸) */}
          <Card 
            title="일별 처리량 추이" 
            subtitle="최근 14일 · 처리 / 승인 / 위반"
            className="lg:col-span-2"
            action={
              <div className="flex items-center gap-3 text-[11px] text-ink-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-accent-500" />처리
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500" />승인
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-red-500" />위반
                </span>
              </div>
            }
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyProcessing} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g-processed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#14B8A6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E8EC" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#4B5563', fontSize: 11, fontFamily: 'JetBrains Mono' }} 
                    axisLine={{ stroke: '#C4CAD0' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#8A9199', fontSize: 11, fontFamily: 'JetBrains Mono' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#FFFFFF', 
                      border: '1px solid #E5E8EC',
                      color: '#1F2937',
                      borderRadius: '2px',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono'
                    }} 
                  />
                  <Area type="monotone" dataKey="processed" stroke="#14B8A6" strokeWidth={1.5} fill="url(#g-processed)" />
                  <Area type="monotone" dataKey="approved" stroke="#10B981" strokeWidth={1.5} fill="none" />
                  <Area type="monotone" dataKey="violations" stroke="#EF4444" strokeWidth={1.5} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 규제별 위반 분포 */}
          <Card title="규제별 위반 분포" subtitle="이번 달 누계">
            <div className="space-y-3">
              {violationsByRegulation.map(item => (
                <div key={item.regulation}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-ink-200">{item.regulation}</span>
                    <span className="text-[11px] num-mono text-ink-400">
                      {item.count}건 <span className="text-ink-500">/ {item.percent}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-ink-700 rounded-xs overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500/60 to-red-500" 
                      style={{ width: `${item.percent * 2.5}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-ink-700">
              <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">평균 처리 시간</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold num-mono text-accent-400">{kpis.avgProcessingMinutes}</span>
                <span className="text-xs text-ink-400">분 / 배치</span>
              </div>
            </div>
          </Card>
        </section>

        {/* === 처리 중인 배치 + 빠른 액세스 === */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card 
            title="실시간 처리 현황" 
            subtitle={`현재 ${inProgressCount}건이 LangGraph에서 처리 중`}
            className="lg:col-span-2"
            action={
              <Link href="/queue" className="flex items-center gap-1 text-[11px] text-accent-400 hover:text-accent-300">
                전체 보기 <ArrowRight className="w-3 h-3" />
              </Link>
            }
          >
            <div className="space-y-2">
              {batchesInProgress.slice(0, 5).map(batch => (
                <BatchRow key={batch.id} batch={batch} />
              ))}
            </div>
          </Card>

          <Card title="공급망 한눈에 보기" subtitle={`${kpis.displayedSuppliers}개 협력사 시연 데이터`}>
            <div className="space-y-3">
              <Stat label="총 협력사" value="187" unit="개사" />
              <Stat label="Tier 1 (직거래)" value="1" unit="개사" />
              <Stat label="Tier 2 (소재)" value="3" unit="개사" tone="info" />
              <Stat label="Tier 3 (광산/제련)" value="6" unit="개사" tone="warn" />
              <div className="pt-3 border-t border-ink-700">
                <Stat label="고위험 노드" value="2" unit="개사" tone="alert" hint="UFLPA · FEOC" />
              </div>
            </div>
            <Link 
              href="/supply-chain"
              className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xs bg-accent-700/20 border border-accent-700/30 text-accent-300 text-xs font-medium hover:bg-accent-700/30 transition-colors"
            >
              공급망 맵 열기 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>
        </section>
      </div>
    </>
  );
}

// 통계 라인 컴포넌트
function Stat({ label, value, unit, tone, hint }: any) {
  const colors: any = {
    info: 'text-blue-400',
    warn: 'text-amber-400',
    alert: 'text-red-400',
  };
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-ink-300">{label}</span>
      <div className="text-right">
        <span className={`text-lg font-semibold num-mono ${colors[tone] || 'text-ink-100'}`}>{value}</span>
        <span className="text-[11px] text-ink-400 ml-1">{unit}</span>
        {hint && <div className="text-[10px] text-ink-500 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

// 배치 진행 행
function BatchRow({ batch }: { batch: any }) {
  const stageMap: any = {
    'queued': { label: '큐 대기', tone: 'neutral' as const },
    'supervisor': { label: '지혜 (Pipeline Coordinator)', tone: 'info' as const },
    'extraction': { label: '은진 (Data Gateway)', tone: 'info' as const },
    'verification': { label: 'Verification', tone: 'info' as const },
    'geo-analysis': { label: '영수 (Geo Audit)', tone: 'info' as const },
    'compliance': { label: '은지 (Regulatory Analyst)', tone: 'info' as const },
    'readiness': { label: 'DPP Readiness', tone: 'info' as const },
    'hitl-wait': { label: 'HITL 대기', tone: 'warn' as const },
    'action': { label: '차윤 (Automation Controller)', tone: 'info' as const },
    'completed': { label: '완료', tone: 'ok' as const },
    'rejected': { label: '반려', tone: 'alert' as const },
  };
  const stage = stageMap[batch.currentStage];

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xs border border-ink-700/60 bg-ink-900/40 card-hover">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-mono text-ink-100">{batch.batchId}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-300">
            → {batch.destination}
          </span>
        </div>
        <div className="text-[11px] text-ink-400 truncate">{batch.supplier}</div>
      </div>
      <div className="text-[10px] text-ink-500 num-mono shrink-0">{batch.receivedAt.slice(11)}</div>
      <div className="shrink-0">
        <Badge tone={stage.tone} dot>{stage.label}</Badge>
      </div>
    </div>
  );
}
