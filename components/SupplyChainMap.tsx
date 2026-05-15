'use client';

import { useState } from 'react';
import { suppliers, supplyEdges, Supplier, SupplierStatus, RiskLevel } from '@/lib/data';
import Badge from './Badge';
import clsx from 'clsx';

// === 노드 좌표 (수동 레이아웃) ===
// 좌→우: Tier 3 (광산/제련) → Tier 2 (소재) → Tier 1 (셀)
const layout: Record<string, { x: number; y: number }> = {
  // Tier 3 (왼쪽)
  'S-MINE-001': { x: 100, y: 100 },  // 인니 니켈
  'S-MINE-002': { x: 100, y: 200 },  // DRC 코발트
  'S-MINE-003': { x: 100, y: 300 },  // 신장 (위반)
  'S-REF-001':  { x: 100, y: 400 },  // 포항 리튬
  'S-REF-002':  { x: 100, y: 500 },  // 간저우 코발트
  'S-PRE-001':  { x: 400, y: 200 },  // 취저우 전구체 (중간)
  
  // Tier 2 (가운데-오른쪽)
  'S-CAM-001':  { x: 700, y: 250 },  // POS 양극재
  'S-CAM-002':  { x: 700, y: 350 },  // 옌타이 양극재
  'S-ANO-001':  { x: 700, y: 450 },  // Mitsui 음극재
  
  // Tier 1 (오른쪽 끝)
  'S-CELL-001': { x: 1050, y: 350 }, // Hanyang 셀
};

const statusColors: Record<SupplierStatus, { stroke: string; fill: string; text: string }> = {
  verified:  { stroke: '#10B981', fill: '#10B98110', text: '#34D399' },
  pending:   { stroke: '#3B82F6', fill: '#3B82F610', text: '#60A5FA' },
  review:    { stroke: '#F59E0B', fill: '#F59E0B10', text: '#FBBF24' },
  violation: { stroke: '#EF4444', fill: '#EF444415', text: '#F87171' },
};

const tierLabels: Record<number, string> = {
  1: 'Tier 1',
  2: 'Tier 2',
  3: 'Tier 3',
};

interface Props {
  onSelectNode?: (supplier: Supplier | null) => void;
  selectedId?: string | null;
}

export default function SupplyChainMap({ onSelectNode, selectedId }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 선택된 노드와 연결된 엣지 강조
  const isEdgeHighlighted = (from: string, to: string) => {
    if (!selectedId && !hoveredId) return false;
    const active = selectedId || hoveredId;
    return from === active || to === active;
  };

  return (
    <div className="relative w-full">
      {/* Tier 라벨 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-2 left-[8.5%] text-[10px] uppercase tracking-wider text-ink-400 font-medium">
          Tier 3 · 광산 / 제련
        </div>
        <div className="absolute top-2 left-[35%] text-[10px] uppercase tracking-wider text-ink-400 font-medium">
          전구체
        </div>
        <div className="absolute top-2 left-[60%] text-[10px] uppercase tracking-wider text-ink-400 font-medium">
          Tier 2 · 소재
        </div>
        <div className="absolute top-2 right-[5%] text-[10px] uppercase tracking-wider text-ink-400 font-medium">
          Tier 1 · 셀 제조
        </div>
      </div>

      <svg viewBox="0 0 1200 620" className="w-full h-auto" style={{ minHeight: '600px' }}>
        <defs>
          {/* 화살표 마커 */}
          <marker id="arrowMap" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round"/>
          </marker>
          <marker id="arrowMapAlert" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M2 1L8 5L2 9" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
          </marker>

          {/* Tier 구분 배경 */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E8EC" strokeWidth="0.5"/>          </pattern>
        </defs>

        <rect width="1200" height="620" fill="url(#grid)" opacity="0.4"/>

        {/* Tier 영역 (희미한 가이드) */}
        <rect x="40" y="40" width="180" height="540" fill="#EF444408" stroke="#EF444420" strokeWidth="0.5" strokeDasharray="4 3" rx="4"/>
        <rect x="320" y="40" width="180" height="540" fill="#F59E0B08" stroke="#F59E0B20" strokeWidth="0.5" strokeDasharray="4 3" rx="4"/>
        <rect x="620" y="40" width="180" height="540" fill="#3B82F608" stroke="#3B82F620" strokeWidth="0.5" strokeDasharray="4 3" rx="4"/>
        <rect x="970" y="40" width="180" height="540" fill="#10B98108" stroke="#10B98120" strokeWidth="0.5" strokeDasharray="4 3" rx="4"/>

        {/* 엣지 (공급 관계) */}
        {supplyEdges.map((edge, i) => {
          const from = layout[edge.from];
          const to = layout[edge.to];
          if (!from || !to) return null;

          const fromSupplier = suppliers.find(s => s.id === edge.from);
          const isAlert = fromSupplier?.status === 'violation';
          const highlighted = isEdgeHighlighted(edge.from, edge.to);
          
          const startX = from.x + 80;
          const startY = from.y + 30;
          const endX = to.x - 5;
          const endY = to.y + 30;
          
          // 베지어 곡선
          const midX = (startX + endX) / 2;
          const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

          return (
            <g key={i}>
              <path
                d={path}
                fill="none"
                stroke={isAlert ? '#EF4444' : '#3A4250'}
                strokeWidth={highlighted ? 2 : isAlert ? 1.2 : 0.8}
                strokeDasharray={isAlert ? '4 3' : 'none'}
                opacity={highlighted ? 1 : (selectedId || hoveredId) ? 0.15 : isAlert ? 0.7 : 0.5}
                markerEnd={isAlert ? 'url(#arrowMapAlert)' : 'url(#arrowMap)'}
                style={{ transition: 'all 0.2s' }}
              />
              {/* 엣지 라벨 (호버 시) */}
              {highlighted && (
                <text 
                  x={midX} 
                  y={(startY + endY) / 2 - 4} 
                  fill="#B8BEC4" 
                  fontSize="9" 
                  fontFamily="JetBrains Mono"
                  textAnchor="middle"
                >
                  {edge.material} · {edge.volume}t/월
                </text>
              )}
            </g>
          );
        })}

        {/* 노드 (협력사) */}
        {suppliers.map(supplier => {
          const pos = layout[supplier.id];
          if (!pos) return null;
          const colors = statusColors[supplier.status];
          const isSelected = selectedId === supplier.id;
          const isHovered = hoveredId === supplier.id;
          const isDimmed = (selectedId || hoveredId) && !isSelected && !isHovered &&
            !supplyEdges.some(e => 
              (e.from === supplier.id && (e.to === selectedId || e.to === hoveredId)) ||
              (e.to === supplier.id && (e.from === selectedId || e.from === hoveredId))
            );

          return (
            <g 
              key={supplier.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
              opacity={isDimmed ? 0.3 : 1}
              onMouseEnter={() => setHoveredId(supplier.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectNode?.(isSelected ? null : supplier)}
            >
              {/* 위험 노드 펄스 */}
              {supplier.status === 'violation' && (
                <circle cx="40" cy="30" r="50" fill="#EF4444" opacity="0.15">
                  <animate attributeName="r" values="40;55;40" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.2;0;0.2" dur="2s" repeatCount="indefinite"/>
                </circle>
              )}

              {/* 노드 박스 */}
              <rect
                x="0"
                y="0"
                width="80"
                height="60"
                rx="3"
                fill={isSelected ? colors.fill : '#FFFFFF'}
                stroke={colors.stroke}
                strokeWidth={isSelected || isHovered ? 2 : 1}
              />

              {/* 좌측 컬러 바 */}
              <rect x="0" y="0" width="3" height="60" fill={colors.stroke} rx="1"/>

              {/* Tier 라벨 */}
              <text x="74" y="11" fill={colors.text} fontSize="8" textAnchor="end" fontWeight="600">
                T{supplier.tier}
              </text>

              {/* 회사명 (한 줄 또는 두 줄) */}
              <text x="8" y="22" fill="#EEF1F4" fontSize="9" fontWeight="600">
                {truncate(supplier.name, 14)}
              </text>
              <text x="8" y="34" fill="#8A9199" fontSize="8">
                {supplier.role}
              </text>
              <text x="8" y="48" fill="#5A6470" fontSize="7" fontFamily="JetBrains Mono">
                {supplier.country} · {truncate(supplier.region, 12)}
              </text>

              {/* 상태 점 */}
              <circle cx="74" cy="52" r="2.5" fill={colors.stroke}/>
            </g>
          );
        })}

        {/* 범례 */}
        <g transform="translate(40, 590)">
          <rect width="1120" height="20" fill="#0F1419" stroke="#252B33" rx="2"/>
          <g transform="translate(12, 13)" fontSize="9" fontFamily="Pretendard">
            <circle cx="0" cy="-1" r="3" fill="#10B981"/>
            <text x="8" y="2" fill="#B8BEC4">검증 완료</text>
            
            <circle cx="80" cy="-1" r="3" fill="#3B82F6"/>
            <text x="88" y="2" fill="#B8BEC4">검토 대기</text>
            
            <circle cx="170" cy="-1" r="3" fill="#F59E0B"/>
            <text x="178" y="2" fill="#B8BEC4">추가 확인</text>
            
            <circle cx="260" cy="-1" r="3" fill="#EF4444"/>
            <text x="268" y="2" fill="#B8BEC4">규제 위반</text>
            
            <line x1="360" y1="-1" x2="380" y2="-1" stroke="#EF4444" strokeWidth="1.2" strokeDasharray="3 2"/>
            <text x="388" y="2" fill="#B8BEC4">위반 광물 흐름</text>
            
            <text x="900" y="2" fill="#5A6470" fontFamily="JetBrains Mono">
              노드를 클릭하면 상세 정보가 표시됩니다
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}
