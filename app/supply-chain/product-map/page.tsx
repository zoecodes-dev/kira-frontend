'use client';

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Link from 'next/link';
import {
  suppliers, supplyEdges, productInstances,
  type Supplier, type SupplierStatus, type Tier,
} from '@/lib/data';
import {
  getSupplierName, getContacts, getFactories, getCertifications,
  getCompleteness, getIncomingPOs, getOutgoingPOs, getRiskProfile,
  regulationMeta, parts, purchaseOrders, type Regulation,
} from '@/lib/supplier-detail-data';
import {
  Search, X, ChevronRight, Building2, Factory, Truck,
  AlertTriangle, CheckCircle2, Clock, ShieldAlert, MapPin,
  Phone, Mail, Globe, Layers, ArrowRight, Box,
  Users, Award, AlertCircle, TrendingUp, Info,
  ChevronDown, ChevronUp, ExternalLink, Send,
} from 'lucide-react';
import clsx from 'clsx';

// ─── 타입 ────────────────────────────────────────────────────
type PanelTab = 'overview' | 'contacts' | 'factory' | 'products' | 'risk' | 'regulations';

// ─── 맵 레이아웃 (기존 SupplyChainMap과 동일 좌표) ───────────
const layout: Record<string, { x: number; y: number }> = {
  'S-MINE-001': { x: 80,  y: 110 },
  'S-MINE-002': { x: 80,  y: 280 },
  'S-MINE-003': { x: 80,  y: 450 },
  'S-REF-001':  { x: 320, y: 110 },
  'S-REF-002':  { x: 320, y: 280 },
  'S-PRE-001':  { x: 320, y: 450 },
  'S-CAM-001':  { x: 580, y: 130 },
  'S-CAM-002':  { x: 580, y: 290 },
  'S-ANO-001':  { x: 580, y: 450 },
  'S-CELL-001': { x: 840, y: 290 },
};

const mapFont = 'Inter, Pretendard, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const statusColors: Record<SupplierStatus, { stroke: string; fill: string; text: string; glow: string }> = {
  verified:  { stroke: '#059669', fill: '#FFFFFF', text: '#047857', glow: '#10B98122' },
  pending:   { stroke: '#2563EB', fill: '#FFFFFF', text: '#1D4ED8', glow: '#3B82F622' },
  review:    { stroke: '#D97706', fill: '#FFFFFF', text: '#B45309', glow: '#F59E0B24' },
  violation: { stroke: '#DC2626', fill: '#FFFFFF', text: '#B91C1C', glow: '#EF444422' },
};

const columnHeaders = [
  { left: '3%',  tier: 5, label: '원광' },
  { left: '24%', tier: 4, label: '전구체·정제' },
  { left: '46%', tier: 3, label: '활물질' },
  { left: '72%', tier: 1, label: 'Cell · Module · Pack' },
];

// ─── 유틸 ────────────────────────────────────────────────────
function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// 특정 노드에서 upstream/downstream 모두 추적
function getConnectedIds(supplierId: string): Set<string> {
  const connected = new Set<string>([supplierId]);
  // upstream (나에게 공급하는)
  const upQueue = [supplierId];
  while (upQueue.length) {
    const cur = upQueue.shift()!;
    supplyEdges.filter(e => e.to === cur).forEach(e => {
      if (!connected.has(e.from)) { connected.add(e.from); upQueue.push(e.from); }
    });
  }
  // downstream (내가 공급하는)
  const downQueue = [supplierId];
  while (downQueue.length) {
    const cur = downQueue.shift()!;
    supplyEdges.filter(e => e.from === cur).forEach(e => {
      if (!connected.has(e.to)) { connected.add(e.to); downQueue.push(e.to); }
    });
  }
  return connected;
}

// 제품 시리얼로 연결 협력사 추적
function getProductSupplyChain(serial: string): Set<string> | null {
  const inst = productInstances.find(i => i.serialNumber === serial);
  if (!inst) return null;
  const factory = getFactories('').find(() => false); // unused
  // 생산 공장 → 제조사 supplierId 찾기
  const { factories } = require('@/lib/supplier-detail-data');
  const f = factories.find((ff: any) => ff.factoryId === inst.producedAtFactoryId);
  if (!f) return null;
  return getConnectedIds(f.supplierId);
}

// ─── 검색 ────────────────────────────────────────────────────
interface SearchHit {
  supplierId: string;
  label: string;
  sub: string;
  kind: 'supplier' | 'product' | 'material';
  serialNumber?: string;
}

function buildSearchIndex(): SearchHit[] {
  const hits: SearchHit[] = [];
  suppliers.forEach(s => {
    const name = getSupplierName(s.id);
    hits.push({
      supplierId: s.id,
      label: name ? `${name.nameEn}${name.nameKo ? ' / ' + name.nameKo : ''}` : s.name,
      sub: `${s.id} · ${s.role} · ${s.country}`,
      kind: 'supplier',
    });
  });
  productInstances.forEach(inst => {
    const f = (() => {
      try { const { factories } = require('@/lib/supplier-detail-data'); return factories.find((ff: any) => ff.factoryId === inst.producedAtFactoryId); } catch { return null; }
    })();
    hits.push({
      supplierId: f?.supplierId ?? 'S-CELL-001',
      label: inst.serialNumber,
      sub: `${inst.modelName} · ${inst.destination} · ${inst.dppStatus === 'issued' ? 'DPP 완료' : '진행 중'}`,
      kind: 'product',
      serialNumber: inst.serialNumber,
    });
  });
  parts.forEach(part => {
    const relatedPOs = purchaseOrders.filter(po => po.partId === part.id);
    if (relatedPOs.length === 0) {
      hits.push({
        supplierId: 'S-CELL-001',
        label: part.partName,
        sub: `${part.partCode} · ${part.materialType} · HS ${part.hsCode}`,
        kind: 'material',
      });
      return;
    }

    relatedPOs.forEach(po => {
      const supplier = suppliers.find(s => s.id === po.supplierId);
      const supplierName = getSupplierName(po.supplierId);
      hits.push({
        supplierId: po.supplierId,
        label: `${part.partName} · ${supplierName?.shortNameKo ?? supplierName?.shortNameEn ?? supplier?.name ?? po.supplierId}`,
        sub: `${po.poId} · ${part.partCode} · ${po.supplierPartCode} · ${po.quantity.toLocaleString()} ${po.unit} · 원산지 ${po.originCountry}`,
        kind: 'material',
      });
    });
  });
  supplyEdges.forEach(edge => {
    const supplier = suppliers.find(s => s.id === edge.from);
    const supplierName = getSupplierName(edge.from);
    hits.push({
      supplierId: edge.from,
      label: `${edge.material} · ${supplierName?.shortNameKo ?? supplierName?.shortNameEn ?? supplier?.name ?? edge.from}`,
      sub: `${edge.from} → ${edge.to} · ${edge.volume}t · 공급망 연결`,
      kind: 'material',
    });
  });
  return hits;
}

// ─── 인라인 상세 패널 ────────────────────────────────────────
function DetailPanel({
  supplier, onClose,
}: {
  supplier: Supplier;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<PanelTab>('overview');
  const name = getSupplierName(supplier.id);
  const contacts = getContacts(supplier.id);
  const factories = getFactories(supplier.id);
  const certs = getCertifications(supplier.id);
  const completeness = getCompleteness(supplier.id);
  const risk = getRiskProfile(supplier.id);
  const inPOs = getIncomingPOs(supplier.id);
  const outPOs = getOutgoingPOs(supplier.id);
  const primaryContact = contacts.find(c => c.isPrimary) ?? contacts[0];
  const productionPOs = purchaseOrders.filter(po => po.supplierId === supplier.id);
  const factoryIds = new Set(factories.map(f => f.factoryId));
  const producedProducts = productInstances.filter(p => factoryIds.has(p.producedAtFactoryId));
  const productionItemCount = productionPOs.length + producedProducts.length;

  const riskLevelMeta: Record<string, { label: string; color: string }> = {
    low:      { label: '저위험',   color: 'text-emerald-600' },
    medium:   { label: '중위험',   color: 'text-amber-600' },
    high:     { label: '고위험',   color: 'text-red-600' },
    critical: { label: '최고위험', color: 'text-red-700 font-bold' },
  };

  const tabs: { key: PanelTab; label: string; count?: number }[] = [
    { key: 'overview',    label: '개요' },
    { key: 'contacts',    label: '담당자', count: contacts.length },
    { key: 'factory',     label: '공장', count: factories.filter(f => f.factoryRole !== 'headquarters').length },
    { key: 'products',    label: '생산제품', count: productionItemCount },
    { key: 'risk',        label: '리스크' },
    { key: 'regulations', label: '규제' },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-ink-700 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-ink-700 bg-ink-800/30 shrink-0">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <StatusDot status={supplier.status} />
              <span className="text-[10px] num-mono text-ink-500">{supplier.id}</span>
              <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-xs border',
                supplier.country === 'CN' && 'bg-red-500/8 border-red-700/30 text-red-600',
                supplier.country === 'KR' && 'bg-blue-500/8 border-blue-700/30 text-blue-600',
                supplier.country === 'JP' && 'bg-purple-500/8 border-purple-700/30 text-purple-600',
                !['CN','KR','JP'].includes(supplier.country) && 'bg-ink-700 border-ink-600 text-ink-400',
              )}>
                {supplier.country}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-ink-100 leading-tight">
              {name?.nameEn ?? supplier.name}
            </h3>
            {name?.nameKo && (
              <div className="text-xs text-ink-400 mt-0.5">{name.nameKo}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-xs border border-ink-700 flex items-center justify-center text-ink-400 hover:text-ink-200 hover:border-ink-500 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="text-xs text-ink-400">{supplier.role} · {supplier.region}</div>
      </div>

      {/* 탭 */}
      <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-ink-700 bg-ink-900/20 shrink-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex items-center gap-1 px-2 py-1.5 rounded-xs text-[11px] font-medium transition-colors whitespace-nowrap',
              tab === t.key
                ? 'bg-accent-500/10 text-accent-600 border border-accent-700/30'
                : 'text-ink-400 hover:text-ink-200'
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="text-[9px] num-mono bg-ink-700 px-1 py-0.5 rounded-xs">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* ── 개요 탭 ── */}
        {tab === 'overview' && (
          <>
            {/* 완성도 */}
            {completeness && (
              <Section title="데이터 완성도">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-ink-700 rounded-xs overflow-hidden">
                    <div
                      className={clsx('h-full transition-all rounded-xs',
                        completeness.completionRate >= 90 ? 'bg-emerald-500' :
                        completeness.completionRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      )}
                      style={{ width: `${completeness.completionRate}%` }}
                    />
                  </div>
                  <span className={clsx('text-sm font-semibold num-mono',
                    completeness.completionRate >= 90 ? 'text-emerald-600' :
                    completeness.completionRate >= 70 ? 'text-amber-600' : 'text-red-600'
                  )}>
                    {completeness.completionRate}%
                  </span>
                </div>
                {completeness.missingFields.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {completeness.missingFields.slice(0, 3).map(f => (
                      <div key={f} className="flex items-center gap-1.5 text-[10px] text-amber-600">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {f}
                      </div>
                    ))}
                    {completeness.missingFields.length > 3 && (
                      <div className="text-[10px] text-ink-500">+{completeness.missingFields.length - 3}개 더</div>
                    )}
                  </div>
                )}
              </Section>
            )}

            {/* 리스크 요약 */}
            {risk && (
              <Section title="리스크 요약">
                <div className="flex items-center justify-between mb-2">
                  <span className={clsx('text-sm font-semibold', riskLevelMeta[risk.riskLevel]?.color)}>
                    {riskLevelMeta[risk.riskLevel]?.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-24 bg-ink-700 rounded-xs overflow-hidden">
                      <div
                        className={clsx('h-full',
                          risk.overallRiskScore >= 70 ? 'bg-red-500' :
                          risk.overallRiskScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                        )}
                        style={{ width: `${risk.overallRiskScore}%` }}
                      />
                    </div>
                    <span className="text-[11px] num-mono text-ink-400">{risk.overallRiskScore}/100</span>
                  </div>
                </div>
                {risk.highRiskReasons.slice(0, 2).map(r => (
                  <div key={r} className="flex items-start gap-1.5 text-[10px] text-red-600 mb-1">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                    {r}
                  </div>
                ))}
                {/* FEOC */}
                <div className={clsx(
                  'mt-2 px-2.5 py-1.5 rounded-xs border text-[11px] flex items-center justify-between',
                  risk.feocStatus === 'eligible'     && 'border-emerald-700/30 bg-emerald-500/5 text-emerald-600',
                  risk.feocStatus === 'ineligible'   && 'border-red-700/30 bg-red-500/5 text-red-600',
                  risk.feocStatus === 'under_review' && 'border-amber-700/30 bg-amber-500/5 text-amber-600',
                  risk.feocStatus === 'unknown'      && 'border-ink-700 bg-ink-800 text-ink-400',
                )}>
                  <span>FEOC</span>
                  <span className="font-semibold">
                    {risk.feocStatus === 'eligible' ? '적격' :
                     risk.feocStatus === 'ineligible' ? '부적격' :
                     risk.feocStatus === 'under_review' ? '검토 중' : '미파악'}
                  </span>
                </div>
              </Section>
            )}

            {/* PO 요약 */}
            <Section title="거래 현황">
              <div className="flex gap-3">
                <div className="flex-1 text-center py-2 rounded-xs border border-ink-700 bg-ink-900/30">
                  <div className="text-lg font-semibold num-mono text-ink-100">{outPOs.length}</div>
                  <div className="text-[10px] text-ink-500">납품 PO</div>
                </div>
                <div className="flex-1 text-center py-2 rounded-xs border border-ink-700 bg-ink-900/30">
                  <div className="text-lg font-semibold num-mono text-ink-100">{inPOs.length}</div>
                  <div className="text-[10px] text-ink-500">수신 PO</div>
                </div>
                <div className="flex-1 text-center py-2 rounded-xs border border-ink-700 bg-ink-900/30">
                  <div className={clsx('text-lg font-semibold num-mono',
                    supplier.carbonIntensity > 40 ? 'text-red-500' :
                    supplier.carbonIntensity > 20 ? 'text-amber-500' : 'text-emerald-500'
                  )}>
                    {supplier.carbonIntensity}
                  </div>
                  <div className="text-[10px] text-ink-500">kgCO₂/kg</div>
                </div>
              </div>
            </Section>

            {/* 인증서 */}
            {certs.length > 0 && (
              <Section title={`인증서 (${certs.length}건)`}>
                <div className="space-y-1">
                  {certs.slice(0, 4).map(c => (
                    <div key={c.certId} className={clsx(
                      'flex items-center justify-between px-2.5 py-1.5 rounded-xs border text-[11px]',
                      c.status === 'expired'       ? 'border-red-700/30 bg-red-500/5' :
                      c.status === 'expiring_soon' ? 'border-amber-700/30 bg-amber-500/5' :
                                                      'border-ink-700/60 bg-ink-900/30'
                    )}>
                      <span className="text-ink-200 font-medium">{c.certName}</span>
                      <span className={clsx('num-mono text-[10px]',
                        c.status === 'expired' ? 'text-red-500' :
                        c.status === 'expiring_soon' ? 'text-amber-500' : 'text-emerald-600'
                      )}>
                        {c.status === 'expired' ? '만료' :
                         c.status === 'expiring_soon' ? '만료임박' : '유효'}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        {/* ── 담당자 탭 ── */}
        {tab === 'contacts' && (
          <Section title="담당자 연락처">
            {contacts.length === 0 ? (
              <div className="text-xs text-ink-500 text-center py-4">등록된 담당자가 없습니다</div>
            ) : (
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.contactId} className={clsx(
                    'p-3 rounded-xs border',
                    c.isPrimary ? 'border-accent-700/40 bg-accent-500/5' : 'border-ink-700/60 bg-ink-900/30'
                  )}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-xs font-semibold text-ink-100">{c.name}</div>
                        <div className="text-[10px] text-ink-400">{c.role}{c.department ? ` · ${c.department}` : ''}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {c.isPrimary && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-accent-700/20 border border-accent-700/30 text-accent-500">주담당</span>
                        )}
                        {c.language && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-400">{c.language}</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-500">
                        <Mail className="w-3 h-3" />
                        {c.email}
                      </a>
                      <div className="flex items-center gap-1.5 text-[11px] text-ink-300">
                        <Phone className="w-3 h-3 text-ink-500" />
                        {c.phone}
                      </div>
                      {c.mobile && (
                        <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
                          <Phone className="w-3 h-3 text-ink-600" />
                          {c.mobile} <span className="text-[10px] text-ink-500">(모바일)</span>
                        </div>
                      )}
                      {c.factoryId && (
                        <div className="flex items-center gap-1.5 text-[10px] text-ink-500">
                          <Factory className="w-3 h-3" />
                          {factories.find(f => f.factoryId === c.factoryId)?.factoryName ?? c.factoryId}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── 공장 탭 ── */}
        {tab === 'factory' && (
          <Section title="공장·사업장">
            <div className="space-y-2">
              {factories.map(f => {
                const factoryContacts = contacts.filter(c => c.factoryId === f.factoryId);
                return (
                <div key={f.factoryId} className={clsx(
                  'p-3 rounded-xs border',
                  f.factoryRole === 'headquarters' ? 'border-blue-700/30 bg-blue-500/5' : 'border-ink-700/60 bg-ink-900/30'
                )}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-xs font-semibold text-ink-100">{f.factoryName}</div>
                      {f.factoryNameEn && f.factoryNameEn !== f.factoryName && (
                        <div className="text-[10px] text-ink-500">{f.factoryNameEn}</div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                      {f.destination && (
                        <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-xs border font-semibold',
                          f.destination === 'EU'   && 'bg-blue-500/10 border-blue-700/30 text-blue-600',
                          f.destination === 'US'   && 'bg-amber-500/10 border-amber-700/30 text-amber-600',
                          f.destination === 'BOTH' && 'bg-purple-500/10 border-purple-700/30 text-purple-600',
                          f.destination === 'KR'   && 'bg-emerald-500/10 border-emerald-700/30 text-emerald-600',
                        )}>
                          {f.destination === 'BOTH' ? 'EU+US' : f.destination}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-[10px] text-ink-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-ink-500 shrink-0" />
                      <span className="truncate">{f.address}</span>
                    </div>
                    {f.monthlyCapacity && (
                      <div className="num-mono text-ink-300">월 {f.monthlyCapacity}</div>
                    )}
                    {f.supplyRatioPercent !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-ink-700 rounded-xs overflow-hidden">
                          <div className="h-full bg-accent-600 rounded-xs" style={{ width: `${f.supplyRatioPercent}%` }} />
                        </div>
                        <span className="num-mono text-accent-500 font-semibold">{f.supplyRatioPercent}%</span>
                      </div>
                    )}
                  </div>
                  {/* 적용 규제 미니 칩 */}
                  {f.applicableRegulations && f.applicableRegulations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {f.applicableRegulations.slice(0, 5).map(reg => {
                        const m = regulationMeta[reg as Regulation];
                        if (!m) return null;
                        return (
                          <span key={reg} className={clsx(
                            'text-[8px] px-1.5 py-0.5 rounded-xs border font-medium',
                            m.color === 'emerald' && 'border-emerald-700/30 text-emerald-600 bg-emerald-500/5',
                            m.color === 'teal'    && 'border-teal-700/30 text-teal-600 bg-teal-500/5',
                            m.color === 'amber'   && 'border-amber-700/30 text-amber-600 bg-amber-500/5',
                            m.color === 'orange'  && 'border-orange-700/30 text-orange-600 bg-orange-500/5',
                            m.color === 'blue'    && 'border-blue-700/30 text-blue-600 bg-blue-500/5',
                            m.color === 'cyan'    && 'border-cyan-700/30 text-cyan-600 bg-cyan-500/5',
                            m.color === 'purple'  && 'border-purple-700/30 text-purple-600 bg-purple-500/5',
                            m.color === 'red'     && 'border-red-700/30 text-red-600 bg-red-500/5',
                            m.color === 'violet'  && 'border-violet-700/30 text-violet-600 bg-violet-500/5',
                            m.color === 'slate'   && 'border-slate-700/30 text-slate-600 bg-slate-500/5',
                          )}>
                            {m.label}
                          </span>
                        );
                      })}
                      {f.applicableRegulations.length > 5 && (
                        <span className="text-[8px] text-ink-500">+{f.applicableRegulations.length - 5}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-ink-700/50">
                    <div className="text-[9px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">
                      공장 담당자 연락처
                    </div>
                    {factoryContacts.length === 0 ? (
                      <div className="text-[10px] text-ink-500">등록된 공장 담당자가 없습니다</div>
                    ) : (
                      <div className="space-y-1.5">
                        {factoryContacts.map(c => (
                          <div key={c.contactId} className="rounded-xs border border-ink-700/50 bg-white/50 px-2.5 py-2">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <div className="text-[11px] font-semibold text-ink-100">{c.name}</div>
                                <div className="text-[10px] text-ink-500">{c.role}{c.department ? ` · ${c.department}` : ''}</div>
                              </div>
                              {c.isPrimary && (
                                <span className="shrink-0 text-[8px] px-1.5 py-0.5 rounded-xs border border-accent-700/30 bg-accent-500/8 text-accent-600">
                                  주담당
                                </span>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-[10px] text-blue-600 hover:text-blue-500">
                                <Mail className="w-2.5 h-2.5" />
                                {c.email}
                              </a>
                              <div className="flex items-center gap-1.5 text-[10px] text-ink-400">
                                <Phone className="w-2.5 h-2.5 text-ink-500" />
                                {c.phone}
                              </div>
                              {c.mobile && (
                                <div className="flex items-center gap-1.5 text-[10px] text-ink-500">
                                  <Phone className="w-2.5 h-2.5 text-ink-600" />
                                  {c.mobile} <span className="text-[9px]">(모바일)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── 생산제품 탭 ── */}
        {tab === 'products' && (
          <Section title="생산제품·납품 품목">
            {productionItemCount === 0 ? (
              <div className="text-xs text-ink-500 text-center py-4">등록된 생산제품 또는 납품 품목이 없습니다</div>
            ) : (
              <div className="space-y-3">
                {factories.map(f => {
                  const factoryPOs = productionPOs.filter(po => po.factoryId === f.factoryId);
                  const factoryProducts = producedProducts.filter(p => p.producedAtFactoryId === f.factoryId);
                  if (factoryPOs.length === 0 && factoryProducts.length === 0) return null;

                  return (
                    <div key={f.factoryId} className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-ink-100 truncate">{f.factoryName}</div>
                          {f.factoryNameEn && (
                            <div className="text-[10px] text-ink-500 truncate">{f.factoryNameEn}</div>
                          )}
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-xs border border-ink-700 text-ink-400 shrink-0">
                          {factoryPOs.length + factoryProducts.length}개 품목
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {factoryPOs.map(po => {
                          const part = parts.find(p => p.id === po.partId);
                          return (
                            <div key={po.poId} className="rounded-xs border border-ink-700/50 bg-white/50 px-2.5 py-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-[11px] font-semibold text-ink-100 truncate">
                                    {part?.partName ?? po.partId}
                                  </div>
                                  <div className="text-[10px] text-ink-500 truncate">
                                    {part?.partCode ?? po.originalPartCode} · {po.supplierPartCode}
                                  </div>
                                </div>
                                <span className="text-[10px] text-ink-400 num-mono shrink-0">
                                  {po.quantity.toLocaleString()} {po.unit}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-500 num-mono flex-wrap">
                                <span>{po.poId}</span>
                                <span>·</span>
                                <span>원산지 {po.originCountry}</span>
                                <span>·</span>
                                <span>공급 비율 {po.supplyRatio}%</span>
                              </div>
                            </div>
                          );
                        })}

                        {factoryProducts.map(product => (
                          <div key={product.serialNumber} className="rounded-xs border border-blue-700/30 bg-blue-500/5 px-2.5 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-ink-100 truncate">{product.modelName}</div>
                                <div className="text-[10px] text-ink-500 truncate">{product.productId}</div>
                              </div>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-xs border border-blue-700/30 text-blue-600 bg-blue-500/8 shrink-0">
                                완제품
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-500 num-mono flex-wrap">
                              <span>{product.serialNumber}</span>
                              <span>·</span>
                              <span>{product.destination}</span>
                              <span>·</span>
                              <span>{product.dppStatus === 'issued' ? 'DPP 발행' : product.dppStatus === 'in_progress' ? 'DPP 진행 중' : 'DPP 대기'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        )}

        {/* ── 리스크 탭 ── */}
        {tab === 'risk' && risk && (
          <>
            {/* 감사 이력 */}
            <Section title="실사 이력">
              {risk.auditRecords.length === 0 ? (
                <div className="text-xs text-ink-500 text-center py-3">감사 기록 없음</div>
              ) : (
                <div className="space-y-2">
                  {risk.auditRecords.map(a => (
                    <div key={a.auditId} className={clsx(
                      'p-3 rounded-xs border text-[11px]',
                      a.result === 'pass'             && 'border-emerald-700/30 bg-emerald-500/5',
                      a.result === 'conditional_pass' && 'border-amber-700/30 bg-amber-500/5',
                      a.result === 'fail'             && 'border-red-700/30 bg-red-500/5',
                      a.result === 'pending'          && 'border-ink-700 bg-ink-800',
                    )}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-ink-100">{a.auditDate}</span>
                        <span className={clsx('px-1.5 py-0.5 rounded-xs border text-[10px] font-semibold',
                          a.result === 'pass'             && 'border-emerald-700/30 text-emerald-600',
                          a.result === 'conditional_pass' && 'border-amber-700/30 text-amber-600',
                          a.result === 'fail'             && 'border-red-700/30 text-red-600',
                          a.result === 'pending'          && 'border-ink-700 text-ink-400',
                        )}>
                          {a.result === 'pass' ? '통과' : a.result === 'conditional_pass' ? '조건부통과' : a.result === 'fail' ? '불합격' : '대기'}
                        </span>
                      </div>
                      <div className="text-ink-400 mb-1">{a.auditor} · {a.auditType === 'on_site' ? '현장' : a.auditType === 'remote' ? '원격' : a.auditType === 'document_review' ? '서류' : '제3자'}</div>
                      {a.findings.slice(0, 2).map(f => (
                        <div key={f} className="flex items-start gap-1 text-[10px] text-amber-600 mb-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          {f}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* 인권 이슈 */}
            {risk.humanRightsIssues.length > 0 && (
              <Section title={`인권 이슈 (${risk.humanRightsIssues.length}건)`}>
                <div className="space-y-2">
                  {risk.humanRightsIssues.map(hr => (
                    <div key={hr.issueId} className={clsx(
                      'p-2.5 rounded-xs border text-[11px]',
                      hr.severity === 'critical' && 'border-red-700/40 bg-red-500/8',
                      hr.severity === 'major'    && 'border-red-700/30 bg-red-500/5',
                      hr.severity === 'minor'    && 'border-amber-700/30 bg-amber-500/5',
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={clsx('font-semibold text-[10px] uppercase',
                          hr.severity === 'critical' ? 'text-red-600' :
                          hr.severity === 'major' ? 'text-red-500' : 'text-amber-600'
                        )}>
                          {hr.severity === 'critical' ? '심각' : hr.severity === 'major' ? '중요' : '경미'}
                        </span>
                        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-xs',
                          hr.status === 'open' ? 'text-red-500 bg-red-500/10' :
                          hr.status === 'in_remediation' ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10'
                        )}>
                          {hr.status === 'open' ? '미해결' : hr.status === 'in_remediation' ? '개선중' : '해결'}
                        </span>
                      </div>
                      <div className="text-ink-300 leading-relaxed">{hr.description}</div>
                      <div className="text-[10px] text-ink-500 mt-1">출처: {hr.source} · {hr.detectedAt.slice(0, 10)}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* 산업재해 */}
            {risk.industrialAccidents.length > 0 && (
              <Section title={`산업재해 (${risk.industrialAccidents.length}건)`}>
                <div className="space-y-2">
                  {risk.industrialAccidents.map(acc => (
                    <div key={acc.accidentId} className={clsx(
                      'p-2.5 rounded-xs border text-[11px]',
                      acc.accidentType === 'fatality'       && 'border-red-700/40 bg-red-500/10',
                      acc.accidentType === 'serious_injury' && 'border-red-700/30 bg-red-500/5',
                      !['fatality','serious_injury'].includes(acc.accidentType) && 'border-amber-700/30 bg-amber-500/5',
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={clsx('font-semibold',
                          acc.accidentType === 'fatality' ? 'text-red-600' :
                          acc.accidentType === 'serious_injury' ? 'text-red-500' : 'text-amber-600'
                        )}>
                          {acc.accidentType === 'fatality' ? '사망사고' :
                           acc.accidentType === 'serious_injury' ? '중상사고' :
                           acc.accidentType === 'minor_injury' ? '경상사고' :
                           acc.accidentType === 'near_miss' ? '아차사고' : '환경사고'}
                        </span>
                        <span className="text-[10px] num-mono text-ink-400">{acc.accidentDate}</span>
                      </div>
                      <div className="text-ink-300">{acc.description}</div>
                      {acc.ltifr !== undefined && (
                        <div className="text-[10px] text-ink-500 mt-1 num-mono">LTIFR: {acc.ltifr}</div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        {/* ── 규제 탭 ── */}
        {tab === 'regulations' && (
          <Section title="공장별 적용 규제">
            {factories.filter(f => f.applicableRegulations && f.applicableRegulations.length > 0).map(f => (
              <div key={f.factoryId} className="mb-4 last:mb-0">
                <div className="text-[11px] font-semibold text-ink-300 mb-2 flex items-center gap-1.5">
                  <Factory className="w-3 h-3 text-ink-500" />
                  {f.factoryName}
                  {f.destination && (
                    <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-xs border ml-1',
                      f.destination === 'EU'   && 'border-blue-700/30 text-blue-600',
                      f.destination === 'US'   && 'border-amber-700/30 text-amber-600',
                      f.destination === 'BOTH' && 'border-purple-700/30 text-purple-600',
                    )}>
                      {f.destination === 'BOTH' ? 'EU+US' : f.destination}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {f.applicableRegulations?.map(reg => {
                    const m = regulationMeta[reg as Regulation];
                    if (!m) return null;
                    return (
                      <div key={reg} className={clsx(
                        'flex flex-col px-2 py-1.5 rounded-xs border',
                        m.color === 'emerald' && 'border-emerald-700/30 bg-emerald-500/5',
                        m.color === 'teal'    && 'border-teal-700/30 bg-teal-500/5',
                        m.color === 'amber'   && 'border-amber-700/30 bg-amber-500/5',
                        m.color === 'orange'  && 'border-orange-700/30 bg-orange-500/5',
                        m.color === 'blue'    && 'border-blue-700/30 bg-blue-500/5',
                        m.color === 'cyan'    && 'border-cyan-700/30 bg-cyan-500/5',
                        m.color === 'purple'  && 'border-purple-700/30 bg-purple-500/5',
                        m.color === 'red'     && 'border-red-700/30 bg-red-500/5',
                        m.color === 'violet'  && 'border-violet-700/30 bg-violet-500/5',
                        m.color === 'slate'   && 'border-slate-700/30 bg-slate-500/5',
                      )}>
                        <span className={clsx('text-[9px] font-bold',
                          m.color === 'emerald' && 'text-emerald-600',
                          m.color === 'teal'    && 'text-teal-600',
                          m.color === 'amber'   && 'text-amber-600',
                          m.color === 'orange'  && 'text-orange-600',
                          m.color === 'blue'    && 'text-blue-600',
                          m.color === 'cyan'    && 'text-cyan-600',
                          m.color === 'purple'  && 'text-purple-600',
                          m.color === 'red'     && 'text-red-600',
                          m.color === 'violet'  && 'text-violet-600',
                          m.color === 'slate'   && 'text-slate-600',
                        )}>
                          {m.label}
                        </span>
                        <span className="text-[8px] text-ink-500 mt-0.5">{m.region}</span>
                      </div>
                    );
                  })}
                </div>
                {f.hiddenRegulations && f.hiddenRegulations.length > 0 && (
                  <div className="text-[9px] text-ink-500 flex items-center gap-1">
                    <span>숨김:</span>
                    {f.hiddenRegulations.map(r => regulationMeta[r as Regulation]?.label).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}

      </div>

      {/* 푸터 */}
      <div className="border-t border-ink-700 px-5 py-3 flex items-center justify-between shrink-0 bg-ink-900/20">
        <div className="text-[10px] text-ink-500 num-mono">마지막 검증 {supplier.lastVerified}</div>
        <Link
          href={`/suppliers/${supplier.id}`}
          className="flex items-center gap-1 text-[11px] text-accent-500 hover:text-accent-400 transition-colors"
        >
          워크스페이스 열기 <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── 섹션 래퍼 ───────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function StatusDot({ status }: { status: SupplierStatus }) {
  const colors: Record<SupplierStatus, string> = {
    verified:  'bg-emerald-500',
    pending:   'bg-blue-500',
    review:    'bg-amber-500',
    violation: 'bg-red-500',
  };
  return <div className={clsx('w-2 h-2 rounded-full shrink-0', colors[status])} />;
}

// ─── 인라인 SVG 맵 ───────────────────────────────────────────
function InlineMap({
  selectedId,
  focusIds,
  onSelect,
}: {
  selectedId: string | null;
  focusIds: Set<string> | null;
  onSelect: (s: Supplier) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const isEdgeActive = (from: string, to: string) => {
    const active = selectedId || hovered;
    if (!active) return false;
    return from === active || to === active;
  };

  return (
    <div className="relative w-full select-none">
      {/* 컬럼 헤더 */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {columnHeaders.map(col => (
          <div
            key={col.tier}
            className="absolute top-3 text-[10px] uppercase tracking-wider text-ink-400 font-medium"
            style={{ left: col.left }}
          >
            <span className="num-mono text-accent-500 mr-1">T{col.tier}</span>· {col.label}
          </div>
        ))}
      </div>

      <svg viewBox="0 0 980 520" className="w-full" style={{ minHeight: 320, fontFamily: mapFont }}>
        <defs>
          <filter id="product-map-shadow" x="-12%" y="-18%" width="124%" height="136%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.10" />
          </filter>
        </defs>
        {/* 엣지 */}
        {supplyEdges.map((edge, i) => {
          const from = layout[edge.from];
          const to   = layout[edge.to];
          if (!from || !to) return null;

          const active  = isEdgeActive(edge.from, edge.to);
          const dimmed  = focusIds ? (!focusIds.has(edge.from) || !focusIds.has(edge.to)) : false;
          const midX    = (from.x + to.x) / 2;
          const path    = `M ${from.x + 68} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - 68} ${to.y}`;

          return (
            <g key={i}>
              <path
                d={path} fill="none"
                stroke={active ? '#0F766E' : '#CBD5E1'}
                strokeWidth={active ? 2 : 1}
                opacity={dimmed ? 0.14 : (active ? 1 : 0.7)}
              />
              {active && (
                <text x={midX} y={(from.y + to.y) / 2 - 7} fill="#0F766E" fontSize="9" fontWeight="700" textAnchor="middle">
                  {edge.material} · {edge.volume}t
                </text>
              )}
            </g>
          );
        })}

        {/* 노드 */}
        {suppliers.map(s => {
          const pos = layout[s.id];
          if (!pos) return null;

          const c          = statusColors[s.status];
          const isSelected = s.id === selectedId;
          const isHov      = s.id === hovered;
          const dimmed     = focusIds ? !focusIds.has(s.id) : false;
          const opacity    = dimmed ? 0.18 : 1;

          const name = getSupplierName(s.id);

          return (
            <g
              key={s.id}
              transform={`translate(${pos.x - 68}, ${pos.y - 26})`}
              style={{ cursor: 'pointer', opacity }}
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => !dimmed && onSelect(s)}
            >
              {/* 선택/호버 글로우 */}
              {(isSelected || isHov) && (
                <rect x={-6} y={-6} width={148} height={64} rx={6} fill={c.glow} />
              )}
              {/* 카드 */}
              <rect width={136} height={52} rx={5} fill={c.fill} stroke={c.stroke} strokeWidth={isSelected ? 2 : 1} filter="url(#product-map-shadow)" />

              {/* Tier 배지 */}
              <rect x={6} y={6} width={26} height={13} rx={2} fill="#F1F5F9" stroke="#CBD5E1" />
              <text x={19} y={16} fill="#334155" fontSize="8" textAnchor="middle" fontWeight="800" fontFamily="'JetBrains Mono', monospace">
                T{s.tier}
              </text>

              {/* 상태 점 */}
              <circle cx={124} cy={13} r={3.5} fill={c.stroke} />

              {/* 이름 */}
              <text x={6} y={34} fill="#0F172A" fontSize="10" fontWeight="800">
                {truncate(name?.shortNameEn ?? s.name, 17)}
              </text>

              {/* 상태 */}
              <text x={6} y={46} fill={c.text} fontSize="8.8" fontWeight="800">
                {s.status === 'verified' ? '검증 완료' : s.status === 'violation' ? '위반 확인' : s.status === 'review' ? '검토 중' : '대기'}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 범례 */}
      <div className="absolute bottom-2 right-2 flex items-center gap-3 text-[10px] text-ink-400 bg-white/80 backdrop-blur px-2.5 py-1.5 rounded-xs border border-ink-700">
        <LegendDot color="#10B981" label="검증" />
        <LegendDot color="#3B82F6" label="대기" />
        <LegendDot color="#F59E0B" label="확인" />
        <LegendDot color="#EF4444" label="위반" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────
function ProductMapContent() {
  const searchParams = useSearchParams();
  const serialParam  = searchParams.get('serial');

  const [query, setQuery]           = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [focusIds, setFocusIds]     = useState<Set<string> | null>(null);

  // 시리얼 파라미터로 진입 시 자동 포커스
  useEffect(() => {
    if (!serialParam) return;
    const inst = productInstances.find(i => i.serialNumber === serialParam);
    if (!inst) return;
    try {
      const { factories: fList } = require('@/lib/supplier-detail-data');
      const f = fList.find((ff: any) => ff.factoryId === inst.producedAtFactoryId);
      if (!f) return;
      const ids = getConnectedIds(f.supplierId);
      setFocusIds(ids);
      const s = suppliers.find(sup => sup.id === f.supplierId);
      if (s) setSelectedSupplier(s);
      setQuery(serialParam);
    } catch {}
  }, [serialParam]);

  // 검색 인덱스 (메모이제이션)
  const searchIndex = useMemo(() => buildSearchIndex(), []);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return searchIndex.filter(h =>
      h.label.toLowerCase().includes(q) || h.sub.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, searchIndex]);

  const handleSearchSelect = useCallback((hit: SearchHit) => {
    setQuery(hit.label);
    setShowDropdown(false);

    if (hit.kind === 'product' && hit.serialNumber) {
      // 제품 시리얼 → 연결 공급망 포커스
      const inst = productInstances.find(i => i.serialNumber === hit.serialNumber);
      if (!inst) return;
      try {
        const { factories: fList } = require('@/lib/supplier-detail-data');
        const f = fList.find((ff: any) => ff.factoryId === inst.producedAtFactoryId);
        if (!f) return;
        const ids = getConnectedIds(f.supplierId);
        setFocusIds(ids);
        const s = suppliers.find(sup => sup.id === f.supplierId);
        if (s) setSelectedSupplier(s);
      } catch {}
    } else {
      // 협력사 직접 선택
      const s = suppliers.find(sup => sup.id === hit.supplierId);
      if (s) {
        setSelectedSupplier(s);
        setFocusIds(getConnectedIds(s.id));
      }
    }
  }, []);

  const handleMapSelect = useCallback((s: Supplier) => {
    setSelectedSupplier(prev => prev?.id === s.id ? null : s);
    setFocusIds(getConnectedIds(s.id));
    setQuery('');
  }, []);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setFocusIds(null);
    setSelectedSupplier(null);
  }, []);

  const focusedCount = focusIds?.size ?? suppliers.length;

  return (
    <>
      <PageHeader
        title="제품별 공급망 맵"
        description="제품 또는 협력사 검색 → 연결 공급망 확인 · 노드 클릭 후 입력 요청 발송"
        badge="신규"
        actions={
          <div className="flex items-center gap-3">
            <Link href="/supply-chain/request-map" className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-200 transition-colors">
              <Send className="w-3.5 h-3.5" />
              입력 요청 현황
              <ArrowRight className="w-3 h-3" />
            </Link>
            <Link href="/products" className="flex items-center gap-1.5 text-xs text-accent-600 hover:text-accent-500 transition-colors">
              <Box className="w-3.5 h-3.5" />
              제품 목록
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        }
      />

      {/* ── 검색바 (최상단 고정) ── */}
      <div className="sticky top-[73px] z-20 bg-white/95 backdrop-blur border-b border-ink-700 px-8 py-3">
        <div className="relative">
          <div className={clsx(
            'flex items-center gap-3 px-4 py-2.5 rounded-xs border transition-colors bg-ink-800/30',
            showDropdown || query ? 'border-accent-600/60' : 'border-ink-700',
          )}>
            <Search className="w-4 h-4 text-ink-400 shrink-0" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="제품 시리얼번호 · 협력사명 · 국가 · 역할 검색 — 입력하면 맵이 즉시 반영됩니다"
              className="flex-1 bg-transparent text-sm text-ink-200 placeholder:text-ink-500 outline-none"
            />
            {query && (
              <button onClick={handleClearSearch} className="text-ink-500 hover:text-ink-300 transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
            {focusIds && (
              <div className="flex items-center gap-1.5 text-[11px] text-accent-500 border-l border-ink-700 pl-3 shrink-0">
                <Layers className="w-3.5 h-3.5" />
                <span className="num-mono">{focusedCount}</span>개 노드 포커스
              </div>
            )}
          </div>

          {/* 검색 드롭다운 */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-ink-700 rounded-xs shadow-lg z-30 overflow-hidden">
              {searchResults.map((hit, i) => (
                <button
                  key={i}
                  onMouseDown={() => handleSearchSelect(hit)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-ink-800/30 transition-colors text-left border-b border-ink-700/40 last:border-0"
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-xs flex items-center justify-center shrink-0',
                    hit.kind === 'product' && 'bg-blue-500/10 text-blue-500',
                    hit.kind === 'material' && 'bg-amber-500/10 text-amber-600',
                    hit.kind === 'supplier' && 'bg-accent-500/10 text-accent-500',
                  )}>
                    {hit.kind === 'product' ? <Box className="w-3 h-3" /> :
                     hit.kind === 'material' ? <Layers className="w-3 h-3" /> :
                     <Building2 className="w-3 h-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-ink-200 truncate">{hit.label}</div>
                    <div className="text-[10px] text-ink-500 truncate">{hit.sub}</div>
                  </div>
                  <span className="text-[9px] text-ink-500 shrink-0">
                    {hit.kind === 'product' ? '제품' : hit.kind === 'material' ? '품목' : '협력사'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 메인 레이아웃: 맵 + 사이드 패널 ── */}
      <div className="flex h-[calc(100vh-144px)] overflow-hidden">

        {/* 맵 영역 */}
        <div className={clsx(
          'flex-1 overflow-auto p-6 transition-all duration-300',
          selectedSupplier ? 'pr-3' : ''
        )}>
          {/* 필터 칩 바 */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {focusIds && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xs border border-accent-700/40 bg-accent-500/8 text-[11px] text-accent-500">
                <Layers className="w-3 h-3" />
                {selectedSupplier ? (
                  <span>
                    <strong>{getSupplierName(selectedSupplier.id)?.shortNameEn ?? selectedSupplier.name}</strong> 연결 공급망
                  </span>
                ) : '포커스 활성'}
                <button onClick={handleClearSearch} className="hover:text-accent-300 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {!focusIds && (
              <div className="text-[11px] text-ink-500">
                전체 {suppliers.length}개 협력사 · {supplyEdges.length}개 연결 — 노드를 클릭하거나 검색하면 해당 공급망이 강조됩니다
              </div>
            )}
          </div>

          {/* 맵 */}
          <div className="rounded-sm border border-ink-700 bg-white overflow-hidden shadow-control">
            <InlineMap
              selectedId={selectedSupplier?.id ?? null}
              focusIds={focusIds}
              onSelect={handleMapSelect}
            />
          </div>

          {/* Tier 통계 하단 */}
          <div className="hidden mt-4 grid-cols-5 gap-2">
            {([5,4,3,2,1] as Tier[]).map(tier => {
              const count = suppliers.filter(s => s.tiers.includes(tier)).length;
              return (
                <div key={tier} className="text-center py-2 rounded-xs border border-ink-700/60 bg-ink-800/30">
                  <div className="text-[10px] text-accent-500 num-mono font-semibold">T{tier}</div>
                  <div className="text-sm font-semibold num-mono text-ink-200">{count}</div>
                  <div className="text-[9px] text-ink-500">
                    {['Pack','Cell','활물질','정제','광산'][5-tier]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 인라인 상세 패널 (모달 없이) */}
        {selectedSupplier && (
          <div className="w-[400px] shrink-0 border-l border-ink-700 overflow-hidden">
            <DetailPanel
              key={selectedSupplier.id}
              supplier={selectedSupplier}
              onClose={() => { setSelectedSupplier(null); setFocusIds(null); }}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default function ProductMapPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-xs text-ink-500">로딩 중...</div>
    }>
      <ProductMapContent />
    </Suspense>
  );
}
