// 탭 스타일: border-b-2 방식 (app/suppliers/[id]/layout.tsx 참고)

'use client';

import { useEffect, useState } from 'react';
import {
  suppliers,
} from '@/lib/data';
import {
  getDashboardKpis, getRegulationResults, getDashboardSupplierStats,
  type DashboardKpis, type RegulationResult, type DashboardSupplierStats,
} from '@/lib/api';
import {
  supplierRiskProfiles, supplierCompleteness, getSupplierName,
} from '@/lib/supplier-detail-data';
import {
  AlertTriangle, CheckCircle2, ShieldAlert,
  ArrowRight, Activity, Bot, FileText, Bell, CalendarDays, ChevronDown,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import HitlReviewCard from '@/components/dashboard/HitlReviewCard';
import NotificationFeed from '@/components/notifications/NotificationFeed';
import { PRIME_DEEP_LINK_ROUTE } from '@/components/prime/PrimeNotificationBell';
import Link from 'next/link';
import clsx from 'clsx';

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
      <div className="flex items-start gap-3">
        <div className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', iconClass)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-current">{label}</div>
          {hint && <div className="mt-0.5 text-xs text-ink-500">{hint}</div>}
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold leading-none tracking-tight num-mono text-ink-100">{value}</span>
            {unit && <span className="text-xs font-medium text-ink-500">{unit}</span>}
          </div>
        </div>
      </div>
      {/* 추세 블록은 실제 전월 대비(delta)가 주어질 때만 렌더 — 근거 없는 '지난달 대비'·스파크라인 표시 방지. */}
      {delta && (
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <div className={clsx('text-xs font-semibold num-mono', deltaGood ? 'text-ok-text' : 'text-alert-text')}>
              {deltaDirection === 'up' ? '▲' : '▼'} {delta}
            </div>
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
      )}
    </Component>
  );
}

function DashboardSupplyChainMap() {
  const todayTasks = [
    { rank: 1, title: '검토 대기', desc: '제출된 자료를 검토해주세요.', level: '높음', count: '8건', href: '/suppliers/check-info' },
    { rank: 2, title: '보완 요청', desc: '공급사로부터 추가 자료가 필요합니다.', level: '높음', count: '3건', href: '/my-task' },
    { rank: 3, title: '인증서 만료 임박', desc: '30일 이내 만료되는 인증서가 있습니다.', level: '중간', count: '5건', href: '/suppliers/check-info' },
    { rank: 4, title: '실사 필요', desc: '고위험 공급사 중 실사가 필요합니다.', level: '중간', count: '4건', href: '/suppliers/check-info' },
    { rank: 5, title: '담당자 검토 대기', desc: 'AI 검토가 완료되어 최종 확인이 필요합니다.', level: '낮음', count: '2건', href: '/dashboard?tab=hitl-queue' },
  ];

  const regulationBySupplier: Record<string, string> = {
    'S-MINE-002': 'OECD 광물 실사',
    'S-REF-002':  'UFLPA',
    'S-CAM-002':  'CSDDD 실사',
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
        type: regulationBySupplier[r.supplierId] ?? 'EU 배터리법',
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
export default function DashboardPage() {  const [apiKpis, setApiKpis] = useState<DashboardKpis | null>(null);
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
    getDashboardKpis().then(setApiKpis).catch(e => console.error('[dashboard] getDashboardKpis 실패', e));
    // 실패 원인(401/404/500 등)을 콘솔에 남긴다 — 조용히 삼키면 'AI 데이터 안 옴'이 왜인지 알 수 없다.
    getRegulationResults().then(setRegResults).catch(e => console.error('[dashboard] getRegulationResults 실패', e));
    getDashboardSupplierStats().then(setSupplierStats).catch(e => console.error('[dashboard] getDashboardSupplierStats 실패', e));
  }, []);

  // ── AI 규제 인사이트 집계 (per-건 compliance_results → 대시보드 집계 + 최우선 스포트라이트) ──
  // AI 최소 단위는 "자재×규제" 판정. 대시보드는 전체라, 단일 통합 판정인 척하지 않고
  // "전체 N건 집계 + 가장 시급한 1건" 형태로 표현한다(고유명사·수치 전부 데이터 기반).
  // verdict 심각도: violation(확정 위반) > reject(판정 불가·검토) > warning/gray(경고) > passed.
  const verdictSeverity = (v: string | null): number => {
    const s = (v ?? '').toLowerCase();
    if (s.includes('violation')) return 3;
    if (s.includes('reject')) return 2;
    if (s.includes('warning') || s.includes('gray')) return 1;
    return 0;
  };
  const verdictKo = (v: string | null): string => {
    const s = (v ?? '').toLowerCase();
    if (s.includes('violation')) return '위반';
    if (s.includes('reject')) return '판정 불가';
    if (s.includes('warning') || s.includes('gray')) return '경고';
    if (s.includes('pass')) return '적합';
    return v ?? '-';
  };
  // 마감(SLA) 임박 배지 — 위험 심각도와 다른 축이라 랭킹엔 안 섞고 배지로만 병행 표시. 14일 이내(초과 포함)만.
  // regRiskSorted는 클라 fetch 후에만 렌더되므로(초기 null=로딩) Date 사용에 하이드레이션 문제 없음.
  const regLoaded = regResults !== null;                          // null=미로드, []=결과 없음
  const regTotal = regResults?.length ?? 0;
  const regRiskSorted = (regResults ?? [])
    .filter(r => verdictSeverity(r.verdict) > 0)
    .sort((a, b) =>
      verdictSeverity(b.verdict) - verdictSeverity(a.verdict) ||
      Number(b.needsHumanReview) - Number(a.needsHumanReview));
  const regViolationCount = regRiskSorted.filter(r => (r.verdict ?? '').toLowerCase().includes('violation')).length;
  const regWarningCount = regRiskSorted.filter(r => verdictSeverity(r.verdict) === 1).length;
  const regReviewCount = (regResults ?? []).filter(r => r.needsHumanReview).length;
  const topRisk = regRiskSorted[0] ?? null;                       // 가장 시급한 1건(스포트라이트)
  const topReason = topRisk?.reasoningText
    ? (topRisk.reasoningText.length > 80 ? `${topRisk.reasoningText.slice(0, 80)}…` : topRisk.reasoningText)
    : '';
  const riskCountLabel = `위반 ${regViolationCount} · 경고 ${regWarningCount}${regReviewCount > 0 ? ` · 검토 필요 ${regReviewCount}` : ''}`;

  // 탭별 데이터 필터링
  const missingFieldCount = supplierStats?.incompleteCount ?? supplierCompleteness.reduce((sum, item) => sum + item.missingFields.length, 0);
  const highRiskSuppliers = supplierStats?.highRiskCount ?? suppliers.filter(s => s.risk === 'high' || s.risk === 'critical').length;

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
          </>
        }
      />

      {/* ══════════════════════════════════════════════════════════
          Overview
      ══════════════════════════════════════════════════════════ */}
        <div className="space-y-2 bg-slate-50 p-6">
          <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <CompactMetric label="데이터 완성도" value={supplierStats ? supplierStats.averageCompleteness : '—'} unit="%" icon={Activity} tone="ok" hint="협력사 평균 데이터 완성도" />
            <CompactMetric label="고위험 협력사" value={highRiskSuppliers} icon={ShieldAlert} tone="alert" hint="리스크 협력사 수" />
            <CompactMetric label="입력 미완료" value={missingFieldCount} icon={FileText} tone="warn" hint="필수 정보 미완료 협력사 수" />
            <CompactMetric label="규제 통과율" value={apiKpis ? apiKpis.compliancePassRate : '—'} unit="%" icon={CheckCircle2} tone="ok" hint="AI 규제 판정 통과율" />
          </section>

          <div className="flex items-start gap-3 rounded-sm border border-ink-700 bg-white px-4 py-3">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
            <p className="min-w-0 text-sm">
              <span className="font-bold text-ink-200">AI 인사이트</span>{' '}
              {!regLoaded ? (
                <span className="text-ink-500">{' '}공급망 규제 분석을 불러오는 중…</span>
              ) : regRiskSorted.length === 0 ? (
                <span className="text-ink-500">AI 규제 검증 {regTotal}건 중 위험으로 판정된 건이 없습니다.</span>
              ) : (
                <span className="text-ink-500 mt-1 block">
                  AI 규제 검증 {regTotal}건 중 위험 {regRiskSorted.length}건({riskCountLabel}).
                  {topRisk && (
                    <span className="mt-1 block">가장 시급: <span className="font-semibold text-ink-200">{topRisk.supplierName ?? '협력사'}</span>
                      의 {topRisk.regulation ?? topRisk.citedClauses[0] ?? '규제'} {verdictKo(topRisk.verdict)}
                      {topReason ? ` — ${topReason}` : ''}.</span>
                  )}
                </span>
              )}
            </p>
            {regRiskSorted.length > 0 && (
              <Link href="/my-task?tab=hitl" className="ml-auto shrink-0 self-center text-xs font-semibold text-accent-700">전체 보기</Link>
            )}
          </div>

          {/* 협력사 활동 알림 — 대시보드에서 바로 확인 (제출·동의·초대 등) */}
          <NotificationFeed
            audience="prime"
            deepLinkMap={PRIME_DEEP_LINK_ROUTE}
            fallbackRoute="/my-task"
            limit={4}
          />

          <HitlReviewCard />

          <DashboardSupplyChainMap />
        </div>
    </>
  );
}
