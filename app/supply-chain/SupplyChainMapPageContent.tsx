'use client';

// 공급망 맵과 E-BOM 형성 화면이 공유하는 원본 화면 컴포넌트입니다.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Box,
  ChevronDown,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Gem,
  Info,
  Maximize2,
  Package,
  Plus,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';

type RiskStatus = 'verified' | 'watch' | 'high' | 'feoc_review' | 'audit_required';
type PartKind = 'component' | 'material' | 'mineral';
type NodeType = 'product' | 'part' | 'material' | 'supplier';

interface Product {
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

interface BomVersion {
  bom_version_id: string;
  product_id: string;
  version_number: string;
  effective_from: string;
  effective_to: string | null;
  status: 'draft' | 'active' | 'deprecated';
  source_system: string;
}

interface Part {
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

interface BomItem {
  bom_item_id: string;
  bom_version_id: string;
  part_id: string;
  required_quantity: number;
  required_quantity_unit: string;
  percentage: number;
  origin_country: string;
}

interface Supplier {
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

interface SupplierFactory {
  factory_id: string;
  supplier_id: string;
  factory_name: string;
  factory_name_en: string;
  country: string;
  region: string;
  factory_role: 'headquarters' | 'production' | 'outsourcing' | 'processing' | 'mining';
  destination: 'EU' | 'US' | 'KR' | 'BOTH';
}

interface SupplyChainMapRow {
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

interface SupplyChainRatio {
  ratio_id: string;
  map_id: string;
  factory_id: string;
  ratio_percentage: number;
  volume: number;
}

interface TraceRow {
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
  feoc_status: Supplier['feoc_status'];
  risk_level: Supplier['risk_level'];
  latest_audit_result: string;
  provider_type: Supplier['supplier_type'];
  factory_region: string;
  applicable_rules: string;
  missing_documents: string;
  certificate_status: string;
  verification_progress: string;
  connected_products: string;
  bom_version: string;
}

type SelectedNode =
  | { type: 'product'; key: string; product: Product; bomVersion: BomVersion; rows: TraceRow[] }
  | { type: 'part'; key: string; row: TraceRow }
  | { type: 'material'; key: string; row: TraceRow }
  | { type: 'supplier'; key: string; row: TraceRow };

interface ExplorerNode {
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

const products: Product[] = [
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

const bom_versions: BomVersion[] = [
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

const parts: Part[] = [
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

const bom_items: BomItem[] = [
  { bom_item_id: 'bomi-cell-module', bom_version_id: 'bomv-ncm811-v32', part_id: 'part-cell-module', required_quantity: 1, required_quantity_unit: 'EA', percentage: 42.5, origin_country: 'KR' },
  { bom_item_id: 'bomi-cathode', bom_version_id: 'bomv-ncm811-v32', part_id: 'part-cathode', required_quantity: 128.5, required_quantity_unit: 'kg', percentage: 31.2, origin_country: 'KR' },
  { bom_item_id: 'bomi-lioh', bom_version_id: 'bomv-ncm811-v32', part_id: 'part-lioh', required_quantity: 10.8, required_quantity_unit: 'kg', percentage: 8.4, origin_country: 'AU' },
  { bom_item_id: 'bomi-coso4', bom_version_id: 'bomv-ncm811-v32', part_id: 'part-coso4', required_quantity: 16.4, required_quantity_unit: 'kg', percentage: 12.8, origin_country: 'CN' },
  { bom_item_id: 'bomi-cobalt-ore', bom_version_id: 'bomv-ncm811-v32', part_id: 'part-cobalt-ore', required_quantity: 0.36, required_quantity_unit: 't', percentage: 4.1, origin_country: 'CD' },
  { bom_item_id: 'bomi-nickel', bom_version_id: 'bomv-ncm811-v32', part_id: 'part-nickel', required_quantity: 27.8, required_quantity_unit: 'kg', percentage: 21.6, origin_country: 'ID' },
];

const supplierDetailIdMap: Record<string, string> = {
  'sup-hanyang-cell': 'S-CELL-001',
  'sup-pos-cathode': 'S-CAM-001',
  'sup-pohang-refining': 'S-REF-001',
  'sup-ganzhou-rare': 'S-REF-002',
  'sup-katanga-cobalt': 'S-MINE-002',
  'sup-sulawesi-nickel': 'S-MINE-001',
};

const suppliers: Supplier[] = [
  { supplier_id: 'sup-hanyang-cell', company_name: 'EcoBattery Co., Ltd.', company_name_en: 'EcoBattery Co., Ltd.', supplier_type: 'manufacturer', tier: 1, parent_supplier_id: null, status: 'supplier_verified', risk_level: 'low', feoc_status: 'eligible', latest_audit_result: '2026-05 문서 검토 완료' },
  { supplier_id: 'sup-pos-cathode', company_name: 'Eco Materials Co., Ltd.', company_name_en: 'Eco Materials Co., Ltd.', supplier_type: 'manufacturer', tier: 2, parent_supplier_id: 'sup-hanyang-cell', status: 'supplier_verified', risk_level: 'low', feoc_status: 'eligible', latest_audit_result: '2026-05 현장 실사 적합' },
  { supplier_id: 'sup-pohang-refining', company_name: 'Livent Corporation', company_name_en: 'Livent Corporation', supplier_type: 'manufacturer', tier: 3, parent_supplier_id: 'sup-pos-cathode', status: 'supplier_verified', risk_level: 'low', feoc_status: 'eligible', latest_audit_result: '2026-04 RMI 증빙 확인' },
  { supplier_id: 'sup-ganzhou-rare', company_name: 'Zhejiang Cobalt Co., Ltd.', company_name_en: 'Zhejiang Cobalt Co., Ltd.', supplier_type: 'manufacturer', tier: 3, parent_supplier_id: 'sup-pos-cathode', status: 'supplier_requested', risk_level: 'high', feoc_status: 'under_review', latest_audit_result: 'FEOC 소유구조 보완 요청' },
  { supplier_id: 'sup-katanga-cobalt', company_name: 'DRC Mining Co.', company_name_en: 'DRC Mining Co.', supplier_type: 'miner', tier: 4, parent_supplier_id: 'sup-ganzhou-rare', status: 'supplier_review', risk_level: 'critical', feoc_status: 'unknown', latest_audit_result: '인권 실사 보고서 갱신 필요' },
  { supplier_id: 'sup-sulawesi-nickel', company_name: 'PT Vale Indonesia', company_name_en: 'PT Vale Indonesia', supplier_type: 'miner', tier: 4, parent_supplier_id: 'sup-ganzhou-rare', status: 'supplier_review', risk_level: 'medium', feoc_status: 'eligible', latest_audit_result: '환경 인증 유효기간 확인 필요' },
];

const supplier_factories: SupplierFactory[] = [
  { factory_id: 'fac-hanyang-f003', supplier_id: 'sup-hanyang-cell', factory_name: 'F-003 Cell Line', factory_name_en: 'F-003 Cell Line', country: 'KR', region: 'Cheongju', factory_role: 'production', destination: 'BOTH' },
  { factory_id: 'fac-pos-cathode-gwangyang', supplier_id: 'sup-pos-cathode', factory_name: 'Gwangyang Cathode Plant', factory_name_en: 'Gwangyang Cathode Plant', country: 'KR', region: 'Gwangyang', factory_role: 'production', destination: 'BOTH' },
  { factory_id: 'fac-pohang-refining', supplier_id: 'sup-pohang-refining', factory_name: 'Pohang Refining Works', factory_name_en: 'Pohang Refining Works', country: 'AU', region: 'Pilbara', factory_role: 'processing', destination: 'EU' },
  { factory_id: 'fac-ganzhou-processing', supplier_id: 'sup-ganzhou-rare', factory_name: 'Ganzhou Processing Plant', factory_name_en: 'Ganzhou Processing Plant', country: 'CN', region: 'Ganzhou', factory_role: 'processing', destination: 'US' },
  { factory_id: 'fac-katanga-mine', supplier_id: 'sup-katanga-cobalt', factory_name: 'Katanga Cobalt Mine', factory_name_en: 'Katanga Cobalt Mine', country: 'CD', region: 'Katanga', factory_role: 'mining', destination: 'EU' },
  { factory_id: 'fac-sulawesi-mine', supplier_id: 'sup-sulawesi-nickel', factory_name: 'Sulawesi Nickel Mine', factory_name_en: 'Sulawesi Nickel Mine', country: 'ID', region: 'Sulawesi', factory_role: 'mining', destination: 'EU' },
];

const supply_chain_map: SupplyChainMapRow[] = [
  { map_id: 'map-cell-module', bom_version_id: 'bomv-ncm811-v32', parent_supplier_id: 'sup-hanyang-cell', child_supplier_id: 'sup-hanyang-cell', part_id: 'part-cell-module', po_number: 'PO-2026-0521', invoice_number: 'INV-2026-0521', supply_period_from: '2026-05-01', supply_period_to: '2026-05-31', link_status: 'supplychain_confirmed', source_system: 'ERP', verification_status: 'verified' },
  { map_id: 'map-cathode', bom_version_id: 'bomv-ncm811-v32', parent_supplier_id: 'sup-hanyang-cell', child_supplier_id: 'sup-pos-cathode', part_id: 'part-cathode', po_number: 'PO-2026-0520', invoice_number: 'INV-2026-0520', supply_period_from: '2026-05-01', supply_period_to: '2026-05-31', link_status: 'supplychain_confirmed', source_system: 'ERP', verification_status: 'verified' },
  { map_id: 'map-lioh', bom_version_id: 'bomv-ncm811-v32', parent_supplier_id: 'sup-pos-cathode', child_supplier_id: 'sup-pohang-refining', part_id: 'part-lioh', po_number: 'PO-2026-0508', invoice_number: 'INV-2026-0508', supply_period_from: '2026-05-01', supply_period_to: '2026-05-31', link_status: 'supplychain_confirmed', source_system: 'ERP', verification_status: 'verified' },
  { map_id: 'map-coso4', bom_version_id: 'bomv-ncm811-v32', parent_supplier_id: 'sup-pos-cathode', child_supplier_id: 'sup-ganzhou-rare', part_id: 'part-coso4', po_number: 'PO-2026-0512', invoice_number: 'INV-2026-0512', supply_period_from: '2026-05-01', supply_period_to: '2026-05-31', link_status: 'supplychain_declared', source_system: 'SUPPLIER_DECLARED', verification_status: 'unverified' },
  { map_id: 'map-cobalt-ore', bom_version_id: 'bomv-ncm811-v32', parent_supplier_id: 'sup-ganzhou-rare', child_supplier_id: 'sup-katanga-cobalt', part_id: 'part-cobalt-ore', po_number: 'PO-2026-0503', invoice_number: 'INV-2026-0503', supply_period_from: '2026-05-01', supply_period_to: '2026-05-31', link_status: 'supplychain_declared', source_system: 'SUPPLIER_DECLARED', verification_status: 'unverified' },
  { map_id: 'map-nickel', bom_version_id: 'bomv-ncm811-v32', parent_supplier_id: 'sup-pos-cathode', child_supplier_id: 'sup-sulawesi-nickel', part_id: 'part-nickel', po_number: 'PO-2026-0508', invoice_number: 'INV-2026-0508-NI', supply_period_from: '2026-05-01', supply_period_to: '2026-05-31', link_status: 'supplychain_declared', source_system: 'SUPPLIER_DECLARED', verification_status: 'unverified' },
];

const supply_chain_ratios: SupplyChainRatio[] = [
  { ratio_id: 'ratio-cell-module', map_id: 'map-cell-module', factory_id: 'fac-hanyang-f003', ratio_percentage: 100, volume: 48 },
  { ratio_id: 'ratio-cathode', map_id: 'map-cathode', factory_id: 'fac-pos-cathode-gwangyang', ratio_percentage: 100, volume: 128.5 },
  { ratio_id: 'ratio-lioh', map_id: 'map-lioh', factory_id: 'fac-pohang-refining', ratio_percentage: 100, volume: 10.8 },
  { ratio_id: 'ratio-coso4', map_id: 'map-coso4', factory_id: 'fac-ganzhou-processing', ratio_percentage: 64, volume: 10.5 },
  { ratio_id: 'ratio-cobalt-ore', map_id: 'map-cobalt-ore', factory_id: 'fac-katanga-mine', ratio_percentage: 36, volume: 0.36 },
  { ratio_id: 'ratio-nickel', map_id: 'map-nickel', factory_id: 'fac-sulawesi-mine', ratio_percentage: 100, volume: 27.8 },
];

const statusMeta: Record<RiskStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  verified: { label: '검증완료', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
  watch: { label: '주의', className: 'border-amber-200 bg-amber-50 text-amber-700', Icon: Clock },
  high: { label: '고위험', className: 'border-red-200 bg-red-50 text-red-700', Icon: AlertTriangle },
  feoc_review: { label: 'FEOC 검토', className: 'border-red-200 bg-red-50 text-red-700', Icon: ShieldAlert },
  audit_required: { label: '실사 필요', className: 'border-red-200 bg-red-50 text-red-700', Icon: AlertTriangle },
};

function getRiskTone(status: RiskStatus): 'normal' | 'warning' | 'danger' {
  if (status === 'high' || status === 'feoc_review' || status === 'audit_required') return 'danger';
  if (status === 'watch') return 'warning';
  return 'normal';
}

function getToneClasses(tone: 'normal' | 'warning' | 'danger') {
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

function isFeocUnderReview(value: string) {
  return value === 'under_review' || value === 'ineligible' || value === 'violation' || value === 'blocked';
}

function getRiskStatus(supplier: Supplier, mapRow: SupplyChainMapRow): RiskStatus {
  if (supplier.feoc_status === 'under_review') return 'feoc_review';
  if (supplier.risk_level === 'critical') return 'audit_required';
  if (supplier.risk_level === 'high') return 'high';
  if (supplier.risk_level === 'medium' || mapRow.verification_status === 'unverified') return 'watch';
  return 'verified';
}

function getStage(part: Part): TraceRow['stage'] {
  if (part.kind === 'component') return 'bom';
  if (part.kind === 'mineral' || part.tier_level >= 5) return 'supplier';
  return 'material';
}

function getNodeType(part: Part): NodeType {
  if (part.kind === 'component') return 'part';
  return 'material';
}

function getDepth(part: Part): TraceRow['depth'] {
  if (part.tier_level <= 1) return 0;
  if (part.tier_level <= 2) return 1;
  return 2;
}

function getMaterialLabel(part: Part) {
  if (part.kind === 'component') return part.material_type;
  return `${part.material_type} / ${part.part_name}`;
}

function getApplicableRules(rowStatus: RiskStatus, country: string) {
  const rules = ['EU Battery Regulation'];
  if (country === 'CN' || rowStatus === 'feoc_review') rules.push('IRA FEOC');
  if (country === 'CD') rules.push('OECD 광물 실사');
  return rules.join(', ');
}

function getMissingDocuments(status: RiskStatus) {
  if (status === 'feoc_review') return '필수 문서 누락 2건';
  if (status === 'audit_required') return '실사 보고서 갱신 필요';
  if (status === 'watch') return '증빙 보완 1건';
  return '누락 없음';
}

function getCertificateStatus(status: RiskStatus) {
  if (status === 'feoc_review') return '원산지/소유구조 인증서 검토 중';
  if (status === 'audit_required') return '인권 실사 인증서 만료 임박';
  if (status === 'watch') return '인증서 보완 요청';
  return '인증서 유효';
}

function getVerificationProgress(status: RiskStatus) {
  if (status === 'verified') return '100%';
  if (status === 'watch') return '72%';
  if (status === 'feoc_review') return '48%';
  return '35%';
}

function selectedProductIdFromBom(bomVersionId: string) {
  return bom_versions.find(version => version.bom_version_id === bomVersionId)?.product_id;
}

function buildTraceRows(bomVersionId: string, period: string, factoryId: string, poNumber: string): TraceRow[] {
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

function getSelectedNode(key: string, product: Product, bomVersion: BomVersion, rows: TraceRow[]): SelectedNode {
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

function getInvitationContext(node: SelectedNode) {
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

function buildExplorerTree(product: Product, bomVersion: BomVersion, rows: TraceRow[]): ExplorerNode {
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

export function SupplyChainMapPageContent({ formationMode = false }: { formationMode?: boolean }) {
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState(products[0].product_id);
  const availableBomVersions = useMemo(
    () => bom_versions.filter(version => version.product_id === selectedProductId),
    [selectedProductId],
  );
  const [selectedBomVersionId, setSelectedBomVersionId] = useState(availableBomVersions[0].bom_version_id);
  const [period, setPeriod] = useState('2026-05-01 ~ 2026-05-31');
  const [selectedFactoryId, setSelectedFactoryId] = useState('ALL');
  const [selectedPoNumber, setSelectedPoNumber] = useState('ALL');
  const [selectedNodeKey, setSelectedNodeKey] = useState(`product:${products[0].product_id}`);
  const [collapsedNodeKeys, setCollapsedNodeKeys] = useState<Set<string>>(() => new Set());
  const [generatedAt, setGeneratedAt] = useState('');
  const [showConnectConfirm, setShowConnectConfirm] = useState(false);
  const [formationGenerated, setFormationGenerated] = useState(!formationMode);

  const selectedProduct = products.find(product => product.product_id === selectedProductId) ?? products[0];
  const selectedBomVersion = bom_versions.find(version => version.bom_version_id === selectedBomVersionId) ?? availableBomVersions[0];
  const [periodFrom, periodTo] = period.split(' ~ ');

  const factoryOptions = useMemo(() => {
    const mapRows = supply_chain_map.filter(row => row.bom_version_id === selectedBomVersionId);
    const factoryIds = new Set(
      mapRows.flatMap(row => supply_chain_ratios.filter(ratio => ratio.map_id === row.map_id).map(ratio => ratio.factory_id)),
    );
    return supplier_factories.filter(factory => factoryIds.has(factory.factory_id));
  }, [selectedBomVersionId]);

  const poOptions = useMemo(
    () => Array.from(new Set(supply_chain_map.filter(row => row.bom_version_id === selectedBomVersionId).map(row => row.po_number))),
    [selectedBomVersionId],
  );

  const traceRows = useMemo(
    () => buildTraceRows(selectedBomVersionId, period, selectedFactoryId, selectedPoNumber),
    [selectedBomVersionId, period, selectedFactoryId, selectedPoNumber],
  );

  const explorerTree = useMemo(
    () => buildExplorerTree(selectedProduct, selectedBomVersion, traceRows),
    [selectedProduct, selectedBomVersion, traceRows],
  );

  const selectedNode = getSelectedNode(selectedNodeKey, selectedProduct, selectedBomVersion, traceRows);
  const invitationContext = getInvitationContext(selectedNode);

  function handleProductChange(productId: string) {
    const nextVersions = bom_versions.filter(version => version.product_id === productId);
    setSelectedProductId(productId);
    setSelectedBomVersionId(nextVersions[0]?.bom_version_id ?? '');
    setPeriod('2026-05-01 ~ 2026-05-31');
    setSelectedFactoryId('ALL');
    setSelectedPoNumber('ALL');
    setSelectedNodeKey(`product:${productId}`);
    setCollapsedNodeKeys(new Set());
  }

  function handleGenerate() {
    setGeneratedAt(new Date().toLocaleString('ko-KR'));
    setFormationGenerated(true);
    setSelectedNodeKey(`product:${selectedProduct.product_id}`);
    setCollapsedNodeKeys(new Set());
  }

  function handlePeriodFromChange(value: string) {
    setPeriod(`${value} ~ ${periodTo || value}`);
  }

  function handlePeriodToChange(value: string) {
    setPeriod(`${periodFrom || value} ~ ${value}`);
  }

  function toggleNode(key: string) {
    setCollapsedNodeKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const exportHeaders = ['Tier', '품목/부품', '원재료/광물', '공급사', '사업장', '국가', 'PO 번호', '공급기간', '공급비율(%)', '리스크 상태'];

  function getExportRows() {
    return traceRows.map(row => [
      row.tier,
      row.part_name,
      row.material_or_mineral,
      formationMode ? '-' : row.supplier_name,
      formationMode ? '-' : row.factory_name,
      formationMode ? '-' : row.country,
      formationMode ? '-' : row.po_number,
      formationMode ? '-' : row.supply_period,
      formationMode ? '-' : String(row.supply_ratio),
      formationMode ? '-' : statusMeta[row.risk_status].label,
    ]);
  }

  function downloadCsv() {
    const rows = [exportHeaders, ...getExportRows()];
    const csv = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const bom = '﻿';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `공급망_추적_${selectedProduct.product_code}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadExcel() {
    const rows = [exportHeaders, ...getExportRows()];
    const tableHtml = `<table>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"/></head><body>${tableHtml}</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `공급망_추적_${selectedProduct.product_code}_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleConfirmInvitation() {
    const params = new URLSearchParams({
      node: invitationContext.nodeLabel,
      item: invitationContext.itemName,
      supplier: invitationContext.supplierName,
      type: invitationContext.nodeType,
    });
    setShowConnectConfirm(false);
    router.push(`/suppliers/invitations?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-white p-6 text-ink-100">
      <header className="mb-5">
        <h1 className="text-2xl font-black tracking-tight text-ink-100">{formationMode ? '공급망 맵 형성하기' : '공급망 맵'}</h1>
        <p className="mt-2 text-sm font-medium text-ink-500">
          {formationMode
            ? 'E-BOM 구조를 먼저 펼쳐 보고, 공급망 연결 전 단계의 맵 형성 상태를 확인하세요.'
            : '제품에서 원자재까지 공급망 구조와 리스크 현황을 한눈에 확인하세요.'}
        </p>
      </header>

      <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="제품">
            <select value={selectedProductId} onChange={event => handleProductChange(event.target.value)} className="h-11 min-w-[210px] rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink-100 shadow-sm outline-none focus:border-emerald-400">
              {products.map(product => (
                <option key={product.product_id} value={product.product_id}>
                  {product.product_name}
                </option>
              ))}
            </select>
          </FilterSelect>
          <FilterSelect label="BOM 정보">
            <select value={selectedBomVersionId} onChange={event => setSelectedBomVersionId(event.target.value)} className="h-11 min-w-[170px] rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-ink-400 shadow-sm outline-none focus:border-emerald-400">
              {availableBomVersions.map(version => (
                <option key={version.bom_version_id} value={version.bom_version_id}>
                  BOM {version.version_number} · {version.status}
                </option>
              ))}
            </select>
          </FilterSelect>
          <FilterSelect label="단위기간">
            <div className="flex h-11 min-w-[300px] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 shadow-sm focus-within:border-emerald-400">
              <input
                type="date"
                value={periodFrom}
                onChange={event => handlePeriodFromChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-400 outline-none"
                aria-label="단위기간 시작일"
              />
              <span className="text-xs font-bold text-slate-400">~</span>
              <input
                type="date"
                value={periodTo}
                onChange={event => handlePeriodToChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-400 outline-none"
                aria-label="단위기간 종료일"
              />
            </div>
          </FilterSelect>
          <FilterSelect label="PO 상태">
            <select value={selectedPoNumber} onChange={event => setSelectedPoNumber(event.target.value)} className="h-11 min-w-[150px] rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-ink-400 shadow-sm outline-none focus:border-emerald-400">
              <option value="ALL">전체 상태</option>
              {poOptions.map(poNumber => (
                <option key={poNumber} value={poNumber}>{poNumber}</option>
              ))}
            </select>
          </FilterSelect>
          <FilterSelect label="사업장/리스크">
            <select value={selectedFactoryId} onChange={event => setSelectedFactoryId(event.target.value)} className="h-11 min-w-[190px] rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-ink-400 shadow-sm outline-none focus:border-emerald-400">
              <option value="ALL">전체 리스크</option>
              {factoryOptions.map(factory => (
                <option key={factory.factory_id} value={factory.factory_id}>
                  {factory.factory_name}
                </option>
              ))}
            </select>
          </FilterSelect>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink-400 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            필터 초기화
          </button>
        </div>
        <div className="flex items-center gap-2">
          {formationMode ? (
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-100"
            >
              <Plus className="h-4 w-4" />
              맵 형성하기
            </button>
          ) : (
            <Link href="/supply-chain/bom-trace" className="inline-flex h-11 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-100">
              <Plus className="h-4 w-4" />
              맵 형성하기
            </Link>
          )}
          <button
            type="button"
            onClick={downloadExcel}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink-400 shadow-sm hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel 저장
          </button>
          <button className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink-400 shadow-sm hover:bg-slate-50">
            <Maximize2 className="h-4 w-4" />
            전체 화면
          </button>
        </div>
      </section>

      {generatedAt && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          {selectedProduct.product_name} / {selectedBomVersion.version_number} 기준으로 갱신되었습니다.
          <span className="ml-2 font-medium text-emerald-700">{generatedAt}</span>
        </div>
      )}

      {formationGenerated && (
        <>
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-100 bg-white px-4 py-3">
              <LegendBadge status="verified" />
              <LegendBadge status="watch" />
              <LegendBadge status="feoc_review" />
              <LegendBadge status="audit_required" />
              <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-500">
                <Info className="h-3.5 w-3.5" />
                정보 부족
              </span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_360px]">
              <div className="border-r border-slate-200 p-4">
                <SupplyMapTree
                  root={explorerTree}
                  selectedNodeKey={selectedNodeKey}
                  collapsedNodeKeys={collapsedNodeKeys}
                  onSelect={setSelectedNodeKey}
                  onToggle={toggleNode}
                  formationMode={formationMode}
                />
                <button
                  type="button"
                  onClick={() => setShowConnectConfirm(true)}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-50 text-sm font-bold text-ink-400 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                  하위 공급망 연결
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <MapDetailPanel selectedNode={selectedNode} formationMode={formationMode} />
            </div>
          </section>

          {!formationMode && <SupplyMapStats rows={traceRows} />}
        </>
      )}

      {showConnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4">
          <div className="w-full max-w-[360px] rounded-lg border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-bold text-ink-100">하위 공급망 연결</div>
                <p className="mt-2 text-sm text-ink-500">하위 공급망을 추가하시겠습니까?</p>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectConfirm(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              <div className="font-semibold text-slate-700">{invitationContext.itemName}</div>
              <div>{invitationContext.supplierName} 기준으로 하위 협력사 Invitation을 준비합니다.</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleConfirmInvitation}
                className="h-10 rounded-md bg-[#046949] text-sm font-semibold text-white hover:bg-[#03563c]"
              >
                예
              </button>
              <button
                type="button"
                onClick={() => setShowConnectConfirm(false)}
                className="h-10 rounded-md bg-slate-100 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                아니오
              </button>
            </div>
          </div>
        </div>
      )}

      {formationGenerated && (
        <section className="mt-4 overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="flex items-start justify-between gap-4 border-b border-ink-700 bg-ink-800/40 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-ink-100">감사/제출용 추적 테이블</h2>
              <p className="mt-0.5 text-xs text-ink-500">트리와 동일한 join 결과를 표 형태로 제공합니다.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={downloadCsv} className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-semibold text-ink-400 hover:bg-ink-800">
                <Download className="h-3.5 w-3.5" />
                CSV 다운로드
              </button>
              <button type="button" onClick={downloadExcel} className="inline-flex items-center gap-1.5 rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-100">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel 다운로드
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700 bg-ink-800/30">
                  {['Tier', '품목/부품', '원재료/광물', '공급사', '사업장', '국가', 'PO 번호', '공급기간', '공급비율', '규제/리스크 상태'].map(header => (
                    <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-ink-500">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700/40">
                {traceRows.map(row => (
                  <tr
                    key={row.node_key}
                    className={`cursor-pointer hover:bg-ink-800/30 ${selectedNodeKey === row.node_key ? 'bg-accent-50/60' : ''}`}
                    onClick={() => setSelectedNodeKey(row.node_key)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-ink-400">{row.tier}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-ink-100">{row.part_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{row.material_or_mineral}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-300">{formationMode ? '-' : row.supplier_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{formationMode ? '-' : row.factory_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{formationMode ? '-' : row.country}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-400">{formationMode ? '-' : row.po_number}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{formationMode ? '-' : row.supply_period}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-ink-300">{formationMode ? '-' : `${row.supply_ratio}%`}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formationMode ? <span className="text-sm font-medium text-ink-400">-</span> : <StatusBadge status={row.risk_status} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function FilterSelect({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SupplyMapTree({
  root,
  selectedNodeKey,
  collapsedNodeKeys,
  onSelect,
  onToggle,
  formationMode = false,
}: {
  root: ExplorerNode;
  selectedNodeKey: string;
  collapsedNodeKeys: Set<string>;
  onSelect: (key: string) => void;
  onToggle: (key: string) => void;
  formationMode?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="grid min-w-[980px] grid-cols-[minmax(270px,1.35fr)_80px_120px_minmax(170px,.85fr)_90px_90px_132px_54px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
        <span>제품/부품명</span>
        <span>Tier</span>
        <span>공급사 유형</span>
        <span>공급사 / 광산명</span>
        <span>공급 비율</span>
        <span>검증률</span>
        <span>리스크 상태</span>
        <span>상세</span>
      </div>
      <div className="overflow-x-auto">
        <SupplyMapRow
          node={root}
          selectedNodeKey={selectedNodeKey}
          collapsedNodeKeys={collapsedNodeKeys}
          onSelect={onSelect}
          onToggle={onToggle}
          formationMode={formationMode}
        />
      </div>
    </div>
  );
}

function SupplyMapRow({
  node,
  selectedNodeKey,
  collapsedNodeKeys,
  onSelect,
  onToggle,
  formationMode = false,
}: {
  node: ExplorerNode;
  selectedNodeKey: string;
  collapsedNodeKeys: Set<string>;
  onSelect: (key: string) => void;
  onToggle: (key: string) => void;
  formationMode?: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = !collapsedNodeKeys.has(node.key);
  const selected = selectedNodeKey === node.key;
  const NodeIcon = getExplorerIcon(node.type);
  const rowTone = getRiskTone(node.status);
  const isProduct = node.type === 'product';
  const hideFormationValues = formationMode;

  return (
    <div className="relative min-w-[980px]">
      {node.depth > 0 && (
        <>
          <div
            className="pointer-events-none absolute top-0 h-full w-px bg-emerald-300"
            style={{ left: `${28 + (node.depth - 1) * 24}px` }}
          />
          <div
            className="pointer-events-none absolute top-[34px] h-px w-5 bg-emerald-300"
            style={{ left: `${28 + (node.depth - 1) * 24}px` }}
          />
        </>
      )}
      <button
        type="button"
        data-testid={node.row ? `supply-map-node-${node.row.part_id}` : `supply-map-node-${node.key}`}
        onClick={() => onSelect(node.key)}
        className={`grid min-h-[72px] w-full grid-cols-[minmax(270px,1.35fr)_80px_120px_minmax(170px,.85fr)_90px_90px_132px_54px] items-center border-b border-slate-100 px-4 text-left transition ${
          selected || isProduct
            ? 'bg-emerald-50/70'
            : rowTone === 'danger'
              ? 'bg-white hover:bg-red-50/40'
              : 'bg-white hover:bg-slate-50'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3" style={{ paddingLeft: `${node.depth * 24}px` }}>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isProduct ? 'bg-emerald-400' : rowTone === 'danger' ? 'bg-red-400' : 'bg-emerald-300'}`} />
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${rowTone === 'danger' ? 'text-red-500' : 'text-ink-400'}`}>
            <NodeIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className={`block truncate ${isProduct ? 'text-[15px] font-bold text-ink-100' : `text-sm font-medium ${rowTone === 'danger' ? 'text-red-900' : 'text-ink-100'}`}`}>{node.label}</span>
            <span className="mt-1 block truncate text-xs font-medium text-slate-500">{node.meta}</span>
          </span>
        </div>
        <span className={`text-sm text-ink-400 ${isProduct ? 'font-semibold' : 'font-medium'}`}>{hideFormationValues ? '-' : node.tier}</span>
        <span className="text-sm font-medium text-ink-400">{hideFormationValues || isProduct ? '-' : node.providerType}</span>
        <span className={`truncate text-sm font-medium ${isProduct || hideFormationValues ? 'text-ink-400' : 'text-ink-100'}`}>{hideFormationValues || isProduct ? '-' : node.supplierName}</span>
        <span className="text-sm font-medium text-ink-100">{hideFormationValues ? '-' : node.supplyRatio}</span>
        <span className="text-sm font-medium text-ink-100">{hideFormationValues ? '-' : node.verificationProgress}</span>
        {hideFormationValues ? <span className="text-sm font-medium text-ink-400">-</span> : <StatusBadge status={node.status} />}
        <span
          role="button"
          tabIndex={0}
          onClick={event => {
            event.stopPropagation();
            if (hasChildren) onToggle(node.key);
          }}
          onKeyDown={event => {
            if ((event.key === 'Enter' || event.key === ' ') && hasChildren) {
              event.preventDefault();
              event.stopPropagation();
              onToggle(node.key);
            }
          }}
          className="inline-flex h-8 w-8 items-center justify-center justify-self-end rounded-md border border-slate-200 bg-white text-ink-400"
          aria-label={hasChildren && isExpanded ? '접기' : '펼치기'}
        >
          <ChevronDown className={`h-4 w-4 transition ${hasChildren && !isExpanded ? '-rotate-90' : ''}`} />
        </span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <SupplyMapRow
              key={child.key}
              node={child}
              selectedNodeKey={selectedNodeKey}
              collapsedNodeKeys={collapsedNodeKeys}
              onSelect={onSelect}
              onToggle={onToggle}
              formationMode={formationMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SupplyChainMapPage() {
  return <SupplyChainMapPageContent />;
}

function MapDetailPanel({ selectedNode, formationMode = false }: { selectedNode: SelectedNode; formationMode?: boolean }) {
  if (formationMode && selectedNode.type === 'product') {
    const detailRows = [
      ['제품 코드', selectedNode.product.product_code],
      ['제품 유형', selectedNode.product.type],
      ['용량', selectedNode.product.specs.capacity],
      ['출고 정보', selectedNode.product.specs.shipment_info],
      ['광물 구성', selectedNode.product.specs.mineral_composition],
    ];

    return (
      <aside className="bg-white">
        <div className="border-b border-slate-200 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-100">
            선택 노드 상세 정보
            <Info className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex items-start gap-3">
            <Gem className="mt-1 h-5 w-5 shrink-0 text-ink-400" />
            <div>
              <h3 className="text-base font-bold text-ink-100">{selectedNode.product.product_name}</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">BOM {selectedNode.bomVersion.version_number}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {detailRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-slate-500">{label}</span>
                <span className="text-right font-semibold text-ink-100">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-slate-500">최종 업데이트</span>
              <span className="text-right font-semibold text-ink-100">-</span>
            </div>
          </div>
          <div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-ink-400">
            <div className="mb-2 font-bold text-ink-100">리스크 요약</div>
            <ul className="space-y-1 text-xs font-medium leading-5">
              <li>· -</li>
            </ul>
          </div>
        </div>
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-100">연결 제품</h3>
            <span className="text-xs font-semibold text-slate-500">연결된 제품 수 1개</span>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-bold text-ink-100">{selectedNode.product.product_name}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">{selectedNode.product.product_code}</div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const row = selectedNode.type === 'product'
    ? selectedNode.rows.find(item => item.risk_status === 'feoc_review') ?? selectedNode.rows.find(item => getRiskTone(item.risk_status) === 'danger') ?? selectedNode.rows[0]
    : selectedNode.row;
  const badge = row?.risk_status ?? (selectedNode.type === 'product' ? selectedNode.product.specs.regulation_status : 'verified');
  const hideFormationValues = formationMode && selectedNode.type !== 'product';

  if (!row) {
    return (
      <aside className="bg-white p-6">
        <h2 className="text-sm font-bold text-ink-100">선택 노드 상세 정보</h2>
      </aside>
    );
  }

  const detailRows = [
    ['Tier', hideFormationValues ? '-' : row.tier],
    ['공급사 유형', hideFormationValues ? '-' : row.provider_type],
    ['공급사', hideFormationValues ? '-' : row.supplier_name],
    ['공급 비율', hideFormationValues ? '-' : `${row.supply_ratio}%`],
    ['검증률', hideFormationValues ? '-' : row.verification_progress],
  ];

  return (
    <aside className="bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-100">
          선택 노드 상세 정보
          <Info className="h-4 w-4 text-slate-400" />
        </div>
        <div className="flex items-start gap-3">
          <Gem className={`mt-1 h-5 w-5 shrink-0 ${getRiskTone(badge) === 'danger' ? 'text-red-500' : 'text-ink-400'}`} />
          <div>
            <h3 className="text-base font-bold text-ink-100">{row.part_name}</h3>
            <p className="mt-1 text-xs font-medium text-slate-500">{row.material_or_mineral}</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {detailRows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-slate-500">{label}</span>
              <span className="text-right font-semibold text-ink-100">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-slate-500">리스크 상태</span>
            {hideFormationValues ? <span className="text-right font-semibold text-ink-100">-</span> : <StatusBadge status={row.risk_status} />}
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-slate-500">최종 업데이트</span>
            <span className="text-right font-semibold text-ink-100">{hideFormationValues ? '-' : '2025.05.14 09:30'}</span>
          </div>
        </div>
        <div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-ink-400">
          <div className="mb-2 font-bold text-ink-100">리스크 요약</div>
          <ul className="space-y-1 text-xs font-medium leading-5">
            {hideFormationValues ? (
              <li>· -</li>
            ) : (
              <>
                <li>· 원산지: 중국 발생 가능성 있음</li>
                <li>· FEOC 관련 규제 검토 필요</li>
                <li>· 추가 증빙 서류 요청됨</li>
              </>
            )}
          </ul>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink-100">연결 제품</h3>
          <span className="text-xs font-semibold text-slate-500">연결된 제품 수 {hideFormationValues ? '-' : '3개'}</span>
        </div>
        <div className="space-y-3 text-sm">
          {hideFormationValues ? (
            <div>
              <div className="font-bold text-ink-100">-</div>
              <div className="mt-1 text-xs font-medium text-slate-500">-</div>
            </div>
          ) : (
            [
              ['Battery Cell A', 'BAT-NCM811-100Ah'],
              ['Battery Module B', 'BOM-MODULE-B'],
              ['ESS Pack C', 'ESS-PACK-C'],
            ].map(([name, code]) => (
              <div key={name}>
                <div className="font-bold text-ink-100">{name}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">{code}</div>
              </div>
            ))
          )}
        </div>
        {!hideFormationValues && supplierDetailIdMap[row.supplier_id] ? (
          <Link
            href={`/suppliers/${supplierDetailIdMap[row.supplier_id]}/info`}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-sm font-semibold text-ink-400 hover:bg-slate-50"
          >
            공급사 상세 페이지로 이동
            <ExternalLink className="h-4 w-4" />
          </Link>
        ) : (
          <button disabled className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400 cursor-not-allowed">
            공급사 상세 페이지로 이동
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}

function SupplyMapStats({ rows }: { rows: TraceRow[] }) {
  const verifiedCount = rows.filter(row => row.risk_status === 'verified').length;
  return (
    <section className="mt-4 grid grid-cols-6 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
      <StatCell label="전체 공급망 노드" value="128" suffix="개" />
      <StatCell label="공급사" value="42" suffix="개" />
      <StatCell label="원자재 / 광산" value="57" suffix="개" />
      <StatCell label="FEOC 검토 필요" value="7" suffix="개" tone="danger" />
      <StatCell label="실사 필요" value="3" suffix="개" tone="warning" />
      <StatCell label="검증완료" value={`${Math.max(96, verifiedCount)}`} suffix="개" tone="success" />
    </section>
  );
}

function StatCell({ label, value, suffix, tone = 'default' }: { label: string; value: string; suffix: string; tone?: 'default' | 'danger' | 'warning' | 'success' }) {
  const color = tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-orange-500' : tone === 'success' ? 'text-emerald-600' : 'text-ink-100';
  return (
    <div className="px-5 text-center first:pl-0 last:pr-0">
      <div className={`text-xs font-bold ${tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-orange-500' : 'text-ink-400'}`}>{label}</div>
      <div className={`mt-2 text-3xl font-black ${color}`}>
        {value}
        <span className="ml-1 text-sm font-bold text-ink-400">{suffix}</span>
      </div>
    </div>
  );
}

function LegendBadge({ status }: { status: RiskStatus }) {
  return <StatusBadge status={status} />;
}

function getExplorerIcon(type: ExplorerNode['type']) {
  if (type === 'product') return Box;
  if (type === 'part') return Package;
  return Gem;
}

function StatusBadge({ status }: { status: RiskStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex items-center justify-center gap-1 rounded-full border px-2 py-1 text-xs font-bold ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}
