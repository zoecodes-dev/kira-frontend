// lib/data.ts — v2 (violationsByRegulation 11개 규제 확장)
// 나머지 데이터(suppliers, supplyEdges, batches, dppRecords, productInstances, kpis)는 기존 그대로 유지

export type Tier = 1 | 2 | 3 | 4 | 5;

export type SupplierStatus = 'verified' | 'pending' | 'review' | 'violation';

export interface Supplier {
  id: string;
  name: string;          // 기존 필드 — 표시명 (영문 약칭)
  tier: Tier;
  tiers: Tier[];
  role: string;
  country: string;
  region: string;
  coordinates: [number, number];
  status: SupplierStatus;
  risk: 'low' | 'medium' | 'high' | 'critical';
  material: string[];
  parentIds: string[];
  certifications: string[];
  lastVerified: string;
  carbonIntensity: number;
}

export const tierShortLabels: Record<Tier, string> = {
  1: 'Pack/Module', 2: 'Cell', 3: '활물질', 4: '전구체·정제', 5: '원광',
};

export const suppliers: Supplier[] = [
  {
    id: 'S-CELL-001', name: 'Hanyang Cell Manufacturing',
    tier: 1, tiers: [1, 2],
    role: '셀·모듈·팩 통합 제조', country: 'KR', region: '충북 청주',
    coordinates: [127.4914, 36.6424],
    status: 'verified', risk: 'low',
    material: ['NCM811 셀', '모듈', '팩'],
    parentIds: [], certifications: ['ISO 9001', 'ISO 14001', 'IATF 16949'],
    lastVerified: '2026-05-10', carbonIntensity: 12.4,
  },
  {
    id: 'S-CAM-001', name: 'POS Cathode Materials',
    tier: 3, tiers: [3],
    role: '양극재 (NCM811)', country: 'KR', region: '경북 포항',
    coordinates: [129.3290, 36.0085],
    status: 'verified', risk: 'low',
    material: ['NCM811 양극재'],
    parentIds: ['S-CELL-001'], certifications: ['ISO 9001', 'ISO 14001'],
    lastVerified: '2026-05-08', carbonIntensity: 18.7,
  },
  {
    id: 'S-CAM-002', name: 'Yantai Cathode Tech',
    tier: 3, tiers: [3],
    role: '양극재 (NCA)', country: 'CN', region: '산둥성 옌타이',
    coordinates: [121.4395, 37.4988],
    status: 'review', risk: 'medium',
    material: ['NCA 양극재'],
    parentIds: ['S-CELL-001'], certifications: ['ISO 9001'],
    lastVerified: '2026-04-22', carbonIntensity: 24.1,
  },
  {
    id: 'S-ANO-001', name: 'Mitsui Anode Industries',
    tier: 3, tiers: [3],
    role: '음극재 (흑연)', country: 'JP', region: '오사카',
    coordinates: [135.4308, 34.5741],
    status: 'verified', risk: 'low',
    material: ['흑연 음극재'],
    parentIds: ['S-CELL-001'], certifications: ['ISO 9001', 'ISO 14001', 'IATF 16949'],
    lastVerified: '2026-05-05', carbonIntensity: 8.3,
  },
  {
    id: 'S-PRE-001', name: 'Quzhou Precursor Co.',
    tier: 4, tiers: [4],
    role: '전구체 (NCM)', country: 'CN', region: '저장성 취저우',
    coordinates: [118.8720, 28.9490],
    status: 'pending', risk: 'medium',
    material: ['NCM 전구체'],
    parentIds: ['S-CAM-001', 'S-CAM-002'], certifications: [],
    lastVerified: '2026-04-15', carbonIntensity: 31.2,
  },
  {
    id: 'S-REF-001', name: 'Pohang Refining Works',
    tier: 4, tiers: [4],
    role: '리튬 정제', country: 'AU', region: '호주 필바라',
    coordinates: [118.9050, -21.2580],
    status: 'verified', risk: 'low',
    material: ['수산화리튬 (LiOH)'],
    parentIds: ['S-CAM-001', 'S-CAM-002'], certifications: ['ISO 14001'],
    lastVerified: '2026-05-09', carbonIntensity: 9.8,
  },
  {
    id: 'S-REF-002', name: 'Ganzhou Rare Metals',
    tier: 4, tiers: [4],
    role: '코발트 정제', country: 'CN', region: '장시성 간저우',
    coordinates: [114.9352, 25.8312],
    status: 'pending', risk: 'high',
    material: ['황산코발트 (CoSO4)'],
    parentIds: ['S-PRE-001'], certifications: [],
    lastVerified: '2026-04-28', carbonIntensity: 28.5,
  },
  {
    id: 'S-MINE-001', name: 'Sulawesi Nickel Mine',
    tier: 5, tiers: [5],
    role: '니켈 광산', country: 'ID', region: '술라웨시',
    coordinates: [125.5050, 9.8480],
    status: 'review', risk: 'medium',
    material: ['니켈 원광'],
    parentIds: [], certifications: ['ISO 14001', 'RMI-CRT'],
    lastVerified: '2026-04-30', carbonIntensity: 45.8,
  },
  {
    id: 'S-MINE-002', name: 'Katanga Cobalt Mining',
    tier: 5, tiers: [5],
    role: '코발트 광산', country: 'CD', region: '카탕가',
    coordinates: [25.4664, -10.7167],
    status: 'review', risk: 'critical',
    material: ['코발트 원광'],
    parentIds: [], certifications: ['RMI-CRT'],
    lastVerified: '2026-04-12', carbonIntensity: 38.4,
  },
  {
    id: 'S-MINE-003', name: 'Xinjiang Mineral Resources',
    tier: 5, tiers: [5],
    role: '망간/리튬 광산', country: 'CN', region: '신장 위구르 자치구',
    coordinates: [87.6177, 43.7928],
    status: 'violation', risk: 'critical',
    material: ['망간 원광', '리튬염'],
    parentIds: [], certifications: [],
    lastVerified: '2026-05-12', carbonIntensity: 52.7,
  },
];

// === 공급망 엣지 (T5 → T4 → T3 → T1 흐름) ===
export interface SupplyEdge {
  from: string;
  to: string;
  material: string;
  volume: number;
}

export const supplyEdges: SupplyEdge[] = [
  { from: 'S-MINE-001', to: 'S-PRE-001', material: '니켈 원광', volume: 320 },
  { from: 'S-MINE-001', to: 'S-REF-002', material: '니켈 원광', volume: 95 },
  { from: 'S-MINE-002', to: 'S-PRE-001', material: '코발트 원광', volume: 85 },
  { from: 'S-MINE-002', to: 'S-REF-002', material: '코발트 원광', volume: 142 },
  { from: 'S-MINE-003', to: 'S-PRE-001', material: '망간/리튬', volume: 67 },
  { from: 'S-REF-002',  to: 'S-PRE-001', material: '황산코발트', volume: 210 },
  { from: 'S-REF-001',  to: 'S-CAM-001', material: '수산화리튬', volume: 480 },
  { from: 'S-REF-001',  to: 'S-CAM-002', material: '수산화리튬', volume: 290 },
  { from: 'S-PRE-001',  to: 'S-CAM-002', material: 'NCM 전구체', volume: 380 },
  { from: 'S-CAM-001',  to: 'S-CELL-001', material: 'NCM811 양극재', volume: 520 },
  { from: 'S-CAM-002',  to: 'S-CELL-001', material: 'NCA 양극재',  volume: 310 },
  { from: 'S-ANO-001',  to: 'S-CELL-001', material: '음극재',       volume: 410 },
];

// === KPI 데이터 ===
export const kpis = {
  todayBatches: 47,
  pendingReview: 8,
  violations: 3,
  approvedDPP: 36,
  avgProcessingMinutes: 4.2,
  totalSuppliers: 187,
  displayedSuppliers: 10,
  complianceRate: 92.3,
};

// === 일별 처리량 (최근 14일) ===
export const dailyProcessing = [
  { date: '05/01', processed: 38, violations: 2, approved: 31 },
  { date: '05/02', processed: 42, violations: 1, approved: 35 },
  { date: '05/03', processed: 35, violations: 3, approved: 28 },
  { date: '05/04', processed: 51, violations: 2, approved: 42 },
  { date: '05/05', processed: 47, violations: 4, approved: 36 },
  { date: '05/06', processed: 44, violations: 1, approved: 38 },
  { date: '05/07', processed: 39, violations: 2, approved: 32 },
  { date: '05/08', processed: 53, violations: 5, approved: 41 },
  { date: '05/09', processed: 48, violations: 2, approved: 40 },
  { date: '05/10', processed: 45, violations: 3, approved: 36 },
  { date: '05/11', processed: 41, violations: 1, approved: 35 },
  { date: '05/12', processed: 49, violations: 4, approved: 38 },
  { date: '05/13', processed: 46, violations: 2, approved: 38 },
  { date: '05/14', processed: 47, violations: 3, approved: 36 },
];

// === 규제별 위반 분포 (v2 — 11개 규제) ===
export const violationsByRegulation = [
  { regulation: 'UFLPA',              count: 12, percent: 38, region: 'US' },
  { regulation: 'IRA/FEOC',           count: 8,  percent: 25, region: 'US' },
  { regulation: 'Conflict Minerals',  count: 7,  percent: 22, region: 'EU' },
  { regulation: 'EU 배터리법',         count: 6,  percent: 19, region: 'EU' },
  { regulation: 'CSDDD',              count: 5,  percent: 15, region: 'EU' },
  { regulation: 'CRMA',               count: 4,  percent: 13, region: 'EU' },
  { regulation: 'EUDR',               count: 4,  percent: 12, region: 'EU' },
  { regulation: 'EU 배터리법 Art.47',  count: 3,  percent: 9,  region: 'EU' },
  { regulation: 'EU 배터리법 Art.7',   count: 3,  percent: 9,  region: 'EU' },
  { regulation: 'CBAM',               count: 2,  percent: 6,  region: 'EU' },
  { regulation: 'LkSG',               count: 2,  percent: 6,  region: 'DE' },
];

// === 현재 처리 중인 배치들 ===
export type AgentStage =
  | 'queued' | 'supervisor' | 'extraction' | 'verification'
  | 'geo-analysis' | 'compliance' | 'readiness' | 'hitl-wait'
  | 'action' | 'completed' | 'rejected';

export interface BatchInProgress {
  id: string;
  batchId: string;
  supplier: string;
  receivedAt: string;
  destination: 'US' | 'EU' | 'KR';
  currentStage: AgentStage;
  stageStartedAt: string;
  agentModel?: 'Haiku' | 'Sonnet' | 'Opus';
  confidence?: number;
  assignedTo?: string;
}

export const batchesInProgress: BatchInProgress[] = [
  { id: 'B-2026051401', batchId: 'LOT-NCM-240514-A', supplier: 'POS Cathode Materials',     receivedAt: '2026-05-14 09:12', destination: 'EU', currentStage: 'completed',  stageStartedAt: '2026-05-14 09:47', agentModel: 'Opus',   confidence: 0.96 },
  { id: 'B-2026051402', batchId: 'LOT-NCA-240514-B', supplier: 'Yantai Cathode Tech',        receivedAt: '2026-05-14 09:34', destination: 'US', currentStage: 'compliance', stageStartedAt: '2026-05-14 10:05', agentModel: 'Opus',   confidence: 0.87, assignedTo: '은지 (Regulatory Analyst)' },
  { id: 'B-2026051403', batchId: 'LOT-PRE-240514-C', supplier: 'Quzhou Precursor Co.',       receivedAt: '2026-05-14 10:02', destination: 'US', currentStage: 'hitl-wait',  stageStartedAt: '2026-05-14 10:18', agentModel: 'Opus',   confidence: 0.74 },
  { id: 'B-2026051404', batchId: 'LOT-MIN-240514-D', supplier: 'Xinjiang Mineral Resources', receivedAt: '2026-05-14 10:21', destination: 'US', currentStage: 'rejected',   stageStartedAt: '2026-05-14 10:44', agentModel: 'Opus',   confidence: 0.99 },
  { id: 'B-2026051405', batchId: 'LOT-COB-240514-E', supplier: 'Ganzhou Rare Metals',        receivedAt: '2026-05-14 10:45', destination: 'EU', currentStage: 'geo-analysis', stageStartedAt: '2026-05-14 11:08', agentModel: 'Sonnet', assignedTo: '영수 (Geo Audit)' },
  { id: 'B-2026051406', batchId: 'LOT-LI-240514-F',  supplier: 'Pohang Refining Works',      receivedAt: '2026-05-14 11:03', destination: 'US', currentStage: 'extraction', stageStartedAt: '2026-05-14 11:05', agentModel: 'Sonnet' },
  { id: 'B-2026051407', batchId: 'LOT-NCM-240514-G', supplier: 'POS Cathode Materials',      receivedAt: '2026-05-14 11:18', destination: 'EU', currentStage: 'verification', stageStartedAt: '2026-05-14 11:20', agentModel: 'Sonnet' },
  { id: 'B-2026051408', batchId: 'LOT-ANO-240514-H', supplier: 'Mitsui Anode Industries',    receivedAt: '2026-05-14 11:32', destination: 'EU', currentStage: 'supervisor',  stageStartedAt: '2026-05-14 11:33', agentModel: 'Haiku' },
];

// === DPP 발행 이력 ===
export interface DPP {
  id: string;
  productId: string;
  serialNumber: string;
  modelName: string;
  manufacturer: string;
  producedAtFactoryId: string;
  producedAt: string;
  issuedAt: string;
  destination: 'US' | 'EU' | 'KR';
  status: 'issued' | 'revoked' | 'pending';
  carbonFootprint: number;
  recycledContent: { Co: number; Ni: number; Li: number };
  capacity: string;
  approvedBy: string;
}

export const dppRecords: DPP[] = [
  { id: 'DPP-2026-04982', productId: 'BAT-NCM811-100Ah', serialNumber: 'SN-2026-A1-082413', modelName: 'Premium NCM811 100Ah', manufacturer: 'Hanyang Cell Manufacturing', producedAtFactoryId: 'F-003', producedAt: '2026-05-12 14:22', issuedAt: '2026-05-14 09:47', destination: 'EU', status: 'issued', carbonFootprint: 84.3, recycledContent: { Co: 18, Ni: 8, Li: 7 }, capacity: '100Ah / 3.7V', approvedBy: '김정민 ESG팀장' },
  { id: 'DPP-2026-04981', productId: 'BAT-NCA-80Ah',    serialNumber: 'SN-2026-A2-082398', modelName: 'Standard NCA 80Ah',    manufacturer: 'Hanyang Cell Manufacturing', producedAtFactoryId: 'F-003', producedAt: '2026-05-11 09:08', issuedAt: '2026-05-14 08:23', destination: 'EU', status: 'issued', carbonFootprint: 91.7, recycledContent: { Co: 16, Ni: 6, Li: 6 }, capacity: '80Ah / 3.7V',  approvedBy: '김정민 ESG팀장' },
  { id: 'DPP-2026-04980', productId: 'BAT-LFP-120Ah',   serialNumber: 'SN-2026-A3-082375', modelName: 'LFP Power 120Ah',      manufacturer: 'Hanyang Cell Manufacturing', producedAtFactoryId: 'F-002', producedAt: '2026-05-10 16:45', issuedAt: '2026-05-13 17:14', destination: 'EU', status: 'issued', carbonFootprint: 67.2, recycledContent: { Co: 0,  Ni: 0, Li: 9 }, capacity: '120Ah / 3.2V', approvedBy: '박서연 ESG팀장' },
  { id: 'DPP-2026-04979', productId: 'BAT-NCM622-90Ah', serialNumber: 'SN-2026-A1-082341', modelName: 'NCM622 90Ah',          manufacturer: 'Hanyang Cell Manufacturing', producedAtFactoryId: 'F-002', producedAt: '2026-05-09 11:18', issuedAt: '2026-05-13 15:48', destination: 'US', status: 'issued', carbonFootprint: 78.9, recycledContent: { Co: 17, Ni: 7, Li: 6 }, capacity: '90Ah / 3.7V',  approvedBy: '박서연 ESG팀장' },
  { id: 'DPP-2026-04978', productId: 'BAT-NCM811-100Ah', serialNumber: 'SN-2026-A1-082319', modelName: 'Premium NCM811 100Ah', manufacturer: 'Hanyang Cell Manufacturing', producedAtFactoryId: 'F-003', producedAt: '2026-05-08 13:55', issuedAt: '2026-05-13 14:02', destination: 'EU', status: 'issued', carbonFootprint: 85.1, recycledContent: { Co: 19, Ni: 8, Li: 7 }, capacity: '100Ah / 3.7V', approvedBy: '김정민 ESG팀장' },
];

// === 제품 인스턴스 ===
export interface ProductInstance {
  serialNumber: string;
  productId: string;
  modelName: string;
  producedAtFactoryId: string;
  producedAt: string;
  destination: 'US' | 'EU' | 'KR';
  dppStatus: 'issued' | 'pending' | 'in_progress' | 'not_started';
  dppId?: string;
}

export const productInstances: ProductInstance[] = [
  { serialNumber: 'SN-2026-A1-082413', productId: 'BAT-NCM811-100Ah', modelName: 'Premium NCM811 100Ah', producedAtFactoryId: 'F-003', producedAt: '2026-05-12 14:22', destination: 'EU', dppStatus: 'issued',      dppId: 'DPP-2026-04982' },
  { serialNumber: 'SN-2026-A2-082398', productId: 'BAT-NCA-80Ah',    modelName: 'Standard NCA 80Ah',    producedAtFactoryId: 'F-003', producedAt: '2026-05-11 09:08', destination: 'EU', dppStatus: 'issued',      dppId: 'DPP-2026-04981' },
  { serialNumber: 'SN-2026-A3-082375', productId: 'BAT-LFP-120Ah',   modelName: 'LFP Power 120Ah',      producedAtFactoryId: 'F-002', producedAt: '2026-05-10 16:45', destination: 'EU', dppStatus: 'issued',      dppId: 'DPP-2026-04980' },
  { serialNumber: 'SN-2026-A1-082341', productId: 'BAT-NCM622-90Ah', modelName: 'NCM622 90Ah',          producedAtFactoryId: 'F-002', producedAt: '2026-05-09 11:18', destination: 'US', dppStatus: 'issued',      dppId: 'DPP-2026-04979' },
  { serialNumber: 'SN-2026-A1-082319', productId: 'BAT-NCM811-100Ah', modelName: 'Premium NCM811 100Ah', producedAtFactoryId: 'F-003', producedAt: '2026-05-08 13:55', destination: 'EU', dppStatus: 'issued',     dppId: 'DPP-2026-04978' },
  { serialNumber: 'SN-2026-A1-082427', productId: 'BAT-NCM811-100Ah', modelName: 'Premium NCM811 100Ah', producedAtFactoryId: 'F-003', producedAt: '2026-05-13 10:32', destination: 'EU', dppStatus: 'in_progress' },
  { serialNumber: 'SN-2026-A1-082451', productId: 'BAT-NCM811-100Ah', modelName: 'Premium NCM811 100Ah', producedAtFactoryId: 'F-003', producedAt: '2026-05-14 08:15', destination: 'US', dppStatus: 'in_progress' },
  { serialNumber: 'SN-2026-A2-082468', productId: 'BAT-NCA-80Ah',    modelName: 'Standard NCA 80Ah',    producedAtFactoryId: 'F-003', producedAt: '2026-05-14 11:42', destination: 'EU', dppStatus: 'pending' },
];

// === 감사 추적 엔트리 ===
export interface AuditEntry {
  step: number;
  timestamp: string;
  nodeType: 'agent' | 'tool' | 'human';
  nodeName: string;
  model?: string;
  promptVersion?: string;
  durationMs: number;
  inputHash: string;
  outputHash: string;
  decision?: string;
  citations?: string[];
}

export const auditTrail: AuditEntry[] = [
  { step: 1, timestamp: '2026-05-14 09:12:03.124', nodeType: 'agent', nodeName: 'Supervisor',   model: 'opus-4',   promptVersion: 'v2.1.4', durationMs: 847,  inputHash: '0xf623...5b41', outputHash: '0x2a14...c823', decision: 'route_to_extraction' },
  { step: 2, timestamp: '2026-05-14 09:12:04.812', nodeType: 'tool',  nodeName: 'parse_pdf',                                               durationMs: 1623, inputHash: '0x2a14...c823', outputHash: '0x8b92...4d11' },
  { step: 3, timestamp: '2026-05-14 09:12:06.451', nodeType: 'agent', nodeName: 'Extraction',   model: 'sonnet-4', promptVersion: 'v1.8.2', durationMs: 2104, inputHash: '0x8b92...4d11', outputHash: '0xc341...7e82', decision: 'extracted_24_fields' },
  { step: 4, timestamp: '2026-05-14 09:12:08.589', nodeType: 'tool',  nodeName: 'verify_citation',                                         durationMs: 442,  inputHash: '0xc341...7e82', outputHash: '0xd892...1f44' },
  { step: 5, timestamp: '2026-05-14 09:12:09.058', nodeType: 'agent', nodeName: 'Verification', model: 'opus-4',   promptVersion: 'v3.0.1', durationMs: 1876, inputHash: '0xd892...1f44', outputHash: '0xe123...8c91', decision: 'confidence_0.96' },
  { step: 6, timestamp: '2026-05-14 09:12:10.967', nodeType: 'agent', nodeName: 'Compliance',   model: 'opus-4',   promptVersion: 'v4.2.0', durationMs: 3201, inputHash: '0xe123...8c91', outputHash: '0xf456...2b73', decision: 'all_passed' },
  { step: 7, timestamp: '2026-05-14 09:12:14.218', nodeType: 'agent', nodeName: 'Action',       model: 'haiku-4',  promptVersion: 'v1.4.0', durationMs: 1012, inputHash: '0xf623...5b41', outputHash: '0x1a87...9f53', decision: 'issue_dpp' },
];

export const sampleAuditTrail = auditTrail;