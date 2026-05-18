// ============================================================
// BOM / 부품 / 원산지 더미 데이터
// schema.sql 영역 4 (products, bom_versions, parts, bom_items,
// part_code_mapping, manufacturing_process) 매핑
//
// 5계층 트리: Pack(1) → Module(2) → Cell(3) → 전구체(4) → 광물(5)
// FTA 서류에서 추출한 항목들이 자연스럽게 녹아 있음:
//   - hs_code (HS코드 6자리)
//   - unit_price (단가)
//   - origin_country (원산지국)
//   - manufacturing_process (제조공정도)
// ============================================================

// === 제품 (products) ===
export interface Product {
  id: string;              // product_id
  productCode: string;     // product_code
  productName: string;     // product_name
  manufacturerId: string;  // suppliers.supplier_id
  type: string;            // 각형/파우치형
  specs: {
    weight_kg: number;
    capacity_kWh: number;
    voltage_V: number;
  };
}

export const products: Product[] = [
  {
    id: 'P-001',
    productCode: 'BAT-NCM811-100Ah',
    productName: 'Premium NCM811 100Ah EV Battery Pack',
    manufacturerId: 'S-CELL-001',
    type: '각형',
    specs: { weight_kg: 387.2, capacity_kWh: 75.6, voltage_V: 756 },
  },
];

// === BOM 버전 (bom_versions) ===
export interface BomVersion {
  id: string;
  productId: string;
  versionNumber: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'draft' | 'active' | 'deprecated';
  approvedBy: string;
  approvedAt: string;
  createdAt: string;
}

export const bomVersions: BomVersion[] = [
  {
    id: 'BV-001',
    productId: 'P-001',
    versionNumber: 'v2.4',
    effectiveFrom: '2026-04-01',
    effectiveTo: null,
    status: 'active',
    approvedBy: '김정민 ESG팀장',
    approvedAt: '2026-03-28 14:22',
    createdAt: '2026-03-25 09:15',
  },
  {
    id: 'BV-002',
    productId: 'P-001',
    versionNumber: 'v2.3',
    effectiveFrom: '2025-12-01',
    effectiveTo: '2026-03-31',
    status: 'deprecated',
    approvedBy: '박서연 ESG팀장',
    approvedAt: '2025-11-25 11:08',
    createdAt: '2025-11-20 16:42',
  },
];

// === 부품 (parts) — 5계층 트리 ===
export type TierLevel = 1 | 2 | 3 | 4 | 5;

export interface Part {
  id: string;              // part_id
  partCode: string;        // part_code
  partName: string;        // part_name
  tierLevel: TierLevel;    // 1=Pack 2=Module 3=Cell 4=전구체 5=광물
  parentPartId: string | null;
  hsCode: string;          // 6자리 이상 (FTA에서 가져온 필수 항목)
  materialType: string;
  functionPurpose: string;
  unitPrice: number;       // 단가 (USD)
  purchaseUnit: string;
  specs?: Record<string, any>;
}

export const parts: Part[] = [
  // === Tier 1: Pack (1개) ===
  {
    id: 'PRT-001',
    partCode: 'PACK-NCM811-100Ah',
    partName: 'NCM811 배터리 팩',
    tierLevel: 1,
    parentPartId: null,
    hsCode: '850760',
    materialType: 'Pack Assembly',
    functionPurpose: 'EV 구동용 통합 배터리 팩 (BMS/냉각/케이싱 포함)',
    unitPrice: 8420.00,
    purchaseUnit: 'EA',
    specs: { modules: 12 },
  },

  // === Tier 2: Module (2개) ===
  {
    id: 'PRT-002',
    partCode: 'MOD-NCM811-12S',
    partName: 'NCM811 모듈 (12 셀)',
    tierLevel: 2,
    parentPartId: 'PRT-001',
    hsCode: '850760',
    materialType: 'Module Assembly',
    functionPurpose: '12개 셀의 직렬 조립체, BMS 통신 포트 포함',
    unitPrice: 612.50,
    purchaseUnit: 'EA',
  },
  {
    id: 'PRT-003',
    partCode: 'BMS-V3-100Ah',
    partName: 'BMS 컨트롤러',
    tierLevel: 2,
    parentPartId: 'PRT-001',
    hsCode: '853710',
    materialType: 'Electronic Module',
    functionPurpose: '셀 전압/온도 모니터링 및 밸런싱 제어',
    unitPrice: 142.00,
    purchaseUnit: 'EA',
  },

  // === Tier 3: Cell (1개) ===
  {
    id: 'PRT-004',
    partCode: 'CELL-NCM811-100Ah',
    partName: 'NCM811 셀',
    tierLevel: 3,
    parentPartId: 'PRT-002',
    hsCode: '850760',
    materialType: 'Li-ion Cell',
    functionPurpose: '리튬이온 단위 셀 (100Ah, 3.7V)',
    unitPrice: 48.75,
    purchaseUnit: 'EA',
  },

  // === Tier 4: 전구체/소재 (3개) ===
  {
    id: 'PRT-005',
    partCode: 'CAM-NCM811',
    partName: 'NCM811 양극재',
    tierLevel: 4,
    parentPartId: 'PRT-004',
    hsCode: '282200',
    materialType: 'Cathode Active Material',
    functionPurpose: 'Ni 80% · Co 10% · Mn 10% 조성의 층상구조 활물질',
    unitPrice: 28.40,
    purchaseUnit: 'kg',
  },
  {
    id: 'PRT-006',
    partCode: 'ANO-GRAPHITE',
    partName: '천연흑연 음극재',
    tierLevel: 4,
    parentPartId: 'PRT-004',
    hsCode: '380110',
    materialType: 'Anode Active Material',
    functionPurpose: 'Li 이온 삽입/탈리 가역 가능한 흑연 음극',
    unitPrice: 8.20,
    purchaseUnit: 'kg',
  },
  {
    id: 'PRT-007',
    partCode: 'PRE-NCM',
    partName: 'NCM 전구체',
    tierLevel: 4,
    parentPartId: 'PRT-005',
    hsCode: '282200',
    materialType: 'Precursor',
    functionPurpose: 'Ni-Co-Mn 수산화물 (양극재 합성 직전 단계)',
    unitPrice: 14.80,
    purchaseUnit: 'kg',
  },

  // === Tier 5: 광물 (4개) ===
  {
    id: 'PRT-008',
    partCode: 'MIN-NI',
    partName: '니켈 원광',
    tierLevel: 5,
    parentPartId: 'PRT-007',
    hsCode: '260400',
    materialType: 'Raw Mineral',
    functionPurpose: '양극재 주요 구성 원소 (NCM811의 80%)',
    unitPrice: 18.50,
    purchaseUnit: 'kg',
  },
  {
    id: 'PRT-009',
    partCode: 'MIN-CO',
    partName: '황산코발트',
    tierLevel: 5,
    parentPartId: 'PRT-007',
    hsCode: '283322',
    materialType: 'Refined Mineral',
    functionPurpose: '양극재 안정성 확보용 (NCM811의 10%)',
    unitPrice: 32.80,
    purchaseUnit: 'kg',
  },
  {
    id: 'PRT-010',
    partCode: 'MIN-LI',
    partName: '수산화리튬',
    tierLevel: 5,
    parentPartId: 'PRT-005',
    hsCode: '282520',
    materialType: 'Refined Mineral',
    functionPurpose: '리튬이온 셀의 전하 운반 매개체',
    unitPrice: 84.50,
    purchaseUnit: 'kg',
  },
  {
    id: 'PRT-011',
    partCode: 'MIN-MN',
    partName: '망간 원광',
    tierLevel: 5,
    parentPartId: 'PRT-007',
    hsCode: '260200',
    materialType: 'Raw Mineral',
    functionPurpose: '양극재 구조 안정화 (NCM811의 10%)',
    unitPrice: 4.20,
    purchaseUnit: 'kg',
  },
];

// === BOM 항목 (bom_items) ===
// 각 부품이 상위 부품에 몇 개/몇 % 들어가는지
export interface BomItem {
  id: string;
  bomVersionId: string;
  partId: string;
  requiredQuantity: number;
  requiredQuantityUnit: string;
  percentage: number;       // 상위 부품 대비 무게/원가 비율
  directMaterialCost: number;
  originCountry: string;    // ISO 2자리 (FTA 흡수 항목)
}

export const bomItems: BomItem[] = [
  // Pack → Module
  { id: 'BI-001', bomVersionId: 'BV-001', partId: 'PRT-002', requiredQuantity: 12, requiredQuantityUnit: 'EA', percentage: 87.4, directMaterialCost: 7350.00, originCountry: 'KR' },
  { id: 'BI-002', bomVersionId: 'BV-001', partId: 'PRT-003', requiredQuantity: 1,  requiredQuantityUnit: 'EA', percentage: 1.7,  directMaterialCost: 142.00,  originCountry: 'KR' },
  // Module → Cell
  { id: 'BI-003', bomVersionId: 'BV-001', partId: 'PRT-004', requiredQuantity: 12, requiredQuantityUnit: 'EA', percentage: 95.5, directMaterialCost: 585.00,  originCountry: 'KR' },
  // Cell → 양극재/음극재
  { id: 'BI-004', bomVersionId: 'BV-001', partId: 'PRT-005', requiredQuantity: 0.94, requiredQuantityUnit: 'kg', percentage: 54.8, directMaterialCost: 26.70, originCountry: 'KR' },
  { id: 'BI-005', bomVersionId: 'BV-001', partId: 'PRT-006', requiredQuantity: 0.62, requiredQuantityUnit: 'kg', percentage: 10.4, directMaterialCost: 5.08,  originCountry: 'JP' },
  // 양극재 → 전구체
  { id: 'BI-006', bomVersionId: 'BV-001', partId: 'PRT-007', requiredQuantity: 0.78, requiredQuantityUnit: 'kg', percentage: 40.6, directMaterialCost: 11.54, originCountry: 'KR' },
  // 전구체 → 광물
  { id: 'BI-007', bomVersionId: 'BV-001', partId: 'PRT-008', requiredQuantity: 0.51, requiredQuantityUnit: 'kg', percentage: 63.7, directMaterialCost: 9.44, originCountry: 'AU' },
  { id: 'BI-008', bomVersionId: 'BV-001', partId: 'PRT-009', requiredQuantity: 0.082, requiredQuantityUnit: 'kg', percentage: 18.2, directMaterialCost: 2.69, originCountry: 'CN' },
  { id: 'BI-009', bomVersionId: 'BV-001', partId: 'PRT-011', requiredQuantity: 0.078, requiredQuantityUnit: 'kg', percentage: 2.2, directMaterialCost: 0.33, originCountry: 'ZA' },
  // 양극재 → 리튬 (직접)
  { id: 'BI-010', bomVersionId: 'BV-001', partId: 'PRT-010', requiredQuantity: 0.124, requiredQuantityUnit: 'kg', percentage: 36.8, directMaterialCost: 10.48, originCountry: 'CL' },
];

// === 부품 코드 매핑 (part_code_mapping) ===
// 협력사 코드 ↔ 원청 코드 (PROJECT_CONTEXT 핵심 기능)
export interface PartCodeMapping {
  id: string;
  partId: string;
  supplierId: string;
  supplierPartCode: string;   // 협력사가 부르는 이름
  originalPartCode: string;   // 원청이 부르는 이름
}

export const partCodeMappings: PartCodeMapping[] = [
  { id: 'PCM-001', partId: 'PRT-005', supplierId: 'S-CAM-001', supplierPartCode: 'POS-CAM-NCM-811-A',  originalPartCode: 'CAM-NCM811' },
  { id: 'PCM-002', partId: 'PRT-006', supplierId: 'S-ANO-001', supplierPartCode: 'MIT-ANODE-NG-K2',   originalPartCode: 'ANO-GRAPHITE' },
  { id: 'PCM-003', partId: 'PRT-007', supplierId: 'S-PRE-001', supplierPartCode: 'QZ-PRE-NCM-OH',     originalPartCode: 'PRE-NCM' },
  { id: 'PCM-004', partId: 'PRT-008', supplierId: 'S-MINE-001', supplierPartCode: 'NORI-NCL-RAW',     originalPartCode: 'MIN-NI' },
  { id: 'PCM-005', partId: 'PRT-009', supplierId: 'S-REF-002', supplierPartCode: 'GZ-COSO4-99',       originalPartCode: 'MIN-CO' },
  { id: 'PCM-006', partId: 'PRT-010', supplierId: 'S-REF-001', supplierPartCode: 'PRW-LIOH-BTG',      originalPartCode: 'MIN-LI' },
];

// === 제조공정도 (manufacturing_process) ===
// FTA에서 "제조공정도 필수" → schema의 manufacturing_process 테이블로 흡수
export interface ManufacturingProcess {
  id: string;
  partId: string;
  sequenceNo: number;
  processName: string;
  processDescription: string;
  isOutsourced: boolean;
  outsourcedToSupplierId: string | null;
  processImageUrl: string | null;
}

export const manufacturingProcesses: ManufacturingProcess[] = [
  // 양극재 제조공정 (PRT-005)
  { id: 'MP-001', partId: 'PRT-005', sequenceNo: 1, processName: '전구체 입고 검사',     processDescription: 'NCM 수산화물 전구체 입자 분포, 수분 함량 측정',         isOutsourced: false, outsourcedToSupplierId: null, processImageUrl: '/process/cam-01.svg' },
  { id: 'MP-002', partId: 'PRT-005', sequenceNo: 2, processName: '리튬 혼합 및 소성',    processDescription: '수산화리튬과 1:1.05 몰비 혼합 후 750°C 10시간 소성',     isOutsourced: false, outsourcedToSupplierId: null, processImageUrl: '/process/cam-02.svg' },
  { id: 'MP-003', partId: 'PRT-005', sequenceNo: 3, processName: '분쇄 및 분급',        processDescription: '입자 크기 D50 = 10±2μm로 분급, 자성이물 제거',           isOutsourced: false, outsourcedToSupplierId: null, processImageUrl: '/process/cam-03.svg' },
  { id: 'MP-004', partId: 'PRT-005', sequenceNo: 4, processName: '표면 코팅',          processDescription: 'Al2O3 0.5wt% 표면 코팅으로 사이클 안정성 확보 (외주)',     isOutsourced: true,  outsourcedToSupplierId: 'S-CAM-002', processImageUrl: '/process/cam-04.svg' },
  { id: 'MP-005', partId: 'PRT-005', sequenceNo: 5, processName: '품질 검사 및 포장',   processDescription: '용량/저항/입도 전수 검사, 진공 포장 후 출하',             isOutsourced: false, outsourcedToSupplierId: null, processImageUrl: '/process/cam-05.svg' },

  // 전구체 제조공정 (PRT-007)
  { id: 'MP-006', partId: 'PRT-007', sequenceNo: 1, processName: '금속염 용해',        processDescription: 'NiSO4·CoSO4·MnSO4 8:1:1 몰비 수용액 제조',               isOutsourced: false, outsourcedToSupplierId: null, processImageUrl: null },
  { id: 'MP-007', partId: 'PRT-007', sequenceNo: 2, processName: '공침 반응',          processDescription: 'NaOH/NH4OH 첨가로 pH 11.5에서 50시간 공침 반응',         isOutsourced: false, outsourcedToSupplierId: null, processImageUrl: null },
  { id: 'MP-008', partId: 'PRT-007', sequenceNo: 3, processName: '세척 및 건조',      processDescription: '폐액 분리 후 110°C 진공 건조',                              isOutsourced: false, outsourcedToSupplierId: null, processImageUrl: null },
];

// === 부품-협력사 매핑 (어느 부품을 어느 협력사가 공급하는가) ===
// 사실상 supply_chain_map의 단순 뷰
export interface PartSupplier {
  partId: string;
  supplierId: string;
  isPrimary: boolean;
  supplyRatio: number;     // 0~100
}

export const partSuppliers: PartSupplier[] = [
  { partId: 'PRT-001', supplierId: 'S-CELL-001', isPrimary: true,  supplyRatio: 100 },
  { partId: 'PRT-002', supplierId: 'S-CELL-001', isPrimary: true,  supplyRatio: 100 },
  { partId: 'PRT-003', supplierId: 'S-CELL-001', isPrimary: true,  supplyRatio: 100 },
  { partId: 'PRT-004', supplierId: 'S-CELL-001', isPrimary: true,  supplyRatio: 100 },
  { partId: 'PRT-005', supplierId: 'S-CAM-001',  isPrimary: true,  supplyRatio: 65 },
  { partId: 'PRT-005', supplierId: 'S-CAM-002',  isPrimary: false, supplyRatio: 35 },
  { partId: 'PRT-006', supplierId: 'S-ANO-001',  isPrimary: true,  supplyRatio: 100 },
  { partId: 'PRT-007', supplierId: 'S-PRE-001',  isPrimary: true,  supplyRatio: 100 },
  { partId: 'PRT-008', supplierId: 'S-MINE-001', isPrimary: true,  supplyRatio: 100 },
  { partId: 'PRT-009', supplierId: 'S-REF-002',  isPrimary: true,  supplyRatio: 100 },
  { partId: 'PRT-010', supplierId: 'S-REF-001',  isPrimary: true,  supplyRatio: 100 },
  { partId: 'PRT-011', supplierId: 'S-MINE-003', isPrimary: true,  supplyRatio: 100 },
];

// === 데이터 완성도 (data_completeness_status 뷰) ===
// 부품별로 필수 필드가 얼마나 채워졌는지
export interface PartCompleteness {
  partId: string;
  requiredFieldCount: number;
  filledFieldCount: number;
  completionRate: number;
  missingFields: string[];
  lastUpdatedAt: string;
}

export const partCompleteness: PartCompleteness[] = [
  { partId: 'PRT-001', requiredFieldCount: 12, filledFieldCount: 12, completionRate: 100, missingFields: [], lastUpdatedAt: '2026-05-13 09:22' },
  { partId: 'PRT-002', requiredFieldCount: 10, filledFieldCount: 10, completionRate: 100, missingFields: [], lastUpdatedAt: '2026-05-13 09:25' },
  { partId: 'PRT-003', requiredFieldCount: 8,  filledFieldCount: 8,  completionRate: 100, missingFields: [], lastUpdatedAt: '2026-05-12 14:08' },
  { partId: 'PRT-004', requiredFieldCount: 14, filledFieldCount: 14, completionRate: 100, missingFields: [], lastUpdatedAt: '2026-05-13 11:45' },
  { partId: 'PRT-005', requiredFieldCount: 14, filledFieldCount: 13, completionRate: 92.8, missingFields: ['process_image_url (4단계)'], lastUpdatedAt: '2026-05-12 16:30' },
  { partId: 'PRT-006', requiredFieldCount: 12, filledFieldCount: 12, completionRate: 100, missingFields: [], lastUpdatedAt: '2026-05-11 10:14' },
  { partId: 'PRT-007', requiredFieldCount: 12, filledFieldCount: 9,  completionRate: 75.0, missingFields: ['process_image_url', 'specs.purity', 'unit_price (최신)'], lastUpdatedAt: '2026-05-08 13:50' },
  { partId: 'PRT-008', requiredFieldCount: 10, filledFieldCount: 8,  completionRate: 80.0, missingFields: ['certifications', 'mine_coordinates'], lastUpdatedAt: '2026-05-09 11:02' },
  { partId: 'PRT-009', requiredFieldCount: 10, filledFieldCount: 6,  completionRate: 60.0, missingFields: ['certifications', 'mining_method', 'feoc_disclosure', 'extraction_volume'], lastUpdatedAt: '2026-04-28 09:40' },
  { partId: 'PRT-010', requiredFieldCount: 10, filledFieldCount: 10, completionRate: 100, missingFields: [], lastUpdatedAt: '2026-05-10 08:55' },
  { partId: 'PRT-011', requiredFieldCount: 10, filledFieldCount: 7,  completionRate: 70.0, missingFields: ['certifications', 'extraction_volume', 'unit_price'], lastUpdatedAt: '2026-05-05 15:18' },
];

// === 헬퍼: 트리 구조 빌더 ===
export interface PartTreeNode extends Part {
  children: PartTreeNode[];
  supplierIds: string[];     // 이 부품을 공급하는 협력사들
  completeness?: PartCompleteness;
  originCountries: string[]; // 이 부품의 BOM item이 가지는 원산지국들
}

export function buildPartTree(rootPartId: string = 'PRT-001'): PartTreeNode | null {
  const root = parts.find(p => p.id === rootPartId);
  if (!root) return null;

  function build(part: Part): PartTreeNode {
    const childParts = parts.filter(p => p.parentPartId === part.id);
    const supplierIds = partSuppliers
      .filter(ps => ps.partId === part.id)
      .map(ps => ps.supplierId);
    const completeness = partCompleteness.find(c => c.partId === part.id);
    const originCountries = Array.from(new Set(
      bomItems.filter(bi => bi.partId === part.id).map(bi => bi.originCountry)
    ));
    return {
      ...part,
      children: childParts.map(build),
      supplierIds,
      completeness,
      originCountries,
    };
  }

  return build(root);
}
