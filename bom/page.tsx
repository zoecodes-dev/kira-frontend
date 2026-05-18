'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import KpiCard from '@/components/KpiCard';
import {
  products,
  bomVersions,
  parts,
  bomItems,
  partCodeMappings,
  manufacturingProcesses,
  partSuppliers,
  partCompleteness,
  buildPartTree,
  type PartTreeNode,
  type Part,
} from '@/lib/bom-data';
import { suppliers } from '@/lib/data';
import {
  GitBranch, ChevronRight, ChevronDown, Package, Box, Cpu, FlaskConical,
  Pickaxe, CircleDot, MapPin, DollarSign, Hash, CheckCircle2, AlertCircle,
  Layers, FileText, ArrowDownToLine, Building2, History, ExternalLink
} from 'lucide-react';
import clsx from 'clsx';

// 계층별 아이콘
const tierIcons: Record<number, any> = {
  1: Package,
  2: Box,
  3: Cpu,
  4: FlaskConical,
  5: Pickaxe,
};

const tierLabels: Record<number, string> = {
  1: 'Pack',
  2: 'Module',
  3: 'Cell',
  4: '전구체/소재',
  5: '광물',
};

// ISO 2자리 → 한글명
const countryNames: Record<string, string> = {
  KR: '한국', CN: '중국', JP: '일본', AU: '호주',
  CL: '칠레', ZA: '남아공', DE: '독일', US: '미국',
};

export default function BomPage() {
  const [selectedPartId, setSelectedPartId] = useState<string>('PRT-001');
  const tree = useMemo(() => buildPartTree('PRT-001'), []);
  const selectedPart = parts.find(p => p.id === selectedPartId);
  const activeBom = bomVersions.find(b => b.status === 'active');
  const product = products[0];

  // 통계
  const avgCompleteness = (
    partCompleteness.reduce((sum, c) => sum + c.completionRate, 0) / partCompleteness.length
  ).toFixed(1);
  const incompleteCount = partCompleteness.filter(c => c.completionRate < 100).length;

  return (
    <>
      <PageHeader
        title="BOM 관리"
        description={`${product.productName} · 활성 BOM ${activeBom?.versionNumber} · 5계층 부품 트리`}
        badge="제품 마스터"
        actions={
          <div className="flex items-center gap-2 text-xs text-ink-400 num-mono">
            <History className="w-3.5 h-3.5 text-accent-500" />
            마지막 승인 {activeBom?.approvedAt}
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {/* === KPI === */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="등록 제품"
            value={products.length}
            unit="종"
            icon={Package}
            hint="활성 모델"
          />
          <KpiCard
            label="활성 BOM"
            value={activeBom?.versionNumber || '—'}
            icon={GitBranch}
            tone="info"
            hint={`이력 ${bomVersions.length}건`}
          />
          <KpiCard
            label="등록 부품"
            value={parts.length}
            unit="개"
            icon={Layers}
            hint="5계층 트리"
          />
          <KpiCard
            label="데이터 완성도"
            value={avgCompleteness}
            unit="%"
            icon={CheckCircle2}
            tone={Number(avgCompleteness) >= 90 ? 'ok' : 'warn'}
            hint={`미완성 ${incompleteCount}개`}
          />
        </div>

        {/* === 메인: 트리 + 상세 === */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* 좌측: 부품 트리 (3/5) */}
          <Card
            className="xl:col-span-3"
            title="부품 계층 구조"
            subtitle={`Pack → Module → Cell → 전구체 → 광물 (5계층) · ${activeBom?.versionNumber}`}
            action={
              <div className="text-[11px] text-ink-400 num-mono">
                부품 {parts.length}개 · 연결 {bomItems.length}개
              </div>
            }
          >
            {tree && (
              <div className="space-y-1">
                <TreeNode
                  node={tree}
                  selectedId={selectedPartId}
                  onSelect={setSelectedPartId}
                  depth={0}
                />
              </div>
            )}

            {/* 범례 */}
            <div className="mt-6 pt-4 border-t border-ink-700/60 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-ink-400">
              <div className="uppercase tracking-wider font-semibold">범례</div>
              {[1, 2, 3, 4, 5].map(tier => {
                const Icon = tierIcons[tier];
                return (
                  <div key={tier} className="flex items-center gap-1.5">
                    <Icon className="w-3 h-3 text-accent-500" strokeWidth={1.8} />
                    <span>T{tier} {tierLabels[tier]}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 우측: 부품 상세 (2/5) */}
          <Card
            className="xl:col-span-2"
            title={selectedPart ? selectedPart.partName : '부품을 선택하세요'}
            subtitle={selectedPart ? selectedPart.partCode : '좌측 트리에서 부품을 클릭하면 상세가 표시됩니다'}
          >
            {selectedPart ? (
              <PartDetail part={selectedPart} />
            ) : (
              <div className="py-12 text-center text-xs text-ink-500">
                <Box className="w-8 h-8 mx-auto mb-3 text-ink-600" />
                부품을 선택하세요
              </div>
            )}
          </Card>
        </div>

        {/* === 하단: BOM 버전 이력 === */}
        <Card
          title="BOM 버전 이력"
          subtitle={`${product.productName} · 시간순`}
        >
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink-400 border-b border-ink-700">
                  <th className="text-left font-medium px-5 py-3">버전</th>
                  <th className="text-left font-medium px-3 py-3">상태</th>
                  <th className="text-left font-medium px-3 py-3">유효 기간</th>
                  <th className="text-left font-medium px-3 py-3">승인자</th>
                  <th className="text-right font-medium px-3 py-3">승인 일시</th>
                  <th className="text-right font-medium px-5 py-3">생성일</th>
                </tr>
              </thead>
              <tbody>
                {bomVersions.map(bv => (
                  <tr key={bv.id} className="border-b border-ink-700/40 hover:bg-ink-800/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-3.5 h-3.5 text-accent-500" />
                        <span className="font-medium text-ink-100 num-mono">{bv.versionNumber}</span>
                      </div>
                      <div className="text-[10px] text-ink-500 num-mono mt-0.5">{bv.id}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        tone={bv.status === 'active' ? 'ok' : bv.status === 'draft' ? 'info' : 'neutral'}
                        dot={bv.status === 'active'}
                      >
                        {bv.status === 'active' ? '활성' : bv.status === 'draft' ? '초안' : '폐기'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-300 num-mono">
                      {bv.effectiveFrom} ~ {bv.effectiveTo || '—'}
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-200">{bv.approvedBy}</td>
                    <td className="px-3 py-3 text-right text-xs text-ink-300 num-mono">{bv.approvedAt}</td>
                    <td className="px-5 py-3 text-right text-xs text-ink-400 num-mono">{bv.createdAt.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

// =====================================================
// 트리 노드 (재귀)
// =====================================================
function TreeNode({
  node,
  selectedId,
  onSelect,
  depth,
}: {
  node: PartTreeNode;
  selectedId: string;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const Icon = tierIcons[node.tierLevel];
  const isSelected = node.id === selectedId;
  const hasChildren = node.children.length > 0;

  const bomItem = bomItems.find(bi => bi.partId === node.id);
  const completionRate = node.completeness?.completionRate ?? 100;
  const completenessColor =
    completionRate >= 90 ? 'text-emerald-700' :
    completionRate >= 70 ? 'text-amber-700' : 'text-red-700';

  return (
    <div>
      <div
        className={clsx(
          'group flex items-center gap-2 py-2 pr-3 rounded-xs border cursor-pointer transition-colors',
          isSelected
            ? 'border-accent-500/60 bg-accent-500/5'
            : 'border-transparent hover:bg-ink-800/40 hover:border-ink-700/40'
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* 펼침 토글 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className={clsx(
            'w-4 h-4 flex items-center justify-center text-ink-500 hover:text-ink-200 shrink-0',
            !hasChildren && 'invisible'
          )}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* 계층 아이콘 */}
        <div className={clsx(
          'w-6 h-6 rounded-xs flex items-center justify-center shrink-0',
          isSelected ? 'bg-accent-700/30' : 'bg-ink-800'
        )}>
          <Icon className={clsx('w-3.5 h-3.5', isSelected ? 'text-accent-400' : 'text-ink-300')} strokeWidth={1.8} />
        </div>

        {/* 부품명 + 코드 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx('text-sm font-medium truncate', isSelected ? 'text-ink-50' : 'text-ink-100')}>
              {node.partName}
            </span>
            <span className="text-[10px] text-ink-500 num-mono shrink-0">{node.partCode}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-ink-400 num-mono">
              T{node.tierLevel} · {tierLabels[node.tierLevel]}
            </span>
            <span className="text-[10px] text-ink-500 num-mono">
              HS {node.hsCode}
            </span>
            {bomItem && (
              <span className="text-[10px] text-ink-400 num-mono">
                {bomItem.requiredQuantity}{bomItem.requiredQuantityUnit} · {bomItem.percentage}%
              </span>
            )}
          </div>
        </div>

        {/* 원산지 칩 */}
        {node.originCountries.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            {node.originCountries.slice(0, 2).map(c => (
              <span key={c} className="text-[10px] num-mono px-1.5 py-0.5 rounded-xs bg-ink-800 border border-ink-700/60 text-ink-300">
                {c}
              </span>
            ))}
          </div>
        )}

        {/* 완성도 */}
        <div className={clsx('text-[11px] num-mono shrink-0 w-10 text-right', completenessColor)}>
          {completionRate}%
        </div>
      </div>

      {/* 자식 노드 */}
      {expanded && hasChildren && (
        <div className="space-y-0.5 mt-0.5">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// 부품 상세
// =====================================================
function PartDetail({ part }: { part: Part }) {
  const Icon = tierIcons[part.tierLevel];
  const partBomItem = bomItems.find(bi => bi.partId === part.id);
  const mappings = partCodeMappings.filter(m => m.partId === part.id);
  const processes = manufacturingProcesses.filter(p => p.partId === part.id);
  const supplierLinks = partSuppliers.filter(ps => ps.partId === part.id);
  const completeness = partCompleteness.find(c => c.partId === part.id);
  const parentPart = part.parentPartId ? parts.find(p => p.id === part.parentPartId) : null;

  return (
    <div className="space-y-5">
      {/* 헤더 정보 */}
      <div className="flex items-start gap-3 pb-4 border-b border-ink-700/60">
        <div className="w-10 h-10 rounded-xs bg-accent-700/20 border border-accent-700/30 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-accent-500" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <Badge tone="info" size="sm">
            T{part.tierLevel} · {tierLabels[part.tierLevel]}
          </Badge>
          <div className="mt-1.5 text-xs text-ink-300 leading-relaxed">
            {part.functionPurpose}
          </div>
        </div>
      </div>

      {/* 데이터 완성도 */}
      {completeness && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">데이터 완성도</span>
            <span className={clsx(
              'text-xs num-mono font-semibold',
              completeness.completionRate >= 90 ? 'text-emerald-700' :
              completeness.completionRate >= 70 ? 'text-amber-700' : 'text-red-700'
            )}>
              {completeness.completionRate}%
            </span>
          </div>
          <div className="h-1.5 bg-ink-700 rounded-xs overflow-hidden">
            <div
              className={clsx(
                'h-full transition-all',
                completeness.completionRate >= 90 ? 'bg-emerald-700' :
                completeness.completionRate >= 70 ? 'bg-amber-700' : 'bg-red-700'
              )}
              style={{ width: `${completeness.completionRate}%` }}
            />
          </div>
          <div className="text-[10px] text-ink-400 num-mono mt-1.5">
            {completeness.filledFieldCount} / {completeness.requiredFieldCount} 필드 · 갱신 {completeness.lastUpdatedAt}
          </div>
          {completeness.missingFields.length > 0 && (
            <div className="mt-2 rounded-xs border border-amber-700/30 bg-amber-500/5 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-amber-700 mb-1 font-semibold">누락 항목</div>
              <ul className="space-y-0.5">
                {completeness.missingFields.map(f => (
                  <li key={f} className="text-[11px] text-ink-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-amber-700 shrink-0" />
                    <span className="num-mono">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 핵심 정보 */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-2">핵심 정보</div>
        <div className="grid grid-cols-2 gap-3">
          <InfoField icon={Hash} label="HS 코드" value={part.hsCode} mono />
          <InfoField icon={DollarSign} label="단가" value={`$${part.unitPrice.toLocaleString()}`} sub={`/ ${part.purchaseUnit}`} mono />
          {partBomItem && (
            <>
              <InfoField icon={MapPin} label="원산지" value={countryNames[partBomItem.originCountry] || partBomItem.originCountry} sub={partBomItem.originCountry} />
              <InfoField icon={Layers} label="상위 비율" value={`${partBomItem.percentage}%`} sub={parentPart?.partName} mono />
            </>
          )}
          <InfoField icon={FileText} label="소재 분류" value={part.materialType} />
          <InfoField icon={ArrowDownToLine} label="단위" value={part.purchaseUnit} mono />
        </div>
      </div>

      {/* 공급 협력사 */}
      {supplierLinks.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-2">공급 협력사</div>
          <div className="space-y-1.5">
            {supplierLinks.map(link => {
              const supplier = suppliers.find(s => s.id === link.supplierId);
              if (!supplier) return null;
              return (
                <div key={link.supplierId} className="flex items-center gap-2 px-3 py-2 rounded-xs border border-ink-700/60 bg-ink-800/40">
                  <Building2 className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-ink-100 truncate">{supplier.name}</span>
                      {link.isPrimary && <Badge tone="ok" size="sm">주공급사</Badge>}
                    </div>
                    <div className="text-[10px] text-ink-500 num-mono">{supplier.country} · {supplier.region}</div>
                  </div>
                  <div className="text-xs num-mono text-ink-300 shrink-0">{link.supplyRatio}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 부품 코드 매핑 */}
      {mappings.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-2">
            협력사 ↔ 원청 코드 매핑
          </div>
          <div className="space-y-1">
            {mappings.map(m => {
              const supplier = suppliers.find(s => s.id === m.supplierId);
              return (
                <div key={m.id} className="grid grid-cols-2 gap-2 text-[11px] px-3 py-2 rounded-xs bg-ink-900/40 border border-ink-700/60">
                  <div>
                    <div className="text-[10px] text-ink-500 mb-0.5">{supplier?.name || m.supplierId}</div>
                    <div className="num-mono text-ink-200">{m.supplierPartCode}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-500 mb-0.5">원청 코드</div>
                    <div className="num-mono text-accent-400">{m.originalPartCode}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 제조공정 */}
      {processes.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-2">
            제조공정도 ({processes.length}단계)
          </div>
          <div className="space-y-1.5">
            {processes.map(p => (
              <div key={p.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xs border border-ink-700/60 bg-ink-800/40">
                <div className="w-5 h-5 rounded-xs bg-ink-700 flex items-center justify-center shrink-0">
                  <span className="text-[10px] num-mono text-ink-200">{p.sequenceNo}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-ink-100">{p.processName}</span>
                    {p.isOutsourced && (
                      <Badge tone="warn" size="sm">외주</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-ink-300 mt-0.5 leading-relaxed">
                    {p.processDescription}
                  </div>
                  {p.isOutsourced && p.outsourcedToSupplierId && (
                    <div className="text-[10px] text-ink-500 num-mono mt-1 flex items-center gap-1">
                      <ExternalLink className="w-2.5 h-2.5" />
                      {suppliers.find(s => s.id === p.outsourcedToSupplierId)?.name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {processes.length === 0 && part.tierLevel <= 3 && (
        <div className="rounded-xs border border-blue-700/30 bg-blue-500/5 p-3 text-[11px] text-ink-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
            <span>제조공정도 미등록. 협력사에 입력 요청 필요.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// 정보 필드
// =====================================================
function InfoField({
  icon: Icon, label, value, sub, mono,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xs bg-ink-900/40 border border-ink-700/60 p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-ink-500" />
        <span className="text-[10px] uppercase tracking-wider text-ink-400">{label}</span>
      </div>
      <div className={clsx('text-sm font-medium text-ink-100 truncate', mono && 'num-mono')}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-ink-500 num-mono mt-0.5 truncate">{sub}</div>
      )}
    </div>
  );
}
