// lib/data.ts — v2 (violationsByRegulation 11개 규제 확장)
// 나머지 데이터(suppliers, supplyEdges, batches, productInstances, kpis)는 기존 그대로 유지

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
  avgProcessingMinutes: 4.2,
  totalSuppliers: 187,
  displayedSuppliers: 10,
  complianceRate: 92.3,
};

// === 감사 추적 엔트리 (타입만 app/audit/page.tsx에서 사용) ===
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

import { api } from '@/lib/api';

// 검증용: 백엔드 연결 증명. 데이터 모양 변환은 다음 단계.
export async function getSuppliers(): Promise<any[]> {
  if (process.env.NEXT_PUBLIC_USE_API === 'true') {
    return api.get<any[]>('/suppliers');   // 진짜 백엔드 (List[SupplierBrief])
  }
  return suppliers;                          // 기존 mock 폴백
}