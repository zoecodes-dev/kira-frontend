'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import TopStatCard from '@/components/TopStatCard';
import Link from 'next/link';
import {
  suppliers, supplyEdges, type Supplier, type SupplierStatus,
} from '@/lib/data';
import {
  getSupplierName, getContacts, getCompleteness, getRemindLogs,
  getFactories, supplierCompleteness, remindLogs,
  type DataCompleteness, type RemindLog,
} from '@/lib/supplier-detail-data';
import {
  Send, CheckCircle2, Clock, AlertTriangle, AlertCircle,
  X, Filter, RefreshCw, Bell, ChevronRight, Layers,
  ArrowRight, MailOpen, Mail, Building2, Factory,
  TrendingUp, Users,
} from 'lucide-react';
import clsx from 'clsx';

// ─── 타입 ────────────────────────────────────────────────────
type FilterMode = 'all' | 'overdue' | 'in_progress' | 'completed' | 'not_requested';

// ─── 입력 요청 상태 파생 ─────────────────────────────────────
type RequestStatus = 'completed' | 'in_progress' | 'overdue' | 'not_requested' | 'sent';

const mapFont = 'Inter, Pretendard, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface SupplierSubmissionState {
  supplierId: string;
  completionRate: number;
  requestStatus: RequestStatus;
  latestRemind: RemindLog | null;
  missingCount: number;
  overdueCount: number;
}

function buildSubmissionStates(): SupplierSubmissionState[] {
  return suppliers.map(s => {
    const completeness = getCompleteness(s.id);
    const logs = getRemindLogs(s.id);
    const latest = logs[0] ?? null;

    const overdueLogs = logs.filter(l => l.status === 'overdue');
    const hasInProgress = logs.some(l => l.status === 'in_progress');
    const allCompleted  = logs.length > 0 && logs.every(l => l.status === 'completed');

    let requestStatus: RequestStatus = 'not_requested';
    if (allCompleted && (completeness?.completionRate ?? 0) >= 95) {
      requestStatus = 'completed';
    } else if (overdueLogs.length > 0) {
      requestStatus = 'overdue';
    } else if (hasInProgress) {
      requestStatus = 'in_progress';
    } else if (logs.length > 0) {
      requestStatus = 'sent';
    }

    return {
      supplierId: s.id,
      completionRate: completeness?.completionRate ?? 0,
      requestStatus,
      latestRemind: latest,
      missingCount: completeness?.missingFields.length ?? 0,
      overdueCount: overdueLogs.length,
    };
  });
}

// ─── 맵 레이아웃 ─────────────────────────────────────────────
const layout: Record<string, { x: number; y: number }> = {
  'S-MINE-001': { x: 80,  y: 110 },
  'S-MINE-002': { x: 80,  y: 280 },
  'S-MINE-003': { x: 80,  y: 450 },
  'S-REF-001':  { x: 310, y: 110 },
  'S-REF-002':  { x: 310, y: 280 },
  'S-PRE-001':  { x: 310, y: 450 },
  'S-CAM-001':  { x: 560, y: 130 },
  'S-CAM-002':  { x: 560, y: 290 },
  'S-ANO-001':  { x: 560, y: 450 },
  'S-CELL-001': { x: 820, y: 290 },
};

const columnHeaders = [
  { left: '3%',  tier: 5, label: '원광' },
  { left: '23%', tier: 4, label: '전구체·정제' },
  { left: '44%', tier: 3, label: '활물질' },
  { left: '70%', tier: 1, label: 'Cell · Module · Pack' },
];

// 상태별 색상 정의
const statusStyle: Record<RequestStatus, {
  stroke: string; fill: string; text: string;
  barColor: string; label: string; dotColor: string;
}> = {
  completed:     { stroke: '#059669', fill: '#FFFFFF', text: '#047857', barColor: '#059669', label: '제출 완료',    dotColor: '#059669' },
  in_progress:   { stroke: '#2563EB', fill: '#FFFFFF', text: '#1D4ED8', barColor: '#2563EB', label: '입력 중',      dotColor: '#2563EB' },
  sent:          { stroke: '#7C3AED', fill: '#FFFFFF', text: '#6D28D9', barColor: '#7C3AED', label: '요청 발송',    dotColor: '#7C3AED' },
  overdue:       { stroke: '#DC2626', fill: '#FFFFFF', text: '#B91C1C', barColor: '#DC2626', label: '기한 초과',    dotColor: '#DC2626' },
  not_requested: { stroke: '#64748B', fill: '#FFFFFF', text: '#475569', barColor: '#64748B', label: '요청 미발송',  dotColor: '#64748B' },
};

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ─── 입력 요청 맵 SVG ────────────────────────────────────────
function RequestMap({
  states,
  selectedId,
  filterMode,
  onSelect,
}: {
  states: SupplierSubmissionState[];
  selectedId: string | null;
  filterMode: FilterMode;
  onSelect: (s: Supplier) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const stateMap = useMemo(() => {
    const m: Record<string, SupplierSubmissionState> = {};
    states.forEach(s => { m[s.supplierId] = s; });
    return m;
  }, [states]);

  const isDimmed = (id: string) => {
    if (filterMode === 'all') return false;
    const st = stateMap[id];
    if (!st) return true;
    if (filterMode === 'overdue')      return st.requestStatus !== 'overdue';
    if (filterMode === 'in_progress')  return st.requestStatus !== 'in_progress';
    if (filterMode === 'completed')    return st.requestStatus !== 'completed';
    if (filterMode === 'not_requested')return st.requestStatus !== 'not_requested';
    return false;
  };

  return (
    <div className="relative w-full select-none">
      {/* 컬럼 헤더 */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {columnHeaders.map(col => (
          <div key={col.tier}
            className="absolute top-3 text-[10px] uppercase tracking-wider text-ink-400 font-medium"
            style={{ left: col.left }}
          >
            <span className="num-mono text-accent-500 mr-1">T{col.tier}</span>· {col.label}
          </div>
        ))}
      </div>

      <svg viewBox="0 0 960 520" className="w-full" style={{ minHeight: 300, fontFamily: mapFont }}>
        <defs>
          <filter id="request-map-shadow" x="-12%" y="-18%" width="124%" height="136%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.10" />
          </filter>
        </defs>
        {/* 엣지 */}
        {supplyEdges.map((edge, i) => {
          const from = layout[edge.from];
          const to   = layout[edge.to];
          if (!from || !to) return null;
          const dimmed = isDimmed(edge.from) && isDimmed(edge.to);
          const active = edge.from === selectedId || edge.to === selectedId ||
                         edge.from === hovered || edge.to === hovered;
          const midX = (from.x + to.x) / 2;
          const path = `M ${from.x + 66} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - 66} ${to.y}`;
          return (
            <path key={i} d={path} fill="none"
              stroke={active ? '#0F766E' : '#CBD5E1'}
              strokeWidth={active ? 1.8 : 1}
              opacity={dimmed ? 0.12 : (active ? 1 : 0.7)}
            />
          );
        })}

        {/* 노드 */}
        {suppliers.map(s => {
          const pos = layout[s.id];
          if (!pos) return null;
          const st         = stateMap[s.id];
          const style      = statusStyle[st?.requestStatus ?? 'not_requested'];
          const pct        = st?.completionRate ?? 0;
          const isSelected = s.id === selectedId;
          const isHov      = s.id === hovered;
          const dimmed     = isDimmed(s.id);
          const name       = getSupplierName(s.id);

          return (
            <g key={s.id}
              transform={`translate(${pos.x - 66}, ${pos.y - 28})`}
              style={{ cursor: 'pointer', opacity: dimmed ? 0.18 : 1 }}
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => !dimmed && onSelect(s)}
            >
              {/* 선택 글로우 */}
              {(isSelected || isHov) && (
                <rect x={-5} y={-5} width={142} height={66} rx={6}
                  fill="none" stroke={style.stroke} strokeWidth={2} opacity={0.5}
                />
              )}

              {/* 카드 본체 */}
              <rect width={132} height={56} rx={5}
                fill={style.fill} stroke={style.stroke}
                strokeWidth={isSelected ? 2 : 1}
                filter="url(#request-map-shadow)"
              />

              {/* 협력사 이름 */}
              <text x={8} y={17} fill="#0F172A" fontSize="10" fontWeight="800">
                {truncate(name?.shortNameEn ?? s.name, 16)}
              </text>

              {/* 상태 + 완성도 */}
              <text x={8} y={34} fill={style.text} fontSize="8.8" fontWeight="800">
                {style.label}
              </text>
              <text x={124} y={34} fill="#334155" fontSize="9" fontWeight="800" textAnchor="end">
                {pct}%
              </text>

              {/* 진행률 바 */}
              <rect x={8} y={42} width={116} height={4} rx={2} fill="#E2E8F0" />
              <rect x={8} y={42} width={Math.round((pct / 100) * 116)} height={4} rx={2} fill={style.barColor} />
            </g>
          );
        })}
      </svg>

      {/* 범례 */}
      <div className="absolute bottom-2 right-2 flex items-center gap-3 text-[10px] text-ink-400 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xs border border-ink-700">
        {(Object.entries(statusStyle) as [RequestStatus, typeof statusStyle[RequestStatus]][]).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.dotColor }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 협력사 입력 현황 패널 ────────────────────────────────────
function SubmissionPanel({
  supplier,
  state,
  onClose,
  onSendRemind,
}: {
  supplier: Supplier;
  state: SupplierSubmissionState;
  onClose: () => void;
  onSendRemind: (supplierId: string) => void;
}) {
  const name       = getSupplierName(supplier.id);
  const contacts   = getContacts(supplier.id);
  const completeness = getCompleteness(supplier.id);
  const logs       = getRemindLogs(supplier.id);
  const primary    = contacts.find(c => c.isPrimary) ?? contacts[0];
  const style      = statusStyle[state.requestStatus];

  const remindTypeLabel: Record<string, string> = {
    initial:  '최초 요청',
    remind_1: '1차 리마인드',
    remind_2: '2차 리마인드',
    final:    '최종 통보',
    response: '협력사 응답',
  };
  const remindStatusLabel: Record<string, { label: string; color: string }> = {
    sent:        { label: '발송됨',  color: 'text-ink-400' },
    opened:      { label: '열람됨',  color: 'text-blue-500' },
    in_progress: { label: '입력 중', color: 'text-blue-500' },
    completed:   { label: '완료',    color: 'text-emerald-500' },
    overdue:     { label: '기한초과', color: 'text-red-500' },
  };

  return (
    <div className="flex flex-col h-full border-l border-ink-700 bg-white overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-ink-700 bg-ink-800/20 shrink-0">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: style.dotColor }} />
              <span className="text-[10px] font-semibold num-mono" style={{ color: style.text }}>
                {style.label}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-ink-100 leading-tight">
              {name?.nameEn ?? supplier.name}
            </h3>
            {name?.nameKo && <div className="text-xs text-ink-400">{name.nameKo}</div>}
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-xs border border-ink-700 flex items-center justify-center text-ink-400 hover:text-ink-200 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="text-xs text-ink-400">{supplier.role} · {supplier.country} · {supplier.region}</div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* 진행률 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">데이터 완성도</span>
            <span className={clsx('text-lg font-semibold num-mono',
              state.completionRate >= 90 ? 'text-emerald-600' :
              state.completionRate >= 70 ? 'text-amber-600' : 'text-red-600'
            )}>
              {state.completionRate}%
            </span>
          </div>
          <div className="h-2.5 bg-ink-700 rounded-xs overflow-hidden">
            <div
              className="h-full rounded-xs transition-all"
              style={{
                width: `${state.completionRate}%`,
                backgroundColor: state.completionRate >= 90 ? '#10B981' :
                                  state.completionRate >= 70 ? '#F59E0B' : '#EF4444',
              }}
            />
          </div>
          {completeness && (
            <div className="text-[10px] text-ink-500 num-mono mt-1">
              {completeness.filledFieldCount} / {completeness.requiredFieldCount} 필드 완료
            </div>
          )}
        </div>

        {/* 누락 항목 */}
        {completeness && completeness.missingFields.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
              누락 항목 ({completeness.missingFields.length}개)
            </div>
            <div className="space-y-1">
              {completeness.missingFields.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xs border border-amber-700/30 bg-amber-500/5 text-[11px] text-amber-600">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 주 담당자 */}
        {primary && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">주 담당자</div>
            <div className="p-3 rounded-xs border border-ink-700/60 bg-ink-900/30">
              <div className="text-xs font-semibold text-ink-100 mb-1">{primary.name}</div>
              <div className="text-[10px] text-ink-400 mb-2">{primary.role}{primary.department ? ` · ${primary.department}` : ''}</div>
              <a href={`mailto:${primary.email}`} className="flex items-center gap-1.5 text-[11px] text-blue-500 hover:text-blue-400 mb-1">
                <Mail className="w-3 h-3" />
                {primary.email}
              </a>
              <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
                <Building2 className="w-3 h-3 text-ink-500" />
                {primary.phone}
              </div>
            </div>
          </div>
        )}

        {/* 요청 이력 */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
            요청·리마인드 이력 ({logs.length}건)
          </div>
          {logs.length === 0 ? (
            <div className="text-xs text-ink-500 text-center py-3 rounded-xs border border-ink-700/40 border-dashed">
              요청 이력 없음
            </div>
          ) : (
            <div className="space-y-1.5">
              {logs.map(log => {
                const s = remindStatusLabel[log.status];
                return (
                  <div key={log.logId} className={clsx(
                    'px-3 py-2.5 rounded-xs border text-[11px]',
                    log.status === 'overdue'    && 'border-red-700/30 bg-red-500/5',
                    log.status === 'completed'  && 'border-emerald-700/30 bg-emerald-500/5',
                    log.status === 'in_progress'&& 'border-blue-700/30 bg-blue-500/5',
                    !['overdue','completed','in_progress'].includes(log.status) && 'border-ink-700/60 bg-ink-900/30',
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-ink-200">{remindTypeLabel[log.requestType]}</span>
                      <span className={clsx('text-[10px] font-medium', s.color)}>{s.label}</span>
                    </div>
                    <div className="text-ink-400 mb-1">{log.requestedField}</div>
                    <div className="flex items-center justify-between text-[10px] text-ink-500 num-mono">
                      <span>발송 {log.sentAt.slice(0, 10)}</span>
                      <span className={clsx(log.status === 'overdue' && 'text-red-500')}>
                        기한 {log.dueDate}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 액션 버튼 */}
      <div className="border-t border-ink-700 px-5 py-3 flex gap-2 shrink-0 bg-ink-900/10">
        <button
          onClick={() => onSendRemind(supplier.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xs bg-accent-700 hover:bg-accent-600 text-white text-xs font-semibold transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          {logs.length === 0 ? '데이터 요청 발송' : '리마인드 발송'}
        </button>
        <Link
          href={`/suppliers/${supplier.id}`}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xs border border-ink-700 text-ink-300 text-xs hover:border-ink-500 transition-colors"
        >
          상세
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── 통계 카드 ────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon }: {
  label: string; value: number; color: string; icon: any;
}) {
  const tone =
    color.includes('emerald') ? 'ok' :
    color.includes('red') ? 'alert' :
    color.includes('purple') ? 'purple' :
    color.includes('blue') ? 'info' :
    'neutral';
  return <TopStatCard label={label} value={value} tone={tone} />;
}

// ─── 메인 ────────────────────────────────────────────────────
export default function RequestMapPage() {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [sentNotification, setSentNotification] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  const states = useMemo(() => buildSubmissionStates(), []);
  const stateMap = useMemo(() => {
    const m: Record<string, SupplierSubmissionState> = {};
    states.forEach(s => { m[s.supplierId] = s; });
    return m;
  }, [states]);

  // KPI 집계
  const kpi = useMemo(() => ({
    completed:    states.filter(s => s.requestStatus === 'completed').length,
    inProgress:   states.filter(s => s.requestStatus === 'in_progress').length,
    overdue:      states.filter(s => s.requestStatus === 'overdue').length,
    sent:         states.filter(s => s.requestStatus === 'sent').length,
    notRequested: states.filter(s => s.requestStatus === 'not_requested').length,
  }), [states]);

  // 전체 평균 완성도
  const avgCompletion = useMemo(
    () => Math.round(states.reduce((acc, s) => acc + s.completionRate, 0) / states.length),
    [states]
  );

  const handleSelect = (s: Supplier) => {
    setSelectedSupplier(prev => prev?.id === s.id ? null : s);
  };

  const handleSendRemind = (supplierId: string) => {
    setSentNotification(supplierId);
    setTimeout(() => setSentNotification(null), 3000);
  };

  const selectedState = selectedSupplier ? stateMap[selectedSupplier.id] : null;

  const filterButtons: { mode: FilterMode; label: string; count: number; color: string }[] = [
    { mode: 'all',           label: '전체',       count: states.length,    color: 'text-ink-300' },
    { mode: 'overdue',       label: '기한 초과',  count: kpi.overdue,      color: 'text-red-500' },
    { mode: 'in_progress',   label: '입력 중',    count: kpi.inProgress,   color: 'text-blue-500' },
    { mode: 'completed',     label: '완료',       count: kpi.completed,    color: 'text-emerald-500' },
    { mode: 'not_requested', label: '요청 미발송', count: kpi.notRequested, color: 'text-ink-500' },
  ];

  return (
    <>
      <PageHeader
        title="입력 요청 맵"
        description="원청사 시점 — 협력사별 데이터 입력 진행 현황을 공급망 맵 위에 표출"
        badge="원청사"
        actions={
          <div className="flex items-center gap-3">
            <div className="text-xs text-ink-400 num-mono">
              평균 완성도 <span className={clsx('font-semibold',
                avgCompletion >= 80 ? 'text-emerald-500' : 'text-amber-500'
              )}>{avgCompletion}%</span>
            </div>
            <Link href="/supply-chain/product-map"
              className="flex items-center gap-1.5 text-xs text-accent-600 hover:text-accent-500 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              공급망 맵
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        }
      />

      {/* 발송 완료 토스트 */}
      {sentNotification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xs border border-emerald-700/40 bg-emerald-500/10 backdrop-blur shadow-lg text-sm text-emerald-600 animate-in slide-in-from-right">
          <CheckCircle2 className="w-4 h-4" />
          리마인드 발송 완료
        </div>
      )}

      <div className="p-6 space-y-5">

        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="제출 완료"    value={kpi.completed}    color="text-emerald-500" icon={CheckCircle2} />
          <StatCard label="입력 중"      value={kpi.inProgress}   color="text-blue-500"    icon={TrendingUp} />
          <StatCard label="요청 발송"    value={kpi.sent}         color="text-purple-500"  icon={MailOpen} />
          <StatCard label="기한 초과"    value={kpi.overdue}      color="text-red-500"     icon={AlertTriangle} />
          <StatCard label="요청 미발송"  value={kpi.notRequested} color="text-ink-400"     icon={Users} />
        </div>

        {/* 메인 영역 */}
        <div className="flex gap-5">

          {/* 맵 + 필터 */}
          <div className="flex-1 min-w-0">

            {/* 필터 바 */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-ink-500" />
              {filterButtons.map(btn => (
                <button
                  key={btn.mode}
                  onClick={() => setFilterMode(btn.mode)}
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-xs border text-[11px] font-medium transition-colors',
                    filterMode === btn.mode
                      ? 'border-accent-700/50 bg-accent-500/10 text-accent-500'
                      : 'border-ink-700 text-ink-400 hover:border-ink-600',
                  )}
                >
                  {btn.label}
                  <span className={clsx('num-mono text-[10px]', filterMode === btn.mode ? 'text-accent-400' : btn.color)}>
                    {btn.count}
                  </span>
                </button>
              ))}
            </div>

            {/* 맵 */}
            <div className="rounded-sm border border-ink-700 bg-white overflow-hidden shadow-control">
              <RequestMap
                states={states}
                selectedId={selectedSupplier?.id ?? null}
                filterMode={filterMode}
                onSelect={handleSelect}
              />
            </div>

            {/* 요청 현황 테이블 */}
            <div className="mt-4 rounded-sm border border-ink-700 bg-white shadow-control overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTable(value => !value)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ink-800"
              >
                <div>
                  <div className="text-xs font-bold text-ink-100">전체 협력사 입력 현황</div>
                  <div className="mt-0.5 text-[10px] text-ink-500">필요할 때 목록으로 열어 확인합니다</div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-ink-500 num-mono">
                  {states.length}개사
                  <ChevronRight className={clsx('h-3.5 w-3.5 transition-transform', showTable && 'rotate-90')} />
                </div>
              </button>
              {showTable && (
                <div className="overflow-x-auto border-t border-ink-700">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-ink-700/60">
                      {['협력사', 'Tier', '완성도', '상태', '기한', '마지막 요청'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map(s => {
                      const st    = stateMap[s.id];
                      const style = statusStyle[st?.requestStatus ?? 'not_requested'];
                      const name  = getSupplierName(s.id);
                      const isSelected = s.id === selectedSupplier?.id;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => handleSelect(s)}
                          className={clsx(
                            'border-b border-ink-700/40 cursor-pointer transition-colors',
                            isSelected ? 'bg-accent-500/5' : 'hover:bg-ink-800/40',
                          )}
                        >
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-ink-200">{name?.shortNameEn ?? s.name}</div>
                            <div className="text-[9px] text-ink-500 num-mono">{s.id}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="num-mono text-accent-500 font-semibold">T{s.tier}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-ink-700 rounded-xs overflow-hidden">
                                <div
                                  className="h-full rounded-xs"
                                  style={{
                                    width: `${st?.completionRate ?? 0}%`,
                                    backgroundColor: (st?.completionRate ?? 0) >= 90 ? '#10B981' :
                                                     (st?.completionRate ?? 0) >= 70 ? '#F59E0B' : '#EF4444',
                                  }}
                                />
                              </div>
                              <span className="num-mono text-ink-300">{st?.completionRate ?? 0}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="flex items-center gap-1" style={{ color: style.text }}>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.dotColor }} />
                              {style.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={clsx('num-mono',
                              st?.overdueCount > 0 ? 'text-red-500' : 'text-ink-400'
                            )}>
                              {st?.latestRemind?.dueDate ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-ink-400 num-mono">
                            {st?.latestRemind?.sentAt.slice(0, 10) ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>

          {/* 사이드 패널 */}
          {selectedSupplier && selectedState && (
            <div className="w-[340px] shrink-0 rounded-sm border border-ink-700 overflow-hidden" style={{ height: 'fit-content', maxHeight: 'calc(100vh - 220px)' }}>
              <SubmissionPanel
                supplier={selectedSupplier}
                state={selectedState}
                onClose={() => setSelectedSupplier(null)}
                onSendRemind={handleSendRemind}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
