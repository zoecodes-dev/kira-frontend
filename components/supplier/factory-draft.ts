// 공장(FactoryDraft)·담당자(ContactDraft) draft 타입 + 변환 헬퍼 — master-form REPLACE-ALL
//   라운드트립용. SupplierGeneralReview.tsx(편집 상태)와 FactoryCards.tsx(카드 UI)가 함께 쓴다.
import type { AiExtraction, SupplierFactory as ApiSupplierFactory, SupplierContact as ApiSupplierContact } from '@/lib/api';

export interface FactoryDraft {
  factoryId?: string;   // 기존 공장 식별자(신규 행은 undefined). upsert용 round-trip — supply_ratio FK 보존.
  factoryName: string;
  country: string;
  region: string;
  address: string;
  factoryRole: string;
  destination: string;
  supplyRatioPercent: string;
  latitude: string;
  longitude: string;
  // 공장 담당자(공장 단위) — 협력사 PIC(ContactDraft)와 별개
  factoryManagerName: string;
  factoryManagerRole: string;
  factoryManagerPhone: string;
  factoryManagerEmail: string;
  // 소재 구성(공장/사이트별) — 광산(factoryRole='mining')은 사이트마다 채굴 광물이 달라
  // 회사 단위가 아니라 이 값으로 판정한다(§factories.mine_composition).
  coreMinerals: Record<string, number>;
  // 이 공장에 귀속된 소재구성 문서 S3 키(coreMinerals의 근거). 표시 전용 —
  // master-form 페이로드에 담지 않는다(문서 업로드는 전용 PATCH 경로가 소유).
  materialCompositionDocUrl?: string | null;
}
export interface ContactDraft {
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  mobile: string;
  isPrimary: boolean;
  // 이 담당자가 속한 공장 — factoriesDraft 배열 인덱스(§factory_index). null이면 특정 공장에
  // 속하지 않는 회사 공통 담당자 — 공장마다 카드로 나뉜 화면에서 담당자를 배치하는 기준.
  factoryIndex: number | null;
}
export const emptyFactoryDraft = (): FactoryDraft => ({
  factoryName: '', country: '', region: '', address: '', factoryRole: '',
  destination: '', supplyRatioPercent: '', latitude: '', longitude: '',
  factoryManagerName: '', factoryManagerRole: '', factoryManagerPhone: '', factoryManagerEmail: '',
  coreMinerals: {},
  materialCompositionDocUrl: null,
});
export const emptyContactDraft = (factoryIndex: number | null = null): ContactDraft => ({
  name: '', role: '', department: '', email: '', phone: '', mobile: '', isPrimary: false, factoryIndex,
});
export const factoryToDraft = (f: ApiSupplierFactory): FactoryDraft => ({
  factoryId: f.factoryId,
  factoryName: f.factoryName ?? '',
  country: f.country ?? '',
  region: f.region ?? '',
  address: f.address ?? '',
  factoryRole: f.factoryRole ?? '',
  destination: f.destination ?? '',
  supplyRatioPercent: f.supplyRatioPercent != null ? String(f.supplyRatioPercent) : '',
  latitude: f.latitude != null ? String(f.latitude) : '',
  longitude: f.longitude != null ? String(f.longitude) : '',
  factoryManagerName: f.factoryManagerName ?? '',
  factoryManagerRole: f.factoryManagerRole ?? '',
  factoryManagerPhone: f.factoryManagerPhone ?? '',
  factoryManagerEmail: f.factoryManagerEmail ?? '',
  coreMinerals: f.coreMinerals ?? {},
  materialCompositionDocUrl: f.materialCompositionDocUrl ?? null,
});
export const contactToDraft = (c: ApiSupplierContact, factoryIndex: number | null = null): ContactDraft => ({
  name: c.name ?? '',
  role: c.role ?? '',
  department: c.department ?? '',
  email: c.email ?? '',
  phone: c.phone ?? '',
  mobile: c.mobile ?? '',
  isPrimary: Boolean(c.isPrimary),
  factoryIndex,
});
// 담당자 시드 — c.factoryId(실 UUID)를 draft 배열(factoriesDraft, 이미 비활성 공장 제외 필터링됨)
//   안에서 같은 factoryId를 가진 항목의 인덱스로 변환한다. 매칭 안 되면(공장 삭제됨 등) 회사 공통(null).
export const seedContactsDraft = (contacts: ApiSupplierContact[], factories: FactoryDraft[]): ContactDraft[] => {
  const idxByFactoryId = new Map<string, number>();
  factories.forEach((f, i) => { if (f.factoryId) idxByFactoryId.set(f.factoryId, i); });
  return contacts.map(c => contactToDraft(c, c.factoryId ? idxByFactoryId.get(c.factoryId) ?? null : null));
};

// 역할(factoryRole) enum — 백엔드 계약과 동일한 값(lib/api.ts:504). 라벨만 한글.
export const FACTORY_ROLE_OPTS: { value: string; label: string }[] = [
  { value: '', label: '선택' },
  { value: 'headquarters', label: '본사' },
  { value: 'production', label: '생산' },
  { value: 'outsourcing', label: '위탁' },
  { value: 'processing', label: '가공' },
  { value: 'mining', label: '광산' },
];

// 소재 구성(core_minerals) 광물 키 → 표시 라벨. FactoryCards(광산 사이트 카드)와
//   SupplierGeneralReview(소재 구성 섹션)가 공유한다. 완성도는 '1종 이상'(materials.any) 게이트 —
//   특정 금속을 강제하면 단일 광물 회사(음극재 흑연, 광산 등)가 영구 미완성이 되므로 필수 지정하지 않는다.
export const MINERAL_LABELS: Record<string, string> = {
  Li: 'Li (리튬)', Co: 'Co (코발트)', Ni: 'Ni (니켈)', Mn: 'Mn (망간)',
  graphite_natural: '천연흑연', graphite_synthetic: '인조흑연',
};
export const MINERAL_EDIT_KEYS = Object.keys(MINERAL_LABELS);

// 소재구성 입력칸 키 → AI 처리 결과(parsed_fields) 키 후보. 배열인 이유: 인조흑연은
// 백엔드 버전에 따라 artificial_/synthetic_ 두 표기가 있어 둘 다 수용한다(앞쪽 우선).
export const MINERAL_PARSE_KEYS: Record<string, string[]> = {
  Li: ['li_content'],
  Co: ['co_content'],
  Ni: ['ni_content'],
  Mn: ['mn_content'],
  graphite_natural: ['natural_graphite_content'],
  graphite_synthetic: ['artificial_graphite_content', 'synthetic_graphite_content'],
};

// 광물 1종의 파싱 결과 상태.
//   parsed     = 값 추출됨 → 입력칸 채움
//   blank      = 문서에 항목 자체 없음 → 입력칸 비움 + '해당 없음' 유지
//   unreadable = 항목은 있는데 못 읽음 → '확인 필요' (해당 없음과 의미가 다름)
export interface MineralParseState {
  value: number | null;
  confidence: number;
  status: 'parsed' | 'blank' | 'unreadable';
}

// 신뢰도 임계치 — 미만이면 값은 채우되 '검토 권장' 표시(ExtractionTable 신뢰도 톤 패턴).
export const MINERAL_CONFIDENCE_THRESHOLD = 0.8;

// 광물 함량 표시 자릿수 — 입력 허용 자릿수(정규식 \.\d{0,2})와 맞춘다.
//   JS number는 소수점 이하 0을 못 기억해 백엔드의 10.0이 "10"으로 보인다. 표시 시점에 고정한다.
export const MINERAL_DECIMALS = 2;
export const formatMineral = (v: number): string => v.toFixed(MINERAL_DECIMALS);

// AiExtraction 1건에서 광물 입력칸 키(k)의 파싱 상태를 도출.
export function mineralParseStateOf(extraction: AiExtraction | null, k: string): MineralParseState | null {
  if (!extraction) return null;
  const parseKeys = MINERAL_PARSE_KEYS[k] ?? [];
  const pf = extraction.parsedFields ?? {};
  const conf = extraction.confidenceMap ?? {};
  const blank = new Set(extraction.blankFields ?? []);
  const unreadable = new Set(extraction.unreadableFields ?? []);
  for (const key of parseKeys) {
    if (pf[key] != null && pf[key] !== '') {
      const num = Number(pf[key]);
      if (Number.isFinite(num)) return { value: num, confidence: Number(conf[key] ?? 0), status: 'parsed' };
    }
  }
  for (const key of parseKeys) if (unreadable.has(key)) return { value: null, confidence: 0, status: 'unreadable' };
  for (const key of parseKeys) if (blank.has(key)) return { value: null, confidence: 0, status: 'blank' };
  return null; // 파싱 결과에 언급 없음 → 기존 표시 유지
}

// 공장별 prefill(materials) → 공장 draft의 coreMinerals에 '빈 칸만' 채운다.
//   이미 값이 있는 칸(사용자 입력·DB 저장값)은 건드리지 않는다 — 온보딩 prefill의 prev 우선 규칙과 동일.
//   prefill의 키는 문서 필드 ID(ni_content 등)라 MINERAL_PARSE_KEYS로 입력칸 키(Ni)로 되돌린다.
export function applyMaterialsPrefill(
  draft: FactoryDraft,
  materials: Record<string, number> | undefined,
): FactoryDraft {
  if (!materials || !Object.keys(materials).length) return draft;
  const next = { ...draft.coreMinerals };
  let changed = false;
  for (const k of MINERAL_EDIT_KEYS) {
    if (next[k] != null) continue;                       // 빈 칸만 — 기존 값 보존
    const hit = (MINERAL_PARSE_KEYS[k] ?? []).find(pk => materials[pk] != null);
    if (!hit) continue;
    const num = Number(materials[hit]);
    if (!Number.isFinite(num)) continue;
    next[k] = num;
    changed = true;
  }
  return changed ? { ...draft, coreMinerals: next } : draft;
}
