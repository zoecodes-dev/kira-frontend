'use client';

import { useState } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Layers,
  Package,
  ShieldAlert,
  Users,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
type RiskStatus = 'ok' | 'caution' | 'high' | 'feoc' | 'rights' | 'verified';
type Stage = 0 | 1 | 2 | 3;
type Tab = 'map' | 'table' | 'risk';

interface BomNode {
  id: string;
  stage: Stage;
  indent: 0 | 1 | 2;
  tier: string;
  name: string;
  meta: string;
  partCode: string;
  category: string;
  supplier: string;
  factory: string;
  country: string;
  po?: string;
  period: string;
  ratio: string;
  risk: RiskStatus;
}

/* ─── Static data ─────────────────────────────────────────── */
const PRODUCTS = [
  { id: 'EV-BAT-77', label: 'EV-BATTERY-PACK-77kWh · KIRA Battery Pack' },
  { id: 'CELL-NCM-811', label: 'EV High-Nickel Cell A · NCM 811' },
];
const BOM_VERSIONS = ['v3.2 · active', 'v3.1 · archived', 'v3.0 · archived'];
const FACTORIES = ['전체 사업장', 'Ulsan Plant', 'Gwangyang Plant'];
const DESTINATIONS = ['EU', 'US', 'KR', '전체'];
const PO_OPTIONS = ['전체 PO', 'PO-2026-0503', 'PO-2026-0508', 'PO-2026-0512', 'PO-2026-0520'];

const NODES: BomNode[] = [
  {
    id: 'root',
    stage: 0, indent: 0, tier: '제품',
    name: 'KIRA Battery Pack 77kWh', meta: '제품 코드: EV-BAT-77 · 제조사: KIRA Mobility',
    partCode: 'EV-BAT-77', category: '완성품',
    supplier: 'KIRA Mobility', factory: 'Ulsan Plant', country: 'KR',
    period: '2026-05', ratio: '100%', risk: 'ok',
  },
  {
    id: 'cell-module',
    stage: 1, indent: 0, tier: 'Tier 1',
    name: 'Battery Cell Module', meta: 'BOM item · 48 EA · 42.5%',
    partCode: 'BOM-CELL-01', category: '부품',
    supplier: 'Cell System', factory: 'Cheongju Plant', country: 'KR',
    period: '2026-05', ratio: '42.5%', risk: 'ok',
  },
  {
    id: 'cathode',
    stage: 1, indent: 0, tier: 'Tier 1',
    name: 'Cathode Active Material', meta: 'BOM item · 128.5 kg · 31.2%',
    partCode: 'CAM-4420', category: '양극재',
    supplier: 'POS Cathode', factory: 'Gwangyang Plant', country: 'KR',
    period: '2026-05', ratio: '31.2%', risk: 'caution',
  },
  {
    id: 'anode',
    stage: 1, indent: 0, tier: 'Tier 1',
    name: 'Anode Material', meta: 'BOM item · 82.0 kg · 18.6%',
    partCode: 'ANODE-001', category: '음극재',
    supplier: 'Anode Graphite Co.', factory: 'Incheon Plant', country: 'KR',
    period: '2026-05', ratio: '18.6%', risk: 'ok',
  },
  {
    id: 'lithium',
    stage: 2, indent: 1, tier: 'Tier 2',
    name: 'Lithium Hydroxide', meta: '양극재 하위 원재료 · 광물비율 8.4%',
    partCode: 'LI-2201', category: 'LiOH',
    supplier: 'Albemarle AU', factory: 'Kemerton Plant', country: 'AU',
    po: 'PO-2026-0508', period: '2026-05', ratio: '8.4%', risk: 'ok',
  },
  {
    id: 'cobalt',
    stage: 2, indent: 1, tier: 'Tier 2',
    name: 'Cobalt Sulfate', meta: '양극재 하위 원재료 · 광물비율 12.8%',
    partCode: 'CO-2281', category: 'CoSO₄',
    supplier: 'Ganzhou Refinery', factory: 'Ganzhou Processing Plant', country: 'CN',
    po: 'PO-2026-0512', period: '2026-05', ratio: '12.8%', risk: 'high',
  },
  {
    id: 'nickel',
    stage: 2, indent: 1, tier: 'Tier 2',
    name: 'Nickel Sulfate', meta: '양극재 하위 원재료 · 광물비율 21.6%',
    partCode: 'NI-1190', category: 'NiSO₄',
    supplier: 'Sulawesi Nickel', factory: 'Morowali Plant', country: 'ID',
    po: 'PO-2026-0508', period: '2026-05', ratio: '21.6%', risk: 'caution',
  },
  {
    id: 'ganzhou',
    stage: 3, indent: 2, tier: 'Tier 3',
    name: 'Ganzhou Refinery', meta: 'PO-2026-0512 · Ganzhou Processing Plant · 공급비율 64%',
    partCode: 'SUP-CN-001', category: '제련사',
    supplier: 'Ganzhou Refinery', factory: 'Ganzhou Processing Plant', country: 'CN',
    po: 'PO-2026-0512', period: '2026-05', ratio: '64%', risk: 'feoc',
  },
  {
    id: 'katanga',
    stage: 3, indent: 2, tier: 'Tier 4',
    name: 'Katanga Mining', meta: 'PO-2026-0503 · Katanga Site Refinery · 공급비율 36%',
    partCode: 'SUP-CD-001', category: '광산',
    supplier: 'Katanga Mining', factory: 'Katanga Site Refinery', country: 'CD',
    po: 'PO-2026-0503', period: '2026-05', ratio: '36%', risk: 'rights',
  },
  {
    id: 'pos-cathode',
    stage: 3, indent: 1, tier: 'Tier 1',
    name: 'POS Cathode', meta: 'PO-2026-0520 · Gwangyang Plant · 공급비율 100%',
    partCode: 'SUP-KR-001', category: '제조',
    supplier: 'POS Cathode', factory: 'Gwangyang Plant', country: 'KR',
    po: 'PO-2026-0520', period: '2026-05', ratio: '100%', risk: 'verified',
  },
];

const STAGE_LABELS: Record<Stage, string> = {
  0: '0. 완성품',
  1: '1. BOM 부품',
  2: '2. 원재료/광물',
  3: '3. 공급사/사업장',
};

const STAGE_META: Record<Stage, { border: string; bg: string }> = {
  0: { border: 'border-accent-200', bg: 'bg-accent-50' },
  1: { border: 'border-ink-700', bg: 'bg-white' },
  2: { border: 'border-ink-700', bg: 'bg-white' },
  3: { border: 'border-ink-700', bg: 'bg-white' },
};

const RISK_META: Record<RiskStatus, { label: string; badge: string; icon: typeof CheckCircle2 }> = {
  ok:       { label: '정상',      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  caution:  { label: '주의',      badge: 'border-amber-200 bg-amber-50 text-amber-700',       icon: Clock },
  high:     { label: '고위험',    badge: 'border-red-200 bg-red-50 text-red-700',             icon: AlertTriangle },
  feoc:     { label: 'FEOC 검토', badge: 'border-red-200 bg-red-50 text-red-700',             icon: ShieldAlert },
  rights:   { label: '인권 우려', badge: 'border-red-200 bg-red-50 text-red-700',             icon: AlertTriangle },
  verified: { label: '검증완료',  badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
};

const PRODUCT_SUMMARY = { code: 'EV-BAT-77', bomVersion: 'v3.2 active', sourceSystem: 'ERP / PLM', synced: '2026-06-05' };

const TRACE_STEPS = [
  { n: '1', title: '제품과 기간 선택', desc: '제품, BOM 버전, 단위기간, 사업장, PO 조건을 먼저 고릅니다.' },
  { n: '2', title: 'BOM 항목 확인', desc: '부품과 원재료가 제품 순서대로 내려가며 표시됩니다.' },
  { n: '3', title: '공급사 연결', desc: '각 항목에 연결된 협력사, 사업장, 국가, PO가 붙습니다.' },
  { n: '4', title: '표로 검토 / 다운로드', desc: '감사 데이터를 감사 제출용 CSV/Excel로 내보냅니다.' },
];

const TABLE_HEADERS = ['Level', 'BOM / 항목', 'Part Code', '공급사', '사업장', '국가', 'PO', '기간', '비율', '리스크'];

/* ─── Page ─────────────────────────────────────────────────── */
export default function BomTracePage() {
  const [productId, setProductId] = useState('EV-BAT-77');
  const [bomVersion, setBomVersion] = useState('v3.2 · active');
  const [dateRange, setDateRange] = useState('2026-05-01 ~ 2026-05-31');
  const [factory, setFactory] = useState('전체 사업장');
  const [destination, setDestination] = useState('EU');
  const [po, setPo] = useState('전체 PO');
  const [tab, setTab] = useState<Tab>('map');

  const stageGroups = ([0, 1, 2, 3] as Stage[]).map(stage => ({
    stage,
    nodes: NODES.filter(n => n.stage === stage),
  }));

  const highRiskNodes = NODES.filter(n => ['high', 'feoc', 'rights'].includes(n.risk));
  const cautionNodes = NODES.filter(n => n.risk === 'caution');
  const safeNodes = NODES.filter(n => ['ok', 'verified'].includes(n.risk));

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent-600">
            Product Traceability · BOM Based Supply Chain
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-100">제품 BOM 기반 공급망 추적</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-500">
            제품과 단위기간을 선택하면 BOM 기준으로 부품, 원재료, 협력사, 사업장, PO 정보를 한 흐름으로 추적합니다.
            감사 결과를 맵 형태와 표 형태로 확인하고 감사용 파일로 내보낼 수 있습니다.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-sm font-semibold text-ink-300 hover:bg-ink-800">
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xs border border-accent-100 bg-accent-50 px-3 py-2 text-sm font-semibold text-accent-700 hover:bg-accent-100">
            <FileSpreadsheet className="h-4 w-4" />
            Excel 다운로드
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="grid grid-cols-[1.2fr_.75fr_.75fr_.7fr_1fr_1fr] gap-3 rounded-sm border border-ink-700 bg-white p-4 shadow-control">
        <ToolbarField label="제품">
          <select value={productId} onChange={e => setProductId(e.target.value)} className={selectCls}>
            {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </ToolbarField>
        <ToolbarField label="BOM 버전">
          <select value={bomVersion} onChange={e => setBomVersion(e.target.value)} className={selectCls}>
            {BOM_VERSIONS.map(v => <option key={v}>{v}</option>)}
          </select>
        </ToolbarField>
        <ToolbarField label="단위기간">
          <input value={dateRange} onChange={e => setDateRange(e.target.value)} className={selectCls} />
        </ToolbarField>
        <ToolbarField label="사업장">
          <select value={factory} onChange={e => setFactory(e.target.value)} className={selectCls}>
            {FACTORIES.map(f => <option key={f}>{f}</option>)}
          </select>
        </ToolbarField>
        <ToolbarField label="목적지">
          <select value={destination} onChange={e => setDestination(e.target.value)} className={selectCls}>
            {DESTINATIONS.map(d => <option key={d}>{d}</option>)}
          </select>
        </ToolbarField>
        <ToolbarField label="PO">
          <select value={po} onChange={e => setPo(e.target.value)} className={selectCls}>
            {PO_OPTIONS.map(p => <option key={p}>{p}</option>)}
          </select>
        </ToolbarField>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="BOM 항목" value={14} sub="부품/원재료 포함" icon={Layers} />
        <StatCard label="연결 협력사" value={9} sub="Tier 1~4" icon={Users} />
        <StatCard label="고위험 노드" value={2} sub="FEOC·원산지 검토" icon={ShieldAlert} tone="alert" />
        <StatCard label="데이터 적합성" value="87%" sub="검증 완료 기준" icon={Package} tone="ok" />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-[1fr_380px] items-start gap-4">
        {/* Left: map / table / risk tabs */}
        <section className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="flex items-start justify-between gap-4 border-b border-ink-700 bg-ink-800/20 px-5 py-4">
            <div>
              <div className="text-base font-bold text-ink-100">공급망 맵</div>
              <div className="mt-0.5 text-xs text-ink-500">
                제품 BOM을 기준으로 실제 단계가 펼쳐지는 추적 맵입니다.
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {(['map', 'table', 'risk'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={clsx(
                    'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                    tab === t
                      ? 'border-accent-300 bg-accent-50 text-accent-700'
                      : 'border-ink-700 bg-white text-ink-400 hover:text-ink-200',
                  )}
                >
                  {t === 'map' ? '맵 보기' : t === 'table' ? '표 보기' : '리스크맵'}
                </button>
              ))}
            </div>
          </div>

          {tab === 'map' && (
            <div className="p-5 space-y-4">
              {stageGroups.map(({ stage, nodes }) => (
                <StageRow key={stage} stage={stage} nodes={nodes} />
              ))}
              <div className="flex flex-wrap gap-2 border-t border-ink-700 pt-3">
                {(['ok', 'caution', 'high', 'feoc', 'verified'] as RiskStatus[]).map(r => {
                  const m = RISK_META[r];
                  return (
                    <span key={r} className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold', m.badge)}>
                      <m.icon className="h-3 w-3" />
                      {m.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'table' && <NodeTable nodes={NODES} />}

          {tab === 'risk' && (
            <div className="p-5 space-y-3">
              <RiskGroup title="고위험" tone="alert" nodes={highRiskNodes} />
              <RiskGroup title="주의" tone="warn" nodes={cautionNodes} />
              <RiskGroup title="정상 / 검증" tone="ok" nodes={safeNodes} />
            </div>
          )}
        </section>

        {/* Right: side panels */}
        <div className="space-y-4">
          <section className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 bg-ink-800/20 px-4 py-3">
              <div className="text-sm font-bold text-ink-100">제품 선택 요약</div>
              <div className="mt-0.5 text-xs text-ink-500">원천 시스템 데이터 기준</div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <SummaryCell k="제품 코드" v={PRODUCT_SUMMARY.code} />
              <SummaryCell k="BOM 버전" v={PRODUCT_SUMMARY.bomVersion} />
              <SummaryCell k="원천 시스템" v={PRODUCT_SUMMARY.sourceSystem} />
              <SummaryCell k="동기화" v={PRODUCT_SUMMARY.synced} />
            </div>
            <div className="px-4 pb-4">
              <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
                이 화면의 맵은 "어떤 제품의 어떤 BOM 항목이 어떤 협력사의 사업장을 통해 들어오는지"를 추적하는 용도입니다.
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 bg-ink-800/20 px-4 py-3">
              <div className="text-sm font-bold text-ink-100">추적 흐름</div>
              <div className="mt-0.5 text-xs text-ink-500">사용자가 읽는 순서</div>
            </div>
            <div className="divide-y divide-ink-700/40">
              {TRACE_STEPS.map(step => (
                <div key={step.n} className="flex gap-3 px-4 py-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-50 text-sm font-bold text-accent-700">
                    {step.n}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-ink-100">{step.title}</div>
                    <div className="mt-0.5 text-xs leading-5 text-ink-500">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Bottom: full table */}
      <section className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="flex items-start justify-between gap-4 border-b border-ink-700 bg-ink-800/20 px-5 py-4">
          <div>
            <div className="text-base font-bold text-ink-100">공급망 추적 표</div>
            <div className="mt-0.5 text-xs text-ink-500">
              맵과 동일한 데이터를 표로 펼친 형태입니다. Excel/CSV 다운로드 가능.
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-semibold text-ink-400 hover:bg-ink-800">
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-100">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </button>
          </div>
        </div>
        <NodeTable nodes={NODES} />
      </section>
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────── */
const selectCls = 'w-full h-10 rounded-xs border border-ink-700 bg-white px-3 text-sm text-ink-200 outline-none focus:border-accent-500';

function ToolbarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-ink-500">{label}</label>
      {children}
    </div>
  );
}

function StatCard({
  label, value, sub, icon: Icon, tone = 'neutral',
}: {
  label: string; value: number | string; sub: string;
  icon: typeof Layers; tone?: 'neutral' | 'ok' | 'alert';
}) {
  return (
    <div className="rounded-sm border border-ink-700 bg-white p-4 shadow-control">
      <div className="mb-2 flex items-center justify-between text-xs text-ink-500">
        <span>{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className={clsx(
        'num-mono text-2xl font-bold',
        tone === 'alert' ? 'text-red-700' : tone === 'ok' ? 'text-emerald-700' : 'text-ink-100',
      )}>
        {value}
      </div>
      <div className="mt-1 text-xs text-ink-500">{sub}</div>
    </div>
  );
}

function StageRow({ stage, nodes }: { stage: Stage; nodes: BomNode[] }) {
  const sm = STAGE_META[stage];
  return (
    <div className="grid grid-cols-[112px_1fr] gap-3">
      <div className="pt-3 text-xs font-black text-ink-400">{STAGE_LABELS[stage]}</div>
      <div className={clsx('overflow-hidden rounded-sm border', sm.border, sm.bg)}>
        {nodes.map((node, i) => (
          <LineageNode key={node.id} node={node} isFirst={i === 0} />
        ))}
      </div>
    </div>
  );
}

function LineageNode({ node, isFirst }: { node: BomNode; isFirst: boolean }) {
  const rm = RISK_META[node.risk];
  const RiskIcon = rm.icon;
  const indentOffset = node.indent * 24;
  const lineLeft = 16 + (node.indent - 1) * 24;

  return (
    <div className={clsx(
      'relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/5',
      !isFirst && 'border-t border-ink-700/20',
    )}>
      {node.indent > 0 && (
        <>
          <div className="absolute top-0 bottom-0 w-px bg-ink-700/30" style={{ left: lineLeft }} />
          <div className="absolute h-px bg-ink-700/30" style={{ left: lineLeft, width: 16, top: '50%' }} />
        </>
      )}
      <div
        className="grid min-w-0 flex-1 items-center gap-3"
        style={{
          paddingLeft: node.indent > 0 ? indentOffset + 4 : 0,
          gridTemplateColumns: 'minmax(180px,1fr) 70px 140px 50px 100px',
        }}
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-ink-100">{node.name}</div>
          <div className="mt-0.5 truncate text-xs text-ink-500">{node.meta}</div>
        </div>
        <span className="inline-flex items-center justify-center rounded-xs border border-ink-700 bg-ink-800 px-2 py-0.5 text-xs font-bold text-ink-400 whitespace-nowrap">
          {node.tier}
        </span>
        <span className="truncate text-xs text-ink-400">{node.supplier}</span>
        <span className="text-xs font-bold text-ink-400">{node.country}</span>
        <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold whitespace-nowrap', rm.badge)}>
          <RiskIcon className="h-3 w-3 shrink-0" />
          {rm.label}
        </span>
      </div>
    </div>
  );
}

function NodeTable({ nodes }: { nodes: BomNode[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-700 bg-ink-800/30">
            {TABLE_HEADERS.map(h => (
              <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-700/40">
          {nodes.map(node => {
            const rm = RISK_META[node.risk];
            const RiskIcon = rm.icon;
            return (
              <tr key={node.id} className="transition-colors hover:bg-ink-800/20">
                <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-ink-400">{node.tier}</td>
                <td className="whitespace-nowrap px-4 py-3 font-bold text-ink-100">{node.name}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-400">{node.partCode}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-300">{node.supplier}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-400">{node.factory}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-400">{node.country}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-400">{node.po ?? '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-400">{node.period}</td>
                <td className="num-mono whitespace-nowrap px-4 py-3 font-bold text-ink-300">{node.ratio}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold', rm.badge)}>
                    <RiskIcon className="h-3 w-3" />
                    {rm.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RiskGroup({ title, tone, nodes }: { title: string; tone: 'alert' | 'warn' | 'ok'; nodes: BomNode[] }) {
  if (nodes.length === 0) return null;
  const colors = {
    alert: { border: 'border-red-200', bg: 'bg-red-50', title: 'text-red-700' },
    warn:  { border: 'border-amber-200', bg: 'bg-amber-50', title: 'text-amber-700' },
    ok:    { border: 'border-emerald-200', bg: 'bg-emerald-50', title: 'text-emerald-700' },
  };
  const c = colors[tone];
  return (
    <div className={clsx('rounded-sm border p-4', c.border, c.bg)}>
      <div className={clsx('mb-3 text-sm font-bold', c.title)}>{title} ({nodes.length})</div>
      <div className="space-y-2">
        {nodes.map(n => {
          const rm = RISK_META[n.risk];
          const RiskIcon = rm.icon;
          return (
            <div key={n.id} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700/20 bg-white px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-ink-100">{n.name}</div>
                <div className="text-xs text-ink-500">{n.tier} · {n.country} · {n.supplier}</div>
              </div>
              <span className={clsx('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold whitespace-nowrap', rm.badge)}>
                <RiskIcon className="h-3 w-3" />
                {rm.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCell({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xs border border-ink-700 bg-ink-800 p-2.5">
      <div className="text-xs font-bold text-ink-500">{k}</div>
      <div className="mt-1 text-sm font-bold text-ink-100">{v}</div>
    </div>
  );
}
