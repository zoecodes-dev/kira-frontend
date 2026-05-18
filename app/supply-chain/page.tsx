'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import SupplyChainMap from '@/components/SupplyChainMap';
import SupplierDetailModal from '@/components/SupplierDetailModal';
import SearchResultsPanel, { type SearchResult } from '@/components/SearchResultsPanel';
import { suppliers, supplyEdges, Supplier, Tier } from '@/lib/data';
import {
  getSupplierExtended, getIncomingPOs, getOutgoingPOs, getCompleteness,
} from '@/lib/supplier-detail-data';
import {
  Search, Filter, ChevronDown, X,
  CheckCircle2, AlertCircle, AlertTriangle, Clock
} from 'lucide-react';
import clsx from 'clsx';

type StatusFilter = 'all' | 'verified' | 'pending' | 'review' | 'violation';
type TierFilter = 'all' | Tier;
// 상하위 관계 탭은 협력사 포털로 이동 → relation 제거
type ModalTab = 'completeness' | 'parts' | 'cert' | 'factory' | 'company';

export default function SupplyChainPage() {
  const [openSupplier, setOpenSupplier] = useState<Supplier | null>(null);
  const [initialTab, setInitialTab] = useState<ModalTab | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');

  // 권한 시뮬은 협력사 포털로 이동 — 여기는 항상 원청 ESG 시점
  // (전체 협력사 모두 조회 가능)
  const visibleIds = useMemo(
    () => new Set<string>(suppliers.map(s => s.id)),
    []
  );

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (tierFilter !== 'all' && !s.tiers.includes(tierFilter as Tier)) return false;
      if (countryFilter !== 'all' && s.country !== countryFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = [
          s.name, s.id, s.role, s.region, s.country,
          ...s.material,
          ...(s.certifications || []),
        ].join(' ').toLowerCase();
        const ext = getSupplierExtended(s.id);
        const allPos = [...getIncomingPOs(s.id), ...getOutgoingPOs(s.id)];
        const poHay = allPos.map(po => `${po.poNumber} ${po.supplierPartCode} ${po.originalPartCode}`).join(' ').toLowerCase();
        if (!haystack.includes(q) && !poHay.includes(q) && !(ext?.ceoName.toLowerCase().includes(q))) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, statusFilter, tierFilter, countryFilter]);

  // 맵 하이라이트 ID (검색/필터 매치)
  const highlightIds = useMemo(() => {
    if (!searchQuery && statusFilter === 'all' && tierFilter === 'all' && countryFilter === 'all') {
      return undefined;
    }
    return new Set(filteredSuppliers.map(s => s.id));
  }, [searchQuery, statusFilter, tierFilter, countryFilter, filteredSuppliers]);

  const verifiedCount  = suppliers.filter(s => s.status === 'verified').length;
  const violationCount = suppliers.filter(s => s.status === 'violation').length;
  const reviewCount    = suppliers.filter(s => s.status === 'review').length;
  const pendingCount   = suppliers.filter(s => s.status === 'pending').length;

  const countries = Array.from(new Set(suppliers.map(s => s.country))).sort();
  const filtersActive =
    statusFilter !== 'all' || tierFilter !== 'all' || countryFilter !== 'all' || searchQuery !== '';

  const handleSearchResultSelect = (result: SearchResult) => {
    const supplier = suppliers.find(s => s.id === result.supplierId);
    if (!supplier) return;
    // 상하위 관계는 더이상 모달 탭이 아니므로 'relation'은 'company'로 폴백
    const targetTab = result.targetTab === 'relation' as any ? 'company' : result.targetTab;
    setInitialTab(targetTab as ModalTab);
    setOpenSupplier(supplier);
  };

  const handleSupplierOpen = (s: Supplier, tab: ModalTab = 'completeness') => {
    setInitialTab(tab);
    setOpenSupplier(s);
  };

  return (
    <>
      <PageHeader
        title="공급망 맵"
        description="N차 협력사 추적 · 원청 ESG 시점 · 시연 데이터 10개사 (전체 운영: 187개사)"
        badge="시연용 샘플"
      />

      <div className="p-8 space-y-5">
        {/* === 상단 통계 === */}
        <div className="grid grid-cols-4 gap-4">
          <StatTile label="검증 완료" count={verifiedCount} total={suppliers.length} tone="ok" />
          <StatTile label="검토 대기" count={pendingCount}  total={suppliers.length} tone="info" />
          <StatTile label="추가 확인 필요" count={reviewCount} total={suppliers.length} tone="warn" />
          <StatTile label="규제 위반" count={violationCount} total={suppliers.length} tone="alert" />
        </div>

        {/* === 검색 & 필터 + 인라인 결과 패널 === */}
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="협력사명·PO번호·부품코드·HS코드·담당자·국가 코드 검색..."
                className="w-full pl-9 pr-9 py-2 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 placeholder:text-ink-500 focus:border-accent-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <FilterChip label="상태" value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)}
                options={[
                  { v: 'all',       label: '전체' },
                  { v: 'verified',  label: '검증 완료' },
                  { v: 'pending',   label: '검토 대기' },
                  { v: 'review',    label: '추가 확인' },
                  { v: 'violation', label: '규제 위반' },
                ]} />
              <FilterChip label="Tier" value={String(tierFilter)} onChange={(v) => setTierFilter(v === 'all' ? 'all' : Number(v) as Tier)}
                options={[
                  { v: 'all', label: '전체' },
                  { v: '1',   label: 'T1 Pack/Module' },
                  { v: '2',   label: 'T2 Cell' },
                  { v: '3',   label: 'T3 활물질' },
                  { v: '4',   label: 'T4 전구체·정제' },
                  { v: '5',   label: 'T5 원광' },
                ]} />
              <FilterChip label="국가" value={countryFilter} onChange={(v) => setCountryFilter(v)}
                options={[{ v: 'all', label: '전체' }, ...countries.map(c => ({ v: c, label: c }))]} />

              {filtersActive && (
                <button
                  onClick={() => {
                    setSearchQuery(''); setStatusFilter('all'); setTierFilter('all'); setCountryFilter('all');
                  }}
                  className="text-[11px] text-accent-400 hover:text-accent-300 flex items-center gap-1 px-2 py-1"
                >
                  <X className="w-3 h-3" /> 필터 초기화
                </button>
              )}
            </div>
          </div>

          {searchQuery.trim() && (
            <SearchResultsPanel
              query={searchQuery}
              onSelect={handleSearchResultSelect}
              visibleSupplierIds={visibleIds}
            />
          )}

          {!searchQuery.trim() && (statusFilter !== 'all' || tierFilter !== 'all' || countryFilter !== 'all') && (
            <div className="mt-3 pt-3 border-t border-ink-700/60 text-[11px] text-ink-400">
              필터 적용 결과: <span className="num-mono text-ink-200 font-medium">{filteredSuppliers.length}</span>개 협력사
            </div>
          )}
        </Card>

        {/* === 풀폭 공급망 맵 === */}
        <Card
          title="공급망 추적도"
          subtitle="좌측(T5 원광) → 우측(T1 Pack/Module) 흐름"
          action={
            <div className="text-[11px] text-ink-400 num-mono">
              노드 {suppliers.length}개 · 연결 {supplyEdges.length}개
            </div>
          }
        >
          <SupplyChainMap
            onSelectNode={(s) => s && handleSupplierOpen(s)}
            selectedId={openSupplier?.id}
            highlightIds={highlightIds}
          />
        </Card>

        {/* === 협력사 테이블 === */}
        <Card
          title="협력사 목록"
          subtitle={filtersActive ? `필터 적용 — ${filteredSuppliers.length}개` : '시연용 10개사 전체'}
        >
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink-400 border-b border-ink-700">
                  <th className="text-left font-medium px-5 py-3">협력사</th>
                  <th className="text-left font-medium px-3 py-3">Tier</th>
                  <th className="text-left font-medium px-3 py-3">역할</th>
                  <th className="text-left font-medium px-3 py-3">소재지</th>
                  <th className="text-right font-medium px-3 py-3">탄소집약도</th>
                  <th className="text-right font-medium px-3 py-3">완성도</th>
                  <th className="text-left font-medium px-3 py-3">상태</th>
                  <th className="text-right font-medium px-5 py-3">최근 검증</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers
                  .sort((a, b) => a.tier - b.tier)
                  .map(s => {
                    const comp = getCompleteness(s.id);
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-ink-700/40 hover:bg-ink-800/40 cursor-pointer"
                        onClick={() => handleSupplierOpen(s)}
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium text-ink-100">{s.name}</div>
                          <div className="text-[10px] text-ink-500 num-mono">{s.id}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-0.5 flex-wrap">
                            {s.tiers.map(t => (
                              <span key={t} className="text-[10px] num-mono px-1 py-0.5 rounded-xs bg-ink-700 text-ink-200">
                                T{t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-200">{s.role}</td>
                        <td className="px-3 py-3 text-xs text-ink-300">{s.country} · {s.region}</td>
                        <td className="px-3 py-3 text-right text-xs num-mono text-ink-200">
                          {s.carbonIntensity}
                          <span className="text-ink-500 ml-0.5">kg</span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs num-mono">
                          {comp ? (
                            <span className={clsx(
                              comp.completionRate >= 90 ? 'text-emerald-700' :
                              comp.completionRate >= 70 ? 'text-amber-700' : 'text-red-700'
                            )}>
                              {comp.completionRate}%
                            </span>
                          ) : (
                            <span className="text-ink-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-ink-300 num-mono">
                          {s.lastVerified}
                        </td>
                      </tr>
                    );
                  })}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-xs text-ink-500">
                      <Search className="w-6 h-6 mx-auto mb-2 text-ink-600" />
                      검색 조건에 맞는 협력사가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* === 협력사 상세 모달 (원청 ESG 시점 고정) === */}
      <SupplierDetailModal
        supplier={openSupplier}
        onClose={() => { setOpenSupplier(null); setInitialTab(undefined); }}
        viewerRole="owner_esg"
        onSelectSupplier={(s) => handleSupplierOpen(s)}
        initialTab={initialTab}
      />
    </>
  );
}

// === 필터 칩 ===
function FilterChip({ label, value, options, onChange }: any) {
  const [open, setOpen] = useState(false);
  const current = options.find((o: any) => o.v === value);
  const isActive = value !== 'all';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-xs border transition-colors',
          isActive
            ? 'border-accent-700/40 bg-accent-700/10 text-accent-300'
            : 'border-ink-700 hover:border-ink-600 text-ink-300'
        )}
      >
        <Filter className="w-3 h-3" />
        <span className="text-ink-400">{label}:</span>
        <span className="font-medium">{current?.label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 min-w-[180px] rounded-xs border border-ink-700 bg-ink-800 shadow-lg py-1">
            {options.map((opt: any) => (
              <button
                key={opt.v}
                onClick={() => { onChange(opt.v); setOpen(false); }}
                className={clsx(
                  'w-full text-left text-[11px] px-3 py-1.5 hover:bg-ink-700/60 transition-colors',
                  opt.v === value ? 'text-accent-400 font-medium' : 'text-ink-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// === 통계 타일 ===
function StatTile({ label, count, total, tone }: any) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const t: any = {
    ok:    { bar: 'bg-emerald-700', text: 'text-emerald-700', icon: CheckCircle2 },
    info:  { bar: 'bg-blue-700',    text: 'text-blue-700',    icon: Clock },
    warn:  { bar: 'bg-amber-700',   text: 'text-amber-700',   icon: AlertCircle },
    alert: { bar: 'bg-red-700',     text: 'text-red-700',     icon: AlertTriangle },
  }[tone];
  const Icon = t.icon;
  return (
    <div className="rounded-sm border border-ink-700 bg-ink-800/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-ink-400">{label}</span>
        <Icon className={clsx('w-3.5 h-3.5', t.text)} />
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className={clsx('text-3xl font-semibold num-mono', t.text)}>{count}</span>
        <span className="text-xs text-ink-500 num-mono">/ {total}</span>
      </div>
      <div className="h-1 bg-ink-700 rounded-xs overflow-hidden">
        <div className={`h-full ${t.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// === 상태 배지 ===
function StatusBadge({ status }: { status: any }) {
  const map: any = {
    verified:  { tone: 'ok',    label: '검증 완료' },
    pending:   { tone: 'info',  label: '검토 대기' },
    review:    { tone: 'warn',  label: '추가 확인' },
    violation: { tone: 'alert', label: '규제 위반' },
  };
  const m = map[status] || map.pending;
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}
