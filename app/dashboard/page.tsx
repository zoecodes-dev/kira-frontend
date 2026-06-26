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

import { useEffect, useState } from 'react';
import Badge from '@/components/Badge';
import {
  violationsByRegulation,
  dppRecords, suppliers, productInstances,
} from '@/lib/data';
import {
  getDashboardKpis, getBatches,
  type DashboardKpis, type BatchItem, type BatchesResponse,
} from '@/lib/api';
import {
  supplierRiskProfiles, supplierCompleteness, getRemindLogs, getSupplierName,
} from '@/lib/supplier-detail-data';
import {
  AlertTriangle, CheckCircle2, Clock, ShieldAlert,
  ArrowRight, Activity, AlertCircle, Bot, FileText, Bell, CalendarDays, ChevronDown,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import TabBar from '@/components/TabBar';
import Link from 'next/link';
import clsx from 'clsx';

// ── 공통 상수 ────────────────────────────────────────────────────
const regionColor: Record<string, string> = {
  EU: 'border-info-border bg-info-bg text-info-text',
  US: 'border-warn-border bg-warn-bg text-warn-text',
  DE: 'border-slate-700/30 bg-slate-500/8 text-slate-400',
};

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

const riskLevelLabel: Record<string, string> = {
  low: '저위험', medium: '중위험', high: '고위험', critical: '최고위험',
};
const riskLevelColor: Record<string, string> = {
  low:      'border-ok-border bg-ok-bg text-ok-text',
  medium:   'border-warn-border bg-warn-bg text-warn-text',
  high:     'border-alert-border bg-alert-bg text-alert-text',
  critical: 'border-alert-border bg-alert-bg text-alert-text font-semibold',
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
      <div className="text-xs num-mono text-ink-400 w-24 shrink-0 truncate">{batch.batchId}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-ink-200 truncate">{batch.supplier}</div>
        <div className="text-xs text-ink-500">{batch.receivedAt}</div>
      </div>
      <span className={clsx('text-xs font-medium shrink-0', stage?.color)}>{stage?.label}</span>
      <Badge tone={dest?.tone} size="sm">{dest?.label}</Badge>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-xs border border-dashed border-ink-700/40 py-12 text-[13px] text-ink-500">
      {label}
    </div>
  );
}

function TabTableShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-ink-700 bg-white shadow-control">
      <div className="flex items-start justify-between gap-4 border-b border-ink-700 bg-slate-50 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink-100">{title}</h3>
          {subtitle && <p className="mt-1 text-[13px] leading-5 text-ink-500">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

const tableHeadClass = 'whitespace-nowrap px-4 py-3 text-left text-[13px] font-semibold text-ink-500';
const tableCellClass = 'px-4 py-3 align-middle text-[13px] text-ink-200';
const tableMutedCellClass = 'px-4 py-3 align-middle text-[13px] text-ink-500';

const stageDisplayLabel: Record<string, string> = {
  queued: '대기',
  supervisor: '조율',
  extraction: '추출',
  verification: '검증',
  'geo-analysis': '지역 분석',
  compliance: '규제 검토',
  readiness: '준비도',
  'hitl-wait': 'HITL 대기',
  action: '처리',
  completed: '완료',
  rejected: '반려',
};

const severityDisplayLabel: Record<string, string> = {
  critical: '긴급',
  high: '높음',
  medium: '보통',
};

const feocDisplayLabel: Record<string, string> = {
  eligible: 'FEOC 적격',
  ineligible: 'FEOC 부적격',
  under_review: 'FEOC 검토 중',
  unknown: 'FEOC 미확인',
};

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
    { rank: 4, title: '실사 필요', desc: '고위험 공급사 중 실사가 필요합니다.', level: '중간', count: '4건', href: '/submission-review?tab=dd' },
    { rank: 5, title: 'HITL 검토 대기', desc: 'AI 검토가 완료되어 최종 확인이 필요합니다.', level: '낮음', count: '2건', href: '/hitl' },
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

  const dppStatusPriority: Record<string, number> = { not_started: 0, pending: 1, in_progress: 2, issued: 3 };
  const productMap = new Map<string, { modelName: string; statuses: string[]; count: number }>();
  productInstances.forEach(p => {
    if (!productMap.has(p.productId)) productMap.set(p.productId, { modelName: p.modelName, statuses: [], count: 0 });
    const entry = productMap.get(p.productId)!;
    entry.statuses.push(p.dppStatus);
    entry.count++;
  });
  const products = Array.from(productMap.values()).map(data => {
    const worst = data.statuses.reduce((w, s) => dppStatusPriority[s] < dppStatusPriority[w] ? s : w);
    const meta: Record<string, { label: string; tone: string }> = {
      issued:      { label: '발행 완료', tone: 'success' },
      in_progress: { label: '처리중',   tone: 'warning' },
      pending:     { label: '대기중',   tone: 'warning' },
      not_started: { label: '미시작',   tone: 'danger'  },
    };
    const { label, tone } = meta[worst] ?? meta.not_started;
    return { name: data.modelName, type: `총 ${data.count}건`, status: label, supply: `${data.count}건`, tone, href: '/dpp/center' };
  });

  const changes = [
    { time: '09:21', title: '공급망 경로 변경', desc: 'Battery Pack A > 핵심광물 경로 변경', tag: '공급망', tone: 'success', href: '/supply-chain/map' },
    { time: '08:30', title: '신규 공급사 등록', desc: 'Eco Materials Co., Ltd.', tag: '공급사', tone: 'info', href: '/suppliers/check-info' },
    { time: '07:12', title: '인증서 갱신', desc: 'ISO 14001 한양 제조(주)', tag: '인증서', tone: 'success', href: '/suppliers/check-info' },
    { time: '06:45', title: 'BOM 변경', desc: 'Battery Cell Module v2.1', tag: '제품', tone: 'warning', href: '/materials/regulation-results' },
    { time: '06:10', title: '실사 완료', desc: 'XYZ Metals Co., Ltd.', tag: '실사', tone: 'purple', href: '/submission-review?tab=dd' },
  ];

  const alertDot: Record<string, string> = { critical: 'bg-alert-solid', high: 'bg-alert-solid', medium: 'bg-warn-solid', low: 'bg-ok-solid' };
  const alertBadge: Record<string, string> = {
    critical: 'border-alert-border bg-alert-bg text-alert-text',
    high: 'border-alert-border bg-alert-bg text-alert-text',
    medium: 'border-warn-border bg-warn-bg text-warn-text',
    low: 'border-ok-border bg-ok-bg text-ok-text',
  };
  const alertLabel: Record<string, string> = { critical: '긴급', high: '고위험', medium: '주의', low: '저위험' };

  return (
    <section className="space-y-4">
      {/* Row 1: 오늘의 할 일 | 공급망 위험 알림 (표) */}
      <div className="grid grid-cols-[1fr_1.4fr] gap-4">
        <DashboardPanel title="오늘의 할 일" action="전체 보기" actionHref="/my-task">
          {todayTasks.map(task => (
            <TaskRow key={task.rank} task={task} />
          ))}
        </DashboardPanel>

        <DashboardPanel title="공급망 위험 알림" action="공급망 맵 바로가기" actionHref="/supply-chain/map">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-700/40">
                <th className="pb-2 text-left text-sm font-semibold text-ink-500">공급사</th>
                <th className="pb-2 text-left text-sm font-semibold text-ink-500">위험도</th>
                <th className="pb-2 text-left text-sm font-semibold text-ink-500">조치 필요 사항</th>
                <th className="pb-2 text-left text-sm font-semibold text-ink-500">규정</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/30">
              {supplyAlerts.map(alert => (
                <tr
                  key={alert.key}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => window.location.href = '/supply-chain/map'}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className={clsx('h-2 w-2 shrink-0 rounded-full', alertDot[alert.risk])} />
                      <div>
                        <div className="text-[15px] font-semibold text-ink-100">{alert.name}</div>
                        <div className="text-sm text-ink-500">T{alert.tier} · {alert.country}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={clsx('rounded-xs border px-1.5 py-0.5 text-xs font-semibold', alertBadge[alert.risk])}>
                      {alertLabel[alert.risk]}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm text-ink-400">{alert.issue}</td>
                  <td className="py-3 pr-4 text-sm text-ink-500">{alert.type}</td>
                  <td className="py-3">
                    <ChevronDown className="h-4 w-4 -rotate-90 text-ink-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashboardPanel>
      </div>

      {/* Row 2: 제품 현황 | DPP 현황 | 최근 변경사항 */}
      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-4">
        <DashboardPanel title="제품 현황" action="전체 보기" actionHref="/dpp/center">
          {products.map(product => (
            <ProductStatusRow key={product.name} product={product} />
          ))}
        </DashboardPanel>

        <DashboardPanel title="DPP 현황" action="DPP Center" actionHref="/dpp/center">
          <div className="flex flex-col gap-2">
            {[
              { label: '발행 가능', value: '12', unit: '건', color: 'text-ok-text', href: '/dpp/readiness' },
              { label: '발행 보류', value: '7',  unit: '건', color: 'text-warn-text',   href: '/dpp/center' },
              { label: 'HITL 대기', value: '3',  unit: '건', color: 'text-purple-600',  href: '/hitl' },
              { label: 'Blocker',   value: '5',  unit: '건', color: 'text-alert-text',     href: '/dpp/center' },
            ].map(item => (
              <Link key={item.label} href={item.href} className="flex items-center justify-between rounded-xs border border-ink-700/60 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                <span className="text-[15px] font-semibold text-ink-100">{item.label}</span>
                <span className={clsx('text-[15px] font-bold num-mono', item.color)}>{item.value}{item.unit}</span>
              </Link>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="최근 변경사항" action="전체 보기" actionHref="/supply-chain/map">
          {changes.map(change => (
            <ChangeRow key={`${change.time}-${change.title}`} change={change} />
          ))}
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
    <section className={clsx('rounded-sm border border-ink-700 bg-white p-4', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? <h2 className="text-base font-bold text-ink-100">{title}</h2> : <span />}
          {action && actionHref ? (
            <Link href={actionHref} className="inline-flex items-center gap-1 text-sm font-semibold text-accent-700 hover:text-accent-600">
              {action} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : action ? (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-700">
              {action} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
      )}
      {children}
    </section>
  );
}

function TaskRow({ task }: { task: { rank: number; title: string; desc: string; level: string; count: string; href: string } }) {
  const countBg = task.level === '높음' ? 'bg-alert-bg text-alert-text' : task.level === '중간' ? 'bg-warn-bg text-warn-text' : 'bg-purple-50 text-purple-600';

  return (
    <Link href={task.href} className="flex items-center gap-3 border-b border-ink-700/40 py-3 last:border-0 -mx-1 px-1 rounded-xs hover:bg-slate-50 transition-colors">
      <span className="w-5 shrink-0 text-center text-sm font-bold text-ink-500">{task.rank}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-ink-100">{task.title}</div>
        <div className="mt-0.5 truncate text-sm text-ink-500">{task.desc}</div>
      </div>
      <span className={clsx('shrink-0 rounded-xs px-2 py-0.5 text-sm font-semibold num-mono', countBg)}>{task.count}</span>
      <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-ink-500" />
    </Link>
  );
}

function ProductStatusRow({ product }: { product: { name: string; type: string; status: string; supply: string; tone: string; href: string } }) {
  const statusColor = {
    danger: 'bg-alert-bg text-alert-text',
    warning: 'bg-warn-bg text-warn-text',
    success: 'bg-ok-bg text-ok-text',
    purple: 'bg-purple-50 text-purple-600',
  }[product.tone] ?? 'bg-slate-50 text-slate-600';

  return (
    <Link href={product.href} className="flex items-center gap-3 border-b border-ink-700/40 last:border-0 py-3 -mx-1 px-1 rounded-xs hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="truncate text-[15px] font-semibold text-ink-100">{product.name}</div>
        <div className="mt-0.5 text-sm text-ink-500">{product.type}</div>
      </div>
      <span className={clsx('shrink-0 rounded-xs px-2 py-0.5 text-sm font-semibold', statusColor)}>{product.status}</span>
      <span className="shrink-0 text-sm text-ink-400 num-mono">{product.supply}</span>
      <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-ink-500" />
    </Link>
  );
}

function DppStatusItem({ label, value, tone, href }: { label: string; value?: string; tone: 'success' | 'warning' | 'purple' | 'danger'; href: string }) {
  const dotColor = { success: 'bg-ok-solid', warning: 'bg-warn-solid', purple: 'bg-purple-500', danger: 'bg-alert-solid' }[tone];
  const valueColor = { success: 'text-ok-text', warning: 'text-warn-text', purple: 'text-purple-700', danger: 'text-alert-text' }[tone];

  return (
    <Link href={href} className="flex items-center gap-3 rounded-xs border border-transparent px-2 py-2 hover:border-ink-700/40 hover:bg-slate-50 transition-colors">
      <div className={clsx('h-2 w-2 shrink-0 rounded-full', dotColor)} />
      <div className="flex flex-1 items-center justify-between min-w-0 gap-2">
        <div className="truncate text-sm font-medium text-ink-200">{label}</div>
        {value && <div className={clsx('shrink-0 text-[15px] font-bold num-mono', valueColor)}>{value}</div>}
      </div>
    </Link>
  );
}

function ChangeRow({ change }: { change: { time: string; title: string; desc: string; tag: string; tone: string; href: string } }) {
  const dot = {
    success: 'bg-ok-solid',
    info: 'bg-info-solid',
    warning: 'bg-warn-solid',
    purple: 'bg-purple-500',
  }[change.tone] ?? 'bg-slate-400';

  return (
    <Link href={change.href} className="flex items-start gap-2 border-b border-ink-700/40 last:border-0 py-3 -mx-1 px-1 rounded-xs hover:bg-slate-50 transition-colors">
      <span className={clsx('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', dot)} />
      <span className="shrink-0 text-sm text-ink-500 num-mono w-10">{change.time}</span>
      <div className="flex-1 min-w-0">
        <div className="truncate text-[15px] font-semibold text-ink-100">{change.title}</div>
        <div className="mt-0.5 truncate text-sm text-ink-500">{change.desc}</div>
      </div>
    </Link>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [apiKpis, setApiKpis] = useState<DashboardKpis | null>(null);
  const [apiBatches, setApiBatches] = useState<UiBatch[]>([]);

  useEffect(() => {
    getDashboardKpis().then(setApiKpis).catch(() => {});
    Promise.all([getBatches('processing'), getBatches('hitl_wait')]).then(([p, h]) => {
      setApiBatches([...flattenBatchesResponse(p), ...flattenBatchesResponse(h)]);
    }).catch(() => {});
  }, []);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (typeof window === 'undefined') return;

    const url = tab === 'overview' ? '/dashboard' : `/dashboard?tab=${tab}`;
    if (window.location.pathname + window.location.search !== url) {
      window.history.pushState({ tab }, '', url);
    }
  };

  useEffect(() => {
    const syncTabFromUrl = () => {
      const tab = new URLSearchParams(window.location.search).get('tab') as TabKey | null;
      const nextTab = tab && TABS.some(item => item.key === tab) ? tab : 'overview';
      setActiveTab(nextTab);
    };

    syncTabFromUrl();
    window.addEventListener('popstate', syncTabFromUrl);
    return () => window.removeEventListener('popstate', syncTabFromUrl);
  }, []);

  const hitlWaiting = apiKpis?.hitlWaitBatches ?? apiBatches.filter(b => b.currentStage === 'hitl-wait').length;
  const euViolations = violationsByRegulation.filter(v => v.region === 'EU' || v.region === 'DE').reduce((s, v) => s + v.count, 0);
  const usViolations = violationsByRegulation.filter(v => v.region === 'US').reduce((s, v) => s + v.count, 0);

  // 탭별 데이터 필터링
  const highRiskList = supplierRiskProfiles.filter(
    r => r.riskLevel === 'high' || r.riskLevel === 'critical'
  );
  const pendingList = supplierCompleteness.filter(c => c.completionRate < 80);
  const dppReadyList = dppRecords.filter(d => d.status === 'issued');
  const hitlList = apiBatches.filter(b => b.currentStage === 'hitl-wait');
  const missingFieldCount = supplierCompleteness.reduce((sum, item) => sum + item.missingFields.length, 0);
  const verifiedSuppliers = suppliers.filter(s => s.status === 'verified').length;
  const highRiskSuppliers = suppliers.filter(s => s.risk === 'high' || s.risk === 'critical').length;
  const averageCompleteness = Math.round(
    supplierCompleteness.reduce((sum, item) => sum + item.completionRate, 0) / supplierCompleteness.length
  );

  return (
    <>
      <PageHeader
        title="대시보드"
        description="KIRA Battery DPP Traceability Platform"
        actions={
          <>
            <div className="flex items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-medium text-ink-400">
              <span className="num-mono">2026.05.27</span>
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
      <nav className="sticky top-[57px] z-10 bg-white px-8 pt-3">
        <TabBar tabs={TABS} value={activeTab} onChange={handleTabChange} />
      </nav>

      {/* ══════════════════════════════════════════════════════════
          탭 1 — Overview (기존 대시보드 내용 그대로)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-4 bg-slate-50 p-6">
          <section className="grid grid-cols-5 gap-4">
            <CompactMetric label="Traceability Coverage" value={92} unit="%" icon={Activity} tone="ok" hint="원산지 추적 가능 비율" delta="7%" deltaGood onClick={() => handleTabChange('dpp-ready')} />
            <CompactMetric label="High Risk Region" value={highRiskSuppliers + 16} icon={ShieldAlert} tone="alert" hint="고위험 지역 연결 업체" delta="3" deltaGood={false} deltaDirection="up" onClick={() => handleTabChange('high-risk')} />
            <CompactMetric label="Missing Documents" value={missingFieldCount} icon={FileText} tone="warn" hint="원산지/인증 문서 누락 업체" delta="5" deltaGood deltaDirection="down" onClick={() => handleTabChange('pending')} />
            <CompactMetric label="Due Diligence Alerts" value={(apiKpis?.rejectedBatches ?? 0) + hitlWaiting + 3} icon={AlertTriangle} tone="alert" hint="EUDR/CSDDD 검토 필요 건수" delta="2" deltaGood deltaDirection="down" onClick={() => handleTabChange('violation-cases')} />
            <CompactMetric label="ESG Compliance Score" value="84.2" icon={CheckCircle2} tone="ok" hint="규제 대응 종합 점수" delta="4.3" deltaGood onClick={() => handleTabChange('dpp-ready')} />
          </section>

          <div className="flex items-center gap-3 rounded-sm border border-ink-700 bg-white px-4 py-3">
            <Bot className="h-4 w-4 shrink-0 text-ink-400" />
            <span className="text-sm font-bold text-ink-200">AI 인사이트</span>
            <span className="text-sm text-ink-500">
              고위험 협력사 {highRiskSuppliers}개사와 누락 문서 {missingFieldCount}건이 DPP 발행 가능성에 영향을 줍니다. Katanga Cobalt, Ganzhou Rare Metals를 우선 확인하세요.
            </span>
          </div>

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
                    고위험 협력사 {highRiskSuppliers}개사와 누락 문서 {missingFieldCount}건이 DPP 발행 가능성에 영향을 줍니다.
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
                  <button onClick={() => handleTabChange('pending')} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xs border border-alert-border bg-alert-bg px-3 py-2 text-xs font-semibold text-alert-text">
                    <AlertCircle className="h-3.5 w-3.5" />
                    문서 누락: {missingFieldCount}건
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          탭 1-1 — Today Batches
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'today-batches' && (
        <div className="p-8">
          <TabTableShell
            title="오늘 처리 배치"
            subtitle={`${apiBatches.length}건 · 전체 배치 ${apiKpis?.totalBatches ?? 0}건`}
            action={<Link href="/hitl" className="flex items-center gap-1 text-[13px] font-semibold text-accent-700 hover:text-accent-600">검토 큐 열기 <ArrowRight className="h-4 w-4" /></Link>}
          >
            {apiBatches.length === 0 ? (
              <EmptyState label="현재 해당 항목이 없습니다" />
            ) : (
              <table className="w-full min-w-[920px]">
                <thead className="border-b border-ink-700 bg-white">
                  <tr>
                    <th className={tableHeadClass}>배치 ID</th>
                    <th className={tableHeadClass}>제품/공급사</th>
                    <th className={tableHeadClass}>수신 시각</th>
                    <th className={tableHeadClass}>현재 단계</th>
                    <th className={tableHeadClass}>대상</th>
                    <th className={tableHeadClass}>신뢰도</th>
                    <th className={tableHeadClass}>담당</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700/50">
                  {apiBatches.map(batch => (
                    <tr key={batch.id} className="hover:bg-slate-50">
                      <td className={`${tableCellClass} font-semibold num-mono`}>{batch.batchId}</td>
                      <td className={`${tableCellClass} max-w-[280px] whitespace-normal break-words font-semibold text-ink-100`}>{batch.supplier}</td>
                      <td className={`${tableMutedCellClass} num-mono`}>{batch.receivedAt}</td>
                      <td className={tableCellClass}>
                        <span className={clsx('font-semibold', stageMeta[batch.currentStage]?.color)}>{stageDisplayLabel[batch.currentStage] ?? stageMeta[batch.currentStage]?.label}</span>
                      </td>
                      <td className={tableCellClass}><Badge tone={destMeta[batch.destination]?.tone} size="sm">{destMeta[batch.destination]?.label}</Badge></td>
                      <td className={`${tableMutedCellClass} num-mono`}>{batch.confidence !== undefined ? `${Math.round(batch.confidence * 100)}%` : '-'}</td>
                      <td className={`${tableMutedCellClass} max-w-[220px] whitespace-normal break-words`}>{batch.assignedTo ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabTableShell>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          탭 2 — Violation Cases
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'violation-cases' && (
        <div className="p-8">
          <TabTableShell
            title="위반 감지"
            subtitle={`실시간 규제 위반 케이스 ${violationCases.length}건`}
          >
            <table className="w-full min-w-[980px]">
              <thead className="border-b border-ink-700 bg-white">
                <tr>
                  <th className={tableHeadClass}>케이스 ID</th>
                  <th className={tableHeadClass}>공급사</th>
                  <th className={tableHeadClass}>규제</th>
                  <th className={tableHeadClass}>지역</th>
                  <th className={tableHeadClass}>요약</th>
                  <th className={tableHeadClass}>심각도</th>
                  <th className={tableHeadClass}>상태</th>
                  <th className={tableHeadClass}>감지 시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700/50">
                {violationCases.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className={`${tableCellClass} font-semibold num-mono text-alert-text`}>{item.id}</td>
                    <td className={`${tableCellClass} font-semibold text-ink-100`}>{item.supplier}</td>
                    <td className={tableCellClass}>{item.regulation}</td>
                    <td className={tableCellClass}>
                      <span className={clsx('inline-flex items-center rounded-xs border px-2 py-1 text-[13px] font-semibold', regionColor[item.region] || 'border-ink-600 text-ink-400')}>{item.region}</span>
                    </td>
                    <td className={`${tableMutedCellClass} max-w-[360px] whitespace-normal break-words`}>{item.summary}</td>
                    <td className={tableCellClass}>
                      <span className={clsx(
                        'inline-flex rounded-xs border px-2 py-1 text-[13px] font-semibold',
                        item.severity === 'critical' ? 'border-alert-border bg-alert-bg text-alert-text' :
                        item.severity === 'high' ? 'border-warn-border bg-warn-bg text-warn-text' :
                        'border-warn-border bg-warn-bg text-warn-text'
                      )}>
                        {severityDisplayLabel[item.severity]}
                      </span>
                    </td>
                    <td className={tableCellClass}>{item.status}</td>
                    <td className={`${tableMutedCellClass} num-mono`}>{item.detectedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabTableShell>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          탭 3 — High Risk
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'high-risk' && (
        <div className="p-8">
          <TabTableShell title="고위험 협력사" subtitle={`고위험 또는 최고위험 협력사 ${highRiskList.length}개사`}>
            {highRiskList.length === 0 ? (
              <EmptyState label="현재 해당 항목이 없습니다" />
            ) : (
              <table className="w-full min-w-[960px]">
                <thead className="border-b border-ink-700 bg-white">
                  <tr>
                    <th className={tableHeadClass}>협력사</th>
                    <th className={tableHeadClass}>Tier</th>
                    <th className={tableHeadClass}>국가</th>
                    <th className={tableHeadClass}>위험 등급</th>
                    <th className={tableHeadClass}>FEOC</th>
                    <th className={tableHeadClass}>주요 사유</th>
                    <th className={tableHeadClass}>이동</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700/50">
                  {highRiskList.map(r => {
                    const sup  = suppliers.find(s => s.id === r.supplierId);
                    const name = getSupplierName(r.supplierId);
                    return (
                      <tr key={r.supplierId} className="hover:bg-slate-50">
                        <td className={`${tableCellClass} font-semibold text-ink-100`}>
                          <div>{name?.nameEn ?? sup?.name ?? r.supplierId}</div>
                          {name?.nameKo && <div className="mt-1 text-[13px] font-normal text-ink-500">{name.nameKo}</div>}
                        </td>
                        <td className={`${tableMutedCellClass} num-mono`}>T{sup?.tier}</td>
                        <td className={tableMutedCellClass}>{sup?.country ?? '-'}</td>
                        <td className={tableCellClass}>
                          <span className={clsx('inline-flex rounded-xs border px-2 py-1 text-[13px] font-semibold', riskLevelColor[r.riskLevel])}>
                            {riskLevelLabel[r.riskLevel]}
                          </span>
                        </td>
                        <td className={tableCellClass}>
                          <span className={clsx(
                            'inline-flex rounded-xs border px-2 py-1 text-[13px] font-semibold',
                            r.feocStatus === 'eligible'    ? 'border-ok-border bg-ok-bg text-ok-text' :
                            r.feocStatus === 'ineligible'  ? 'border-alert-border bg-alert-bg text-alert-text' :
                            r.feocStatus === 'under_review'? 'border-warn-border bg-warn-bg text-warn-text' :
                                                              'border-ink-700 bg-slate-50 text-ink-500'
                          )}>
                            {feocDisplayLabel[r.feocStatus] ?? 'FEOC 미확인'}
                          </span>
                        </td>
                        <td className={`${tableMutedCellClass} max-w-[340px] whitespace-normal break-words`}>{r.highRiskReasons[0] ?? '-'}</td>
                        <td className={tableCellClass}>
                          <Link href={`/suppliers/${r.supplierId}/info`} className="inline-flex items-center gap-1 font-semibold text-accent-700 hover:text-accent-600">
                            상세 <ArrowRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </TabTableShell>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          탭 3 — Pending
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'pending' && (
        <div className="p-8">
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-start justify-between gap-4 border-b border-ink-700 bg-slate-50 px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-ink-100">자료 보완 대기</h3>
                <p className="mt-1 text-[13px] leading-5 text-ink-500">
                  누락 항목이 있는 협력사를 우선순위별로 확인합니다.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-right">
                <div className="rounded-xs border border-ink-700 bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold text-ink-500">대상</div>
                  <div className="text-[15px] font-bold text-ink-100 num-mono">{pendingList.length}</div>
                </div>
                <div className="rounded-xs border border-ink-700 bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold text-ink-500">누락</div>
                  <div className="text-[15px] font-bold text-warn-text num-mono">
                    {pendingList.reduce((sum, item) => sum + item.missingFields.length, 0)}
                  </div>
                </div>
                <div className="rounded-xs border border-ink-700 bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold text-ink-500">평균</div>
                  <div className="text-[15px] font-bold text-ink-100 num-mono">
                    {pendingList.length > 0
                      ? `${Math.round(pendingList.reduce((sum, item) => sum + item.completionRate, 0) / pendingList.length)}%`
                      : '-'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-5">
              {pendingList.length === 0 ? (
                <EmptyState label="현재 해당 항목이 없습니다" />
              ) : (
                pendingList.map(c => {
                  const sup      = suppliers.find(s => s.id === c.supplierId);
                  const name     = getSupplierName(c.supplierId);
                  const logs     = getRemindLogs(c.supplierId);
                  const isSlaOver = logs.length >= 2;
                  const visibleFields = c.missingFields.slice(0, 4);
                  const hiddenCount = Math.max(c.missingFields.length - visibleFields.length, 0);
                  const progressTone =
                    c.completionRate >= 75 ? 'bg-warn-solid' :
                    c.completionRate >= 60 ? 'bg-warn-solid' :
                    'bg-alert-solid';

                  return (
                    <article
                      key={c.supplierId}
                      className={clsx(
                        'rounded-sm border bg-white p-4 transition-colors hover:bg-slate-50',
                        isSlaOver ? 'border-warn-border shadow-[inset_3px_0_0_#f97316]' : 'border-ink-700'
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-[240px] flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-ink-100">
                              {name?.nameEn ?? sup?.name ?? c.supplierId}
                            </h4>
                            {name?.nameKo && <span className="text-[13px] text-ink-500">{name.nameKo}</span>}
                            {isSlaOver && (
                              <span className="inline-flex items-center gap-1 rounded-xs border border-warn-border bg-warn-bg px-2 py-1 text-[13px] font-semibold text-warn-text">
                                <Clock className="h-3.5 w-3.5" />
                                SLA 초과
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-500">
                            <span className="num-mono">T{sup?.tier ?? '-'}</span>
                            <span>{sup?.country ?? '-'}</span>
                            <span>최근 업데이트 {c.lastUpdatedAt}</span>
                          </div>
                        </div>

                        <div className="w-full max-w-[260px]">
                          <div className="mb-1 flex items-center justify-between text-[13px]">
                            <span className="font-semibold text-ink-500">완성도</span>
                            <span className="font-bold text-ink-100 num-mono">{c.completionRate}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div className={clsx('h-full rounded-full', progressTone)} style={{ width: `${c.completionRate}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-xs bg-warn-bg px-2 py-1 text-[13px] font-semibold text-warn-text">
                          <AlertCircle className="h-3.5 w-3.5" />
                          누락 {c.missingFields.length}항목
                        </span>
                        {visibleFields.map(field => (
                          <span key={field} className="rounded-xs border border-ink-700 bg-slate-50 px-2 py-1 text-[13px] font-medium text-ink-200">
                            {field}
                          </span>
                        ))}
                        {hiddenCount > 0 && (
                          <span className="rounded-xs border border-ink-700 bg-white px-2 py-1 text-[13px] font-semibold text-ink-500">
                            외 {hiddenCount}건
                          </span>
                        )}
                        <Link
                          href={`/suppliers/${c.supplierId}/info`}
                          className="ml-auto inline-flex items-center gap-1 rounded-xs border border-accent-200 bg-accent-50 px-3 py-1.5 text-[13px] font-semibold text-accent-700 hover:border-accent-600"
                        >
                          검토 <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          탭 4 — DPP Ready
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'dpp-ready' && (
        <div className="p-8">
          <TabTableShell title="DPP 발행 완료" subtitle={`발행 가능한 DPP 레코드 ${dppReadyList.length}건`}>
            {dppReadyList.length === 0 ? (
              <EmptyState label="현재 해당 항목이 없습니다" />
            ) : (
              <table className="w-full min-w-[1020px]">
                <thead className="border-b border-ink-700 bg-white">
                  <tr>
                    <th className={tableHeadClass}>DPP ID</th>
                    <th className={tableHeadClass}>제품명</th>
                    <th className={tableHeadClass}>시리얼</th>
                    <th className={tableHeadClass}>제조사</th>
                    <th className={tableHeadClass}>발행일</th>
                    <th className={tableHeadClass}>목적지</th>
                    <th className={tableHeadClass}>탄소</th>
                    <th className={tableHeadClass}>재활용 함량</th>
                    <th className={tableHeadClass}>승인자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700/50">
                  {dppReadyList.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className={`${tableCellClass} font-semibold num-mono text-ok-text`}>{d.id}</td>
                      <td className={`${tableCellClass} max-w-[240px] whitespace-normal break-words font-semibold text-ink-100`}>{d.modelName}</td>
                      <td className={`${tableMutedCellClass} num-mono`}>{d.serialNumber}</td>
                      <td className={`${tableMutedCellClass} max-w-[240px] whitespace-normal break-words`}>{d.manufacturer}</td>
                      <td className={`${tableMutedCellClass} num-mono`}>{d.issuedAt.slice(0, 10)}</td>
                      <td className={tableCellClass}>
                        <span className={clsx('inline-flex rounded-xs border px-2 py-1 text-[13px] font-semibold', regionColor[d.destination] || 'border-ink-600 text-ink-400')}>{d.destination}</span>
                      </td>
                      <td className={`${tableMutedCellClass} num-mono`}>{d.carbonFootprint} kg CO₂eq</td>
                      <td className={`${tableMutedCellClass} whitespace-nowrap num-mono`}>
                        Co {d.recycledContent.Co}% · Ni {d.recycledContent.Ni}% · Li {d.recycledContent.Li}%
                      </td>
                      <td className={`${tableMutedCellClass} max-w-[180px] whitespace-normal break-words`}>{d.approvedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabTableShell>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          탭 5 — HITL Queue
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'hitl-queue' && (
        <div className="p-8">
          <TabTableShell title="HITL 대기열" subtitle={`사람 검토가 필요한 배치 ${hitlList.length}건`}>
            {hitlList.length === 0 ? (
              <EmptyState label="현재 해당 항목이 없습니다" />
            ) : (
              <table className="w-full min-w-[920px]">
                <thead className="border-b border-ink-700 bg-white">
                  <tr>
                    <th className={tableHeadClass}>배치 ID</th>
                    <th className={tableHeadClass}>공급사</th>
                    <th className={tableHeadClass}>수신 시각</th>
                    <th className={tableHeadClass}>신뢰도</th>
                    <th className={tableHeadClass}>목적지</th>
                    <th className={tableHeadClass}>담당</th>
                    <th className={tableHeadClass}>작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700/50">
                  {hitlList.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className={`${tableCellClass} font-semibold num-mono text-alert-text`}>{b.batchId}</td>
                      <td className={`${tableCellClass} max-w-[260px] whitespace-normal break-words font-semibold text-ink-100`}>{b.supplier}</td>
                      <td className={`${tableMutedCellClass} num-mono`}>{b.receivedAt}</td>
                      <td className={`${tableMutedCellClass} num-mono`}>
                        {b.confidence !== undefined ? `${Math.round(b.confidence * 100)}%` : '-'}
                      </td>
                      <td className={tableCellClass}><Badge tone={destMeta[b.destination]?.tone} size="sm">{b.destination}</Badge></td>
                      <td className={`${tableMutedCellClass} max-w-[220px] whitespace-normal break-words`}>{b.assignedTo ?? '-'}</td>
                      <td className={tableCellClass}>
                        <Link href="/hitl" className="inline-flex items-center gap-1 font-semibold text-accent-700 hover:text-accent-600">
                          검토 <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabTableShell>
        </div>
      )}
    </>
  );
}
