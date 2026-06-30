// [작업 4 — 대시보드 탭 구조 추가]
// 변경 사항:
// 1. 페이지 최상단에 탭 네비게이션 추가 (Overview / High Risk / Pending / HITL Queue)
// 2. Overview 탭 — 기존 대시보드 내용 그대로 유지
// 3. High Risk 탭 — supplierRiskProfiles에서 high/critical 협력사 목록
// 4. Pending 탭 — supplierCompleteness에서 completionRate < 80 목록 + SLA 초과 여부
// 5. HITL Queue 탭 — batchesInProgress에서 currentStage === 'hitl-wait' 목록
// 탭 스타일: border-b-2 방식 (app/suppliers/[id]/layout.tsx 참고)

'use client';

import { useEffect, useState } from 'react';
import {
  violationsByRegulation,
  suppliers,
} from '@/lib/data';
import {
  getDashboardKpis, getBatches, getRegulationResults, getDashboardSupplierStats,
  type DashboardKpis, type BatchItem, type BatchesResponse, type RegulationResult, type DashboardSupplierStats,
} from '@/lib/api';
import {
  supplierRiskProfiles, supplierCompleteness, getSupplierName,
} from '@/lib/supplier-detail-data';
import {
  AlertTriangle, CheckCircle2, ShieldAlert,
  ArrowRight, Activity, AlertCircle, Bot, FileText, Bell, CalendarDays, ChevronDown,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import HitlReviewCard from '@/components/dashboard/HitlReviewCard';
import Link from 'next/link';
import clsx from 'clsx';


const stageMeta: Record<string, { label: string; color: string }> = {
  queued:         { label: '대기',         color: 'text-ink-400' },
  supervisor:     { label: '조율',         color: 'text-info-text' },
  extraction:     { label: '추출',         color: 'text-info-text' },
  verification:   { label: '검증',         color: 'text-warn-text' },
  'geo-analysis': { label: 'Geo',          color: 'text-purple-400' },
  compliance:     { label: '컴플라이언스', color: 'text-warn-text' },
  readiness:      { label: '준비도',       color: 'text-teal-400' },
  'hitl-wait':    { label: 'HITL 대기',    color: 'text-alert-text' },
  action:         { label: '처리',         color: 'text-ok-text' },
  completed:      { label: '완료',         color: 'text-ok-text' },
  rejected:       { label: '반려',         color: 'text-alert-text' },
};

const destMeta: Record<string, { label: string; tone: any }> = {
  US: { label: 'US', tone: 'warn' },
  EU: { label: 'EU', tone: 'ok' },
  KR: { label: 'KR', tone: 'neutral' },
};


const supplierStatusMeta = {
  verified: { label: '검증 완료', className: 'border-ok-border bg-ok-bg text-ok-text' },
  pending: { label: '자료 대기', className: 'border-info-border bg-info-bg text-info-text' },
  review: { label: '추가 확인', className: 'border-warn-border bg-warn-bg text-warn-text' },
  violation: { label: '규제 위반', className: 'border-alert-border bg-alert-bg text-alert-text' },
};

// ── DB stage/status → UI stage 매핑 ─────────────────────────────
const DB_STAGE_UI: Record<string, string> = {
  stage_queued: 'queued',
  stage_extraction: 'extraction',
  stage_verification: 'verification',
  stage_geo: 'geo-analysis',
  stage_compliance: 'compliance',
  stage_risk: 'compliance',
  stage_readiness: 'readiness',
  stage_issuance: 'action',
};

interface UiBatch {
  id: string; batchId: string; supplier: string;
  receivedAt: string; destination: string;
  currentStage: string; confidence?: number; assignedTo?: string;
}

function flattenBatchesResponse(res: BatchesResponse): UiBatch[] {
  const out: UiBatch[] = [];
  for (const list of Object.values(res.byStage)) {
    for (const b of list) {
      let stage: string;
      if (b.status === 'batch_hitl_wait') stage = 'hitl-wait';
      else if (b.status === 'batch_completed') stage = 'completed';
      else if (b.status === 'batch_rejected') stage = 'rejected';
      else stage = DB_STAGE_UI[b.currentStage] ?? 'queued';
      out.push({
        id: b.batchId,
        batchId: b.externalId ?? b.batchId.slice(0, 12),
        supplier: b.externalId ?? '-',
        receivedAt: b.receivedAt?.slice(0, 16).replace('T', ' ') ?? '-',
        destination: b.destination ?? 'EU',
        currentStage: stage,
        confidence: b.confidenceScore ?? undefined,
      });
    }
  }
  return out;
}

// ── 탭 정의 ──────────────────────────────────────────────────────
type TabKey = 'overview';


function CompactMetric({
  label,
  value,
  unit,
  icon: Icon,
  tone = 'default',
  hint,
  delta,
  deltaGood = true,
  deltaDirection = 'up',
  onClick,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: any;
  tone?: 'default' | 'ok' | 'warn' | 'alert' | 'info';
  hint?: string;
  delta?: string;
  deltaGood?: boolean;
  deltaDirection?: 'up' | 'down';
  onClick?: () => void;
}) {
  const toneClass = {
    default: 'border-ink-700 bg-white text-ink-100',
    ok: 'border-ok-border bg-ok-bg text-ok-text',
    warn: 'border-warn-border bg-warn-bg text-warn-text',
    alert: 'border-alert-border bg-alert-bg text-alert-text',
    info: 'border-info-border bg-info-bg text-info-text',
  }[tone];

  const iconClass = {
    default: 'bg-slate-100 text-slate-700',
    ok: 'bg-ok-bg text-ok-text',
    warn: 'bg-warn-bg text-warn-text',
    alert: 'bg-alert-bg text-alert-text',
    info: 'bg-info-bg text-info-text',
  }[tone];

  const graphColor = {
    default: '#64748B',
    ok: '#059669',
    warn: '#F59E0B',
    alert: '#EF4444',
    info: '#2563EB',
  }[tone];

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'min-h-[120px] rounded-sm border p-4 text-left shadow-control transition-colors',
        toneClass,
        onClick && 'hover:border-accent-600 hover:shadow-panel',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', iconClass)}>
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-current">{label}</div>
          {hint && <div className="mt-0.5 text-xs text-ink-500">{hint}</div>}
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold leading-none tracking-tight num-mono text-ink-100">{value}</span>
            {unit && <span className="text-xs font-medium text-ink-500">{unit}</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          {delta && (
            <div className={clsx('text-xs font-semibold num-mono', deltaGood ? 'text-ok-text' : 'text-alert-text')}>
              {deltaDirection === 'up' ? '▲' : '▼'} {delta}
            </div>
          )}
          <div className="mt-0.5 text-xs text-ink-500">지난달 대비</div>
        </div>
        <svg width="76" height="28" viewBox="0 0 76 28" className="shrink-0">
          <path
            d={
              deltaDirection === 'up'
                ? 'M2 24 C10 17 14 19 20 15 S31 18 37 10 48 12 55 7 66 8 74 2'
                : 'M2 5 C10 10 15 8 21 13 S33 10 39 17 49 15 56 21 66 20 74 25'
            }
            fill="none"
            stroke={graphColor}
            strokeWidth="2"
          />
        </svg>
      </div>
    </Component>
  );
}

function DashboardSupplyChainMap() {
  const todayTasks = [
    { rank: 1, title: '검토 대기', desc: '제출된 자료를 검토해주세요.', level: '높음', count: '8건', href: '/suppliers/check-info' },
    { rank: 2, title: '보완 요청', desc: '공급사로부터 추가 자료가 필요합니다.', level: '높음', count: '3건', href: '/my-task' },
    { rank: 3, title: '인증서 만료 임박', desc: '30일 이내 만료되는 인증서가 있습니다.', level: '중간', count: '5건', href: '/suppliers/check-info' },
    { rank: 4, title: '실사 필요', desc: '고위험 공급사 중 실사가 필요합니다.', level: '중간', count: '4건', href: '/suppliers/check-info' },
    { rank: 5, title: 'HITL 검토 대기', desc: 'AI 검토가 완료되어 최종 확인이 필요합니다.', level: '낮음', count: '2건', href: '/dashboard?tab=hitl-queue' },
  ];

  const regulationBySupplier: Record<string, string> = {
    'S-MINE-002': 'OECD 광물 실사',
    'S-REF-002':  'IRA FEOC',
    'S-CAM-002':  'IRA FEOC',
    'S-PRE-001':  'EU 배터리법 Art.47',
    'S-MINE-001': 'EU Battery Regulation',
  };

  const supplyAlerts = supplierRiskProfiles
    .filter(r => r.overallRiskScore >= 50)
    .sort((a, b) => b.overallRiskScore - a.overallRiskScore)
    .slice(0, 4)
    .map(r => {
      const sup = suppliers.find(s => s.id === r.supplierId);
      const name = getSupplierName(r.supplierId);
      return {
        key: r.supplierId,
        name: name?.shortNameEn ?? sup?.name ?? r.supplierId,
        tier: sup?.tier ?? 0,
        country: sup?.country ?? '',
        risk: r.riskLevel,
        issue: r.highRiskReasons[0] ?? '위험 요인 검토 필요',
        type: regulationBySupplier[r.supplierId] ?? (r.feocStatus !== 'eligible' ? 'IRA FEOC' : 'EU 배터리법'),
      };
    });

  const alertDot: Record<string, string> = { critical: 'bg-alert-solid', high: 'bg-alert-solid', medium: 'bg-warn-solid', low: 'bg-ok-solid' };
  const alertBadge: Record<string, string> = {
    critical: 'border-alert-border bg-alert-bg text-alert-text',
    high: 'border-alert-border bg-alert-bg text-alert-text',
    medium: 'border-warn-border bg-warn-bg text-warn-text',
    low: 'border-ok-border bg-ok-bg text-ok-text',
  };
  const alertLabel: Record<string, string> = { critical: '긴급', high: '고위험', medium: '주의', low: '저위험' };

  return (
    <section className="space-y-2">
      {/* Row 1: 오늘의 할 일 | 공급망 위험 알림 (표) */}
      <div className="grid grid-cols-2 items-stretch gap-2">
        <DashboardPanel title="오늘의 할 일" action="전체 보기" actionHref="/my-task">
          {todayTasks.slice(0, 4).map(task => (
            <TaskRow key={task.rank} task={task} />
          ))}
        </DashboardPanel>

        <DashboardPanel title="공급망 위험 알림" action="공급망 맵 바로가기" actionHref="/supply-chain/map">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F1F5F9]">
                <th className="px-[13px] py-2 text-left text-xs font-semibold text-ink-500">공급사</th>
                <th className="py-2 text-left text-xs font-semibold text-ink-500">위험도</th>
                <th className="py-2 text-left text-xs font-semibold text-ink-500">조치 필요 사항</th>
                <th className="py-2 text-left text-xs font-semibold text-ink-500">규정</th>
                <th className="px-[13px] py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {supplyAlerts.map(alert => (
                <tr
                  key={alert.key}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => window.location.href = '/supply-chain/map'}
                >
                  <td className="py-[9px] pl-[13px] pr-4">
                    <div className="flex items-center gap-2">
                      <div className={clsx('h-2 w-2 shrink-0 rounded-full', alertDot[alert.risk])} />
                      <div>
                        <div className="text-sm font-semibold text-ink-100">{alert.name}</div>
                        <div className="text-xs text-ink-500">T{alert.tier} · {alert.country}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-[9px] pr-4">
                    <span className={clsx('rounded-xs border px-1.5 py-0.5 text-xs font-semibold', alertBadge[alert.risk])}>
                      {alertLabel[alert.risk]}
                    </span>
                  </td>
                  <td className="py-[9px] pr-4 text-xs text-ink-400">{alert.issue}</td>
                  <td className="py-[9px] pr-4 text-xs text-ink-500">{alert.type}</td>
                  <td className="py-[9px] pr-[13px]">
                    <ChevronDown className="h-4 w-4 -rotate-90 text-ink-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashboardPanel>
      </div>

    </section>
  );
}

function DashboardPanel({
  title,
  action,
  actionHref,
  children,
  className,
}: {
  title: string;
  action?: string;
  actionHref?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('flex h-full flex-col rounded-none border border-[#E2E8F0] bg-white', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-[13px] py-[10px]">
          {title ? <h2 className="text-[12px] font-semibold text-ink-100">{title}</h2> : <span />}
          {action && actionHref ? (
            <Link href={actionHref} className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-700 hover:text-accent-600">
              {action} <ArrowRight className="h-3 w-3" />
            </Link>
          ) : action ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-700">
              {action} <ArrowRight className="h-3 w-3" />
            </span>
          ) : null}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </section>
  );
}

function TaskRow({ task }: { task: { rank: number; title: string; desc: string; level: string; count: string; href: string } }) {
  const countBg = task.level === '높음' ? 'bg-alert-bg text-alert-text' : task.level === '중간' ? 'bg-warn-bg text-warn-text' : 'bg-purple-50 text-purple-600';

  return (
    <Link href={task.href} className="flex items-center gap-3 border-b border-[#F1F5F9] last:border-0 rounded-none px-[13px] py-[9px] hover:bg-slate-50 transition-colors">
      <span className="w-5 shrink-0 text-center text-sm font-bold text-ink-500">{task.rank}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink-100">{task.title}</div>
        <div className="mt-0.5 truncate text-xs text-ink-500">{task.desc}</div>
      </div>
      <span className={clsx('shrink-0 rounded-xs px-2 py-0.5 text-xs font-semibold num-mono', countBg)}>{task.count}</span>
      <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-ink-500" />
    </Link>
  );
}


// ── 메인 페이지 ────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activeTab] = useState<TabKey>('overview');
  const [apiKpis, setApiKpis] = useState<DashboardKpis | null>(null);
  const [apiBatches, setApiBatches] = useState<UiBatch[]>([]);
  // 규제검증 결과 — regulation 도메인. null=미로드, []=결과 없음.
  const [regResults, setRegResults] = useState<RegulationResult[] | null>(null);
  const [supplierStats, setSupplierStats] = useState<DashboardSupplierStats | null>(null);
  // 헤더 오늘 날짜 — 마운트 후 클라에서 세팅(정적 프리렌더와 하이드레이션 불일치 방지).
  const [today, setToday] = useState('');
  useEffect(() => {
    const d = new Date();
    setToday(`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`);
  }, []);

  useEffect(() => {
    getDashboardKpis().then(setApiKpis).catch(() => {});
    Promise.all([getBatches('processing'), getBatches('hitl_wait')]).then(([p, h]) => {
      setApiBatches([...flattenBatchesResponse(p), ...flattenBatchesResponse(h)]);
    }).catch(() => {});
    getRegulationResults().then(setRegResults).catch(() => {});
    getDashboardSupplierStats().then(setSupplierStats).catch(() => {});
  }, []);


  const hitlWaiting = apiKpis?.hitlWaitBatches ?? apiBatches.filter(b => b.currentStage === 'hitl-wait').length;
  // 규제 위반 케이스 — verdict가 violation/reject인 것만. 미로드 시 mock 폴백.
  const apiViolations = regResults?.filter(r => r.verdict === 'violation' || r.verdict === 'reject') ?? null;
  const euViolations = apiViolations
    ? apiViolations.filter(r => r.citedClauses.some(c => c.includes('EU') || c.includes('EUDR') || c.includes('배터리'))).length
    : violationsByRegulation.filter(v => v.region === 'EU' || v.region === 'DE').reduce((s, v) => s + v.count, 0);
  const usViolations = apiViolations
    ? apiViolations.filter(r => r.citedClauses.some(c => c.includes('IRA') || c.includes('UFLPA') || c.includes('US'))).length
    : violationsByRegulation.filter(v => v.region === 'US').reduce((s, v) => s + v.count, 0);

  // 탭별 데이터 필터링
  const highRiskList = supplierRiskProfiles.filter(
    r => r.riskLevel === 'high' || r.riskLevel === 'critical'
  );
  const pendingList = supplierCompleteness.filter(c => c.completionRate < 80);
  const hitlList = apiBatches.filter(b => b.currentStage === 'hitl-wait');
  const missingFieldCount = supplierStats?.incompleteCount ?? supplierCompleteness.reduce((sum, item) => sum + item.missingFields.length, 0);
  const verifiedSuppliers = supplierStats?.verifiedCount ?? suppliers.filter(s => s.status === 'verified').length;
  const highRiskSuppliers = supplierStats?.highRiskCount ?? suppliers.filter(s => s.risk === 'high' || s.risk === 'critical').length;
  const averageCompleteness = supplierStats?.averageCompleteness ?? Math.round(
    supplierCompleteness.reduce((sum, item) => sum + item.completionRate, 0) / supplierCompleteness.length
  );

  return (
    <>
      <PageHeader
        title="대시보드"
        description="KIRA Battery Traceability Platform"
        actions={
          <>
            <div className="flex items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-medium text-ink-400">
              <span className="num-mono">{today}</span>
              <CalendarDays className="h-3.5 w-3.5" />
            </div>
            <button className="relative flex h-8 w-8 items-center justify-center rounded-xs border border-ink-700 bg-white text-ink-400">
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-alert-solid text-xs font-semibold text-white">3</span>
            </button>
            <button className="flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-semibold text-ink-400 hover:border-accent-600 hover:text-accent-700">
              전체 공급망
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </>
        }
      />

      {/* ══════════════════════════════════════════════════════════
          탭 1 — Overview (기존 대시보드 내용 그대로)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-2 bg-slate-50 p-6">
          <section className="grid grid-cols-5 gap-2">
            <CompactMetric label="Traceability Coverage" value={92} unit="%" icon={Activity} tone="ok" hint="원산지 추적 가능 비율" delta="7%" deltaGood />
            <CompactMetric label="High Risk Region" value={highRiskSuppliers + 16} icon={ShieldAlert} tone="alert" hint="고위험 지역 연결 업체" delta="3" deltaGood={false} deltaDirection="up" />
            <CompactMetric label="Missing Documents" value={missingFieldCount} icon={FileText} tone="warn" hint="원산지/인증 문서 누락 업체" delta="5" deltaGood deltaDirection="down" />
            <CompactMetric label="Due Diligence Alerts" value={(apiKpis?.rejectedBatches ?? 0) + hitlWaiting + 3} icon={AlertTriangle} tone="alert" hint="EUDR/CSDDD 검토 필요 건수" delta="2" deltaGood deltaDirection="down" />
            <CompactMetric label="ESG Compliance Score" value="84.2" icon={CheckCircle2} tone="ok" hint="규제 대응 종합 점수" delta="4.3" deltaGood />
          </section>

          <div className="flex items-center gap-3 rounded-sm border border-ink-700 bg-white px-4 py-3">
            <Bot className="h-4 w-4 shrink-0 text-ink-400" />
            <span className="text-sm font-bold text-ink-200">AI 인사이트</span>
            <span className="text-sm text-ink-500">
              고위험 협력사 {highRiskSuppliers}개사와 누락 문서 {missingFieldCount}건이 규제 대응 및 통관 적합성에 영향을 줍니다. Katanga Cobalt, Ganzhou Rare Metals를 우선 확인하세요.
            </span>
          </div>

          {/* 협력사 승인(HITL) — 협력사 제출 자료를 AI가 파싱하고 사람이 검증·승인 */}
          <HitlReviewCard />

          <DashboardSupplyChainMap />

          <section className="hidden">
            <div className="rounded-sm border border-ink-700 bg-white shadow-control">
              <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink-100">협력사 현황</h2>
                  <p className="mt-0.5 text-xs text-ink-500">상태, 국가, 티어, 데이터 완성도</p>
                </div>
                <Link href="/suppliers" className="text-xs font-semibold text-accent-700">전체 보기</Link>
              </div>
              <div className="px-4 py-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-ink-700 text-left text-xs font-semibold text-ink-500">
                      <th className="pb-2">업체명</th>
                      <th className="pb-2">국가</th>
                      <th className="pb-2">상태</th>
                      <th className="pb-2 text-right">완성도</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-700/70">
                    {suppliers.slice(0, 6).map(supplier => {
                      const name = getSupplierName(supplier.id);
                      const completeness = supplierCompleteness.find(item => item.supplierId === supplier.id)?.completionRate ?? 100;
                      const status = supplierStatusMeta[supplier.status];
                      return (
                        <tr key={supplier.id}>
                          <td className="py-2 pr-3">
                            <Link href={`/suppliers/${supplier.id}/info`} className="font-semibold text-ink-100 hover:text-accent-700">
                              {name?.shortNameEn ?? supplier.name}
                            </Link>
                            <div className="mt-0.5 text-xs text-ink-500">T{supplier.tier} · {supplier.role}</div>
                          </td>
                          <td className="py-2 pr-3 text-ink-400 num-mono">{supplier.country}</td>
                          <td className="py-2 pr-3">
                            <span className={clsx('inline-flex rounded-xs border px-1.5 py-0.5 text-xs font-semibold', status.className)}>
                              {status.label}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            <span className="font-semibold text-ink-200 num-mono">{completeness}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-sm border border-ink-700 bg-white shadow-control">
              <div className="border-b border-ink-700 px-4 py-3">
                <h2 className="text-sm font-semibold text-ink-100">컴플라이언스 상태</h2>
                <p className="mt-0.5 text-xs text-ink-500">규제/문서/리스크 완료율</p>
              </div>
              <div className="p-4">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-[14px] border-ok-border border-r-blue-500 bg-white">
                  <div className="text-center">
                    <div className="text-xs font-semibold text-ink-500">종합</div>
                    <div className="text-2xl font-semibold text-ink-100 num-mono">82%</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    { label: '원산지 추적', value: 92, color: 'bg-ok-solid' },
                    { label: 'Due Diligence', value: 81, color: 'bg-info-solid' },
                    { label: '문서 검증', value: averageCompleteness, color: 'bg-purple-500' },
                    { label: 'Risk Assessment', value: 79, color: 'bg-warn-solid' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-medium text-ink-200">{item.label}</span>
                        <span className="font-semibold text-ink-100 num-mono">{item.value}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-ink-700">
                        <div className={clsx('h-full rounded-full', item.color)} style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-ink-700 bg-white shadow-control">
              <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink-100">AI 공급망 인사이트</h2>
                  <p className="mt-0.5 text-xs text-ink-500">오늘 우선순위 요약</p>
                </div>
                <Bot className="h-4 w-4 text-accent-700" />
              </div>
              <div className="p-4">
                <div className="rounded-sm border border-accent-100 bg-accent-50 p-3">
                  <p className="text-sm leading-6 text-ink-100">
                    고위험 협력사 {highRiskSuppliers}개사와 누락 문서 {missingFieldCount}건이 규제 대응 및 통관 적합성에 영향을 줍니다.
                    Katanga Cobalt, Ganzhou Rare Metals를 우선 확인하세요.
                  </p>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { label: '우선 조치', value: '원산지 증빙 재요청', tone: 'text-alert-text' },
                    { label: '검토 포인트', value: 'FEOC / UFLPA 교차 확인', tone: 'text-warn-text' },
                    { label: '다음 화면', value: '입력 요청 맵 미제출 필터', tone: 'text-accent-700' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2 rounded-xs border border-ink-700 bg-ink-800 px-3 py-2">
                      <AlertCircle className={clsx('h-3.5 w-3.5', item.tone)} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink-500">{item.label}</div>
                        <div className="truncate text-xs font-semibold text-ink-100">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="hidden">
            <div className="rounded-sm border border-ink-700 bg-white shadow-control">
              <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
                <h2 className="text-sm font-semibold text-ink-100">공급망 활동 타임라인</h2>
                <Link href="/my-task" className="text-xs font-semibold text-accent-700">전체 보기</Link>
              </div>
              <div className="px-4 py-2">
                {[
                  { time: '09:30', title: 'FSC 인증 만료 감지', desc: 'Ganzhou Rare Metals 증빙 보완 필요', tone: 'bg-ok-solid', pill: 'Ganzhou Rare' },
                  { time: '10:18', title: 'HITL 검토 대기', desc: 'Quzhou Precursor 원산지 증빙 검토', tone: 'bg-info-solid', pill: 'Quzhou' },
                  { time: '11:05', title: '리튬 정제 자료 추출 완료', desc: 'Pilbara Refining Works 자동 처리', tone: 'bg-purple-500', pill: 'Pilbara' },
                  { time: '11:20', title: '고위험 지역 Alert 발생', desc: 'FEOC / UFLPA 교차 확인 필요', tone: 'bg-alert-solid', pill: 'Ganzhou' },
                  { time: '14:05', title: '공급망 변경 감지', desc: '신규 하위 공급업체 추가', tone: 'bg-warn-solid', pill: 'POS Cathode' },
                ].map(item => (
                  <div key={`${item.time}-${item.title}`} className="flex gap-3 border-b border-ink-700/70 py-2.5 last:border-0">
                    <span className="w-10 shrink-0 text-xs font-semibold leading-4 text-ink-500 num-mono">{item.time}</span>
                    <div className="flex flex-col items-center">
                      <span className={clsx('h-2.5 w-2.5 rounded-full', item.tone)} />
                      <span className="h-full w-px bg-ink-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-semibold text-ink-100">{item.title}</span>
                        <span className="rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700">{item.pill}</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-ink-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-sm border border-ink-700 bg-white shadow-control">
              <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
                <h2 className="text-sm font-semibold text-ink-100">고위험 국가/지역 현황</h2>
                <Link href="/supply-chain/map" className="text-xs font-semibold text-accent-700">전체 보기</Link>
              </div>
              <div className="p-4">
                <div className="rounded-sm border border-ink-700 bg-white">
                  <div className="grid grid-cols-[0.7fr_1fr_0.9fr_0.9fr] border-b border-ink-700 px-3 py-2 text-xs font-semibold text-ink-500">
                    <span>국가/지역</span>
                    <span>위험도</span>
                    <span className="text-right">연결 업체</span>
                    <span className="text-right">변동</span>
                  </div>
                  <div className="divide-y divide-ink-700 text-xs">
                  {[
                    { country: 'CN', label: '중국·신장/간저우', risk: '고위험', reason: 'FEOC / UFLPA 검토', count: 12, change: '▲ 3', color: 'text-alert-text', dot: 'bg-alert-solid' },
                    { country: 'CD', label: '콩고·카탕가', risk: '고위험', reason: '분쟁광물 실사 필요', count: 8, change: '▲ 1', color: 'text-alert-text', dot: 'bg-alert-solid' },
                    { country: 'ID', label: '인도네시아·술라웨시', risk: '중위험', reason: '니켈 원산지 보완', count: 5, change: '▼ 1', color: 'text-warn-text', dot: 'bg-warn-solid' },
                    { country: 'AU', label: '호주·필바라', risk: '저위험', reason: '리튬 정제 검증 완료', count: 3, change: '0', color: 'text-ok-text', dot: 'bg-ok-solid' },
                  ].map(item => (
                    <div key={item.country} className="grid grid-cols-[0.7fr_1fr_0.9fr_0.9fr] items-center px-3 py-2">
                      <div>
                        <div className="font-semibold text-ink-100 num-mono">{item.country}</div>
                        <div className="mt-0.5 text-xs text-ink-500">{item.label}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={clsx('h-2 w-2 rounded-full', item.dot)} />
                          <span className={clsx('font-semibold', item.color)}>{item.risk}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-ink-500">{item.reason}</div>
                      </div>
                      <span className="text-right font-semibold num-mono text-ink-100">{item.count}개사</span>
                      <span className={clsx('text-right font-semibold num-mono', item.color)}>{item.change}</span>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-ink-700 bg-white shadow-control">
              <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
                <h2 className="text-sm font-semibold text-ink-100">문서 현황 요약</h2>
                <Link href="/submission-status" className="text-xs font-semibold text-accent-700">전체 보기</Link>
              </div>
              <div className="grid grid-cols-[0.82fr_1fr] gap-4 p-4">
                <div className="flex items-center justify-center">
                  <div
                    className="flex h-32 w-32 items-center justify-center rounded-full"
                    style={{ background: 'conic-gradient(#22C55E 0 52%, #8B5CF6 52% 73%, #3B82F6 73% 88%, #CBD5E1 88% 100%)' }}
                  >
                    <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white text-center shadow-control">
                      <span className="text-xs font-semibold text-ink-500">전체 문서</span>
                      <span className="text-xl font-semibold text-ink-100 num-mono">1,248</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: '인증서', value: 642, pct: '51%', color: 'text-ok-text' },
                    { label: '원산지 증빙', value: 342, pct: '27%', color: 'text-info-text' },
                    { label: 'DDS / 보고서', value: 156, pct: '12%', color: 'text-purple-600' },
                    { label: '기타 문서', value: 108, pct: '9%', color: 'text-slate-500' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between rounded-xs border border-ink-700 bg-white px-3 py-2">
                      <span className="text-xs font-semibold text-ink-100">{item.label}</span>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-ink-100 num-mono">{item.value}</span>
                        <span className={clsx('ml-2 text-xs font-semibold', item.color)}>{item.pct}</span>
                      </div>
                    </div>
                  ))}
                  <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-xs border border-alert-border bg-alert-bg px-3 py-2 text-xs font-semibold text-alert-text">
                    <AlertCircle className="h-3.5 w-3.5" />
                    문서 누락: {missingFieldCount}건
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

    </>
  );
}
