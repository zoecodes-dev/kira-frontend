'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowRight,
  Box,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Factory,
  Filter,
  Layers,
  MapPin,
  PackageCheck,
  Search,
  Send,
  ShieldAlert,
  Target,
} from 'lucide-react';

type RiskLevel = 'low' | 'medium' | 'high';
type NodeStatus = 'ready' | 'review' | 'blocked';
type ViewMode = 'critical' | 'all';
type ProductFilter = 'all' | 'risk' | 'ready';

interface SupplierOption {
  id: string;
  name: string;
  role: string;
  country: string;
  itemCount: number;
  riskCount: number;
  readiness: number;
}

interface ProductOption {
  id: string;
  supplierId: string;
  name: string;
  code: string;
  category: string;
  dppStatus: 'ready' | 'needs_action';
  readiness: number;
  riskCount: number;
  owner: string;
  due: string;
}

interface SupplyNode {
  id: string;
  stage: 'product' | 'component' | 'material' | 'origin';
  title: string;
  subtitle: string;
  tier: string;
  status: NodeStatus;
  riskLevel: RiskLevel;
  supplier: string;
  country: string;
  evidence: string[];
  risks: string[];
  dppImpact: string;
  nextAction: string;
  owner: string;
  due: string;
  links: { label: string; href: string }[];
  inputCompleted?: boolean;
  downstreamRegistered?: boolean;
}

interface ExpansionStatus {
  tier1Registered: number;
  tier1Total: number;
  tier2Registered: number;
  tier2Total: number;
  tier3Registered: number;
  tier3Total: number;
  completeness: number;
}

const suppliers: SupplierOption[] = [
  {
    id: 'S-CELL-001',
    name: 'Hanyang Cell Manufacturing',
    role: '셀·모듈·팩 통합 제조',
    country: 'KR',
    itemCount: 12,
    riskCount: 3,
    readiness: 82,
  },
  {
    id: 'S-BMS-002',
    name: 'BMS Korea Co.',
    role: 'BMS 제어 모듈',
    country: 'KR',
    itemCount: 8,
    riskCount: 1,
    readiness: 91,
  },
  {
    id: 'S-CAS-003',
    name: 'ALU Frame Co.',
    role: '팩 케이스·하우징',
    country: 'KR',
    itemCount: 6,
    riskCount: 0,
    readiness: 96,
  },
  {
    id: 'S-CON-007',
    name: 'Connector Tech Korea',
    role: '커넥터·와이어링',
    country: 'KR',
    itemCount: 9,
    riskCount: 0,
    readiness: 94,
  },
];

const products: ProductOption[] = [
  {
    id: 'P-101',
    supplierId: 'S-CELL-001',
    name: 'EV High-Nickel Cell A',
    code: 'CELL-NCM-811',
    category: '고니켈 셀',
    dppStatus: 'needs_action',
    readiness: 76,
    riskCount: 2,
    owner: '구매기획팀 김지훈',
    due: '2026-06-12',
  },
  {
    id: 'P-102',
    supplierId: 'S-CELL-001',
    name: 'ESS Standard Cell B',
    code: 'CELL-LFP-STD',
    category: 'LFP 셀',
    dppStatus: 'ready',
    readiness: 94,
    riskCount: 0,
    owner: 'DPP 운영팀 박서연',
    due: '2026-07-01',
  },
  {
    id: 'P-103',
    supplierId: 'S-CELL-001',
    name: 'PHEV Custom Cell C',
    code: 'CELL-NCM-622',
    category: 'PHEV 셀',
    dppStatus: 'needs_action',
    readiness: 81,
    riskCount: 1,
    owner: '구매기획팀 김지훈',
    due: '2026-06-18',
  },
  {
    id: 'P-201',
    supplierId: 'S-BMS-002',
    name: 'BMS Main Controller Board',
    code: 'BMS-MCU-2026',
    category: 'BMS 보드',
    dppStatus: 'needs_action',
    readiness: 84,
    riskCount: 1,
    owner: '전장부품팀 이현우',
    due: '2026-06-20',
  },
  {
    id: 'P-301',
    supplierId: 'S-CAS-003',
    name: 'Battery Pack Aluminum Case',
    code: 'CASE-ALU-STD',
    category: '팩 케이스',
    dppStatus: 'ready',
    readiness: 97,
    riskCount: 0,
    owner: '기구부품팀 문하린',
    due: '2026-07-05',
  },
];

const expansionStatusByProduct: Record<string, ExpansionStatus> = {
  'P-101': {
    tier1Registered: 4,
    tier1Total: 4,
    tier2Registered: 6,
    tier2Total: 12,
    tier3Registered: 0,
    tier3Total: 8,
    completeness: 38,
  },
  'P-102': {
    tier1Registered: 4,
    tier1Total: 4,
    tier2Registered: 10,
    tier2Total: 12,
    tier3Registered: 6,
    tier3Total: 8,
    completeness: 82,
  },
  'P-103': {
    tier1Registered: 3,
    tier1Total: 4,
    tier2Registered: 7,
    tier2Total: 12,
    tier3Registered: 2,
    tier3Total: 8,
    completeness: 48,
  },
  'P-201': {
    tier1Registered: 2,
    tier1Total: 2,
    tier2Registered: 4,
    tier2Total: 6,
    tier3Registered: 1,
    tier3Total: 4,
    completeness: 58,
  },
  'P-301': {
    tier1Registered: 3,
    tier1Total: 3,
    tier2Registered: 6,
    tier2Total: 6,
    tier3Registered: 4,
    tier3Total: 4,
    completeness: 100,
  },
};

const supplyChains: Record<string, SupplyNode[]> = {
  'P-101': [
    {
      id: 'cell-a',
      stage: 'product',
      title: 'EV High-Nickel Cell A',
      subtitle: '완제품 셀 · NCM 811',
      tier: 'Tier 1',
      status: 'review',
      riskLevel: 'medium',
      supplier: 'Hanyang Cell Manufacturing',
      country: 'KR',
      evidence: ['BOM 하위 소재 연결표', '셀 단위 DPP 제출 패키지'],
      risks: ['하위 소재 증빙 2건 미확인', '고니켈 원료 추적성 보완 필요'],
      dppImpact: '하위 소재의 원산지·규제 증빙이 닫히기 전까지 제품 DPP 제출 패키지가 보완 상태로 남습니다.',
      nextAction: '미제출 소재 증빙을 품목별 요청으로 전환하고 담당자 기한을 확정합니다.',
      owner: '구매기획팀 김지훈',
      due: '2026-06-12',
      links: [
        { label: '제품 목록', href: '/products' },
        { label: '요청 현황', href: '/supply-chain/request-map' },
      ],
    },
    {
      id: 'cathode-a',
      stage: 'component',
      title: 'Cathode ABC Materials',
      subtitle: '양극재 · NCM 전구체 배합',
      tier: 'Tier 2',
      status: 'review',
      riskLevel: 'medium',
      supplier: 'Cathode ABC Materials',
      country: 'KR',
      evidence: ['전구체 배합 명세서', '탄소배출 산정 근거'],
      risks: ['코발트 원산지 증빙 일부 미확정', 'Scope 3 산정 근거 갱신 지연'],
      dppImpact: '양극재 구성 원료의 비율과 탄소 근거가 제품 DPP 소재 구성표에 직접 반영됩니다.',
      nextAction: '코발트·니켈·리튬별 증빙 상태를 분리해 보완 요청을 발송합니다.',
      owner: '소재구매팀 최유진',
      due: '2026-06-10',
      links: [
        { label: '요청 생성', href: '/supply-chain/request-map' },
        { label: '리스크 관리', href: '/risk/high-risk' },
      ],
    },
    {
      id: 'cobalt-a',
      stage: 'material',
      title: 'Refined Cobalt Element',
      subtitle: '정제 코발트 · 제련 경로 확인',
      tier: 'Tier 4',
      status: 'blocked',
      riskLevel: 'high',
      supplier: 'Cobalt Refining Partner',
      country: 'CN',
      evidence: ['CMRT/RMI 증빙', '제련소 소유구조 확인서', 'FEOC 판정 근거'],
      risks: ['FEOC 연루 가능성 검토 필요', '제련소 소유구조 증빙 미제출', '분쟁광물 증빙 패키지 누락'],
      dppImpact: 'IRA FEOC 판정과 EU Battery 원산지 추적 항목에 동시에 영향을 주는 핵심 병목입니다.',
      nextAction: 'Tier 1을 통해 제련소 소유구조와 CMRT 증빙 재제출을 요청합니다.',
      owner: '규제대응팀 정민아',
      due: '2026-06-07',
      links: [
        { label: 'FEOC 검토', href: '/suppliers/S-CELL-001/feoc' },
        { label: '고위험 리스크', href: '/risk/high-risk' },
      ],
    },
    {
      id: 'drc-a',
      stage: 'origin',
      title: 'Katanga Minerals',
      subtitle: '코발트 광산 · DRC 원산지',
      tier: 'Tier 5',
      status: 'blocked',
      riskLevel: 'high',
      supplier: 'Katanga Minerals',
      country: 'CD',
      evidence: ['광산 실사보고서 최신본', '원산지 증명서', '커뮤니티 합의서'],
      risks: ['실사보고서 유효기간 만료', '원산지 증명서 최신본 미확정', '고위험 원산지 고객 승인 필요'],
      dppImpact: 'CSDDD 공급망 실사와 EU Battery due diligence 제출 근거가 막혀 있습니다.',
      nextAction: '최신 실사보고서와 원산지 증명서 재제출을 요청하고 고위험 원산지 승인 플로우를 엽니다.',
      owner: 'ESG 실사팀 오세림',
      due: '2026-06-05',
      links: [
        { label: '원산지 추적', href: '/suppliers/S-CELL-001/origin' },
        { label: 'ESG 실사', href: '/suppliers/S-CELL-001/esg' },
      ],
    },
    {
      id: 'nickel-a',
      stage: 'material',
      title: 'Nickel Sulfate',
      subtitle: '니켈 황산염 · 인도네시아 제련',
      tier: 'Tier 4',
      status: 'ready',
      riskLevel: 'low',
      supplier: 'Nickel Partner IDN',
      country: 'ID',
      evidence: ['원산지 증명서', 'EUDR 좌표', '탄소 배출계수'],
      risks: ['현재 주요 미해결 리스크 없음'],
      dppImpact: '소재 구성과 원산지 추적 근거가 제출 가능한 상태입니다.',
      nextAction: '정기 갱신 주기에 맞춰 증빙 유효기간만 모니터링합니다.',
      owner: '소재구매팀 최유진',
      due: '2026-07-01',
      links: [{ label: '원산지 증빙', href: '/risk/origin-certs' }],
    },
    {
      id: 'lithium-a',
      stage: 'material',
      title: 'Lithium Carbonate',
      subtitle: '리튬 탄산염 · 칠레 염호',
      tier: 'Tier 4',
      status: 'ready',
      riskLevel: 'low',
      supplier: 'Chile SQM Salt-Lake',
      country: 'CL',
      evidence: ['원산지 증명서', '물 사용량 자료', '채굴 허가서'],
      risks: ['현재 주요 미해결 리스크 없음'],
      dppImpact: '리튬 원산지와 물 리스크 근거가 제품 DPP에 반영 가능합니다.',
      nextAction: '물 사용량 데이터의 다음 갱신일을 추적합니다.',
      owner: '소재구매팀 최유진',
      due: '2026-07-01',
      links: [{ label: '원산지 증빙', href: '/risk/origin-certs' }],
    },
    {
      id: 'graphite-a',
      stage: 'component',
      title: 'Synthetic Graphite',
      subtitle: '음극재 · 합성 흑연',
      tier: 'Tier 3',
      status: 'review',
      riskLevel: 'medium',
      supplier: 'Anode Graphite Co.',
      country: 'CN',
      evidence: ['환경 감사보고서', '가공국 비중 확인서'],
      risks: ['환경 감사보고서 갱신 지연', '중국 가공 구간 비중 확인 필요'],
      dppImpact: 'UFLPA/FEOC 스크리닝과 음극재 근거자료 보완에 영향을 줍니다.',
      nextAction: '환경 감사보고서 최신본과 가공국 비중 확인서를 요청합니다.',
      owner: '규제대응팀 정민아',
      due: '2026-06-11',
      links: [{ label: 'AI 규제검증', href: '/suppliers/S-CELL-001/ai-verify' }],
    },
  ],
};

const fallbackNodes: SupplyNode[] = [
  {
    id: 'fallback-product',
    stage: 'product',
    title: '선택 조달 품목',
    subtitle: 'DPP 제출 패키지',
    tier: 'Tier 1',
    status: 'ready',
    riskLevel: 'low',
    supplier: '선택 협력사',
    country: 'KR',
    evidence: ['제품 BOM', '거래 증빙', '기본 원산지 자료'],
    risks: ['현재 주요 병목 없음'],
    dppImpact: '필수 제출 항목이 대부분 연결되어 있습니다.',
    nextAction: '정기 갱신 주기만 모니터링합니다.',
    owner: 'DPP 운영팀',
    due: '2026-07-01',
    links: [{ label: '제품 목록', href: '/products' }],
  },
  {
    id: 'fallback-material',
    stage: 'material',
    title: '핵심 소재 증빙',
    subtitle: '원산지·규제 근거',
    tier: 'Tier 3',
    status: 'ready',
    riskLevel: 'low',
    supplier: '연결 공급사',
    country: 'KR',
    evidence: ['원산지 증명서', '인증서'],
    risks: ['현재 주요 병목 없음'],
    dppImpact: '제품 DPP에 반영 가능한 상태입니다.',
    nextAction: '만료 예정 증빙만 추적합니다.',
    owner: 'DPP 운영팀',
    due: '2026-07-01',
    links: [{ label: '요청 현황', href: '/supply-chain/request-map' }],
  },
];

const stageMeta = {
  product: { label: '제품 / 1차 품목', accent: 'text-accent-700', bg: 'bg-accent-50', border: 'border-accent-100' },
  component: { label: '하위 구성품', accent: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
  material: { label: '핵심 소재', accent: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
  origin: { label: '원산지 / 광산', accent: 'text-red-700', bg: 'bg-red-50', border: 'border-red-100' },
} satisfies Record<SupplyNode['stage'], { label: string; accent: string; bg: string; border: string }>;

const statusMeta = {
  ready: {
    label: '완료',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    ring: 'border-emerald-300 bg-emerald-50/40',
    icon: CheckCircle2,
  },
  review: {
    label: '확인 필요',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    ring: 'border-amber-300 bg-amber-50/40',
    icon: Clock,
  },
  blocked: {
    label: '병목',
    badge: 'border-red-200 bg-red-50 text-red-700',
    ring: 'border-red-300 bg-red-50/50',
    icon: AlertTriangle,
  },
} satisfies Record<NodeStatus, { label: string; badge: string; ring: string; icon: typeof CheckCircle2 }>;

const riskMeta = {
  low: { label: '저위험', className: 'text-emerald-700', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  medium: { label: '중위험', className: 'text-amber-700', badge: 'border-amber-200 bg-amber-50 text-amber-700' },
  high: { label: '고위험', className: 'text-red-700', badge: 'border-red-200 bg-red-50 text-red-700' },
} satisfies Record<RiskLevel, { label: string; className: string; badge: string }>;

function getChain(productId: string) {
  return supplyChains[productId] ?? fallbackNodes;
}

export default function ProductMapPage() {
  const [supplierQuery, setSupplierQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('S-CELL-001');
  const [selectedProductId, setSelectedProductId] = useState('P-101');
  const [selectedNodeId, setSelectedNodeId] = useState('cobalt-a');
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('critical');

  const selectedSupplier = suppliers.find(supplier => supplier.id === selectedSupplierId) ?? suppliers[0];

  const supplierProducts = useMemo(
    () => products.filter(product => product.supplierId === selectedSupplier.id),
    [selectedSupplier.id],
  );

  const filteredProducts = useMemo(() => {
    if (productFilter === 'risk') return supplierProducts.filter(product => product.riskCount > 0);
    if (productFilter === 'ready') return supplierProducts.filter(product => product.dppStatus === 'ready');
    return supplierProducts;
  }, [productFilter, supplierProducts]);

  const selectedProduct = products.find(product => product.id === selectedProductId && product.supplierId === selectedSupplier.id)
    ?? supplierProducts[0]
    ?? products[0];
  const selectedExpansionStatus = expansionStatusByProduct[selectedProduct.id] ?? expansionStatusByProduct['P-101'];

  const chain = getChain(selectedProduct.id);
  const visibleNodes = viewMode === 'critical'
    ? chain.filter(node => node.status !== 'ready' || node.stage === 'product')
    : chain;
  const selectedNode = chain.find(node => node.id === selectedNodeId) ?? visibleNodes[0] ?? chain[0];

  const searchedSuppliers = useMemo(() => {
    const query = supplierQuery.trim().toLowerCase();
    if (!query) return suppliers;
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(query)
      || supplier.id.toLowerCase().includes(query)
      || supplier.role.toLowerCase().includes(query),
    );
  }, [supplierQuery]);

  const kpis = useMemo(() => {
    const blocked = chain.filter(node => node.status === 'blocked').length;
    const review = chain.filter(node => node.status === 'review').length;
    const missingEvidence = chain.reduce((sum, node) => sum + (node.status === 'ready' ? 0 : node.evidence.length), 0);
    return {
      stages: chain.length,
      blocked,
      review,
      missingEvidence,
      readiness: selectedProduct.readiness,
    };
  }, [chain, selectedProduct.readiness]);

  function handleSupplierSelect(supplierId: string) {
    const nextProduct = products.find(product => product.supplierId === supplierId) ?? products[0];
    const nextChain = getChain(nextProduct.id);
    const priorityNode = nextChain.find(node => node.status === 'blocked') ?? nextChain[0];
    setSelectedSupplierId(supplierId);
    setSelectedProductId(nextProduct.id);
    setSelectedNodeId(priorityNode.id);
  }

  function handleProductSelect(productId: string) {
    const nextChain = getChain(productId);
    const priorityNode = nextChain.find(node => node.status === 'blocked') ?? nextChain[0];
    setSelectedProductId(productId);
    setSelectedNodeId(priorityNode.id);
  }

  return (
    <div className="flex h-[calc(100vh-73px)] min-h-[760px] flex-col overflow-hidden bg-ink-800 [&_.font-black]:font-bold [&_.font-bold]:font-semibold [&_.font-semibold]:font-medium">
      <header className="shrink-0 border-b border-ink-700 bg-white px-8 py-5">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink-100">제품별 DPP 공급망 점검</h1>
            </div>
            <p className="max-w-4xl text-sm leading-6 text-ink-500">
              제품과 1차 조달 품목을 기준으로 상위 구성품, 핵심 소재, 원산지 리스크를 따라가며 DPP 제출 병목과 다음 조치를 확인합니다.
            </p>
            <ProductWorkspaceActions product={selectedProduct} expansion={selectedExpansionStatus} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/supply-chain/request-map" className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-sm font-semibold text-ink-300 hover:bg-ink-800">
              <Send className="h-4 w-4" />
              요청 현황
            </Link>
            <Link href="/products" className="inline-flex items-center gap-1.5 rounded-xs border border-accent-100 bg-accent-50 px-3 py-2 text-sm font-semibold text-accent-700 hover:bg-accent-100">
              <Box className="h-4 w-4" />
              제품 목록
            </Link>
          </div>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[352px_367px_minmax(500px,1fr)_362px] overflow-hidden">
        <aside className="flex min-h-0 min-w-0 flex-col border-r border-ink-700 bg-white p-4">
          <PanelTitle
            eyebrow="1"
            title="제품 공급사 선택"
            meta={`${suppliers.length}개사`}
          />
          <div className="relative mb-3 shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              value={supplierQuery}
              onChange={event => setSupplierQuery(event.target.value)}
              className="w-full rounded-xs border border-ink-700 bg-white py-2.5 pl-9 pr-3 text-sm text-ink-200 outline-none transition-colors placeholder:text-ink-500 focus:border-accent-500"
              placeholder="협력사명, ID, 역할 검색"
            />
          </div>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <MetricCard label="협력사" value={suppliers.length} />
            <MetricCard label="조달품목" value={products.length} />
            <MetricCard label="병목" value={suppliers.reduce((sum, supplier) => sum + supplier.riskCount, 0)} tone="alert" />
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {searchedSuppliers.map(supplier => (
              <button
                key={supplier.id}
                onClick={() => handleSupplierSelect(supplier.id)}
                className={clsx(
                  'w-full rounded-sm border p-3 text-left transition-all hover:border-accent-300 hover:bg-accent-50/40',
                  supplier.id === selectedSupplier.id
                    ? 'border-accent-500 bg-accent-50 text-accent-900 shadow-control'
                    : 'border-ink-700 bg-white text-ink-200',
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{supplier.name}</div>
                    <div className="mt-1 text-xs text-ink-500">{supplier.id} · {supplier.role}</div>
                  </div>
                  <span className={clsx('rounded-full border px-2 py-0.5 text-xs font-bold', supplier.riskCount > 0 ? riskMeta.medium.badge : riskMeta.low.badge)}>
                    {supplier.riskCount > 0 ? '확인 필요' : '정상'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-ink-500">
                  <span>{supplier.country} · 품목 {supplier.itemCount}</span>
                  <span className="font-semibold text-ink-300">DPP {supplier.readiness}%</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <aside className="flex min-h-0 min-w-0 flex-col border-r border-ink-700 bg-white p-4">
          <PanelTitle
            eyebrow="2"
            title="조달 품목 선택"
            meta={selectedSupplier.id}
          />
          <div className="mb-4 rounded-sm border border-ink-700 bg-white p-4">
            <div className="text-base font-bold text-ink-100">{selectedSupplier.name}</div>
            <div className="mt-1 text-sm text-ink-500">{selectedSupplier.role} · {selectedSupplier.country}</div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <MetricCard label="품목" value={selectedSupplier.itemCount} compact />
              <MetricCard label="병목" value={selectedSupplier.riskCount} tone={selectedSupplier.riskCount > 0 ? 'alert' : 'ok'} compact />
              <MetricCard label="준비율" value={`${selectedSupplier.readiness}%`} tone="ok" compact />
            </div>
          </div>
          <div className="mb-3 flex gap-2">
            <FilterButton active={productFilter === 'all'} onClick={() => setProductFilter('all')}>전체</FilterButton>
            <FilterButton active={productFilter === 'risk'} onClick={() => setProductFilter('risk')}>병목</FilterButton>
            <FilterButton active={productFilter === 'ready'} onClick={() => setProductFilter('ready')}>DPP 완료</FilterButton>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => handleProductSelect(product.id)}
                className={clsx(
                  'w-full rounded-sm border p-3 text-left transition-all hover:border-accent-300 hover:bg-accent-50/40',
                  product.id === selectedProduct.id
                    ? 'border-accent-500 bg-accent-50 shadow-control'
                    : 'border-ink-700 bg-white',
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-ink-100">{product.name}</div>
                    <div className="mt-1 text-xs text-ink-500">{product.code} · {product.category}</div>
                  </div>
                  <span className={clsx('rounded-full border px-2 py-0.5 text-xs font-bold', product.dppStatus === 'ready' ? riskMeta.low.badge : riskMeta.medium.badge)}>
                    {product.dppStatus === 'ready' ? 'DPP 완료' : '보완 필요'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-700">
                    <div
                      className={clsx('h-full rounded-full', product.readiness >= 90 ? 'bg-emerald-600' : product.readiness >= 80 ? 'bg-amber-500' : 'bg-red-500')}
                      style={{ width: `${product.readiness}%` }}
                    />
                  </div>
                  <span className="num-mono text-xs font-bold text-ink-300">{product.readiness}%</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                  <span>담당 {product.owner}</span>
                  <span className={product.riskCount > 0 ? 'font-semibold text-red-600' : 'text-emerald-700'}>
                    병목 {product.riskCount}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-ink-700 bg-white p-4">
          <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-xs bg-accent-50 text-sm font-bold text-accent-700">3</span>
                <h2 className="text-xl font-bold text-ink-100">상위 공급망 흐름</h2>
              </div>
              <p className="mt-1 text-sm text-ink-500">{selectedProduct.name}의 DPP 제출에 연결된 소재·원산지 병목을 추적합니다.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <FilterButton active={viewMode === 'critical'} onClick={() => setViewMode('critical')}>핵심 병목</FilterButton>
              <FilterButton active={viewMode === 'all'} onClick={() => setViewMode('all')}>전체 흐름</FilterButton>
            </div>
          </div>

          <div className="mb-4 grid shrink-0 grid-cols-4 gap-2">
            <Kpi label="추적 노드" value={kpis.stages} icon={Layers} />
            <Kpi label="병목" value={kpis.blocked} icon={ShieldAlert} tone="alert" />
            <Kpi label="확인 필요" value={kpis.review} icon={Clock} tone="warn" />
            <Kpi label="DPP 준비율" value={`${kpis.readiness}%`} icon={PackageCheck} tone={kpis.readiness >= 90 ? 'ok' : 'warn'} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-sm border border-ink-700 bg-white p-4 shadow-control">
            <FlowMap
              nodes={visibleNodes}
              selectedNodeId={selectedNode.id}
              onSelect={setSelectedNodeId}
            />
          </div>
        </section>

        <aside className="flex min-h-0 min-w-0 flex-col bg-white p-4">
          <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-xs bg-accent-50 text-sm font-bold text-accent-700">4</span>
              <h2 className="text-lg font-bold text-ink-100">선택 노드 리스크</h2>
            </div>
            <span className={clsx('rounded-full border px-2 py-1 text-xs font-bold', riskMeta[selectedNode.riskLevel].badge)}>
              {riskMeta[selectedNode.riskLevel].label}
            </span>
          </div>

          <RiskPanel node={selectedNode} />
        </aside>
      </main>
    </div>
  );
}

function PanelTitle({ eyebrow, title, meta }: { eyebrow: string; title: string; meta: string }) {
  return (
    <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-xs bg-accent-50 text-sm font-bold text-accent-700">{eyebrow}</span>
        <h2 className="text-base font-bold text-ink-100">{title}</h2>
      </div>
      <span className="num-mono text-xs font-semibold text-ink-500">{meta}</span>
    </div>
  );
}

function ProductWorkspaceActions({ product, expansion }: { product: ProductOption; expansion: ExpansionStatus }) {
  return (
    <div className="mt-4 rounded-sm border border-ink-700 bg-ink-800 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold text-ink-500">공급망 생성 및 확장 워크스페이스</div>
          <div className="mt-1 truncate text-sm font-bold text-ink-100">{product.name} · {product.code}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-xs border border-accent-700 bg-accent-700 px-3 py-2 text-xs font-bold text-white hover:bg-accent-600">
            <Box className="h-3.5 w-3.5" />
            맵 생성
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-bold text-ink-300 hover:bg-white/90">
            <Send className="h-3.5 w-3.5" />
            공급망 요청 발송
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-xs border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            <Target className="h-3.5 w-3.5" />
            공급망 완성도 {expansion.completeness}%
          </span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <ExpansionMetric label="Tier1 등록" done={expansion.tier1Registered} total={expansion.tier1Total} />
        <ExpansionMetric label="Tier2 등록" done={expansion.tier2Registered} total={expansion.tier2Total} />
        <ExpansionMetric label="Tier3 등록" done={expansion.tier3Registered} total={expansion.tier3Total} />
        <div className="rounded-xs border border-ink-700 bg-white p-2">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-bold text-ink-500">확장 현황</span>
            <span className="num-mono font-bold text-accent-700">{expansion.completeness}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-700">
            <div className="h-full rounded-full bg-accent-700" style={{ width: `${expansion.completeness}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpansionMetric({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="rounded-xs border border-ink-700 bg-white p-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-bold text-ink-500">{label}</span>
        <span className="num-mono font-bold text-ink-100">{done} / {total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-700">
        <div className={clsx('h-full rounded-full', pct >= 100 ? 'bg-emerald-600' : pct > 0 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = 'neutral',
  compact,
}: {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'ok' | 'alert';
  compact?: boolean;
}) {
  return (
    <div className={clsx(
      'rounded-sm border p-2 text-center',
      tone === 'alert' ? 'border-red-100 bg-red-50' : tone === 'ok' ? 'border-emerald-100 bg-emerald-50' : 'border-ink-700 bg-ink-800',
    )}>
      <div className={clsx('num-mono font-bold', compact ? 'text-base' : 'text-xl', tone === 'alert' ? 'text-red-700' : tone === 'ok' ? 'text-emerald-700' : 'text-ink-100')}>
        {value}
      </div>
      <div className={clsx('mt-0.5 text-xs', tone === 'alert' ? 'text-red-500' : tone === 'ok' ? 'text-emerald-700' : 'text-ink-500')}>
        {label}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex min-w-[88px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xs border px-3 py-2 text-xs font-bold transition-colors',
        active
          ? 'border-ink-100 bg-ink-100 text-white'
          : 'border-ink-700 bg-white text-ink-400 hover:bg-ink-800 hover:text-ink-100',
      )}
    >
      <Filter className="h-3 w-3 shrink-0" />
      {children}
    </button>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  icon: typeof Layers;
  tone?: 'neutral' | 'warn' | 'alert' | 'ok';
}) {
  return (
    <div className="rounded-sm border border-ink-700 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-ink-500">
        <span className="whitespace-nowrap">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className={clsx(
        'num-mono text-2xl font-bold',
        tone === 'alert' && 'text-red-700',
        tone === 'warn' && 'text-amber-700',
        tone === 'ok' && 'text-emerald-700',
        tone === 'neutral' && 'text-ink-100',
      )}>
        {value}
      </div>
    </div>
  );
}

function FlowMap({
  nodes,
  selectedNodeId,
  onSelect,
}: {
  nodes: SupplyNode[];
  selectedNodeId: string;
  onSelect: (nodeId: string) => void;
}) {
  const grouped = (['product', 'component', 'material', 'origin'] as SupplyNode['stage'][]).map(stage => ({
    stage,
    nodes: nodes.filter(node => node.stage === stage),
  })).filter(group => group.nodes.length > 0);

  return (
    <div className="w-full">
      <div className="space-y-3">
        {grouped.map((group, groupIndex) => {
          const meta = stageMeta[group.stage];
          return (
            <div key={group.stage} className="relative">
              {groupIndex > 0 && (
                <div className="mx-auto mb-2 h-4 w-px bg-ink-600" />
              )}
              <div className={clsx('mx-auto mb-2 max-w-[220px] rounded-sm border px-2 py-1.5 text-center text-sm font-bold', meta.bg, meta.border, meta.accent)}>
                {meta.label}
              </div>
              <div className={clsx(
                'grid justify-center gap-2',
                group.nodes.length === 1
                  ? 'grid-cols-[220px]'
                  : 'grid-cols-[repeat(2,220px)]',
              )}>
                {group.nodes.map(node => (
                  <FlowNodeCard
                    key={node.id}
                    node={node}
                    selected={node.id === selectedNodeId}
                    onClick={() => onSelect(node.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowNodeCard({
  node,
  selected,
  onClick,
}: {
  node: SupplyNode;
  selected: boolean;
  onClick: () => void;
}) {
  const status = statusMeta[node.status];
  const StatusIcon = status.icon;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'group min-h-[116px] w-[220px] rounded-sm border bg-white p-2.5 text-left shadow-control transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-panel',
        selected ? clsx('ring-2 ring-accent-500/20', status.ring) : 'border-ink-700',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="shrink-0 whitespace-nowrap rounded-xs border border-ink-700 bg-ink-800 px-2 py-0.5 text-xs font-bold text-ink-400">
          {node.tier}
        </span>
        <span className={clsx('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold', status.badge)}>
          <StatusIcon className="h-3 w-3 shrink-0" />
          {status.label}
        </span>
      </div>
      <div className="text-sm font-bold leading-5 text-ink-100">{node.title}</div>
      <div className="mt-1 line-clamp-2 text-xs leading-4 text-ink-500">{node.subtitle}</div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-ink-700 pt-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-ink-500">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{node.country} · {node.supplier}</span>
        </span>
        <ChevronRight className={clsx('h-4 w-4 shrink-0 transition-colors', selected ? 'text-accent-600' : 'text-ink-500 group-hover:text-accent-600')} />
      </div>
    </button>
  );
}

function RiskPanel({ node }: { node: SupplyNode }) {
  const StatusIcon = statusMeta[node.status].icon;
  const inputCompleted = node.inputCompleted ?? node.status !== 'blocked';
  const downstreamRegistered = node.downstreamRegistered ?? (node.stage === 'product' || node.status === 'ready');
  const requestLabel = node.stage === 'product' || node.stage === 'component' ? '2차 공급망 요청' : '3차 공급망 요청';

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="rounded-sm border border-ink-700 bg-white p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border', statusMeta[node.status].badge)}>
            <StatusIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-ink-100">{node.title}</div>
            <div className="mt-1 text-sm text-ink-500">{node.tier} · {node.subtitle}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <InfoPill icon={Factory} label="담당 공급사" value={node.supplier} />
          <InfoPill icon={MapPin} label="국가" value={node.country} />
          <InfoPill icon={Clock} label="기한" value={node.due} />
          <InfoPill icon={Target} label="담당" value={node.owner} />
        </div>
      </div>

      <PanelSection title="공급망 확장 상태" icon={Target}>
        <div className="space-y-2">
          <WorkflowStatusRow label="현재 상태" value={inputCompleted ? '입력 완료' : '입력 필요'} tone={inputCompleted ? 'ok' : 'warn'} />
          <WorkflowStatusRow label="하위 공급망" value={downstreamRegistered ? '등록 완료' : '미등록'} tone={downstreamRegistered ? 'ok' : 'alert'} />
        </div>
        {!downstreamRegistered && (
          <button className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xs border border-accent-700 bg-accent-700 px-3 py-2 text-sm font-bold text-white hover:bg-accent-600">
            <Send className="h-4 w-4" />
            {requestLabel}
          </button>
        )}
        {downstreamRegistered && (
          <div className="mt-3 rounded-xs border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            하위 공급망 등록 흐름이 열려 있습니다.
          </div>
        )}
      </PanelSection>

      <PanelSection title="DPP 영향" icon={ShieldAlert}>
        <p className="text-sm leading-6 text-ink-300">{node.dppImpact}</p>
      </PanelSection>

      <PanelSection title="리스크 사유" icon={AlertTriangle}>
        <div className="space-y-2">
          {node.risks.map(risk => (
            <div key={risk} className="flex items-start gap-2 rounded-sm border border-red-100 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {risk}
            </div>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="보완 필요 증빙" icon={PackageCheck}>
        <div className="space-y-2">
          {node.evidence.map(item => (
            <div key={item} className="flex items-center gap-2 rounded-sm border border-ink-700 bg-white px-3 py-2 text-sm text-ink-300">
              <CheckCircle2 className={clsx('h-4 w-4 shrink-0', node.status === 'ready' ? 'text-emerald-600' : 'text-ink-500')} />
              {item}
            </div>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="다음 조치" icon={Send}>
        <div className="rounded-sm border border-accent-100 bg-accent-50 p-3 text-sm leading-6 text-accent-900">
          {node.nextAction}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="inline-flex items-center justify-center gap-1.5 rounded-xs border border-accent-700 bg-accent-700 px-3 py-2 text-sm font-bold text-white hover:bg-accent-600">
            <Send className="h-4 w-4" />
            요청 생성
          </button>
          <button className="inline-flex items-center justify-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-sm font-bold text-ink-300 hover:bg-ink-800">
            <Clock className="h-4 w-4" />
            기한 조정
          </button>
        </div>
      </PanelSection>

      <PanelSection title="연결 페이지" icon={ExternalLink}>
        <div className="space-y-2">
          {node.links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between rounded-sm border border-ink-700 bg-white px-3 py-2 text-sm font-semibold text-ink-300 hover:bg-ink-800 hover:text-ink-100"
            >
              {link.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      </PanelSection>
    </div>
  );
}

function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Factory;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-sm border border-ink-700 bg-ink-800 p-2">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-ink-500">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="truncate text-sm font-bold text-ink-100">{value}</div>
    </div>
  );
}

function WorkflowStatusRow({ label, value, tone }: { label: string; value: string; tone: 'ok' | 'warn' | 'alert' }) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-ink-700 bg-white px-3 py-2">
      <span className="text-sm font-semibold text-ink-500">{label}</span>
      <span className={clsx(
        'rounded-full border px-2 py-1 text-xs font-bold',
        tone === 'ok' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-700',
        tone === 'alert' && 'border-red-200 bg-red-50 text-red-700',
      )}>
        {value}
      </span>
    </div>
  );
}

function PanelSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof ShieldAlert;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-sm border border-ink-700 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent-700" />
        <h3 className="text-base font-bold text-ink-100">{title}</h3>
      </div>
      {children}
    </section>
  );
}
