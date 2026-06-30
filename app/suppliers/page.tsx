'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import Badge from '@/components/Badge';
import PageHeader from '@/components/PageHeader';
import TopStatCard from '@/components/TopStatCard';
import {
  ApiError,
  getSuppliers,
  getSupplierReliability,
  getSupplierContacts,
  type SupplierBrief,
  type SupplierContact,
  type SupplierReliabilityResponse,
  type SupplierRiskLevel,
  type SupplierStatusCode,
  type ProviderType,
} from '@/lib/api';

// §4.2 — 요청 노드(KIRA, OEM/tier0)는 협력사 목록에서 제외
const REQUEST_NODE_ID = 'a0000000-0000-4000-8000-000000000000';

type StatusFilter = 'all' | SupplierStatusCode;
type RiskFilter = 'all' | SupplierRiskLevel;
type FeocFilter = 'all' | 'eligible' | 'ineligible' | 'under_review' | 'unknown';
type InputFilter = 'all' | 'complete' | 'in_progress' | 'partial' | 'missing';
type ContactFilter = 'all' | 'registered' | 'missing';
type SummaryFilter = 'all' | 'verified' | 'high-risk' | 'sla-overdue';
type SupplierFilter = 'all' | string;

/** 목록 행 = brief(필수) + reliability(보강) + primaryContact(보강) */
interface SupplierRowData {
  brief: SupplierBrief;
  reliability: SupplierReliabilityResponse | null;
  primaryContact: SupplierContact | null;
}

const statusMeta: Record<SupplierStatusCode, { label: string; tone: 'ok' | 'warn' | 'alert' | 'info' | 'neutral'; dot: string }> = {
  supplier_verified: { label: '검증 완료', tone: 'info', dot: 'bg-signal-info' },
  supplier_pending: { label: '검토 대기', tone: 'neutral', dot: 'bg-ink-400' },
  supplier_requested: { label: '요청됨', tone: 'neutral', dot: 'bg-ink-400' },
  supplier_in_progress: { label: '진행 중', tone: 'info', dot: 'bg-signal-info' },
  supplier_review: { label: '추가 확인', tone: 'warn', dot: 'bg-signal-warn' },
  supplier_violation: { label: '규제 위반', tone: 'alert', dot: 'bg-signal-alert' },
  supplier_suspended: { label: '거래 중지', tone: 'alert', dot: 'bg-signal-alert' },
};

const providerTypeLabel: Record<ProviderType, string> = {
  manufacturer: '제조사',
  recycler: '재활용',
  trader: '트레이더',
  miner: '광산', smelter: '제련소',
};

const riskMeta: Record<SupplierRiskLevel, { label: string; className: string }> = {
  low: { label: '저위험', className: 'text-ok-text' },
  medium: { label: '중위험', className: 'text-warn-text' },
  high: { label: '고위험', className: 'text-alert-text' },
  critical: { label: '최고위험', className: 'text-alert-text font-bold' },
};

const feocMeta: Record<string, { label: string; className: string }> = {
  eligible: { label: 'FEOC 적격', className: 'text-ok-text' },
  ineligible: { label: 'FEOC 부적격', className: 'text-alert-text' },
  under_review: { label: 'FEOC 검토중', className: 'text-warn-text' },
  unknown: { label: 'FEOC 미파악', className: 'text-ink-500' },
};

function completenessMeta(rate: number) {
  if (rate >= 100) return { label: '제출 완료', tone: 'info' as const, bar: 'bg-info-solid', text: 'text-info-text', filter: 'complete' as const };
  if (rate >= 80) return { label: '입력 중', tone: 'ok' as const, bar: 'bg-ok-solid', text: 'text-ok-text', filter: 'in_progress' as const };
  if (rate >= 50) return { label: '부분 제출', tone: 'warn' as const, bar: 'bg-warn-solid', text: 'text-warn-text', filter: 'partial' as const };
  return { label: '미제출', tone: 'alert' as const, bar: 'bg-alert-solid', text: 'text-alert-text', filter: 'missing' as const };
}

/** reliability 기준 SLA 초과 판정 (sla_due_date 경과 또는 reminder_count >= 2) */
function isSlaOverdue(rel: SupplierReliabilityResponse | null): boolean {
  if (!rel) return false;
  if ((rel.reminderCount ?? 0) >= 2) return true;
  if (rel.slaDueDate) {
    const due = new Date(rel.slaDueDate).getTime();
    if (!Number.isNaN(due) && due < Date.now()) return true;
  }
  return false;
}

function SupplierRow({ row }: { row: SupplierRowData }) {
  const { brief, reliability, primaryContact } = row;
  const status = statusMeta[brief.status] ?? statusMeta.supplier_pending;
  const riskLevel = riskMeta[brief.riskLevel] ?? riskMeta.low;
  const feoc = reliability?.feocStatus ? feocMeta[reliability.feocStatus] : null;
  const rate = reliability?.completenessScore ?? 0;
  const progress = completenessMeta(rate);
  const slaOver = isSlaOverdue(reliability);
  // 협력사 관리는 단일 공유 폼 '페이지'로 이동(check-info, mode=oem). 불필요한 [id]/info 상세 미사용.
  const detailHref = `/suppliers/check-info?supplierId=${brief.supplierId}&supplier=${encodeURIComponent(brief.companyName)}`;

  return (
    <tr className="group border-b border-ink-700 bg-white transition-colors hover:bg-ink-800">
      <td className="px-5 py-4 align-top">
        <div className="flex items-start gap-3">
          <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', status.dot)} />
          <div className="min-w-0">
            <Link
              href={detailHref}
              className="block truncate text-sm font-bold text-ink-100 transition-colors group-hover:text-accent-700"
            >
              {brief.companyName}
            </Link>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-500">
              <span className="num-mono">{brief.supplierId}</span>
              <span className="text-ink-600">·</span>
              <span>{providerTypeLabel[brief.providerType] ?? brief.providerType}</span>
            </div>
          </div>
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="text-xs font-semibold text-ink-200">{providerTypeLabel[brief.providerType] ?? brief.providerType}</div>
        <div className="mt-1 text-[11px] text-ink-500">—</div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="text-xs text-ink-500">—</div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="space-y-1.5">
          <Badge tone={status.tone} dot>{status.label}</Badge>
          <div className={clsx('text-[11px] font-semibold', riskLevel.className)}>{riskLevel.label}</div>
          {feoc && <div className={clsx('text-[11px]', feoc.className)}>{feoc.label}</div>}
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="min-w-[180px] space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Badge tone={progress.tone}>{progress.label}</Badge>
            <span className={clsx('num-mono text-xs font-semibold', progress.text)}>{rate}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-700">
            <div className={clsx('h-full rounded-full', progress.bar)} style={{ width: `${Math.min(rate, 100)}%` }} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {rate >= 100 ? (
              <span className="inline-flex items-center gap-1 text-ok-text">
                <CheckCircle2 className="h-3 w-3" />
                제출 완료
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-warn-text">
                <AlertCircle className="h-3 w-3" />
                입력 진행 중
              </span>
            )}
            {slaOver && (
              <span className="inline-flex items-center gap-1 rounded-xs border border-warn-border bg-warn-bg px-1.5 py-0.5 font-semibold text-warn-text">
                <Clock className="h-3 w-3" />
                SLA 초과
              </span>
            )}
          </div>
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        {primaryContact ? (
          <div>
            <div className="text-xs font-semibold text-ink-200">{primaryContact.name ?? primaryContact.nameEn ?? '—'}</div>
            {primaryContact.email && <div className="mt-0.5 text-[11px] text-ink-500">{primaryContact.email}</div>}
          </div>
        ) : (
          <span className="text-xs text-ink-500">미등록</span>
        )}
      </td>

      <td className="px-5 py-4 align-top text-right">
        <Link
          href={detailHref}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-xs border border-ink-700 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-400 transition-colors hover:border-accent-600 hover:text-accent-700"
        >
          상세
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = 'default',
  active = false,
  onClick,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: 'default' | 'ok' | 'warn' | 'alert' | 'info';
  active?: boolean;
  onClick?: () => void;
}) {
  const mappedTone = tone === 'default' ? 'info' : tone;
  return <TopStatCard label={label} value={value} unit={hint} tone={mappedTone} active={active} onClick={onClick} />;
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2 shadow-control">
      <span className="text-[11px] font-semibold text-ink-500">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="num-mono bg-transparent text-[11px] font-semibold text-ink-200 outline-none"
      >
        {options.map(option => (
          <option key={option.v} value={option.v}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function HeaderFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { v: string; label: string }[];
}) {
  const selected = options.find(option => option.v === value)?.label ?? '전체';
  return (
    <label className="relative inline-flex max-w-full cursor-pointer items-center gap-1.5 text-[11px] font-bold text-ink-500">
      {label && <span className="truncate">{label}</span>}
      <span className={clsx(
        'inline-flex max-w-[96px] items-center gap-1 rounded-xs px-1 py-0.5 text-[11px] font-bold',
        value === 'all' ? 'text-ink-400' : 'bg-accent-50 text-accent-800',
      )}>
        {value !== 'all' && <span className="truncate">{selected}</span>}
        <ChevronDown className="h-3 w-3 shrink-0" />
      </span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label || '위험도'}
      >
        {options.map(option => (
          <option key={option.v} value={option.v}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

export default function SuppliersPage() {
  const [rows, setRows] = useState<SupplierRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [feocFilter, setFeocFilter] = useState<FeocFilter>('all');
  const [inputFilter, setInputFilter] = useState<InputFilter>('all');
  const [contactFilter, setContactFilter] = useState<ContactFilter>('all');
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all');
  const [supplierFilter, setSupplierFilter] = useState<SupplierFilter>('all');

  // 목록 brief 로드 → 각 supplier reliability 보강 (N+1, §사용자 결정)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const briefs = await getSuppliers();
        const visible = briefs.filter(s => s.supplierId !== REQUEST_NODE_ID);
        const enriched = await Promise.all(
          visible.map(async (brief): Promise<SupplierRowData> => {
            const [reliability, contactRes] = await Promise.allSettled([
              getSupplierReliability(brief.supplierId),
              getSupplierContacts(brief.supplierId),
            ]);
            const primaryContact =
              contactRes.status === 'fulfilled'
                ? (contactRes.value.contacts.find(c => c.isPrimary) ?? contactRes.value.contacts[0] ?? null)
                : null;
            return {
              brief,
              reliability: reliability.status === 'fulfilled' ? reliability.value : null,
              primaryContact,
            };
          }),
        );
        if (!cancelled) setRows(enriched);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : '협력사 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const resetDetailFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setRiskFilter('all');
    setFeocFilter('all');
    setInputFilter('all');
    setContactFilter('all');
    setSupplierFilter('all');
  };

  const applySummaryFilter = (value: SummaryFilter) => {
    resetDetailFilters();
    setSummaryFilter(value);
  };

  const clearSummaryFilter = () => setSummaryFilter('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter(({ brief, reliability, primaryContact }) => {
      const slaOver = isSlaOverdue(reliability);

      if (summaryFilter === 'verified' && brief.status !== 'supplier_verified') return false;
      if (summaryFilter === 'high-risk' && brief.riskLevel !== 'high' && brief.riskLevel !== 'critical') return false;
      if (summaryFilter === 'sla-overdue' && !slaOver) return false;

      if (supplierFilter !== 'all' && brief.supplierId !== supplierFilter) return false;
      if (statusFilter !== 'all' && brief.status !== statusFilter) return false;
      if (riskFilter !== 'all' && brief.riskLevel !== riskFilter) return false;

      const inputState = completenessMeta(reliability?.completenessScore ?? 0).filter;
      if (inputFilter !== 'all' && inputState !== inputFilter) return false;

      if (contactFilter === 'registered' && !primaryContact) return false;
      if (contactFilter === 'missing' && primaryContact) return false;

      if (feocFilter !== 'all' && reliability?.feocStatus !== feocFilter) return false;

      if (!q) return true;

      const haystack = [
        brief.supplierId,
        brief.companyName,
        brief.providerType,
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(q);
    });
  }, [rows, contactFilter, feocFilter, inputFilter, riskFilter, search, statusFilter, summaryFilter, supplierFilter]);

  const highRiskCount = rows.filter(({ brief }) => brief.riskLevel === 'high' || brief.riskLevel === 'critical').length;
  const overdueCount = rows.filter(({ reliability }) => isSlaOverdue(reliability)).length;
  const incompleteCount = rows.filter(({ reliability }) => (reliability?.completenessScore ?? 0) < 80).length;
  const verifiedCount = rows.filter(({ brief }) => brief.status === 'supplier_verified').length;
  const summaryLabel: Record<SummaryFilter, string> = {
    all: '전체 협력사',
    verified: '검증 완료 협력사',
    'high-risk': '고위험 이상 협력사',
    'sla-overdue': 'SLA 초과 협력사',
  };

  return (
    <>
      <PageHeader
        title="협력사 목록"
        description="제출 지연, 고위험, FEOC 상태를 함께 보며 오늘 조치할 협력사를 빠르게 선별합니다"
        badge="운영 관제"
        actions={
          <Link
            href="/supply-chain/map"
            className="inline-flex items-center gap-2 rounded-xs border border-accent-100 bg-accent-50 px-3 py-2 text-xs font-bold text-accent-700 transition-colors hover:border-accent-600 hover:bg-white"
          >
            공급망 맵
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="space-y-6 p-8">
        <section className="grid grid-cols-4 gap-4">
          <SummaryCard
            label="시연 협력사"
            value={rows.length}
            hint="개사"
            active={summaryFilter === 'all'}
            onClick={() => applySummaryFilter('all')}
          />
          <SummaryCard
            label="검증 완료"
            value={verifiedCount}
            hint="개사"
            tone="ok"
            active={summaryFilter === 'verified'}
            onClick={() => applySummaryFilter('verified')}
          />
          <SummaryCard
            label="고위험 이상"
            value={highRiskCount}
            hint="개사"
            tone="alert"
            active={summaryFilter === 'high-risk'}
            onClick={() => applySummaryFilter('high-risk')}
          />
          <SummaryCard
            label="SLA 초과"
            value={overdueCount}
            hint={`개사 · 미완료 ${incompleteCount}`}
            tone="warn"
            active={summaryFilter === 'sla-overdue'}
            onClick={() => applySummaryFilter('sla-overdue')}
          />
        </section>

        <section className="rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="border-b border-ink-700 bg-ink-800 px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[280px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="협력사명, ID, 유형 검색"
                  className="w-full rounded-xs border border-ink-700 bg-white py-2.5 pl-9 pr-3 text-sm text-ink-100 shadow-control outline-none transition-colors placeholder:text-ink-500 focus:border-accent-600 focus:ring-2 focus:ring-accent-500/20"
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                <SlidersHorizontal className="h-4 w-4" />
                필터
              </div>
              <Select value={statusFilter} onChange={value => { clearSummaryFilter(); setStatusFilter(value as StatusFilter); }} label="상태" options={[
                { v: 'all', label: '전체' },
                { v: 'supplier_verified', label: '검증 완료' },
                { v: 'supplier_pending', label: '검토 대기' },
                { v: 'supplier_review', label: '추가 확인' },
                { v: 'supplier_violation', label: '규제 위반' },
                { v: 'supplier_suspended', label: '거래 중지' },
              ]} />
              <Select value={riskFilter} onChange={value => { clearSummaryFilter(); setRiskFilter(value as RiskFilter); }} label="위험도" options={[
                { v: 'all', label: '전체' },
                { v: 'low', label: '저위험' },
                { v: 'medium', label: '중위험' },
                { v: 'high', label: '고위험' },
                { v: 'critical', label: '최고위험' },
              ]} />
              <Select value={feocFilter} onChange={value => { clearSummaryFilter(); setFeocFilter(value as FeocFilter); }} label="FEOC" options={[
                { v: 'all', label: '전체' },
                { v: 'eligible', label: '적격' },
                { v: 'ineligible', label: '부적격' },
                { v: 'under_review', label: '검토중' },
                { v: 'unknown', label: '미파악' },
              ]} />
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3">
            <div className="flex items-center gap-2 text-xs text-ink-500">
              <Building2 className="h-4 w-4 text-ink-400" />
              <span>
                {summaryLabel[summaryFilter]} <strong className="num-mono text-ink-100">{filtered.length}</strong> / {rows.length}개사 표시
              </span>
              {summaryFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => applySummaryFilter('all')}
                  className="ml-1 rounded-xs border border-ink-700 bg-white px-2 py-1 text-[11px] font-semibold text-ink-400 hover:border-accent-600 hover:text-accent-700"
                >
                  전체 보기
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-ink-500">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-signal-alert" />규제 위반</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-signal-warn" />추가 확인</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ink-400" />검토 대기</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-signal-info" />검증 완료</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] table-fixed">
              <colgroup>
                <col className="w-[25%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[15%]" />
                <col className="w-[19%]" />
                <col className="w-[13%]" />
                <col className="w-[72px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-ink-700 bg-white">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">
                    <HeaderFilter
                      label="협력사"
                      value={supplierFilter}
                      onChange={value => { clearSummaryFilter(); setSupplierFilter(value as SupplierFilter); }}
                      options={[
                        { v: 'all', label: '전체' },
                        ...rows.map(({ brief }) => ({
                          v: brief.supplierId,
                          label: brief.companyName,
                        })),
                      ]}
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">
                    Tier · 역할
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">
                    국가
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">
                    <HeaderFilter
                      label="상태 · 위험도"
                      value={statusFilter}
                      onChange={value => { clearSummaryFilter(); setStatusFilter(value as StatusFilter); }}
                      options={[
                        { v: 'all', label: '전체' },
                        { v: 'supplier_verified', label: '검증 완료' },
                        { v: 'supplier_review', label: '추가 확인' },
                        { v: 'supplier_pending', label: '검토 대기' },
                        { v: 'supplier_violation', label: '규제 위반' },
                      ]}
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">
                    <HeaderFilter
                      label="입력 현황"
                      value={inputFilter}
                      onChange={value => { clearSummaryFilter(); setInputFilter(value as InputFilter); }}
                      options={[
                        { v: 'all', label: '전체' },
                        { v: 'complete', label: '제출 완료' },
                        { v: 'in_progress', label: '입력 중' },
                        { v: 'partial', label: '부분 제출' },
                        { v: 'missing', label: '미제출' },
                      ]}
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">
                    <HeaderFilter
                      label="주 담당자"
                      value={contactFilter}
                      onChange={value => { clearSummaryFilter(); setContactFilter(value as ContactFilter); }}
                      options={[
                        { v: 'all', label: '전체' },
                        { v: 'registered', label: '등록' },
                        { v: 'missing', label: '미등록' },
                      ]}
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-ink-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <div className="text-sm font-semibold text-ink-200">협력사 목록을 불러오는 중…</div>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 rounded-sm border border-dashed border-alert-border bg-alert-bg p-6">
                        <ShieldAlert className="h-5 w-5 text-alert-text" />
                        <div className="text-sm font-semibold text-alert-text">{error}</div>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 rounded-sm border border-dashed border-ink-700 bg-ink-800 p-6">
                        <Search className="h-5 w-5 text-ink-500" />
                        <div className="text-sm font-semibold text-ink-100">검색 결과가 없습니다</div>
                        <div className="text-xs text-ink-500">검색어 또는 필터 조건을 조정해 주세요.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(row => <SupplierRow key={row.brief.supplierId} row={row} />)
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
