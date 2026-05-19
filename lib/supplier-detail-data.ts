// ============================================================
// 공급망 맵 협력사 상세 정보 데이터 (v2 — 전체 규제 + ESG 확장)
// schema.sql 매핑:
//   - supplier_names           (영문 기본 + 한글 병기)
//   - supplier_contacts        (담당자 다중 — 공장 담당자 포함)
//   - supplier_factories       (본사/공장 분리, 좌표, 가동기간)
//   - supplier_certifications  (인증서 + 만료일)
//   - supplier_risk            (종합 위험도, FEOC, 실사, 인권, 산재, 교육)
//   - purchase_orders          → supply_chain_map.po_number 매핑
//   - parts, bom_items         (부품 5계층)
//   - manufacturing_process    (제조공정도)
//   - data_completeness_status (완성도)
//   - data_request_log         (리마인드 이력)
//   - origin_certificates      (원산지 증명서)
//   - training_records         (교육 이수 현황)
// ============================================================

import { suppliers as supplierList } from './data';

// ============================================================
// 0. 규제 타입 (v2 — 11개 규제 전체)
// ============================================================
export type Regulation =
  | 'EUDR'              // EU 산림파괴방지법
  | 'EUDR_FSC'          // EUDR 부속 FSC 인증
  | 'CSDDD'             // EU 공급망 실사지침 (인권)
  | 'UFLPA'             // 미국 위구르 강제노동방지법
  | 'IRA'               // 미국 인플레이션감축법 (FEOC)
  | 'EU_BATTERY'        // EU 배터리법 2023/1542 (재활용 함량)
  | 'EU_BATTERY_ART7'   // EU 배터리법 Art.7 탄소발자국 신고
  | 'EU_BATTERY_ART47'  // EU 배터리법 Art.47 공급망 실사 (DDP)
  | 'CBAM'              // EU 탄소국경조정제도
  | 'CONFLICT_MINERALS' // EU 분쟁광물 규정 2017/821
  | 'CRMA'              // EU 핵심원자재법 (Critical Raw Materials Act)
  | 'LKSG';             // 독일 공급망실사법 (Lieferkettensorgfaltspflichtengesetz)

export type Destination = 'EU' | 'US' | 'BOTH' | 'KR';

// 규제별 라벨 + 색상 메타
export const regulationMeta: Record<Regulation, {
  label: string;
  description: string;
  color: 'emerald' | 'teal' | 'amber' | 'orange' | 'blue' | 'cyan' | 'purple' | 'red' | 'violet' | 'slate';
  region: 'EU' | 'US' | 'DE' | 'BOTH';
}> = {
  EUDR:              { label: 'EUDR',              description: 'EU 산림파괴방지법',               color: 'emerald', region: 'EU' },
  EUDR_FSC:          { label: 'FSC',               description: 'EUDR 부속 — FSC 인증',            color: 'emerald', region: 'EU' },
  CSDDD:             { label: 'CSDDD',             description: 'EU 공급망 실사지침 (인권)',        color: 'teal',    region: 'EU' },
  UFLPA:             { label: 'UFLPA',             description: '미국 위구르 강제노동방지법',       color: 'amber',   region: 'US' },
  IRA:               { label: 'IRA/FEOC',          description: '미국 인플레이션감축법 (FEOC)',     color: 'orange',  region: 'US' },
  EU_BATTERY:        { label: 'EU 배터리법',        description: 'EU 2023/1542 재활용 함량',        color: 'blue',    region: 'EU' },
  EU_BATTERY_ART7:   { label: 'EU 배터리법 Art.7', description: '탄소발자국 신고 의무',            color: 'cyan',    region: 'EU' },
  EU_BATTERY_ART47:  { label: 'EU 배터리법 Art.47',description: '공급망 실사 (DDP 수립)',          color: 'cyan',    region: 'EU' },
  CBAM:              { label: 'CBAM',              description: 'EU 탄소국경조정제도',             color: 'purple',  region: 'EU' },
  CONFLICT_MINERALS: { label: 'Conflict Minerals', description: 'EU 분쟁광물 규정 2017/821',       color: 'red',     region: 'EU' },
  CRMA:              { label: 'CRMA',              description: 'EU 핵심원자재법',                 color: 'violet',  region: 'EU' },
  LKSG:              { label: 'LkSG',              description: '독일 공급망실사법',               color: 'slate',   region: 'DE' },
};

// ============================================================
// 1. 협력사 기업명 (영문 기본 + 한글 병기)
// ============================================================
export interface SupplierName {
  supplierId: string;
  nameEn: string;       // 영문 공식 명칭 (기본 관리)
  nameKo?: string;      // 한글 명칭 (병기, 선택)
  shortNameEn?: string; // 약칭 영문
  shortNameKo?: string; // 약칭 한글
}

export const supplierNames: SupplierName[] = [
  { supplierId: 'S-CELL-001', nameEn: 'Hanyang Cell Manufacturing Co., Ltd.', nameKo: '한양셀 제조(주)',          shortNameEn: 'Hanyang Cell',     shortNameKo: '한양셀' },
  { supplierId: 'S-CAM-001',  nameEn: 'POS Cathode Materials Co., Ltd.',      nameKo: '포스 양극재(주)',          shortNameEn: 'POS Cathode',      shortNameKo: 'POS 양극재' },
  { supplierId: 'S-CAM-002',  nameEn: 'Yantai Cathode Technology Co., Ltd.',  nameKo: '옌타이 캐소드 기술유한공사', shortNameEn: 'Yantai Cathode',  shortNameKo: '옌타이 캐소드' },
  { supplierId: 'S-ANO-001',  nameEn: 'Mitsui Anode Industries, Ltd.',        nameKo: '미쓰이 음극재 공업(주)',    shortNameEn: 'Mitsui Anode',     shortNameKo: '미쓰이 음극재' },
  { supplierId: 'S-PRE-001',  nameEn: 'Quzhou Precursor Co., Ltd.',           nameKo: '취저우 전구체 유한공사',    shortNameEn: 'QZ Precursor',     shortNameKo: 'QZ 전구체' },
  { supplierId: 'S-REF-001',  nameEn: 'Pilbara International Works Pty Ltd',  nameKo: '필바라 인터내셔널 웍스',    shortNameEn: 'Pilbara Refining', shortNameKo: '필바라 정제' },
  { supplierId: 'S-REF-002',  nameEn: 'Ganzhou Rare Metals Co., Ltd.',        nameKo: '간저우 희귀금속 유한공사',  shortNameEn: 'Ganzhou Rare',     shortNameKo: '간저우 희귀금속' },
  { supplierId: 'S-MINE-001', nameEn: 'Sulawesi Nickel Mine Corp.',           nameKo: '술라웨시 니켈광산(주)',     shortNameEn: 'Sulawesi Nickel',  shortNameKo: '술라웨시 니켈' },
  { supplierId: 'S-MINE-002', nameEn: 'Katanga Cobalt Mining S.A.',           nameKo: '카탕가 코발트 광산',        shortNameEn: 'Katanga Cobalt',   shortNameKo: '카탕가 코발트' },
  { supplierId: 'S-MINE-003', nameEn: 'Salar de Atacama Lithium S.A.',        nameKo: '아타카마 리튬 S.A.',       shortNameEn: 'SdA Lithium',      shortNameKo: '아타카마 리튬' },
];

export function getSupplierName(supplierId: string): SupplierName | undefined {
  return supplierNames.find(n => n.supplierId === supplierId);
}

// ============================================================
// 2. 협력사 확장 정보 (기업 일반정보)
// ============================================================
export interface SupplierExtended {
  supplierId: string;
  businessRegNo: string;
  corporateRegNo: string;
  dunsNumber: string;
  taxNumber: string;
  ceoName: string;
  website: string;
  providerType: 'manufacturer' | 'recycler' | 'trader' | 'miner';
  establishedYear: number;
  employeeCount: number;
}

export const supplierExtended: SupplierExtended[] = [
  { supplierId: 'S-CELL-001', businessRegNo: '123-45-67890',  corporateRegNo: '110111-1234567', dunsNumber: '687453291', taxNumber: 'KR-CELL-001',   ceoName: '한정민 (Han Jeongmin)', website: 'https://hanyang-cell.co.kr',  providerType: 'manufacturer', establishedYear: 2008, employeeCount: 1240 },
  { supplierId: 'S-CAM-001',  businessRegNo: '234-56-78901',  corporateRegNo: '110111-2345678', dunsNumber: '687453292', taxNumber: 'KR-CAM-001',    ceoName: '박지훈 (Park Jihoon)',  website: 'https://pos-cathode.com',     providerType: 'manufacturer', establishedYear: 2012, employeeCount: 580 },
  { supplierId: 'S-CAM-002',  businessRegNo: 'CN-91370600',   corporateRegNo: '91370600-X',     dunsNumber: '687453293', taxNumber: 'CN-CAM-002',    ceoName: 'Wei Liu',               website: 'https://yantai-cathode.cn',   providerType: 'manufacturer', establishedYear: 2015, employeeCount: 420 },
  { supplierId: 'S-ANO-001',  businessRegNo: 'JP-2700-01-12', corporateRegNo: 'JP-OSA-2700-01', dunsNumber: '687453294', taxNumber: 'JP-ANO-001',    ceoName: 'Hiroshi Tanaka',        website: 'https://mitsui-anode.jp',     providerType: 'manufacturer', establishedYear: 1995, employeeCount: 880 },
  { supplierId: 'S-PRE-001',  businessRegNo: 'CN-91440100',   corporateRegNo: '91440100-P',     dunsNumber: '687453295', taxNumber: 'CN-PRE-001',    ceoName: 'Jian Zhao',             website: 'https://qz-precursor.cn',     providerType: 'manufacturer', establishedYear: 2010, employeeCount: 690 },
  { supplierId: 'S-REF-001',  businessRegNo: 'AU-ABN-12345',  corporateRegNo: 'AU-WA-PRW-001',  dunsNumber: '687453296', taxNumber: 'AU-REF-001',    ceoName: 'James Wilson',          website: 'https://piw-refining.au',     providerType: 'manufacturer', establishedYear: 1988, employeeCount: 1450 },
  { supplierId: 'S-REF-002',  businessRegNo: 'CN-91360700',   corporateRegNo: '91360700-G',     dunsNumber: '687453297', taxNumber: 'CN-REF-002',    ceoName: 'Hong Chen',             website: 'https://ganzhou-rare.cn',     providerType: 'manufacturer', establishedYear: 2005, employeeCount: 320 },
  { supplierId: 'S-MINE-001', businessRegNo: 'ID-ESDM-NCL',   corporateRegNo: 'ID-NORI-2018',   dunsNumber: '687453298', taxNumber: 'ID-MINE-001',   ceoName: 'Roberto Cruz',          website: 'https://nori-mining.id',      providerType: 'miner',        establishedYear: 2003, employeeCount: 2100 },
  { supplierId: 'S-MINE-002', businessRegNo: 'CD-DGRAD-COB',  corporateRegNo: 'CD-KAT-2014',    dunsNumber: '687453299', taxNumber: 'CD-MINE-002',   ceoName: 'Jean-Paul Mwamba',      website: 'https://kat-cobalt.cd',       providerType: 'miner',        establishedYear: 2014, employeeCount: 1680 },
  { supplierId: 'S-MINE-003', businessRegNo: 'CL-SII-LIO',    corporateRegNo: 'CL-SDA-2010',    dunsNumber: '687453300', taxNumber: 'CL-MINE-003',   ceoName: 'Maria Vega',            website: 'https://sda-lithium.cl',      providerType: 'miner',        establishedYear: 2010, employeeCount: 420 },
];

export function getSupplierExtended(supplierId: string) {
  return supplierExtended.find(e => e.supplierId === supplierId) ?? null;
}

// ============================================================
// 3. 담당자 연락처 (공장 담당자 포함)
// ============================================================
export interface SupplierContact {
  contactId: string;
  supplierId: string;
  factoryId?: string;      // 공장 담당자인 경우 연결
  name: string;
  nameEn?: string;         // 영문 이름 (외국인 담당자)
  role: string;
  department?: string;
  email: string;
  phone: string;
  mobile?: string;
  isPrimary: boolean;
  language?: string;       // 주요 사용 언어
}

export const supplierContacts: SupplierContact[] = [
  // S-CELL-001 Hanyang Cell
  { contactId: 'C-001', supplierId: 'S-CELL-001', factoryId: 'F-001', name: '김지수 (Kim Jisu)',     nameEn: 'Kim Jisu',       role: 'ESG팀장',   department: 'ESG전략팀',   email: 'jisu.kim@hanyang-cell.co.kr',     phone: '+82-2-3456-7890',  mobile: '+82-10-1234-5678', isPrimary: true,  language: 'KO/EN' },
  { contactId: 'C-002', supplierId: 'S-CELL-001', factoryId: 'F-002', name: '이준혁 (Lee Junhyuk)',  nameEn: 'Lee Junhyuk',    role: '품질관리팀장', department: '품질관리팀',  email: 'jh.lee@hanyang-cell.co.kr',       phone: '+82-43-215-8001',  mobile: '+82-10-2345-6789', isPrimary: false, language: 'KO' },
  { contactId: 'C-003', supplierId: 'S-CELL-001', factoryId: 'F-003', name: '박민서 (Park Minseo)',  nameEn: 'Park Minseo',    role: '구매담당',   department: '구매팀',      email: 'ms.park@hanyang-cell.co.kr',      phone: '+82-43-215-8002',  mobile: '+82-10-3456-7890', isPrimary: false, language: 'KO/EN' },

  // S-CAM-001 POS Cathode
  { contactId: 'C-004', supplierId: 'S-CAM-001',  factoryId: 'F-004', name: '최유나 (Choi Yuna)',    nameEn: 'Choi Yuna',      role: 'ESG담당',    department: 'ESG팀',       email: 'yn.choi@pos-cathode.com',         phone: '+82-54-280-1100',  mobile: '+82-10-4567-8901', isPrimary: true,  language: 'KO/EN' },
  { contactId: 'C-005', supplierId: 'S-CAM-001',  factoryId: 'F-005', name: '정태양 (Jung Taeyang)', nameEn: 'Jung Taeyang',   role: '포항공장장',  department: '생산운영팀',  email: 'ty.jung@pos-cathode.com',         phone: '+82-54-280-1200',  mobile: '+82-10-5678-9012', isPrimary: false, language: 'KO' },
  { contactId: 'C-006', supplierId: 'S-CAM-001',  factoryId: 'F-006', name: '한소희 (Han Sohee)',    nameEn: 'Han Sohee',      role: '광양공장장',  department: '생산운영팀',  email: 'sh.han@pos-cathode.com',          phone: '+82-61-793-1200',  mobile: '+82-10-6789-0123', isPrimary: false, language: 'KO' },

  // S-CAM-002 Yantai Cathode
  { contactId: 'C-007', supplierId: 'S-CAM-002',  factoryId: 'F-007', name: 'Wei Liu',               nameEn: 'Wei Liu',        role: 'CEO',        department: 'Executive',   email: 'w.liu@yantai-cathode.cn',         phone: '+86-535-620-1000', mobile: '+86-139-5351-0001', isPrimary: true,  language: 'ZH/EN' },
  { contactId: 'C-008', supplierId: 'S-CAM-002',  factoryId: 'F-008', name: 'Fang Chen',             nameEn: 'Fang Chen',      role: 'ESG Manager', department: 'Compliance',  email: 'f.chen@yantai-cathode.cn',        phone: '+86-535-620-1180', mobile: '+86-139-5351-0002', isPrimary: false, language: 'ZH/EN' },

  // S-ANO-001 Mitsui Anode
  { contactId: 'C-009', supplierId: 'S-ANO-001',  factoryId: 'F-009', name: 'Hiroshi Tanaka',        nameEn: 'Hiroshi Tanaka', role: 'COO',        department: 'Operations',  email: 'h.tanaka@mitsui-anode.jp',        phone: '+81-6-6210-1000',  mobile: '+81-90-1234-5678',  isPrimary: true,  language: 'JA/EN' },
  { contactId: 'C-010', supplierId: 'S-ANO-001',  factoryId: 'F-010', name: 'Kenji Yamamoto',        nameEn: 'Kenji Yamamoto', role: 'Quality Mgr', department: 'Quality',    email: 'k.yamamoto@mitsui-anode.jp',      phone: '+81-6-6210-1180',  mobile: '+81-90-2345-6789',  isPrimary: false, language: 'JA' },

  // S-PRE-001 Quzhou Precursor
  { contactId: 'C-011', supplierId: 'S-PRE-001',  factoryId: 'F-011', name: 'Jian Zhao',             nameEn: 'Jian Zhao',      role: 'CEO',        department: 'Executive',   email: 'j.zhao@qz-precursor.cn',          phone: '+86-570-801-1000', mobile: '+86-138-5701-0001', isPrimary: true,  language: 'ZH/EN' },
  { contactId: 'C-012', supplierId: 'S-PRE-001',  factoryId: 'F-012', name: 'Li Wei',                nameEn: 'Li Wei',         role: 'ESG Manager', department: 'Compliance',  email: 'l.wei@qz-precursor.cn',           phone: '+86-570-801-1180', mobile: '+86-138-5701-0002', isPrimary: false, language: 'ZH' },

  // S-REF-001 Pilbara Refining
  { contactId: 'C-013', supplierId: 'S-REF-001',  factoryId: 'F-013', name: 'Emma Watson',           nameEn: 'Emma Watson',    role: 'ESG Director', department: 'Sustainability', email: 'emma.w@piw-refining.au',        phone: '+61-8-9200-1100',  mobile: '+61-400-123-456',   isPrimary: true,  language: 'EN' },
  { contactId: 'C-013B', supplierId: 'S-REF-001', factoryId: 'F-014', name: 'Tom Bradley',           nameEn: 'Tom Bradley',    role: 'Plant Manager', department: 'Operations',  email: 't.bradley@piw-refining.au',      phone: '+61-8-9200-1200',  mobile: '+61-400-234-567',   isPrimary: false, language: 'EN' },

  // S-REF-002 Ganzhou Rare Metals
  { contactId: 'C-014', supplierId: 'S-REF-002',  factoryId: 'F-015', name: 'Hong Chen',             nameEn: 'Hong Chen',      role: 'CEO',        department: 'Executive',   email: 'hong.chen@ganzhou-rare.cn',       phone: '+86-797-820-1000', mobile: '+86-139-7971-0001', isPrimary: true,  language: 'ZH/EN' },
  { contactId: 'C-014B', supplierId: 'S-REF-002', factoryId: 'F-015', name: 'Xiao Min',              nameEn: 'Xiao Min',       role: 'Compliance Mgr', department: 'Legal',   email: 'xiao.min@ganzhou-rare.cn',        phone: '+86-797-820-1180', mobile: '+86-139-7971-0002', isPrimary: false, language: 'ZH' },

  // S-MINE-001 Sulawesi Nickel
  { contactId: 'C-015', supplierId: 'S-MINE-001', factoryId: 'F-016', name: 'Mary Reyes',            nameEn: 'Mary Reyes',     role: 'ESG Manager', department: 'Sustainability', email: 'm.reyes@nori-mining.id',        phone: '+62-21-8855-1100', mobile: '+62-812-3456-789',  isPrimary: true,  language: 'EN/ID' },
  { contactId: 'C-015B', supplierId: 'S-MINE-001', factoryId: 'F-016', name: 'Budi Santoso',         nameEn: 'Budi Santoso',   role: 'Site Manager', department: 'Operations',  email: 'b.santoso@nori-mining.id',       phone: '+62-21-8855-1200', mobile: '+62-812-4567-890',  isPrimary: false, language: 'ID' },

  // S-MINE-002 Katanga Cobalt
  { contactId: 'C-016', supplierId: 'S-MINE-002', factoryId: 'F-017', name: 'Jean-Paul Mwamba',      nameEn: 'Jean-Paul Mwamba', role: 'CEO',      department: 'Executive',   email: 'jp.mwamba@kat-cobalt.cd',         phone: '+243-99-555-1000', mobile: '+243-99-555-1001',  isPrimary: true,  language: 'FR/EN' },
  { contactId: 'C-016B', supplierId: 'S-MINE-002', factoryId: 'F-017', name: 'Amara Diallo',         nameEn: 'Amara Diallo',   role: 'HSE Manager', department: 'HSE',         email: 'a.diallo@kat-cobalt.cd',          phone: '+243-99-555-1180', mobile: '+243-99-555-1181',  isPrimary: false, language: 'FR' },

  // S-MINE-003 SdA Lithium
  { contactId: 'C-017', supplierId: 'S-MINE-003', factoryId: 'F-018', name: 'Maria Vega',            nameEn: 'Maria Vega',     role: 'CEO',        department: 'Executive',   email: 'm.vega@sda-lithium.cl',           phone: '+56-2-2335-1000',  mobile: '+56-9-1234-5678',   isPrimary: false, language: 'ES/EN' },
  { contactId: 'C-018', supplierId: 'S-MINE-003', factoryId: 'F-018', name: 'Carlos Diaz',           nameEn: 'Carlos Diaz',    role: 'ESG Director', department: 'Sustainability', email: 'c.diaz@sda-lithium.cl',        phone: '+56-2-2335-1180',  mobile: '+56-9-2345-6789',   isPrimary: true,  language: 'ES/EN' },
];

export function getContacts(supplierId: string): SupplierContact[] {
  return supplierContacts.filter(c => c.supplierId === supplierId);
}
export function getContactsByFactory(factoryId: string): SupplierContact[] {
  return supplierContacts.filter(c => c.factoryId === factoryId);
}

// ============================================================
// 4. 공장(사업장) — 규제 v2 (11개)
// ============================================================
export interface Factory {
  factoryId: string;
  supplierId: string;
  factoryName: string;
  factoryNameEn?: string;
  factoryRole: 'headquarters' | 'production' | 'outsourcing' | 'processing' | 'mining';
  address: string;
  country: string;
  region: string;
  coordinates: [number, number];
  operatingPeriodFrom: string;
  operatingPeriodTo: string | null;
  monthlyCapacity?: string;
  isActive: boolean;
  destination?: Destination;
  destinationDetail?: string;
  applicableRegulations?: Regulation[];
  hiddenRegulations?: Regulation[];
  supplyRatioPercent?: number;
  supplyQuantity?: string;
}

export const factories: Factory[] = [
  // ── Hanyang Cell Manufacturing ──────────────────────────
  { factoryId: 'F-001', supplierId: 'S-CELL-001',
    factoryName: '한양셀 본사', factoryNameEn: 'Hanyang Cell HQ',
    factoryRole: 'headquarters',
    address: '서울특별시 강남구 테헤란로 152', country: 'KR', region: '서울 강남',
    coordinates: [127.0397, 37.4998], operatingPeriodFrom: '2008-03-15', operatingPeriodTo: null, isActive: true },

  { factoryId: 'F-002', supplierId: 'S-CELL-001',
    factoryName: '청주 1공장 (NCM811 셀)', factoryNameEn: 'Cheongju Plant 1 (NCM811 Cell)',
    factoryRole: 'production',
    address: '충북 청주시 흥덕구 오송생명로 200', country: 'KR', region: '충북 청주',
    coordinates: [127.4914, 36.6424], operatingPeriodFrom: '2018-06-01', operatingPeriodTo: null,
    monthlyCapacity: '2.4 GWh', isActive: true,
    destination: 'BOTH', destinationDetail: 'BMW 폴란드 + GM 테네시',
    applicableRegulations: ['EUDR', 'UFLPA', 'IRA', 'CSDDD', 'EU_BATTERY', 'EU_BATTERY_ART7', 'EU_BATTERY_ART47', 'CBAM', 'CONFLICT_MINERALS', 'CRMA', 'LKSG'],
    hiddenRegulations: [], supplyRatioPercent: 60, supplyQuantity: '1.44 GWh/월' },

  { factoryId: 'F-003', supplierId: 'S-CELL-001',
    factoryName: '청주 2공장 (모듈/팩 조립)', factoryNameEn: 'Cheongju Plant 2 (Module/Pack Assembly)',
    factoryRole: 'production',
    address: '충북 청주시 흥덕구 오송생명로 220', country: 'KR', region: '충북 청주',
    coordinates: [127.4920, 36.6418], operatingPeriodFrom: '2020-09-15', operatingPeriodTo: null,
    monthlyCapacity: '1.8 GWh', isActive: true,
    destination: 'BOTH', destinationDetail: 'BMW 폴란드 + GM 테네시',
    applicableRegulations: ['EUDR', 'UFLPA', 'IRA', 'CSDDD', 'EU_BATTERY', 'EU_BATTERY_ART7', 'EU_BATTERY_ART47', 'CBAM', 'CONFLICT_MINERALS', 'CRMA', 'LKSG'],
    hiddenRegulations: [], supplyRatioPercent: 40, supplyQuantity: '720 MWh/월' },

  // ── POS Cathode Materials ───────────────────────────────
  { factoryId: 'F-004', supplierId: 'S-CAM-001',
    factoryName: 'POS 양극재 본사', factoryNameEn: 'POS Cathode HQ',
    factoryRole: 'headquarters',
    address: '경북 포항시 남구 동해안로 1080', country: 'KR', region: '경북 포항',
    coordinates: [129.3435, 36.0190], operatingPeriodFrom: '2012-05-20', operatingPeriodTo: null, isActive: true },

  { factoryId: 'F-005', supplierId: 'S-CAM-001',
    factoryName: '포항 양극재 공장', factoryNameEn: 'Pohang Cathode Plant',
    factoryRole: 'production',
    address: '경북 포항시 남구 효자동 산 1-1', country: 'KR', region: '경북 포항',
    coordinates: [129.3290, 36.0085], operatingPeriodFrom: '2013-11-10', operatingPeriodTo: null,
    monthlyCapacity: '850 t', isActive: true,
    destination: 'EU', destinationDetail: '한양셀 → BMW 폴란드 (EU)',
    applicableRegulations: ['EUDR', 'EUDR_FSC', 'CSDDD', 'EU_BATTERY', 'EU_BATTERY_ART7', 'EU_BATTERY_ART47', 'CBAM', 'CONFLICT_MINERALS', 'CRMA', 'LKSG'],
    hiddenRegulations: ['UFLPA', 'IRA'], supplyRatioPercent: 65, supplyQuantity: '550 t/월' },

  { factoryId: 'F-006', supplierId: 'S-CAM-001',
    factoryName: '광양 양극재 2공장', factoryNameEn: 'Gwangyang Cathode Plant 2',
    factoryRole: 'production',
    address: '전남 광양시 광양항만로 200', country: 'KR', region: '전남 광양',
    coordinates: [127.7012, 34.9358], operatingPeriodFrom: '2021-04-05', operatingPeriodTo: null,
    monthlyCapacity: '620 t', isActive: true,
    destination: 'US', destinationDetail: '한양셀 → GM 테네시 (US)',
    applicableRegulations: ['UFLPA', 'IRA', 'CSDDD', 'CRMA'],
    hiddenRegulations: ['EUDR', 'EUDR_FSC'], supplyRatioPercent: 35, supplyQuantity: '300 t/월' },

  // ── Yantai Cathode Technology ───────────────────────────
  { factoryId: 'F-007', supplierId: 'S-CAM-002',
    factoryName: 'Yantai Cathode HQ', factoryNameEn: 'Yantai Cathode HQ',
    factoryRole: 'headquarters',
    address: '山东省烟台市开发区长江路168号', country: 'CN', region: '산둥성 옌타이',
    coordinates: [121.4480, 37.4634], operatingPeriodFrom: '2015-08-12', operatingPeriodTo: null, isActive: true },

  { factoryId: 'F-008', supplierId: 'S-CAM-002',
    factoryName: 'Yantai NCA Line A', factoryNameEn: 'Yantai NCA Production Line A',
    factoryRole: 'production',
    address: '山东省烟台市福山区工业园路58号', country: 'CN', region: '산둥성 옌타이',
    coordinates: [121.4395, 37.4988], operatingPeriodFrom: '2016-03-22', operatingPeriodTo: null,
    monthlyCapacity: '420 t', isActive: true,
    destination: 'US', destinationDetail: '한양셀 → GM 테네시 (US)',
    applicableRegulations: ['UFLPA', 'IRA', 'CSDDD', 'CRMA'],
    hiddenRegulations: ['EUDR'], supplyRatioPercent: 100, supplyQuantity: '420 t/월' },

  // ── Mitsui Anode Industries ─────────────────────────────
  { factoryId: 'F-009', supplierId: 'S-ANO-001',
    factoryName: '三井アノード本社', factoryNameEn: 'Mitsui Anode HQ',
    factoryRole: 'headquarters',
    address: '大阪府大阪市西区靱本町1-8-4', country: 'JP', region: '오사카',
    coordinates: [135.4959, 34.6862], operatingPeriodFrom: '1995-04-01', operatingPeriodTo: null, isActive: true },

  { factoryId: 'F-010', supplierId: 'S-ANO-001',
    factoryName: '三井アノード大阪工場', factoryNameEn: 'Mitsui Anode Osaka Plant',
    factoryRole: 'production',
    address: '大阪府堺市堺区築港八幡町1', country: 'JP', region: '오사카 사카이',
    coordinates: [135.4308, 34.5741], operatingPeriodFrom: '1997-09-01', operatingPeriodTo: null,
    monthlyCapacity: '680 t', isActive: true,
    destination: 'BOTH', destinationDetail: '한양셀 → EU + US',
    applicableRegulations: ['EUDR', 'CSDDD', 'EU_BATTERY', 'EU_BATTERY_ART7', 'EU_BATTERY_ART47', 'UFLPA', 'IRA', 'CRMA'],
    hiddenRegulations: [], supplyRatioPercent: 100, supplyQuantity: '680 t/월' },

  // ── Quzhou Precursor ────────────────────────────────────
  { factoryId: 'F-011', supplierId: 'S-PRE-001',
    factoryName: 'Quzhou Precursor HQ', factoryNameEn: 'Quzhou Precursor HQ',
    factoryRole: 'headquarters',
    address: '浙江省衢州市经济技术开发区', country: 'CN', region: '저장성 취저우',
    coordinates: [118.8594, 28.9568], operatingPeriodFrom: '2010-06-15', operatingPeriodTo: null, isActive: true },

  { factoryId: 'F-012', supplierId: 'S-PRE-001',
    factoryName: 'Quzhou NCM Precursor Plant', factoryNameEn: 'Quzhou NCM Precursor Plant',
    factoryRole: 'processing',
    address: '浙江省衢州市经济开发区工业路88号', country: 'CN', region: '저장성 취저우',
    coordinates: [118.8720, 28.9490], operatingPeriodFrom: '2011-03-10', operatingPeriodTo: null,
    monthlyCapacity: '520 t NCM-OH', isActive: true,
    destination: 'EU', destinationDetail: 'POS Cathode → 한양셀 → BMW 폴란드',
    applicableRegulations: ['EUDR', 'CSDDD', 'EU_BATTERY', 'EU_BATTERY_ART47', 'CONFLICT_MINERALS', 'CRMA', 'LKSG'],
    hiddenRegulations: ['UFLPA', 'IRA'], supplyRatioPercent: 100, supplyQuantity: '520 t/월' },

  // ── Pilbara International Works ─────────────────────────
  { factoryId: 'F-013', supplierId: 'S-REF-001',
    factoryName: 'Pilbara Refining HQ', factoryNameEn: 'Pilbara International Works HQ',
    factoryRole: 'headquarters',
    address: 'Level 12, 200 St Georges Terrace, Perth WA 6000', country: 'AU', region: '호주 퍼스',
    coordinates: [115.8613, -31.9523], operatingPeriodFrom: '1988-01-15', operatingPeriodTo: null, isActive: true },

  { factoryId: 'F-014', supplierId: 'S-REF-001',
    factoryName: 'Pilgangoora 정제소', factoryNameEn: 'Pilgangoora Refinery',
    factoryRole: 'processing',
    address: 'Pilgangoora, Pilbara WA 6753', country: 'AU', region: '호주 필바라',
    coordinates: [118.9050, -21.2580], operatingPeriodFrom: '1992-03-08', operatingPeriodTo: null,
    monthlyCapacity: '1,250 t LiOH', isActive: true,
    destination: 'BOTH', destinationDetail: '양극재사 → 한양셀 → 전 시장',
    applicableRegulations: ['EUDR', 'CSDDD', 'EU_BATTERY', 'EU_BATTERY_ART7', 'CBAM', 'CONFLICT_MINERALS', 'CRMA'],
    hiddenRegulations: ['UFLPA'], supplyRatioPercent: 100, supplyQuantity: '1,250 t/월' },

  // ── Ganzhou Rare Metals ─────────────────────────────────
  { factoryId: 'F-015', supplierId: 'S-REF-002',
    factoryName: 'Ganzhou Rare Metals', factoryNameEn: 'Ganzhou Rare Metals Processing Plant',
    factoryRole: 'processing',
    address: '江西省赣州市经济开发区金岭东路', country: 'CN', region: '장시성 간저우',
    coordinates: [114.9352, 25.8312], operatingPeriodFrom: '2005-11-18', operatingPeriodTo: null,
    monthlyCapacity: '420 t CoSO4', isActive: true,
    destination: 'EU', destinationDetail: '양극재사 → 한양셀 → BMW 폴란드',
    applicableRegulations: ['EUDR', 'CSDDD', 'EU_BATTERY', 'EU_BATTERY_ART47', 'CONFLICT_MINERALS', 'CRMA', 'LKSG'],
    hiddenRegulations: ['UFLPA', 'IRA'], supplyRatioPercent: 100, supplyQuantity: '420 t/월' },

  // ── Sulawesi Nickel Mine ────────────────────────────────
  { factoryId: 'F-016', supplierId: 'S-MINE-001',
    factoryName: 'Sulawesi Nickel Mine (Nori)', factoryNameEn: 'Nori Nickel Mine Sulawesi',
    factoryRole: 'mining',
    address: 'Surigao del Norte, Mindanao', country: 'PH', region: '필리핀 수리가오',
    coordinates: [125.5050, 9.8480], operatingPeriodFrom: '2003-06-22', operatingPeriodTo: null,
    monthlyCapacity: '850 t Ni', isActive: true,
    destination: 'BOTH', destinationDetail: 'QZ 전구체 → 전 시장',
    applicableRegulations: ['EUDR', 'CSDDD', 'CONFLICT_MINERALS', 'CRMA'],
    hiddenRegulations: ['UFLPA', 'IRA'], supplyRatioPercent: 100, supplyQuantity: '850 t/월' },

  // ── Katanga Cobalt Mining ───────────────────────────────
  { factoryId: 'F-017', supplierId: 'S-MINE-002',
    factoryName: 'Katanga Cobalt Mine', factoryNameEn: 'Katanga Cobalt Mining Site',
    factoryRole: 'mining',
    address: 'Kolwezi, Lualaba Province', country: 'CD', region: '콩고 카탕가',
    coordinates: [25.4664, -10.7167], operatingPeriodFrom: '2014-01-15', operatingPeriodTo: null,
    monthlyCapacity: '320 t Co', isActive: true,
    destination: 'EU', destinationDetail: 'Ganzhou → 한양셀 → BMW 폴란드',
    applicableRegulations: ['EUDR', 'CSDDD', 'CONFLICT_MINERALS', 'CRMA'],
    hiddenRegulations: ['UFLPA', 'IRA'], supplyRatioPercent: 100, supplyQuantity: '320 t/월' },

  // ── Salar de Atacama Lithium ────────────────────────────
  { factoryId: 'F-018', supplierId: 'S-MINE-003',
    factoryName: 'Salar de Atacama Plant', factoryNameEn: 'Salar de Atacama Lithium Extraction Plant',
    factoryRole: 'mining',
    address: 'Salar de Atacama, Antofagasta', country: 'CL', region: '칠레 아타카마',
    coordinates: [-68.2350, -23.5050], operatingPeriodFrom: '2010-08-08', operatingPeriodTo: null,
    monthlyCapacity: '180 t LiOH', isActive: true,
    destination: 'BOTH', destinationDetail: 'Pilbara → 전 시장',
    applicableRegulations: ['EUDR', 'CSDDD', 'CBAM', 'CONFLICT_MINERALS', 'CRMA'],
    hiddenRegulations: ['UFLPA', 'IRA'], supplyRatioPercent: 100, supplyQuantity: '180 t/월' },
];

export function getFactories(supplierId: string): Factory[] {
  return factories.filter(f => f.supplierId === supplierId);
}

// ============================================================
// 5. 리스크 프로필 (종합 위험도 + FEOC + 실사)
// ============================================================
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type FeocStatus = 'eligible' | 'ineligible' | 'under_review' | 'unknown';
export type AuditType = 'on_site' | 'remote' | 'document_review' | 'third_party';
export type AuditResult = 'pass' | 'conditional_pass' | 'fail' | 'pending';

export interface AuditRecord {
  auditId: string;
  supplierId: string;
  auditDate: string;
  auditType: AuditType;
  auditor: string;              // 감사 기관/담당자
  auditScope: string;           // 감사 범위
  result: AuditResult;
  findings: string[];           // 주요 발견 사항
  correctiveActions: string[];  // 시정 요구 사항
  nextAuditDue: string;
  reportUrl?: string;
}

export interface HumanRightsIssue {
  issueId: string;
  supplierId: string;
  factoryId?: string;
  issueType: 'forced_labor' | 'child_labor' | 'freedom_of_association' | 'discrimination' | 'harassment' | 'wages' | 'working_hours' | 'other';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  detectedAt: string;
  status: 'open' | 'in_remediation' | 'resolved' | 'monitoring';
  source: string;               // 발견 경로 (감사, 고충처리, NGO 제보 등)
  resolvedAt?: string;
}

export interface IndustrialAccident {
  accidentId: string;
  supplierId: string;
  factoryId?: string;
  accidentDate: string;
  accidentType: 'fatality' | 'serious_injury' | 'minor_injury' | 'near_miss' | 'environmental';
  description: string;
  casualties: number;
  ltifr?: number;               // Lost Time Injury Frequency Rate
  status: 'reported' | 'investigating' | 'closed';
  correctiveAction?: string;
}

export interface SupplierRiskProfile {
  supplierId: string;
  overallRiskScore: number;     // 0-100 (높을수록 위험)
  riskLevel: RiskLevel;
  feocStatus: FeocStatus;
  feocDirectOwnership?: number; // 직접 지분율 %
  feocIndirectOwnership?: number; // 간접 지분율 %
  feocLastAssessedAt?: string;
  feocCertExpiry?: string;
  isHighRiskFlag: boolean;      // 고위험 플래그
  highRiskReasons: string[];    // 고위험 사유
  auditRecords: AuditRecord[];
  humanRightsIssues: HumanRightsIssue[];
  industrialAccidents: IndustrialAccident[];
  lastRiskReviewAt: string;
}

export const supplierRiskProfiles: SupplierRiskProfile[] = [
  // S-CELL-001 Hanyang Cell — 저위험
  {
    supplierId: 'S-CELL-001',
    overallRiskScore: 18, riskLevel: 'low',
    feocStatus: 'eligible', feocDirectOwnership: 0, feocIndirectOwnership: 2.1,
    feocLastAssessedAt: '2026-03-15', feocCertExpiry: '2027-03-14',
    isHighRiskFlag: false, highRiskReasons: [],
    lastRiskReviewAt: '2026-04-10',
    auditRecords: [
      { auditId: 'AUD-CELL-001', supplierId: 'S-CELL-001', auditDate: '2026-03-10',
        auditType: 'on_site', auditor: 'TÜV Rheinland Korea',
        auditScope: 'ESG 전반 (인권, 환경, 노동, 부패방지)',
        result: 'pass', findings: ['문서 보관 체계 개선 필요'],
        correctiveActions: ['문서관리 시스템 업그레이드 (2026-06-30까지)'],
        nextAuditDue: '2027-03-10' },
    ],
    humanRightsIssues: [],
    industrialAccidents: [
      { accidentId: 'ACC-CELL-001', supplierId: 'S-CELL-001', factoryId: 'F-002',
        accidentDate: '2025-11-14', accidentType: 'minor_injury',
        description: '청주 1공장 컨베이어 벨트 끼임 사고 (1명 경상)',
        casualties: 1, ltifr: 0.8, status: 'closed',
        correctiveAction: '안전가드 설치 완료 (2025-12-01)' },
    ],
  },

  // S-CAM-001 POS Cathode — 저위험
  {
    supplierId: 'S-CAM-001',
    overallRiskScore: 22, riskLevel: 'low',
    feocStatus: 'eligible', feocDirectOwnership: 0, feocIndirectOwnership: 0,
    feocLastAssessedAt: '2026-02-20', feocCertExpiry: '2027-02-19',
    isHighRiskFlag: false, highRiskReasons: [],
    lastRiskReviewAt: '2026-03-05',
    auditRecords: [
      { auditId: 'AUD-CAM-001', supplierId: 'S-CAM-001', auditDate: '2025-12-05',
        auditType: 'on_site', auditor: 'Bureau Veritas Korea',
        auditScope: '노동·인권 실사 (CSDDD 기준)',
        result: 'pass', findings: ['공정도 4단계 문서 미비'],
        correctiveActions: ['공정도 PDF 업데이트 (2026-03-31까지)'],
        nextAuditDue: '2026-12-05' },
    ],
    humanRightsIssues: [],
    industrialAccidents: [],
  },

  // S-CAM-002 Yantai Cathode — 중위험 (중국, FEOC 검토중)
  {
    supplierId: 'S-CAM-002',
    overallRiskScore: 58, riskLevel: 'medium',
    feocStatus: 'under_review', feocDirectOwnership: 28.5, feocIndirectOwnership: 12.0,
    feocLastAssessedAt: '2026-01-15', feocCertExpiry: undefined,
    isHighRiskFlag: true,
    highRiskReasons: ['FEOC 직접 지분율 25% 초과 (28.5%)', '중국 국영기업 간접 지분 확인 필요', '광물 추적 시스템 미구축'],
    lastRiskReviewAt: '2026-02-08',
    auditRecords: [
      { auditId: 'AUD-CAM-002', supplierId: 'S-CAM-002', auditDate: '2025-10-20',
        auditType: 'document_review', auditor: 'KPMG China',
        auditScope: 'FEOC 지분 구조 검토',
        result: 'conditional_pass',
        findings: ['국영기업 간접 출자 경로 불명확', '공급망 원산지 추적 불완전'],
        correctiveActions: ['지분 구조도 제출 (2026-04-30까지)', '광물 추적 시스템 도입 계획 수립'],
        nextAuditDue: '2026-07-20' },
    ],
    humanRightsIssues: [
      { issueId: 'HR-CAM-002-001', supplierId: 'S-CAM-002', factoryId: 'F-008',
        issueType: 'working_hours', severity: 'minor',
        description: '생산 성수기 초과근무 시간 법정 기준 초과 (월 52시간 → 68시간)',
        detectedAt: '2025-09-15', status: 'in_remediation',
        source: '내부 감사' },
    ],
    industrialAccidents: [],
  },

  // S-ANO-001 Mitsui Anode — 저위험
  {
    supplierId: 'S-ANO-001',
    overallRiskScore: 15, riskLevel: 'low',
    feocStatus: 'eligible', feocDirectOwnership: 0, feocIndirectOwnership: 0,
    feocLastAssessedAt: '2026-03-01', feocCertExpiry: '2027-02-28',
    isHighRiskFlag: false, highRiskReasons: [],
    lastRiskReviewAt: '2026-03-15',
    auditRecords: [
      { auditId: 'AUD-ANO-001', supplierId: 'S-ANO-001', auditDate: '2026-01-18',
        auditType: 'on_site', auditor: 'SGS Japan',
        auditScope: '환경·노동·공급망 실사',
        result: 'pass', findings: [],
        correctiveActions: [], nextAuditDue: '2027-01-18' },
    ],
    humanRightsIssues: [],
    industrialAccidents: [],
  },

  // S-PRE-001 Quzhou Precursor — 중위험
  {
    supplierId: 'S-PRE-001',
    overallRiskScore: 52, riskLevel: 'medium',
    feocStatus: 'under_review', feocDirectOwnership: 15.0, feocIndirectOwnership: 8.5,
    feocLastAssessedAt: '2025-12-10', feocCertExpiry: undefined,
    isHighRiskFlag: false,
    highRiskReasons: ['FEOC 지분 검토 진행 중', '제3자 검증 보고서 미제출', '코발트 원료 출처 불명확'],
    lastRiskReviewAt: '2026-01-20',
    auditRecords: [
      { auditId: 'AUD-PRE-001', supplierId: 'S-PRE-001', auditDate: '2025-11-05',
        auditType: 'remote', auditor: '한양셀 공급망팀',
        auditScope: '서류 검토 (인권·환경)',
        result: 'conditional_pass',
        findings: ['제조공정도 미비', '원료 출처 코발트 미확인', '단가 정보 미갱신'],
        correctiveActions: ['제조공정도 2026-06-30까지 제출', '코발트 원산지 증명서 첨부'],
        nextAuditDue: '2026-08-05' },
    ],
    humanRightsIssues: [],
    industrialAccidents: [],
  },

  // S-REF-001 Pilbara Refining — 저위험
  {
    supplierId: 'S-REF-001',
    overallRiskScore: 20, riskLevel: 'low',
    feocStatus: 'eligible', feocDirectOwnership: 0, feocIndirectOwnership: 0,
    feocLastAssessedAt: '2026-02-10', feocCertExpiry: '2027-02-09',
    isHighRiskFlag: false, highRiskReasons: [],
    lastRiskReviewAt: '2026-03-01',
    auditRecords: [
      { auditId: 'AUD-REF-001', supplierId: 'S-REF-001', auditDate: '2025-10-12',
        auditType: 'on_site', auditor: 'Intertek Australia',
        auditScope: 'ESG 전반 + 원산지 검증',
        result: 'pass',
        findings: ['Scope 3 배출량 산정 방법론 개선 권고'],
        correctiveActions: ['Scope 3 측정 체계 2026-12-31까지 구축'],
        nextAuditDue: '2026-10-12' },
    ],
    humanRightsIssues: [],
    industrialAccidents: [
      { accidentId: 'ACC-REF-001', supplierId: 'S-REF-001', factoryId: 'F-014',
        accidentDate: '2025-07-22', accidentType: 'minor_injury',
        description: '정제소 화학물질 취급 중 피부 접촉 사고 (2명 경상)',
        casualties: 2, ltifr: 1.2, status: 'closed',
        correctiveAction: 'PPE 착용 의무화 강화 및 교육 실시' },
    ],
  },

  // S-REF-002 Ganzhou Rare Metals — 고위험 (중국, FEOC, 인권)
  {
    supplierId: 'S-REF-002',
    overallRiskScore: 78, riskLevel: 'high',
    feocStatus: 'ineligible', feocDirectOwnership: 41.2, feocIndirectOwnership: 18.5,
    feocLastAssessedAt: '2025-11-20', feocCertExpiry: undefined,
    isHighRiskFlag: true,
    highRiskReasons: [
      'FEOC 부적격 — 중국 국영기업 직접 지분 41.2%',
      'ISO 14001 인증 만료 (2026-04-09)',
      '데이터 완성도 57.7% (임계치 미달)',
      'FEOC 지분 공시 미이행',
      '광물 추적 시스템 미구축',
    ],
    lastRiskReviewAt: '2026-01-10',
    auditRecords: [
      { auditId: 'AUD-REF-002', supplierId: 'S-REF-002', auditDate: '2025-09-08',
        auditType: 'document_review', auditor: '한양셀 ESG팀',
        auditScope: 'FEOC 지분 구조 + 환경 인증 현황',
        result: 'fail',
        findings: ['중국 국영기업 지분 41.2% 확인', 'ISO 14001 갱신 미이행', 'CSR 보고서 3년째 미발행'],
        correctiveActions: [
          'ISO 14001 재인증 취득 (2026-09-30까지)',
          'CSR 보고서 발행 (2026-12-31까지)',
          'FEOC 지분 공시 문서 제출 즉시',
        ],
        nextAuditDue: '2026-06-08' },
    ],
    humanRightsIssues: [
      { issueId: 'HR-REF-002-001', supplierId: 'S-REF-002', factoryId: 'F-015',
        issueType: 'working_hours', severity: 'major',
        description: '야간 교대 근무자 주 60시간 이상 근무 확인 (법정 44시간 초과)',
        detectedAt: '2025-09-08', status: 'open', source: '현장 감사' },
      { issueId: 'HR-REF-002-002', supplierId: 'S-REF-002', factoryId: 'F-015',
        issueType: 'freedom_of_association', severity: 'major',
        description: '노동조합 결성 시도 직원 2명 해고 의혹',
        detectedAt: '2025-10-15', status: 'in_remediation', source: '내부 고충처리 채널' },
    ],
    industrialAccidents: [
      { accidentId: 'ACC-REF-002-001', supplierId: 'S-REF-002', factoryId: 'F-015',
        accidentDate: '2025-12-03', accidentType: 'serious_injury',
        description: '코발트 황산화물 누출로 인한 화학화상 (3명 중상)',
        casualties: 3, ltifr: 4.8, status: 'investigating',
        correctiveAction: '긴급 설비 점검 및 안전 프로토콜 재수립 중' },
    ],
  },

  // S-MINE-001 Sulawesi Nickel — 중위험
  {
    supplierId: 'S-MINE-001',
    overallRiskScore: 44, riskLevel: 'medium',
    feocStatus: 'eligible', feocDirectOwnership: 0, feocIndirectOwnership: 0,
    feocLastAssessedAt: '2026-01-08', feocCertExpiry: '2027-01-07',
    isHighRiskFlag: false,
    highRiskReasons: ['광산 폴리곤 좌표 미제출', '환경영향평가 갱신 지연', '지역 커뮤니티 합의서 미확보'],
    lastRiskReviewAt: '2026-02-14',
    auditRecords: [
      { auditId: 'AUD-MINE-001', supplierId: 'S-MINE-001', auditDate: '2025-11-28',
        auditType: 'on_site', auditor: 'RMI (Responsible Minerals Initiative)',
        auditScope: 'RMAP 기준 — 원산지, 분쟁광물, 인권',
        result: 'conditional_pass',
        findings: ['환경영향평가 2년 갱신 지연', '원주민 사전 동의 서류 불완전'],
        correctiveActions: ['EIA 갱신 2026-09-30까지', '커뮤니티 합의 재체결 2026-12-31까지'],
        nextAuditDue: '2026-11-28' },
    ],
    humanRightsIssues: [
      { issueId: 'HR-MINE-001-001', supplierId: 'S-MINE-001', factoryId: 'F-016',
        issueType: 'other', severity: 'minor',
        description: '지역 원주민(Lumad) 커뮤니티 토지 사용 동의 절차 미흡',
        detectedAt: '2025-11-28', status: 'in_remediation', source: '현장 감사 + NGO 제보' },
    ],
    industrialAccidents: [
      { accidentId: 'ACC-MINE-001-001', supplierId: 'S-MINE-001', factoryId: 'F-016',
        accidentDate: '2025-08-18', accidentType: 'serious_injury',
        description: '갱도 내 장비 전도 사고 (2명 중상)',
        casualties: 2, ltifr: 2.1, status: 'closed',
        correctiveAction: '장비 안전 규격 강화 및 운전 자격 재교육 완료' },
    ],
  },

  // S-MINE-002 Katanga Cobalt — 최고위험 (DRC, 분쟁광물, 아동노동 의혹)
  {
    supplierId: 'S-MINE-002',
    overallRiskScore: 88, riskLevel: 'critical',
    feocStatus: 'unknown', feocDirectOwnership: undefined, feocIndirectOwnership: undefined,
    feocLastAssessedAt: '2025-06-10',
    isHighRiskFlag: true,
    highRiskReasons: [
      'DRC 분쟁광물 고위험 지역 (카탕가)',
      '아동노동 감사 미완료',
      'Bettercoal 인증 갱신 지연',
      '데이터 완성도 59.1% (임계치 미달)',
      'FEOC 지분 구조 미파악',
      'EITI 공시 미이행',
      'NGO 인권 침해 보고서 2건',
    ],
    lastRiskReviewAt: '2025-12-20',
    auditRecords: [
      { auditId: 'AUD-MINE-002', supplierId: 'S-MINE-002', auditDate: '2025-06-10',
        auditType: 'third_party', auditor: 'OECD-AFDP 인증 감사기관',
        auditScope: '분쟁광물 실사 (OECD 5단계 가이던스)',
        result: 'conditional_pass',
        findings: [
          '아동노동 리스크 — 인근 ASM 광산과의 혼합 가능성',
          'Bettercoal 인증 2026-03-14 만료 미갱신',
          '광산 폴리곤 좌표 미제출',
          'EITI 공개 보고 미이행',
        ],
        correctiveActions: [
          '아동노동 현장 감사 2026-06-30까지 완료',
          'Bettercoal 인증 즉시 재취득',
          '폴리곤 좌표 제출 즉시',
          'EITI 공개 보고 2026-12-31까지',
        ],
        nextAuditDue: '2026-06-10' },
    ],
    humanRightsIssues: [
      { issueId: 'HR-MINE-002-001', supplierId: 'S-MINE-002', factoryId: 'F-017',
        issueType: 'child_labor', severity: 'critical',
        description: 'NGO 보고서 — 인근 ASM 코발트 광산에 14세 미만 아동 노동자 혼입 의혹 (Global Witness, 2025-09)',
        detectedAt: '2025-09-12', status: 'open', source: 'NGO 제보 (Global Witness)' },
      { issueId: 'HR-MINE-002-002', supplierId: 'S-MINE-002', factoryId: 'F-017',
        issueType: 'forced_labor', severity: 'major',
        description: '광산 계약직 노동자 여권 압류 및 이직 제한 의혹',
        detectedAt: '2025-11-03', status: 'open', source: 'Amnesty International 보고' },
    ],
    industrialAccidents: [
      { accidentId: 'ACC-MINE-002-001', supplierId: 'S-MINE-002', factoryId: 'F-017',
        accidentDate: '2026-01-09', accidentType: 'fatality',
        description: '갱도 붕괴 사고 — 사망 2명, 중상 5명',
        casualties: 7, ltifr: 12.4, status: 'investigating',
        correctiveAction: '국제 광산 안전 기준 전면 재점검 및 외부 감리 중' },
    ],
  },

  // S-MINE-003 SdA Lithium — 저위험
  {
    supplierId: 'S-MINE-003',
    overallRiskScore: 28, riskLevel: 'low',
    feocStatus: 'eligible', feocDirectOwnership: 0, feocIndirectOwnership: 0,
    feocLastAssessedAt: '2026-02-25', feocCertExpiry: '2027-02-24',
    isHighRiskFlag: false,
    highRiskReasons: ['지하수 사용량 보고 지연 (칠레 환경부 요구)'],
    lastRiskReviewAt: '2026-03-10',
    auditRecords: [
      { auditId: 'AUD-MINE-003', supplierId: 'S-MINE-003', auditDate: '2025-12-15',
        auditType: 'on_site', auditor: 'IRMA (Initiative for Responsible Mining Assurance)',
        auditScope: 'IRMA-75 기준 전체 감사',
        result: 'pass',
        findings: ['지하수 모니터링 보고 빈도 강화 권고'],
        correctiveActions: ['분기별 → 월별 지하수 보고 전환 (2026-07-01까지)'],
        nextAuditDue: '2027-12-15' },
    ],
    humanRightsIssues: [],
    industrialAccidents: [],
  },
];

export function getRiskProfile(supplierId: string): SupplierRiskProfile | null {
  return supplierRiskProfiles.find(r => r.supplierId === supplierId) ?? null;
}

// ============================================================
// 6. 원산지 증명서 관리
// ============================================================
export type OriginCertType =
  | 'FTA'           // FTA 원산지 증명서
  | 'GSP'           // 일반특혜관세 원산지 증명서
  | 'UFLPA_REBUTTAL'// UFLPA 반증용
  | 'IRA_ORIGIN'    // IRA 원산지 적격 증명
  | 'CONFLICT_FREE' // 분쟁광물 無분쟁 선언
  | 'GENERAL';      // 일반 원산지 증명

export interface OriginCertificate {
  certId: string;
  supplierId: string;
  factoryId?: string;
  certType: OriginCertType;
  certNumber: string;
  issuingAuthority: string;
  issuedAt: string;
  expiresAt: string;
  originCountry: string;
  coveredMinerals?: string[];   // 적용 광물
  status: 'valid' | 'expiring_soon' | 'expired' | 'under_review';
  documentUrl?: string;
}

export const originCertificates: OriginCertificate[] = [
  { certId: 'OC-001', supplierId: 'S-CELL-001', factoryId: 'F-002', certType: 'IRA_ORIGIN', certNumber: 'IRA-KR-2025-001', issuingAuthority: '산업통상자원부', issuedAt: '2025-06-01', expiresAt: '2026-05-31', originCountry: 'KR', status: 'expiring_soon' },
  { certId: 'OC-002', supplierId: 'S-CELL-001', factoryId: 'F-003', certType: 'FTA', certNumber: 'FTA-KR-EU-2025-088', issuingAuthority: '대한상공회의소', issuedAt: '2025-01-15', expiresAt: '2026-01-14', originCountry: 'KR', status: 'expired' },
  { certId: 'OC-003', supplierId: 'S-CAM-001',  factoryId: 'F-005', certType: 'FTA', certNumber: 'FTA-KR-EU-2026-012', issuingAuthority: '포항상공회의소', issuedAt: '2026-01-10', expiresAt: '2027-01-09', originCountry: 'KR', status: 'valid' },
  { certId: 'OC-004', supplierId: 'S-CAM-001',  factoryId: 'F-006', certType: 'IRA_ORIGIN', certNumber: 'IRA-KR-2025-022', issuingAuthority: '산업통상자원부', issuedAt: '2025-08-01', expiresAt: '2026-07-31', originCountry: 'KR', status: 'valid' },
  { certId: 'OC-005', supplierId: 'S-CAM-002',  factoryId: 'F-008', certType: 'UFLPA_REBUTTAL', certNumber: 'CBP-CN-2025-YT-001', issuingAuthority: 'CBP (US Customs)', issuedAt: '2025-05-15', expiresAt: '2026-05-14', originCountry: 'CN', status: 'expiring_soon', coveredMinerals: ['니켈', '리튬'] },
  { certId: 'OC-006', supplierId: 'S-PRE-001',  factoryId: 'F-012', certType: 'CONFLICT_FREE', certNumber: 'CMRT-QZ-2026-001', issuingAuthority: 'RMI (Responsible Minerals Initiative)', issuedAt: '2026-02-01', expiresAt: '2027-01-31', originCountry: 'CN', status: 'valid', coveredMinerals: ['코발트', '니켈', '망간'] },
  { certId: 'OC-007', supplierId: 'S-REF-001',  factoryId: 'F-014', certType: 'IRA_ORIGIN', certNumber: 'IRA-AU-2025-008', issuingAuthority: 'Australian DIT', issuedAt: '2025-09-01', expiresAt: '2026-08-31', originCountry: 'AU', status: 'valid', coveredMinerals: ['리튬'] },
  { certId: 'OC-008', supplierId: 'S-REF-002',  factoryId: 'F-015', certType: 'UFLPA_REBUTTAL', certNumber: 'CBP-CN-2024-GZ-003', issuingAuthority: 'CBP (US Customs)', issuedAt: '2024-11-01', expiresAt: '2025-10-31', originCountry: 'CN', status: 'expired', coveredMinerals: ['코발트'] },
  { certId: 'OC-009', supplierId: 'S-MINE-001', factoryId: 'F-016', certType: 'CONFLICT_FREE', certNumber: 'RMAP-ID-2025-NC-011', issuingAuthority: 'RMI RMAP', issuedAt: '2025-11-01', expiresAt: '2026-10-31', originCountry: 'ID', status: 'valid', coveredMinerals: ['니켈'] },
  { certId: 'OC-010', supplierId: 'S-MINE-002', factoryId: 'F-017', certType: 'CONFLICT_FREE', certNumber: 'RMAP-CD-2024-CO-008', issuingAuthority: 'RMI RMAP', issuedAt: '2024-06-15', expiresAt: '2025-06-14', originCountry: 'CD', status: 'expired', coveredMinerals: ['코발트'] },
  { certId: 'OC-011', supplierId: 'S-MINE-003', factoryId: 'F-018', certType: 'IRA_ORIGIN', certNumber: 'IRA-CL-2025-014', issuingAuthority: 'Servicio Nacional de Aduanas (Chile)', issuedAt: '2025-10-01', expiresAt: '2026-09-30', originCountry: 'CL', status: 'valid', coveredMinerals: ['리튬'] },
];

export function getOriginCertificates(supplierId: string): OriginCertificate[] {
  return originCertificates.filter(c => c.supplierId === supplierId);
}

// ============================================================
// 7. 교육 관리 (사업장별)
// ============================================================
export type TrainingCategory =
  | 'human_rights'      // 인권 교육
  | 'safety'            // 산업안전
  | 'environmental'     // 환경
  | 'anti_corruption'   // 반부패
  | 'conflict_minerals' // 분쟁광물
  | 'data_protection'   // 개인정보/데이터
  | 'esg_general';      // ESG 일반

export interface TrainingMaterial {
  materialId: string;
  title: string;
  titleEn?: string;
  category: TrainingCategory;
  description: string;
  format: 'pdf' | 'video' | 'online' | 'onsite';
  durationMinutes: number;
  requiredFor: string[];   // 대상 규제 (Regulation 코드)
  version: string;
  updatedAt: string;
  url?: string;
}

export const trainingMaterials: TrainingMaterial[] = [
  { materialId: 'TM-001', title: '인권 실사 기초 가이드', titleEn: 'Human Rights Due Diligence Guide', category: 'human_rights', description: 'CSDDD·LKSG 기준 인권 실사 절차 및 체크리스트', format: 'pdf', durationMinutes: 60, requiredFor: ['CSDDD', 'LKSG'], version: 'v2.1', updatedAt: '2026-02-15' },
  { materialId: 'TM-002', title: '분쟁광물 규정 이해', titleEn: 'Understanding Conflict Minerals Regulation', category: 'conflict_minerals', description: 'EU 분쟁광물 규정 2017/821 및 OECD 가이던스 요약', format: 'video', durationMinutes: 45, requiredFor: ['CONFLICT_MINERALS'], version: 'v1.3', updatedAt: '2025-11-20' },
  { materialId: 'TM-003', title: '광산 안전 표준 (IRMA)', titleEn: 'Mining Safety Standards (IRMA)', category: 'safety', description: 'IRMA 기준 광산 안전 절차 및 보고 양식', format: 'online', durationMinutes: 90, requiredFor: ['CSDDD'], version: 'v1.0', updatedAt: '2025-09-01' },
  { materialId: 'TM-004', title: 'UFLPA 대응 매뉴얼', titleEn: 'UFLPA Compliance Manual', category: 'human_rights', description: '미국 UFLPA 반증 요건 및 CBP 대응 가이드', format: 'pdf', durationMinutes: 75, requiredFor: ['UFLPA'], version: 'v2.0', updatedAt: '2026-01-10' },
  { materialId: 'TM-005', title: 'EU 배터리법 공급망 실사 (Art.47)', titleEn: 'EU Battery Regulation Art.47 Due Diligence', category: 'esg_general', description: 'Battery DDP 수립 절차 및 notified body 검증 안내', format: 'pdf', durationMinutes: 120, requiredFor: ['EU_BATTERY_ART47'], version: 'v1.0', updatedAt: '2026-03-20' },
  { materialId: 'TM-006', title: '탄소발자국 측정 가이드 (Art.7)', titleEn: 'Carbon Footprint Measurement Guide (Art.7)', category: 'environmental', description: 'Scope 1-3 배출량 산정 방법론 및 검증 절차', format: 'online', durationMinutes: 90, requiredFor: ['EU_BATTERY_ART7', 'CBAM'], version: 'v1.2', updatedAt: '2026-04-05' },
  { materialId: 'TM-007', title: '아동노동 방지 실무 교육', titleEn: 'Child Labor Prevention Training', category: 'human_rights', description: 'ILO 기준 아동노동 식별·대응 절차', format: 'video', durationMinutes: 60, requiredFor: ['CSDDD', 'CONFLICT_MINERALS'], version: 'v1.1', updatedAt: '2025-12-01' },
  { materialId: 'TM-008', title: '반부패·뇌물방지 교육', titleEn: 'Anti-Bribery & Corruption Training', category: 'anti_corruption', description: 'FCPA/UK Bribery Act 기준 반부패 정책 교육', format: 'online', durationMinutes: 60, requiredFor: ['CSDDD', 'LKSG'], version: 'v2.0', updatedAt: '2026-01-20' },
];

export interface TrainingRecord {
  recordId: string;
  supplierId: string;
  factoryId: string;
  materialId: string;
  traineeCount: number;        // 이수 인원
  totalEligible: number;       // 대상 총 인원
  completionRate: number;      // 이수율 %
  completedAt?: string;        // 완료일 (미완료면 undefined)
  dueDate: string;             // 이수 기한
  status: 'completed' | 'in_progress' | 'overdue' | 'not_started';
  instructor?: string;
  notes?: string;
}

export const trainingRecords: TrainingRecord[] = [
  // Hanyang Cell
  { recordId: 'TR-001', supplierId: 'S-CELL-001', factoryId: 'F-002', materialId: 'TM-001', traineeCount: 45, totalEligible: 45, completionRate: 100, completedAt: '2026-03-20', dueDate: '2026-03-31', status: 'completed', instructor: '김지수 ESG팀장' },
  { recordId: 'TR-002', supplierId: 'S-CELL-001', factoryId: 'F-002', materialId: 'TM-005', traineeCount: 12, totalEligible: 12, completionRate: 100, completedAt: '2026-04-15', dueDate: '2026-04-30', status: 'completed', instructor: '외부 강사 (TÜV SÜD)' },
  { recordId: 'TR-003', supplierId: 'S-CELL-001', factoryId: 'F-002', materialId: 'TM-006', traineeCount: 8, totalEligible: 10, completionRate: 80, dueDate: '2026-05-31', status: 'in_progress' },

  // POS Cathode 포항
  { recordId: 'TR-004', supplierId: 'S-CAM-001', factoryId: 'F-005', materialId: 'TM-001', traineeCount: 28, totalEligible: 28, completionRate: 100, completedAt: '2026-02-28', dueDate: '2026-02-28', status: 'completed', instructor: '최유나 ESG담당' },
  { recordId: 'TR-005', supplierId: 'S-CAM-001', factoryId: 'F-005', materialId: 'TM-002', traineeCount: 20, totalEligible: 20, completionRate: 100, completedAt: '2026-03-15', dueDate: '2026-03-31', status: 'completed' },
  { recordId: 'TR-006', supplierId: 'S-CAM-001', factoryId: 'F-006', materialId: 'TM-004', traineeCount: 15, totalEligible: 15, completionRate: 100, completedAt: '2026-04-10', dueDate: '2026-04-30', status: 'completed', instructor: '한소희 공장장' },

  // Yantai Cathode — 미이수 다수
  { recordId: 'TR-007', supplierId: 'S-CAM-002', factoryId: 'F-008', materialId: 'TM-001', traineeCount: 12, totalEligible: 35, completionRate: 34, dueDate: '2026-04-30', status: 'overdue' },
  { recordId: 'TR-008', supplierId: 'S-CAM-002', factoryId: 'F-008', materialId: 'TM-004', traineeCount: 0, totalEligible: 35, completionRate: 0, dueDate: '2026-05-31', status: 'not_started' },

  // Ganzhou Rare Metals — 미이수
  { recordId: 'TR-009', supplierId: 'S-REF-002', factoryId: 'F-015', materialId: 'TM-001', traineeCount: 5, totalEligible: 30, completionRate: 17, dueDate: '2026-03-31', status: 'overdue', notes: '반복 요청에도 이수 미진행' },
  { recordId: 'TR-010', supplierId: 'S-REF-002', factoryId: 'F-015', materialId: 'TM-007', traineeCount: 0, totalEligible: 30, completionRate: 0, dueDate: '2026-04-30', status: 'overdue' },

  // Katanga Cobalt — 위험 수준
  { recordId: 'TR-011', supplierId: 'S-MINE-002', factoryId: 'F-017', materialId: 'TM-003', traineeCount: 40, totalEligible: 200, completionRate: 20, dueDate: '2026-02-28', status: 'overdue', notes: '산업안전 교육 심각 미이수 — 갱도 사고와 연계' },
  { recordId: 'TR-012', supplierId: 'S-MINE-002', factoryId: 'F-017', materialId: 'TM-007', traineeCount: 0, totalEligible: 200, completionRate: 0, dueDate: '2026-01-31', status: 'overdue', notes: '아동노동 방지 교육 미실시 — 즉시 이행 요구' },

  // SdA Lithium
  { recordId: 'TR-013', supplierId: 'S-MINE-003', factoryId: 'F-018', materialId: 'TM-001', traineeCount: 80, totalEligible: 80, completionRate: 100, completedAt: '2026-01-20', dueDate: '2026-01-31', status: 'completed', instructor: 'Carlos Diaz ESG Director' },
  { recordId: 'TR-014', supplierId: 'S-MINE-003', factoryId: 'F-018', materialId: 'TM-006', traineeCount: 15, totalEligible: 15, completionRate: 100, completedAt: '2026-03-10', dueDate: '2026-03-31', status: 'completed' },
];

export function getTrainingRecords(supplierId: string): TrainingRecord[] {
  return trainingRecords.filter(r => r.supplierId === supplierId);
}
export function getTrainingMaterial(materialId: string): TrainingMaterial | undefined {
  return trainingMaterials.find(m => m.materialId === materialId);
}

// ============================================================
// 8. 인증서 (기존 유지)
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
  { certId: 'CERT-001', supplierId: 'S-CELL-001', certName: 'ISO 9001:2015',       issuingBody: 'TÜV Rheinland',     certNumber: 'TUV-KR-QMS-2024-112',   issuedAt: '2024-03-01', expiresAt: '2027-02-28', status: 'active' },
  { certId: 'CERT-002', supplierId: 'S-CELL-001', certName: 'ISO 14001:2015',      issuingBody: 'TÜV Rheinland',     certNumber: 'TUV-KR-EMS-2024-113',   issuedAt: '2024-03-01', expiresAt: '2027-02-28', status: 'active' },
  { certId: 'CERT-003', supplierId: 'S-CELL-001', certName: 'IATF 16949:2016',     issuingBody: 'Bureau Veritas',    certNumber: 'BV-KR-IATF-2023-088',   issuedAt: '2023-07-15', expiresAt: '2026-07-14', status: 'active' },
  { certId: 'CERT-004', supplierId: 'S-CAM-001',  certName: 'ISO 9001:2015',       issuingBody: 'SGS Korea',         certNumber: 'SGS-KR-QMS-2025-041',   issuedAt: '2025-01-20', expiresAt: '2028-01-19', status: 'active' },
  { certId: 'CERT-005', supplierId: 'S-CAM-001',  certName: 'ISO 14001:2015',      issuingBody: 'SGS Korea',         certNumber: 'SGS-KR-EMS-2025-042',   issuedAt: '2025-01-20', expiresAt: '2028-01-19', status: 'active' },
  { certId: 'CERT-006', supplierId: 'S-CAM-002',  certName: 'ISO 9001:2015',       issuingBody: 'CNAB',              certNumber: 'CNAB-CN-QMS-2024-291',  issuedAt: '2024-06-01', expiresAt: '2027-05-31', status: 'active' },
  { certId: 'CERT-007', supplierId: 'S-ANO-001',  certName: 'ISO 14001:2015',      issuingBody: 'JQA',               certNumber: 'JQA-JP-EMS-2025-011',   issuedAt: '2025-02-10', expiresAt: '2028-02-09', status: 'active' },
  { certId: 'CERT-008', supplierId: 'S-ANO-001',  certName: 'IATF 16949:2016',     issuingBody: 'TÜV SÜD Japan',    certNumber: 'TUVS-JP-IATF-2024-033', issuedAt: '2024-11-05', expiresAt: '2027-11-04', status: 'active' },
  { certId: 'CERT-009', supplierId: 'S-REF-001',  certName: 'ISO 14001:2015',      issuingBody: 'Intertek',          certNumber: 'ITK-AU-EMS-2025-018',   issuedAt: '2025-08-14', expiresAt: '2026-08-13', status: 'expiring_soon' },
  { certId: 'CERT-010', supplierId: 'S-REF-002',  certName: 'ISO 14001:2015',      issuingBody: 'CQC',               certNumber: 'CQC-EMS-2023-441',      issuedAt: '2023-04-10', expiresAt: '2026-04-09', status: 'expired' },
  { certId: 'CERT-011', supplierId: 'S-MINE-001', certName: 'ISO 14001:2015',      issuingBody: 'TÜV SÜD',          certNumber: 'TUV-PH-EMS-220',        issuedAt: '2024-07-08', expiresAt: '2027-07-07', status: 'active' },
  { certId: 'CERT-012', supplierId: 'S-MINE-001', certName: 'Bettercoal Verified', issuingBody: 'Bettercoal',        certNumber: 'BC-PH-2024-12',         issuedAt: '2024-03-15', expiresAt: '2026-03-14', status: 'expiring_soon' },
  { certId: 'CERT-013', supplierId: 'S-MINE-003', certName: 'IRMA-75',             issuingBody: 'IRMA',              certNumber: 'IRMA-MS-2024-CL-08',    issuedAt: '2024-02-28', expiresAt: '2027-02-27', status: 'active' },
];

export function getCertifications(supplierId: string): Certification[] {
  return certifications.filter(c => c.supplierId === supplierId);
}

// ============================================================
// 9. 데이터 완성도 + 리마인드 이력 (기존 유지)
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
  { supplierId: 'S-CELL-001', requiredFieldCount: 28, filledFieldCount: 28, completionRate: 100,  missingFields: [],                                                                   lastUpdatedAt: '2026-05-13 09:22' },
  { supplierId: 'S-CAM-001',  requiredFieldCount: 26, filledFieldCount: 25, completionRate: 96.2, missingFields: ['공정도 4단계 도식'],                                                 lastUpdatedAt: '2026-05-12 16:30' },
  { supplierId: 'S-CAM-002',  requiredFieldCount: 26, filledFieldCount: 21, completionRate: 80.8, missingFields: ['IRMA 인증서', '제조공정도 PDF', '광물 추적 시스템'],                lastUpdatedAt: '2026-04-22 13:45' },
  { supplierId: 'S-ANO-001',  requiredFieldCount: 24, filledFieldCount: 24, completionRate: 100,  missingFields: [],                                                                   lastUpdatedAt: '2026-05-05 10:14' },
  { supplierId: 'S-PRE-001',  requiredFieldCount: 24, filledFieldCount: 18, completionRate: 75.0, missingFields: ['제조공정도', '원료 출처 코발트', '단가 (최신)', '제3자 검증 보고서'], lastUpdatedAt: '2026-05-08 13:50' },
  { supplierId: 'S-REF-001',  requiredFieldCount: 26, filledFieldCount: 25, completionRate: 96.2, missingFields: ['Scope 3 배출량'],                                                   lastUpdatedAt: '2026-05-09 11:02' },
  { supplierId: 'S-REF-002',  requiredFieldCount: 26, filledFieldCount: 15, completionRate: 57.7, missingFields: ['ISO 14001 갱신', '제조공정도', 'FEOC 지분 공시', '광물 추적', '제3자 검증', 'CSR 보고서'], lastUpdatedAt: '2026-04-28 09:40' },
  { supplierId: 'S-MINE-001', requiredFieldCount: 22, filledFieldCount: 18, completionRate: 81.8, missingFields: ['광산 폴리곤 좌표', '환경영향평가 갱신', '커뮤니티 합의서', '광권 갱신'],  lastUpdatedAt: '2026-05-09 11:02' },
  { supplierId: 'S-MINE-002', requiredFieldCount: 22, filledFieldCount: 13, completionRate: 59.1, missingFields: ['Bettercoal 인증', '아동노동 감사', 'FEOC 지분', '광권 갱신', 'EITI 공시', '커뮤니티 합의서', 'NGO 감사', '광산 폴리곤', 'EIA 보고서'], lastUpdatedAt: '2026-04-28 09:40' },
  { supplierId: 'S-MINE-003', requiredFieldCount: 22, filledFieldCount: 21, completionRate: 95.5, missingFields: ['지하수 사용량 보고'],                                               lastUpdatedAt: '2026-05-10 08:55' },
];

export function getCompleteness(supplierId: string): DataCompleteness | null {
  return supplierCompleteness.find(c => c.supplierId === supplierId) ?? null;
}

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
  { logId: 'RL-001', supplierId: 'S-CAM-002', contactId: 'C-007', requestType: 'initial',  requestedField: 'IRMA 인증서',       sentAt: '2026-03-01 09:00', dueDate: '2026-03-31', status: 'opened' },
  { logId: 'RL-002', supplierId: 'S-CAM-002', contactId: 'C-007', requestType: 'remind_1', requestedField: 'IRMA 인증서',       sentAt: '2026-04-01 09:00', dueDate: '2026-04-15', status: 'overdue' },
  { logId: 'RL-003', supplierId: 'S-PRE-001', contactId: 'C-011', requestType: 'initial',  requestedField: '제조공정도',         sentAt: '2026-03-15 10:00', dueDate: '2026-04-15', status: 'in_progress' },
  { logId: 'RL-004', supplierId: 'S-REF-002', contactId: 'C-014', requestType: 'final',    requestedField: 'FEOC 지분 공시',    sentAt: '2026-04-20 14:00', dueDate: '2026-05-05', status: 'overdue' },
  { logId: 'RL-005', supplierId: 'S-MINE-002', contactId: 'C-016', requestType: 'initial', requestedField: '아동노동 감사 보고서', sentAt: '2026-02-10 09:00', dueDate: '2026-04-30', status: 'overdue' },
  { logId: 'RL-006', supplierId: 'S-MINE-002', contactId: 'C-016', requestType: 'remind_2', requestedField: '아동노동 감사 보고서', sentAt: '2026-05-01 09:00', dueDate: '2026-05-20', status: 'sent' },
];

export function getRemindLogs(supplierId: string): RemindLog[] {
  return remindLogs.filter(r => r.supplierId === supplierId);
}

// ============================================================
// 10. 부품 (5계층 트리) — 기존 유지
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
  { id: 'PRT-001', partCode: 'PACK-NCM811-100Ah',  partName: 'NCM811 배터리 팩',     tierLevel: 1, parentPartId: null,      hsCode: '850760', materialType: 'Pack Assembly',   functionPurpose: 'EV 구동용 통합 배터리 팩',          unitPrice: 8420.00, purchaseUnit: 'EA' },
  { id: 'PRT-002', partCode: 'MOD-NCM811-12S',     partName: 'NCM811 모듈 (12셀)',   tierLevel: 1, parentPartId: 'PRT-001', hsCode: '850760', materialType: 'Module Assembly', functionPurpose: '12개 셀의 직렬 조립체',             unitPrice: 612.50,  purchaseUnit: 'EA' },
  { id: 'PRT-003', partCode: 'BMS-V3-100Ah',       partName: 'BMS 컨트롤러',          tierLevel: 1, parentPartId: 'PRT-001', hsCode: '853710', materialType: 'Electronics',    functionPurpose: '배터리 관리 시스템',                unitPrice: 285.00,  purchaseUnit: 'EA' },
  { id: 'PRT-004', partCode: 'CELL-NCM811-5Ah',    partName: 'NCM811 원통형 셀',      tierLevel: 2, parentPartId: 'PRT-002', hsCode: '850760', materialType: 'Cell',           functionPurpose: '리튬이온 원통형 셀 (21700)',        unitPrice: 8.40,    purchaseUnit: 'EA' },
  { id: 'PRT-005', partCode: 'CAM-NCM811',         partName: 'NCM811 양극재',         tierLevel: 3, parentPartId: 'PRT-004', hsCode: '282200', materialType: 'Cathode',        functionPurpose: 'Ni80Mn10Co10 조성 리튬 양극재',    unitPrice: 28.40,   purchaseUnit: 'kg' },
  { id: 'PRT-006', partCode: 'ANO-GRAPHITE',       partName: '흑연 음극재',           tierLevel: 3, parentPartId: 'PRT-004', hsCode: '280440', materialType: 'Anode',          functionPurpose: '천연 흑연 기반 음극 활물질',        unitPrice: 8.20,    purchaseUnit: 'kg' },
  { id: 'PRT-007', partCode: 'PRE-NCM',            partName: 'NCM 전구체 (수산화물)', tierLevel: 4, parentPartId: 'PRT-005', hsCode: '282500', materialType: 'Precursor',      functionPurpose: 'NCM 양극재 합성용 전구체',          unitPrice: 14.80,   purchaseUnit: 'kg' },
  { id: 'PRT-008', partCode: 'MIN-NI',             partName: '니켈 원광',             tierLevel: 5, parentPartId: 'PRT-007', hsCode: '260400', materialType: 'Mineral',        functionPurpose: '전구체 제조용 원료 니켈',           unitPrice: 18.50,   purchaseUnit: 'kg' },
  { id: 'PRT-009', partCode: 'MIN-CO',             partName: '코발트 원광',           tierLevel: 5, parentPartId: 'PRT-007', hsCode: '260500', materialType: 'Mineral',        functionPurpose: '전구체 제조용 원료 코발트',         unitPrice: 32.80,   purchaseUnit: 'kg' },
  { id: 'PRT-010', partCode: 'MIN-LI',             partName: '리튬 원광',             tierLevel: 5, parentPartId: 'PRT-005', hsCode: '260900', materialType: 'Mineral',        functionPurpose: '리튬 정제 및 전해질 원료',          unitPrice: 22.10,   purchaseUnit: 'kg' },
];

export function getPart(partId: string): Part | null {
  return parts.find(p => p.id === partId) ?? null;
}

export const tierShortLabels: Record<TierLevel, string> = {
  1: 'Pack/Module', 2: 'Cell', 3: '활물질', 4: '전구체·정제', 5: '원광',
};

// ============================================================
// 11. PO/송장 매핑 (기존 유지)
// ============================================================
export interface PurchaseOrder {
  poId: string;
  originalPoNumber: string;
  supplierInvoiceNumber: string;
  supplierId: string;
  receiverSupplierId: string;
  partId: string;
  supplierPartCode: string;
  originalPartCode: string;
  factoryId: string;
  quantity: number;
  unit: string;
  supplyRatio: number;
  unitPrice: number;
  originCountry: string;
  orderDate: string;
  deliveryDate: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'verified';
}

export const purchaseOrders: PurchaseOrder[] = [
  { poId: 'PO-001', originalPoNumber: 'PO-HC-2026-04891', supplierInvoiceNumber: 'INV-POS-26041501', supplierId: 'S-CAM-001', receiverSupplierId: 'S-CELL-001', partId: 'PRT-005', supplierPartCode: 'POS-CAM-NCM-811-A', originalPartCode: 'CAM-NCM811', factoryId: 'F-005', quantity: 12500, unit: 'kg', supplyRatio: 65, unitPrice: 28.40, originCountry: 'KR', orderDate: '2026-04-15', deliveryDate: '2026-05-10', status: 'delivered' },
  { poId: 'PO-002', originalPoNumber: 'PO-HC-2026-04891', supplierInvoiceNumber: 'INV-POS-26041502', supplierId: 'S-CAM-001', receiverSupplierId: 'S-CELL-001', partId: 'PRT-005', supplierPartCode: 'POS-CAM-NCM-811-A', originalPartCode: 'CAM-NCM811', factoryId: 'F-006', quantity:  6800, unit: 'kg', supplyRatio: 35, unitPrice: 28.40, originCountry: 'KR', orderDate: '2026-04-15', deliveryDate: '2026-05-12', status: 'verified' },
  { poId: 'PO-003', originalPoNumber: 'PO-HC-2026-05011', supplierInvoiceNumber: 'INV-YT-26050201',  supplierId: 'S-CAM-002', receiverSupplierId: 'S-CELL-001', partId: 'PRT-005', supplierPartCode: 'YT-NCA-A1',         originalPartCode: 'CAM-NCM811', factoryId: 'F-008', quantity:  8200, unit: 'kg', supplyRatio: 100, unitPrice: 27.10, originCountry: 'CN', orderDate: '2026-05-02', deliveryDate: '2026-05-22', status: 'in_transit' },
  { poId: 'PO-004', originalPoNumber: 'PO-HC-2026-04875', supplierInvoiceNumber: 'INV-MIT-26041001', supplierId: 'S-ANO-001', receiverSupplierId: 'S-CELL-001', partId: 'PRT-006', supplierPartCode: 'MIT-ANODE-NG-K2',   originalPartCode: 'ANO-GRAPHITE', factoryId: 'F-010', quantity: 9400, unit: 'kg', supplyRatio: 100, unitPrice: 8.20, originCountry: 'JP', orderDate: '2026-04-10', deliveryDate: '2026-05-05', status: 'verified' },
  { poId: 'PO-005', originalPoNumber: 'PO-POS-2026-04701', supplierInvoiceNumber: 'INV-QZ-26040101', supplierId: 'S-PRE-001', receiverSupplierId: 'S-CAM-001', partId: 'PRT-007', supplierPartCode: 'QZ-PRE-NCM-OH', originalPartCode: 'PRE-NCM', factoryId: 'F-012', quantity: 18500, unit: 'kg', supplyRatio: 100, unitPrice: 14.80, originCountry: 'CN', orderDate: '2026-04-01', deliveryDate: '2026-04-28', status: 'delivered' },
  { poId: 'PO-006', originalPoNumber: 'PO-QZ-2026-03812', supplierInvoiceNumber: 'INV-NORI-26031501', supplierId: 'S-MINE-001', receiverSupplierId: 'S-PRE-001', partId: 'PRT-008', supplierPartCode: 'NORI-NCL-RAW', originalPartCode: 'MIN-NI', factoryId: 'F-016', quantity: 21000, unit: 'kg', supplyRatio: 77, unitPrice: 18.50, originCountry: 'PH', orderDate: '2026-03-15', deliveryDate: '2026-04-18', status: 'delivered' },
  { poId: 'PO-007', originalPoNumber: 'PO-GZ-2026-03844', supplierInvoiceNumber: 'INV-NORI-26031502', supplierId: 'S-MINE-001', receiverSupplierId: 'S-REF-002', partId: 'PRT-008', supplierPartCode: 'NORI-NCL-RAW', originalPartCode: 'MIN-NI', factoryId: 'F-016', quantity: 6200, unit: 'kg', supplyRatio: 23, unitPrice: 18.50, originCountry: 'PH', orderDate: '2026-03-15', deliveryDate: '2026-04-20', status: 'delivered' },
  { poId: 'PO-008', originalPoNumber: 'PO-GZ-2026-03908', supplierInvoiceNumber: 'INV-KAT-26032001', supplierId: 'S-MINE-002', receiverSupplierId: 'S-REF-002', partId: 'PRT-009', supplierPartCode: 'KAT-CO-ORE', originalPartCode: 'MIN-CO', factoryId: 'F-017', quantity: 9100, unit: 'kg', supplyRatio: 60, unitPrice: 32.80, originCountry: 'CD', orderDate: '2026-03-20', deliveryDate: '2026-04-25', status: 'pending' },
  { poId: 'PO-009', originalPoNumber: 'PO-QZ-2026-03912', supplierInvoiceNumber: 'INV-KAT-26032002', supplierId: 'S-MINE-002', receiverSupplierId: 'S-PRE-001', partId: 'PRT-009', supplierPartCode: 'KAT-CO-ORE', originalPartCode: 'MIN-CO', factoryId: 'F-017', quantity: 6200, unit: 'kg', supplyRatio: 40, unitPrice: 32.80, originCountry: 'CD', orderDate: '2026-03-20', deliveryDate: '2026-04-28', status: 'pending' },
  { poId: 'PO-010', originalPoNumber: 'PO-POS-2026-04822', supplierInvoiceNumber: 'INV-PIW-26042201', supplierId: 'S-REF-001', receiverSupplierId: 'S-CAM-001', partId: 'PRT-010', supplierPartCode: 'PIW-LIOH-G2', originalPartCode: 'MIN-LI', factoryId: 'F-014', quantity: 28000, unit: 'kg', supplyRatio: 100, unitPrice: 22.10, originCountry: 'AU', orderDate: '2026-04-22', deliveryDate: '2026-05-15', status: 'verified' },
  { poId: 'PO-011', originalPoNumber: 'PO-YT-2026-04900', supplierInvoiceNumber: 'INV-PIW-26042202', supplierId: 'S-REF-001', receiverSupplierId: 'S-CAM-002', partId: 'PRT-010', supplierPartCode: 'PIW-LIOH-G2', originalPartCode: 'MIN-LI', factoryId: 'F-014', quantity: 18000, unit: 'kg', supplyRatio: 100, unitPrice: 22.10, originCountry: 'AU', orderDate: '2026-04-22', deliveryDate: '2026-05-18', status: 'in_transit' },
];

export function getIncomingPOs(supplierId: string): PurchaseOrder[] {
  return purchaseOrders.filter(po => po.supplierId === supplierId);
}
export function getOutgoingPOs(supplierId: string): PurchaseOrder[] {
  return purchaseOrders.filter(po => po.receiverSupplierId === supplierId);
}

// ============================================================
// 12. 제조공정도 (기존 유지)
// ============================================================
export interface ManufacturingProcess {
  id: string;
  supplierId: string;
  sequenceNo: number;
  processName: string;
  processDescription: string;
  isOutsourced: boolean;
  outsourcedToSupplierId?: string;
  hasDiagram: boolean;
}

export const manufacturingProcesses: ManufacturingProcess[] = [
  { id: 'MP-001', supplierId: 'S-CAM-001', sequenceNo: 1, processName: '원료 수령·검수', processDescription: '수산화리튬(LiOH), NCM 전구체 입고 검사 — 순도, 입도 분석', isOutsourced: false, hasDiagram: true },
  { id: 'MP-002', supplierId: 'S-CAM-001', sequenceNo: 2, processName: '소성 (Calcination)', processDescription: '원료를 900°C 이상 고온 소성로에서 리튬화 반응 진행', isOutsourced: false, hasDiagram: true },
  { id: 'MP-003', supplierId: 'S-CAM-001', sequenceNo: 3, processName: '분쇄·분급', processDescription: '소성된 양극재 분말을 목표 입도(D50 10–15μm)로 분쇄', isOutsourced: false, hasDiagram: true },
  { id: 'MP-004', supplierId: 'S-CAM-001', sequenceNo: 4, processName: '코팅 처리', processDescription: 'Al₂O₃ 표면 코팅으로 열 안정성 향상', isOutsourced: true, outsourcedToSupplierId: 'S-PRE-001', hasDiagram: false },
  { id: 'MP-005', supplierId: 'S-CAM-001', sequenceNo: 5, processName: '최종 검사·포장', processDescription: '잔류 수분, 금속 이물질 검사 후 진공 포장', isOutsourced: false, hasDiagram: true },
  { id: 'MP-006', supplierId: 'S-PRE-001', sequenceNo: 1, processName: '황산니켈·코발트·망간 혼합', processDescription: '원료 황산염 용액 혼합 및 pH 제어', isOutsourced: false, hasDiagram: false },
  { id: 'MP-007', supplierId: 'S-PRE-001', sequenceNo: 2, processName: '공침법 합성', processDescription: 'NaOH + NH₄OH 공침반응으로 NCM 수산화물 전구체 합성', isOutsourced: false, hasDiagram: false },
  { id: 'MP-008', supplierId: 'S-PRE-001', sequenceNo: 3, processName: '여과·세척·건조', processDescription: '전구체 여과 후 세척(탈이온수), 스프레이 건조', isOutsourced: false, hasDiagram: false },
];

export function getProcesses(supplierId: string): ManufacturingProcess[] {
  return manufacturingProcesses.filter(p => p.supplierId === supplierId);
}

// ============================================================
// 13. 권한 제어 헬퍼 (기존 유지)
// ============================================================
export type ViewerRole = 'oem' | 'tier1_supplier' | 'auditor';
export const tier1ViewerSupplierId = 'S-CELL-001';

// ============================================================
// 14. BOM 트리 헬퍼 (기존 유지)
// ============================================================
export interface BomNode {
  part: Part;
  children: BomNode[];
}

export function buildBomTree(rootPartId: string): BomNode | null {
  const root = parts.find(p => p.id === rootPartId);
  if (!root) return null;
  const build = (parent: Part): BomNode => {
    const children = parts.filter(p => p.parentPartId === parent.id).map(build);
    return { part: parent, children };
  };
  return build(root);
}

export function getBomTreeForProduct(productId: string): BomNode | null {
  return buildBomTree('PRT-001');
}

export function getPOsForPart(partId: string, beforeDate?: string): PurchaseOrder[] {
  const filtered = purchaseOrders.filter(po => po.partId === partId);
  if (!beforeDate) return filtered;
  return filtered
    .filter(po => po.deliveryDate <= beforeDate)
    .sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate));
}

export function getSuppliersForPart(partId: string): string[] {
  const supplierIds = new Set<string>();
  purchaseOrders.filter(po => po.partId === partId).forEach(po => supplierIds.add(po.supplierId));
  return Array.from(supplierIds);
}
