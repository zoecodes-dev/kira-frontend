'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Layers,
  Package,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';

type Status = 'ok' | 'caution' | 'high' | 'feoc' | 'review';
type Stage = 'product' | 'bom' | 'material' | 'supplier';

interface TraceNode {
  id: string;
  stage: Stage;
  depth: 0 | 1 | 2;
  tier: string;
  name: string;
  meta: string;
  supplier: string;
  site: string;
  country: string;
  po: string;
  ratio: string;
  status: Status;
}

const nodes: TraceNode[] = [
  {
    id: 'product',
    stage: 'product',
    depth: 0,
    tier: '제품',
    name: 'Premium NCM811 100Ah',
    meta: 'BAT-NCM811-100Ah / BOM v3.2 / 2026년 5월 출고 기준',
    supplier: 'Hanyang Cell Manufacturing',
    site: 'F-003',
    country: 'KR',
    po: '-',
    ratio: '100%',
    status: 'ok',
  },
  {
    id: 'cell',
    stage: 'bom',
    depth: 0,
    tier: 'Tier 1',
    name: 'Battery Cell Module',
    meta: 'BOM item / 48 EA / 제품 중량 42.5%',
    supplier: 'Hanyang Cell Manufacturing',
    site: 'F-003',
    country: 'KR',
    po: 'PO-2026-0521',
    ratio: '42.5%',
    status: 'ok',
  },
  {
    id: 'cathode',
    stage: 'bom',
    depth: 0,
    tier: 'Tier 1',
    name: 'Cathode Active Material',
    meta: 'BOM item / 128.5 kg / 제품 중량 31.2%',
    supplier: 'POS Cathode Materials',
    site: 'S-CAM-001',
    country: 'KR',
    po: 'PO-2026-0520',
    ratio: '31.2%',
    status: 'caution',
  },
  {
    id: 'lithium',
    stage: 'material',
    depth: 1,
    tier: 'Tier 2',
    name: 'Lithium Hydroxide',
    meta: '양극재 하위 원재료 / 광물 비율 8.4%',
    supplier: 'Pohang Refining Works',
    site: 'S-REF-001',
    country: 'AU',
    po: 'PO-2026-0508',
    ratio: '8.4%',
    status: 'ok',
  },
  {
    id: 'cobalt',
    stage: 'material',
    depth: 1,
    tier: 'Tier 2',
    name: 'Cobalt Sulfate',
    meta: '양극재 하위 원재료 / 광물 비율 12.8%',
    supplier: 'Ganzhou Rare Metals',
    site: 'S-REF-002',
    country: 'CN',
    po: 'PO-2026-0512',
    ratio: '12.8%',
    status: 'high',
  },
  {
    id: 'ganzhou',
    stage: 'supplier',
    depth: 2,
    tier: 'Tier 3',
    name: 'Ganzhou Rare Metals',
    meta: '정련소 / 공급 비율 64% / FEOC 검토 필요',
    supplier: 'Ganzhou Rare Metals',
    site: 'S-REF-002',
    country: 'CN',
    po: 'PO-2026-0512',
    ratio: '64%',
    status: 'feoc',
  },
  {
    id: 'katanga',
    stage: 'supplier',
    depth: 2,
    tier: 'Tier 4',
    name: 'Katanga Cobalt Mining',
    meta: '광산 / 공급 비율 36% / 인권 실사 필요',
    supplier: 'Katanga Cobalt Mining',
    site: 'S-MINE-002',
    country: 'CD',
    po: 'PO-2026-0503',
    ratio: '36%',
    status: 'review',
  },
];

const stageLabels: Record<Stage, string> = {
  product: '0. 제품',
  bom: '1. BOM 부품',
  material: '2. 원재료 / 광물',
  supplier: '3. 공급사 / 사업장',
};

const statusMeta: Record<Status, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  ok: {
    label: '정상',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    Icon: CheckCircle2,
  },
  caution: {
    label: '주의',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    Icon: Clock,
  },
  high: {
    label: '고위험',
    className: 'border-red-200 bg-red-50 text-red-700',
    Icon: AlertTriangle,
  },
  feoc: {
    label: 'FEOC 검토',
    className: 'border-red-200 bg-red-50 text-red-700',
    Icon: ShieldAlert,
  },
  review: {
    label: '실사 필요',
    className: 'border-red-200 bg-red-50 text-red-700',
    Icon: AlertTriangle,
  },
};

const groupedNodes = (['product', 'bom', 'material', 'supplier'] as Stage[]).map(stage => ({
  stage,
  nodes: nodes.filter(node => node.stage === stage),
}));

export default function SupplyChainMapPage() {
  const [mapGenerated, setMapGenerated] = useState(false);
  const [generatedAt, setGeneratedAt] = useState('');

  function handleGenerateMap() {
    setMapGenerated(true);
    setGeneratedAt(new Date().toLocaleString('ko-KR'));
    window.requestAnimationFrame(() => {
      document.getElementById('supply-chain-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <div className="min-h-screen bg-ink-800 p-8">
      <header className="mb-5 flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-700">
            Product Traceability / BOM Based Supply Chain
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-100">공급망맵</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-ink-500">
            제품과 단위기간을 먼저 선택하면 BOM 항목을 기준으로 원재료, 조달 정보, 협력사, 사업장, PO가 연결됩니다.
            운영자는 누락 데이터를 관리하고, 고객사와 감사기관은 같은 결과를 규제 확인용 증빙으로 조회할 수 있습니다.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-sm font-semibold text-ink-300 hover:bg-ink-800">
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xs border border-accent-100 bg-accent-50 px-3 py-2 text-sm font-semibold text-accent-700 hover:bg-accent-100">
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-[1.35fr_.75fr_.9fr_.75fr_.65fr_.8fr_auto] gap-3 rounded-sm border border-ink-700 bg-white p-4 shadow-control">
        <Field label="제품">
          <select className={fieldClass}>
            <option>BAT-NCM811-100Ah / Premium NCM811 100Ah</option>
            <option>EV-MOTOR-DRIVE-220kW / KIRA Motor Drive</option>
          </select>
        </Field>
        <Field label="BOM 버전">
          <select className={fieldClass}>
            <option>v3.2 / active</option>
            <option>v3.1 / archived</option>
          </select>
        </Field>
        <Field label="단위기간">
          <input className={fieldClass} defaultValue="2026-05-01 ~ 2026-05-31" />
        </Field>
        <Field label="사업장">
          <select className={fieldClass}>
            <option>전체 사업장</option>
            <option>F-003</option>
            <option>S-CAM-001</option>
          </select>
        </Field>
        <Field label="목적지">
          <select className={fieldClass}>
            <option>EU</option>
            <option>US</option>
            <option>KR</option>
          </select>
        </Field>
        <Field label="PO">
          <input className={fieldClass} defaultValue="전체 PO" />
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleGenerateMap}
            className="inline-flex h-10 min-w-[116px] items-center justify-center gap-1.5 rounded-xs border border-accent-700 bg-accent-700 px-3 text-sm font-bold text-white hover:bg-accent-600"
          >
            <Search className="h-4 w-4" />
            맵 생성
          </button>
        </div>
      </section>

      {mapGenerated && (
        <div className="mb-4 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          공급망 맵이 생성되었습니다. 적용 조건: BAT-NCM811-100Ah / BOM v3.2 / 2026-05 / EU / 전체 PO
          <span className="ml-2 text-xs font-medium text-emerald-700">{generatedAt}</span>
        </div>
      )}

      {mapGenerated ? (
        <>
      <section className="mb-4 grid grid-cols-5 gap-3">
        <Metric label="BOM 항목" value="14" hint="부품 및 원재료 포함" icon={Layers} />
        <Metric label="연결 협력사" value="9" hint="Tier 1부터 Tier 4까지" icon={Users} />
        <Metric label="고위험 노드" value="2" hint="FEOC 및 인권 실사 대상" icon={ShieldAlert} tone="alert" />
        <Metric label="데이터 정합률" value="87%" hint="검증 완료 기준" icon={Package} tone="ok" />
        <Metric label="미응답 협력사" value="3" hint="초대 또는 재요청 필요" icon={Clock} tone="warn" />
      </section>

      <div id="supply-chain-map" className="grid grid-cols-[minmax(0,1fr)_390px] items-start gap-4">
        <section className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="flex items-start justify-between gap-4 border-b border-ink-700 bg-ink-800/40 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-ink-100">제품 BOM 기반 공급망 흐름</h2>
              <p className="mt-1 text-xs leading-5 text-ink-500">
                완제품에서 BOM 부품, 원재료, 공급사와 사업장까지 일방향으로 추적합니다.
              </p>
            </div>
            <div className="flex shrink-0 rounded-full border border-ink-700 bg-white p-1">
              <button className="rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold text-accent-700">운영자</button>
              <button className="rounded-full px-3 py-1.5 text-xs font-bold text-ink-500">감사용</button>
              <button className="rounded-full px-3 py-1.5 text-xs font-bold text-ink-500">테이블</button>
            </div>
          </div>

          <div className="space-y-4 p-5">
            {groupedNodes.map(group => (
              <div key={group.stage} className="grid grid-cols-[128px_minmax(0,1fr)] gap-3">
                <div className="pt-4 text-xs font-black text-ink-400">{stageLabels[group.stage]}</div>
                <div className={`overflow-hidden rounded-sm border ${group.stage === 'product' ? 'border-accent-100 bg-accent-50' : 'border-ink-700 bg-white'}`}>
                  {group.nodes.map((node, index) => (
                    <TraceRow key={node.id} node={node} isFirst={index === 0} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 bg-ink-800/40 px-4 py-3">
              <h2 className="text-sm font-bold text-ink-100">선택 제품 요약</h2>
              <p className="mt-0.5 text-xs text-ink-500">ERP, PLM, 구매 원천데이터 기준</p>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <Summary label="제품 코드" value="BAT-NCM811-100Ah" />
              <Summary label="BOM 버전" value="v3.2 active" />
              <Summary label="원천 시스템" value="ERP / PLM / 구매" />
              <Summary label="마지막 동기화" value="2026-06-05 09:20" />
              <Summary label="출고 사업장" value="F-003" />
              <Summary label="감사 제출 상태" value="보완 필요" />
            </div>
            <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
              이 화면은 단순 조직도가 아니라, 제품 BOM 항목이 어느 협력사와 사업장을 통해 들어오는지 추적하는 규제 확인용 맵입니다.
            </div>
          </section>

          <section className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 bg-ink-800/40 px-4 py-3">
              <h2 className="text-sm font-bold text-ink-100">운영 처리 상태</h2>
              <p className="mt-0.5 text-xs text-ink-500">맵 생성 후 필요한 후속 작업</p>
            </div>
            <div className="divide-y divide-ink-700/50">
              <Step n="1" title="제품과 단위기간 선택" desc="제품, BOM 버전, 기간, 사업장, PO 조건이 맵 생성 기준입니다." />
              <Step n="2" title="BOM 하위 항목 연결" desc="부품, 원재료, 광물 비율, 유해물질 정보가 제품 하위로 정렬됩니다." />
              <Step n="3" title="협력사 초대 필요" desc="미응답 Tier 2, Tier 3 협력사는 1차사를 통해 초대 또는 재요청합니다." warn />
              <Step n="4" title="고위험 노드 검토" desc="FEOC, 인권 실사, 원산지 리스크 대상은 감사 제출 전에 보완합니다." warn />
            </div>
          </section>
        </aside>
      </div>

      <section className="mt-4 overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="flex items-start justify-between gap-4 border-b border-ink-700 bg-ink-800/40 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-ink-100">공급망 추적 결과</h2>
            <p className="mt-0.5 text-xs text-ink-500">맵과 동일한 데이터를 감사 제출 가능한 표 형식으로 제공합니다.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-semibold text-ink-400 hover:bg-ink-800">CSV</button>
            <button className="rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-100">Excel</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700 bg-ink-800/30">
                {['Level', 'BOM / 항목', '공급사', '사업장', '국가', 'PO', '비율', '규제 상태'].map(header => (
                  <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-ink-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/40">
              {nodes.map(node => {
                const meta = statusMeta[node.status];
                return (
                  <tr key={node.id} className="hover:bg-ink-800/30">
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-ink-400">{node.tier}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-ink-100">{node.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-300">{node.supplier}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{node.site}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{node.country}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-400">{node.po}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-ink-300">{node.ratio}</td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={node.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
        </>
      ) : (
        <section id="supply-chain-map" className="rounded-sm border border-dashed border-ink-600 bg-white p-10 text-center shadow-control">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-accent-50 text-accent-700">
            <Search className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-ink-100">조건을 선택한 뒤 맵을 생성하세요</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-500">
            상단의 제품, BOM 버전, 단위기간, 사업장, 목적지, PO 조건을 기준으로 BOM 기반 공급망 맵과 감사용 테이블이 생성됩니다.
          </p>
        </section>
      )}
    </div>
  );
}

const fieldClass = 'h-10 w-full rounded-xs border border-ink-700 bg-white px-3 text-sm font-medium text-ink-200 outline-none focus:border-accent-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function Metric({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Layers;
  tone?: 'neutral' | 'ok' | 'warn' | 'alert';
}) {
  return (
    <div className="rounded-sm border border-ink-700 bg-white p-4 shadow-control">
      <div className="mb-2 flex items-center justify-between text-xs text-ink-500">
        <span>{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className={`text-2xl font-bold ${tone === 'ok' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'alert' ? 'text-red-700' : 'text-ink-100'}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-ink-500">{hint}</div>
    </div>
  );
}

function TraceRow({ node, isFirst }: { node: TraceNode; isFirst: boolean }) {
  return (
    <div className={`relative grid grid-cols-[minmax(220px,1.5fr)_90px_140px_70px_110px] items-center gap-3 px-4 py-3 ${!isFirst ? 'border-t border-ink-700/40' : ''}`}>
      {node.depth > 0 && (
        <>
          <div className="absolute bottom-0 top-0 w-px bg-ink-700/50" style={{ left: `${18 + (node.depth - 1) * 24}px` }} />
          <div className="absolute h-px w-4 bg-ink-700/50" style={{ left: `${18 + (node.depth - 1) * 24}px`, top: '50%' }} />
        </>
      )}
      <div className="min-w-0" style={{ paddingLeft: `${node.depth * 24}px` }}>
        <div className="truncate text-sm font-bold text-ink-100">{node.name}</div>
        <div className="mt-0.5 truncate text-xs text-ink-500">{node.meta}</div>
      </div>
      <span className="inline-flex justify-center rounded-xs border border-ink-700 bg-ink-800 px-2 py-1 text-xs font-bold text-ink-400">{node.tier}</span>
      <span className="truncate text-xs font-semibold text-ink-400">{node.supplier}</span>
      <span className="text-xs font-bold text-ink-400">{node.country}</span>
      <StatusBadge status={node.status} />
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const meta = statusMeta[status];
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex items-center justify-center gap-1 rounded-full border px-2 py-1 text-xs font-bold ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
      <div className="text-xs font-bold text-ink-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-ink-100">{value}</div>
    </div>
  );
}

function Step({ n, title, desc, warn }: { n: string; title: string; desc: string; warn?: boolean }) {
  return (
    <div className="flex gap-3 px-4 py-3.5">
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${warn ? 'bg-amber-50 text-amber-700' : 'bg-accent-50 text-accent-700'}`}>
        {n}
      </div>
      <div>
        <div className="text-sm font-bold text-ink-100">{title}</div>
        <div className="mt-0.5 text-xs leading-5 text-ink-500">{desc}</div>
      </div>
    </div>
  );
}
