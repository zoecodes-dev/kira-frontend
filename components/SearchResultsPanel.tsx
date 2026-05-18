'use client';

import { Supplier, suppliers, tierShortLabels } from '@/lib/data';
import {
  supplierExtended, supplierContacts, parts, purchaseOrders,
  type PurchaseOrder, type Part, type SupplierContact, type SupplierExtended
} from '@/lib/supplier-detail-data';
import {
  Building2, Truck, Package, Mail, MapPin, Search, ArrowRight
} from 'lucide-react';
import clsx from 'clsx';

// 검색 결과 카테고리
export type SearchResultKind =
  | 'supplier'   // 협력사
  | 'po'         // PO/송장
  | 'part'       // 부품 (HS코드 매칭 포함)
  | 'contact'    // 담당자
  | 'country';   // 원산지국

export interface SearchResult {
  kind: SearchResultKind;
  // 클릭 시 어느 협력사 모달을 열지
  supplierId: string;
  // 모달의 어느 탭으로 점프할지
  targetTab: 'completeness' | 'parts' | 'cert' | 'factory' | 'relation' | 'company';
  // 표시 정보
  title: string;
  subtitle: string;
  hint?: string;
}

interface Props {
  query: string;
  onSelect: (result: SearchResult) => void;
  // 권한 시뮬: 보이는 협력사만 검색 대상에 포함
  visibleSupplierIds: Set<string>;
}

// 부분일치 (대소문자 무시)
const matches = (haystack: string, q: string) =>
  haystack.toLowerCase().includes(q.toLowerCase());

// 검색 함수
function searchAll(query: string, visibleSupplierIds: Set<string>): SearchResult[] {
  if (!query.trim()) return [];
  const q = query.trim();
  const results: SearchResult[] = [];

  // 1. 협력사 매칭 (이름/ID/역할/지역/CEO/광물)
  suppliers.forEach(s => {
    if (!visibleSupplierIds.has(s.id)) return;
    const ext = supplierExtended.find(e => e.supplierId === s.id);
    const hayStr = [
      s.name, s.id, s.role, s.region, s.country,
      ...s.material, ext?.ceoName, ext?.businessRegNo, ext?.dunsNumber,
    ].filter(Boolean).join(' ');
    if (matches(hayStr, q)) {
      results.push({
        kind: 'supplier',
        supplierId: s.id,
        targetTab: 'completeness',
        title: s.name,
        subtitle: `${s.id} · ${s.role}`,
        hint: `${s.country} · ${s.region}`,
      });
    }
  });

  // 2. PO/송장 매칭 (poNumber, 부품코드)
  purchaseOrders.forEach(po => {
    // 어느 협력사의 모달을 열지 = 수신측(receiverSupplierId)이 더 유용 (원청 입장)
    // 단, 양쪽 다 visible이어야 함
    const supplier = suppliers.find(s => s.id === po.supplierId);
    if (!supplier || !visibleSupplierIds.has(po.supplierId)) return;
    const hayStr = [
      po.poNumber, po.supplierPartCode, po.originalPartCode,
    ].join(' ');
    if (matches(hayStr, q)) {
      const part = parts.find(p => p.id === po.partId);
      results.push({
        kind: 'po',
        supplierId: po.supplierId,
        targetTab: 'parts',
        title: po.poNumber,
        subtitle: `${supplier.name} → ${po.receiverSupplierId}`,
        hint: `${part?.partName ?? po.originalPartCode} · ${po.quantity.toLocaleString()}${po.unit}`,
      });
    }
  });

  // 3. 부품 매칭 (부품명/HS코드/협력사 코드)
  parts.forEach(part => {
    const hayStr = [part.partName, part.partCode, part.hsCode, part.materialType].join(' ');
    if (matches(hayStr, q)) {
      // 이 부품을 공급하는 협력사 찾기 (PO에서 역추적)
      const relatedPOs = purchaseOrders.filter(po => po.partId === part.id);
      const supplierIds = Array.from(new Set(relatedPOs.map(po => po.supplierId)));
      supplierIds.forEach(sid => {
        if (!visibleSupplierIds.has(sid)) return;
        const supplier = suppliers.find(s => s.id === sid);
        if (!supplier) return;
        results.push({
          kind: 'part',
          supplierId: sid,
          targetTab: 'parts',
          title: `${part.partName} · ${supplier.name}`,
          subtitle: `${part.partCode} · HS ${part.hsCode}`,
          hint: `T${part.tierLevel} ${tierShortLabels[part.tierLevel]} · $${part.unitPrice}/${part.purchaseUnit}`,
        });
      });
    }
  });

  // 4. 담당자 매칭 (이름/이메일/역할)
  supplierContacts.forEach(c => {
    if (!visibleSupplierIds.has(c.supplierId)) return;
    const hayStr = [c.name, c.email, c.role, c.phone].join(' ');
    if (matches(hayStr, q)) {
      const supplier = suppliers.find(s => s.id === c.supplierId);
      if (!supplier) return;
      results.push({
        kind: 'contact',
        supplierId: c.supplierId,
        targetTab: 'company',
        title: `${c.name} (${c.role})`,
        subtitle: c.email,
        hint: supplier.name,
      });
    }
  });

  // 5. 국가 매칭 (ISO 2자리 또는 한글)
  const countryMatches = new Set<string>();
  suppliers.forEach(s => {
    if (!visibleSupplierIds.has(s.id)) return;
    if (matches(s.country, q)) countryMatches.add(s.country);
  });
  countryMatches.forEach(country => {
    const countrySuppliers = suppliers.filter(s => s.country === country && visibleSupplierIds.has(s.id));
    if (countrySuppliers.length > 0) {
      // 국가 매칭은 첫 번째 협력사로 점프
      results.push({
        kind: 'country',
        supplierId: countrySuppliers[0].id,
        targetTab: 'factory',
        title: `원산지국: ${country}`,
        subtitle: `${countrySuppliers.length}개 협력사`,
        hint: countrySuppliers.map(s => s.name).slice(0, 2).join(', ') + (countrySuppliers.length > 2 ? '…' : ''),
      });
    }
  });

  return results;
}

// 카테고리별 메타 (아이콘·라벨·우선순위)
const categoryMeta: Record<SearchResultKind, { icon: any; label: string; order: number }> = {
  supplier: { icon: Building2, label: '협력사',     order: 1 },
  po:       { icon: Truck,     label: 'PO·송장',    order: 2 },
  part:     { icon: Package,   label: '부품·HS코드', order: 3 },
  contact:  { icon: Mail,      label: '담당자',      order: 4 },
  country:  { icon: MapPin,    label: '원산지국',    order: 5 },
};

export default function SearchResultsPanel({ query, onSelect, visibleSupplierIds }: Props) {
  const results = searchAll(query, visibleSupplierIds);

  if (!query.trim()) return null;

  // 카테고리별 그룹핑
  const grouped = results.reduce((acc, r) => {
    if (!acc[r.kind]) acc[r.kind] = [];
    acc[r.kind].push(r);
    return acc;
  }, {} as Record<SearchResultKind, SearchResult[]>);

  const totalCount = results.length;

  if (totalCount === 0) {
    return (
      <div className="mt-3 pt-3 border-t border-ink-700/60 text-center py-6">
        <Search className="w-5 h-5 text-ink-600 mx-auto mb-2" />
        <p className="text-xs text-ink-400">
          <span className="num-mono text-ink-200">"{query}"</span>에 해당하는 결과가 없습니다
        </p>
        <p className="text-[10px] text-ink-500 mt-1">
          협력사명, PO 번호, 부품 코드, HS 코드, 담당자 이름, 국가 코드로 검색해보세요
        </p>
      </div>
    );
  }

  // 우선순위 정렬된 카테고리 목록
  const sortedKinds = (Object.keys(grouped) as SearchResultKind[])
    .sort((a, b) => categoryMeta[a].order - categoryMeta[b].order);

  return (
    <div className="mt-3 pt-3 border-t border-ink-700/60">
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">
          검색 결과 <span className="num-mono text-accent-400 ml-1">{totalCount}</span>건
        </div>
        <div className="text-[10px] text-ink-500">결과를 클릭하면 해당 협력사 상세로 이동합니다</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-1">
        {sortedKinds.map(kind => {
          const meta = categoryMeta[kind];
          const Icon = meta.icon;
          const items = grouped[kind];
          return (
            <div key={kind} className="space-y-1 mb-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-500 font-semibold pb-1 border-b border-ink-700/40">
                <Icon className="w-3 h-3" />
                <span>{meta.label}</span>
                <span className="num-mono text-ink-400">({items.length})</span>
              </div>
              {items.slice(0, 5).map((r, i) => (
                <button
                  key={i}
                  onClick={() => onSelect(r)}
                  className="w-full text-left rounded-xs border border-ink-700/40 bg-ink-900/40 hover:bg-ink-800/60 hover:border-accent-700/40 px-2.5 py-1.5 group transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink-100 truncate group-hover:text-accent-400">
                        {r.title}
                      </div>
                      <div className="text-[10px] text-ink-400 truncate num-mono">{r.subtitle}</div>
                      {r.hint && <div className="text-[10px] text-ink-500 truncate">{r.hint}</div>}
                    </div>
                    <ArrowRight className="w-3 h-3 text-ink-500 group-hover:text-accent-400 shrink-0" />
                  </div>
                </button>
              ))}
              {items.length > 5 && (
                <div className="text-[10px] text-ink-500 px-2.5 num-mono">+ {items.length - 5}건 더</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
