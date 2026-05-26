// [작업 4 — 대시보드 탭 구조 추가]
// 변경 사항:
// 1. 페이지 최상단에 탭 네비게이션 추가 (Overview / High Risk / Pending / DPP Ready / HITL Queue)
// 2. Overview 탭 — 기존 대시보드 내용 그대로 유지
// 3. High Risk 탭 — supplierRiskProfiles에서 high/critical 협력사 목록
// 4. Pending 탭 — supplierCompleteness에서 completionRate < 80 목록 + SLA 초과 여부
// 5. DPP Ready 탭 — dppRecords에서 status === 'issued' 목록
// 6. HITL Queue 탭 — batchesInProgress에서 currentStage === 'hitl-wait' 목록
// 탭 스타일: border-b-2 방식 (app/suppliers/[id]/layout.tsx 참고)

'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import {
  kpis, dailyProcessing, violationsByRegulation,
  batchesInProgress, dppRecords, suppliers,
} from '@/lib/data';
import {
  supplierRiskProfiles, supplierCompleteness, getRemindLogs, getSupplierName,
} from '@/lib/supplier-detail-data';
import {
  Layers, AlertTriangle, CheckCircle2, Clock, ShieldAlert,
  ArrowRight, Activity, AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import Link from 'next/link';
import clsx from 'clsx';

// ── 공통 상수 ────────────────────────────────────────────────────
const regionColor: Record<string, string> = {
  EU: 'border-blue-700/30 bg-blue-500/8 text-blue-500',
  US: 'border-amber-700/30 bg-amber-500/8 text-amber-500',
  DE: 'border-slate-700/30 bg-slate-500/8 text-slate-400',
};

function barColor(percent: number): string {
  if (percent >= 30) return 'bg-red-500';
  if (percent >= 20) return 'bg-orange-500';
  if (percent >= 10) return 'bg-amber-500';
  return 'bg-blue-500';
}

const stageMeta: Record<string, { label: string; color: string }> = {
  queued:         { label: '대기',         color: 'text-ink-400' },
  supervisor:     { label: '조율',         color: 'text-blue-400' },
  extraction:     { label: '추출',         color: 'text-blue-400' },
  verification:   { label: '검증',         color: 'text-amber-400' },
  'geo-analysis': { label: 'Geo',          color: 'text-purple-400' },
  compliance:     { label: '컴플라이언스', color: 'text-orange-400' },
  readiness:      { label: '준비도',       color: 'text-teal-400' },
  'hitl-wait':    { label: 'HITL 대기',    color: 'text-red-400' },
  action:         { label: '처리',         color: 'text-emerald-400' },
  completed:      { label: '완료',         color: 'text-emerald-500' },
  rejected:       { label: '반려',         color: 'text-red-500' },
};

const destMeta: Record<string, { label: string; tone: any }> = {
  US: { label: 'US', tone: 'warn' },
  EU: { label: 'EU', tone: 'ok' },
  KR: { label: 'KR', tone: 'neutral' },
};

const riskLevelLabel: Record<string, string> = {
  low: '저위험', medium: '중위험', high: '고위험', critical: '최고위험',
};
const riskLevelColor: Record<string, string> = {
  low:      'border-emerald-700/30 bg-emerald-500/8 text-emerald-500',
  medium:   'border-amber-700/30 bg-amber-500/8 text-amber-500',
  high:     'border-red-700/30 bg-red-500/8 text-red-500',
  critical: 'border-red-700/40 bg-red-500/12 text-red-600 font-bold',
};

// ── 탭 정의 ──────────────────────────────────────────────────────
type TabKey = 'overview' | 'today-batches' | 'violation-cases' | 'high-risk' | 'pending' | 'dpp-ready' | 'hitl-queue';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview',    label: 'Overview' },
  { key: 'today-batches', label: 'Today Batches' },
  { key: 'violation-cases', label: 'Violation Cases' },
  { key: 'high-risk',   label: 'High Risk' },
  { key: 'pending',     label: 'Pending' },
  { key: 'dpp-ready',   label: 'DPP Ready' },
  { key: 'hitl-queue',  label: 'HITL Queue' },
];

const violationCases = [
  {
    id: 'VIO-2026-0514-001',
    batchId: 'LOT-MIN-240514-D',
    supplier: 'Xinjiang Mineral Resources',
    regulation: 'UFLPA',
    region: 'US',
    severity: 'critical',
    status: '반려',
    detectedAt: '2026-05-14 10:44',
    summary: '신장 지역 원산지 리스크가 확인되어 UFLPA 통관 제한 대상으로 분류됨',
  },
  {
    id: 'VIO-2026-0514-002',
    batchId: 'LOT-COB-240514-E',
    supplier: 'Ganzhou Rare Metals',
    regulation: 'IRA/FEOC',
    region: 'US',
    severity: 'high',
    status: 'HITL 필요',
    detectedAt: '2026-05-14 11:08',
    summary: '중국 국영기업 직접 지분 41.2%로 FEOC 부적격 가능성 감지',
  },
  {
    id: 'VIO-2026-0514-003',
    batchId: 'LOT-PRE-240514-C',
    supplier: 'Quzhou Precursor Co.',
    regulation: 'EU 배터리법 Art.47',
    region: 'EU',
    severity: 'medium',
    status: '증빙 요청',
    detectedAt: '2026-05-14 10:18',
    summary: '공급망 실사 문서와 원산지 증빙 일부 누락',
  },
];

// ── 서브 컴포넌트 ─────────────────────────────────────────────────
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
      <span className={clsx('text-[11px] font-medium shrink-0', stage?.color)}>{stage?.label}</span>
      <Badge tone={dest?.tone} size="sm">{dest?.label}</Badge>
    </div>
  );
}

function Stat({ label, value, unit, tone, hint }: any) {
  const colors: Record<string, string> = {
    info: 'text-blue-400', warn: 'text-amber-400', alert: 'text-red-400',
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

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-xs text-ink-500 border border-dashed border-ink-700/40 rounded-xs">
      {label}
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const inProgressCount = batchesInProgress.filter(
    b => b.currentStage !== 'completed' && b.currentStage !== 'rejected'
  ).length;
  const hitlWaiting = batchesInProgress.filter(b => b.currentStage === 'hitl-wait').length;
  const totalViolations = violationsByRegulation.reduce((s, v) => s + v.count, 0);
  const euViolations = violationsByRegulation.filter(v => v.region === 'EU' || v.region === 'DE').reduce((s, v) => s + v.count, 0);
  const usViolations = violationsByRegulation.filter(v => v.region === 'US').reduce((s, v) => s + v.count, 0);

  // 탭별 데이터 필터링
  const highRiskList = supplierRiskProfiles.filter(
    r => r.riskLevel === 'high' || r.riskLevel === 'critical'
  );
  const pendingList = supplierCompleteness.filter(c => c.completionRate < 80);
  const dppReadyList = dppRecords.filter(d => d.status === 'issued');
  const hitlList = batchesInProgress.filter(b => b.currentStage === 'hitl-wait');

  return (
    <>
      <PageHeader
        title="대시보드"
        description="오늘 조치가 필요한 규제 리스크, 제출 지연, HITL 대기 항목을 한 화면에서 확인합니다"
        badge="실시간 관제"
        actions={
          <div className="flex items-center gap-2 text-xs text-ink-400 num-mono">
            <Activity className="w-3.5 h-3.5 text-accent-500" />
            마지막 갱신 14:23:17
          </div>
        }
      />

      {/* ── 탭 네비게이션 ── */}
      <div className="border-b border-ink-700 bg-white px-8 shadow-control">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-[13px] font-semibold',
                activeTab === tab.key
                  ? 'border-accent-600 text-accent-800'
                  : 'border-transparent text-ink-500 hover:text-ink-200 hover:border-ink-600'
              )}
            >
              {tab.label}
              {/* 탭별 카운트 배지 */}
              {tab.key === 'today-batches' && batchesInProgress.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-accent-500/15 text-accent-500 num-mono">
                  {batchesInProgress.length}
                </span>
              )}
              {tab.key === 'violation-cases' && violationCases.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-red-500/15 text-red-400 num-mono">
                  {violationCases.length}
                </span>
              )}
              {tab.key === 'high-risk'  && highRiskList.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-red-500/15 text-red-400 num-mono">
                  {highRiskList.length}
                </span>
              )}
              {tab.key === 'pending'    && pendingList.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-amber-500/15 text-amber-400 num-mono">
                  {pendingList.length}
                </span>
              )}
              {tab.key === 'dpp-ready' && dppReadyList.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-emerald-500/15 text-emerald-400 num-mono">
                  {dppReadyList.length}
                </span>
              )}
              {tab.key === 'hitl-queue' && hitlList.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-red-500/15 text-red-400 num-mono">
                  {hitlList.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          탭 1 — Overview (기존 대시보드 내용 그대로)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="p-8 space-y-8">
          <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
            <div className="rounded-sm border border-red-200 bg-white shadow-control overflow-hidden">
              <div className="px-5 py-4 border-b border-red-100 bg-red-50/70 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-red-900">오늘 먼저 봐야 할 조치</h2>
                  <p className="mt-1 text-xs text-red-700">위반, HITL, 제출 지연처럼 업무 중단을 만들 수 있는 항목을 우선 배치했습니다</p>
                </div>
                <Badge tone="alert" size="md">{kpis.violations + hitlWaiting}건</Badge>
              </div>
              <div className="divide-y divide-ink-700">
                {[
                  { label: '규제 위반 감지', value: `${kpis.violations}건`, detail: `EU ${euViolations} · US ${usViolations}`, tone: 'text-red-800', action: '케이스 확인', tab: 'violation-cases' as TabKey },
                  { label: 'HITL 검토 대기', value: `${hitlWaiting}건`, detail: 'ESG 담당자 승인 필요', tone: 'text-amber-800', action: '검토 열기', tab: 'hitl-queue' as TabKey },
                  { label: '입력 미완료 협력사', value: `${pendingList.length}개사`, detail: '완성도 80% 미만 또는 SLA 초과', tone: 'text-blue-800', action: '대상 확인', tab: 'pending' as TabKey },
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setActiveTab(item.tab)}
                    className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-ink-800 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink-100">{item.label}</div>
                      <div className="mt-1 text-xs text-ink-500">{item.detail}</div>
                    </div>
                    <div className={`text-xl font-bold num-mono ${item.tone}`}>{item.value}</div>
                    <div className="text-xs font-semibold text-accent-700 flex items-center gap-1">
                      {item.action} <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-sm border border-ink-700 bg-white shadow-control p-5">
              <h2 className="text-base font-bold text-ink-100">운영 기준</h2>
              <p className="mt-1 text-xs text-ink-500 leading-5">관제 화면은 상태 설명보다 조치 우선순위를 먼저 보여줍니다.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                  <div className="text-[11px] text-ink-500">평균 처리</div>
                  <div className="mt-1 text-2xl font-bold num-mono text-ink-100">{kpis.avgProcessingMinutes}<span className="ml-1 text-xs text-ink-500">분</span></div>
                </div>
                <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                  <div className="text-[11px] text-ink-500">DPP 승인율</div>
                  <div className="mt-1 text-2xl font-bold num-mono text-emerald-800">{kpis.complianceRate}<span className="ml-1 text-xs text-ink-500">%</span></div>
                </div>
              </div>
              <div className="mt-4 rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="text-xs font-semibold text-ink-100">현재 판단</div>
                <div className="mt-1 text-xs text-ink-500 leading-5">위반 감지와 HITL 대기 항목이 남아 있어 DPP 발행 전 수동 검토가 필요합니다.</div>
              </div>
            </div>
          </section>

          <section>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="오늘 처리 배치"
                value={kpis.todayBatches}
                unit="건"
                icon={Layers}
                delta={{ value: '+8 어제 대비', trend: 'up' }}
                onClick={() => setActiveTab('today-batches')}
              />
              <KpiCard
                label="발행 완료 DPP"
                value={kpis.approvedDPP}
                unit="건"
                icon={CheckCircle2}
                tone="ok"
                hint={`승인율 ${kpis.complianceRate}%`}
                onClick={() => setActiveTab('dpp-ready')}
              />
              <KpiCard
                label="HITL 검토 대기"
                value={hitlWaiting}
                unit="건"
                icon={Clock}
                tone="warn"
                hint="ESG팀장 승인 필요"
                onClick={() => setActiveTab('hitl-queue')}
              />
              <KpiCard
                label="위반 감지"
                value={kpis.violations}
                unit="건"
                icon={ShieldAlert}
                tone="alert"
                hint={`EU ${euViolations} · US ${usViolations}`}
                onClick={() => setActiveTab('violation-cases')}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card
              title="일별 처리량 추이" subtitle="최근 14일 · 처리 / 승인 / 위반" className="lg:col-span-2"
              action={
                <div className="flex items-center gap-3 text-[11px] text-ink-400">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-xs bg-accent-500" />처리</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-xs bg-emerald-500" />승인</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-xs bg-red-500" />위반</span>
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
                    <XAxis dataKey="date" tick={{ fill: '#4B5563', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#C4CAD0' }} tickLine={false} />
                    <YAxis tick={{ fill: '#8A9199', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E8EC', color: '#1F2937', borderRadius: '2px', fontSize: '12px', fontFamily: 'JetBrains Mono' }} />
                    <Area type="monotone" dataKey="processed"  stroke="#14B8A6" strokeWidth={1.5} fill="url(#g-processed)" />
                    <Area type="monotone" dataKey="approved"   stroke="#10B981" strokeWidth={1.5} fill="none" />
                    <Area type="monotone" dataKey="violations" stroke="#EF4444" strokeWidth={1.5} fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="규제별 위반 분포" subtitle={`이번 달 누계 · 총 ${totalViolations}건`}>
              <div className="flex gap-2 mb-4">
                {[
                  { label: '전체',  count: totalViolations, color: 'text-ink-200' },
                  { label: 'EU/DE', count: euViolations,    color: 'text-blue-400' },
                  { label: 'US',    count: usViolations,    color: 'text-amber-400' },
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
                        <span className={clsx('inline-flex items-center px-1 py-0.5 rounded-xs border text-[9px] font-semibold', regionColor[item.region] || 'border-ink-600 text-ink-400')}>{item.region}</span>
                      </div>
                      <span className="text-[11px] num-mono text-ink-400">{item.count}건</span>
                    </div>
                    <div className="h-1.5 bg-ink-700 rounded-xs overflow-hidden">
                      <div className={clsx('h-full transition-all', barColor(item.percent))} style={{ width: `${Math.min(100, item.percent * 2.5)}%` }} />
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

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card
              title="실시간 처리 현황" subtitle={`현재 ${inProgressCount}건이 LangGraph에서 처리 중`} className="lg:col-span-2"
              action={<Link href="/queue" className="flex items-center gap-1 text-[11px] text-accent-400 hover:text-accent-300">전체 보기 <ArrowRight className="w-3 h-3" /></Link>}
            >
              <div className="space-y-0">
                {batchesInProgress.slice(0, 5).map(batch => <BatchRow key={batch.id} batch={batch} />)}
              </div>
            </Card>

            <Card title="공급망 한눈에 보기" subtitle={`${kpis.displayedSuppliers}개 협력사 시연 데이터`}>
              <div className="space-y-1">
                <Stat label="총 협력사"       value="187" unit="개사" />
                <Stat label="Tier 1 (직거래)" value="1"   unit="개사" />
                <Stat label="Tier 2 (소재)"   value="3"   unit="개사" tone="info" />
                <Stat label="Tier 3 (광산/제련)" value="6" unit="개사" tone="warn" />
                <div className="pt-2 mt-1 border-t border-ink-700">
                  <Stat label="고위험 노드" value="2" unit="개사" tone="alert" hint="UFLPA · FEOC" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-ink-700">
                <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">규제 커버리지</div>
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: 'UFLPA',          region: 'US' }, { label: 'IRA/FEOC',      region: 'US' },
                    { label: 'EU 배터리법',     region: 'EU' }, { label: 'CSDDD',         region: 'EU' },
                    { label: 'EUDR',            region: 'EU' }, { label: 'Conflict Minerals', region: 'EU' },
                    { label: 'CRMA',            region: 'EU' }, { label: 'CBAM',          region: 'EU' },
                    { label: 'Art.47',          region: 'EU' }, { label: 'Art.7',         region: 'EU' },
                    { label: 'LkSG',            region: 'DE' },
                  ].map(r => (
                    <span key={r.label} className={clsx('px-1.5 py-0.5 rounded-xs border text-[9px] font-semibold', regionColor[r.region] || 'border-ink-600 text-ink-400')}>
                      {r.label}
                    </span>
                  ))}
                </div>
              </div>
              <Link href="/supply-chain/product-map" className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xs bg-accent-700/20 border border-accent-700/30 text-accent-300 text-xs font-medium hover:bg-accent-700/30 transition-colors">
                공급망 맵 열기 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Card>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          탭 1-1 — Today Batches
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'today-batches' && (
        <div className="p-8">
          <Card
            title="오늘 처리 배치"
            subtitle={`대시보드 샘플 ${batchesInProgress.length}건 · 전체 KPI ${kpis.todayBatches}건`}
            action={<Link href="/queue" className="flex items-center gap-1 text-[11px] text-accent-400 hover:text-accent-300">검증 대기열 열기 <ArrowRight className="w-3 h-3" /></Link>}
          >
            {batchesInProgress.length === 0 ? (
              <EmptyState label="현재 해당 항목이 없습니다" />
            ) : (
              <div className="space-y-0">
                {batchesInProgress.map(batch => <BatchRow key={batch.id} batch={batch} />)}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          탭 2 — Violation Cases
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'violation-cases' && (
        <div className="p-8">
          <Card
            title="위반 감지"
            subtitle={`실시간 규제 위반 케이스 ${violationCases.length}건`}
          >
            <div className="space-y-2">
              {violationCases.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 rounded-xs border border-red-700/30 bg-red-500/5"
                >
                  <div className="w-8 h-8 rounded-xs border border-red-700/30 bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-500" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold num-mono text-red-500">{item.id}</span>
                      <span className="text-sm font-semibold text-ink-100">{item.supplier}</span>
                      <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded-xs border text-[10px] font-semibold', regionColor[item.region] || 'border-ink-600 text-ink-400')}>
                        {item.region}
                      </span>
                    </div>
                    <div className="text-xs text-ink-500 truncate">{item.summary}</div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-ink-500 num-mono flex-wrap">
                      <span>{item.batchId}</span>
                      <span>·</span>
                      <span>{item.regulation}</span>
                      <span>·</span>
                      <span>{item.detectedAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={clsx(
                      'text-[10px] font-semibold px-2 py-1 rounded-xs border',
                      item.severity === 'critical' ? 'border-red-700/40 bg-red-500/12 text-red-600' :
                      item.severity === 'high' ? 'border-orange-700/30 bg-orange-500/8 text-orange-500' :
                      'border-amber-700/30 bg-amber-500/8 text-amber-500'
                    )}>
                      {item.severity === 'critical' ? '긴급' : item.severity === 'high' ? '높음' : '보통'}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-1 rounded-xs border border-ink-700 bg-ink-900/40 text-ink-400">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          탭 3 — High Risk
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'high-risk' && (
        <div className="p-8">
          {highRiskList.length === 0 ? (
            <EmptyState label="현재 해당 항목이 없습니다" />
          ) : (
            <div className="space-y-2">
              {highRiskList.map(r => {
                const sup  = suppliers.find(s => s.id === r.supplierId);
                const name = getSupplierName(r.supplierId);
                return (
                  <Link
                    key={r.supplierId}
                    href={`/suppliers/${r.supplierId}/info`}
                    className="flex items-center gap-4 p-4 rounded-xs border border-ink-700/60 bg-ink-900/20 hover:border-ink-600 hover:bg-ink-800/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-ink-100">
                          {name?.nameEn ?? sup?.name ?? r.supplierId}
                        </span>
                        {name?.nameKo && <span className="text-xs text-ink-400">{name.nameKo}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-ink-500">
                        <span>T{sup?.tier}</span>
                        <span>·</span>
                        <span>{sup?.country}</span>
                        {r.highRiskReasons[0] && (
                          <>
                            <span>·</span>
                            <span className="text-amber-500/80 truncate">{r.highRiskReasons[0]}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={clsx('text-[10px] font-medium px-2 py-1 rounded-xs border', riskLevelColor[r.riskLevel])}>
                        {riskLevelLabel[r.riskLevel]}
                      </span>
                      <span className={clsx(
                        'text-[10px] font-semibold px-2 py-1 rounded-xs border',
                        r.feocStatus === 'eligible'    ? 'border-emerald-700/30 bg-emerald-500/8 text-emerald-500' :
                        r.feocStatus === 'ineligible'  ? 'border-red-700/30 bg-red-500/8 text-red-500' :
                        r.feocStatus === 'under_review'? 'border-amber-700/30 bg-amber-500/8 text-amber-500' :
                                                          'border-ink-700 bg-ink-800 text-ink-400'
                      )}>
                        {r.feocStatus === 'eligible' ? 'FEOC 적격' :
                         r.feocStatus === 'ineligible' ? 'FEOC 부적격' :
                         r.feocStatus === 'under_review' ? 'FEOC 검토중' : 'FEOC 미파악'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-ink-600" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          탭 3 — Pending
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'pending' && (
        <div className="p-8">
          {pendingList.length === 0 ? (
            <EmptyState label="현재 해당 항목이 없습니다" />
          ) : (
            <div className="space-y-2">
              {pendingList.map(c => {
                const sup      = suppliers.find(s => s.id === c.supplierId);
                const name     = getSupplierName(c.supplierId);
                const logs     = getRemindLogs(c.supplierId);
                const isSlaOver = logs.length >= 2;
                return (
                  <Link
                    key={c.supplierId}
                    href={`/suppliers/${c.supplierId}/info`}
                    className="flex items-center gap-4 p-4 rounded-xs border border-ink-700/60 bg-ink-900/20 hover:border-ink-600 hover:bg-ink-800/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-sm font-semibold text-ink-100">
                          {name?.nameEn ?? sup?.name ?? c.supplierId}
                        </span>
                        {isSlaOver && (
                          <span className="flex items-center gap-1 text-[10px] text-orange-500 border border-orange-700/30 bg-orange-500/8 px-1.5 py-0.5 rounded-xs">
                            <Clock className="w-2.5 h-2.5" />
                            SLA 초과
                          </span>
                        )}
                      </div>
                      {/* 진행 바 */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-ink-700/60">
                          <div
                            className={clsx('h-full rounded-full',
                              c.completionRate >= 80 ? 'bg-emerald-500' :
                              c.completionRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            )}
                            style={{ width: `${c.completionRate}%` }}
                          />
                        </div>
                        <span className="text-[11px] num-mono text-ink-300 shrink-0">{c.completionRate}%</span>
                      </div>
                      {c.missingFields.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-ink-500">
                          <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                          누락 {c.missingFields.length}항목
                          <span className="text-ink-600 truncate ml-1">— {c.missingFields.slice(0, 2).join(', ')}{c.missingFields.length > 2 ? ` 외 ${c.missingFields.length - 2}건` : ''}</span>
                        </div>
                      )}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-600 shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          탭 4 — DPP Ready
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'dpp-ready' && (
        <div className="p-8">
          {dppReadyList.length === 0 ? (
            <EmptyState label="현재 해당 항목이 없습니다" />
          ) : (
            <div className="space-y-2">
              {dppReadyList.map(d => (
                <div key={d.id} className="flex items-center gap-4 p-4 rounded-xs border border-emerald-700/30 bg-emerald-500/5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold num-mono text-emerald-500">{d.id}</span>
                      <span className="text-sm text-ink-100">{d.modelName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-ink-500 num-mono flex-wrap">
                      <span>{d.manufacturer}</span>
                      <span>·</span>
                      <span>발행: {d.issuedAt.slice(0, 10)}</span>
                      <span>·</span>
                      <span>탄소: {d.carbonFootprint} kg CO₂eq</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-ink-500">재활용 함량:</span>
                      {[
                        { label: `Co ${d.recycledContent.Co}%`, ok: d.recycledContent.Co >= 4 },
                        { label: `Ni ${d.recycledContent.Ni}%`, ok: d.recycledContent.Ni >= 4 },
                        { label: `Li ${d.recycledContent.Li}%`, ok: d.recycledContent.Li >= 4 },
                      ].map(rc => (
                        <span key={rc.label} className={clsx(
                          'text-[10px] px-1.5 py-0.5 rounded-xs border',
                          rc.ok ? 'border-emerald-700/30 bg-emerald-500/8 text-emerald-500'
                               : 'border-amber-700/30 bg-amber-500/8 text-amber-500'
                        )}>
                          {rc.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={clsx('text-[10px] font-semibold px-2 py-1 rounded-xs border', regionColor[d.destination] || 'border-ink-600 text-ink-400')}>
                      {d.destination}
                    </span>
                    <div className="text-[10px] text-ink-500 mt-1">{d.approvedBy}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          탭 5 — HITL Queue
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'hitl-queue' && (
        <div className="p-8">
          {hitlList.length === 0 ? (
            <EmptyState label="현재 해당 항목이 없습니다" />
          ) : (
            <div className="space-y-2">
              {hitlList.map(b => (
                <div key={b.id} className="flex items-center gap-4 p-4 rounded-xs border border-red-700/30 bg-red-500/5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold num-mono text-red-400">{b.batchId}</span>
                      <span className="text-sm text-ink-100">{b.supplier}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-ink-500 num-mono flex-wrap">
                      <span>수신: {b.receivedAt}</span>
                      {b.confidence !== undefined && (
                        <span className={clsx(
                          b.confidence >= 0.9 ? 'text-emerald-500' :
                          b.confidence >= 0.7 ? 'text-amber-500' : 'text-red-500'
                        )}>
                          신뢰도 {Math.round(b.confidence * 100)}%
                        </span>
                      )}
                      {b.assignedTo && <span className="text-ink-400">담당: {b.assignedTo}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={destMeta[b.destination]?.tone} size="sm">{b.destination}</Badge>
                    <Link
                      href="/hitl"
                      className="flex items-center gap-1 text-[11px] text-accent-400 hover:text-accent-300 border border-accent-700/30 bg-accent-700/10 px-2 py-1 rounded-xs transition-colors"
                    >
                      검토 <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
