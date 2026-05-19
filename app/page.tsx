'use client';

import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import { kpis, dailyProcessing, violationsByRegulation, batchesInProgress } from '@/lib/data';
import {
  Layers, AlertTriangle, CheckCircle2, Clock, ShieldAlert,
  ArrowRight, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import Link from 'next/link';
import clsx from 'clsx';

// 지역 태그 색상
const regionColor: Record<string, string> = {
  EU: 'border-blue-700/30 bg-blue-500/8 text-blue-500',
  US: 'border-amber-700/30 bg-amber-500/8 text-amber-500',
  DE: 'border-slate-700/30 bg-slate-500/8 text-slate-400',
};

// 위반 건수 → 바 색상 (많을수록 빨강)
function barColor(percent: number): string {
  if (percent >= 30) return 'bg-red-500';
  if (percent >= 20) return 'bg-orange-500';
  if (percent >= 10) return 'bg-amber-500';
  return 'bg-blue-500';
}

// 배치 상태 맵
const stageMeta: Record<string, { label: string; color: string }> = {
  queued:       { label: '대기',     color: 'text-ink-400' },
  supervisor:   { label: '조율',     color: 'text-blue-400' },
  extraction:   { label: '추출',     color: 'text-blue-400' },
  verification: { label: '검증',     color: 'text-amber-400' },
  'geo-analysis': { label: 'Geo',   color: 'text-purple-400' },
  compliance:   { label: '컴플라이언스', color: 'text-orange-400' },
  readiness:    { label: '준비도',   color: 'text-teal-400' },
  'hitl-wait':  { label: 'HITL 대기', color: 'text-red-400' },
  action:       { label: '처리',     color: 'text-emerald-400' },
  completed:    { label: '완료',     color: 'text-emerald-500' },
  rejected:     { label: '반려',     color: 'text-red-500' },
};

const destMeta: Record<string, { label: string; tone: any }> = {
  US: { label: 'US',  tone: 'warn' },
  EU: { label: 'EU',  tone: 'ok' },
  KR: { label: 'KR',  tone: 'neutral' },
};

function BatchRow({ batch }: { batch: any }) {
  const stage = stageMeta[batch.currentStage];
  const dest  = destMeta[batch.destination];
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-ink-700/40 last:border-0">
      <div className="text-[11px] num-mono text-ink-400 w-24 shrink-0 truncate">{batch.batchId}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-ink-200 truncate">{batch.supplier}</div>
        <div className="text-[10px] text-ink-500">{batch.receivedAt}</div>
      </div>
      <Badge tone={dest?.tone} size="sm">{dest?.label}</Badge>
      <span className={clsx('text-[11px] font-medium shrink-0', stage?.color)}>
        {stage?.label}
      </span>
    </div>
  );
}

function Stat({ label, value, unit, tone, hint }: any) {
  const colors: Record<string, string> = {
    info:  'text-blue-400',
    warn:  'text-amber-400',
    alert: 'text-red-400',
  };
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-ink-400">{label}</span>
      <div className="text-right">
        <span className={clsx('text-sm font-semibold num-mono', colors[tone] || 'text-ink-100')}>{value}</span>
        <span className="text-[11px] text-ink-500 ml-1">{unit}</span>
        {hint && <div className="text-[10px] text-ink-500">{hint}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const inProgressCount = batchesInProgress.filter(
    b => b.currentStage !== 'completed' && b.currentStage !== 'rejected'
  ).length;
  const hitlWaiting = batchesInProgress.filter(b => b.currentStage === 'hitl-wait').length;

  // 지역별 위반 집계
  const totalViolations = violationsByRegulation.reduce((s, v) => s + v.count, 0);
  const euViolations = violationsByRegulation.filter(v => v.region === 'EU' || v.region === 'DE').reduce((s, v) => s + v.count, 0);
  const usViolations = violationsByRegulation.filter(v => v.region === 'US').reduce((s, v) => s + v.count, 0);

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
              hint={`EU ${euViolations} · US ${usViolations}`}
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
                      <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
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
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <Area type="monotone" dataKey="processed" stroke="#14B8A6" strokeWidth={1.5} fill="url(#g-processed)" />
                  <Area type="monotone" dataKey="approved"  stroke="#10B981" strokeWidth={1.5} fill="none" />
                  <Area type="monotone" dataKey="violations" stroke="#EF4444" strokeWidth={1.5} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 규제별 위반 분포 — 11개 규제 */}
          <Card title="규제별 위반 분포" subtitle={`이번 달 누계 · 총 ${totalViolations}건`}>
            {/* 지역 요약 탭 */}
            <div className="flex gap-2 mb-4">
              {[
                { label: '전체', count: totalViolations, color: 'text-ink-200' },
                { label: 'EU/DE', count: euViolations, color: 'text-blue-400' },
                { label: 'US',   count: usViolations, color: 'text-amber-400' },
              ].map(t => (
                <div key={t.label} className="flex-1 text-center rounded-xs border border-ink-700/60 bg-ink-900/30 py-1.5">
                  <div className={clsx('text-sm font-bold num-mono', t.color)}>{t.count}</div>
                  <div className="text-[9px] text-ink-500 uppercase tracking-wider">{t.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-80">
              {violationsByRegulation.map(item => (
                <div key={item.regulation}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-ink-200">{item.regulation}</span>
                      <span className={clsx(
                        'inline-flex items-center px-1 py-0.5 rounded-xs border text-[9px] font-semibold',
                        regionColor[item.region] || 'border-ink-600 text-ink-400',
                      )}>
                        {item.region}
                      </span>
                    </div>
                    <span className="text-[11px] num-mono text-ink-400">
                      {item.count}건
                    </span>
                  </div>
                  <div className="h-1.5 bg-ink-700 rounded-xs overflow-hidden">
                    <div
                      className={clsx('h-full transition-all', barColor(item.percent))}
                      style={{ width: `${Math.min(100, item.percent * 2.5)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-ink-700">
              <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">평균 처리 시간</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold num-mono text-accent-400">{kpis.avgProcessingMinutes}</span>
                <span className="text-xs text-ink-400">분 / 배치</span>
              </div>
            </div>
          </Card>
        </section>

        {/* === 처리 중인 배치 + 공급망 요약 === */}
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
            <div className="space-y-0">
              {batchesInProgress.slice(0, 5).map(batch => (
                <BatchRow key={batch.id} batch={batch} />
              ))}
            </div>
          </Card>

          <Card title="공급망 한눈에 보기" subtitle={`${kpis.displayedSuppliers}개 협력사 시연 데이터`}>
            <div className="space-y-1">
              <Stat label="총 협력사" value="187" unit="개사" />
              <Stat label="Tier 1 (직거래)" value="1" unit="개사" />
              <Stat label="Tier 2 (소재)" value="3" unit="개사" tone="info" />
              <Stat label="Tier 3 (광산/제련)" value="6" unit="개사" tone="warn" />
              <div className="pt-2 mt-1 border-t border-ink-700">
                <Stat label="고위험 노드" value="2" unit="개사" tone="alert" hint="UFLPA · FEOC" />
              </div>
            </div>

            {/* 규제 커버리지 요약 */}
            <div className="mt-4 pt-3 border-t border-ink-700">
              <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">규제 커버리지</div>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'UFLPA',  region: 'US' },
                  { label: 'IRA/FEOC', region: 'US' },
                  { label: 'EU 배터리법', region: 'EU' },
                  { label: 'CSDDD', region: 'EU' },
                  { label: 'EUDR',  region: 'EU' },
                  { label: 'Conflict Minerals', region: 'EU' },
                  { label: 'CRMA',  region: 'EU' },
                  { label: 'CBAM',  region: 'EU' },
                  { label: 'Art.47', region: 'EU' },
                  { label: 'Art.7', region: 'EU' },
                  { label: 'LkSG',  region: 'DE' },
                ].map(r => (
                  <span
                    key={r.label}
                    className={clsx(
                      'px-1.5 py-0.5 rounded-xs border text-[9px] font-semibold',
                      regionColor[r.region] || 'border-ink-600 text-ink-400',
                    )}
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            </div>

            <Link
              href="/supply-chain/product-map"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xs bg-accent-700/20 border border-accent-700/30 text-accent-300 text-xs font-medium hover:bg-accent-700/30 transition-colors"
            >
              공급망 맵 열기 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>
        </section>
      </div>
    </>
  );
}
