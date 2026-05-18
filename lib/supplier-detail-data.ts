// ============================================================
// 공급망 맵 협력사 상세 정보 데이터
// schema.sql 매핑:
//   - supplier_contacts (담당자 다중)
//   - supplier_factories (본사/공장 분리, 좌표, 가동기간)
//   - supplier_certifications (인증서 + 만료일)
//   - supplier_manufacturer_details / _miner_details (provider_type별)
//   - purchase_orders → supply_chain_map.po_number (PO 단위 부품 매핑)
//   - supply_ratio (공급 비율 %)
//   - parts, bom_items, part_code_mapping (부품 매핑)
//   - manufacturing_process (제조공정도)
//   - data_completeness_status (완성도)
//   - data_request_log (리마인드 이력)
//   - view_permissions (권한)
//
// 데이터 흡수 메모:
//   - FTA 항목(HS코드/원산지/단가/제조공정)은 부품·BOM·공정 데이터로 흡수
//   - 부품 5계층(Pack→Module→Cell→전구체→광물) 유지하되 협력사 상세에서만 활용
// ============================================================

import { suppliers as supplierList } from './data';

// ============================================================
// 1. 협력사 확장 정보 (기업 일반정보)
// ============================================================
export interface SupplierExtended {
  supplierId: string;
  businessRegNo: string;     // 사업자 등록번호
  corporateRegNo: string;    // 법인 등록번호
  dunsNumber: string;        // DUNS
  taxNumber: string;         // 해외 Tax Number
  ceoName: string;
  website: string;
  providerType: 'manufacturer' | 'recycler' | 'trader' | 'miner';
  establishedYear: number;
  employeeCount: number;
}

export const supplierExtended: SupplierExtended[] = [
  { supplierId: 'S-CELL-001', businessRegNo: '123-45-67890',  corporateRegNo: '110111-1234567', dunsNumber: '687453291', taxNumber: 'KR-CELL-001',   ceoName: '한정민', website: 'https://hanyang-cell.co.kr',  providerType: 'manufacturer', establishedYear: 2008, employeeCount: 1240 },
  { supplierId: 'S-CAM-001',  businessRegNo: '234-56-78901',  corporateRegNo: '110111-2345678', dunsNumber: '687453292', taxNumber: 'KR-CAM-001',    ceoName: '박지훈', website: 'https://pos-cathode.com',     providerType: 'manufacturer', establishedYear: 2012, employeeCount: 580 },
  { supplierId: 'S-CAM-002',  businessRegNo: 'CN-91370600',   corporateRegNo: '91370600-X',     dunsNumber: '687453293', taxNumber: 'CN-CAM-002',    ceoName: 'Wei Liu',  website: 'https://yantai-cathode.cn',  providerType: 'manufacturer', establishedYear: 2015, employeeCount: 420 },
  { supplierId: 'S-ANO-001',  businessRegNo: 'JP-2700-01-12', corporateRegNo: 'JP-OSA-2700-01', dunsNumber: '687453294', taxNumber: 'JP-ANO-001',    ceoName: '田中浩',   website: 'https://mitsui-anode.jp',     providerType: 'manufacturer', establishedYear: 1995, employeeCount: 880 },
  { supplierId: 'S-PRE-001',  businessRegNo: 'CN-91440100',   corporateRegNo: '91440100-P',     dunsNumber: '687453295', taxNumber: 'CN-PRE-001',    ceoName: 'Jian Zhao', website: 'https://qz-precursor.cn',   providerType: 'manufacturer', establishedYear: 2010, employeeCount: 690 },
  { supplierId: 'S-REF-001',  businessRegNo: 'AU-ABN-12345',  corporateRegNo: 'AU-WA-PRW-001',  dunsNumber: '687453296', taxNumber: 'AU-REF-001',    ceoName: 'James Wilson', website: 'https://piw-refining.au', providerType: 'manufacturer', establishedYear: 1988, employeeCount: 1450 },
  { supplierId: 'S-REF-002',  businessRegNo: 'CN-91360700',   corporateRegNo: '91360700-G',     dunsNumber: '687453297', taxNumber: 'CN-REF-002',    ceoName: 'Hong Chen', website: 'https://ganzhou-rare.cn',   providerType: 'manufacturer', establishedYear: 2005, employeeCount: 320 },
  { supplierId: 'S-MINE-001', businessRegNo: 'PH-DENR-NCL',   corporateRegNo: 'PH-NORI-2018',   dunsNumber: '687453298', taxNumber: 'PH-MINE-001',   ceoName: 'Roberto Cruz', website: 'https://nori-mining.ph', providerType: 'miner',       establishedYear: 2003, employeeCount: 2100 },
  { supplierId: 'S-MINE-002', businessRegNo: 'CD-DGRAD-COB',  corporateRegNo: 'CD-KAT-2014',    dunsNumber: '687453299', taxNumber: 'CD-MINE-002',   ceoName: 'Jean-Paul Mwamba', website: 'https://kat-cobalt.cd', providerType: 'miner',  establishedYear: 2014, employeeCount: 1680 },
  { supplierId: 'S-MINE-003', businessRegNo: 'CL-RUT-LIO',    corporateRegNo: 'CL-SDA-2010',    dunsNumber: '687453300', taxNumber: 'CL-MINE-003',   ceoName: 'Maria Vega', website: 'https://sda-lithium.cl',  providerType: 'miner',       establishedYear: 2010, employeeCount: 420 },
];

// ============================================================
// 2. 담당자 다중 (supplier_contacts)
// ============================================================
export interface SupplierContact {
  contactId: string;
  supplierId: string;
  name: string;
  role: 'CEO' | 'ESG' | 'Sales' | 'Purchasing';
  email: string;
  phone: string;
  isPrimary: boolean;
}

export const supplierContacts: SupplierContact[] = [
  // S-CELL-001 (Hanyang Cell)
  { contactId: 'C-001', supplierId: 'S-CELL-001', name: '한정민', role: 'CEO',        email: 'ceo@hanyang-cell.co.kr',   phone: '+82-43-220-1000', isPrimary: false },
  { contactId: 'C-002', supplierId: 'S-CELL-001', name: '윤서아', role: 'ESG',        email: 'esg@hanyang-cell.co.kr',   phone: '+82-43-220-1182', isPrimary: true  },
  { contactId: 'C-003', supplierId: 'S-CELL-001', name: '이도현', role: 'Sales',      email: 'sales@hanyang-cell.co.kr', phone: '+82-43-220-1240', isPrimary: false },
  // S-CAM-001 (POS Cathode)
  { contactId: 'C-004', supplierId: 'S-CAM-001',  name: '박지훈', role: 'CEO',        email: 'ceo@pos-cathode.com',      phone: '+82-54-279-1000', isPrimary: false },
  { contactId: 'C-005', supplierId: 'S-CAM-001',  name: '김민서', role: 'ESG',        email: 'esg@pos-cathode.com',      phone: '+82-54-279-1180', isPrimary: true  },
  { contactId: 'C-006', supplierId: 'S-CAM-001',  name: '정수빈', role: 'Sales',      email: 'k.sales@pos-cathode.com',  phone: '+82-54-279-1320', isPrimary: false },
  // S-CAM-002 (Yantai)
  { contactId: 'C-007', supplierId: 'S-CAM-002',  name: 'Wei Liu',     role: 'CEO',   email: 'wei.liu@yantai-cathode.cn',   phone: '+86-535-690-1000', isPrimary: false },
  { contactId: 'C-008', supplierId: 'S-CAM-002',  name: 'Chen Hua',    role: 'ESG',   email: 'chen.hua@yantai-cathode.cn',  phone: '+86-535-690-1188', isPrimary: true  },
  // S-ANO-001 (Mitsui)
  { contactId: 'C-009', supplierId: 'S-ANO-001',  name: '田中浩',  role: 'CEO',       email: 'tanaka@mitsui-anode.jp',   phone: '+81-6-6202-1000', isPrimary: false },
  { contactId: 'C-010', supplierId: 'S-ANO-001',  name: '佐藤美穗',role: 'ESG',       email: 'sato@mitsui-anode.jp',     phone: '+81-6-6202-1185', isPrimary: true  },
  // S-PRE-001 (QZ Precursor)
  { contactId: 'C-011', supplierId: 'S-PRE-001',  name: 'Jian Zhao',   role: 'ESG',   email: 'jian.zhao@qz-precursor.cn',   phone: '+86-20-380-1188', isPrimary: true  },
  { contactId: 'C-012', supplierId: 'S-PRE-001',  name: 'Mei Lin',     role: 'Sales', email: 'mei.lin@qz-precursor.cn',     phone: '+86-20-380-1240', isPrimary: false },
  // S-REF-001 (Pilbara Refining)
  { contactId: 'C-013', supplierId: 'S-REF-001',  name: 'Emma Watson', role: 'ESG',   email: 'emma.w@piw-refining.au',   phone: '+61-8-9200-1180', isPrimary: true  },
  // S-REF-002 (Ganzhou)
  { contactId: 'C-014', supplierId: 'S-REF-002',  name: 'Hong Chen',   role: 'CEO',   email: 'hong.chen@ganzhou-rare.cn', phone: '+86-797-820-1000', isPrimary: true  },
  // S-MINE-001 (Nori Philippines)
  { contactId: 'C-015', supplierId: 'S-MINE-001', name: 'Mary Reyes',  role: 'ESG',   email: 'm.reyes@nori-mining.ph',   phone: '+63-2-8855-1180', isPrimary: true  },
  // S-MINE-002 (Kat Cobalt DRC)
  { contactId: 'C-016', supplierId: 'S-MINE-002', name: 'Jean-Paul M.', role: 'CEO',  email: 'jp.mwamba@kat-cobalt.cd',  phone: '+243-99-555-1000', isPrimary: true  },
  // S-MINE-003 (SdA Lithium Chile)
  { contactId: 'C-017', supplierId: 'S-MINE-003', name: 'Maria Vega',  role: 'CEO',   email: 'm.vega@sda-lithium.cl',    phone: '+56-2-2335-1000', isPrimary: false },
  { contactId: 'C-018', supplierId: 'S-MINE-003', name: 'Carlos Diaz', role: 'ESG',   email: 'c.diaz@sda-lithium.cl',    phone: '+56-2-2335-1180', isPrimary: true  },
];

// ============================================================
// 3. 공장(사업장) - 본사 vs 생산 공장 분리
// 팀원 코드 컨셉 흡수: 공장별 납품처(EU/US/BOTH) + 적용 규제 + 공급 비율
// ============================================================
export type Regulation = 'EUDR' | 'CSDDD' | 'UFLPA' | 'IRA' | 'EU_BATTERY' | 'CBAM' | 'EUDR_FSC';
export type Destination = 'EU' | 'US' | 'BOTH' | 'KR';

export interface Factory {
  factoryId: string;
  supplierId: string;
  factoryName: string;
  factoryRole: 'headquarters' | 'production' | 'outsourcing' | 'processing' | 'mining';
  address: string;
  country: string;
  region: string;
  coordinates: [number, number];     // [lng, lat]
  operatingPeriodFrom: string;
  operatingPeriodTo: string | null;
  monthlyCapacity?: string;
  isActive: boolean;
  // 신규: 정의서 + 팀원 코드 컨셉
  destination?: Destination;          // 이 공장이 납품하는 시장 (본사는 없음)
  destinationDetail?: string;         // "BMW 폴란드 (EU)", "GM 테네시 (US)" 등 상세
  applicableRegulations?: Regulation[]; // 적용 규제 목록
  hiddenRegulations?: Regulation[];   // 자동 숨김 규제 (다른 시장 규제)
  supplyRatioPercent?: number;        // 같은 부품 공급 중 이 공장의 비율 (분할 납품 시)
  supplyQuantity?: string;            // "50개", "480 kg" 등
}

export const factories: Factory[] = [
  // Hanyang Cell — T1 (셀·모듈·팩 통합 제조)
  { factoryId: 'F-001', supplierId: 'S-CELL-001', factoryName: '한양셀 본사', factoryRole: 'headquarters', address: '서울특별시 강남구 테헤란로 152', country: 'KR', region: '서울 강남', coordinates: [127.0397, 37.4998], operatingPeriodFrom: '2008-03-15', operatingPeriodTo: null, isActive: true },
  { factoryId: 'F-002', supplierId: 'S-CELL-001', factoryName: '청주 1공장 (NCM811 셀)', factoryRole: 'production', address: '충북 청주시 흥덕구 오송생명로 200', country: 'KR', region: '충북 청주', coordinates: [127.4914, 36.6424], operatingPeriodFrom: '2018-06-01', operatingPeriodTo: null, monthlyCapacity: '2.4 GWh', isActive: true,
    destination: 'BOTH', destinationDetail: 'BMW 폴란드 + GM 테네시', applicableRegulations: ['EUDR', 'UFLPA', 'IRA', 'CSDDD', 'EU_BATTERY'], hiddenRegulations: [], supplyRatioPercent: 60, supplyQuantity: '1.44 GWh/월' },
  { factoryId: 'F-003', supplierId: 'S-CELL-001', factoryName: '청주 2공장 (모듈/팩 조립)', factoryRole: 'production', address: '충북 청주시 흥덕구 오송생명로 220', country: 'KR', region: '충북 청주', coordinates: [127.4920, 36.6418], operatingPeriodFrom: '2020-09-15', operatingPeriodTo: null, monthlyCapacity: '1.8 GWh', isActive: true,
    destination: 'BOTH', destinationDetail: 'BMW 폴란드 + GM 테네시', applicableRegulations: ['EUDR', 'UFLPA', 'IRA', 'CSDDD', 'EU_BATTERY'], hiddenRegulations: [], supplyRatioPercent: 40, supplyQuantity: '720 MWh/월' },

  // POS Cathode — T3 (양극재, 분할 납품 65% : 35%)
  { factoryId: 'F-004', supplierId: 'S-CAM-001',  factoryName: 'POS 양극재 본사', factoryRole: 'headquarters', address: '경북 포항시 남구 동해안로 1080', country: 'KR', region: '경북 포항', coordinates: [129.3435, 36.0190], operatingPeriodFrom: '2012-05-20', operatingPeriodTo: null, isActive: true },
  { factoryId: 'F-005', supplierId: 'S-CAM-001',  factoryName: '포항 양극재 공장', factoryRole: 'production', address: '경북 포항시 남구 효자동 산 1-1', country: 'KR', region: '경북 포항', coordinates: [129.3290, 36.0085], operatingPeriodFrom: '2013-11-10', operatingPeriodTo: null, monthlyCapacity: '850 t', isActive: true,
    destination: 'EU', destinationDetail: '한양셀 → BMW 폴란드 (EU)', applicableRegulations: ['EUDR', 'CSDDD', 'EU_BATTERY'], hiddenRegulations: ['UFLPA', 'IRA'], supplyRatioPercent: 65, supplyQuantity: '550 t/월' },
  { factoryId: 'F-006', supplierId: 'S-CAM-001',  factoryName: '광양 양극재 2공장', factoryRole: 'production', address: '전남 광양시 광양항만로 200',     country: 'KR', region: '전남 광양', coordinates: [127.7012, 34.9358], operatingPeriodFrom: '2021-04-05', operatingPeriodTo: null, monthlyCapacity: '620 t', isActive: true,
    destination: 'US', destinationDetail: '한양셀 → GM 테네시 (US)', applicableRegulations: ['UFLPA', 'IRA', 'CSDDD'], hiddenRegulations: ['EUDR', 'EUDR_FSC'], supplyRatioPercent: 35, supplyQuantity: '300 t/월' },

  // Yantai Cathode — T3 (단일 공장 100%)
  { factoryId: 'F-007', supplierId: 'S-CAM-002',  factoryName: 'Yantai Cathode HQ', factoryRole: 'headquarters', address: '山东省烟台市开发区长江路168号', country: 'CN', region: '산둥성 옌타이', coordinates: [121.4480, 37.4634], operatingPeriodFrom: '2015-08-12', operatingPeriodTo: null, isActive: true },
  { factoryId: 'F-008', supplierId: 'S-CAM-002',  factoryName: 'Yantai NCA Line A',    factoryRole: 'production', address: '山东省烟台市福山区工业园路58号', country: 'CN', region: '산둥성 옌타이', coordinates: [121.4395, 37.4988], operatingPeriodFrom: '2016-03-22', operatingPeriodTo: null, monthlyCapacity: '420 t', isActive: true,
    destination: 'US', destinationDetail: '한양셀 → GM 테네시 (US)', applicableRegulations: ['UFLPA', 'IRA', 'CSDDD'], hiddenRegulations: ['EUDR'], supplyRatioPercent: 100, supplyQuantity: '420 t/월' },

  // Mitsui Anode — T3 (음극재, 단일 공장 100%)
  { factoryId: 'F-009', supplierId: 'S-ANO-001',  factoryName: '三井アノード本社', factoryRole: 'headquarters', address: '大阪府大阪市中央区淡路町2-1', country: 'JP', region: '오사카',     coordinates: [135.5023, 34.6937], operatingPeriodFrom: '1995-06-01', operatingPeriodTo: null, isActive: true },
  { factoryId: 'F-010', supplierId: 'S-ANO-001',  factoryName: '神戸黒鉛工場',       factoryRole: 'production', address: '兵庫県神戸市灘区高羽町1-12', country: 'JP', region: '효고 고베',  coordinates: [135.2317, 34.7100], operatingPeriodFrom: '2001-04-10', operatingPeriodTo: null, monthlyCapacity: '380 t', isActive: true,
    destination: 'BOTH', destinationDetail: '한양셀 → 전 시장', applicableRegulations: ['EUDR', 'UFLPA', 'CSDDD', 'EU_BATTERY'], hiddenRegulations: ['IRA'], supplyRatioPercent: 100, supplyQuantity: '380 t/월' },

  // QZ Precursor — T4 (단일 공장 100%)
  { factoryId: 'F-011', supplierId: 'S-PRE-001',  factoryName: 'QZ Precursor HQ', factoryRole: 'headquarters', address: '广东省广州市天河区珠江新城A-101', country: 'CN', region: '광둥성 광저우', coordinates: [113.3245, 23.1184], operatingPeriodFrom: '2010-04-22', operatingPeriodTo: null, isActive: true },
  { factoryId: 'F-012', supplierId: 'S-PRE-001',  factoryName: '광저우 전구체 공장', factoryRole: 'production', address: '广东省广州市黄埔区开发大道188号', country: 'CN', region: '광둥성 광저우', coordinates: [113.4583, 23.1056], operatingPeriodFrom: '2011-09-15', operatingPeriodTo: null, monthlyCapacity: '720 t', isActive: true,
    destination: 'BOTH', destinationDetail: '양극재사 → 한양셀 → 전 시장', applicableRegulations: ['UFLPA', 'IRA', 'CSDDD', 'EU_BATTERY'], hiddenRegulations: ['EUDR'], supplyRatioPercent: 100, supplyQuantity: '720 t/월' },

  // Pilbara Refining — T4 (리튬 정제, 단일)
  { factoryId: 'F-013', supplierId: 'S-REF-001',  factoryName: 'Pilbara Refining HQ', factoryRole: 'headquarters', address: '450 St Georges Tce, Perth WA 6000', country: 'AU', region: '호주 퍼스',   coordinates: [115.8605, -31.9523], operatingPeriodFrom: '1988-07-12', operatingPeriodTo: null, isActive: true },
  { factoryId: 'F-014', supplierId: 'S-REF-001',  factoryName: 'Pilgangoora 정제소', factoryRole: 'processing',    address: 'Pilgangoora, Pilbara WA 6753',     country: 'AU', region: '호주 필바라', coordinates: [118.9050, -21.2580], operatingPeriodFrom: '1992-03-08', operatingPeriodTo: null, monthlyCapacity: '1,250 t LiOH', isActive: true,
    destination: 'BOTH', destinationDetail: '양극재사 → 한양셀 → 전 시장', applicableRegulations: ['EUDR', 'CSDDD', 'EU_BATTERY', 'CBAM'], hiddenRegulations: ['UFLPA'], supplyRatioPercent: 100, supplyQuantity: '1,250 t/월' },

  // Ganzhou Rare Metals — T4 (코발트 정제, 중국·FEOC 우려)
  { factoryId: 'F-015', supplierId: 'S-REF-002',  factoryName: 'Ganzhou Rare Metals', factoryRole: 'processing',  address: '江西省赣州市经济开发区金岭东路', country: 'CN', region: '장시성 간저우', coordinates: [114.9352, 25.8312], operatingPeriodFrom: '2005-11-18', operatingPeriodTo: null, monthlyCapacity: '420 t CoSO4', isActive: true,
    destination: 'EU', destinationDetail: '양극재사 → 한양셀 → BMW 폴란드', applicableRegulations: ['EUDR', 'CSDDD', 'EU_BATTERY'], hiddenRegulations: ['UFLPA', 'IRA'], supplyRatioPercent: 100, supplyQuantity: '420 t/월' },

  // Nori Mining — T5 (필리핀 광산)
  { factoryId: 'F-016', supplierId: 'S-MINE-001', factoryName: 'Nori Nickel Mine', factoryRole: 'mining', address: 'Surigao del Norte, Mindanao', country: 'PH', region: '필리핀 수리가오', coordinates: [125.5050, 9.8480], operatingPeriodFrom: '2003-06-22', operatingPeriodTo: null, monthlyCapacity: '850 t Ni', isActive: true,
    destination: 'BOTH', destinationDetail: 'QZ 전구체 → 전 시장', applicableRegulations: ['EUDR', 'CSDDD'], hiddenRegulations: ['UFLPA', 'IRA'], supplyRatioPercent: 100, supplyQuantity: '850 t/월' },

  // Kat Cobalt — T5 (콩고 광산, 인권 이슈)
  { factoryId: 'F-017', supplierId: 'S-MINE-002', factoryName: 'Katanga Cobalt Mine', factoryRole: 'mining', address: 'Kolwezi, Lualaba Province', country: 'CD', region: '콩고 카탕가', coordinates: [25.4664, -10.7167], operatingPeriodFrom: '2014-01-15', operatingPeriodTo: null, monthlyCapacity: '320 t Co', isActive: true,
    destination: 'EU', destinationDetail: 'Ganzhou → 한양셀 → BMW 폴란드', applicableRegulations: ['EUDR', 'CSDDD'], hiddenRegulations: ['UFLPA', 'IRA'], supplyRatioPercent: 100, supplyQuantity: '320 t/월' },

  // SdA Lithium — T5 (칠레 리튬 광산)
  { factoryId: 'F-018', supplierId: 'S-MINE-003', factoryName: 'Salar de Atacama Plant', factoryRole: 'mining', address: 'Salar de Atacama, Antofagasta', country: 'CL', region: '칠레 아타카마', coordinates: [-68.2350, -23.5050], operatingPeriodFrom: '2010-08-08', operatingPeriodTo: null, monthlyCapacity: '180 t LiOH', isActive: true,
    destination: 'BOTH', destinationDetail: 'Pilbara → 전 시장', applicableRegulations: ['EUDR', 'CSDDD', 'CBAM'], hiddenRegulations: ['UFLPA', 'IRA'], supplyRatioPercent: 100, supplyQuantity: '180 t/월' },
];

// 규제별 라벨 + 색상 메타
export const regulationMeta: Record<Regulation, { label: string; description: string; color: 'emerald' | 'teal' | 'amber' | 'orange' | 'blue' | 'purple' }> = {
  EUDR:       { label: 'EUDR',       description: 'EU 산림파괴방지법',                color: 'emerald' },
  EUDR_FSC:   { label: 'FSC',        description: 'EUDR 부속 — FSC 인증',             color: 'emerald' },
  CSDDD:      { label: 'CSDDD',      description: 'EU 공급망 실사지침 (인권)',        color: 'teal' },
  UFLPA:      { label: 'UFLPA',      description: '미국 위구르 강제노동방지법',        color: 'amber' },
  IRA:        { label: 'IRA',        description: '미국 인플레이션감축법 (FEOC)',     color: 'orange' },
  EU_BATTERY: { label: 'EU 배터리법', description: 'EU 2023/1542',                     color: 'blue' },
  CBAM:       { label: 'CBAM',       description: 'EU 탄소국경조정',                  color: 'purple' },
};

// ============================================================
// 4. 인증서 (만료일 추적)
// ============================================================
export interface Certification {
  certId: string;
  supplierId: string;
  certName: string;
  issuingBody: string;
  certNumber: string;
  issuedAt: string;
  expiresAt: string;
  status: 'active' | 'expiring_soon' | 'expired';
  documentUrl?: string;
}

export const certifications: Certification[] = [
  { certId: 'CERT-001', supplierId: 'S-CELL-001', certName: 'ISO 14001:2015',      issuingBody: 'TÜV Rheinland',    certNumber: 'TR-EMS-2024-K1142', issuedAt: '2024-03-12', expiresAt: '2027-03-11', status: 'active' },
  { certId: 'CERT-002', supplierId: 'S-CELL-001', certName: 'IATF 16949',          issuingBody: 'BSI',              certNumber: 'BSI-IATF-K9821',    issuedAt: '2023-09-08', expiresAt: '2026-09-07', status: 'expiring_soon' },
  { certId: 'CERT-003', supplierId: 'S-CAM-001',  certName: 'IRMA-75',             issuingBody: 'IRMA',             certNumber: 'IRMA-MS-2024-2201', issuedAt: '2024-01-22', expiresAt: '2027-01-21', status: 'active' },
  { certId: 'CERT-004', supplierId: 'S-CAM-001',  certName: 'ISO 14064',           issuingBody: 'KAB',              certNumber: 'KAB-GHG-2024-882',  issuedAt: '2024-05-14', expiresAt: '2027-05-13', status: 'active' },
  { certId: 'CERT-005', supplierId: 'S-CAM-002',  certName: 'ISO 14001:2015',      issuingBody: 'SGS China',        certNumber: 'SGS-CN-EMS-7720',   issuedAt: '2023-11-30', expiresAt: '2026-11-29', status: 'expiring_soon' },
  { certId: 'CERT-006', supplierId: 'S-ANO-001',  certName: 'ISO 14001:2015',      issuingBody: 'JQA',              certNumber: 'JQA-EM-3208',       issuedAt: '2024-02-18', expiresAt: '2027-02-17', status: 'active' },
  { certId: 'CERT-007', supplierId: 'S-ANO-001',  certName: 'RMI Audit Pass',      issuingBody: 'RMI',              certNumber: 'RMI-A-2024-882',    issuedAt: '2024-04-05', expiresAt: '2026-04-04', status: 'expiring_soon' },
  { certId: 'CERT-008', supplierId: 'S-REF-001',  certName: 'ResponsibleSteel',    issuingBody: 'ResponsibleSteel', certNumber: 'RS-2024-AU-101',    issuedAt: '2024-06-20', expiresAt: '2027-06-19', status: 'active' },
  { certId: 'CERT-009', supplierId: 'S-REF-001',  certName: 'IRMA-50',             issuingBody: 'IRMA',             certNumber: 'IRMA-MS-2023-1108', issuedAt: '2023-08-15', expiresAt: '2026-08-14', status: 'expiring_soon' },
  { certId: 'CERT-010', supplierId: 'S-REF-002',  certName: 'ISO 14001:2015',      issuingBody: 'CQC',              certNumber: 'CQC-EMS-2023-441',  issuedAt: '2023-04-10', expiresAt: '2026-04-09', status: 'expired' },
  { certId: 'CERT-011', supplierId: 'S-MINE-001', certName: 'ISO 14001:2015',      issuingBody: 'TÜV SÜD',          certNumber: 'TUV-PH-EMS-220',    issuedAt: '2024-07-08', expiresAt: '2027-07-07', status: 'active' },
  { certId: 'CERT-012', supplierId: 'S-MINE-001', certName: 'Bettercoal Verified', issuingBody: 'Bettercoal',       certNumber: 'BC-PH-2024-12',     issuedAt: '2024-03-15', expiresAt: '2026-03-14', status: 'expiring_soon' },
  { certId: 'CERT-013', supplierId: 'S-MINE-003', certName: 'IRMA-75',             issuingBody: 'IRMA',             certNumber: 'IRMA-MS-2024-CL-08', issuedAt: '2024-02-28', expiresAt: '2027-02-27', status: 'active' },
];

// ============================================================
// 5. 부품 (5계층 트리) — 협력사 상세에서 활용
// Tier 정의 (data.ts와 일치):
//   T1 = Pack/Module
//   T2 = Cell
//   T3 = 활물질 (양극재/음극재)
//   T4 = 전구체·정제
//   T5 = 원광
// ============================================================
export type TierLevel = 1 | 2 | 3 | 4 | 5;

export interface Part {
  id: string;
  partCode: string;
  partName: string;
  tierLevel: TierLevel;
  parentPartId: string | null;
  hsCode: string;
  materialType: string;
  functionPurpose: string;
  unitPrice: number;
  purchaseUnit: string;
}

export const parts: Part[] = [
  { id: 'PRT-001', partCode: 'PACK-NCM811-100Ah',  partName: 'NCM811 배터리 팩',    tierLevel: 1, parentPartId: null,      hsCode: '850760', materialType: 'Pack Assembly',           functionPurpose: 'EV 구동용 통합 배터리 팩 (BMS/냉각/케이싱 포함)', unitPrice: 8420.00, purchaseUnit: 'EA' },
  { id: 'PRT-002', partCode: 'MOD-NCM811-12S',     partName: 'NCM811 모듈 (12셀)',  tierLevel: 1, parentPartId: 'PRT-001', hsCode: '850760', materialType: 'Module Assembly',         functionPurpose: '12개 셀의 직렬 조립체',                            unitPrice: 612.50,  purchaseUnit: 'EA' },
  { id: 'PRT-003', partCode: 'BMS-V3-100Ah',       partName: 'BMS 컨트롤러',         tierLevel: 1, parentPartId: 'PRT-001', hsCode: '853710', materialType: 'Electronic Module',       functionPurpose: '셀 전압/온도 모니터링',                            unitPrice: 142.00,  purchaseUnit: 'EA' },
  { id: 'PRT-004', partCode: 'CELL-NCM811-100Ah',  partName: 'NCM811 셀',           tierLevel: 2, parentPartId: 'PRT-002', hsCode: '850760', materialType: 'Li-ion Cell',             functionPurpose: '리튬이온 단위 셀 (100Ah, 3.7V)',                   unitPrice: 48.75,   purchaseUnit: 'EA' },
  { id: 'PRT-005', partCode: 'CAM-NCM811',         partName: 'NCM811 양극재',        tierLevel: 3, parentPartId: 'PRT-004', hsCode: '282200', materialType: 'Cathode Active Material', functionPurpose: 'Ni 80%·Co 10%·Mn 10% 층상구조',                  unitPrice: 28.40,   purchaseUnit: 'kg' },
  { id: 'PRT-006', partCode: 'ANO-GRAPHITE',       partName: '천연흑연 음극재',       tierLevel: 3, parentPartId: 'PRT-004', hsCode: '380110', materialType: 'Anode Active Material',   functionPurpose: 'Li 이온 삽입/탈리용 흑연 음극',                     unitPrice: 8.20,    purchaseUnit: 'kg' },
  { id: 'PRT-007', partCode: 'PRE-NCM',            partName: 'NCM 전구체',           tierLevel: 4, parentPartId: 'PRT-005', hsCode: '282200', materialType: 'Precursor',               functionPurpose: 'Ni-Co-Mn 수산화물',                                 unitPrice: 14.80,   purchaseUnit: 'kg' },
  { id: 'PRT-008', partCode: 'MIN-NI',             partName: '니켈 원광',            tierLevel: 5, parentPartId: 'PRT-007', hsCode: '260400', materialType: 'Raw Mineral',             functionPurpose: '양극재 주요 구성 원소',                              unitPrice: 18.50,   purchaseUnit: 'kg' },
  { id: 'PRT-009', partCode: 'MIN-CO',             partName: '황산코발트',           tierLevel: 4, parentPartId: 'PRT-007', hsCode: '283322', materialType: 'Refined Mineral',         functionPurpose: '양극재 안정성 확보 (정제물)',                        unitPrice: 32.80,   purchaseUnit: 'kg' },
  { id: 'PRT-010', partCode: 'MIN-LI',             partName: '수산화리튬',           tierLevel: 4, parentPartId: 'PRT-005', hsCode: '282520', materialType: 'Refined Mineral',         functionPurpose: '리튬이온 셀 전하 운반 (정제물)',                      unitPrice: 84.50,   purchaseUnit: 'kg' },
  { id: 'PRT-011', partCode: 'MIN-MN',             partName: '망간 원광',            tierLevel: 5, parentPartId: 'PRT-007', hsCode: '260200', materialType: 'Raw Mineral',             functionPurpose: '양극재 구조 안정화',                                 unitPrice: 4.20,    purchaseUnit: 'kg' },
];

// ============================================================
// 6. PO/송장 단위 공급 매핑 (정의서 핵심)
// schema의 purchase_orders + supply_chain_map.po_number 매핑
// ============================================================
export interface PurchaseOrder {
  poId: string;
  poNumber: string;            // 송장 번호
  supplierId: string;          // 납품 협력사
  receiverSupplierId: string;  // 받는 쪽 (원청 또는 상위 협력사)
  partId: string;              // 납품 부품 (원청 기준 코드)
  supplierPartCode: string;    // 협력사 기준 코드
  originalPartCode: string;    // 원청 기준 코드 (매핑)
  factoryId: string;           // 어느 공장에서 출하했는지
  quantity: number;
  unit: string;
  supplyRatio: number;         // 같은 부품 전체 중 이 공장 비율 %
  unitPrice: number;
  originCountry: string;
  orderDate: string;
  deliveryDate: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'verified';
}

export const purchaseOrders: PurchaseOrder[] = [
  // POS Cathode → Hanyang Cell (양극재, 분할 납품 65% : 35%)
  { poId: 'PO-001', poNumber: 'PO-2026-04891', supplierId: 'S-CAM-001', receiverSupplierId: 'S-CELL-001', partId: 'PRT-005', supplierPartCode: 'POS-CAM-NCM-811-A', originalPartCode: 'CAM-NCM811', factoryId: 'F-005', quantity: 12500, unit: 'kg', supplyRatio: 65, unitPrice: 28.40, originCountry: 'KR', orderDate: '2026-04-15', deliveryDate: '2026-05-10', status: 'delivered' },
  { poId: 'PO-002', poNumber: 'PO-2026-04902', supplierId: 'S-CAM-001', receiverSupplierId: 'S-CELL-001', partId: 'PRT-005', supplierPartCode: 'POS-CAM-NCM-811-A', originalPartCode: 'CAM-NCM811', factoryId: 'F-006', quantity:  6800, unit: 'kg', supplyRatio: 35, unitPrice: 28.40, originCountry: 'KR', orderDate: '2026-04-15', deliveryDate: '2026-05-12', status: 'verified'  },

  // Yantai Cathode → Hanyang Cell (NCA)
  { poId: 'PO-003', poNumber: 'PO-2026-05011', supplierId: 'S-CAM-002', receiverSupplierId: 'S-CELL-001', partId: 'PRT-005', supplierPartCode: 'YT-NCA-A1',         originalPartCode: 'CAM-NCM811', factoryId: 'F-008', quantity:  8200, unit: 'kg', supplyRatio: 100, unitPrice: 27.10, originCountry: 'CN', orderDate: '2026-05-02', deliveryDate: '2026-05-22', status: 'in_transit' },

  // Mitsui → Hanyang Cell (음극재)
  { poId: 'PO-004', poNumber: 'PO-2026-04875', supplierId: 'S-ANO-001', receiverSupplierId: 'S-CELL-001', partId: 'PRT-006', supplierPartCode: 'MIT-ANODE-NG-K2',   originalPartCode: 'ANO-GRAPHITE', factoryId: 'F-010', quantity:  9400, unit: 'kg', supplyRatio: 100, unitPrice:  8.20, originCountry: 'JP', orderDate: '2026-04-10', deliveryDate: '2026-05-05', status: 'verified' },

  // QZ Precursor → POS Cathode (전구체)
  { poId: 'PO-005', poNumber: 'PO-2026-04701', supplierId: 'S-PRE-001', receiverSupplierId: 'S-CAM-001',  partId: 'PRT-007', supplierPartCode: 'QZ-PRE-NCM-OH',     originalPartCode: 'PRE-NCM',      factoryId: 'F-012', quantity: 18500, unit: 'kg', supplyRatio: 100, unitPrice: 14.80, originCountry: 'CN', orderDate: '2026-04-01', deliveryDate: '2026-04-28', status: 'delivered' },

  // Nori → QZ + Yantai (니켈 분할)
  { poId: 'PO-006', poNumber: 'PO-2026-03812', supplierId: 'S-MINE-001', receiverSupplierId: 'S-PRE-001', partId: 'PRT-008', supplierPartCode: 'NORI-NCL-RAW',     originalPartCode: 'MIN-NI',       factoryId: 'F-016', quantity: 21000, unit: 'kg', supplyRatio: 77, unitPrice: 18.50, originCountry: 'PH', orderDate: '2026-03-15', deliveryDate: '2026-04-18', status: 'delivered' },
  { poId: 'PO-007', poNumber: 'PO-2026-03844', supplierId: 'S-MINE-001', receiverSupplierId: 'S-REF-002', partId: 'PRT-008', supplierPartCode: 'NORI-NCL-RAW',     originalPartCode: 'MIN-NI',       factoryId: 'F-016', quantity:  6200, unit: 'kg', supplyRatio: 23, unitPrice: 18.50, originCountry: 'PH', orderDate: '2026-03-15', deliveryDate: '2026-04-20', status: 'delivered' },

  // Kat Cobalt → Ganzhou + QZ (코발트 분할)
  { poId: 'PO-008', poNumber: 'PO-2026-03908', supplierId: 'S-MINE-002', receiverSupplierId: 'S-REF-002', partId: 'PRT-009', supplierPartCode: 'KAT-CO-ORE',        originalPartCode: 'MIN-CO',       factoryId: 'F-017', quantity:  9100, unit: 'kg', supplyRatio: 60, unitPrice: 32.80, originCountry: 'CD', orderDate: '2026-03-20', deliveryDate: '2026-04-25', status: 'pending' },
  { poId: 'PO-009', poNumber: 'PO-2026-03912', supplierId: 'S-MINE-002', receiverSupplierId: 'S-PRE-001', partId: 'PRT-009', supplierPartCode: 'KAT-CO-ORE',        originalPartCode: 'MIN-CO',       factoryId: 'F-017', quantity:  6050, unit: 'kg', supplyRatio: 40, unitPrice: 32.80, originCountry: 'CD', orderDate: '2026-03-20', deliveryDate: '2026-04-25', status: 'pending' },

  // SdA → Pilbara (리튬 원료)
  { poId: 'PO-010', poNumber: 'PO-2026-04102', supplierId: 'S-MINE-003', receiverSupplierId: 'S-REF-001', partId: 'PRT-010', supplierPartCode: 'SDA-LIOH-RAW',      originalPartCode: 'MIN-LI',       factoryId: 'F-018', quantity:  3800, unit: 'kg', supplyRatio: 100, unitPrice: 84.50, originCountry: 'CL', orderDate: '2026-04-02', deliveryDate: '2026-04-30', status: 'verified' },

  // Pilbara → POS Cathode (수산화리튬 정제 후)
  { poId: 'PO-011', poNumber: 'PO-2026-04205', supplierId: 'S-REF-001', receiverSupplierId: 'S-CAM-001',  partId: 'PRT-010', supplierPartCode: 'PRW-LIOH-BTG',     originalPartCode: 'MIN-LI',       factoryId: 'F-014', quantity:  4200, unit: 'kg', supplyRatio: 100, unitPrice: 92.30, originCountry: 'AU', orderDate: '2026-04-08', deliveryDate: '2026-05-06', status: 'delivered' },

  // Ganzhou → POS Cathode (황산코발트 정제 후)
  { poId: 'PO-012', poNumber: 'PO-2026-04308', supplierId: 'S-REF-002', receiverSupplierId: 'S-CAM-001',  partId: 'PRT-009', supplierPartCode: 'GZ-COSO4-99',      originalPartCode: 'MIN-CO',       factoryId: 'F-015', quantity:  2100, unit: 'kg', supplyRatio: 100, unitPrice: 38.20, originCountry: 'CN', orderDate: '2026-04-12', deliveryDate: '2026-05-08', status: 'in_transit' },
];

// ============================================================
// 7. 제조공정도
// ============================================================
export interface ManufacturingProcess {
  id: string;
  supplierId: string;     // 어느 협력사의 공정인지
  partId: string;
  sequenceNo: number;
  processName: string;
  processDescription: string;
  isOutsourced: boolean;
  outsourcedToSupplierId: string | null;
  hasDiagram: boolean;
}

export const manufacturingProcesses: ManufacturingProcess[] = [
  // POS Cathode의 양극재 제조공정
  { id: 'MP-001', supplierId: 'S-CAM-001', partId: 'PRT-005', sequenceNo: 1, processName: '전구체 입고 검사',  processDescription: 'NCM 수산화물 전구체 입자 분포·수분 함량 측정',           isOutsourced: false, outsourcedToSupplierId: null,        hasDiagram: true  },
  { id: 'MP-002', supplierId: 'S-CAM-001', partId: 'PRT-005', sequenceNo: 2, processName: '리튬 혼합 및 소성', processDescription: '수산화리튬 1:1.05 몰비 혼합 후 750°C 10시간 소성',     isOutsourced: false, outsourcedToSupplierId: null,        hasDiagram: true  },
  { id: 'MP-003', supplierId: 'S-CAM-001', partId: 'PRT-005', sequenceNo: 3, processName: '분쇄 및 분급',     processDescription: '입자 D50=10±2μm로 분급, 자성이물 제거',                isOutsourced: false, outsourcedToSupplierId: null,        hasDiagram: true  },
  { id: 'MP-004', supplierId: 'S-CAM-001', partId: 'PRT-005', sequenceNo: 4, processName: '표면 코팅',        processDescription: 'Al2O3 0.5wt% 표면 코팅 (외주)',                          isOutsourced: true,  outsourcedToSupplierId: 'S-CAM-002', hasDiagram: false },
  { id: 'MP-005', supplierId: 'S-CAM-001', partId: 'PRT-005', sequenceNo: 5, processName: '품질 검사 및 포장',processDescription: '용량/저항/입도 전수 검사 후 진공 포장',                  isOutsourced: false, outsourcedToSupplierId: null,        hasDiagram: true  },

  // QZ Precursor 전구체 공정
  { id: 'MP-006', supplierId: 'S-PRE-001', partId: 'PRT-007', sequenceNo: 1, processName: '금속염 용해',      processDescription: 'NiSO4·CoSO4·MnSO4 8:1:1 몰비 수용액 제조',              isOutsourced: false, outsourcedToSupplierId: null, hasDiagram: false },
  { id: 'MP-007', supplierId: 'S-PRE-001', partId: 'PRT-007', sequenceNo: 2, processName: '공침 반응',        processDescription: 'NaOH/NH4OH 첨가, pH 11.5에서 50시간 공침',              isOutsourced: false, outsourcedToSupplierId: null, hasDiagram: false },
  { id: 'MP-008', supplierId: 'S-PRE-001', partId: 'PRT-007', sequenceNo: 3, processName: '세척 및 건조',     processDescription: '폐액 분리 후 110°C 진공 건조',                            isOutsourced: false, outsourcedToSupplierId: null, hasDiagram: false },

  // Hanyang Cell 셀 제조공정
  { id: 'MP-009', supplierId: 'S-CELL-001', partId: 'PRT-004', sequenceNo: 1, processName: '슬러리 믹싱',     processDescription: '양극재+도전재+바인더 혼합, 점도 4500cP±10%',           isOutsourced: false, outsourcedToSupplierId: null, hasDiagram: true  },
  { id: 'MP-010', supplierId: 'S-CELL-001', partId: 'PRT-004', sequenceNo: 2, processName: '전극 코팅',       processDescription: '동박/알박에 슬러리 코팅 후 100°C 건조',                  isOutsourced: false, outsourcedToSupplierId: null, hasDiagram: true  },
  { id: 'MP-011', supplierId: 'S-CELL-001', partId: 'PRT-004', sequenceNo: 3, processName: '롤프레싱',        processDescription: '전극 두께 균일화 (압연)',                                isOutsourced: false, outsourcedToSupplierId: null, hasDiagram: true  },
  { id: 'MP-012', supplierId: 'S-CELL-001', partId: 'PRT-004', sequenceNo: 4, processName: '권취 및 조립',    processDescription: '양극·음극·분리막 권취 후 케이스 삽입',                   isOutsourced: false, outsourcedToSupplierId: null, hasDiagram: true  },
  { id: 'MP-013', supplierId: 'S-CELL-001', partId: 'PRT-004', sequenceNo: 5, processName: '전해액 주액',     processDescription: 'LiPF6 전해액 정량 주액 후 시밍',                          isOutsourced: false, outsourcedToSupplierId: null, hasDiagram: true  },
  { id: 'MP-014', supplierId: 'S-CELL-001', partId: 'PRT-004', sequenceNo: 6, processName: '화성 및 출하',    processDescription: 'C/20 충방전 3사이클 화성, OCV 검사 후 출하',             isOutsourced: false, outsourcedToSupplierId: null, hasDiagram: true  },
];

// ============================================================
// 8. 데이터 완성도 + 리마인드 이력
// ============================================================
export interface DataCompleteness {
  supplierId: string;
  requiredFieldCount: number;
  filledFieldCount: number;
  completionRate: number;
  missingFields: string[];
  lastUpdatedAt: string;
}

export const supplierCompleteness: DataCompleteness[] = [
  { supplierId: 'S-CELL-001', requiredFieldCount: 28, filledFieldCount: 28, completionRate: 100, missingFields: [],                                                                  lastUpdatedAt: '2026-05-13 09:22' },
  { supplierId: 'S-CAM-001',  requiredFieldCount: 26, filledFieldCount: 25, completionRate: 96.2, missingFields: ['공정도 4단계 도식'],                                                lastUpdatedAt: '2026-05-12 16:30' },
  { supplierId: 'S-CAM-002',  requiredFieldCount: 26, filledFieldCount: 21, completionRate: 80.8, missingFields: ['IRMA 인증서', '제조공정도 PDF', '광물 추적 시스템'],               lastUpdatedAt: '2026-04-22 13:45' },
  { supplierId: 'S-ANO-001',  requiredFieldCount: 24, filledFieldCount: 24, completionRate: 100, missingFields: [],                                                                  lastUpdatedAt: '2026-05-05 10:14' },
  { supplierId: 'S-PRE-001',  requiredFieldCount: 24, filledFieldCount: 18, completionRate: 75.0, missingFields: ['제조공정도', '원료 출처 코발트', '단가 (최신)', '제3자 검증 보고서'], lastUpdatedAt: '2026-05-08 13:50' },
  { supplierId: 'S-REF-001',  requiredFieldCount: 26, filledFieldCount: 25, completionRate: 96.2, missingFields: ['Scope 3 배출량'],                                                  lastUpdatedAt: '2026-05-09 11:02' },
  { supplierId: 'S-REF-002',  requiredFieldCount: 26, filledFieldCount: 15, completionRate: 57.7, missingFields: ['ISO 14001 갱신', '제조공정도', 'FEOC 지분 공시', '광물 추적', '제3자 검증', 'CSR 보고서'], lastUpdatedAt: '2026-04-28 09:40' },
  { supplierId: 'S-MINE-001', requiredFieldCount: 22, filledFieldCount: 18, completionRate: 81.8, missingFields: ['광산 폴리곤 좌표', '환경영향평가 갱신', '커뮤니티 합의서', '광권 갱신'], lastUpdatedAt: '2026-05-09 11:02' },
  { supplierId: 'S-MINE-002', requiredFieldCount: 22, filledFieldCount: 13, completionRate: 59.1, missingFields: ['Bettercoal 인증', '아동노동 감사', 'FEOC 지분', '광권 갱신', 'EITI 공시', '커뮤니티 합의서', 'NGO 감사', '광산 폴리곤', 'EIA 보고서'], lastUpdatedAt: '2026-04-28 09:40' },
  { supplierId: 'S-MINE-003', requiredFieldCount: 22, filledFieldCount: 21, completionRate: 95.5, missingFields: ['지하수 사용량 보고'],                                              lastUpdatedAt: '2026-05-10 08:55' },
];

export interface RemindLog {
  logId: string;
  supplierId: string;
  contactId: string;
  requestType: 'initial' | 'remind_1' | 'remind_2' | 'final' | 'response';
  requestedField: string;
  sentAt: string;
  dueDate: string;
  status: 'sent' | 'opened' | 'in_progress' | 'completed' | 'overdue';
  responseAt?: string;
}

export const remindLogs: RemindLog[] = [
  // S-MINE-002 (Kat Cobalt) - 데이터 누락 심함, 3번 리마인드
  { logId: 'R-001', supplierId: 'S-MINE-002', contactId: 'C-016', requestType: 'initial',  requestedField: '광산 폴리곤 좌표·EIA·아동노동 감사',  sentAt: '2026-03-15 10:00', dueDate: '2026-03-29', status: 'sent'      },
  { logId: 'R-002', supplierId: 'S-MINE-002', contactId: 'C-016', requestType: 'remind_1', requestedField: '광산 폴리곤 좌표·EIA·아동노동 감사',  sentAt: '2026-04-01 10:00', dueDate: '2026-04-15', status: 'opened'    },
  { logId: 'R-003', supplierId: 'S-MINE-002', contactId: 'C-016', requestType: 'remind_2', requestedField: '광산 폴리곤 좌표·EIA·아동노동 감사',  sentAt: '2026-04-22 10:00', dueDate: '2026-05-06', status: 'overdue'   },
  { logId: 'R-004', supplierId: 'S-MINE-002', contactId: 'C-016', requestType: 'final',    requestedField: '광산 폴리곤 좌표·EIA·아동노동 감사',  sentAt: '2026-05-13 10:00', dueDate: '2026-05-20', status: 'sent'      },

  // S-REF-002 (Ganzhou) - 2번 리마인드, ISO 만료
  { logId: 'R-005', supplierId: 'S-REF-002', contactId: 'C-014', requestType: 'initial',  requestedField: 'ISO 14001 갱신·제조공정도',           sentAt: '2026-04-02 10:00', dueDate: '2026-04-16', status: 'opened'    },
  { logId: 'R-006', supplierId: 'S-REF-002', contactId: 'C-014', requestType: 'remind_1', requestedField: 'ISO 14001 갱신·제조공정도',           sentAt: '2026-04-23 10:00', dueDate: '2026-05-07', status: 'in_progress' },

  // S-PRE-001 (QZ Precursor) - 1번, 진행 중
  { logId: 'R-007', supplierId: 'S-PRE-001', contactId: 'C-011', requestType: 'initial',  requestedField: '제조공정도·코발트 원료 출처',          sentAt: '2026-04-25 10:00', dueDate: '2026-05-09', status: 'in_progress' },

  // S-CAM-002 (Yantai) - 1번 리마인드
  { logId: 'R-008', supplierId: 'S-CAM-002', contactId: 'C-008', requestType: 'initial',  requestedField: 'IRMA 인증서·광물 추적 시스템',         sentAt: '2026-04-05 10:00', dueDate: '2026-04-19', status: 'sent'      },
  { logId: 'R-009', supplierId: 'S-CAM-002', contactId: 'C-008', requestType: 'remind_1', requestedField: 'IRMA 인증서·광물 추적 시스템',         sentAt: '2026-04-26 10:00', dueDate: '2026-05-10', status: 'opened'    },

  // S-MINE-001 (Nori) - 1번
  { logId: 'R-010', supplierId: 'S-MINE-001', contactId: 'C-015', requestType: 'initial', requestedField: '광산 폴리곤·EIA 갱신',                sentAt: '2026-04-30 10:00', dueDate: '2026-05-14', status: 'in_progress' },

  // 완료된 응답 사례
  { logId: 'R-011', supplierId: 'S-REF-001', contactId: 'C-013', requestType: 'initial',  requestedField: 'Scope 3 배출량 데이터',              sentAt: '2026-04-15 10:00', dueDate: '2026-04-29', status: 'completed', responseAt: '2026-04-27 14:22' },
];

// ============================================================
// 9. 권한 시뮬레이션 데이터 (정의서 ②번)
//   - 1차 협력사 시점 → 직상위(원청)와 직하위만 보임
//   - 옆 라인 노드는 마스킹
// ============================================================
export type ViewerRole = 'owner_esg' | 'tier1_supplier';

// 1차 협력사 시점일 때 "본인"으로 설정하는 협력사 (시연용: S-CELL-001)
export const tier1ViewerSupplierId = 'S-CELL-001';

// 1차 시점에서 볼 수 있는 노드 (직상위=원청 가상화 + 본인 + 직하위들)
// supplyEdges에서 to=S-CELL-001 인 노드들이 직하위 (역순), from=S-CELL-001 직상위 (없음, 원청 가상)
export function getVisibleSupplierIds(viewerRole: ViewerRole, edges: { from: string; to: string }[]): Set<string> {
  if (viewerRole === 'owner_esg') {
    // 전체 다 보임
    return new Set<string>(supplierList.map(s => s.id));
  }
  // 1차 협력사 시점
  const me = tier1ViewerSupplierId;
  const visible = new Set<string>([me]);
  // 직하위 (나한테 공급하는 노드들)
  edges.forEach(e => {
    if (e.to === me) visible.add(e.from);
  });
  // 직상위 (없음 - 원청은 가상)
  return visible;
}

// ============================================================
// 10. 헬퍼 함수
// ============================================================

// 특정 협력사가 받는 PO (수신)
export function getIncomingPOs(supplierId: string): PurchaseOrder[] {
  return purchaseOrders.filter(po => po.receiverSupplierId === supplierId);
}

// 특정 협력사가 보내는 PO (납품)
export function getOutgoingPOs(supplierId: string): PurchaseOrder[] {
  return purchaseOrders.filter(po => po.supplierId === supplierId);
}

// 특정 협력사의 공장 목록
export function getFactories(supplierId: string): Factory[] {
  return factories.filter(f => f.supplierId === supplierId);
}

// 특정 협력사의 담당자 목록
export function getContacts(supplierId: string): SupplierContact[] {
  return supplierContacts.filter(c => c.supplierId === supplierId);
}

// 특정 협력사의 인증서
export function getCertifications(supplierId: string): Certification[] {
  return certifications.filter(c => c.supplierId === supplierId);
}

// 특정 협력사의 제조공정
export function getProcesses(supplierId: string): ManufacturingProcess[] {
  return manufacturingProcesses.filter(p => p.supplierId === supplierId);
}

// 특정 협력사의 리마인드 이력 (최신순)
export function getRemindLogs(supplierId: string): RemindLog[] {
  return remindLogs
    .filter(r => r.supplierId === supplierId)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

// 특정 협력사 확장 정보
export function getSupplierExtended(supplierId: string): SupplierExtended | undefined {
  return supplierExtended.find(e => e.supplierId === supplierId);
}

// 부품 ID로 부품 정보
export function getPart(partId: string): Part | undefined {
  return parts.find(p => p.id === partId);
}

// 완성도
export function getCompleteness(supplierId: string): DataCompleteness | undefined {
  return supplierCompleteness.find(c => c.supplierId === supplierId);
}
