// 공급망 맵 허브와 협력사 포털이 공유하는 제품/BOM/공급망 mock 데이터·타입·순수 헬퍼 모듈
// (제품/BOM/맵엣지/비율은 백엔드 엔드포인트가 없어 로컬 mock 으로 유지한다. 협력사 상세는 lib/api 사용.)
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

export type RiskStatus = 'verified' | 'watch' | 'high' | 'feoc_review' | 'audit_required';
export type PartKind = 'component' | 'material' | 'mineral';
export type NodeType = 'product' | 'part' | 'material' | 'supplier';

export interface Product {
  product_id: string;
  product_code: string;
  product_name: string;
  manufacturer_id: string;
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
  supplier_type: 'manufacturer' | 'recycler' | 'trader' | 'miner';
  tier: number;
  parent_supplier_id: string | null;
  status: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  feoc_status: 'eligible' | 'ineligible' | 'under_review' | 'unknown';
  latest_audit_result: string;
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
  po_number: string;
  invoice_number: string;
  supply_period_from: string;
  supply_period_to: string;
  link_status: 'supplychain_declared' | 'supplychain_confirmed';
  source_system: 'ERP' | 'SUPPLIER_DECLARED';
  verification_status: 'unverified' | 'verified';
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
  provider_type: MockSupplier['supplier_type'];
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

export const products: Product[] = [
  {
    product_id: 'prod-bat-ncm811',
    product_code: 'BAT-NCM811-100Ah',
    product_name: '배터리 셀 A',
    manufacturer_id: 'sup-hanyang-cell',
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
  { supplier_id: 'sup-hanyang-cell', company_name: 'EcoBattery Co., Ltd.', company_name_en: 'EcoBattery Co., Ltd.', supplier_type: 'manufacturer', tier: 1, parent_supplier_id: null, status: 'supplier_verified', risk_level: 'low', feoc_status: 'eligible', latest_audit_result: '2026-05 문서 검토 완료' },
  { supplier_id: 'sup-pos-cathode', company_name: 'Eco Materials Co., Ltd.', company_name_en: 'Eco Materials Co., Ltd.', supplier_type: 'manufacturer', tier: 2, parent_supplier_id: 'sup-hanyang-cell', status: 'supplier_verified', risk_level: 'low', feoc_status: 'eligible', latest_audit_result: '2026-05 현장 실사 적합' },
  { supplier_id: 'sup-pohang-refining', company_name: 'Livent Corporation', company_name_en: 'Livent Corporation', supplier_type: 'manufacturer', tier: 3, parent_supplier_id: 'sup-pos-cathode', status: 'supplier_verified', risk_level: 'low', feoc_status: 'eligible', latest_audit_result: '2026-04 RMI 증빙 확인' },
  { supplier_id: 'sup-ganzhou-rare', company_name: 'Zhejiang Cobalt Co., Ltd.', company_name_en: 'Zhejiang Cobalt Co., Ltd.', supplier_type: 'manufacturer', tier: 3, parent_supplier_id: 'sup-pos-cathode', status: 'supplier_requested', risk_level: 'high', feoc_status: 'under_review', latest_audit_result: 'FEOC 소유구조 보완 요청' },
  { supplier_id: 'sup-katanga-cobalt', company_name: 'DRC Mining Co.', company_name_en: 'DRC Mining Co.', supplier_type: 'miner', tier: 4, parent_supplier_id: 'sup-ganzhou-rare', status: 'supplier_review', risk_level: 'critical', feoc_status: 'unknown', latest_audit_result: '인권 실사 보고서 갱신 필요' },
  { supplier_id: 'sup-sulawesi-nickel', company_name: 'PT Vale Indonesia', company_name_en: 'PT Vale Indonesia', supplier_type: 'miner', tier: 4, parent_supplier_id: 'sup-ganzhou-rare', status: 'supplier_review', risk_level: 'medium', feoc_status: 'eligible', latest_audit_result: '환경 인증 유효기간 확인 필요' },
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

export function selectedProductIdFromBom(bomVersionId: string) {
  return bom_versions.find(version => version.bom_version_id === bomVersionId)?.product_id;
}

export function buildTraceRows(bomVersionId: string, period: string, factoryId: string, poNumber: string): TraceRow[] {
  const [periodFrom, periodTo] = period.split(' ~ ');

  return supply_chain_map
    .filter(mapRow => mapRow.bom_version_id === bomVersionId)
    .filter(mapRow => !poNumber || poNumber === 'ALL' || mapRow.po_number === poNumber)
    .filter(mapRow => {
      if (!periodFrom || !periodTo) return true;
      return mapRow.supply_period_from <= periodTo && mapRow.supply_period_to >= periodFrom;
    })
    .flatMap(mapRow => {
      const part = parts.find(item => item.part_id === mapRow.part_id);
      const bomItem = bom_items.find(item => item.bom_version_id === bomVersionId && item.part_id === mapRow.part_id);
      const supplier = suppliers.find(item => item.supplier_id === mapRow.child_supplier_id);
      const ratios = supply_chain_ratios.filter(item => item.map_id === mapRow.map_id);

      if (!part || !supplier || !bomItem) return [];

      return ratios
        .filter(ratio => !factoryId || factoryId === 'ALL' || ratio.factory_id === factoryId)
        .flatMap(ratio => {
          const factory = supplier_factories.find(item => item.factory_id === ratio.factory_id);
          if (!factory) return [];
          const riskStatus = getRiskStatus(supplier, mapRow);
          const country = factory.country || bomItem.origin_country;
          const bomVersion = bom_versions.find(version => version.bom_version_id === bomVersionId);

          return [{
            node_key: `${getNodeType(part)}:${mapRow.map_id}:${ratio.factory_id}`,
            node_type: getNodeType(part),
            stage: getStage(part),
            depth: getDepth(part),
            tier: `Tier ${supplier.tier}`,
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
            provider_type: supplier.supplier_type,
            factory_region: factory.region,
            applicable_rules: getApplicableRules(riskStatus, country),
            missing_documents: getMissingDocuments(riskStatus),
            certificate_status: getCertificateStatus(riskStatus),
            verification_progress: getVerificationProgress(riskStatus),
            connected_products: products
              .filter(product => product.product_id === selectedProductIdFromBom(bomVersionId))
              .map(product => product.product_name)
              .join(', '),
            bom_version: bomVersion?.version_number ?? bomVersionId,
          }];
        });
    })
    .sort((a, b) => {
      const stageOrder = { bom: 1, material: 2, supplier: 3 };
      return stageOrder[a.stage] - stageOrder[b.stage] || a.depth - b.depth || a.part_name.localeCompare(b.part_name);
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

export function buildExplorerTree(product: Product, bomVersion: BomVersion, rows: TraceRow[]): ExplorerNode {
  const rowsByPartId = new Map<string, TraceRow>();
  rows.forEach(row => {
    if (!rowsByPartId.has(row.part_id)) rowsByPartId.set(row.part_id, row);
  });

  function buildPartNode(row: TraceRow, depth: number): ExplorerNode {
    const part = parts.find(item => item.part_id === row.part_id);
    const childPartNodes = parts
      .filter(item => item.parent_part_id === row.part_id)
      .map(item => rowsByPartId.get(item.part_id))
      .filter((item): item is TraceRow => Boolean(item))
      .sort((a, b) => a.part_name.localeCompare(b.part_name))
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

  const children = parts
    .filter(part => !part.parent_part_id)
    .map(part => rowsByPartId.get(part.part_id))
    .filter((item): item is TraceRow => Boolean(item))
    .sort((a, b) => a.part_name.localeCompare(b.part_name))
    .map(row => buildPartNode(row, 1));

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
