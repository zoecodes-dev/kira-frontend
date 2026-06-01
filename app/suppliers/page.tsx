'use client';

import { useMemo, useState } from 'react';
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
  Mail,
  Phone,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import Badge from '@/components/Badge';
import PageHeader from '@/components/PageHeader';
import TopStatCard from '@/components/TopStatCard';
import { suppliers, type Supplier, type Tier } from '@/lib/data';
import {
  getCompleteness,
  getContacts,
  getRemindLogs,
  getRiskProfile,
  getSupplierName,
  supplierExtended,
} from '@/lib/supplier-detail-data';

type StatusFilter = 'all' | 'verified' | 'pending' | 'review' | 'violation';
type RiskFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';
type TierFilter = 'all' | Tier;
type CountryFilter = 'all' | keyof typeof countryName;
type FeocFilter = 'all' | 'eligible' | 'ineligible' | 'under_review' | 'unknown';
type InputFilter = 'all' | 'complete' | 'in_progress' | 'partial' | 'missing';
type ContactFilter = 'all' | 'registered' | 'missing';
type SummaryFilter = 'all' | 'verified' | 'high-risk' | 'sla-overdue';
type SupplierFilter = 'all' | Supplier['id'];

const statusMeta: Record<string, { label: string; tone: 'ok' | 'warn' | 'alert' | 'info' | 'neutral'; dot: string }> = {
  verified: { label: '검증 완료', tone: 'info', dot: 'bg-signal-info' },
  pending: { label: '검토 대기', tone: 'neutral', dot: 'bg-ink-400' },
  review: { label: '추가 확인', tone: 'warn', dot: 'bg-signal-warn' },
  violation: { label: '규제 위반', tone: 'alert', dot: 'bg-signal-alert' },
};

const riskMeta: Record<string, { label: string; className: string }> = {
  low: { label: '저위험', className: 'text-emerald-800' },
  medium: { label: '중위험', className: 'text-amber-800' },
  high: { label: '고위험', className: 'text-red-800' },
  critical: { label: '최고위험', className: 'text-red-900 font-bold' },
};

const feocMeta: Record<string, { label: string; className: string }> = {
  eligible: { label: 'FEOC 적격', className: 'text-emerald-800' },
  ineligible: { label: 'FEOC 부적격', className: 'text-red-800' },
  under_review: { label: 'FEOC 검토중', className: 'text-amber-800' },
  unknown: { label: 'FEOC 미파악', className: 'text-ink-500' },
};

const countryName: Record<string, string> = {
  KR: '한국',
  CN: '중국',
  JP: '일본',
  AU: '호주',
  CL: '칠레',
  PH: '필리핀',
  CD: '콩고',
  ID: '인도네시아',
};

function completenessMeta(rate: number) {
  if (rate >= 100) return { label: '제출 완료', tone: 'info' as const, bar: 'bg-blue-600', text: 'text-blue-800', filter: 'complete' as const };
  if (rate >= 80) return { label: '입력 중', tone: 'ok' as const, bar: 'bg-emerald-600', text: 'text-emerald-800', filter: 'in_progress' as const };
  if (rate >= 50) return { label: '부분 제출', tone: 'warn' as const, bar: 'bg-amber-500', text: 'text-amber-800', filter: 'partial' as const };
  return { label: '미제출', tone: 'alert' as const, bar: 'bg-red-600', text: 'text-red-800', filter: 'missing' as const };
}

function getRegulationWarnings(missingFields: string[]) {
  const rules = [
    { label: 'EUDR', match: ['광산 폴리곤', 'EIA'] },
    { label: 'UFLPA', match: ['광물 추적', '아동노동'] },
    { label: 'IRA', match: ['FEOC 지분'] },
    { label: 'EU Battery', match: ['제3자 검증', '탄소'] },
  ];

  return rules.filter(rule => rule.match.some(keyword => missingFields.some(field => field.includes(keyword))));
}

function SupplierRow({ supplier }: { supplier: Supplier }) {
  const name = getSupplierName(supplier.id);
  const contacts = getContacts(supplier.id);
  const completeness = getCompleteness(supplier.id);
  const risk = getRiskProfile(supplier.id);
  const remindLogs = getRemindLogs(supplier.id);
  const primary = contacts.find(contact => contact.isPrimary) ?? contacts[0];
  const extended = supplierExtended.find(item => item.supplierId === supplier.id);
  const status = statusMeta[supplier.status];
  const riskLevel = riskMeta[supplier.risk];
  const feoc = risk ? feocMeta[risk.feocStatus] : null;
  const rate = completeness?.completionRate ?? 0;
  const missing = completeness?.missingFields ?? [];
  const progress = completenessMeta(rate);
  const warnings = getRegulationWarnings(missing);
  const isSlaOver = remindLogs.some(log => log.status === 'overdue') || remindLogs.length >= 2;

  return (
    <tr className="group border-b border-ink-700 bg-white transition-colors hover:bg-ink-800">
      <td className="px-5 py-4 align-top">
        <div className="flex items-start gap-3">
          <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', status.dot)} />
          <div className="min-w-0">
            <Link
              href={`/suppliers/${supplier.id}/info`}
              className="block truncate text-sm font-bold text-ink-100 transition-colors group-hover:text-accent-700"
            >
              {name?.nameEn ?? supplier.name}
            </Link>
            {name?.nameKo && <div className="mt-0.5 truncate text-xs text-ink-500">{name.nameKo}</div>}
            <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-500">
              <span className="num-mono">{supplier.id}</span>
              {extended && (
                <>
                  <span className="text-ink-600">·</span>
                  <span>{extended.providerType}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="text-xs font-semibold text-ink-200">{supplier.role}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {supplier.tiers.map(tier => (
            <span key={tier} className="rounded-xs border border-ink-700 bg-ink-800 px-1.5 py-0.5 text-[10px] font-semibold text-ink-400">
              T{tier}
            </span>
          ))}
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="text-xs font-semibold text-ink-200">{countryName[supplier.country] ?? supplier.country}</div>
        <div className="mt-0.5 text-[11px] text-ink-500">{supplier.region}</div>
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
            {missing.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-800">
                <AlertCircle className="h-3 w-3" />
                누락 {missing.length}항목
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                필수값 완료
              </span>
            )}
            {isSlaOver && (
              <span className="inline-flex items-center gap-1 rounded-xs border border-orange-300 bg-orange-50 px-1.5 py-0.5 font-semibold text-orange-800">
                <Clock className="h-3 w-3" />
                SLA 초과
              </span>
            )}
          </div>
          {warnings.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {warnings.map(warning => (
                <span key={warning.label} className="rounded-xs border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-800">
                  {warning.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        {primary ? (
          <div className="min-w-[180px]">
            <div className="truncate text-xs font-semibold text-ink-100">{primary.name}</div>
            <div className="mt-0.5 text-[11px] text-ink-500">{primary.role}</div>
            <a href={`mailto:${primary.email}`} className="mt-1 flex items-center gap-1 truncate text-[11px] font-medium text-blue-700 hover:text-blue-900">
              <Mail className="h-3 w-3 shrink-0" />
              {primary.email}
            </a>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-500">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="num-mono">{primary.phone}</span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-ink-500">미등록</span>
        )}
      </td>

      <td className="px-5 py-4 align-top text-right">
        <Link
          href={`/suppliers/${supplier.id}/info`}
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
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
  active = false,
  onClick,
}: {
  icon: typeof Users;
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all');
  const [feocFilter, setFeocFilter] = useState<FeocFilter>('all');
  const [inputFilter, setInputFilter] = useState<InputFilter>('all');
  const [contactFilter, setContactFilter] = useState<ContactFilter>('all');
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all');
  const [supplierFilter, setSupplierFilter] = useState<SupplierFilter>('all');

  const resetDetailFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setRiskFilter('all');
    setTierFilter('all');
    setCountryFilter('all');
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

    return suppliers.filter(supplier => {
      const remindLogs = getRemindLogs(supplier.id);
      const isSlaOver = remindLogs.some(log => log.status === 'overdue');
      const contacts = getContacts(supplier.id);

      if (summaryFilter === 'verified' && supplier.status !== 'verified') return false;
      if (summaryFilter === 'high-risk' && supplier.risk !== 'high' && supplier.risk !== 'critical') return false;
      if (summaryFilter === 'sla-overdue' && !isSlaOver) return false;

      if (supplierFilter !== 'all' && supplier.id !== supplierFilter) return false;
      if (statusFilter !== 'all' && supplier.status !== statusFilter) return false;
      if (riskFilter !== 'all' && supplier.risk !== riskFilter) return false;
      if (tierFilter !== 'all' && !supplier.tiers.includes(tierFilter as Tier)) return false;
      if (countryFilter !== 'all' && supplier.country !== countryFilter) return false;

      const completeness = getCompleteness(supplier.id);
      const inputState = completenessMeta(completeness?.completionRate ?? 0).filter;
      if (inputFilter !== 'all' && inputState !== inputFilter) return false;
      if (contactFilter === 'registered' && contacts.length === 0) return false;
      if (contactFilter === 'missing' && contacts.length > 0) return false;

      const risk = getRiskProfile(supplier.id);
      if (feocFilter !== 'all' && risk?.feocStatus !== feocFilter) return false;

      if (!q) return true;

      const name = getSupplierName(supplier.id);
      const haystack = [
        supplier.id,
        supplier.name,
        supplier.role,
        supplier.country,
        supplier.region,
        name?.nameEn,
        name?.nameKo,
        name?.shortNameEn,
        name?.shortNameKo,
        ...supplier.material,
        ...contacts.flatMap(contact => [contact.name, contact.email, contact.role]),
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(q);
    });
  }, [contactFilter, countryFilter, feocFilter, inputFilter, riskFilter, search, statusFilter, summaryFilter, supplierFilter, tierFilter]);

  const highRiskCount = suppliers.filter(supplier => supplier.risk === 'high' || supplier.risk === 'critical').length;
  const overdueCount = suppliers.filter(supplier => getRemindLogs(supplier.id).some(log => log.status === 'overdue')).length;
  const incompleteCount = suppliers.filter(supplier => (getCompleteness(supplier.id)?.completionRate ?? 0) < 80).length;
  const verifiedCount = suppliers.filter(supplier => supplier.status === 'verified').length;
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
            href="/supply-chain/product-map"
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
            icon={Users}
            label="시연 협력사"
            value={suppliers.length}
            hint="개사"
            active={summaryFilter === 'all'}
            onClick={() => applySummaryFilter('all')}
          />
          <SummaryCard
            icon={CheckCircle2}
            label="검증 완료"
            value={verifiedCount}
            hint="개사"
            tone="ok"
            active={summaryFilter === 'verified'}
            onClick={() => applySummaryFilter('verified')}
          />
          <SummaryCard
            icon={ShieldAlert}
            label="고위험 이상"
            value={highRiskCount}
            hint="개사"
            tone="alert"
            active={summaryFilter === 'high-risk'}
            onClick={() => applySummaryFilter('high-risk')}
          />
          <SummaryCard
            icon={Clock}
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
                  placeholder="협력사명, ID, 담당자, 국가 검색"
                  className="w-full rounded-xs border border-ink-700 bg-white py-2.5 pl-9 pr-3 text-sm text-ink-100 shadow-control outline-none transition-colors placeholder:text-ink-500 focus:border-accent-600 focus:ring-2 focus:ring-accent-500/20"
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                <SlidersHorizontal className="h-4 w-4" />
                필터
              </div>
              <Select value={statusFilter} onChange={value => { clearSummaryFilter(); setStatusFilter(value as StatusFilter); }} label="상태" options={[
                { v: 'all', label: '전체' },
                { v: 'verified', label: '검증 완료' },
                { v: 'pending', label: '검토 대기' },
                { v: 'review', label: '추가 확인' },
                { v: 'violation', label: '규제 위반' },
              ]} />
              <Select value={String(tierFilter)} onChange={value => { clearSummaryFilter(); setTierFilter(value === 'all' ? 'all' : Number(value) as Tier); }} label="Tier" options={[
                { v: 'all', label: '전체' },
                { v: '1', label: 'T1' },
                { v: '2', label: 'T2' },
                { v: '3', label: 'T3' },
                { v: '4', label: 'T4' },
                { v: '5', label: 'T5' },
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
                {summaryLabel[summaryFilter]} <strong className="num-mono text-ink-100">{filtered.length}</strong> / {suppliers.length}개사 표시
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
                        ...suppliers.map(supplier => ({
                          v: supplier.id,
                          label: getSupplierName(supplier.id)?.nameEn ?? supplier.name,
                        })),
                      ]}
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">
                    <HeaderFilter
                      label="Tier · 역할"
                      value={String(tierFilter)}
                      onChange={value => { clearSummaryFilter(); setTierFilter(value === 'all' ? 'all' : Number(value) as Tier); }}
                      options={[
                        { v: 'all', label: '전체' },
                        { v: '1', label: 'T1' },
                        { v: '2', label: 'T2' },
                        { v: '3', label: 'T3' },
                        { v: '4', label: 'T4' },
                        { v: '5', label: 'T5' },
                      ]}
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">
                    <HeaderFilter
                      label="국가"
                      value={countryFilter}
                      onChange={value => { clearSummaryFilter(); setCountryFilter(value as CountryFilter); }}
                      options={[{ v: 'all', label: '전체' }, ...Object.entries(countryName).map(([v, label]) => ({ v, label }))]}
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">
                    <HeaderFilter
                      label="상태 · 위험도"
                      value={statusFilter}
                      onChange={value => { clearSummaryFilter(); setStatusFilter(value as StatusFilter); }}
                      options={[
                        { v: 'all', label: '전체' },
                        { v: 'verified', label: '검증 완료' },
                        { v: 'review', label: '추가 확인' },
                        { v: 'pending', label: '검토 대기' },
                        { v: 'violation', label: '규제 위반' },
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
                {filtered.length === 0 ? (
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
                  filtered.map(supplier => <SupplierRow key={supplier.id} supplier={supplier} />)
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
