'use client';

import { useState } from 'react';
import { suppliers, supplyEdges, Supplier, SupplierStatus, Tier, tierShortLabels } from '@/lib/data';
import clsx from 'clsx';

// === 노드 좌표 (수동 레이아웃) ===
// 좌→우: T5 광산 → T4 전구체·정제 → T3 활물질 → T2 셀 → T1 Pack/Module
// (T1·T2가 Hanyang 한 곳에 통합되어 있어서 가장 오른쪽 컬럼에 배치)
const layout: Record<string, { x: number; y: number }> = {
  // T5 광산 (왼쪽 끝)
  'S-MINE-001': { x: 80,  y: 110 }, // 인니 니켈
  'S-MINE-002': { x: 80,  y: 280 }, // DRC 코발트
  'S-MINE-003': { x: 80,  y: 450 }, // 신장 (위반)

  // T4 전구체/정제 (정제는 위, 전구체는 가운데 살짝 오른쪽)
  'S-REF-001':  { x: 320, y: 110 }, // 포항 리튬 정제
  'S-REF-002':  { x: 320, y: 280 }, // 간저우 코발트 정제
  'S-PRE-001':  { x: 320, y: 450 }, // 취저우 전구체

  // T3 활물질
  'S-CAM-001':  { x: 580, y: 130 }, // POS 양극재
  'S-CAM-002':  { x: 580, y: 290 }, // 옌타이 양극재
  'S-ANO-001':  { x: 580, y: 450 }, // Mitsui 음극재

  // T1+T2 셀·모듈·팩 통합 (오른쪽 끝)
  'S-CELL-001': { x: 980, y: 290 }, // Hanyang
};

// 컬럼 헤더 위치 (퍼센트)
const columnHeaders = [
  { left: '4%',   tier: 5, label: '원광' },
  { left: '24%',  tier: 4, label: '전구체·정제' },
  { left: '46%',  tier: 3, label: '활물질' },
  { left: '78%',  tier: 1, label: 'Cell · Module · Pack' },
];

const statusColors: Record<SupplierStatus, { stroke: string; fill: string; text: string }> = {
  verified:  { stroke: '#10B981', fill: '#10B98115', text: '#34D399' },
  pending:   { stroke: '#3B82F6', fill: '#3B82F615', text: '#60A5FA' },
  review:    { stroke: '#F59E0B', fill: '#F59E0B15', text: '#FBBF24' },
  violation: { stroke: '#EF4444', fill: '#EF444420', text: '#F87171' },
};

interface Props {
  onSelectNode?: (supplier: Supplier | null) => void;
  selectedId?: string | null;
  highlightIds?: Set<string>;  // 검색 결과 하이라이트
  maskedIds?: Set<string>;     // 권한 시뮬 마스킹 (보이지만 흐리게)
}

export default function SupplyChainMap({ onSelectNode, selectedId, highlightIds, maskedIds }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const isEdgeHighlighted = (from: string, to: string) => {
    if (!selectedId && !hoveredId) return false;
    const active = selectedId || hoveredId;
    return from === active || to === active;
  };

  // 마스킹 여부
  const isMasked = (id: string) => maskedIds?.has(id) ?? false;
  // 검색 매치 여부 (highlightIds가 있으면 그것만 강조, 없으면 모두 normal)
  const isHighlighted = (id: string) => highlightIds ? highlightIds.has(id) : true;

  return (
    <div className="relative w-full">
      {/* 컬럼 헤더 */}
      <div className="absolute inset-0 pointer-events-none">
        {columnHeaders.map(col => (
          <div key={col.tier}
            className="absolute top-2 text-[10px] uppercase tracking-wider text-ink-400 font-medium"
            style={{ left: col.left }}
          >
            <span className="num-mono text-accent-500 mr-1">T{col.tier}</span>
            · {col.label}
          </div>
        ))}
      </div>

      <svg viewBox="0 0 1100 560" className="w-full">
        {/* 엣지 */}
        <g>
          {supplyEdges.map((edge, i) => {
            const from = layout[edge.from];
            const to = layout[edge.to];
            if (!from || !to) return null;

            const highlighted = isEdgeHighlighted(edge.from, edge.to);
            const dimmed = isMasked(edge.from) || isMasked(edge.to);

            // 베지에 곡선
            const midX = (from.x + to.x) / 2;
            const path = `M ${from.x + 70} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - 70} ${to.y}`;

            return (
              <g key={i}>
                <path
                  d={path}
                  fill="none"
                  stroke={highlighted ? '#14B8A6' : '#3F4957'}
                  strokeWidth={highlighted ? 1.8 : 1}
                  strokeDasharray={dimmed ? '4 4' : 'none'}
                  opacity={dimmed ? 0.25 : (highlighted ? 1 : 0.45)}
                />
                {highlighted && (
                  <text
                    x={midX}
                    y={(from.y + to.y) / 2 - 6}
                    fill="#5EEAD4"
                    fontSize="9"
                    textAnchor="middle"
                    className="num-mono"
                  >
                    {edge.material} · {edge.volume}t
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* 노드 */}
        <g>
          {suppliers.map(s => {
            const pos = layout[s.id];
            if (!pos) return null;

            const colors = statusColors[s.status];
            const isSelected = s.id === selectedId;
            const isHovered = s.id === hoveredId;
            const masked = isMasked(s.id);
            const highlighted = isHighlighted(s.id);

            // 마스킹된 노드는 흐리게, 검색에서 빠진 노드도 흐리게
            const opacity = masked ? 0.35 : (highlighted ? 1 : 0.4);

            return (
              <g
                key={s.id}
                transform={`translate(${pos.x - 70}, ${pos.y - 32})`}
                className="cursor-pointer transition-opacity"
                style={{ opacity }}
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectNode?.(s)}
              >
                {/* 외곽 강조 (선택/호버/검색 매치) */}
                {(isSelected || isHovered || (highlightIds?.has(s.id))) && !masked && (
                  <rect
                    x={-4} y={-4}
                    width={148} height={72}
                    rx={2}
                    fill="none"
                    stroke={highlightIds?.has(s.id) ? '#14B8A6' : colors.stroke}
                    strokeWidth={2}
                    opacity={0.6}
                  />
                )}

                {/* 카드 */}
                <rect
                  width={140} height={64}
                  rx={2}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isSelected ? 1.8 : 1}
                />

                {/* Tier 배지 */}
                <g transform="translate(8, 8)">
                  <rect width={30} height={14} rx={2} fill="#1F2937" />
                  <text x={15} y={10} fill="#E5E7EB" fontSize="8" textAnchor="middle" className="num-mono" fontWeight="600">
                    T{s.tier}{s.tiers.length > 1 ? `+${s.tiers.length - 1}` : ''}
                  </text>
                </g>

                {/* 상태 도트 */}
                <circle cx={130} cy={15} r={3.5} fill={colors.stroke} />

                {/* 협력사 이름 */}
                <text x={8} y={36} fill="#F3F4F6" fontSize="10" fontWeight="600">
                  {truncate(s.name, 18)}
                </text>

                {/* 역할 */}
                <text x={8} y={48} fill={colors.text} fontSize="9">
                  {truncate(s.role, 22)}
                </text>

                {/* 국가 */}
                <text x={8} y={58} fill="#9CA3AF" fontSize="8" className="num-mono">
                  {s.country} · {truncate(s.region, 14)}
                </text>

                {/* 마스킹 오버레이 */}
                {masked && (
                  <g>
                    <rect width={140} height={64} rx={2} fill="#0F1419" opacity={0.65} />
                    <text x={70} y={36} fill="#9CA3AF" fontSize="9" textAnchor="middle" className="num-mono">
                      접근 권한 없음
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* 범례 */}
      <div className="absolute bottom-2 right-2 flex items-center gap-3 text-[10px] text-ink-400 bg-ink-900/70 backdrop-blur px-2.5 py-1.5 rounded-xs border border-ink-700">
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
      <span>{label}</span>
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
