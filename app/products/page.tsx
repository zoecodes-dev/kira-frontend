'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import { suppliers, type Supplier, type Tier } from '@/lib/data';
import {
  getSupplierName, getContacts, getCompleteness, getRiskProfile,
  supplierExtended,
} from '@/lib/supplier-detail-data';
import {
  Search, Filter, ChevronRight, AlertTriangle, CheckCircle2,
  Clock, AlertCircle, Building2, Phone, Mail, Globe,
  ArrowUpRight, ShieldAlert, Users,
} from 'lucide-react';
import clsx from 'clsx';

// ─── 필터 타입 ────────────────────────────────────────────────
type StatusFilter = 'all' | 'verified' | 'pending' | 'review' | 'violation';
type RiskFilter   = 'all' | 'low' | 'medium' | 'high' | 'critical';
type TierFilter   = 'all' | Tier;
type FeocFilter   = 'all' | 'eligible' | 'ineligible' | 'under_review' | 'unknown';

// ─── 메타 ────────────────────────────────────────────────────
const statusMeta: Record<string, { label: string; dot: string; badge: string }> = {
  verified:  { label: '검증 완료', dot: 'bg-emerald-500', badge: 'border-emerald-700/30 bg-emerald-500/8 text-emerald-600' },
  pending:   { label: '검토 대기', dot: 'bg-blue-500',    badge: 'border-blue-700/30 bg-blue-500/8 text-blue-600' },
  review:    { label: '추가 확인', dot: 'bg-amber-500',   badge: 'border-amber-700/30 bg-amber-500/8 text-amber-600' },
  violation: { label: '규제 위반', dot: 'bg-red-500',     badge: 'border-red-700/30 bg-red-500/8 text-red-600' },
};

const riskMeta: Record<string, { label: string; color: string }> = {
  low:      { label: '저위험',   color: 'text-emerald-600' },
  medium:   { label: '중위험',   color: 'text-amber-600' },
  high:     { label: '고위험',   color: 'text-red-600' },
  critical: { label: '최고위험', color: 'text-red-700 font-bold' },
};

const feocMeta: Record<string, { label: string; color: string }> = {
  eligible:     { label: 'FEOC 적격',   color: 'text-emerald-600' },
  ineligible:   { label: 'FEOC 부적격', color: 'text-red-600' },
  under_review: { label: 'FEOC 검토중', color: 'text-amber-600' },
  unknown:      { label: 'FEOC 미파악', color: 'text-ink-500' },
};

const countryName: Record<string, string> = {
  KR: '한국', CN: '중국', JP: '일본', AU: '호주', CL: '칠레',
  PH: '필리핀', CD: '콩고', ID: '인도네시아',
};

// ─── 협력사 행 ───────────────────────────────────────────────
function SupplierRow({ supplier }: { supplier: Supplier }) {
  const name        = getSupplierName(supplier.id);
  const contacts    = getContacts(supplier.id);
  const completeness = getCompleteness(supplier.id);
  const risk        = getRiskProfile(supplier.id);
  const ext         = supplierExtended.find(e => e.supplierId === supplier.id);
  const primary     = contacts.find(c => c.isPrimary) ?? contacts[0];
  const sm          = statusMeta[supplier.status];
  const rm          = riskMeta[supplier.risk];
  const fm          = risk ? feocMeta[risk.feocStatus] : feocMeta['unknown'];

  return (
    <tr className="border-b border-ink-700/40 hover:bg-ink-800/30 transition-colors group">
      {/* 협력사명 */}
      <td className="px-5 py-3.5">
        <div className="flex items-start gap-3">
          <div className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', sm.dot)} />
          <div className="min-w-0">
            <Link
              href={`/suppliers/${supplier.id}`}
              className="text-xs font-semibold text-ink-100 hover:text-accent-500 transition-colors group-hover:text-accent-400 block truncate"
            >
              {name?.nameEn ?? supplier.name}
            </Link>
            {name?.nameKo && (
              <div className="text-[10px] text-ink-500 truncate">{name.nameKo}</div>
            )}
            <div className="text-[10px] text-ink-500 num-mono mt-0.5">{supplier.id}</div>
          </div>
        </div>
      </td>

      {/* Tier + 역할 */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] num-mono font-bold text-accent-500 bg-accent-500/8 px-1.5 py-0.5 rounded-xs">
            T{supplier.tier}
          </span>
        </div>
        <div className="text-[10px] text-ink-400 mt-1 leading-tight">{supplier.role}</div>
      </td>

      {/* 국가 */}
      <td className="px-4 py-3.5">
        <div className="text-xs font-medium text-ink-200">{supplier.country}</div>
        <div className="text-[10px] text-ink-500">{countryName[supplier.country] ?? ''}</div>
        <div className="text-[10px] text-ink-500 truncate">{supplier.region}</div>
      </td>

      {/* 상태 */}
      <td className="px-4 py-3.5">
        <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-xs border', sm.badge)}>
          {sm.label}
        </span>
      </td>

      {/* 위험도 + FEOC */}
      <td className="px-4 py-3.5">
        <div className={clsx('text-[11px] font-semibold', rm.color)}>{rm.label}</div>
        <div className={clsx('text-[10px] mt-0.5', fm.color)}>{fm.label}</div>
        {risk?.isHighRiskFlag && (
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-red-500">
            <AlertTriangle className="w-3 h-3" />
            고위험 플래그
          </div>
        )}
      </td>

      {/* 완성도 */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-14 h-1.5 bg-ink-700 rounded-xs overflow-hidden">
            <div
              className="h-full rounded-xs"
              style={{
                width: `${completeness?.completionRate ?? 0}%`,
                backgroundColor: (completeness?.completionRate ?? 0) >= 90 ? '#10B981' :
                                  (completeness?.completionRate ?? 0) >= 70 ? '#F59E0B' : '#EF4444',
              }}
            />
          </div>
          <span className="text-[11px] num-mono text-ink-300">{completeness?.completionRate ?? 0}%</span>
        </div>
      </td>

      {/* 주 담당자 */}
      <td className="px-4 py-3.5">
        {primary ? (
          <div>
            <div className="text-xs text-ink-200 font-medium truncate">{primary.name}</div>
            <div className="text-[10px] text-ink-400">{primary.role}</div>
            <a
              href={`mailto:${primary.email}`}
              className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-400 mt-0.5 truncate"
            >
              <Mail className="w-2.5 h-2.5 shrink-0" />
              {primary.email}
            </a>
            <div className="flex items-center gap-1 text-[10px] text-ink-400 num-mono">
              <Phone className="w-2.5 h-2.5 shrink-0" />
              {primary.phone}
            </div>
          </div>
        ) : (
          <span className="text-[10px] text-ink-500">—</span>
        )}
      </td>

      {/* 상세 링크 */}
      <td className="px-4 py-3.5">
        <Link
          href={`/suppliers/${supplier.id}`}
          className="flex items-center gap-1 text-[11px] text-accent-500 hover:text-accent-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          상세
          <ChevronRight className="w-3 h-3" />
        </Link>
      </td>
    </tr>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function SuppliersPage() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [riskFilter, setRiskFilter]     = useState<RiskFilter>('all');
  const [tierFilter, setTierFilter]     = useState<TierFilter>('all');
  const [feocFilter, setFeocFilter]     = useState<FeocFilter>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (riskFilter !== 'all'   && s.risk !== riskFilter)     return false;
      if (tierFilter !== 'all'   && !s.tiers.includes(tierFilter as Tier)) return false;
      if (feocFilter !== 'all') {
        const risk = getRiskProfile(s.id);
        if (!risk || risk.feocStatus !== feocFilter) return false;
      }
      if (q) {
        const name = getSupplierName(s.id);
        const hay = [
          s.id, s.name, s.role, s.country, s.region,
          name?.nameEn, name?.nameKo, name?.shortNameEn, name?.shortNameKo,
          ...s.material,
          ...getContacts(s.id).flatMap(c => [c.name, c.email, c.role]),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, statusFilter, riskFilter, tierFilter, feocFilter]);

  // KPI
  const highRiskCount = suppliers.filter(s => {
    const r = getRiskProfile(s.id);
    return r?.isHighRiskFlag;
  }).length;

  return (
    <>
      <PageHeader
        title="협력사 목록"
        description="전체 협력사 관리 · 영문 기본 + 한글 병기 · 담당자 연락처 포함"
        actions={
          <div className="flex items-center gap-3 text-xs text-ink-400">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              시연 <span className="num-mono text-ink-200 font-medium">{suppliers.length}</span>개사
              <span className="text-ink-500">(전체 187개사)</span>
            </span>
            {highRiskCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <ShieldAlert className="w-3.5 h-3.5" />
                고위험 {highRiskCount}개사
              </span>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-4">

        {/* 필터 바 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 검색 */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="협력사명 · ID · 담당자 · 국가"
              className="w-full pl-8 pr-3 py-2 rounded-xs border border-ink-700 bg-ink-800/50 text-sm text-ink-200 placeholder:text-ink-500 outline-none focus:border-accent-600 transition-colors"
            />
          </div>

          <Select value={statusFilter} onChange={v => setStatusFilter(v as StatusFilter)} options={[
            { v: 'all',       label: '상태: 전체' },
            { v: 'verified',  label: '검증 완료' },
            { v: 'pending',   label: '검토 대기' },
            { v: 'review',    label: '추가 확인' },
            { v: 'violation', label: '규제 위반' },
          ]} />
          <Select value={tierFilter} onChange={v => setTierFilter(v === 'all' ? 'all' : Number(v) as Tier)} options={[
            { v: 'all', label: 'Tier: 전체' },
            { v: '1',   label: 'T1 Pack/Module' },
            { v: '3',   label: 'T3 활물질' },
            { v: '4',   label: 'T4 전구체·정제' },
            { v: '5',   label: 'T5 원광' },
          ]} />
          <Select value={riskFilter} onChange={v => setRiskFilter(v as RiskFilter)} options={[
            { v: 'all',      label: '위험도: 전체' },
            { v: 'low',      label: '저위험' },
            { v: 'medium',   label: '중위험' },
            { v: 'high',     label: '고위험' },
            { v: 'critical', label: '최고위험' },
          ]} />
          <Select value={feocFilter} onChange={v => setFeocFilter(v as FeocFilter)} options={[
            { v: 'all',          label: 'FEOC: 전체' },
            { v: 'eligible',     label: '적격' },
            { v: 'ineligible',   label: '부적격' },
            { v: 'under_review', label: '검토중' },
            { v: 'unknown',      label: '미파악' },
          ]} />

          <div className="text-[11px] text-ink-500 num-mono ml-auto">
            {filtered.length} / {suppliers.length}개사 표시
          </div>
        </div>

        {/* 테이블 */}
        <div className="rounded-sm border border-ink-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-700 bg-ink-800/30">
                  {[
                    '협력사 (영문 / 한글)',
                    'Tier · 역할',
                    '국가',
                    '상태',
                    '위험도 · FEOC',
                    '완성도',
                    '주 담당자',
                    '',
                  ].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-ink-500 font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-xs text-ink-500">
                      검색 결과가 없습니다
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => <SupplierRow key={s.id} supplier={s} />)
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}

function Select({ value, onChange, options }: {
  value: string | number;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-[11px] num-mono px-2.5 py-2 rounded-xs border border-ink-700 bg-ink-800/50 text-ink-300 outline-none focus:border-accent-600"
    >
      {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
    </select>
  );
}
