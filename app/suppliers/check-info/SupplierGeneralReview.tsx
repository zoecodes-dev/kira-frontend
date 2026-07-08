'use client';

// 협력사 입력 데이터 수집 현황을 원청사가 검토하는 화면
import { useEffect, useRef, useState } from 'react';
import {
  createDataRequest, getDataRequests,
  getSupplierCompleteness, getSupplierContacts, getSupplierDetail, getSupplierFactories,
  getSupplierSuppliedItems, submitMasterForm,
  getSupplierRiskProfile, uploadFile,
  type SupplierRiskProfileResponse as ApiRiskProfile,
  type SupplierDetail as ApiSupplierDetail, type SupplierContact as ApiSupplierContact,
  type SupplierFactory as ApiSupplierFactory, type SupplierCompleteness as ApiCompleteness,
  type SuppliedItem as ApiItem, type ApiDataRequest,
  type AiExtraction,
  ApiError,
} from '@/lib/api';
import { addDemoNotification } from '@/lib/demo-notifications';

const providerTypeLabel: Record<string, string> = {
  manufacturer: '제조사', recycler: '재활용', trader: '트레이더', miner: '광산', smelter: '제련소',
};
// 입력 양식 셀렉트 옵션 (값=백엔드 enum, 라벨=표시)
const PROVIDER_OPTS = [
  { value: 'manufacturer', label: '제조사 (manufacturer)' },
  { value: 'recycler', label: '재활용 (recycler)' },
  { value: 'trader', label: '트레이더 (trader)' },
  { value: 'miner', label: '광산 (miner)' },
  { value: 'smelter', label: '제련소 (smelter)' },
];
const SMELTER_OPTS = [
  { value: 'rmi', label: 'RMI' },
  { value: 'private', label: 'Private' },
];
const RISK_OPTS = [
  { value: 'low', label: '저위험' },
  { value: 'medium', label: '중위험' },
  { value: 'high', label: '고위험' },
];

interface RealData {
  detail: ApiSupplierDetail | null;
  contacts: ApiSupplierContact[];
  factories: ApiSupplierFactory[];
  comp: ApiCompleteness | null;
  items: ApiItem[];
  riskProfile: ApiRiskProfile | null;   // 규제 — 실사 자가진단(self_reported_risk_level)
}
import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { suppliers } from '@/lib/data';
import { getContacts, getSupplierName, supplierCompleteness } from '@/lib/supplier-detail-data';
import { addStoredRequest } from '@/lib/data-request-store';
import SupplierInputStatusBoard from '@/components/suppliers/SupplierInputStatusBoard';
import OriginCertUploadPanel from '@/components/supplier/OriginCertUploadPanel';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  Globe,
  HelpCircle,
  Info,
  Globe2,
  Lock,
  MessageSquare,
  Pencil,
  Save,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import FactoryCards from '@/components/supplier/FactoryCards';
import CarbonFootprintDocPanel from '@/components/supplier/CarbonFootprintDocPanel';
import SelfAssessmentDocPanel from '@/components/supplier/SelfAssessmentDocPanel';
import CarbonComplianceReport from '@/components/supplier/CarbonComplianceReport';
import SaqComplianceReport from '@/components/supplier/SaqComplianceReport';
import AiParsingReviewModal from '@/components/supplier/AiParsingReviewModal';
import {
  type ContactDraft,
  type FactoryDraft,
  FACTORY_ROLE_OPTS,
  factoryToDraft,
  MINERAL_EDIT_KEYS,
  MINERAL_LABELS,
  seedContactsDraft,
} from '@/components/supplier/factory-draft';

type ReviewStatus = '완료' | '입력 중' | '확인 필요' | '미입력' | '해당 없음';
type SectionKey = 'company' | 'factories' | 'regulation' | 'documents';

interface CollectionSection {
  key: SectionKey;
  order: number;
  title: string;
  completed: number;
  total: number;
  status: ReviewStatus;
  icon: ReactNode;
  comment: string;
  missing: string[];
}

const supplierSummary = {
  name: '한양 제조(주)',
  tier: 'T1',
  role: 'Pack 제조',
  country: '대한민국 (KR)',
  manager: '김철수 ESG팀장',
  email: 'cs.kim@hanyangmfg.com',
  phone: '+82-10-1234-5678',
  collectionRate: 27,
  completed: 3,
  total: 11,
  lastSubmittedAt: '2025-05-14 11:20',
  reviewStatus: '확인 필요' as ReviewStatus,
  nextDueDate: '2025-05-28',
};

const sections: CollectionSection[] = [
  {
    key: 'company',
    order: 1,
    title: '기업 기본정보',
    completed: 0, total: 1, status: '미입력',
    icon: <FileText className="h-5 w-5" />,
    comment: '', missing: [],
  },
  {
    key: 'factories',
    order: 2,
    title: '공장 정보',
    completed: 0, total: 1, status: '미입력',
    // 소재구성(핵심광물 함량)은 공장(사이트)마다 다를 수 있어 회사 단위 별도 섹션이 아니라
    // 이 섹션 안 공장 카드마다 관리한다(§FactoryCards.tsx, 모든 협력사 유형 공통).
    icon: <Building2 className="h-5 w-5" />,
    comment: '공급비율·위치(원산지)·공장 담당자·소재구성.', missing: [],
  },
  {
    key: 'regulation',
    order: 3,
    title: '규제',
    completed: 0, total: 1, status: '미입력',
    icon: <Globe className="h-5 w-5" />,
    comment: '탄소발자국·실사 자가진단.', missing: [],
  },
  {
    key: 'documents',
    order: 4,
    title: '필요 문서',
    completed: 0, total: 1, status: '미입력',
    icon: <FileText className="h-5 w-5" />,
    comment: '사업자등록증·환경성적서.', missing: [],
  },
];

const companyRows = [
  ['영문 정식명칭', 'Hanyang Mfg', '완료'],
  ['한글 명칭', '한양 제조(주)', '완료'],
  ['사업자 등록번호', '123-45-67890', '완료'],
  ['DUNS 번호', '98-765-4321', '완료'],
];

function statusClasses(status: ReviewStatus) {
  return {
    완료: 'border-ok-border bg-ok-bg text-ok-text',
    '입력 중': 'border-info-border bg-info-bg text-info-text',
    '확인 필요': 'border-warn-border bg-warn-bg text-warn-text',
    미입력: 'border-alert-border bg-alert-bg text-alert-text',
    '해당 없음': 'border-slate-200 bg-slate-100 text-slate-500',
  }[status];
}

function progressTone(status: ReviewStatus) {
  return {
    완료: 'bg-ok-solid',
    '입력 중': 'bg-info-solid',
    '확인 필요': 'bg-warn-solid',
    미입력: 'bg-alert-solid',
    '해당 없음': 'bg-slate-300',
  }[status];
}

function iconTone(status: ReviewStatus) {
  return {
    완료: 'text-ok-text',
    '입력 중': 'text-info-text',
    '확인 필요': 'text-warn-text',
    미입력: 'text-alert-text',
    '해당 없음': 'text-slate-400',
  }[status];
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={clsx('inline-flex min-w-16 justify-center rounded-xs border px-2.5 py-1 text-xs font-semibold', statusClasses(status))}>
      {status}
    </span>
  );
}

function ProgressBar({ value, status }: { value: number; status: ReviewStatus }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-200">
      <div className={clsx('h-1.5 rounded-full', progressTone(status))} style={{ width: `${value}%` }} />
    </div>
  );
}

function LegendItem({ status, icon }: { status: ReviewStatus; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
      <span className={iconTone(status)}>{icon}</span>
      {status}
    </div>
  );
}

function SummaryCard({ section }: { section: CollectionSection }) {
  const rate = Math.round((section.completed / section.total) * 100);

  return (
    <button
      type="button"
      onClick={() => document.getElementById(`section-${section.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      className="rounded-sm border border-ink-700 bg-white p-2.5 text-left shadow-control transition hover:border-accent-200 hover:bg-accent-50/30"
    >
      <div className="flex items-center gap-2">
        <div className={clsx(iconTone(section.status))}>{section.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-ink-100">{section.title}</div>
          <div className="text-xs text-ink-500">{section.completed} / {section.total}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <ProgressBar value={rate} status={section.status} />
        <div className="w-8 text-right text-xs font-semibold text-ink-100">{rate}%</div>
      </div>
    </button>
  );
}

function FieldStatus({ status }: { status: ReviewStatus }) {
  if (status === '완료') return <CheckCircle2 className="h-4 w-4 text-ok-text" />;
  if (status === '입력 중') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-info-text"><HelpCircle className="h-3.5 w-3.5" />입력 중</span>;
  if (status === '미입력') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-alert-text"><XCircle className="h-3.5 w-3.5" />미입력</span>;
  if (status === '확인 필요') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-warn-text"><HelpCircle className="h-3.5 w-3.5" />확인 필요</span>;
  return <span className="text-xs font-semibold text-slate-500">해당 없음</span>;
}

function CompanyGrid({ rows = companyRows, editable = false, fieldKeys, fieldPrefix = 'company', selects, flagged, placeholders, parsedFieldKeys }: { rows?: string[][]; editable?: boolean; fieldKeys?: string[]; fieldPrefix?: string; selects?: Record<string, { value: string; label: string }[]>; flagged?: Record<string, string>; placeholders?: Record<string, string>; parsedFieldKeys?: string[] }) {
  return (
    <div className="grid overflow-hidden rounded-sm border border-ink-700 md:grid-cols-2">
      {rows.map(([label, value, status], i) => {
        const key = fieldKeys?.[i];
        const opts = key ? selects?.[key] : undefined;
        const dataField = key ? `${fieldPrefix}.${key}` : undefined;
        // AI 파싱 신뢰도 낮음 등 — 값은 채우되 warn 톤 + 배지로 검토를 유도(ExtractionTable 패턴).
        const flag = key ? flagged?.[key] : undefined;
        // [작업②] AI 파싱으로 자동 입력된 값 — 연한 배경 + ✓ 배지로 '직접 입력'과 시각 구분(warn 우선).
        const parsedFilled = !flag && !!key && !!parsedFieldKeys?.includes(key);
        // [작업②] 빈값일 때 안내형 placeholder(필드별 커스텀 → 없으면 기본 '<라벨> 입력').
        const ph = (key && placeholders?.[key]) || `${label} 입력`;
        return (
        <div key={label} className="grid grid-cols-[150px_minmax(0,1fr)_96px] items-center border-b border-r border-ink-700 px-4 py-3 last:border-b-0 even:border-r-0">
          <div className="text-sm font-medium text-ink-500">{label}</div>
          {editable ? (
            opts ? (
              <select
                defaultValue={value}
                data-field={dataField}
                className="w-full rounded-xs border border-ink-700 bg-white px-2 py-1.5 text-sm text-ink-100 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20"
              >
                <option value="">선택</option>
                {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <div className="min-w-0">
                <input
                  defaultValue={value === '-' || value === '미입력' ? '' : value}
                  placeholder={ph}
                  data-field={dataField}
                  className={clsx(
                    'w-full rounded-xs border px-2.5 py-1.5 text-sm text-ink-100 outline-none placeholder:text-ink-500 focus:ring-1',
                    flag
                      ? 'border-warn-border bg-warn-bg focus:border-warn-text focus:ring-warn-border'
                      : parsedFilled
                        ? 'border-accent-200 bg-blue-50/60 focus:border-accent-500 focus:ring-accent-500/20'
                        : 'border-ink-700 bg-white focus:border-accent-500 focus:ring-accent-500/20',
                  )}
                />
                {flag ? (
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-warn-text">
                    <Info className="h-3 w-3" />
                    {flag}
                  </div>
                ) : parsedFilled ? (
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-accent-700">
                    <CheckCircle2 className="h-3 w-3" />
                    AI 자동입력 · 값을 확인해주세요
                  </div>
                ) : null}
              </div>
            )
          ) : (
            <div className={clsx('flex items-center gap-1.5 truncate text-sm font-semibold text-ink-100', parsedFilled && 'rounded-xs bg-blue-50/60 px-1.5 py-0.5')}>
              {parsedFilled && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent-700" />}
              <span className="truncate">{opts ? (opts.find(o => o.value === value)?.label ?? value) : value}</span>
            </div>
          )}
          <div className="flex justify-end">
            <FieldStatus status={status as ReviewStatus} />
          </div>
        </div>
        );
      })}
    </div>
  );
}

const fieldFilled = (v: unknown): ReviewStatus => (v !== null && v !== undefined && v !== '' ? '완료' : '미입력');

function sectionStatusFrom(completed: number, total: number): ReviewStatus {
  if (total === 0) return '해당 없음';
  if (completed === 0) return '미입력';
  return completed >= total ? '완료' : '확인 필요';
}

// 백엔드 완성도 필드 키(네임스페이스) → 섹션·표시 라벨. provider_type별 필수셋은 백엔드가 SSOT.
const FIELD_META: Record<string, { section: SectionKey; label: string }> = {
  'company.company_name': { section: 'company', label: '회사명' },
  'company.country': { section: 'company', label: '소재 국가' },
  'company.business_reg_no': { section: 'company', label: '사업자 등록번호' },
  'company.provider_type': { section: 'company', label: '업종(provider type)' },
  // 소재구성은 회사 단위 섹션이 없다 — 공장(사이트)마다 다를 수 있어 "공장 정보" 섹션의
  // 공장 카드로 통합됐다(광산 전용이던 factories.mine_composition을 전 유형으로 확장).
  'materials.Li': { section: 'factories', label: 'Li 함량' },
  'materials.Co': { section: 'factories', label: 'Co 함량' },
  'materials.Ni': { section: 'factories', label: 'Ni 함량' },
  'materials.any': { section: 'factories', label: '핵심광물 함량(최소 1종)' },
  'materials.handled_any': { section: 'factories', label: '핵심광물 함량(취급 금속 최소 1종)' },
  'factories': { section: 'factories', label: '공장 정보' },
  'factories.mine_country': { section: 'factories', label: '광산 원산지 국가(공장별)' },
  'factories.mine_composition': { section: 'factories', label: '광산 소재 구성(공장별)' },
  'regulation.carbon_intensity': { section: 'regulation', label: '탄소집약도' },
  'regulation.energy_source': { section: 'regulation', label: '에너지원' },
  'regulation.self_reported_risk_level': { section: 'regulation', label: '실사 자가진단' },
  'documents.business_reg_doc_url': { section: 'documents', label: '사업자등록증' },
  'documents.environmental_report_url': { section: 'documents', label: '환경성적서' },
};
const sectionOfField = (f: string): SectionKey | undefined =>
  FIELD_META[f]?.section ?? (f.includes('.') ? undefined : (f as SectionKey));
const labelOfField = (f: string): string => FIELD_META[f]?.label ?? f;

// 필수 필드 여부 — 백엔드 완성도(comp.requiredFields)가 있으면 그걸 SSOT로, 없으면(집계 전) 폴백값 사용.
//   화면에서 라벨 앞에 '*'를 붙여 육안으로 필수/선택을 구분할 수 있게 한다.
function isFieldRequired(backendKey: string, comp: ApiCompleteness | null | undefined, fallback: boolean): boolean {
  if (comp && comp.requiredFieldCount != null && Array.isArray(comp.requiredFields)) {
    return comp.requiredFields.includes(backendKey);
  }
  return fallback;
}
const reqLabel = (label: string, required: boolean): string => (required ? `${label} *` : label);

// 백엔드 필수 필드 키(snake_case, 예 company.business_reg_no)를 편집칸의 data-field(camelCase,
//   예 company.businessRegNo)로 변환 — 편집 모드에선 "지금 입력칸에 실제로 뭐가 들어있는지"를
//   direct하게 읽어야 한다(저장 전엔 real.detail이 그대로라 필드 반영이 안 되는 문제 수정).
const snakeToCamel = (s: string): string => s.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());

// 편집 모드에서 필수 필드 1개가 "지금 입력칸 기준으로" 채워졌는지 판정.
//   factories는 draft 배열 전체가 필요하다(§factories.mine_* — 공장 단위 필드라 DOM
//   data-field 하나로 못 읽고, 광산 사이트 카드들을 직접 훑어야 한다).
function isRequiredFieldLiveFilled(field: string, readField: (f: string) => string, factories: FactoryDraft[]): boolean {
  if (field === 'materials.any' || field === 'materials.handled_any') {
    // 소재구성은 회사 단위가 아니라 공장 단위(FactoryCards) — 활성 공장 중 하나라도
    // 핵심광물 함량이 1종 이상 있으면 충족(§factories.mine_composition과 동일 패턴, 역할 무관).
    return factories.some(f => Object.keys(f.coreMinerals).length > 0);
  }
  if (field === 'factories') return factories.length > 0;
  if (field === 'factories.mine_country') {
    return factories.some(f => f.factoryRole === 'mining' && f.country !== '');
  }
  if (field === 'factories.mine_composition') {
    return factories.some(f => f.factoryRole === 'mining' && Object.keys(f.coreMinerals).length > 0);
  }
  const dot = field.indexOf('.');
  if (dot === -1) return readField(field) !== '';
  const dataField = `${field.slice(0, dot)}.${snakeToCamel(field.slice(dot + 1))}`;
  return readField(dataField) !== '';
}

// hazardous_substances 등 비광물 키 제외한 함량 키 목록.
const mineralKeysOf = (cm: Record<string, unknown>): string[] =>
  Object.keys(cm).filter(k => k !== 'hazardous_substances' && cm[k] != null && cm[k] !== '');

// 편집 모드에서 저장 전 입력칸 값을 직접 읽기 위한 컨텍스트 — 없으면(보기 모드) real.detail 스냅샷 사용.
type LiveFieldCtx = { readField: (f: string) => string; factories: FactoryDraft[] };

// 백엔드 완성도(provider_type별 필수셋)로 섹션 집계 도출 — requiredFields/missingFields가 SSOT.
//   해당 섹션 필수 필드가 0개면 '해당 없음'(예: 광산의 소재구성·규제, 유통사의 소재구성).
//   live가 있으면(편집 중) missingFields(마지막 저장 스냅샷) 대신 지금 입력칸 값으로 판정한다 —
//   그래야 저장하기 전에 필수값을 채운 즉시 완료로 반영되고, 다음 섹션 진행 여부를 물을 수 있다.
function deriveSectionMetaFromBackend(
  key: SectionKey,
  comp: ApiCompleteness,
  live?: LiveFieldCtx,
): Pick<CollectionSection, 'completed' | 'total' | 'status' | 'missing'> {
  const req = (comp.requiredFields ?? []).filter(f => sectionOfField(f) === key);
  if (live) {
    const missing = req.filter(f => !isRequiredFieldLiveFilled(f, live.readField, live.factories)).map(labelOfField);
    const completed = req.length - missing.length;
    return { completed, total: req.length, missing, status: sectionStatusFrom(completed, req.length) };
  }
  const missSet = new Set(comp.missingFields ?? []);
  const missing = req.filter(f => missSet.has(f)).map(labelOfField);
  const completed = req.length - missing.length;
  return { completed, total: req.length, missing, status: sectionStatusFrom(completed, req.length) };
}

// 실 협력사 데이터로 섹션별 집계(완료/전체/상태/미입력)를 도출 — 하드코딩 금지(요약카드·헤더·요청 모두 이 값 사용).
//   백엔드 완성도가 집계돼 있으면(requiredFields 존재) 그걸 SSOT로, 없으면(mock·집계 전) 아래 클라이언트 폴백.
function deriveSectionMeta(
  key: SectionKey,
  real: RealData,
  live?: LiveFieldCtx,
): Pick<CollectionSection, 'completed' | 'total' | 'status' | 'missing'> {
  const comp = real.comp;
  if (comp && comp.requiredFieldCount != null && Array.isArray(comp.requiredFields)) {
    return deriveSectionMetaFromBackend(key, comp, live);
  }
  const has = (v: unknown) => v !== null && v !== undefined && v !== '';
  const d = real.detail;
  // live면 지금 입력칸 값, 아니면 마지막 저장된 스냅샷(d) — fallback 경로도 동일하게 live-aware.
  const pick = (domField: string, snapshot: unknown): unknown => (live ? live.readField(domField) : snapshot);
  if (key === 'company') {
    if ((d?.providerType ?? '') === 'miner') {
      // 광산은 회사명·업종만 판정 — 사업자 등록번호는 요구하지 않고, 소재국가는 공장(사이트)
      // 단위로 판정한다(§factories 섹션, 제련소 대행 입력 반영).
      const fields: [string, unknown][] = [
        ['회사명', d?.companyName],
        ['업종(provider type)', d?.providerType],
      ];
      const missing = fields.filter(([, v]) => !has(v)).map(([l]) => l);
      const completed = fields.length - missing.length;
      return { completed, total: fields.length, missing, status: sectionStatusFrom(completed, fields.length) };
    }
    const fields: [string, unknown][] = [
      ['회사명', pick('company.companyName', d?.companyName)],
      ['소재 국가', pick('company.country', d?.country)],
      ['사업자 등록번호', pick('company.businessRegNo', d?.businessRegNo)],
      ['업종(provider type)', pick('company.providerType', d?.providerType)],
    ];
    const missing = fields.filter(([, v]) => !has(v)).map(([l]) => l);
    const completed = fields.length - missing.length;
    return { completed, total: fields.length, missing, status: sectionStatusFrom(completed, fields.length) };
  }
  if (key === 'regulation') {
    // 광산(miner)은 입력 주체가 아니라 규제(자가진단·탄소) 판정 대상 아님 → 해당 없음(백엔드 완성도와 동일 규칙).
    if ((d?.providerType ?? '') === 'miner') return { completed: 0, total: 0, missing: [], status: '해당 없음' };
    const m = (d?.manufacturerDetail ?? {}) as Record<string, unknown>;
    const fields: [string, unknown][] = [
      ['탄소집약도', pick('regulation.carbonIntensity', m.carbonIntensity)],
      ['에너지원', pick('regulation.energySource', m.energySource)],
      ['실사 자가진단', live
        ? live.readField('regulation.selfReportedRiskLevel')
        : (real.riskProfile?.selfReportedRiskLevel && real.riskProfile.selfReportedRiskLevel !== 'unknown' ? real.riskProfile.selfReportedRiskLevel : null)],
    ];
    const missing = fields.filter(([, v]) => !has(v)).map(([l]) => l);
    const completed = fields.length - missing.length;
    return { completed, total: fields.length, missing, status: sectionStatusFrom(completed, fields.length) };
  }
  if (key === 'documents') {
    // 광산은 필요문서(사업자등록증·환경성적서) 제출 주체 아님 → 해당 없음.
    if ((d?.providerType ?? '') === 'miner') return { completed: 0, total: 0, missing: [], status: '해당 없음' };
    const fields: [string, unknown][] = [
      ['사업자등록증', pick('documents.businessRegDocUrl', d?.businessRegDocUrl)],
      ['환경성적서', pick('documents.environmentalReportUrl', d?.environmentalReportUrl)],
    ];
    const missing = fields.filter(([, v]) => !has(v)).map(([l]) => l);
    const completed = fields.length - missing.length;
    return { completed, total: fields.length, missing, status: sectionStatusFrom(completed, fields.length) };
  }
  // factories — 편집 중이면 draft(방금 추가/삭제한 행까지 반영), 아니면 마지막 저장된 목록.
  //   소재구성(핵심광물)도 이 섹션에서 판정한다 — 공장(사이트)마다 다를 수 있어 회사 단위가
  //   아니라 공장 목록을 훑어 하나라도 있으면 충족(§materials.any, 전 유형 공통).
  const factories = live ? live.factories : real.factories;
  const hasComposition = factories.some(f => mineralKeysOf((f.coreMinerals ?? {}) as Record<string, unknown>).length > 0);
  const missing = [
    ...(factories.length > 0 ? [] : ['공장 정보']),
    ...(hasComposition ? [] : ['핵심광물 함량(최소 1종)']),
  ];
  const completed = 2 - missing.length;
  return { completed, total: 2, missing, status: sectionStatusFrom(completed, 2) };
}
function EmptyData() {
  return <div className="rounded-sm border border-dashed border-ink-700 bg-slate-50 px-4 py-8 text-center text-sm text-ink-500">등록된 데이터가 없습니다.</div>;
}

// 필요문서 업로드 행 — 실제로 S3에 올리고(POST /files) 받은 'S3 키'를 doc_url 컬럼에 저장한다.
// 키는 영구값이라(presigned url과 달리 만료 X) 백엔드 파싱(data_gateway)이 그대로 읽어 쓴다.
// 영속화는 hidden input(data-field=섹션.필드)에 S3 키를 실어 persistForm이 읽어 처리.
// 표시는 사람이 알아볼 파일명(키 경로의 마지막 조각)으로 보여준다.
function DocUploadField({ label, field, initialUrl, editable, supplierId }: { label: string; field: string; initialUrl?: string | null; editable?: boolean; supplierId: string }) {
  // docValue = 영속화할 값(S3 키). displayName = 화면 표시용 파일명.
  const [docValue, setDocValue] = useState(initialUrl ?? '');
  const [displayName, setDisplayName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  // initialUrl은 비동기 GET(getSupplierDetail 등) 도착 후 나중에 채워짐 — 첫 렌더 때
  // useState 초기값만 잡고 끝나면 데이터가 도착해도 반영이 안 되므로 prop 변경 시 동기화.
  useEffect(() => {
    setDocValue(initialUrl ?? '');
  }, [initialUrl]);
  const uploaded = Boolean(docValue);
  // 표시명: 방금 올린 파일명 우선, 없으면 S3 키 경로의 마지막 조각.
  const shownName = displayName || (docValue ? docValue.split('/').pop() : '');

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!f) return;
    setUploading(true);
    setError('');
    try {
      // context: 어떤 협력사의 어떤 문서인지 태깅(나중에 GET /files?context= 로 조회 가능).
      const meta = await uploadFile(f, `supplier-doc:${supplierId}:${field}`);
      setDocValue(meta.s3Key);   // ← 컬럼에 저장될 값은 S3 키
      setDisplayName(f.name);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-sm border border-ink-700 bg-white px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink-100">{label}</div>
        <div className={`mt-0.5 truncate text-xs ${error ? 'text-alert-text' : uploaded ? 'text-ink-400' : 'text-ink-500'}`}>
          {error ? error : uploading ? '업로드 중…' : uploaded ? `업로드됨 · ${shownName}` : '미업로드'}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {uploaded && !uploading && (
          <span className="rounded-full border border-ok-border bg-ok-bg px-2 py-0.5 text-[11px] font-bold text-ok-text">완료</span>
        )}
        {editable && (
          <>
            <label className={`rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 ${uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-accent-100'}`}>
              {uploaded ? '파일 변경' : '파일 업로드'}
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={handleSelect}
              />
            </label>
            {uploaded && !uploading && (
              <button type="button" onClick={() => { setDocValue(''); setDisplayName(''); setError(''); }} className="rounded-xs border border-ink-700 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-800">삭제</button>
            )}
          </>
        )}
      </div>
      {/* persistForm이 읽는 영속화 캐리어 — S3 키(또는 기존 값)를 doc_url로 저장 */}
      <input type="hidden" data-field={field} value={docValue} readOnly />
    </div>
  );
}

// [제품별 독립 제출] 공급 품목(supplied-items)을 공급망 맵(=bom_version) 단위로 묶는다.
//   같은 협력사라도 map 마다 대는 부품·공장·핵심광물이 다르므로, 페이지 전체를 이 단위로 분리한다.
//   factoryIds: 이 맵의 엣지가 물리는 공장 id 집합 — 공장/원산지 섹션을 맵별로 필터하는 키.
type SupplyMap = { key: string; label: string; version: string | null; rows: ApiItem[]; factoryIds: string[] };
function buildSupplyMaps(items: ApiItem[]): SupplyMap[] {
  const maps: SupplyMap[] = [];
  const idxOf = new Map<string, number>();
  for (const it of items) {
    const key = it.bomVersionId ?? `${it.productId ?? ''}:${it.bomVersionNumber ?? ''}`;
    if (!key) continue;
    if (!idxOf.has(key)) {
      const label = [it.customerName, it.modelName ?? it.productName].filter(Boolean).join(' ') || '제품';
      idxOf.set(key, maps.length);
      maps.push({ key, label, version: it.bomVersionNumber ?? null, rows: [], factoryIds: [] });
    }
    const m = maps[idxOf.get(key)!];
    m.rows.push(it);
    if (it.factoryId && !m.factoryIds.includes(it.factoryId)) m.factoryIds.push(it.factoryId);
  }
  return maps;
}

function SectionContent({ section, real, editable = false, isPrime = false, supplierId, factoriesDraft, setFactoriesDraft, contactsDraft, setContactsDraft, noMoreMines = false, setNoMoreMines, isSmelter = false, readField, detectedBizRegDoc, setDetectedBizRegDoc, detectedEnvReport, setDetectedEnvReport }: {
  section: CollectionSection;
  real?: RealData | null;
  editable?: boolean;
  isPrime?: boolean;
  supplierId: string;
  factoriesDraft?: FactoryDraft[];
  setFactoriesDraft?: (rows: FactoryDraft[]) => void;
  contactsDraft?: ContactDraft[];
  setContactsDraft?: (rows: ContactDraft[]) => void;
  // "추가 광산 없음" 명시 선언(제련소 전용) — PicRegister의 말단 선언 게이트와 같은 취지.
  noMoreMines?: boolean;
  setNoMoreMines?: (v: boolean) => void;
  isSmelter?: boolean;
  // 저장 전 입력칸의 지금 값을 직접 읽기(완료 배지가 저장하기 전에도 즉시 반영되도록).
  readField?: (field: string) => string;
  // 공장정보 섹션에서 원산지 증명서로 올린 파일이 사업자등록증/환경성적서로 보이면 문서 섹션에 자동 연결.
  detectedBizRegDoc?: { s3Key: string; fileName: string } | null;
  setDetectedBizRegDoc?: (v: { s3Key: string; fileName: string } | null) => void;
  detectedEnvReport?: { s3Key: string; fileName: string } | null;
  setDetectedEnvReport?: (v: { s3Key: string; fileName: string } | null) => void;
}) {
  // 공장정보 섹션 — 원산지 증명서 업로드/없음 확인 전엔 나머지 입력을 가린다.
  const [originCertResolved, setOriginCertResolved] = useState(false);
  // 규제 섹션 — 탄소발자국 문서 AI 파싱 결과. key 리마운트로 CompanyGrid(defaultValue 기반)에 반영.
  const [carbonExtraction, setCarbonExtraction] = useState<AiExtraction | null>(null);
  const [carbonParseVersion, setCarbonParseVersion] = useState(0);
  // 탄소발자국 문서 업로드/파싱 진행 여부 — 파싱 중 규제 입력칸 오버레이/잠금용.
  const [carbonBusy, setCarbonBusy] = useState(false);
  // 방금 업로드한 탄소 문서 — AI 파싱 확인 모달에 넘겨 '파싱 중' 표시/폴링 활성화.
  const [carbonUploadedDoc, setCarbonUploadedDoc] = useState<{ docS3Key: string; fileName: string } | null>(null);
  const [carbonParsingOpen, setCarbonParsingOpen] = useState(false);
  // [작업1] 실사 자가진단(SAQ) 문서 AI 파싱 — 탄소와 동일 파이프라인, 별도 상태로 관리.
  const [saqExtraction, setSaqExtraction] = useState<AiExtraction | null>(null);
  const [saqParseVersion, setSaqParseVersion] = useState(0);
  const [saqBusy, setSaqBusy] = useState(false);
  const [saqUploadedDoc, setSaqUploadedDoc] = useState<{ docS3Key: string; fileName: string } | null>(null);
  const [saqParsingOpen, setSaqParsingOpen] = useState(false);
  let content: ReactNode;
  const d = real?.detail ?? null;
  // live면 지금 입력칸 값, 아니면 마지막 저장된 스냅샷 — 완료 배지 판정용(defaultValue 표시엔 영향 없음).
  const filled = (domField: string, snapshot: unknown): ReviewStatus => fieldFilled(readField ? readField(domField) : snapshot);

  if (section.key === 'company') {
    if ((d?.providerType as string) === 'miner') {
      // 광산은 회사명·업종만 요구한다 — 사업자 등록번호 등은 입력 대상이 아니라 행 자체를
      // 숨긴다(예전엔 항상 렌더링돼 불필요한 '미입력'이 떴다). 소재국가·소재구성은 공장
      // (사이트) 단위로 옮겨갔다(§factories 섹션, 제련소 대행 입력).
      const comp = real?.comp;
      const req = (key: string) => isFieldRequired(key, comp, true);
      const rows: string[][] = [
        [reqLabel('회사명', req('company.company_name')), d?.companyName ?? '-', filled('company.companyName', d?.companyName)],
        [reqLabel('업종(provider type)', req('company.provider_type')), d?.providerType ?? '', filled('company.providerType', d?.providerType)],
      ];
      content = <CompanyGrid rows={rows} editable={false} fieldKeys={['companyName', 'providerType']} fieldPrefix="company" />;
    } else {
      // 입력 모드에선 smelter 구분 행을 항상 노출(업종 변경 가능하도록).
      const showSmelter = editable || (d?.providerType as string) === 'smelter';
      const comp = real?.comp;
      const req = (key: string) => isFieldRequired(key, comp, true); // 폴백: 아래 4개는 항상 필수 취급.
      const rows: string[][] = [
        [reqLabel('회사명', req('company.company_name')), d?.companyName ?? '-', filled('company.companyName', d?.companyName)],
        [reqLabel('소재 국가', req('company.country')), d?.country ?? '-', filled('company.country', d?.country)],
        [reqLabel('사업자 등록번호', req('company.business_reg_no')), d?.businessRegNo ?? '-', filled('company.businessRegNo', d?.businessRegNo)],
        // DUNS·smelter 구분은 선택 항목(별표 없음)이라 안 채워도 다음 단계로 넘어갈 수 있지만,
        //   완료/미입력 표시 자체는 다른 항목과 동일하게(거짓 '완료' 없이) 실제 값 기준으로 보여준다.
        ['DUNS 번호 (선택)', d?.dunsNumber ?? '-', filled('company.dunsNumber', d?.dunsNumber)],
        [reqLabel('업종(provider type)', req('company.provider_type')), d?.providerType ?? '', filled('company.providerType', d?.providerType)],
        ...(showSmelter ? [['smelter 구분 (선택)', d?.smelterType ?? '', filled('company.smelterType', d?.smelterType)] as string[]] : []),
      ];
      const keys = ['companyName', 'country', 'businessRegNo', 'dunsNumber', 'providerType', ...(showSmelter ? ['smelterType'] : [])];
      content = <CompanyGrid rows={rows} editable={editable} fieldKeys={keys} fieldPrefix="company" selects={{ providerType: PROVIDER_OPTS, smelterType: SMELTER_OPTS }} />;
    }
  } else if (section.key === 'factories') {
    // 입력 모드: 공장·담당자를 모두 편집(master-form REPLACE-ALL 라운드트립). 보기 모드: 읽기 전용 테이블.
    if (editable && factoriesDraft && setFactoriesDraft) {
      const miningRows = factoriesDraft.filter(f => f.factoryRole === 'mining');
      const miningRowsComplete = miningRows.length > 0 && miningRows.every(f => f.latitude.trim() !== '' && f.longitude.trim() !== '');
      content = (
        <div className="space-y-5">
          {/* 이 세션이 열리면 먼저 업로드/없음 확인부터 — 그 전엔 아래 공장정보 입력을 가린다. */}
          <OriginCertUploadPanel
            supplierId={supplierId}
            onResolved={() => setOriginCertResolved(true)}
            onDetected={(kind, s3Key, fileName) => {
              if (kind === 'businessReg') setDetectedBizRegDoc?.({ s3Key, fileName });
              else setDetectedEnvReport?.({ s3Key, fileName });
            }}
          />
          <div className="relative">
            <div className={clsx('space-y-5', !originCertResolved && 'pointer-events-none select-none opacity-40 blur-[1px]')}>
              <div>
                <div className="mb-2 text-xs font-bold text-ink-500">공장 정보 (공급비율·위치(원산지)·역할·담당자·소재구성)</div>
                <FactoryCards
                  rows={factoriesDraft}
                  onChange={setFactoriesDraft}
                  isSmelter={isSmelter}
                  active={originCertResolved}
                  contacts={contactsDraft}
                  onContactsChange={setContactsDraft}
                  supplierId={supplierId}
                />
              </div>
              {/* 제련소 전용 — 광산(직접 입력 불가)의 위치를 직상위가 대신 채우는 지점. 최소 1곳 + 추가 광산 없음 선언까지 있어야 완료로 인정. */}
              {isSmelter && (
                <div className="rounded-sm border border-slate-200 bg-slate-50 p-3">
                  {!miningRowsComplete && (
                    <div className="mb-2 text-xs font-semibold text-alert-text">제련소는 원료를 공급받는 광산을 최소 1곳 등록하고 위치를 확정해야 합니다 ("+ 광산 추가" 버튼).</div>
                  )}
                  <label className={clsx('flex cursor-pointer items-start gap-2 text-sm text-ink-300', !miningRowsComplete && 'pointer-events-none opacity-40')}>
                    <input
                      type="checkbox"
                      checked={noMoreMines}
                      onChange={e => setNoMoreMines?.(e.target.checked)}
                      disabled={!miningRowsComplete}
                      className="mt-0.5 h-4 w-4 accent-brand"
                    />
                    <span>
                      <b>이 외에 원료를 공급받는 광산이 더 없습니다.</b>
                      <span className="mt-0.5 block text-[11px] text-slate-500">이 선언은 기록으로 남습니다. 실제로 광산이 더 있는데 누락하면 원산지 추적이 끊깁니다.</span>
                    </span>
                  </label>
                </div>
              )}
            </div>
            {!originCertResolved && (
              <div className="absolute inset-0 z-10 flex items-start justify-center pt-8">
                <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
                  <Lock className="h-3.5 w-3.5" />위 자료 업로드(또는 &quot;업로드할 자료가 없습니다&quot;) 확인 후 입력할 수 있습니다
                </div>
              </div>
            )}
          </div>
        </div>
      );
    } else {
      // 공장 정보(원산지·이름·주소) + 그 공장 소재구성(광물별 행, CompanyGrid와 동일 톤) + 담당자
      // — 공장마다 카드 하나(입력 모드와 동일 구조). 담당자는 factoryId로 그 공장 카드에,
      // factoryId 없으면 회사 공통 카드에.
      const contactsOf = (factoryId: string | null) => (real?.contacts ?? []).filter(c => (c.factoryId ?? null) === factoryId);
      // 담당자 — 다른 섹션과 같은 테두리 표 톤으로 통일: 이름/직책/이메일/연락처/대표를
      // 열로 나눠 세로 정렬한다(한 줄에 다 몰아넣던 이전 방식 대신).
      const ContactList = ({ items }: { items: ApiSupplierContact[] }) => (
        items.length ? (
          <div className="overflow-hidden rounded-sm border border-ink-700">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  {['이름', '직책', '이메일', '연락처', '대표'].map(h => (
                    <th key={h} className="border-b border-ink-700 px-4 py-2 text-left text-xs font-semibold text-ink-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.contactId} className="border-b border-ink-700 last:border-b-0">
                    <td className="px-4 py-2.5 text-sm font-semibold text-ink-100">{c.name ?? '-'}</td>
                    <td className="px-4 py-2.5 text-sm text-ink-500">{c.role ?? '-'}</td>
                    <td className="px-4 py-2.5 text-sm text-ink-500">{c.email ?? '-'}</td>
                    <td className="px-4 py-2.5 text-sm text-ink-500">{c.mobile ?? c.phone ?? '-'}</td>
                    <td className="px-4 py-2.5 text-sm text-ink-500">{c.isPrimary ? '대표' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="text-sm text-ink-500">등록된 담당자가 없습니다.</div>
      );
      const factories = (real?.factories ?? []).filter(f => f.isActive !== false);
      content = (
        <div className="space-y-3">
          {factories.length === 0 && <EmptyData />}
          {factories.map(f => {
            // 다른 섹션(CompanyGrid: 회사정보·규제)과 같은 테두리 표 톤으로 통일 — 원산지·주소·
            //   공급비율·소재구성 전부 이 컴포넌트를 그대로 재사용한다(칸이 균일하게 나뉘는 표).
            const infoRows: string[][] = [
              ['원산지', f.country ?? '-', fieldFilled(f.country)],
              ['주소', f.address ?? '-', fieldFilled(f.address)],
              ['공급비율', f.supplyRatioPercent != null ? `${f.supplyRatioPercent}%` : '-', fieldFilled(f.supplyRatioPercent)],
            ];
            const cm = f.coreMinerals ?? {};
            const mineralRows: string[][] = MINERAL_EDIT_KEYS.map(k => {
              const v = cm[k];
              return [`${MINERAL_LABELS[k] ?? k} 함량(%)`, v != null ? `${v}%` : '-', v != null ? '완료' : '해당 없음'];
            });
            return (
              <div key={f.factoryId} className={clsx('space-y-3 rounded-sm border border-ink-700 bg-white p-4', f.factoryRole === 'mining' && 'bg-accent-50/40')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-ink-100">{f.factoryName ?? '-'}</span>
                  <span className="rounded-full border border-ink-700 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
                    {FACTORY_ROLE_OPTS.find(o => o.value === f.factoryRole)?.label ?? f.factoryRole ?? '-'}
                  </span>
                </div>
                <CompanyGrid rows={infoRows} />
                <div>
                  <div className="mb-1 text-sm font-medium text-ink-500">소재 구성</div>
                  <CompanyGrid rows={mineralRows} />
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-ink-500">담당자</div>
                  <ContactList items={contactsOf(f.factoryId)} />
                </div>
              </div>
            );
          })}
          <div className="space-y-3 rounded-sm border border-ink-700 bg-slate-50 p-4">
            <div className="text-sm font-bold text-ink-100">회사 공통 담당자</div>
            <ContactList items={contactsOf(null)} />
          </div>
        </div>
      );
    }
  } else if (section.key === 'regulation') {
    const m = (d?.manufacturerDetail ?? {}) as Record<string, unknown>;
    const naMiner = (d?.providerType ?? '') === 'miner';  // 광산: 규제(탄소·자가진단) 판정 대상 아님 → 해당 없음
    const comp = real?.comp;
    const req = (key: string) => isFieldRequired(key, comp, true);

    // ── [3-1] 탄소 파싱 병합(편집 모드 전용) — 값이 있으면 채우고, 신뢰도 < 0.8이면 '검토 권장' 플래그. ──
    const pf = carbonExtraction?.parsedFields ?? {};
    const conf = carbonExtraction?.confidenceMap ?? {};
    const flagged: Record<string, string> = {};
    const carbonParsedKeys: string[] = [];   // [작업②] AI 자동입력 하이라이트 대상
    let ci: unknown = m.carbonIntensity;
    let es: unknown = m.energySource;
    // [요구사항1] 파싱이 수행되면(carbonExtraction 존재) 추출 결과가 이 문서의 '권위값'이다.
    //   서류상 공란인 필드(예: 에너지원)는 빈칸으로 확정한다 — 모달을 닫고 복귀할 때
    //   이전에 저장돼 있던 스테일 DB값('한국 전력망 평균…')이 되살아나는 상태 드리프트 방지.
    if (editable && carbonExtraction) {
      const ciParsed = pf.carbon_intensity;
      const esParsed = pf.energy_source;
      if (ciParsed != null && ciParsed !== '') {
        ci = ciParsed;
        carbonParsedKeys.push('carbonIntensity');
        if ((conf.carbon_intensity ?? 0) < 0.8) flagged.carbonIntensity = `검토 권장 · 신뢰도 ${Math.round((conf.carbon_intensity ?? 0) * 100)}%`;
      } else {
        ci = '';  // 파싱됐으나 탄소집약도 미기재 → 빈칸(스테일값 폴백 금지)
      }
      if (esParsed != null && esParsed !== '') {
        es = esParsed;
        carbonParsedKeys.push('energySource');
        if ((conf.energy_source ?? 0) < 0.8) flagged.energySource = `검토 권장 · 신뢰도 ${Math.round((conf.energy_source ?? 0) * 100)}%`;
      } else {
        es = '';  // 서류상 에너지원 공란 → 빈칸 유지(스테일값 폴백 금지)
      }
    }
    const ciNum = ci != null && ci !== '' ? parseFloat(String(ci)) : NaN;
    const carbonRows: string[][] = [
      [reqLabel('탄소집약도 (kgCO2eq/kg)', req('regulation.carbon_intensity')), ci != null ? String(ci) : '-', naMiner ? '해당 없음' : filled('regulation.carbonIntensity', ci)],
      [reqLabel('에너지원', req('regulation.energy_source')), (es as string) ?? '-', naMiner ? '해당 없음' : filled('regulation.energySource', es)],
    ];
    const carbonPlaceholders = {
      carbonIntensity: '서류를 업로드하면 자동으로 채워집니다 (직접 입력도 가능)',
      energySource: '주요 에너지원을 입력하거나 서류를 업로드하세요',
    };

    // ── [3-2] SAQ 파싱 병합 — 저장 컬럼은 self_reported_risk_level 뿐, 나머지는 parsed JSONB 표시+CSDDD 판정 입력. ──
    const spf = (saqExtraction?.parsedFields ?? {}) as Record<string, unknown>;
    const sr = real?.riskProfile?.selfReportedRiskLevel;
    const srRaw = sr && sr !== 'unknown' ? sr : '';
    const parsedRisk = typeof spf.saq_risk_level === 'string' ? (spf.saq_risk_level as string).toLowerCase() : '';
    const srPrefill = editable && ['low', 'medium', 'high'].includes(parsedRisk) ? parsedRisk : srRaw;
    const saqRows: string[][] = [
      [reqLabel('실사 자가진단 (리스크 등급)', req('regulation.self_reported_risk_level')), srPrefill, naMiner ? '해당 없음' : filled('regulation.selfReportedRiskLevel', srPrefill)],
      // DD 보고서는 원청 전용 — 협력사 폼에는 표시하지 않는다.
      ...(isPrime ? [['실사(DD) 보고서', '원청 작성 — 협력사 비표시', '해당 없음'] as string[]] : []),
    ];
    // SAQ 파싱 상세(읽기전용) — 저장 컬럼이 없어 표시 + CSDDD 판정 입력용.
    const saqDetail: { label: string; key: string }[] = [
      { label: '평가 표준', key: 'saq_standard' },
      { label: '점수/등급', key: 'saq_score' },
      { label: '유효기간', key: 'saq_valid_until' },
      { label: '고충처리 채널', key: 'grievance_mechanism' },
      { label: '강제노동 징후', key: 'forced_labor_risk' },
      { label: '아동노동 징후', key: 'child_labor_risk' },
      { label: '준수 등급', key: 'compliance_grade' },
    ];
    const shownSaqDetail = saqDetail.filter(x => { const v = spf[x.key]; return v != null && v !== ''; });
    const saqFields: Record<string, unknown> = {
      saq_standard: spf.saq_standard, saq_score: spf.saq_score, saq_valid_until: spf.saq_valid_until,
      saq_risk_level: spf.saq_risk_level ?? (srRaw || undefined),
      grievance_mechanism: spf.grievance_mechanism, forced_labor_risk: spf.forced_labor_risk,
      child_labor_risk: spf.child_labor_risk, compliance_grade: spf.compliance_grade,
    };

    const busyOverlay = (
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-sm bg-white/70 backdrop-blur-[1px]">
        <div className="flex items-center gap-2.5 rounded-full border border-accent-200 bg-white px-4 py-2 shadow-control">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-100 border-t-accent-700" />
          <span className="text-xs font-semibold text-accent-800">AI가 문서를 파싱하고 있어요…</span>
        </div>
      </div>
    );

    content = (
      <div className="space-y-4">
        {/* ══ 3-1. 환경 규제 · 탄소발자국 ══ */}
        <div className="space-y-3 rounded-sm border border-ink-700 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-xs bg-accent-50 px-2 py-0.5 text-xs font-bold text-accent-700">3-1</span>
            <span className="text-sm font-bold text-ink-100">환경 규제 · 탄소발자국</span>
            <span className="text-[11px] text-ink-500">EU 배터리법 Art.7</span>
          </div>
          <CarbonFootprintDocPanel
            supplierId={supplierId}
            initialUrl={d?.carbonFootprintDocUrl}
            editable={editable}
            onParsed={extraction => { setCarbonExtraction(extraction); setCarbonParseVersion(v => v + 1); }}
            onOpenViewer={() => setCarbonParsingOpen(true)}
            onBusyChange={setCarbonBusy}
            onUploaded={setCarbonUploadedDoc}
          />
          {/* 파싱 중 입력칸 오버레이/잠금 */}
          <div className="relative">
            <div className={carbonBusy ? 'pointer-events-none select-none opacity-40 transition-opacity' : 'transition-opacity'} aria-busy={carbonBusy}>
              <CompanyGrid key={`carbon-${carbonParseVersion}`} rows={carbonRows} editable={editable} fieldKeys={['carbonIntensity', 'energySource']} fieldPrefix="regulation" flagged={flagged} parsedFieldKeys={carbonParsedKeys} placeholders={carbonPlaceholders} />
            </div>
            {carbonBusy && busyOverlay}
          </div>
          {/* AI 규제 분석 보고서 (RAG · EU 배터리법) — 값이 있을 때만 */}
          {!naMiner && <CarbonComplianceReport carbonIntensity={Number.isNaN(ciNum) ? null : ciNum} energySource={(es as string) || null} />}
        </div>

        {/* ══ 3-2. 인권·안전 실사 (SAQ) ══ */}
        <div className="space-y-3 rounded-sm border border-ink-700 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-xs bg-accent-50 px-2 py-0.5 text-xs font-bold text-accent-700">3-2</span>
            <span className="text-sm font-bold text-ink-100">인권·안전 실사 (SAQ)</span>
            <span className="text-[11px] text-ink-500">CSDDD 공급망 실사 지침</span>
          </div>
          <SelfAssessmentDocPanel
            supplierId={supplierId}
            initialUrl={d?.selfAssessmentDocUrl}
            editable={editable}
            onParsed={extraction => { setSaqExtraction(extraction); setSaqParseVersion(v => v + 1); }}
            onOpenViewer={() => setSaqParsingOpen(true)}
            onBusyChange={setSaqBusy}
            onUploaded={setSaqUploadedDoc}
          />
          <div className="relative">
            <div className={saqBusy ? 'pointer-events-none select-none opacity-40 transition-opacity' : 'transition-opacity'} aria-busy={saqBusy}>
              <CompanyGrid key={`saq-${saqParseVersion}`} rows={saqRows} editable={editable} fieldKeys={['selfReportedRiskLevel', ...(isPrime ? ['ddReport'] : [])]} fieldPrefix="regulation" selects={{ selfReportedRiskLevel: RISK_OPTS }} />
            </div>
            {saqBusy && busyOverlay}
          </div>
          {/* 파싱된 SAQ 상세 항목(읽기전용) */}
          {shownSaqDetail.length > 0 && (
            <div className="grid gap-px overflow-hidden rounded-sm border border-ink-700 bg-ink-700 md:grid-cols-2">
              {shownSaqDetail.map(x => (
                <div key={x.key} className="flex items-center justify-between gap-2 bg-white px-3 py-2">
                  <span className="shrink-0 text-xs font-medium text-ink-500">{x.label}</span>
                  <span className="flex items-center gap-1 truncate text-xs font-semibold text-ink-100">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-accent-700" />
                    <span className="truncate">{String(spf[x.key])}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* AI CSDDD 실사 분석 보고서 (RAG) — 파싱 항목이 있을 때만 */}
          {!naMiner && <SaqComplianceReport saqFields={saqFields} />}
        </div>

        {/* 파싱 확인 모달 — 탄소 / SAQ 각각 */}
        <AiParsingReviewModal
          supplierId={supplierId}
          open={carbonParsingOpen}
          onClose={() => setCarbonParsingOpen(false)}
          docCategoryFilter="carbon_footprint_declaration"
          docS3KeyFilter={carbonUploadedDoc?.docS3Key ?? null}
          initialDoc={carbonUploadedDoc ? {
            docId: carbonUploadedDoc.docS3Key,
            fileName: carbonUploadedDoc.fileName,
            fileUrl: null,
            requestType: '탄소발자국 증빙',
            docS3Key: carbonUploadedDoc.docS3Key,
          } : null}
          title="AI 파싱 확인 및 수정 · 탄소발자국 문서"
        />
        <AiParsingReviewModal
          supplierId={supplierId}
          open={saqParsingOpen}
          onClose={() => setSaqParsingOpen(false)}
          docCategoryFilter="dd_audit_report"
          docS3KeyFilter={saqUploadedDoc?.docS3Key ?? null}
          initialDoc={saqUploadedDoc ? {
            docId: saqUploadedDoc.docS3Key,
            fileName: saqUploadedDoc.fileName,
            fileUrl: null,
            requestType: '실사 자가진단(SAQ)',
            docS3Key: saqUploadedDoc.docS3Key,
          } : null}
          title="AI 파싱 확인 및 수정 · 실사 자가진단(SAQ)"
        />
      </div>
    );
  } else {
    // documents — 사업자등록증·환경성적서 업로드(파일명 표시·영속화).
    //   공장정보 섹션에서 원산지 증명서로 올린 파일이 사업자등록증/환경성적서로 보이면 여기로 자동 연결(같은 파일 재업로드 방지).
    const bizRegUrl = detectedBizRegDoc?.s3Key ?? d?.businessRegDocUrl;
    const envUrl = detectedEnvReport?.s3Key ?? d?.environmentalReportUrl;
    const comp = real?.comp;
    const req = (key: string) => isFieldRequired(key, comp, true);
    content = (
      <div className="space-y-2">
        <DocUploadField label={reqLabel('사업자등록증', req('documents.business_reg_doc_url'))} field="documents.businessRegDocUrl" initialUrl={bizRegUrl} editable={editable} supplierId={supplierId} />
        {detectedBizRegDoc && (
          <div className="-mt-1 text-[11px] text-ink-400">공장정보 섹션에서 올린 자료에서 자동 연결됨 · {detectedBizRegDoc.fileName}</div>
        )}
        <DocUploadField label={reqLabel('환경성적서', req('documents.environmental_report_url'))} field="documents.environmentalReportUrl" initialUrl={envUrl} editable={editable} supplierId={supplierId} />
        {detectedEnvReport && (
          <div className="-mt-1 text-[11px] text-ink-400">공장정보 섹션에서 올린 자료에서 자동 연결됨 · {detectedEnvReport.fileName}</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-[14px] border-t border-ink-700 bg-white p-4">
      {content}
    </div>
  );
}

function AccordionSection({
  section,
  onRequestSection,
  real,
  editable = false,
  showRequest = true,
  isPrime = false,
  supplierId,
  factoriesDraft,
  setFactoriesDraft,
  contactsDraft,
  setContactsDraft,
  noMoreMines,
  setNoMoreMines,
  isSmelter = false,
  locked = false,
  canProceed = false,
  prompt = null,
  onProceedClick,
  onConfirmYes,
  onConfirmNo,
  readField,
  detectedBizRegDoc,
  setDetectedBizRegDoc,
  detectedEnvReport,
  setDetectedEnvReport,
}: {
  section: CollectionSection;
  onRequestSection: (section: CollectionSection) => void;
  real?: RealData | null;
  editable?: boolean;       // 입력 모드(자료 제출) — 값 셀을 입력칸으로
  showRequest?: boolean;    // 원청 전용 '미입력 N건 요청' 버튼 노출 여부
  isPrime?: boolean;          // 원청 모드 — DD 보고서 등 원청 전용 항목 노출
  supplierId: string;       // 필요문서 업로드 context 태깅용
  factoriesDraft?: FactoryDraft[];
  setFactoriesDraft?: (rows: FactoryDraft[]) => void;
  contactsDraft?: ContactDraft[];
  setContactsDraft?: (rows: ContactDraft[]) => void;
  noMoreMines?: boolean;
  setNoMoreMines?: (v: boolean) => void;
  isSmelter?: boolean;
  // 이전 섹션이 미완료 — 내용은 비쳐 보이되 편집 불가(단계별 강제 순서).
  locked?: boolean;
  // 잠긴 섹션 중 "바로 다음 순번"인가 — 여기에만 진행 버튼을 보여준다(순서를 건너뛰어 진행 불가).
  canProceed?: boolean;
  // 진행 버튼 클릭 결과 — 'missing'(필수값 미충족) | 'confirm'(정말 넘어가시겠습니까) | null(버튼만 표시).
  prompt?: 'missing' | 'confirm' | null;
  onProceedClick?: () => void;
  onConfirmYes?: () => void;
  onConfirmNo?: () => void;
  readField?: (field: string) => string;
  detectedBizRegDoc?: { s3Key: string; fileName: string } | null;
  setDetectedBizRegDoc?: (v: { s3Key: string; fileName: string } | null) => void;
  detectedEnvReport?: { s3Key: string; fileName: string } | null;
  setDetectedEnvReport?: (v: { s3Key: string; fileName: string } | null) => void;
}) {
  // 섹션은 항상 펼쳐서 고정 표시(드롭다운 제거). 미입력/확인 필요면 그 자리에서 보완 요청.
  const needsRequest = showRequest && (section.status === '미입력' || section.status === '확인 필요') && section.missing.length > 0;
  return (
    <section id={`section-${section.key}`} className="scroll-mt-24 overflow-hidden border-b border-ink-700 bg-white first:rounded-t-sm first:border-t last:rounded-b-sm">
      <div className="flex w-full items-center justify-between gap-3 border-b border-ink-700 bg-slate-50/60 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className={clsx('flex h-4 w-4 items-center justify-center', iconTone(section.status))}>{section.icon}</span>
          <span className="truncate text-sm font-semibold text-ink-100">
            {section.order}. {section.title}
          </span>
          {locked && (
            <span className="inline-flex items-center gap-1 rounded-xs border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
              <Lock className="h-3 w-3" />이전 섹션 완료 필요
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs font-medium text-ink-500">{section.completed} / {section.total} 완료</span>
          <StatusBadge status={section.status} />
          {needsRequest && (
            <button
              type="button"
              onClick={() => onRequestSection(section)}
              className="inline-flex items-center gap-1 rounded-sm border border-alert-border bg-alert-bg px-2 py-1 text-xs font-semibold text-alert-text hover:bg-alert-solid hover:text-white"
              title={`미입력 항목: ${section.missing.join(', ')}`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              미입력 {section.missing.length}건 요청
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        <SectionContent
          section={section}
          real={real}
          editable={editable}
          isPrime={isPrime}
          supplierId={supplierId}
          factoriesDraft={factoriesDraft}
          setFactoriesDraft={setFactoriesDraft}
          contactsDraft={contactsDraft}
          setContactsDraft={setContactsDraft}
          noMoreMines={noMoreMines}
          setNoMoreMines={setNoMoreMines}
          isSmelter={isSmelter}
          readField={readField}
          detectedBizRegDoc={detectedBizRegDoc}
          setDetectedBizRegDoc={setDetectedBizRegDoc}
          detectedEnvReport={detectedEnvReport}
          setDetectedEnvReport={setDetectedEnvReport}
        />
        {/* 잠금 오버레이 — 내용은 비쳐 보이되(반투명) 클릭·입력은 막는다.
            바로 다음 순번(canProceed)이면 진행 버튼을, 그 뒤 섹션들은 안내 문구만 보여준다. */}
        {locked && (
          <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/70 pt-10 backdrop-blur-[1px]">
            {canProceed ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={onProceedClick}
                  className="flex items-center gap-2 rounded-full border-2 border-accent-300 bg-white px-5 py-3 text-base font-bold text-accent-700 shadow-md hover:bg-accent-50"
                >
                  <Lock className="h-5 w-5" />이전 세션 완료시 눌러주시면 다음 입력이 가능합니다
                </button>
                {prompt === 'missing' && (
                  <div className="rounded-full border-2 border-alert-border bg-alert-bg px-4 py-2 text-sm font-bold text-alert-text">
                    필수값을 먼저 입력해주세요
                  </div>
                )}
                {prompt === 'confirm' && (
                  <div className="flex items-center gap-3 rounded-md border-2 border-slate-300 bg-white px-4 py-3 text-base font-bold text-ink-100 shadow-md">
                    정말 다음으로 넘어가시겠습니까?
                    <button type="button" onClick={onConfirmYes} className="rounded-sm bg-accent-700 px-4 py-2 text-base text-white hover:bg-accent-900">네</button>
                    <button type="button" onClick={onConfirmNo} className="rounded-sm border-2 border-ink-700 px-4 py-2 text-base text-ink-500 hover:bg-slate-50">아니오</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
                <Lock className="h-3.5 w-3.5" />이전 섹션을 완료하면 열립니다
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function SupplierGeneralReviewContent({
  supplierId: supplierIdProp,
  supplierName: supplierNameProp,
  openRequest: openRequestProp,
  embedded = false,
  mode = 'prime',
}: {
  supplierId?: string;
  supplierName?: string;
  openRequest?: boolean;
  // 임베드 모드: 공급망 워크스페이스 모달 안에서 표준 양식을 그대로 재사용(돌아가기 바·풀페이지 배경 제거).
  embedded?: boolean;
  // 같은 표준 양식을 공유한다:
  //  - 'prime'      : 원청 정보확인 + 자료요청(기본, 기존 동작)
  //  - 'supplier' : 협력사 — 한 페이지에서 '내 기업 정보(보기)' ↔ '자료 제출(입력)'을
  //                 화면 전환 없이 같은 양식의 칸만 토글한다.
  mode?: 'prime' | 'supplier';
} = {}) {
  const isPrime = mode === 'prime';
  const isSupplier = mode === 'supplier';
  // 협력사: 보기(읽기 전용) ↔ 입력(자료 제출) — 라우트 변경 없이 editable 토글.
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);   // 저장하기 직후 '저장됨' 피드백
  // 제련소 등 연결된 상위 협력사가 이 광산의 '공장 정보'만 대신 입력하는 모드(§factories.mine_*).
  //   광산 자신은 항상 읽기전용이라(managedBanner) 이 화면(mode='prime')에서 대신 입력한다.
  //   실제 저장 범위 제한은 백엔드(submit_master_form의 on_behalf 분기)가 구조적으로 보장한다.
  const [minerFactoryEditing, setMinerFactoryEditing] = useState(false);
  // 광산 안내 배너 — 광산은 입력 주체가 아니라 읽기 전용(편집/자료 제출 비활성).
  //   공장 정보는 광산 자체(광산=공장)의 supplier_factories 를 그대로 보여준다.
  const [managedBanner, setManagedBanner] = useState<{ mineName: string } | null>(null);
  const editable = isSupplier && editing && !managedBanner;
  // '공장 정보' 섹션만: 대행 입력 모드에서도 편집 가능(다른 섹션은 계속 읽기전용/해당없음).
  const factoriesEditable = editable || minerFactoryEditing;
  const formRef = useRef<HTMLElement>(null);
  // 편집 중 입력칸 값이 바뀔 때마다 1씩 올려 리렌더를 강제 — data-field 입력칸은 비제어(defaultValue)라
  //   렌더 사이에 값이 안 바뀌므로, 이 tick으로 "지금 실제로 입력칸에 뭐가 들어있는지"를 다시 읽게 한다.
  const [, setFormTick] = useState(0);
  const readField = (field: string): string => {
    const el = formRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-field="${field}"]`);
    return (el?.value ?? '').trim();
  };
  // 편집모드로 막 전환된 순간엔 입력칸(defaultValue)이 이번 렌더에서 새로 생기는 중이라, readField가
  //   보는 DOM엔 아직 반영되기 전이다(이전 커밋 기준) — 그래서 값이 있어도 첫 화면엔 "미입력"으로 보였다.
  //   커밋 이후 한 번 더 tick을 올려, 입력칸이 실제로 DOM에 붙은 다음 값을 다시 읽게 한다.
  useEffect(() => {
    if (editable) setFormTick(t => t + 1);
  }, [editable]);
  // 단계별 진행 — 자동으로 "완료됨" 판정만으로 다음 섹션을 열지 않고, 사용자가 직접
  //   "다음 섹션으로 진행" 버튼을 눌러 확인해야 연다. unlockedUpTo = 지금까지 진행 확정한 섹션 idx.
  const [unlockedUpTo, setUnlockedUpTo] = useState(0);
  type ProceedPrompt = { idx: number; kind: 'confirm' | 'missing' } | null;
  const [proceedPrompt, setProceedPrompt] = useState<ProceedPrompt>(null);
  // 공장정보 섹션에서 원산지 증명서로 올린 파일이 사업자등록증/환경성적서로 보이면 문서 섹션에 자동 연결.
  const [detectedBizRegDoc, setDetectedBizRegDoc] = useState<{ s3Key: string; fileName: string } | null>(null);
  const [detectedEnvReport, setDetectedEnvReport] = useState<{ s3Key: string; fileName: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supplierId = supplierIdProp ?? searchParams.get('supplierId') ?? '';
  const supplierName = supplierNameProp ?? searchParams.get('supplier') ?? supplierSummary.name;

  // [오늘의 알림 딥링크] ?section=키 → 해당 섹션(id="section-키")으로 스크롤.
  // 섹션은 항상 렌더되지만 데이터 로드/레이아웃 후 위치가 잡히도록 다음 틱에 이동.
  useEffect(() => {
    const target = searchParams.get('section');
    if (!target) return;
    const timer = setTimeout(() => {
      document.getElementById(`section-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // supplierId가 UUID면 실 백엔드(detail·contacts·completeness)에서 채우고, mock S-ID면 기존 mock 폴백.
  const isRealSupplier = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(supplierId);
  const [api, setApi] = useState<RealData | null>(null);
  // 자료요청 전체 — 원청 검토 상태(submissionStatus)·다음 제출 예정일(dueDate)을 "선택된 맵(bom_version)"별로 파생.
  const [allRequests, setAllRequests] = useState<ApiDataRequest[]>([]);
  // [제품별 독립 제출] 헤더에서 선택한 공급망 맵(=bom_version) key. '' = 첫 맵(자동).
  const [selectedMapKey, setSelectedMapKey] = useState<string>('');
  // 입력 모드 편집용 draft — 로드된 GET 데이터에서 시드(전체 현재 집합). master-form REPLACE-ALL 라운드트립.
  const [factoriesDraft, setFactoriesDraft] = useState<FactoryDraft[]>([]);
  const [contactsDraft, setContactsDraft] = useState<ContactDraft[]>([]);
  // "추가 광산 없음" 명시 선언(제련소 전용) — PicRegister 말단선언 패턴과 동일 취지.
  const [noMoreMines, setNoMoreMines] = useState(false);
  useEffect(() => {
    if (!isRealSupplier) { setApi(null); setAllRequests([]); setManagedBanner(null); return; }
    setSelectedMapKey(''); // 협력사 전환 시 맵 선택 초기화(첫 맵으로)
    let cancelled = false;
    (async () => {
      // 광산도 자기 id로 조회한다 — 광산은 광산 자체가 곧 공장이라 자기 supplier_factories 를
      //   그대로 받는다(리다이렉트 없음). 단 광산은 입력 주체가 아니라 보기 전용.
      const [detail, contactsRes, factoriesRes, comp, itemsRes, riskRes, requestsRes] = await Promise.all([
        getSupplierDetail(supplierId).catch(() => null),
        getSupplierContacts(supplierId).catch(() => null),
        getSupplierFactories(supplierId).catch(() => null),
        getSupplierCompleteness(supplierId).catch(() => null),
        getSupplierSuppliedItems(supplierId).catch(() => null),
        getSupplierRiskProfile(supplierId).catch(() => null),
        getDataRequests({ supplierId }).catch(() => null),
      ]);
      if (cancelled) return;
      setApi({
        detail,
        contacts: contactsRes?.contacts ?? [],
        factories: factoriesRes?.factories ?? [],
        comp,
        items: itemsRes?.items ?? [],
        riskProfile: riskRes,
      });
      // 광산은 입력 주체가 아니라 읽기 전용(공장 정보는 광산 자체 = 공장).
      setManagedBanner(detail?.providerType === 'miner' ? { mineName: detail.companyName } : null);
      // 전체 요청 보관 — 최신 선별은 선택된 맵(bom_version) 기준으로 렌더 시점에 파생한다.
      setAllRequests(requestsRes ?? []);
    })();
    return () => { cancelled = true; };
  }, [isRealSupplier, supplierId]);

  // api 로드 시 draft 시드(전체 현재 집합). 편집 진입 시에도 최신 서버 값으로 재시드(아래 setEditing 핸들러).
  // 비활성(is_active=false, 소프트 삭제) 공장은 편집 대상에서 제외 — 원산지 이력 보존용이라 UI엔 안 뜬다.
  useEffect(() => {
    const factories = (api?.factories ?? []).filter(f => f.isActive !== false).map(factoryToDraft);
    setFactoriesDraft(factories);
    setContactsDraft(seedContactsDraft(api?.contacts ?? [], factories));
  }, [api]);

  // [제품별 독립 제출] 공급망 맵 목록 + 선택된 맵. 회사정보/PIC/연락처는 맵 무관 공통.
  const supplyMaps = buildSupplyMaps(api?.items ?? []);
  const activeMap = supplyMaps.find(m => m.key === selectedMapKey) ?? supplyMaps[0] ?? null;
  // 선택된 맵으로 스코프한 api — 공장(엣지가 무는 factory_id)·품목을 맵 단위로 한정.
  //   factoryIds가 비면(레거시/미매핑) 전체 공장을 그대로 보여준다(정보 손실 방지).
  const scopedApi: RealData | null = api && activeMap
    ? {
        ...api,
        items: activeMap.rows,
        factories: activeMap.factoryIds.length
          ? api.factories.filter(f => activeMap.factoryIds.includes(f.factoryId))
          : api.factories,
      }
    : api;
  // 선택된 맵의 최신 자료요청(원청 검토 상태·예정일). 마이그레이션 안전:
  //   요청 중 bom_version_id가 하나라도 있으면(=per-map 기능 가동) 맵별로 엄격 분리,
  //   전부 null(기능 이전 데이터)이면 기존처럼 전체 최신으로 폴백.
  const perMapRequestsActive = allRequests.some(r => r.bomVersionId);
  const latestRequest: ApiDataRequest | null = (() => {
    const pool = (activeMap && perMapRequestsActive)
      ? allRequests.filter(r => r.bomVersionId === activeMap.key)
      : allRequests;
    return [...pool].sort((a, b) => (b.requestedAt ?? '').localeCompare(a.requestedAt ?? ''))[0] ?? null;
  })();

  const apiPrimary = api?.contacts.find(c => c.isPrimary) ?? api?.contacts[0];
  const selectedSupplier = suppliers.find(supplier => supplier.id === supplierId);
  const selectedName = getSupplierName(supplierId);
  const selectedCompleteness = supplierCompleteness.find(item => item.supplierId === supplierId);
  // mock 대표 연락처
  const mockContacts = getContacts(supplierId);
  const mockPrimary = mockContacts.find(c => c.isPrimary) ?? mockContacts[0];

  const displayName = api?.detail?.companyName ?? selectedName?.nameKo ?? supplierName;
  const displayRole = (api?.detail && providerTypeLabel[api.detail.providerType]) ?? selectedSupplier?.role ?? supplierSummary.role;
  // 실 협력사인데 백엔드 값이 비면 다른 회사 mock(supplierSummary=한양제조)이 아니라 '미입력/—'으로.
  const displayCountry = api?.detail?.country ?? selectedSupplier?.country ?? (isRealSupplier ? '미입력' : supplierSummary.country);
  const displayTier = selectedSupplier ? `T${selectedSupplier.tier}` : (isRealSupplier ? '—' : supplierSummary.tier);
  const displayRate = api?.comp?.completionRate ?? selectedCompleteness?.completionRate ?? supplierSummary.collectionRate;
  const displayCompleted = api?.comp?.filledFieldCount ?? selectedCompleteness?.filledFieldCount ?? supplierSummary.completed;
  const displayTotal = api?.comp?.requiredFieldCount ?? selectedCompleteness?.requiredFieldCount ?? supplierSummary.total;
  const displayLastUpdated = (api?.comp?.lastUpdatedAt ?? selectedCompleteness?.lastUpdatedAt ?? supplierSummary.lastSubmittedAt)?.slice(0, 16).replace('T', ' ');
  const displayManager = apiPrimary?.name ?? mockPrimary?.name ?? (isRealSupplier ? '미등록' : supplierSummary.manager);
  const displayEmail = apiPrimary?.email ?? mockPrimary?.email ?? (isRealSupplier ? '—' : supplierSummary.email);
  const displayPhone = apiPrimary?.mobile ?? apiPrimary?.phone ?? mockPrimary?.mobile ?? mockPrimary?.phone ?? (isRealSupplier ? '—' : supplierSummary.phone);
  // submission 도메인 — 최신 자료요청에서 원청 검토 상태·다음 제출 예정일 추출.
  const displayNextDue = latestRequest?.dueDate?.slice(0, 10) ?? (isRealSupplier ? '—' : supplierSummary.nextDueDate);
  const displayReviewStatus: ReviewStatus = (() => {
    if (!latestRequest) return isRealSupplier ? '미입력' : supplierSummary.reviewStatus;
    switch (latestRequest.submissionStatus) {
      case 'submission_approved': return '완료';
      case 'submission_review': return '확인 필요';
      case 'submission_submitted': case 'submission_in_progress': return '입력 중';
      default: return '미입력';
    }
  })();
  // 입력 현황에서 '자료 요청'으로 넘어오면(request=1) 요청 모달을 바로 연다 — 자연스러운 흐름 연결.
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(openRequestProp ?? (searchParams.get('request') === '1'));
  const [requestSent, setRequestSent] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  // 실 협력사면 섹션 집계를 실데이터로 도출, 아니면(데모/mock) static 구성 사용.
  // 제련소 광산 요건 — 백엔드 완성도 SSOT가 아직 이 조건을 모르므로(요청 예정) 클라이언트에서 덧씌운다:
  //   역할=광산 행이 최소 1개 있고, 전부 좌표가 있고, "추가 광산 없음"을 명시 선언해야 factories 완료.
  const isSmelter = api?.detail?.providerType === 'smelter';
  const miningRows = factoriesDraft.filter(f => f.factoryRole === 'mining');
  const mineRequirementMet = !isSmelter || (miningRows.length > 0 && miningRows.every(f => f.latitude.trim() !== '' && f.longitude.trim() !== '') && noMoreMines);
  // 편집 중엔 저장 전 입력칸 값 기준(live)으로, 아니면 마지막 저장된 스냅샷 기준으로 완료 여부 판정.
  const liveCtx: LiveFieldCtx | undefined = editable ? { readField, factories: factoriesDraft } : undefined;
  const liveSections = (scopedApi ? sections.map(s => ({ ...s, ...deriveSectionMeta(s.key, scopedApi, liveCtx) })) : sections)
    .map(s => (s.key === 'factories' && isSmelter && !mineRequirementMet)
      ? { ...s, status: '미입력' as ReviewStatus, missing: Array.from(new Set([...s.missing, '광산 위치(최소 1곳) + 추가 광산 없음 확인'])) }
      : s);

  // 다음 섹션으로 진행 버튼 — 직전 섹션이 완료/해당없음이면 "정말 넘어가시겠습니까" 확인,
  //   아니면 "필수값을 먼저 입력해주세요"만 띄우고 대기(자동으로 넘어가지 않음).
  function handleProceedClick(idx: number) {
    const prevOk = ['완료', '해당 없음'].includes(liveSections[idx - 1]?.status);
    setProceedPrompt({ idx, kind: prevOk ? 'confirm' : 'missing' });
  }
  function confirmProceedYes() {
    if (proceedPrompt) setUnlockedUpTo(u => Math.max(u, proceedPrompt.idx));
    setProceedPrompt(null);
  }
  function confirmProceedNo() {
    setProceedPrompt(null);
  }
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  function toggleItem(key: string) {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // 섹션별 인라인 요청 — 해당 섹션의 미입력 항목만 선택해 요청 모달을 연다(한 페이지에서 "이 항목 비어서 → 요청").
  function openRequestForSection(section: CollectionSection) {
    const next = new Set<string>();
    section.missing.forEach(item => next.add(`${section.key}:${item}`));
    setCheckedItems(next);
    setIsRequestModalOpen(true);
  }

  const urgentCount = liveSections.reduce((sum, section) =>
    section.status === '미입력' || section.status === '확인 필요' ? sum + section.missing.length : sum, 0);

  // 협력사 '자료 제출' — 입력값을 수집해 master-form 으로 일괄 영속화(저장·제출 공통).
  // company 는 authoritative-overwrite(생략=NULL) → 로드된 detail 에서 round-trip 후 편집값으로 override.
  // factories·contacts 는 REPLACE-ALL → draft(전체 현재 집합)를 그대로 보낸다.
  async function persistForm() {
    if (!isRealSupplier) return;
    // company/materials/regulation/documents 스칼라 입력칸은 data-field="섹션.필드" 로 식별(전과 동일).
    const root = formRef.current;
    const read = (field: string): string | undefined => {
      const el = root?.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-field="${field}"]`);
      return el ? el.value.trim() : undefined;
    };
    const d = api?.detail ?? null;
    // detail 에 타입 미선언 필드(corporate_reg_no/tax_number 등) round-trip 접근용.
    const dRec = (d ?? {}) as unknown as Record<string, unknown>;
    // 빈 문자열은 omit(undefined로 두어 round-trip 값 유지), 그 외엔 그대로.
    const orNull = (v: string | undefined): string | undefined => (v === undefined ? undefined : v === '' ? undefined : v);

    // ── company: 로드된 detail 라운드트립(생략=NULL 방어) + 편집 입력값 override ──
    const company: Record<string, unknown> = {
      // round-trip(편집 UI 없는 필드) — 누락 시 NULL 화 방지.
      company_name_en: d?.companyNameEn ?? undefined,
      company_name_ko: d?.companyNameKo ?? undefined,
      ceo_name: d?.ceoName ?? undefined,
      corporate_reg_no: dRec.corporateRegNo ?? undefined,
      tax_number: dRec.taxNumber ?? undefined,
      website: d?.website ?? undefined,
      established_year: d?.establishedYear ?? undefined,
      employee_count: d?.employeeCount ?? undefined,
    };
    // 편집 입력값 override. 입력칸이 화면에 없는 필드(v===undefined)는 round-trip으로
    //   기존 값을 유지한다 — 그래야 회사 섹션 전체가 편집 가능하지 않은 화면(예: 광산 대행
    //   입력에서 '공장 정보'만 편집)에서 저장해도 나머지 회사 필드가 NULL로 덮이지 않는다.
    const roundTrip = (v: string | undefined, current: unknown) => (v !== undefined ? (v || null) : (current ?? null));
    const companyName = orNull(read('company.companyName'));
    company.company_name = companyName ?? d?.companyName ?? '';                          // REQUIRED
    const pt = read('company.providerType');
    company.provider_type = (pt && pt !== '') ? pt : (d?.providerType ?? '');            // REQUIRED — 빈값이면 detail 폴백
    company.country = roundTrip(read('company.country'), d?.country);
    company.business_reg_no = roundTrip(read('company.businessRegNo'), d?.businessRegNo);
    company.duns_number = roundTrip(read('company.dunsNumber'), d?.dunsNumber);
    company.smelter_type = roundTrip(read('company.smelterType'), d?.smelterType);
    // 소재 구성은 더 이상 회사 단위 입력칸이 없다(§factories 섹션의 공장 카드로 이전) —
    // 레거시 값이 있으면 지우지 않고 그대로 라운드트립만 한다(master-form은 생략=NULL이라 필요).
    company.core_minerals = d?.coreMinerals ?? null;
    // 필요문서 업로드(S3 키) — company 컬럼으로 영속화. 입력칸이 없는 화면이면 round-trip.
    company.business_reg_doc_url = roundTrip(read('documents.businessRegDocUrl'), d?.businessRegDocUrl);
    company.environmental_report_url = roundTrip(read('documents.environmentalReportUrl'), d?.environmentalReportUrl);
    company.self_assessment_doc_url = roundTrip(read('regulation.selfAssessmentDocUrl'), dRec.selfAssessmentDocUrl);
    // 소재구성 문서(회사 단위 레거시 컬럼) — 더 이상 이 화면에서 올리지 않으니 라운드트립만.
    company.material_composition_doc_url = dRec.materialCompositionDocUrl ?? null;
    // 탄소발자국 문서 — CarbonFootprintDocPanel(규제 섹션) hidden input 우선, 없으면 round-trip.
    company.carbon_footprint_doc_url = roundTrip(read('regulation.carbonFootprintDocUrl'), dRec.carbonFootprintDocUrl);

    // ── factories: draft(전체 현재 집합) → snake_case (UPSERT) ──
    // 기존 공장은 factory_id 를 round-trip 해 백엔드가 UPDATE(id 보존)하도록 한다.
    // supply_ratio.factory_id FK 가 참조 중이면 DELETE+INSERT 는 FK 위반으로 실패하기 때문.
    const factories = factoriesDraft.map(f => {
      const out: Record<string, unknown> = {};
      if (f.factoryId) out.factory_id = f.factoryId;
      if (f.factoryName) out.factory_name = f.factoryName;
      if (f.country) out.country = f.country;
      if (f.region) out.region = f.region;
      if (f.address) out.address = f.address;
      if (f.factoryRole) out.factory_role = f.factoryRole;
      if (f.destination) out.destination = f.destination;
      if (f.supplyRatioPercent !== '') out.supply_ratio_percent = Number(f.supplyRatioPercent);
      if (Object.keys(f.coreMinerals).length) out.core_minerals = f.coreMinerals;
      // 공장 담당자(공장 단위)
      if (f.factoryManagerName) out.factory_manager_name = f.factoryManagerName;
      if (f.factoryManagerRole) out.factory_manager_role = f.factoryManagerRole;
      if (f.factoryManagerPhone) out.factory_manager_phone = f.factoryManagerPhone;
      if (f.factoryManagerEmail) out.factory_manager_email = f.factoryManagerEmail;
      // 좌표: lat/lng 둘 다 있으면 coordinates 로 매핑, 아니면 omit.
      if (f.latitude !== '' && f.longitude !== '') {
        out.coordinates = { latitude: Number(f.latitude), longitude: Number(f.longitude) };
      }
      return out;
    });

    // ── contacts: draft(전체 현재 집합) → snake_case (REPLACE-ALL) ──
    const contacts = contactsDraft.map(c => {
      const out: Record<string, unknown> = {};
      if (c.name) out.name = c.name;
      if (c.role) out.role = c.role;
      if (c.department) out.department = c.department;
      if (c.email) out.email = c.email;
      if (c.phone) out.phone = c.phone;
      if (c.mobile) out.mobile = c.mobile;
      out.is_primary = c.isPrimary;
      if (c.factoryIndex != null) out.factory_index = c.factoryIndex;
      return out;
    });

    // ── manufacturing: 규제 입력값 + detail round-trip. factory_declarations 는 항상 []. ──
    const ciRaw = read('regulation.carbonIntensity');
    const esRaw = read('regulation.energySource');
    const md = (d?.manufacturerDetail ?? {}) as Record<string, unknown>;
    const manufacturing: Record<string, unknown> = {
      carbon_intensity: ciRaw === undefined || ciRaw === '' ? null : Number(ciRaw),
      energy_source: esRaw === undefined || esRaw === '' ? null : esRaw,
      manufacturing_process: (md.manufacturingProcess as string | undefined) ?? null,
      capacity: (md.capacity as string | undefined) ?? null,
      factory_declarations: [],
    };

    const body: Record<string, unknown> = { company, factories, contacts, manufacturing };
    const srl = read('regulation.selfReportedRiskLevel'); if (srl) body.self_reported_risk_level = srl;

    await submitMasterForm(supplierId, body);
    // 입력값 반영 — detail·contacts·factories·risk-profile·완성도 재조회(정확한 서버 값으로).
    //   completeness도 함께 갱신해야 저장 직후 배지·퍼센트가 바로 최신 상태로 뜬다.
    const [fresh, contactsRes, factoriesRes, rp, comp] = await Promise.all([
      getSupplierDetail(supplierId).catch(() => null),
      getSupplierContacts(supplierId).catch(() => null),
      getSupplierFactories(supplierId).catch(() => null),
      getSupplierRiskProfile(supplierId).catch(() => null),
      getSupplierCompleteness(supplierId).catch(() => null),
    ]);
    setApi(prev => (prev ? {
      ...prev,
      ...(fresh ? { detail: fresh } : {}),
      ...(contactsRes ? { contacts: contactsRes.contacts ?? [] } : {}),
      ...(factoriesRes ? { factories: factoriesRes.factories ?? [] } : {}),
      ...(rp ? { riskProfile: rp } : {}),
      ...(comp ? { comp } : {}),
    } : prev));
  }

  // 저장하기 — DB 영속화 후 계속 입력(편집 유지).
  async function saveSupplierForm() {
    setSubmitting(true);
    setSaved(false);
    try {
      await persistForm();
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && err.message === 'CONSENT_REQUIRED') {
        alert('제3자 정보제공 동의가 필요합니다. 초대 메일의 링크로 접속해 동의를 완료한 뒤 자료를 저장할 수 있어요.');
      } else {
        alert('저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // 제출하기 — DB 영속화 후 보기 화면으로 복귀.
  async function submitSupplierForm() {
    setSubmitting(true);
    try {
      await persistForm();
      setSaved(false);
      setEditing(false);
      // [process.md L28·52] 협력사가 표준 양식 자료 제출 완료 → 원청 탭에 검토/승인 요청 알림.
      if (isSupplier) {
        addDemoNotification({
          audience: 'prime',
          notification_type: 'approval_needed',
          subject: '협력사 자료 제출 완료',
          body: '협력사가 표준 양식 자료 입력을 완료했습니다. My Task에서 내용을 검토하고 승인해 주세요.',
          deep_link: 'my-task',
          actor: '협력사',
        });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && err.message === 'CONSENT_REQUIRED') {
        alert('제3자 정보제공 동의가 필요합니다. 초대 메일의 링크로 접속해 동의를 완료한 뒤 자료를 제출할 수 있어요.');
      } else {
        alert('제출에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function sendRequest() {
    setRequestSent(true);
    // 요청 제목 = 실제 부족(미입력) 항목명. "어떤 자료가 부족해서 요청"이 한눈에.
    const items = Array.from(checkedItems).map(k => k.split(':').slice(1).join(':'));
    const title = items.length
      ? `보완 요청 · ${items.slice(0, 3).join(', ')}${items.length > 3 ? ` 외 ${items.length - 3}건` : ''}`
      : '보완 요청';
    if (isRealSupplier) {
      // 실 협력사 → 백엔드 POST /data-requests (요청자는 토큰에서 채움).
      try {
        await createDataRequest({
          targetSupplierId: supplierId,
          requestedDataType: title,
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        });
      } catch {
        /* 발송 실패해도 UI는 닫는다(데모). 실패 토스트는 추후. */
      }
    } else if (supplierId) {
      // mock 협력사 → localStorage 기록(백엔드 미연동 구간).
      addStoredRequest({
        supplier: displayName,
        supplierId,
        title,
        status: 'progress',
        due: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        missing: checkedItems.size,
        createdAt: new Date().toISOString(),
      });
    }
    setTimeout(() => {
      setIsRequestModalOpen(false);
      setRequestSent(false);
      setRequestNote('');
    }, 1500);
  }


  if (!supplierId) {
    return <SupplierInputStatusBoard />;
  }

  return (
    <main
      ref={formRef}
      className={embedded ? '' : 'min-h-screen bg-slate-50 px-7 py-5'}
      // 입력칸 어디서든 값이 바뀌면 tick만 올려 리렌더 — 완료 배지·진행 가능 여부를 지금 입력값 기준으로 다시 계산.
      onChange={() => setFormTick(t => t + 1)}
    >
      {managedBanner && (
        <div className="mb-4 flex items-start gap-2 rounded-sm border border-info-border bg-info-bg px-4 py-3 text-sm text-info-text">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>{managedBanner.mineName}</b>은 데이터 입력 주체가 아닙니다(읽기 전용). 공장 정보는 광산 자체(광산=공장)입니다.
          </span>
        </div>
      )}
      <div className="mb-4 flex items-center justify-between gap-4">
        {embedded || !isPrime ? (
          <span className="text-sm font-medium text-ink-500">
            {isSupplier
              ? (editing ? '자료 제출 · 표준 양식 입력' : '내 기업 정보 · 입력 완료 현황')
              : '협력사 정보 확인 · 자료 요청'}
          </span>
        ) : (
          <button type="button" onClick={() => router.push('/suppliers')} className="inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-accent-700">
            <ArrowLeft className="h-4 w-4" />
            협력사 목록으로 돌아가기
          </button>
        )}
        <div className="flex items-center gap-2">
          {/* 원청 전용: 추가 자료 요청 */}
          {isPrime && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-sm bg-brand px-3 text-sm font-semibold text-white shadow-control transition-colors hover:bg-brand-hover active:opacity-75"
              >
                <MessageSquare className="h-4 w-4" />
                추가 자료 요청하기
              </button>
              {urgentCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-alert-solid px-1 text-[11px] font-bold text-white">
                  {urgentCount}
                </span>
              )}
            </div>
          )}
          {/* 연결된 상위 협력사(제련소 등)의 대행 입력 — 광산은 항상 읽기전용이라 '공장 정보'
              섹션만 예외로 편집을 연다(§factories.mine_country/mine_composition). */}
          {isPrime && managedBanner && !minerFactoryEditing && (
            <button
              type="button"
              onClick={() => {
                setSaved(false);
                setFactoriesDraft((api?.factories ?? []).filter(f => f.isActive !== false).map(factoryToDraft));
                setMinerFactoryEditing(true);
              }}
              className="inline-flex h-9 items-center gap-2 rounded-sm bg-accent-700 px-3 text-sm font-semibold text-white shadow-control transition-colors hover:bg-accent-900 active:opacity-75"
            >
              <Pencil className="h-4 w-4" />
              공장 정보 대행 입력
            </button>
          )}
          {isPrime && managedBanner && minerFactoryEditing && (
            <>
              {saved && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-ok-text">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  저장됨
                </span>
              )}
              <button
                type="button"
                onClick={() => { setSaved(false); setMinerFactoryEditing(false); }}
                className="inline-flex h-9 items-center gap-2 rounded-sm border border-ink-700 bg-white px-3 text-sm font-semibold text-ink-500 transition-colors hover:border-accent-500 hover:text-accent-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveSupplierForm}
                disabled={submitting}
                className="inline-flex h-9 items-center gap-2 rounded-sm border border-accent-600 bg-accent-50 px-3 text-sm font-semibold text-accent-700 transition-colors hover:bg-accent-100 active:opacity-75 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {submitting ? '저장 중…' : '저장하기'}
              </button>
            </>
          )}
          {/* 협력사: 보기 ↔ 입력 토글 (라우트 변경 없이 같은 양식의 칸만 전환) */}
          {isSupplier && !editing && !managedBanner && (
            <>
              {/* [process.md L23·42] 원산지 geo audit · AI 파싱 검증 확인 화면으로 이동 */}
              <button
                type="button"
                onClick={() => router.push('/partner/ai-parsing')}
                className="inline-flex h-9 items-center gap-2 rounded-sm border border-ink-700 bg-white px-3 text-sm font-semibold text-ink-500 transition-colors hover:border-accent-500 hover:text-accent-700"
              >
                <Globe2 className="h-4 w-4" />
                원산지·AI 검증 확인
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaved(false);
                  const factories = (api?.factories ?? []).filter(f => f.isActive !== false).map(factoryToDraft);
                  setFactoriesDraft(factories);
                  setContactsDraft(seedContactsDraft(api?.contacts ?? [], factories));
                  // 이미 저장돼 완료된 앞쪽 섹션들은 매번 재확인시키지 않고 그대로 이어서 열어준다.
                  let alreadyDone = 0;
                  for (const s of liveSections) {
                    if (s.status === '완료' || s.status === '해당 없음') alreadyDone += 1;
                    else break;
                  }
                  setUnlockedUpTo(alreadyDone);
                  setProceedPrompt(null);
                  setEditing(true);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-sm bg-accent-700 px-3 text-sm font-semibold text-white shadow-control transition-colors hover:bg-accent-900 active:opacity-75"
              >
                <Pencil className="h-4 w-4" />
                자료 제출 · 정보 입력
              </button>
            </>
          )}
          {isSupplier && editing && (
            <>
              {saved && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-ok-text">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  저장됨
                </span>
              )}
              <button
                type="button"
                onClick={() => { setSaved(false); setEditing(false); }}
                className="inline-flex h-9 items-center gap-2 rounded-sm border border-ink-700 bg-white px-3 text-sm font-semibold text-ink-500 transition-colors hover:border-accent-500 hover:text-accent-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveSupplierForm}
                disabled={submitting}
                className="inline-flex h-9 items-center gap-2 rounded-sm border border-accent-600 bg-accent-50 px-3 text-sm font-semibold text-accent-700 transition-colors hover:bg-accent-100 active:opacity-75 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {submitting ? '저장 중…' : '저장하기'}
              </button>
              <button
                type="button"
                onClick={submitSupplierForm}
                disabled={submitting}
                className="inline-flex h-9 items-center gap-2 rounded-sm bg-accent-700 px-3 text-sm font-semibold text-white shadow-control transition-colors hover:bg-accent-900 active:opacity-75 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {submitting ? '제출 중…' : '제출하기'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* [제품별 독립 제출] 헤더 공급망 맵 탭 — 선택 시 페이지 전체(공장·원산지·핵심광물·원청 검토 상태·완성도)가
          그 맵(bom_version) 기준으로 전환된다. 회사정보/PIC/연락처는 맵 무관 공통이라 아래 헤더에 고정.
          편집(자료 제출) 중엔 공장 편집이 전체 집합 대상이라 탭을 숨긴다(맵 스코프 혼동 방지). */}
      {supplyMaps.length > 1 && !editing && (
        <div className="flex flex-wrap items-end gap-1 border-b border-ink-700/40">
          {supplyMaps.map(m => {
            const dup = supplyMaps.filter(x => x.label === m.label).length > 1;
            const isActive = (activeMap?.key ?? '') === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedMapKey(m.key)}
                className={`-mb-px rounded-t-sm border px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-ink-700 border-b-white bg-white text-ink-100'
                    : 'border-transparent bg-slate-50 text-ink-400 hover:text-ink-100'
                }`}
              >
                {m.label}{dup && m.version ? ` v${m.version}` : ''}
              </button>
            );
          })}
        </div>
      )}

      <section className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="truncate text-lg font-semibold tracking-tight text-ink-100">{displayName}</h1>
            <span className="rounded-full border border-ok-border bg-ok-bg px-2 py-0.5 text-xs font-semibold text-ok-text">{displayTier}</span>
            <span className="text-xs font-medium text-ink-500">{displayRole} <span className="mx-1.5 text-ink-700">|</span> {displayCountry}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-500">
            <span className="font-semibold text-ink-100">협력사 담당자 (PIC)</span>
            <span>{displayManager}</span>
            <span className="h-3 w-px bg-ink-700" />
            <span>{displayEmail}</span>
            <span className="h-3 w-px bg-ink-700" />
            <span>{displayPhone}</span>
          </div>
          {/* 수집률·제출일·검토상태 — 폭이 좁아도 항상 한 줄(grid-cols-3) */}
          <div className="mt-3 grid grid-cols-3 gap-4 border-t border-ink-700 pt-3">
            <div className="min-w-0">
              <div className="text-xs font-medium text-ink-500">전체 수집률</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xl font-semibold text-ok-text">{displayRate}%</span>
                <div className="min-w-10 flex-1"><ProgressBar value={displayRate} status="완료" /></div>
              </div>
              <div className="mt-1 text-xs text-ink-500">{displayCompleted} / {displayTotal} 수집</div>
            </div>
            <div className="min-w-0 border-l border-ink-700 pl-4">
              <div className="text-xs font-medium text-ink-500">최근 제출일</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-100">
                {displayLastUpdated}
                <StatusBadge status="완료" />
              </div>
            </div>
            <div className="min-w-0 border-l border-ink-700 pl-4">
              <div className="text-xs font-medium text-ink-500">원청 검토 상태</div>
              <div className="mt-1.5"><StatusBadge status={displayReviewStatus} /></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-3 rounded-sm border border-ink-700 bg-white p-3 shadow-control">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink-100">수집 항목 요약</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {liveSections.map(section => <SummaryCard key={section.key} section={section} />)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <LegendItem status="완료" icon={<CheckCircle2 className="h-4 w-4" />} />
          <LegendItem status="입력 중" icon={<HelpCircle className="h-4 w-4" />} />
          <LegendItem status="확인 필요" icon={<HelpCircle className="h-4 w-4" />} />
          <LegendItem status="미입력" icon={<XCircle className="h-4 w-4" />} />
          <LegendItem status="해당 없음" icon={<span className="block h-3 w-3 rounded-full bg-slate-300" />} />
          <span className="text-xs font-medium text-alert-text">* 표시 = 필수 입력 항목</span>
        </div>
      </section>

      <section className="mt-4 rounded-sm border border-ink-700 bg-white shadow-control">
        {/* 단계별 잠금 — 자료 제출 입력 모드에서만: idx가 unlockedUpTo보다 크면 잠금.
            "직전 섹션 완료" 자동판정만으로는 열리지 않고, 사용자가 진행 버튼을 눌러 확인해야 열린다.
            원청 검토·협력사 보기 모드는 항상 전체 노출(검토는 순서 강제할 이유가 없음). */}
        {liveSections.map((section, idx) => {
          const locked = editable && idx > unlockedUpTo;
          const isNextToUnlock = locked && idx === unlockedUpTo + 1;
          return (
            <AccordionSection
              key={section.key}
              section={section}
              onRequestSection={openRequestForSection}
              real={scopedApi}
              editable={section.key === 'factories' ? factoriesEditable : editable}
              showRequest={isPrime}
              isPrime={isPrime}
              supplierId={supplierId}
              factoriesDraft={factoriesDraft}
              setFactoriesDraft={setFactoriesDraft}
              contactsDraft={contactsDraft}
              setContactsDraft={setContactsDraft}
              noMoreMines={noMoreMines}
              setNoMoreMines={setNoMoreMines}
              isSmelter={isSmelter}
              locked={locked}
              canProceed={isNextToUnlock}
              prompt={isNextToUnlock && proceedPrompt?.idx === idx ? proceedPrompt.kind : null}
              onProceedClick={() => handleProceedClick(idx)}
              onConfirmYes={confirmProceedYes}
              onConfirmNo={confirmProceedNo}
              readField={editable ? readField : undefined}
              detectedBizRegDoc={detectedBizRegDoc}
              setDetectedBizRegDoc={setDetectedBizRegDoc}
              detectedEnvReport={detectedEnvReport}
              setDetectedEnvReport={setDetectedEnvReport}
            />
          );
        })}
      </section>

      <section className="mt-4 grid rounded-sm border border-ink-700 bg-white shadow-control md:grid-cols-2">
        <MetaItem label="마지막 업데이트" value={displayLastUpdated} />
        <MetaItem label="다음 제출 예정일" value={displayNextDue} />
      </section>

      {isPrime && isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-sm border border-ink-700 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4">
              <div>
                <div className="text-base font-bold text-ink-100">추가 자료 요청</div>
                <div className="mt-1 text-xs text-ink-500">{displayName} · {displayEmail}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="rounded-xs border border-ink-700 p-1.5 text-ink-400 hover:text-ink-100"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {liveSections
                .filter(section => section.missing.length > 0)
                .map(section => (
                  <div key={section.key}>
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold text-ink-500">
                      <span className={clsx('flex h-4 w-4 items-center justify-center', iconTone(section.status))}>
                        {section.icon}
                      </span>
                      {section.title}
                      <span className={clsx('rounded-full border px-1.5 py-0.5 text-[10px] font-bold', statusClasses(section.status))}>
                        {section.status}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {section.missing.map(item => {
                        const key = `${section.key}:${item}`;
                        return (
                          <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-xs border border-ink-700 px-3 py-2 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={checkedItems.has(key)}
                              onChange={() => toggleItem(key)}
                              className="h-3.5 w-3.5 accent-brand"
                            />
                            <span className="text-sm text-ink-300">{item}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

              <div>
                <div className="mb-2 text-xs font-bold text-ink-500">추가 메모 (선택)</div>
                <textarea
                  value={requestNote}
                  onChange={e => setRequestNote(e.target.value)}
                  placeholder="협력사에게 전달할 추가 안내사항을 입력하세요."
                  className="w-full rounded-xs border border-ink-700 p-3 text-sm text-ink-300 outline-none placeholder:text-ink-500 focus:border-accent-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-ink-700 px-5 py-4">
              <div className="text-xs text-ink-500">
                {checkedItems.size}개 항목 선택됨
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="rounded-xs border border-ink-700 bg-white px-4 py-2 text-sm font-semibold text-ink-400 hover:border-accent-500 hover:text-accent-700"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={sendRequest}
                  disabled={checkedItems.size === 0 || requestSent}
                  className="inline-flex items-center gap-2 rounded-xs bg-ok-solid px-4 py-2 text-sm font-semibold text-white hover:bg-ok-solid disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {requestSent ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      발송 완료
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      요청 발송
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-ink-700 px-6 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="text-sm font-medium text-ink-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-ink-100">{value}</div>
    </div>
  );
}
