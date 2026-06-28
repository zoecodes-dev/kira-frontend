// 공급망 맵 허브와 협력사 포털이 공유하는 제품/BOM/공급망 mock 데이터·타입·순수 헬퍼 모듈
// (제품/BOM/맵엣지/비율은 백엔드 엔드포인트가 없어 로컬 mock 으로 유지한다. 협력사 상세는 lib/api 사용.)
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import type { ApiProduct, ApiProductBom, ApiBomVersionListItem, ApiProductSupplyChainMap } from '@/lib/api';

export type RiskStatus = 'verified' | 'watch' | 'high' | 'feoc_review' | 'audit_required';
export type PartKind = 'component' | 'material' | 'mineral';
export type NodeType = 'product' | 'part' | 'material' | 'supplier';

export interface Product {
  product_id: string;
  product_code: string;
  product_name: string;
  manufacturer_id: string;
  // 고객사 — 제품이 속한 고객사(제품→고객사 관계). 공급망 묶음 키·표시에 사용. 미연동 시 빈 값.
  customer_id: string;
  customer_name: string;
  type: string;
  specs: {
    capacity: string;
    shipment_info: string;
    mineral_composition: string;
    hazardous_substances: string;
    regulation_status: RiskStatus;
  };
  source_system: string;
  external_id: string;
  synced_at: string;
}

export interface BomVersion {
  bom_version_id: string;
  product_id: string;
  version_number: string;
  effective_from: string;
  effective_to: string | null;
  status: 'draft' | 'active' | 'deprecated';
  source_system: string;
}

export interface Part {
  part_id: string;
  part_code: string;
  part_name: string;
  tier_level: number;
  parent_part_id: string | null;
  material_type: string;
  function_purpose: string;
  purchase_unit: string;
  kind: PartKind;
}

export interface BomItem {
  bom_item_id: string;
  bom_version_id: string;
  part_id: string;
  required_quantity: number;
  required_quantity_unit: string;
  percentage: number;
  origin_country: string;
}

export interface MockSupplier {
  supplier_id: string;
  company_name: string;
  company_name_en: string;
  provider_type: 'manufacturer' | 'recycler' | 'trader' | 'miner';
  tier: number;
  parent_supplier_id: string | null;
  status: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  feoc_status: 'eligible' | 'ineligible' | 'under_review' | 'unknown';
  latest_audit_result: string;
  // 협력사 입력 완성도(0~100). §10.2a completenessScore. 공급망 진행 상태 판정에 사용.
  completeness_score?: number;
}

export interface MockSupplierFactory {
  factory_id: string;
  supplier_id: string;
  factory_name: string;
  factory_name_en: string;
  country: string;
  region: string;
  factory_role: 'headquarters' | 'production' | 'outsourcing' | 'processing' | 'mining';
  destination: 'EU' | 'US' | 'KR' | 'BOTH';
}

export interface SupplyChainMapRow {
  map_id: string;
  bom_version_id: string;
  parent_supplier_id: string;
  child_supplier_id: string;
  part_id: string;
  hop_level?: number | null; // 이 엣지(노드 연결)의 차수 — 겸업 시 노드별 tier 분리용(같은 협력사라도 hop마다 다름)
  po_number: string;
  invoice_number: string;
  supply_period_from: string;
  supply_period_to: string;
  link_status: 'supplychain_declared' | 'supplychain_confirmed';
  source_system: 'ERP' | 'SUPPLIER_DECLARED';
  verification_status: 'unverified' | 'verified';
  // 맵 노드 생성 시각(§10.2a). 갱신일 롤업에 사용. 미노출 백엔드/데모면 빈 값.
  created_at?: string;
}

export interface SupplyChainRatio {
  ratio_id: string;
  map_id: string;
  factory_id: string;
  ratio_percentage: number;
  volume: number;
}

export interface TraceRow {
  node_key: string;
  node_type: NodeType;
  stage: 'bom' | 'material' | 'supplier';
  depth: 0 | 1 | 2;
  tier: string;
  part_id: string;
  part_name: string;
  part_code: string;
  material_or_mineral: string;
  bom_percentage: number;
  mineral_ratio: number;
  supplier_id: string;
  supplier_name: string;
  factory_id: string;
  factory_name: string;
  country: string;
  po_number: string;
  supply_period: string;
  supply_ratio: number;
  risk_status: RiskStatus;
  description: string;
  feoc_status: MockSupplier['feoc_status'];
  risk_level: MockSupplier['risk_level'];
  latest_audit_result: string;
  provider_type: MockSupplier['provider_type'];
  factory_region: string;
  applicable_rules: string;
  missing_documents: string;
  certificate_status: string;
  verification_progress: string;
  connected_products: string;
  bom_version: string;
}

export type SelectedNode =
  | { type: 'product'; key: string; product: Product; bomVersion: BomVersion; rows: TraceRow[] }
  | { type: 'part'; key: string; row: TraceRow }
  | { type: 'material'; key: string; row: TraceRow }
  | { type: 'supplier'; key: string; row: TraceRow };

export interface ExplorerNode {
  key: string;
  label: string;
  meta: string;
  type: 'product' | 'part' | 'material';
  row?: TraceRow;
  depth: number;
  status: RiskStatus;
  tier: string;
  supplierName: string;
  country: string;
  providerType: string;
  mineralName: string;
  supplyRatio: string;
  verificationProgress: string;
  children: ExplorerNode[];
}

// 트리 엔진(buildTraceRows/buildExplorerTree)이 주입받는 데이터 묶음.
// 빈 상태(emptyDataset) / API 조회 / 데모(mockDataset) 어느 쪽이든 같은 형태로 주입된다.
export interface SupplyChainDataset {
  products: Product[];
  bom_versions: BomVersion[];
  parts: Part[];
  bom_items: BomItem[];
  suppliers: MockSupplier[];
  supplier_factories: MockSupplierFactory[];
  supply_chain_map: SupplyChainMapRow[];
  supply_chain_ratios: SupplyChainRatio[];
}

export const products: Product[] = [
  {
    product_id: 'prod-bat-ncm811',
    product_code: 'BAT-NCM811-100Ah',
    product_name: '배터리 셀 A',
    manufacturer_id: 'sup-hanyang-cell',
    customer_id: 'cust-eu-a',
    customer_name: '고객사 A (EU)',
    type: 'battery_cell',
    specs: {
      capacity: '100Ah / 3.7V',
      shipment_info: '2026-05 출고 LOT / F-003 Cell Line / EU 제출 대상',
      mineral_composition: 'Ni 21.6%, Co 12.8%, Li 8.4%',
      hazardous_substances: 'SVHC 기준 초과 없음 / CoSO4 별도 실사 필요',
      regulation_status: 'feoc_review',
    },
    source_system: 'ERP_PLM',
    external_id: 'ERP-PROD-2026-04982',
    synced_at: '2026-06-05T09:20:00+09:00',
  },
  {
    product_id: 'prod-bat-lfp120',
    product_code: 'BAT-LFP-120Ah',
    product_name: 'LFP Power 120Ah',
    manufacturer_id: 'sup-hanyang-cell',
    customer_id: 'cust-us-b',
    customer_name: '고객사 B (US)',
    type: 'battery_cell',
    specs: {
      capacity: '120Ah / 3.2V',
      shipment_info: '2026-05 출고 LOT / F-002 Cell Line / EU 제출 대상',
      mineral_composition: 'Li 9.0%, Fe 18.2%, P 6.1%',
      hazardous_substances: 'SVHC 기준 초과 없음',
      regulation_status: 'verified',
    },
    source_system: 'ERP_PLM',
    external_id: 'ERP-PROD-2026-04980',
    synced_at: '2026-06-05T09:20:00+09:00',
  },
];

export const bom_versions: BomVersion[] = [
  {
    bom_version_id: 'bomv-ncm811-v32',
    product_id: 'prod-bat-ncm811',
    version_number: 'v3.2',
    effective_from: '2026-05-01',
    effective_to: null,
    status: 'active',
    source_system: 'ERP_PLM',
  },
  {
    bom_version_id: 'bomv-ncm811-v31',
    product_id: 'prod-bat-ncm811',
    version_number: 'v3.1',
    effective_from: '2026-03-01',
    effective_to: '2026-04-30',
    status: 'deprecated',
    source_system: 'ERP_PLM',
  },
  {
    bom_version_id: 'bomv-lfp120-v20',
    product_id: 'prod-bat-lfp120',
    version_number: 'v2.0',
    effective_from: '2026-05-01',
    effective_to: null,
    status: 'active',
    source_system: 'ERP_PLM',
  },
];

export const parts: Part[] = [
  {
    part_id: 'part-cell-module',
    part_code: 'BOM-CELL-MODULE',
    part_name: 'Battery Cell Module',
    tier_level: 1,
    parent_part_id: null,
    material_type: 'Cell assembly',
    function_purpose: '전지 셀 구성 모듈',
    purchase_unit: 'EA',
    kind: 'component',
  },
  {
    part_id: 'part-cathode',
    part_code: 'CAM-4420',
    part_name: 'Cathode Active Material',
    tier_level: 1,
    parent_part_id: 'part-cell-module',
    material_type: '양극재',
    function_purpose: 'NCM811 양극 활물질',
    purchase_unit: 'kg',
    kind: 'component',
  },
  {
    part_id: 'part-lioh',
    part_code: 'LI-2201',
    part_name: 'Lithium Hydroxide',
    tier_level: 2,
    parent_part_id: 'part-cathode',
    material_type: 'Lithium',
    function_purpose: '양극재 하위 리튬 원재료',
    purchase_unit: 'kg',
    kind: 'material',
  },
  {
    part_id: 'part-coso4',
    part_code: 'CO-2281',
    part_name: 'Cobalt Sulfate',
    tier_level: 2,
    parent_part_id: 'part-cathode',
    material_type: 'Cobalt',
    function_purpose: '양극재 하위 코발트 원재료',
    purchase_unit: 'kg',
    kind: 'material',
  },
  {
    part_id: 'part-cobalt-ore',
    part_code: 'ORE-CO-01',
    part_name: 'Cobalt Ore',
    tier_level: 5,
    parent_part_id: 'part-coso4',
    material_type: 'Cobalt mineral',
    function_purpose: '코발트 황산염의 광산 원료',
    purchase_unit: 't',
    kind: 'mineral',
  },
  {
    part_id: 'part-nickel',
    part_code: 'NI-1190',
    part_name: 'Nickel Sulfate',
    tier_level: 2,
    parent_part_id: 'part-cathode',
    material_type: 'Nickel',
    function_purpose: '양극재 하위 니켈 원재료',
    purchase_unit: 'kg',
    kind: 'material',
  },
];

export const bom_items: BomItem[] = [
  { bom_item_id: 'bomi-cell-module', bom_version_id: 'bomv-ncm811-v32', part_id: 'part-cell-module', required_quantity: 1, required_quantity_unit: 'EA', percentage: 42.5, origin_country: 'KR' },
  { bom_item_id: 'bomi-cathode', bom_version_id: 'bomv-ncm811-v32', part_id: 'part-cathode', required_quantity: 128.5, required_quantity_unit: 'kg', percentage: 31.2, origin_country: 'KR' },
  { bom_item_id: 'bomi-lioh', bom_version_id: 'bomv-ncm811-v32', part_id: 'part-lioh', required_quantity: 10.8, required_quantity_unit: 'kg', percentage: 8.4, origin_country: 'AU' },
  { bom_item_id: 'bomi-coso4', bom_version_id: 'bomv-ncm811-v32', part_id: 'part-coso4', required_quantity: 16.4, required_quantity_unit: 'kg', percentage: 12.8, origin_country: 'CN' },
  { bom_item_id: 'bomi-cobalt-ore', bom_version_id: 'bomv-ncm811-v32', part_id: 'part-cobalt-ore', required_quantity: 0.36, required_quantity_unit: 't', percentage: 4.1, origin_country: 'CD' },
  { bom_item_id: 'bomi-nickel', bom_version_id: 'bomv-ncm811-v32', part_id: 'part-nickel', required_quantity: 27.8, required_quantity_unit: 'kg', percentage: 21.6, origin_country: 'ID' },
];

export const supplierDetailIdMap: Record<string, string> = {
  'sup-hanyang-cell': 'S-CELL-001',
  'sup-pos-cathode': 'S-CAM-001',
  'sup-pohang-refining': 'S-REF-001',
  'sup-ganzhou-rare': 'S-REF-002',
  'sup-katanga-cobalt': 'S-MINE-002',
  'sup-sulawesi-nickel': 'S-MINE-001',
};

export const suppliers: MockSupplier[] = [
  { supplier_id: 'sup-hanyang-cell', company_name: 'EcoBattery Co., Ltd.', company_name_en: 'EcoBattery Co., Ltd.', provider_type: 'manufacturer', tier: 1, parent_supplier_id: null, status: 'supplier_verified', risk_level: 'low', feoc_status: 'eligible', latest_audit_result: '2026-05 문서 검토 완료' },
  { supplier_id: 'sup-pos-cathode', company_name: 'Eco Materials Co., Ltd.', company_name_en: 'Eco Materials Co., Ltd.', provider_type: 'manufacturer', tier: 2, parent_supplier_id: 'sup-hanyang-cell', status: 'supplier_verified', risk_level: 'low', feoc_status: 'eligible', latest_audit_result: '2026-05 현장 실사 적합' },
  { supplier_id: 'sup-pohang-refining', company_name: 'Livent Corporation', company_name_en: 'Livent Corporation', provider_type: 'manufacturer', tier: 3, parent_supplier_id: 'sup-pos-cathode', status: 'supplier_verified', risk_level: 'low', feoc_status: 'eligible', latest_audit_result: '2026-04 RMI 증빙 확인' },
  { supplier_id: 'sup-ganzhou-rare', company_name: 'Zhejiang Cobalt Co., Ltd.', company_name_en: 'Zhejiang Cobalt Co., Ltd.', provider_type: 'manufacturer', tier: 3, parent_supplier_id: 'sup-pos-cathode', status: 'supplier_requested', risk_level: 'high', feoc_status: 'under_review', latest_audit_result: 'FEOC 소유구조 보완 요청' },
  { supplier_id: 'sup-katanga-cobalt', company_name: 'DRC Mining Co.', company_name_en: 'DRC Mining Co.', provider_type: 'miner', tier: 4, parent_supplier_id: 'sup-ganzhou-rare', status: 'supplier_review', risk_level: 'critical', feoc_status: 'unknown', latest_audit_result: '인권 실사 보고서 갱신 필요' },
  { supplier_id: 'sup-sulawesi-nickel', company_name: 'PT Vale Indonesia', company_name_en: 'PT Vale Indonesia', provider_type: 'miner', tier: 4, parent_supplier_id: 'sup-ganzhou-rare', status: 'supplier_review', risk_level: 'medium', feoc_status: 'eligible', latest_audit_result: '환경 인증 유효기간 확인 필요' },
];

export const supplier_factories: MockSupplierFactory[] = [
  { factory_id: 'fac-hanyang-f003', supplier_id: 'sup-hanyang-cell', factory_name: 'F-003 Cell Line', factory_name_en: 'F-003 Cell Line', country: 'KR', region: 'Cheongju', factory_role: 'production', destination: 'BOTH' },
  { factory_id: 'fac-pos-cathode-gwangyang', supplier_id: 'sup-pos-cathode', factory_name: 'Gwangyang Cathode Plant', factory_name_en: 'Gwangyang Cathode Plant', country: 'KR', region: 'Gwangyang', factory_role: 'production', destination: 'BOTH' },
  { factory_id: 'fac-pohang-refining', supplier_id: 'sup-pohang-refining', factory_name: 'Pohang Refining Works', factory_name_en: 'Pohang Refining Works', country: 'AU', region: 'Pilbara', factory_role: 'processing', destination: 'EU' },
  { factory_id: 'fac-ganzhou-processing', supplier_id: 'sup-ganzhou-rare', factory_name: 'Ganzhou Processing Plant', factory_name_en: 'Ganzhou Processing Plant', country: 'CN', region: 'Ganzhou', factory_role: 'processing', destination: 'US' },
  { factory_id: 'fac-katanga-mine', supplier_id: 'sup-katanga-cobalt', factory_name: 'Katanga Cobalt Mine', factory_name_en: 'Katanga Cobalt Mine', country: 'CD', region: 'Katanga', factory_role: 'mining', destination: 'EU' },
  { factory_id: 'fac-sulawesi-mine', supplier_id: 'sup-sulawesi-nickel', factory_name: 'Sulawesi Nickel Mine', factory_name_en: 'Sulawesi Nickel Mine', country: 'ID', region: 'Sulawesi', factory_role: 'mining', destination: 'EU' },
];

export const supply_chain_map: SupplyChainMapRow[] = [
  { map_id: 'map-cell-module', bom_version_id: 'bomv-ncm811-v32', parent_supplier_id: 'sup-hanyang-cell', child_supplier_id: 'sup-hanyang-cell', part_id: 'part-cell-module', po_number: 'PO-2026-0521', invoice_number: 'INV-2026-0521', supply_period_from: '2026-05-01', supply_period_to: '2026-05-31', link_status: 'supplychain_confirmed', source_system: 'ERP', verification_status: 'verified' },
  { map_id: 'map-cathode', bom_version_id: 'bomv-ncm811-v32', parent_supplier_id: 'sup-hanyang-cell', child_supplier_id: 'sup-pos-cathode', part_id: 'part-cathode', po_number: 'PO-2026-0520', invoice_number: 'INV-2026-0520', supply_period_from: '2026-05-01', supply_period_to: '2026-05-31', link_status: 'supplychain_confirmed', source_system: 'ERP', verification_status: 'verified' },
  { map_id: 'map-lioh', bom_version_id: 'bomv-ncm811-v32', parent_supplier_id: 'sup-pos-cathode', child_supplier_id: 'sup-pohang-refining', part_id: 'part-lioh', po_number: 'PO-2026-0508', invoice_number: 'INV-2026-0508', supply_period_from: '2026-05-01', supply_period_to: '2026-05-31', link_status: 'supplychain_confirmed', source_system: 'ERP', verification_status: 'verified' },
  { map_id: 'map-coso4', bom_version_id: 'bomv-ncm811-v32', parent_supplier_id: 'sup-pos-cathode', child_supplier_id: 'sup-ganzhou-rare', part_id: 'part-coso4', po_number: 'PO-2026-0512', invoice_number: 'INV-2026-0512', supply_period_from: '2026-05-01', supply_period_to: '2026-05-31', link_status: 'supplychain_declared', source_system: 'SUPPLIER_DECLARED', verification_status: 'unverified' },
  { map_id: 'map-cobalt-ore', bom_version_id: 'bomv-ncm811-v32', parent_supplier_id: 'sup-ganzhou-rare', child_supplier_id: 'sup-katanga-cobalt', part_id: 'part-cobalt-ore', po_number: 'PO-2026-0503', invoice_number: 'INV-2026-0503', supply_period_from: '2026-05-01', supply_period_to: '2026-05-31', link_status: 'supplychain_declared', source_system: 'SUPPLIER_DECLARED', verification_status: 'unverified' },
  { map_id: 'map-nickel', bom_version_id: 'bomv-ncm811-v32', parent_supplier_id: 'sup-pos-cathode', child_supplier_id: 'sup-sulawesi-nickel', part_id: 'part-nickel', po_number: 'PO-2026-0508', invoice_number: 'INV-2026-0508-NI', supply_period_from: '2026-05-01', supply_period_to: '2026-05-31', link_status: 'supplychain_declared', source_system: 'SUPPLIER_DECLARED', verification_status: 'unverified' },
];

export const supply_chain_ratios: SupplyChainRatio[] = [
  { ratio_id: 'ratio-cell-module', map_id: 'map-cell-module', factory_id: 'fac-hanyang-f003', ratio_percentage: 100, volume: 48 },
  { ratio_id: 'ratio-cathode', map_id: 'map-cathode', factory_id: 'fac-pos-cathode-gwangyang', ratio_percentage: 100, volume: 128.5 },
  { ratio_id: 'ratio-lioh', map_id: 'map-lioh', factory_id: 'fac-pohang-refining', ratio_percentage: 100, volume: 10.8 },
  { ratio_id: 'ratio-coso4', map_id: 'map-coso4', factory_id: 'fac-ganzhou-processing', ratio_percentage: 64, volume: 10.5 },
  { ratio_id: 'ratio-cobalt-ore', map_id: 'map-cobalt-ore', factory_id: 'fac-katanga-mine', ratio_percentage: 36, volume: 0.36 },
  { ratio_id: 'ratio-nickel', map_id: 'map-nickel', factory_id: 'fac-sulawesi-mine', ratio_percentage: 100, volume: 27.8 },
];

export const statusMeta: Record<RiskStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  verified: { label: '검증완료', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
  watch: { label: '주의', className: 'border-amber-200 bg-amber-50 text-amber-700', Icon: Clock },
  high: { label: '고위험', className: 'border-red-200 bg-red-50 text-red-700', Icon: AlertTriangle },
  feoc_review: { label: 'FEOC 검토', className: 'border-red-200 bg-red-50 text-red-700', Icon: ShieldAlert },
  audit_required: { label: '실사 필요', className: 'border-red-200 bg-red-50 text-red-700', Icon: AlertTriangle },
};

export function getRiskTone(status: RiskStatus): 'normal' | 'warning' | 'danger' {
  if (status === 'high' || status === 'feoc_review' || status === 'audit_required') return 'danger';
  if (status === 'watch') return 'warning';
  return 'normal';
}

export function getToneClasses(tone: 'normal' | 'warning' | 'danger') {
  if (tone === 'danger') {
    return {
      border: 'border-red-300',
      bg: 'bg-red-50',
      text: 'text-red-800',
      soft: 'bg-red-50/70',
      left: 'border-l-red-600',
      ring: 'ring-red-100',
    };
  }
  if (tone === 'warning') {
    return {
      border: 'border-amber-300',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      soft: 'bg-amber-50/70',
      left: 'border-l-amber-500',
      ring: 'ring-amber-100',
    };
  }
  return {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    soft: 'bg-emerald-50/60',
    left: 'border-l-emerald-600',
    ring: 'ring-emerald-100',
  };
}

export function isFeocUnderReview(value: string) {
  return value === 'under_review' || value === 'ineligible' || value === 'violation' || value === 'blocked';
}

export function getRiskStatus(supplier: MockSupplier, mapRow: SupplyChainMapRow): RiskStatus {
  if (supplier.feoc_status === 'under_review') return 'feoc_review';
  if (supplier.risk_level === 'critical') return 'audit_required';
  if (supplier.risk_level === 'high') return 'high';
  if (supplier.risk_level === 'medium' || mapRow.verification_status === 'unverified') return 'watch';
  return 'verified';
}

export function getStage(part: Part): TraceRow['stage'] {
  if (part.kind === 'component') return 'bom';
  if (part.kind === 'mineral' || part.tier_level >= 5) return 'supplier';
  return 'material';
}

export function getNodeType(part: Part): NodeType {
  if (part.kind === 'component') return 'part';
  return 'material';
}

export function getDepth(part: Part): TraceRow['depth'] {
  if (part.tier_level <= 1) return 0;
  if (part.tier_level <= 2) return 1;
  return 2;
}

export function getMaterialLabel(part: Part) {
  if (part.kind === 'component') return part.material_type;
  return `${part.material_type} / ${part.part_name}`;
}

export function getApplicableRules(rowStatus: RiskStatus, country: string) {
  const rules = ['EU Battery Regulation'];
  if (country === 'CN' || rowStatus === 'feoc_review') rules.push('IRA FEOC');
  if (country === 'CD') rules.push('OECD 광물 실사');
  return rules.join(', ');
}

export function getMissingDocuments(status: RiskStatus) {
  if (status === 'feoc_review') return '필수 문서 누락 2건';
  if (status === 'audit_required') return '실사 보고서 갱신 필요';
  if (status === 'watch') return '증빙 보완 1건';
  return '누락 없음';
}

export function getCertificateStatus(status: RiskStatus) {
  if (status === 'feoc_review') return '원산지/소유구조 인증서 검토 중';
  if (status === 'audit_required') return '인권 실사 인증서 만료 임박';
  if (status === 'watch') return '인증서 보완 요청';
  return '인증서 유효';
}

export function getVerificationProgress(status: RiskStatus) {
  if (status === 'verified') return '100%';
  if (status === 'watch') return '72%';
  if (status === 'feoc_review') return '48%';
  return '35%';
}

export function selectedProductIdFromBom(ds: SupplyChainDataset, bomVersionId: string) {
  return ds.bom_versions.find(version => version.bom_version_id === bomVersionId)?.product_id;
}

export function buildTraceRows(ds: SupplyChainDataset, bomVersionId: string, period: string, factoryId: string, poNumber: string): TraceRow[] {
  const [periodFrom, periodTo] = period.split(' ~ ');

  return ds.supply_chain_map
    .filter(mapRow => mapRow.bom_version_id === bomVersionId)
    .filter(mapRow => !poNumber || poNumber === 'ALL' || mapRow.po_number === poNumber)
    .filter(mapRow => {
      if (!periodFrom || !periodTo) return true;
      return mapRow.supply_period_from <= periodTo && mapRow.supply_period_to >= periodFrom;
    })
    .flatMap(mapRow => {
      const part = ds.parts.find(item => item.part_id === mapRow.part_id);
      const bomItem = ds.bom_items.find(item => item.bom_version_id === bomVersionId && item.part_id === mapRow.part_id);
      const supplier = ds.suppliers.find(item => item.supplier_id === mapRow.child_supplier_id);
      const ratios = ds.supply_chain_ratios.filter(item => item.map_id === mapRow.map_id);

      if (!part || !supplier || !bomItem) return [];

      // ratio/factory 시드가 희박해도(맵 노드 6개에 ratio 1개 등) 맵 노드당 최소 1행 생성 —
      // 협력사 노드가 트리에 떠야 STEP 4(노드 클릭) 동작. factory는 없으면 placeholder.
      const effectiveRatios = ratios.length
        ? ratios.filter(ratio => !factoryId || factoryId === 'ALL' || ratio.factory_id === factoryId)
        : [{ ratio_id: `${mapRow.map_id}:na`, map_id: mapRow.map_id, factory_id: '', ratio_percentage: 0, volume: 0 }];

      return effectiveRatios
        .flatMap(ratio => {
          const factory = ds.supplier_factories.find(item => item.factory_id === ratio.factory_id) ?? {
            factory_id: ratio.factory_id || '',
            factory_name: '-',
            factory_name_en: '',
            country: '',
            region: '',
            factory_role: FACTORY_ROLE_FALLBACK,
            destination: 'EU' as const,
          };
          const riskStatus = getRiskStatus(supplier, mapRow);
          const country = factory.country || bomItem.origin_country;
          const bomVersion = ds.bom_versions.find(version => version.bom_version_id === bomVersionId);

          return [{
            node_key: `${getNodeType(part)}:${mapRow.map_id}:${ratio.factory_id}`,
            node_type: getNodeType(part),
            stage: getStage(part),
            depth: getDepth(part),
            // 노드별 차수 — 이 엣지의 hop_level 우선(겸업 시 같은 협력사도 노드마다 다름), 없으면 supplier.tier(mock).
            tier: `Tier ${mapRow.hop_level ?? supplier.tier}`,
            part_id: part.part_id,
            part_name: part.part_name,
            part_code: part.part_code,
            material_or_mineral: getMaterialLabel(part),
            bom_percentage: bomItem.percentage,
            mineral_ratio: part.kind === 'component' ? 0 : bomItem.percentage,
            supplier_id: supplier.supplier_id,
            supplier_name: supplier.company_name,
            factory_id: factory.factory_id,
            factory_name: factory.factory_name,
            country,
            po_number: mapRow.po_number,
            supply_period: `${mapRow.supply_period_from} ~ ${mapRow.supply_period_to}`,
            supply_ratio: ratio.ratio_percentage,
            risk_status: riskStatus,
            description: `${part.function_purpose} / ${bomItem.required_quantity}${bomItem.required_quantity_unit} / BOM ${bomItem.percentage}%`,
            feoc_status: supplier.feoc_status,
            risk_level: supplier.risk_level,
            latest_audit_result: supplier.latest_audit_result,
            provider_type: supplier.provider_type,
            factory_region: factory.region,
            applicable_rules: getApplicableRules(riskStatus, country),
            missing_documents: getMissingDocuments(riskStatus),
            certificate_status: getCertificateStatus(riskStatus),
            verification_progress: getVerificationProgress(riskStatus),
            connected_products: ds.products
              .filter(product => product.product_id === selectedProductIdFromBom(ds, bomVersionId))
              .map(product => product.product_name)
              .join(', '),
            bom_version: bomVersion?.version_number ?? bomVersionId,
          }];
        });
    })
    // 차수(tier) 오름차순 — "제출 데이터 확인" 표·CSV가 Pack(0)→…→광산 순으로 보이게.
    // tier는 "Tier N"(hop_level 기반) 문자열이라 숫자만 추출해 정렬(없으면 뒤로).
    .sort((a, b) => {
      const tierNum = (r: TraceRow) => {
        const n = parseInt(String(r.tier).replace(/[^0-9]/g, ''), 10);
        return Number.isNaN(n) ? 99 : n;
      };
      return tierNum(a) - tierNum(b) || a.depth - b.depth || a.part_name.localeCompare(b.part_name);
    });
}

export function getSelectedNode(key: string, product: Product, bomVersion: BomVersion, rows: TraceRow[]): SelectedNode {
  if (key === `product:${product.product_id}`) {
    return { type: 'product', key, product, bomVersion, rows };
  }

  const supplierKey = key.startsWith('supplier:') ? key.replace('supplier:', '') : '';
  const row = rows.find(item => item.node_key === (supplierKey || key)) ?? rows[0];
  if (!row) return { type: 'product', key: `product:${product.product_id}`, product, bomVersion, rows };
  if (supplierKey) return { type: 'supplier', key, row };
  if (row.node_type === 'supplier') return { type: 'supplier', key: row.node_key, row };
  if (row.node_type === 'material') return { type: 'material', key: row.node_key, row };
  return { type: 'part', key: row.node_key, row };
}

export function getInvitationContext(node: SelectedNode) {
  if (node.type === 'product') {
    const row = node.rows[0];
    return {
      nodeType: 'product',
      nodeLabel: node.product.product_name,
      itemName: node.product.product_name,
      supplierName: row?.supplier_name ?? '1차 협력사',
    };
  }

  return {
    nodeType: node.type,
    nodeLabel: node.row.part_name,
    itemName: node.row.part_name,
    supplierName: node.row.supplier_name,
  };
}

export function buildExplorerTree(ds: SupplyChainDataset, product: Product, bomVersion: BomVersion, rows: TraceRow[]): ExplorerNode {
  const rowsByPartId = new Map<string, TraceRow>();
  rows.forEach(row => {
    if (!rowsByPartId.has(row.part_id)) rowsByPartId.set(row.part_id, row);
  });

  // 형제 노드 정렬 키 = 차수(tier) 오름차순. "Tier N"/part.tier_level에서 숫자 추출(없으면 큰 값=뒤로).
  const tierOrder = (row: TraceRow): number => {
    const fromTier = parseInt(String(row.tier).replace(/[^0-9]/g, ''), 10);
    if (!Number.isNaN(fromTier)) return fromTier;
    const t = ds.parts.find(p => p.part_id === row.part_id)?.tier_level;
    return typeof t === 'number' ? t : 99;
  };
  const byTier = (a: TraceRow, b: TraceRow) => tierOrder(a) - tierOrder(b) || a.part_name.localeCompare(b.part_name);

  function buildPartNode(row: TraceRow, depth: number): ExplorerNode {
    const part = ds.parts.find(item => item.part_id === row.part_id);
    const childPartNodes = ds.parts
      .filter(item => item.parent_part_id === row.part_id)
      .map(item => rowsByPartId.get(item.part_id))
      .filter((item): item is TraceRow => Boolean(item))
      .sort(byTier)
      .map(childRow => buildPartNode(childRow, depth + 1));

    return {
      key: row.node_key,
      label: row.part_name,
      meta: part?.kind === 'component' ? row.part_code : row.material_or_mineral,
      type: row.node_type === 'part' ? 'part' : 'material',
      row,
      depth,
      status: row.risk_status,
      tier: row.tier,
      supplierName: row.supplier_name,
      country: row.country,
      providerType: row.provider_type,
      mineralName: row.node_type === 'material' ? row.material_or_mineral : row.part_code,
      supplyRatio: `${row.supply_ratio}%`,
      verificationProgress: row.verification_progress,
      children: childPartNodes,
    };
  }

  // 제품 직속 = 최상위 부품. forest 루트 판정:
  //  - parent_part_id가 null이거나
  //  - 부모가 이 부품집합에 없거나(BOM 밖)
  //  - 부모가 부품집합엔 있어도 맵 엣지가 없어 row가 없는 경우(렌더 불가 → 자식이 매달릴 곳이 없음).
  // 마지막 조건이 없으면, 맵에 없는 중간 부품(예: Module)을 부모로 둔 노드(Cell)와 그 이하
  // (CAM→스멜터→광산)가 통째로 누락돼 트리가 끝까지 안 내려간다.
  const partIdSet = new Set(ds.parts.map(p => p.part_id));
  const rootRows = ds.parts
    .filter(part => !part.parent_part_id || !partIdSet.has(part.parent_part_id) || !rowsByPartId.has(part.parent_part_id))
    .map(part => rowsByPartId.get(part.part_id))
    .filter((item): item is TraceRow => Boolean(item))
    .sort(byTier);
  // 실 공급망은 차수를 건너뛰어(예: Module/t1 누락) 트리가 여러 forest-root로 끊긴다.
  // 차수 오름차순으로 단일 체인 연결 → product → tier0 → … → 광산 으로 쭉 내려간다.
  // depth=i+1 로 빌드하면 root[i]를 root[i-1]의 자식으로 중첩해도 깊이가 일관된다.
  const rootNodes = rootRows.map((row, i) => buildPartNode(row, i + 1));
  for (let i = rootNodes.length - 1; i > 0; i--) {
    rootNodes[i - 1].children = [...rootNodes[i - 1].children, rootNodes[i]];
  }
  const children = rootNodes.length ? [rootNodes[0]] : [];

  return {
    key: `product:${product.product_id}`,
    label: product.product_name,
    meta: `${product.product_code} / BOM ${bomVersion.version_number}`,
    type: 'product',
    depth: 0,
    status: product.specs.regulation_status,
    tier: 'Product',
    supplierName: `${new Set(rows.map(row => row.supplier_id)).size}개 협력사`,
    country: 'KR',
    providerType: product.type,
    mineralName: product.specs.mineral_composition,
    supplyRatio: '100%',
    verificationProgress: `${Math.round((rows.filter(row => row.risk_status === 'verified').length / Math.max(rows.length, 1)) * 100)}%`,
    children,
  };
}

// ── 공급망 목록(랜딩) ──
// "지금까지 생성된 모든 공급망" = supply_chain_map 이 형성된 (제품 × BOM 버전) 단위.
// 단위기간 = BOM 버전의 생산기간(effective_from/to) — 고객사 납품기간을 생산기간으로 관리하므로
// 같은 제품이라도 생산 Lot(기간)이 다르면 별도 공급망 행이 된다(예: GLC 2024 Lot / 2025 Lot).
export type ChainRiskLevel = 'low' | 'medium' | 'high';

export interface SupplyChainSummary {
  chain_id: string;            // = bom_version_id (제품·고객사·생산기간을 함의)
  product_id: string;
  product_name: string;
  product_code: string;
  customer_id: string;
  customer_name: string;
  bom_version_id: string;
  version_number: string;
  period_from: string;         // 생산기간 시작(effective_from)
  period_to: string | null;    // 생산기간 종료(effective_to) — null 이면 진행중
  supplier_count: number;      // child_supplier_id 중복 제거 카운트
  completed_supplier_count: number; // 입력 완료(verified/completeness≥THRESHOLD) 협력사 수
  status: ChainStatus;         // 협력사 입력 완성도 기준 진행 상태
  risk_level: ChainRiskLevel;  // 묶음 내 최악 협력사 위험도 (critical/high → high)
  last_updated: string;        // 맵 노드 created_at 최신값 (없으면 생산기간 시작으로 폴백)
  map_ids: string[];
}

// 단위기간 범위 조회용 — 공급망의 생산기간 [from,to] 가 필터 [filterFrom,filterTo] 와 겹치는지.
// to 가 null(진행중)이면 열린 구간으로 본다. 필터 일부만 주어져도 동작.
export function chainOverlapsPeriod(
  chain: Pick<SupplyChainSummary, 'period_from' | 'period_to'>,
  filterFrom?: string,
  filterTo?: string,
): boolean {
  const from = chain.period_from || '0000-01-01';
  const to = chain.period_to || '9999-12-31';
  if (filterFrom && to < filterFrom) return false;
  if (filterTo && from > filterTo) return false;
  return true;
}

const CHAIN_RISK_RANK: Record<ChainRiskLevel, number> = { low: 0, medium: 1, high: 2 };

// 협력사 4단계 위험도(low/medium/high/critical) → 목록 3단계. critical 은 high 로 흡수.
export function toChainRiskLevel(level: MockSupplier['risk_level']): ChainRiskLevel {
  if (level === 'critical' || level === 'high') return 'high';
  if (level === 'medium') return 'medium';
  return 'low';
}

export const chainRiskMeta: Record<ChainRiskLevel, { label: string; className: string }> = {
  high: { label: '고위험', className: 'border-red-200 bg-red-50 text-red-700' },
  medium: { label: '중위험', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  low: { label: '저위험', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
};

// 공급망 진행 상태 — 협력사 입력 완성도(status/completeness) 기준.
//  complete   = 묶음의 모든 협력사가 입력 완료(verified 또는 completeness≥THRESHOLD)
//  awaiting   = 입력 완료된 협력사가 하나도 없음(초대/요청만 됨 — 자료 대기)
//  collecting = 일부만 완료(수집 진행 중)
export type ChainStatus = 'complete' | 'collecting' | 'awaiting';

const COMPLETENESS_THRESHOLD = 80;

export function isSupplierComplete(s: MockSupplier): boolean {
  return s.status === 'supplier_verified' || (s.completeness_score ?? 0) >= COMPLETENESS_THRESHOLD;
}

export const chainStatusMeta: Record<ChainStatus, { label: string; className: string }> = {
  complete: { label: '완료', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  collecting: { label: '수집 중', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  awaiting: { label: '자료 대기', className: 'border-slate-200 bg-slate-100 text-slate-600' },
};

// 백엔드 §10.2a 병합 시 기간이 없는 맵 노드는 sentinel 범위로 채워진다(mergeSupplyChainMap).
// 그 경우 목록의 단위기간은 의미가 없으므로 표시에서 '전체'로 보정한다.
export const SENTINEL_PERIOD_FROM = '0000-01-01';
export const SENTINEL_PERIOD_TO = '9999-12-31';
export function isSentinelPeriod(from: string, to: string) {
  return from === SENTINEL_PERIOD_FROM || to === SENTINEL_PERIOD_TO;
}

/**
 * 데이터셋의 공급망 맵을 (제품 × BOM 버전) 단위로 묶어 목록 행을 만든다.
 * - 묶음 키 = bom_version_id (제품·고객사·생산기간을 함의). 같은 제품의 다른 Lot은 별도 행.
 * - 단위기간: BOM 버전의 생산기간(effective_from/to).
 * - 협력사 수: child_supplier_id 중복 제거.
 * - 리스크: 묶음 내 협력사 위험도 최악값(critical/high→고위험).
 * - 갱신일: 맵 노드 created_at 최신값(없으면 생산기간 시작으로 폴백).
 */
export function buildSupplyChainList(ds: SupplyChainDataset): SupplyChainSummary[] {
  const bomVersionById = new Map(ds.bom_versions.map(v => [v.bom_version_id, v]));
  const productById = new Map(ds.products.map(p => [p.product_id, p]));
  const supplierById = new Map(ds.suppliers.map(s => [s.supplier_id, s]));

  type Acc = SupplyChainSummary & { _supplierIds: Set<string>; _worst: number };
  const groups = new Map<string, Acc>();

  for (const row of ds.supply_chain_map) {
    const bomVersion = bomVersionById.get(row.bom_version_id);
    if (!bomVersion) continue;
    const product = productById.get(bomVersion.product_id);
    if (!product) continue;

    const key = row.bom_version_id;
    let g = groups.get(key);
    if (!g) {
      g = {
        chain_id: key,
        product_id: product.product_id,
        product_name: product.product_name,
        product_code: product.product_code,
        customer_id: product.customer_id,
        customer_name: product.customer_name,
        bom_version_id: bomVersion.bom_version_id,
        version_number: bomVersion.version_number,
        period_from: bomVersion.effective_from,
        period_to: bomVersion.effective_to,
        supplier_count: 0,
        completed_supplier_count: 0,
        status: 'awaiting',
        risk_level: 'low',
        last_updated: '',
        map_ids: [],
        _supplierIds: new Set<string>(),
        _worst: 0,
      };
      groups.set(key, g);
    }
    g.map_ids.push(row.map_id);
    if (row.child_supplier_id) g._supplierIds.add(row.child_supplier_id);
    if (row.created_at && row.created_at > g.last_updated) g.last_updated = row.created_at;
    const supplier = supplierById.get(row.child_supplier_id);
    if (supplier) {
      const lvl = toChainRiskLevel(supplier.risk_level);
      if (CHAIN_RISK_RANK[lvl] > g._worst) {
        g._worst = CHAIN_RISK_RANK[lvl];
        g.risk_level = lvl;
      }
    }
  }

  return Array.from(groups.values())
    .map(({ _supplierIds, _worst, ...rest }) => {
      const supplierIds = Array.from(_supplierIds);
      const completed = supplierIds.filter(id => {
        const s = supplierById.get(id);
        return s ? isSupplierComplete(s) : false;
      }).length;
      // 모두 완료=완료, 하나도 없음=자료 대기, 일부=수집 중.
      const status: ChainStatus =
        supplierIds.length > 0 && completed === supplierIds.length
          ? 'complete'
          : completed === 0
            ? 'awaiting'
            : 'collecting';
      return {
        ...rest,
        supplier_count: supplierIds.length,
        completed_supplier_count: completed,
        status,
        // created_at 이 하나도 없으면(데모/미노출) 생산기간 시작을 갱신일로 폴백.
        last_updated: rest.last_updated || rest.period_from || '',
      };
    })
    .sort(
      (a, b) =>
        CHAIN_RISK_RANK[b.risk_level] - CHAIN_RISK_RANK[a.risk_level] ||
        a.product_name.localeCompare(b.product_name) ||
        (a.period_from < b.period_from ? 1 : -1),
    );
}

// 데모(시연)용 전체 mock 맵 묶음
export const mockDataset: SupplyChainDataset = {
  products,
  bom_versions,
  parts,
  bom_items,
  suppliers,
  supplier_factories,
  supply_chain_map,
  supply_chain_ratios,
};

// 기본 시작 상태 — 전부 빈 상태 (제품/BOM은 API로 채우고, 공급망은 형성으로 채운다)
export const emptyDataset: SupplyChainDataset = {
  products: [],
  bom_versions: [],
  parts: [],
  bom_items: [],
  suppliers: [],
  supplier_factories: [],
  supply_chain_map: [],
  supply_chain_ratios: [],
};

// ── API(camelCase) → dataset(snake) 어댑터 (트리 엔진 무변경) ──
export function apiProductsToDataset(apiProducts: ApiProduct[]): Product[] {
  return apiProducts.map(p => ({
    product_id: p.productId,
    product_code: p.productCode,
    product_name: p.productName,
    manufacturer_id: '',
    customer_id: p.customerId ?? '',
    customer_name: p.customerName ?? '',
    type: p.type,
    specs: {
      capacity: '-',
      shipment_info: '-',
      mineral_composition: '-',
      hazardous_substances: '-',
      regulation_status: 'verified',
    },
    source_system: 'API',
    external_id: '',
    synced_at: '',
  }));
}

/**
 * 제품의 BOM(API)을 dataset에 병합한다. 공급망 연결(엣지/비율/협력사)은 §10.2a로 채워진다.
 * versions(getProductBomVersions, 실 bomVersionId)를 주면 그 전체 목록으로 bom_versions를 채운다.
 * 없으면 BOM 트리에서 합성된 단일 버전(bom.bomVersions)을 쓴다.
 */
export function mergeProductBom(
  ds: SupplyChainDataset,
  productId: string,
  bom: ApiProductBom,
  versions?: ApiBomVersionListItem[],
): SupplyChainDataset {
  const bom_versions: BomVersion[] = (versions && versions.length > 0)
    ? versions.map(v => ({
        bom_version_id: v.bomVersionId,
        product_id: v.productId,
        version_number: v.versionNumber,
        effective_from: v.productionFrom ?? '',
        effective_to: v.productionTo,
        status: (v.status as BomVersion['status']) ?? 'active',
        source_system: v.sourceSystem ?? 'API',
      }))
    : bom.bomVersions.map(v => ({
        bom_version_id: v.bomVersionId,
        product_id: v.productId,
        version_number: v.versionNumber,
        effective_from: '',
        effective_to: null,
        status: (v.status as BomVersion['status']) ?? 'active',
        source_system: 'API',
      }));
  const parts: Part[] = bom.parts.map(p => ({
    part_id: p.partId,
    part_code: p.partCode,
    part_name: p.partName,
    tier_level: p.tierLevel,
    parent_part_id: p.parentPartId,
    material_type: p.materialType,
    function_purpose: p.functionPurpose,
    purchase_unit: p.purchaseUnit,
    kind: (p.kind as PartKind) ?? 'material',
  }));
  const bom_items: BomItem[] = bom.bomItems.map(i => ({
    bom_item_id: i.bomItemId,
    bom_version_id: i.bomVersionId,
    part_id: i.partId,
    required_quantity: i.requiredQuantity,
    required_quantity_unit: i.requiredQuantityUnit,
    percentage: i.percentage,
    origin_country: i.originCountry,
  }));
  // 다른 제품의 BOM은 유지하고 현재 제품 것만 교체
  const otherVersionIds = new Set(ds.bom_versions.filter(v => v.product_id === productId).map(v => v.bom_version_id));
  return {
    ...ds,
    bom_versions: [...ds.bom_versions.filter(v => v.product_id !== productId), ...bom_versions],
    parts: [...ds.parts.filter(p => !parts.some(np => np.part_id === p.part_id)), ...parts],
    bom_items: [...ds.bom_items.filter(i => !otherVersionIds.has(i.bom_version_id)), ...bom_items],
  };
}

/**
 * BOM 버전 목록만 dataset에 병합(드롭다운용). BOM 트리(getProductBom) 조회 성공 여부와 무관하게
 * getProductBomVersions 결과를 항상 반영한다 — 트리가 404/빈값이어도 버전 선택은 가능해야 하므로.
 * 다른 제품 버전은 유지하고 현재 제품 것만 교체(mergeProductBom과 동일 규칙).
 */
export function mergeBomVersions(
  ds: SupplyChainDataset,
  productId: string,
  versions: ApiBomVersionListItem[],
): SupplyChainDataset {
  if (versions.length === 0) return ds;
  const bom_versions: BomVersion[] = versions.map(v => ({
    bom_version_id: v.bomVersionId,
    product_id: v.productId,
    version_number: v.versionNumber,
    effective_from: v.productionFrom ?? '',
    effective_to: v.productionTo,
    status: (v.status as BomVersion['status']) ?? 'active',
    source_system: v.sourceSystem ?? 'API',
  }));
  return {
    ...ds,
    bom_versions: [...ds.bom_versions.filter(v => v.product_id !== productId), ...bom_versions],
  };
}

const FACTORY_ROLE_FALLBACK: MockSupplierFactory['factory_role'] = 'production';
const VALID_FACTORY_ROLES = new Set<MockSupplierFactory['factory_role']>([
  'headquarters', 'production', 'outsourcing', 'processing', 'mining',
]);

/**
 * §10.2a 공급망 맵(getProductSupplyChainMap) 응답을 dataset에 병합한다.
 * 백엔드가 supply_chain_map/ratios/suppliers/supplier_factories를 실제로 주므로 합성하지 않는다.
 * bomVersionId(현재 선택 버전)로 맵 행을 스탬프해 buildTraceRows의 버전 필터와 일치시킨다.
 * - 백엔드 맵 행엔 기간/PO가 없어 기간 필터를 항상 통과하도록 넓은 범위로 채운다(서버가 이미 필터링).
 * - 앵커 외 부품은 bom_items가 없어 행이 누락되므로, 맵이 참조하는 부품에 최소 bom_item을 backfill.
 */
export function mergeSupplyChainMap(
  ds: SupplyChainDataset,
  productId: string,
  bomVersionId: string,
  resp: ApiProductSupplyChainMap,
): SupplyChainDataset {
  const supply_chain_map: SupplyChainMapRow[] = resp.supplyChainMap.map(n => ({
    map_id: n.mapId,
    bom_version_id: bomVersionId,
    parent_supplier_id: n.supplierId, // 백엔드 맵 노드는 child만 제공(트리 구조는 ratios의 누적 경로로)
    child_supplier_id: n.supplierId,
    part_id: n.partId,
    hop_level: n.hopLevel ?? null, // 엣지별 차수(SSOT) — 겸업 노드 tier 분리용
    po_number: '',
    invoice_number: '',
    // 실 납품 단위기간(§10.2a). 미노출이면 sentinel 로 폴백해 기간 필터(겹침)를 항상 통과시킨다.
    supply_period_from: n.supplyPeriodFrom ?? '0000-01-01',
    supply_period_to: n.supplyPeriodTo ?? '9999-12-31',
    link_status: n.linkStatus,
    source_system: 'ERP',
    verification_status: n.linkStatus === 'supplychain_confirmed' ? 'verified' : 'unverified',
    created_at: n.createdAt ?? '',
  }));

  const supply_chain_ratios: SupplyChainRatio[] = resp.supplyChainRatios.map(r => ({
    ratio_id: `${r.mapId}:${r.factoryId ?? 'na'}`,
    map_id: r.mapId,
    factory_id: r.factoryId ?? '',
    ratio_percentage: r.ratioPercent ?? r.cumulativeContribution ?? 0,
    volume: 0,
  }));

  // 차수(tier) = supply_chain_map.hop_level(SSOT). 겸업(한 협력사가 여러 hop)이면 최소 hop(=가장 직접 차수).
  const hopBySupplier = new Map<string, number>();
  for (const n of resp.supplyChainMap) {
    if (typeof n.hopLevel === 'number') {
      const cur = hopBySupplier.get(n.supplierId);
      if (cur === undefined || n.hopLevel < cur) hopBySupplier.set(n.supplierId, n.hopLevel);
    }
  }

  const suppliers: MockSupplier[] = resp.suppliers.map(s => ({
    supplier_id: s.supplierId,
    company_name: s.companyName,
    company_name_en: '',
    provider_type: s.providerType,
    tier: hopBySupplier.get(s.supplierId) ?? 0,
    parent_supplier_id: null,
    status: s.status ?? '',
    risk_level: (s.riskLevel as MockSupplier['risk_level']) ?? 'low',
    feoc_status: (s.feocStatus as MockSupplier['feoc_status']) ?? 'unknown',
    latest_audit_result: '',
    completeness_score: s.completenessScore ?? undefined,
  }));

  const supplier_factories: MockSupplierFactory[] = resp.supplierFactories.map(f => ({
    factory_id: f.factoryId,
    supplier_id: f.supplierId,
    factory_name: f.factoryName,
    factory_name_en: '',
    country: f.country ?? '',
    region: f.region ?? '',
    factory_role: VALID_FACTORY_ROLES.has(f.factoryRole as MockSupplierFactory['factory_role'])
      ? (f.factoryRole as MockSupplierFactory['factory_role'])
      : FACTORY_ROLE_FALLBACK,
    destination: 'EU',
  }));

  // bom_items backfill — 맵이 참조하지만 BOM 앵커가 아닌 부품(필수: buildTraceRows가 bomItem 없으면 행 누락)
  const itemKeys = new Set(ds.bom_items.filter(i => i.bom_version_id === bomVersionId).map(i => i.part_id));
  const referencedParts = new Set(supply_chain_map.map(m => m.part_id));
  const backfillItems: BomItem[] = [];
  for (const pid of referencedParts) {
    if (!itemKeys.has(pid)) {
      backfillItems.push({
        bom_item_id: `${bomVersionId}:${pid}:auto`,
        bom_version_id: bomVersionId,
        part_id: pid,
        required_quantity: 0,
        required_quantity_unit: '',
        percentage: 0,
        origin_country: '',
      });
    }
  }

  // 부품 stub backfill — §10.2a가 참조하는 부품이 BOM 트리 커버리지에 없을 수 있어(예: Pack/Module),
  // 맵 응답의 part_name/tier_level로 최소 part를 추가(buildTraceRows가 part 없으면 행 누락).
  // parent_part_id는 §10.2a가 부품 트리 부모를 안 주므로 null(=제품 직속으로 붙음).
  const existingPartIds = new Set(ds.parts.map(p => p.part_id));
  const seenStub = new Set<string>();
  // 백엔드는 부품 트리 부모를 안 주므로, tier(차수) 오름차순으로 정렬해 '이전(낮은) tier'를
  // 부모로 체인 연결한다 → 트리가 product → tier0 → tier1 → … → 광산 으로 숫자대로 내려간다.
  // (tier0이 제품 직속·고정 최상단, 광산이 최하단. 평면+알파벳 정렬로 차수가 뒤섞이던 문제 해결.)
  const stubSeed = resp.supplyChainMap
    .filter(n => !existingPartIds.has(n.partId) && !seenStub.has(n.partId) && (seenStub.add(n.partId), true))
    .map(n => ({ id: n.partId, code: n.partCode, name: n.partName, tier: n.tierLevel ?? 0 }))
    .sort((a, b) => a.tier - b.tier);
  const partStubs: Part[] = stubSeed.map((s, idx) => ({
    part_id: s.id,
    part_code: s.code ?? s.id,
    part_name: s.name ?? `부품 (Tier ${s.tier})`,
    tier_level: s.tier,
    parent_part_id: idx === 0 ? null : stubSeed[idx - 1].id,
    material_type: '',
    function_purpose: '',
    purchase_unit: '',
    kind: s.tier <= 1 ? 'component' : s.tier >= 5 ? 'mineral' : 'material',
  }));

  const newSupplierIds = new Set(suppliers.map(s => s.supplier_id));
  const newFactoryIds = new Set(supplier_factories.map(f => f.factory_id));
  const oldVersionMapIds = new Set(
    ds.supply_chain_map.filter(m => m.bom_version_id === bomVersionId).map(m => m.map_id),
  );

  return {
    ...ds,
    parts: [...ds.parts, ...partStubs],
    suppliers: [...ds.suppliers.filter(s => !newSupplierIds.has(s.supplier_id)), ...suppliers],
    supplier_factories: [...ds.supplier_factories.filter(f => !newFactoryIds.has(f.factory_id)), ...supplier_factories],
    supply_chain_map: [...ds.supply_chain_map.filter(m => m.bom_version_id !== bomVersionId), ...supply_chain_map],
    supply_chain_ratios: [...ds.supply_chain_ratios.filter(r => !oldVersionMapIds.has(r.map_id)), ...supply_chain_ratios],
    bom_items: [...ds.bom_items, ...backfillItems],
  };
}
