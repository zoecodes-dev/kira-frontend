'use client';

// 협력사 입력 데이터 수집 현황을 원청사가 검토하는 화면
import { useEffect, useRef, useState } from 'react';
import {
  createDataRequest, getDataRequests,
  getSupplierCompleteness, getSupplierContacts, getSupplierDetail, getSupplierFactories,
  getSupplierSuppliedItems, submitMasterForm,
  getSupplierRiskProfile, uploadFile, updateSupplierDetail, getAiExtractions,
  type AiExtraction, type SupplierRiskProfileResponse as ApiRiskProfile,
  type SupplierDetail as ApiSupplierDetail, type SupplierContact as ApiSupplierContact,
  type SupplierFactory as ApiSupplierFactory, type SupplierCompleteness as ApiCompleteness,
  type SuppliedItem as ApiItem, type ApiDataRequest,
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
import Link from 'next/link';
import clsx from 'clsx';
import { suppliers } from '@/lib/data';
import { getContacts, getSupplierName, supplierCompleteness } from '@/lib/supplier-detail-data';
import { addStoredRequest } from '@/lib/data-request-store';
import SupplierInputStatusBoard from '@/components/suppliers/SupplierInputStatusBoard';
// 소재구성 문서 파싱 결과 팝업 — /partner/ai-parsing 페이지와 동일 화면(공통 모듈)을 모달로 띄운다.
import AiParsingView from '@/components/supplier/AiParsingView';
import {
  ArrowLeft,
  BarChart3,
  Box,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Globe,
  HelpCircle,
  Info,
  Globe2,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Save,
  Send,
  Sparkles,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { FactoryLocationResult } from '@/components/supplier/FactoryLocationPicker';

// leaflet은 모듈 로드 시점에 window를 참조하므로 정적 import 시 SSR 프리렌더가 깨진다(ReferenceError: window is not defined).
const FactoryLocationPicker = dynamic(() => import('@/components/supplier/FactoryLocationPicker'), { ssr: false });

type ReviewStatus = '완료' | '입력 중' | '확인 필요' | '미입력' | '해당 없음';
type SectionKey = 'company' | 'materials' | 'factories' | 'regulation' | 'documents';

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
    icon: <Building2 className="h-5 w-5" />,
    comment: '공급비율·위치(원산지)·공장 담당자.', missing: [],
  },
  {
    key: 'materials',
    order: 3,
    title: '소재 구성',
    completed: 0, total: 1, status: '미입력',
    icon: <Box className="h-5 w-5" />,
    comment: '핵심광물(Li/Co/Ni) 함량(%)을 입력하세요.', missing: [],
  },
  {
    key: 'regulation',
    order: 4,
    title: '규제',
    completed: 0, total: 1, status: '미입력',
    icon: <Globe className="h-5 w-5" />,
    comment: '탄소발자국·실사 자가진단.', missing: [],
  },
  {
    key: 'documents',
    order: 5,
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

const contactRows = [
  ['ESG 담당자', '김철수 ESG팀장', 'cs.kim@hanyangmfg.com', '+82-10-1234-5678', '완료'],
  ['품질 담당자', '-', '-', '-', '미입력'],
  ['물류 담당자', '-', '-', '-', '미입력'],
  ['비상 연락처', '-', '-', '-', '미입력'],
];

const factoryRows = [
  ['청주 1공장', 'KR', '충북 청주시 오송생명로 200', '2.4 GWh/월', 'EU · US', '확인 필요'],
  ['청주 2공장', 'KR', '충북 청주시 오송생명로 220', '미입력', 'EU', '미입력'],
  ['본사', 'KR', '서울 강남구 테헤란로 152', '-', '-', '해당 없음'],
];

const supplyItemRows = [
  ['BAT-NCM811-100Ah', 'Premium NCM811 100Ah', 'Pack', 'EU', '완료'],
  ['BAT-LFP-120Ah', 'LFP Power 120Ah', 'Pack', 'EU', '입력 중'],
  ['BAT-NCM622-90Ah', 'NCM622 90Ah', 'Pack', 'US', '미입력'],
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

function ToolbarButton({ icon, label }: { icon: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      className="inline-flex h-9 items-center gap-2 rounded-sm border border-ink-700 bg-white px-3 text-sm font-medium text-ink-500 shadow-control hover:border-accent-200 hover:text-accent-700"
      aria-label={label ?? '더보기'}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
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

function CompanyGrid({ rows = companyRows, editable = false, fieldKeys, fieldPrefix = 'company', selects, flagged }: { rows?: string[][]; editable?: boolean; fieldKeys?: string[]; fieldPrefix?: string; selects?: Record<string, { value: string; label: string }[]>; flagged?: Record<string, string> }) {
  return (
    <div className="grid overflow-hidden rounded-sm border border-ink-700 md:grid-cols-2">
      {rows.map(([label, value, status], i) => {
        const key = fieldKeys?.[i];
        const opts = key ? selects?.[key] : undefined;
        const dataField = key ? `${fieldPrefix}.${key}` : undefined;
        // AI 파싱 신뢰도 낮음 등 — 값은 채우되 warn 톤 + 배지로 검토를 유도(ExtractionTable 패턴).
        const flag = key ? flagged?.[key] : undefined;
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
                  placeholder={`${label} 입력`}
                  data-field={dataField}
                  className={clsx(
                    'w-full rounded-xs border px-2.5 py-1.5 text-sm text-ink-100 outline-none placeholder:text-ink-500 focus:ring-1',
                    flag
                      ? 'border-warn-border bg-warn-bg focus:border-warn-text focus:ring-warn-border'
                      : 'border-ink-700 bg-white focus:border-accent-500 focus:ring-accent-500/20',
                  )}
                />
                {flag && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-warn-text">
                    <Info className="h-3 w-3" />
                    {flag}
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="truncate text-sm font-semibold text-ink-100">{opts ? (opts.find(o => o.value === value)?.label ?? value) : value}</div>
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

function DataTable({ headers, rows, editable = false }: { headers: string[]; rows: string[][]; editable?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-ink-700">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map(header => (
              <th key={header} className="whitespace-nowrap border-b border-ink-700 px-4 py-3 text-left text-xs font-semibold text-ink-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`} className="border-b border-ink-700 last:border-b-0 hover:bg-accent-50/30">
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className={clsx('whitespace-nowrap px-4 py-3 text-ink-500', cellIndex === 0 && 'font-semibold text-ink-100')}>
                  {cellIndex === row.length - 1
                    ? <StatusBadge status={cell as ReviewStatus} />
                    : editable
                      ? <input
                          defaultValue={cell === '-' || cell === '미입력' || cell === '미첨부' ? '' : cell}
                          placeholder={headers[cellIndex] ?? ''}
                          className="w-full min-w-24 rounded-xs border border-ink-700 bg-white px-2 py-1 text-sm text-ink-100 outline-none placeholder:text-ink-500 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20"
                        />
                      : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 협력사 입력 모드 전용 편집 가능한 행 draft (master-form REPLACE-ALL 라운드트립용) ──
// GET(SupplierFactory/SupplierContact)에서 시드해 전체 현재 집합을 들고 있다가 그대로 다시 보낸다.
interface FactoryDraft {
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
}
interface ContactDraft {
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  mobile: string;
  isPrimary: boolean;
}
const emptyFactoryDraft = (): FactoryDraft => ({
  factoryName: '', country: '', region: '', address: '', factoryRole: '',
  destination: '', supplyRatioPercent: '', latitude: '', longitude: '',
  factoryManagerName: '', factoryManagerRole: '', factoryManagerPhone: '', factoryManagerEmail: '',
});
const emptyContactDraft = (): ContactDraft => ({
  name: '', role: '', department: '', email: '', phone: '', mobile: '', isPrimary: false,
});
const factoryToDraft = (f: ApiSupplierFactory): FactoryDraft => ({
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
});
const contactToDraft = (c: ApiSupplierContact): ContactDraft => ({
  name: c.name ?? '',
  role: c.role ?? '',
  department: c.department ?? '',
  email: c.email ?? '',
  phone: c.phone ?? '',
  mobile: c.mobile ?? '',
  isPrimary: Boolean(c.isPrimary),
});

const editCellCls = 'w-full min-w-24 rounded-xs border border-ink-700 bg-white px-2 py-1 text-sm text-ink-100 outline-none placeholder:text-ink-500 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20';

// 역할(factoryRole) enum — 백엔드 계약과 동일한 값(lib/api.ts:504). 라벨만 한글.
const FACTORY_ROLE_OPTS: { value: string; label: string }[] = [
  { value: '', label: '선택' },
  { value: 'headquarters', label: '본사' },
  { value: 'production', label: '생산' },
  { value: 'outsourcing', label: '위탁' },
  { value: 'processing', label: '가공' },
  { value: 'mining', label: '광산' },
];
const factoryRoleSelectCls = 'w-full min-w-20 rounded-xs border border-ink-700 bg-white px-2 py-1 text-sm text-ink-100 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20';

// 공장 정보 편집 테이블 — "위치 먼저" 흐름.
//   (1) 신규 행은 "공장정보 추가" 버튼 → 통합검색(FactoryLocationPicker)으로 위치부터 확정 →
//       그 결과값(좌표·국가·지역·주소)이 채워진 행이 생성된다(빈 행을 먼저 만들지 않는다).
//   (2) 편집 시작 시 이미 저장돼 있던 기존 행(factoryId 있음)은 이번 세션에 아직 위치 재확인을
//       받지 않았으므로, active(=원산지 증명서 게이트 통과) 상태가 되면 행별로 순서대로 통합검색을
//       강제로 다시 띄워 재확인시킨다 — 다 끝나기 전엔 나머지 입력을 가린다.
//   isSmelter면 "+ 광산 추가" 전용 버튼 노출 — 역할을 고르게 하지 않고 factoryRole='mining'으로 바로 고정.
function FactoryEditor({ rows, onChange, isSmelter = false, active = true }: {
  rows: FactoryDraft[]; onChange: (rows: FactoryDraft[]) => void; isSmelter?: boolean;
  // 상위(원산지 증명서 게이트)가 아직 안 풀렸으면 false — 이 안에서는 재확인 픽커를 자동으로 띄우지 않는다.
  active?: boolean;
}) {
  const update = (i: number, patch: Partial<FactoryDraft>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const applyPicked = (i: number, r: FactoryLocationResult) =>
    update(i, {
      latitude: String(r.latitude), longitude: String(r.longitude),
      ...(r.country ? { country: r.country } : {}),
      ...(r.region ? { region: r.region } : {}),
      ...(r.address ? { address: r.address } : {}),
    });

  // 이번 편집 세션에서 위치를 이미 확인(픽커로 확정)한 행 — 저장돼 있던 기존 행(factoryId 있음)만
  // 처음엔 미확인 상태로 시작하고, 신규 추가 행은 만들어질 때 이미 픽커를 거쳤으니 바로 확인 처리한다.
  const [verifiedRows, setVerifiedRows] = useState<Set<number>>(
    () => new Set(rows.map((r, i) => (r.factoryId ? -1 : i)).filter(i => i !== -1)),
  );
  const pendingIdx = rows.findIndex((_, i) => !verifiedRows.has(i));
  const needsVerification = active && pendingIdx !== -1;

  // 픽커 대상 — 기존 행 재확인(existing) / 신규 추가(new, role은 광산 추가일 때만 고정).
  type PickerTarget = { mode: 'existing'; idx: number } | { mode: 'new'; role?: string } | null;
  const [picker, setPicker] = useState<PickerTarget>(null);

  // 게이트가 풀리고 재확인 대상이 생기면(행이 바뀌어도) 자동으로 그 행의 픽커를 띄운다 — "가장 먼저" 확인.
  useEffect(() => {
    if (needsVerification && picker === null) setPicker({ mode: 'existing', idx: pendingIdx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsVerification, pendingIdx]);

  function handleConfirm(r: FactoryLocationResult) {
    if (!picker) return;
    if (picker.mode === 'existing') {
      applyPicked(picker.idx, r);
      setVerifiedRows(prev => new Set(prev).add(picker.idx));
    } else {
      const draft: FactoryDraft = {
        ...emptyFactoryDraft(),
        ...(picker.role ? { factoryRole: picker.role } : {}),
        latitude: String(r.latitude), longitude: String(r.longitude),
        country: r.country ?? '', region: r.region ?? '', address: r.address ?? '',
      };
      setVerifiedRows(prev => new Set(prev).add(rows.length)); // 새 행 인덱스 = 지금 길이
      onChange([...rows, draft]);
    }
    setPicker(null);
  }

  const pending = pendingIdx !== -1 ? rows[pendingIdx] : null;
  return (
    <div className="space-y-2">
      {needsVerification && pending && (
        <div className="flex items-center justify-between gap-3 rounded-sm border border-warn-border bg-warn-bg px-3 py-2 text-xs font-semibold text-warn-text">
          <span>기존에 입력된 공장 정보 위치 재확인이 필요합니다 — {pending.factoryName || `(공장명 미입력, ${pendingIdx + 1}번째 행)`}</span>
          <button type="button" onClick={() => setPicker({ mode: 'existing', idx: pendingIdx })}
            className="shrink-0 rounded-xs border border-warn-text bg-white px-2 py-1 text-xs font-bold text-warn-text hover:bg-warn-solid hover:text-white">
            위치 재확인
          </button>
        </div>
      )}
      <div className="relative">
        <div className={clsx(needsVerification && 'pointer-events-none select-none opacity-40 blur-[1px]')}>
          <div className="overflow-x-auto rounded-sm border border-ink-700">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['지역/주소 통합검색', '공장명', '국가', '지역', '주소', '역할', '납품처', '공급비율(%)', '위도', '경도', '담당자 이름', '직책', '연락처', '메일', ''].map((h, i) => (
                    <th key={`${h}-${i}`} className="whitespace-nowrap border-b border-ink-700 px-3 py-2.5 text-left text-xs font-semibold text-ink-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={clsx('border-b border-ink-700 last:border-b-0', r.factoryRole === 'mining' && 'bg-accent-50/40')}>
                    <td className="px-2 py-1.5">
                      <button type="button" onClick={() => setPicker({ mode: 'existing', idx: i })} title="지역/주소 통합검색 (공장명으로는 검색되지 않습니다)"
                        className="inline-flex shrink-0 items-center gap-1 rounded-xs border border-accent-100 bg-accent-50 px-2 py-1 text-xs font-semibold text-accent-700 hover:bg-accent-100">
                        <MapPin className="h-3.5 w-3.5" />통합검색
                      </button>
                    </td>
                    <td className="px-2 py-1.5"><input value={r.factoryName} onChange={e => update(i, { factoryName: e.target.value })} placeholder="공장명" className={editCellCls} /></td>
                    <td className="px-2 py-1.5"><input value={r.country} onChange={e => update(i, { country: e.target.value })} placeholder="국가" className={editCellCls} /></td>
                    <td className="px-2 py-1.5"><input value={r.region} onChange={e => update(i, { region: e.target.value })} placeholder="지역" className={editCellCls} /></td>
                    <td className="px-2 py-1.5"><input value={r.address} onChange={e => update(i, { address: e.target.value })} placeholder="주소" className={editCellCls} /></td>
                    <td className="px-2 py-1.5">
                      <select value={r.factoryRole} onChange={e => update(i, { factoryRole: e.target.value })} className={factoryRoleSelectCls}>
                        {FACTORY_ROLE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5"><input value={r.destination} onChange={e => update(i, { destination: e.target.value })} placeholder="납품처" className={editCellCls} /></td>
                    <td className="px-2 py-1.5"><input value={r.supplyRatioPercent} onChange={e => update(i, { supplyRatioPercent: e.target.value })} placeholder="%" inputMode="decimal" className={editCellCls} /></td>
                    <td className="px-2 py-1.5"><input value={r.latitude} onChange={e => update(i, { latitude: e.target.value })} placeholder="위도" inputMode="decimal" className={editCellCls} /></td>
                    <td className="px-2 py-1.5"><input value={r.longitude} onChange={e => update(i, { longitude: e.target.value })} placeholder="경도" inputMode="decimal" className={editCellCls} /></td>
                    <td className="px-2 py-1.5"><input value={r.factoryManagerName} onChange={e => update(i, { factoryManagerName: e.target.value })} placeholder="담당자" className={editCellCls} /></td>
                    <td className="px-2 py-1.5"><input value={r.factoryManagerRole} onChange={e => update(i, { factoryManagerRole: e.target.value })} placeholder="직책" className={editCellCls} /></td>
                    <td className="px-2 py-1.5"><input value={r.factoryManagerPhone} onChange={e => update(i, { factoryManagerPhone: e.target.value })} placeholder="연락처" className={editCellCls} /></td>
                    <td className="px-2 py-1.5"><input value={r.factoryManagerEmail} onChange={e => update(i, { factoryManagerEmail: e.target.value })} placeholder="메일" className={editCellCls} /></td>
                    <td className="px-2 py-1.5 text-center">
                      <button type="button" onClick={() => remove(i)} className="rounded-xs border border-ink-700 bg-white px-2 py-1 text-xs font-semibold text-ink-500 hover:border-alert-border hover:text-alert-text">삭제</button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={15} className="px-3 py-6 text-center text-sm text-ink-500">등록된 공장이 없습니다. &quot;공장정보 추가&quot;를 눌러 위치부터 확정하세요.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => setPicker({ mode: 'new' })} className="rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-100">공장정보 추가</button>
            {/* 제련소 전용 — 역할을 고르게 하지 않고 바로 factoryRole='mining'으로, 위치부터 확정해 행을 만든다. */}
            {isSmelter && (
              <button type="button" onClick={() => setPicker({ mode: 'new', role: 'mining' })} className="inline-flex items-center gap-1 rounded-xs border border-alert-border bg-alert-bg px-3 py-1.5 text-xs font-semibold text-alert-text hover:bg-alert-solid hover:text-white">
                <MapPin className="h-3.5 w-3.5" />+ 광산 추가
              </button>
            )}
          </div>
        </div>
        {needsVerification && (
          <div className="absolute inset-0 z-10 flex items-start justify-center pt-6">
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
              <Lock className="h-3.5 w-3.5" />위 안내의 기존 공장 위치를 재확인해야 나머지를 입력할 수 있습니다
            </div>
          </div>
        )}
      </div>
      {/* 공장명은 지오코딩으로 못 찾는 사내 명칭이라 검색창에 넣지 않는다 — 주소가 있으면 주소, 없으면 지역(도시명)까지만. */}
      {picker && (
        <FactoryLocationPicker
          open
          title={
            picker.mode === 'existing'
              ? (rows[picker.idx]?.factoryRole === 'mining' ? '광산 위치 재확인' : '공장 위치 재확인')
              : (picker.role === 'mining' ? '광산 위치 선택' : '공장 위치 선택')
          }
          onClose={() => setPicker(null)}
          onConfirm={handleConfirm}
          initialQuery={picker.mode === 'existing' ? (rows[picker.idx]?.address || rows[picker.idx]?.region || '') : ''}
          initialCountry={picker.mode === 'existing' ? rows[picker.idx]?.country : undefined}
          initialLat={picker.mode === 'existing' && rows[picker.idx]?.latitude ? Number(rows[picker.idx].latitude) : null}
          initialLon={picker.mode === 'existing' && rows[picker.idx]?.longitude ? Number(rows[picker.idx].longitude) : null}
        />
      )}
    </div>
  );
}

// 담당자(연락처) 편집 테이블 — 행 추가/삭제. is_primary 는 단일 선택(라디오 형태).
function ContactEditor({ rows, onChange }: { rows: ContactDraft[]; onChange: (rows: ContactDraft[]) => void }) {
  const update = (i: number, patch: Partial<ContactDraft>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const setPrimary = (i: number) => onChange(rows.map((r, idx) => ({ ...r, isPrimary: idx === i })));
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, emptyContactDraft()]);
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-sm border border-ink-700">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['이름', '직책', '부서', '이메일', '전화', '휴대폰', '대표', ''].map((h, i) => (
                <th key={`${h}-${i}`} className="whitespace-nowrap border-b border-ink-700 px-3 py-2.5 text-left text-xs font-semibold text-ink-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-ink-700 last:border-b-0">
                <td className="px-2 py-1.5"><input value={r.name} onChange={e => update(i, { name: e.target.value })} placeholder="이름" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.role} onChange={e => update(i, { role: e.target.value })} placeholder="직책" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.department} onChange={e => update(i, { department: e.target.value })} placeholder="부서" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.email} onChange={e => update(i, { email: e.target.value })} placeholder="이메일" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.phone} onChange={e => update(i, { phone: e.target.value })} placeholder="전화" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.mobile} onChange={e => update(i, { mobile: e.target.value })} placeholder="휴대폰" className={editCellCls} /></td>
                <td className="px-2 py-1.5 text-center"><input type="radio" name="contact-primary" checked={r.isPrimary} onChange={() => setPrimary(i)} className="h-3.5 w-3.5 accent-brand" aria-label="대표 담당자" /></td>
                <td className="px-2 py-1.5 text-center">
                  <button type="button" onClick={() => remove(i)} className="rounded-xs border border-ink-700 bg-white px-2 py-1 text-xs font-semibold text-ink-500 hover:border-alert-border hover:text-alert-text">삭제</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-ink-500">등록된 담당자가 없습니다. 행을 추가하세요.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} className="rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-100">행 추가</button>
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
  'materials.Li': { section: 'materials', label: 'Li 함량' },
  'materials.Co': { section: 'materials', label: 'Co 함량' },
  'materials.Ni': { section: 'materials', label: 'Ni 함량' },
  'materials.any': { section: 'materials', label: '핵심광물 함량(최소 1종)' },
  'materials.handled_any': { section: 'materials', label: '핵심광물 함량(취급 금속 최소 1종)' },
  'factories': { section: 'factories', label: '공장 정보' },
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
function isRequiredFieldLiveFilled(field: string, readField: (f: string) => string, factoriesCount: number): boolean {
  if (field === 'materials.any' || field === 'materials.handled_any') {
    return MINERAL_EDIT_KEYS.some(k => readField(`materials.${k}`) !== '');
  }
  if (field === 'factories') return factoriesCount > 0;
  const dot = field.indexOf('.');
  if (dot === -1) return readField(field) !== '';
  const dataField = `${field.slice(0, dot)}.${snakeToCamel(field.slice(dot + 1))}`;
  return readField(dataField) !== '';
}

// 소재 구성(core_minerals) 광물 키 → 표시 라벨. 편집 모드에선 이 키들을 입력칸으로 노출.
//   완성도는 '1종 이상'(materials.any) 게이트 — 특정 금속을 강제하면 단일 광물
//   회사(음극재 흑연, 광산 등)가 영구 미완성이 되므로 필수 지정하지 않는다(백엔드와 동일 규칙).
const MINERAL_LABELS: Record<string, string> = {
  Li: 'Li (리튬)', Co: 'Co (코발트)', Ni: 'Ni (니켈)', Mn: 'Mn (망간)',
  graphite_natural: '천연흑연', graphite_synthetic: '인조흑연',
};
const MINERAL_EDIT_KEYS = Object.keys(MINERAL_LABELS);

// 소재구성 입력칸 키 → AI 파싱 결과(parsed_fields) 키 후보. 배열인 이유: 인조흑연은
// 백엔드 버전에 따라 artificial_/synthetic_ 두 표기가 있어 둘 다 수용한다(앞쪽 우선).
const MINERAL_PARSE_KEYS: Record<string, string[]> = {
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
interface MineralParseState {
  value: number | null;
  confidence: number;
  status: 'parsed' | 'blank' | 'unreadable';
}

// 신뢰도 임계치 — 미만이면 값은 채우되 '검토 권장' 표시(ExtractionTable 신뢰도 톤 패턴).
const MINERAL_CONFIDENCE_THRESHOLD = 0.8;

// AiExtraction 1건에서 광물 입력칸 키(k)의 파싱 상태를 도출.
function mineralParseStateOf(extraction: AiExtraction | null, k: string): MineralParseState | null {
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

// hazardous_substances 등 비광물 키 제외한 함량 키 목록.
const mineralKeysOf = (cm: Record<string, unknown>): string[] =>
  Object.keys(cm).filter(k => k !== 'hazardous_substances' && cm[k] != null && cm[k] !== '');

// 편집 모드에서 저장 전 입력칸 값을 직접 읽기 위한 컨텍스트 — 없으면(보기 모드) real.detail 스냅샷 사용.
type LiveFieldCtx = { readField: (f: string) => string; factoriesCount: number };

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
    const missing = req.filter(f => !isRequiredFieldLiveFilled(f, live.readField, live.factoriesCount)).map(labelOfField);
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
  if (key === 'materials') {
    // 백엔드 폴백도 동일 규칙: 광물 1종 이상이면 완료(materials.any). 광산·유통은 판정 제외.
    const pt = d?.providerType ?? '';
    if (pt === 'miner' || pt === 'trader') return { completed: 0, total: 0, missing: [], status: '해당 없음' };
    const filled = live
      ? MINERAL_EDIT_KEYS.some(k => live.readField(`materials.${k}`) !== '')
      : mineralKeysOf((d?.coreMinerals ?? {}) as Record<string, unknown>).length > 0;
    return {
      completed: filled ? 1 : 0, total: 1,
      missing: filled ? [] : ['핵심광물 함량(최소 1종)'],
      status: filled ? '완료' : '미입력',
    };
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
  const count = live ? live.factoriesCount : real.factories.length;
  return count > 0
    ? { completed: count, total: count, status: '완료', missing: [] }
    : { completed: 0, total: 1, status: '미입력', missing: ['공장 정보'] };
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

// ── 소재구성 문서 업로드 + AI 파싱 패널 ─────────────────────────────────────
// 업로드 흐름(기존 3종 문서와 동일 파이프라인 재사용, 새 엔드포인트 없음):
//   ① uploadFile(POST /files) → s3Key
//   ② PATCH /suppliers/{id}/detail { material_composition_doc_url: s3Key }
//      → 커밋 후 SupplierDocumentUploaded(doc_kind='material_composition') 발행 → 파싱 큐
//   ③ '파싱하기' 클릭 → GET /data-requests/ai-extractions 폴링, docS3Key === s3Key 매칭
//      (목록이 created_at DESC라 첫 매칭 = 최신 → 같은 파일 재업로드 시 최신 결과 선택)
//   ④ 매칭된 추출결과(AiExtraction)를 부모로 올려 광물 입력칸에 반영
const MATERIAL_DOC_ACCEPT = '.pdf,.png,.jpg,.jpeg';
const PARSE_POLL_TRIES = 10;      // 최대 재시도(총 ~25초)
const PARSE_POLL_INTERVAL = 2500; // ms — 이벤트 기반 비동기 파싱이라 2-3초 대기 후 조회

function MaterialDocParsePanel({ supplierId, initialUrl, editable, onParsed, onOpenViewer }: {
  supplierId: string;
  initialUrl?: string | null;
  editable?: boolean;
  onParsed: (extraction: AiExtraction) => void;
  // AI 파싱 확인 팝업(AiParsingView 모달) 열기 — 업로드 완료 직후 + '결과 보기' 클릭 시.
  onOpenViewer: () => void;
}) {
  const [docValue, setDocValue] = useState(initialUrl ?? '');
  const [displayName, setDisplayName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // 언마운트 후 setState 방지 — 폴링(수십 초)이 편집 취소보다 오래 살 수 있다.
  const cancelledRef = useRef(false);
  useEffect(() => () => { cancelledRef.current = true; }, []);
  useEffect(() => { setDocValue(initialUrl ?? ''); }, [initialUrl]);

  const uploaded = Boolean(docValue);
  const shownName = displayName || (docValue ? docValue.split('/').pop() : '');

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const ext = f.name.toLowerCase().split('.').pop() ?? '';
    if (!['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
      setError('PDF 또는 이미지(png/jpg/jpeg) 파일만 업로드할 수 있어요.');
      return;
    }
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const meta = await uploadFile(f, `material-doc:${supplierId}`);
      // PATCH → 컬럼 갱신 + 커밋 후 문서 이벤트 발행(파싱 파이프라인 트리거).
      await updateSupplierDetail(supplierId, { material_composition_doc_url: meta.s3Key });
      if (cancelledRef.current) return;
      setDocValue(meta.s3Key);
      setDisplayName(f.name);
      setNotice('업로드 완료 — 파싱하기를 누르면 광물 함량을 자동으로 채워요.');
      // 업로드 직후 AI 파싱 확인 화면을 팝업으로 노출(/partner/ai-parsing 과 동일 화면).
      onOpenViewer();
    } catch (err) {
      if (!cancelledRef.current) setError(err instanceof ApiError ? err.message : '업로드에 실패했습니다.');
    } finally {
      if (!cancelledRef.current) setUploading(false);
    }
  }

  async function handleParse() {
    if (!docValue || parsing) return;
    setParsing(true);
    setError('');
    setNotice('');
    try {
      for (let attempt = 0; attempt < PARSE_POLL_TRIES; attempt++) {
        // 이벤트 기반 비동기 처리 — submission_documents 행 생성·파싱 완료까지 대기 후 조회.
        await new Promise(r => setTimeout(r, PARSE_POLL_INTERVAL));
        if (cancelledRef.current) return;
        const list = await getAiExtractions().catch(() => null);
        if (cancelledRef.current) return;
        // created_at DESC 정렬 — 첫 매칭이 곧 최신(같은 파일 두 번 업로드해도 최신 선택).
        const hit = (list ?? []).find(e => e.docS3Key === docValue);
        if (hit) {
          onParsed(hit);
          setNotice('파싱 완료 — 추출된 함량이 입력칸에 채워졌어요. 값을 확인한 뒤 저장해주세요.');
          return;
        }
      }
      setError('파싱이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      if (!cancelledRef.current) setParsing(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-sm border border-ink-700 bg-white px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink-100">소재구성 문서 (핵심광물 함량 자동 추출)</div>
        <div className={`mt-0.5 truncate text-xs ${error ? 'text-alert-text' : notice ? 'text-ok-text' : uploaded ? 'text-ink-400' : 'text-ink-500'}`}>
          {error
            ? error
            : uploading
              ? '업로드 중…'
              : parsing
                ? 'AI 파싱 중… (최대 30초 정도 걸릴 수 있어요)'
                : notice
                  ? notice
                  : uploaded
                    ? `업로드됨 · ${shownName}`
                    : '미업로드 · PDF/이미지(png/jpg/jpeg)를 올리면 Li/Co/Ni/Mn/흑연 함량을 자동으로 채워요.'}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {uploaded && !uploading && !parsing && (
          <span className="rounded-full border border-ok-border bg-ok-bg px-2 py-0.5 text-[11px] font-bold text-ok-text">업로드됨</span>
        )}
        {editable && (
          <>
            <label className={`rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 ${uploading || parsing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-accent-100'}`}>
              {uploaded ? '파일 변경' : '자료 업로드'}
              <input
                type="file"
                accept={MATERIAL_DOC_ACCEPT}
                className="hidden"
                disabled={uploading || parsing}
                onChange={handleSelect}
              />
            </label>
            <button
              type="button"
              onClick={handleParse}
              disabled={!uploaded || uploading || parsing}
              className="inline-flex items-center gap-1 rounded-xs bg-accent-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {parsing ? '파싱 중…' : '파싱하기'}
            </button>
            {/* 결과 보기는 항상 활성 — 업로드/파싱이 실패·지연돼도 파싱 확인 팝업은 열 수 있어야 한다. */}
            <button
              type="button"
              onClick={onOpenViewer}
              className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-700"
            >
              결과 보기
            </button>
          </>
        )}
      </div>
      {/* persistForm(master-form authoritative-overwrite) round-trip 캐리어 —
          없으면 자료 제출 시 material_composition_doc_url 이 NULL 로 덮인다. */}
      <input type="hidden" data-field="materials.materialCompositionDocUrl" value={docValue} readOnly />
    </div>
  );
}

// ── 원산지 증명서 업로드(공장정보 섹션 최상단) ──────────────────────────────
//   이 섹션이 열리면 먼저 "업로드" 또는 "업로드할 자료가 없습니다" 둘 중 하나를 선택해야
//   아래 공장 정보 입력이 열린다(onResolved로 부모에 알림, 부모가 나머지를 가림/해제).
//   업로드한 파일명이 사업자등록증·환경성적서로 보이면(파일명 간이 판정) onDetected로 알려
//   5번(필요 문서) 섹션에 자동 연결 — 같은 파일을 두 번 올릴 필요 없게.
function detectDocKind(fileName: string): 'businessReg' | 'environmental' | null {
  const n = fileName.toLowerCase();
  if (/사업자\s*등록증|business.?reg/i.test(n)) return 'businessReg';
  if (/환경\s*성적서|environmental/i.test(n)) return 'environmental';
  return null;
}
function OriginCertUploadPanel({ supplierId, onResolved, onDetected }: {
  supplierId: string;
  onResolved: () => void;
  onDetected: (kind: 'businessReg' | 'environmental', s3Key: string, fileName: string) => void;
}) {
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [noDocs, setNoDocs] = useState(false);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    setError('');
    try {
      const meta = await uploadFile(f, `origin-cert:${supplierId}`);
      const shownName = meta.fileName || f.name;
      setFileName(shownName);
      setNoDocs(false);
      onResolved();
      const kind = detectDocKind(f.name);
      if (kind) onDetected(kind, meta.s3Key, shownName);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  function handleNoDocs() {
    setNoDocs(true);
    onResolved();
  }

  return (
    <div className="space-y-2 rounded-sm border border-ink-700 bg-white px-4 py-3">
      <div className="text-sm font-semibold text-ink-100">업로드할 자료가 있으신 경우 먼저 업로드해주시기 바랍니다 (원산지 증명서 등)</div>
      <div className="flex items-center justify-between gap-3">
        <div className={`min-w-0 truncate text-xs ${error ? 'text-alert-text' : 'text-ink-500'}`}>
          {error || (uploading
            ? '업로드 중…'
            : fileName
              ? `첨부됨 · ${fileName} (검토 참고용)`
              : noDocs
                ? '업로드할 자료 없음으로 확인됐습니다.'
                : '업로드하거나 "업로드할 자료가 없습니다"를 눌러야 아래 공장정보 입력이 열립니다.')}
        </div>
        <div className="flex shrink-0 gap-2">
          <label className={`rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 ${uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-accent-100'}`}>
            {fileName ? '파일 변경' : '자료 업로드'}
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" disabled={uploading} onChange={handleSelect} />
          </label>
          <button
            type="button"
            onClick={handleNoDocs}
            disabled={uploading}
            className={clsx(
              'rounded-xs border px-3 py-1.5 text-xs font-semibold',
              noDocs ? 'border-ok-border bg-ok-bg text-ok-text' : 'border-ink-700 bg-white text-ink-500 hover:border-accent-500 hover:text-accent-700',
            )}
          >
            업로드할 자료가 없습니다
          </button>
        </div>
      </div>
    </div>
  );
}

// 협력사 입력 양식 5섹션 — 모두 실 백엔드(supplier detail/factories/contacts/risk-profile)로 렌더.
// editable=true면 값 셀이 입력칸(data-field=섹션.필드)으로. DD 보고서는 원청(isPrime)만 노출.
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
  // 소재구성 AI 파싱 결과 — '파싱하기' 성공 시 채워진다. 입력칸이 비제어(defaultValue)라
  // 재렌더만으론 값이 안 바뀌므로 parseVersion 으로 CompanyGrid 를 리마운트해 반영한다.
  const [mineralExtraction, setMineralExtraction] = useState<AiExtraction | null>(null);
  const [parseVersion, setParseVersion] = useState(0);
  // AI 파싱 확인 팝업(/partner/ai-parsing 과 동일 화면) — 업로드/파싱 완료·'결과 보기' 시 오픈.
  const [mineralParsingOpen, setMineralParsingOpen] = useState(false);
  // 공장정보 섹션 — 원산지 증명서 업로드/없음 확인 전엔 나머지 입력을 가린다.
  const [originCertResolved, setOriginCertResolved] = useState(false);
  let content: ReactNode;
  const d = real?.detail ?? null;
  // live면 지금 입력칸 값, 아니면 마지막 저장된 스냅샷 — 완료 배지 판정용(defaultValue 표시엔 영향 없음).
  const filled = (domField: string, snapshot: unknown): ReviewStatus => fieldFilled(readField ? readField(domField) : snapshot);

  if (section.key === 'company') {
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
  } else if (section.key === 'materials') {
    // 표준 광물 키(Li·Co·Ni·Mn·천연/인조 흑연)는 보기·편집 모두 항상 칸으로 노출하고,
    //   추가로 문서에 있는 미지 키(present)도 합친다. 편집 모드는 입력칸, 보기 모드는 값/‘해당 없음’.
    //   빈 칸은 '해당 없음'(중립) — 광물별 필수가 아니므로 미입력(경고)으로 표시하지 않는다.
    const cm = (d?.coreMinerals ?? {}) as Record<string, number>;
    const present = mineralKeysOf(cm);
    const keys = [...new Set([...MINERAL_EDIT_KEYS, ...present])];
    // AI 파싱 결과 병합(편집 모드 전용) —
    //   parsed     → 값 채움('완료'), 신뢰도 < 0.8 이면 '검토 권장' 플래그
    //   blank      → 기존 '해당 없음' 유지(문서에 항목 자체 없음)
    //   unreadable → '확인 필요'(항목은 있는데 못 읽음 — '해당 없음'과 의미가 다름)
    const flagged: Record<string, string> = {};
    const rows: string[][] = keys.length
      ? keys.map(k => {
          const label = `${MINERAL_LABELS[k] ?? k} 함량(%)`;
          const ps = editable ? mineralParseStateOf(mineralExtraction, k) : null;
          if (ps?.status === 'parsed' && ps.value != null) {
            if (ps.confidence < MINERAL_CONFIDENCE_THRESHOLD) {
              flagged[k] = `검토 권장 · 신뢰도 ${Math.round(ps.confidence * 100)}%`;
            }
            return [label, String(ps.value), '완료'];
          }
          if (ps?.status === 'unreadable') {
            return [label, cm[k] != null ? String(cm[k]) : '-', '확인 필요'];
          }
          const liveFilled = readField ? readField(`materials.${k}`) !== '' : cm[k] != null;
          return [label, cm[k] != null ? String(cm[k]) : '-', liveFilled ? '완료' : '해당 없음'];
        })
      : [['핵심광물 함량(최소 1종)', '-', '미입력']];
    content = (
      <div className="space-y-3">
        {/* 소재구성 문서 업로드 + 파싱 — 업로드는 기존 문서 파이프라인 재사용, 결과만 입력칸에 주입 */}
        <MaterialDocParsePanel
          supplierId={supplierId}
          initialUrl={d?.materialCompositionDocUrl}
          editable={editable}
          onParsed={ex => { setMineralExtraction(ex); setParseVersion(v => v + 1); setMineralParsingOpen(true); }}
          onOpenViewer={() => setMineralParsingOpen(true)}
        />
        <CompanyGrid key={`materials-${parseVersion}`} rows={rows} editable={editable} fieldKeys={keys} fieldPrefix="materials" flagged={flagged} />
        {/* AI 파싱 확인 팝업 — /partner/ai-parsing 페이지와 동일 화면(AiParsingView 공통 모듈)을
            모달 셸(AiParsingReviewModal 패턴)로 띄운다. 닫거나 전체 제출 완료 시 close. */}
        {mineralParsingOpen && (
          <div className="fixed inset-0 z-[60] flex bg-black/50 p-4" onClick={() => setMineralParsingOpen(false)}>
            <div
              className="m-auto flex h-[92vh] w-[96vw] max-w-[1440px] flex-col overflow-hidden rounded-md bg-white shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-white px-4 py-2.5">
                <div className="text-sm font-bold text-ink-100">AI 파싱 확인 및 수정 · 소재구성 문서</div>
                <button
                  type="button"
                  onClick={() => setMineralParsingOpen(false)}
                  className="rounded-sm p-1 text-ink-400 hover:bg-slate-100 hover:text-ink-100"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <AiParsingView supplierId={supplierId} onConfirmComplete={() => setMineralParsingOpen(false)} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
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
                <div className="mb-2 text-xs font-bold text-ink-500">공장 정보 (공급비율·위치(원산지)·역할)</div>
                <FactoryEditor rows={factoriesDraft} onChange={setFactoriesDraft} isSmelter={isSmelter} active={originCertResolved} />
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
              {contactsDraft && setContactsDraft && (
                <div>
                  <div className="mb-2 text-xs font-bold text-ink-500">협력사 담당자 (PIC · 연락처)</div>
                  <ContactEditor rows={contactsDraft} onChange={setContactsDraft} />
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
      // 공장 정보(원산지·이름·주소) + 공장 담당자(이름·직책·연락처·메일). 공장 단위 필드 직접 사용.
      const factoryRows = (real?.factories ?? []).filter(f => f.isActive !== false).map(f => [
        f.factoryName ?? '-',
        f.country ?? '-',                 // 원산지
        f.address ?? '-',
        f.supplyRatioPercent != null ? `${f.supplyRatioPercent}%` : '-',
        f.factoryManagerName ?? '-',
        f.factoryManagerRole ?? '-',
        f.factoryManagerPhone ?? '-',
        f.factoryManagerEmail ?? '-',
        fieldFilled(f.factoryName),
      ]);
      const contactRowsView = (real?.contacts ?? []).map(c => [
        c.name ?? '-',
        c.role ?? '-',
        c.email ?? '-',
        c.mobile ?? c.phone ?? '-',
        c.isPrimary ? '대표' : '-',
        fieldFilled(c.name),
      ]);
      content = (
        <div className="space-y-4">
          {factoryRows.length ? <DataTable headers={['공장명', '원산지', '주소', '공급비율', '공장 담당자', '직책', '연락처', '메일', '상태']} rows={factoryRows} /> : <EmptyData />}
          <div>
            <div className="mb-2 text-xs font-bold text-ink-500">협력사 담당자 (PIC · 연락처)</div>
            {contactRowsView.length ? <DataTable headers={['이름', '직책', '이메일', '연락처', '대표', '상태']} rows={contactRowsView} /> : <EmptyData />}
          </div>
        </div>
      );
    }
  } else if (section.key === 'regulation') {
    const m = (d?.manufacturerDetail ?? {}) as Record<string, unknown>;
    const ci = m.carbonIntensity;
    const es = m.energySource;
    const sr = real?.riskProfile?.selfReportedRiskLevel;
    const srRaw = sr && sr !== 'unknown' ? sr : '';
    const naMiner = (d?.providerType ?? '') === 'miner';  // 광산: 규제(탄소·자가진단) 판정 대상 아님 → 해당 없음
    const comp = real?.comp;
    const req = (key: string) => isFieldRequired(key, comp, true);
    const rows: string[][] = [
      [reqLabel('탄소집약도 (kgCO2eq/kg)', req('regulation.carbon_intensity')), ci != null ? String(ci) : '-', naMiner ? '해당 없음' : filled('regulation.carbonIntensity', ci)],
      [reqLabel('에너지원', req('regulation.energy_source')), (es as string) ?? '-', naMiner ? '해당 없음' : filled('regulation.energySource', es)],
      [reqLabel('실사 자가진단', req('regulation.self_reported_risk_level')), srRaw, naMiner ? '해당 없음' : filled('regulation.selfReportedRiskLevel', srRaw)],
      // DD 보고서는 원청 전용 — 협력사 폼에는 표시하지 않는다.
      ...(isPrime ? [['실사(DD) 보고서', '원청 작성 — 협력사 비표시', '해당 없음'] as string[]] : []),
    ];
    content = (
      <div className="space-y-3">
        <CompanyGrid rows={rows} editable={editable} fieldKeys={['carbonIntensity', 'energySource', 'selfReportedRiskLevel', ...(isPrime ? ['ddReport'] : [])]} fieldPrefix="regulation" selects={{ selfReportedRiskLevel: RISK_OPTS }} />
        {/* 실사 자가진단 보고서 — 실사관리 페이지 대체. 내 기업 정보에서 업로드·확인. */}
        <DocUploadField label="실사 자가진단 보고서" field="regulation.selfAssessmentDocUrl" initialUrl={d?.selfAssessmentDocUrl} editable={editable} supplierId={supplierId} />
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
  // 광산 안내 배너 — 광산은 입력 주체가 아니라 읽기 전용(편집/자료 제출 비활성).
  //   공장 정보는 광산 자체(광산=공장)의 supplier_factories 를 그대로 보여준다.
  const [managedBanner, setManagedBanner] = useState<{ mineName: string } | null>(null);
  const editable = isSupplier && editing && !managedBanner;
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
  // supplierId가 UUID면 실 백엔드(detail·contacts·completeness)에서 채우고, mock S-ID면 기존 mock 폴백.
  const isRealSupplier = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(supplierId);
  const [api, setApi] = useState<RealData | null>(null);
  // 최신 자료요청 — 원청 검토 상태(submissionStatus)·다음 제출 예정일(dueDate) 표시용.
  const [latestRequest, setLatestRequest] = useState<ApiDataRequest | null>(null);
  // 입력 모드 편집용 draft — 로드된 GET 데이터에서 시드(전체 현재 집합). master-form REPLACE-ALL 라운드트립.
  const [factoriesDraft, setFactoriesDraft] = useState<FactoryDraft[]>([]);
  const [contactsDraft, setContactsDraft] = useState<ContactDraft[]>([]);
  // "추가 광산 없음" 명시 선언(제련소 전용) — PicRegister 말단선언 패턴과 동일 취지.
  const [noMoreMines, setNoMoreMines] = useState(false);
  useEffect(() => {
    if (!isRealSupplier) { setApi(null); setLatestRequest(null); setManagedBanner(null); return; }
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
      // 가장 최신 요청(requestedAt 기준 내림차순 첫 번째)
      const sorted = (requestsRes ?? []).sort((a: ApiDataRequest, b: ApiDataRequest) =>
        (b.requestedAt ?? '').localeCompare(a.requestedAt ?? '')
      );
      setLatestRequest(sorted[0] ?? null);
    })();
    return () => { cancelled = true; };
  }, [isRealSupplier, supplierId]);

  // api 로드 시 draft 시드(전체 현재 집합). 편집 진입 시에도 최신 서버 값으로 재시드(아래 setEditing 핸들러).
  // 비활성(is_active=false, 소프트 삭제) 공장은 편집 대상에서 제외 — 원산지 이력 보존용이라 UI엔 안 뜬다.
  useEffect(() => {
    setFactoriesDraft((api?.factories ?? []).filter(f => f.isActive !== false).map(factoryToDraft));
    setContactsDraft((api?.contacts ?? []).map(contactToDraft));
  }, [api]);

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
  const liveCtx: LiveFieldCtx | undefined = editable ? { readField, factoriesCount: factoriesDraft.length } : undefined;
  const liveSections = (api ? sections.map(s => ({ ...s, ...deriveSectionMeta(s.key, api, liveCtx) })) : sections)
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
    // 편집 입력값 override.
    const companyName = orNull(read('company.companyName'));
    company.company_name = companyName ?? d?.companyName ?? '';                          // REQUIRED
    const pt = read('company.providerType');
    company.provider_type = (pt && pt !== '') ? pt : (d?.providerType ?? '');            // REQUIRED — 빈값이면 detail 폴백
    const country = read('company.country'); if (country !== undefined) company.country = country || null;
    const businessRegNo = read('company.businessRegNo'); if (businessRegNo !== undefined) company.business_reg_no = businessRegNo || null;
    const dunsNumber = read('company.dunsNumber'); if (dunsNumber !== undefined) company.duns_number = dunsNumber || null;
    const st = read('company.smelterType'); if (st !== undefined) company.smelter_type = st || null;
    // 소재 구성 → core_minerals. 편집칸에 노출된 광물 키 전부(흑연 포함) 동적 수집.
    const prevCm = (d?.coreMinerals ?? {}) as Record<string, unknown>;
    const mineralKeys = [...new Set([...MINERAL_EDIT_KEYS, ...mineralKeysOf(prevCm)])];
    const entries = mineralKeys.map(k => [k, read(`materials.${k}`)] as const);
    if (entries.some(([, v]) => v !== undefined)) {
      const cm: Record<string, unknown> = {};
      // 입력칸에 안 뜨는 비광물 키(hazardous_substances 등)는 그대로 보존.
      Object.entries(prevCm).forEach(([k, v]) => {
        if (!mineralKeys.includes(k) && v != null) cm[k] = v;
      });
      entries.forEach(([k, v]) => {
        const val = v !== undefined ? v : prevCm[k];   // 편집 안 한 키는 기존 값 유지
        if (val !== undefined && val !== null && val !== '') cm[k] = Number(val);
      });
      company.core_minerals = Object.keys(cm).length ? cm : null;
    } else if (d?.coreMinerals) {
      company.core_minerals = d.coreMinerals;   // round-trip
    }
    // 필요문서 업로드(S3 키) — company 컬럼으로 영속화.
    const braUrl = read('documents.businessRegDocUrl'); if (braUrl !== undefined) company.business_reg_doc_url = braUrl || null;
    const envUrl = read('documents.environmentalReportUrl'); if (envUrl !== undefined) company.environmental_report_url = envUrl || null;
    const saUrl = read('regulation.selfAssessmentDocUrl'); if (saUrl !== undefined) company.self_assessment_doc_url = saUrl || null;
    // 소재구성 문서(핵심광물 함량) — 패널 hidden input 우선, 없으면 detail round-trip.
    //   master-form company 는 authoritative-overwrite(생략=NULL)라 반드시 실어 보낸다.
    const mcUrl = read('materials.materialCompositionDocUrl');
    if (mcUrl !== undefined) company.material_composition_doc_url = mcUrl || null;
    else if (dRec.materialCompositionDocUrl) company.material_composition_doc_url = dRec.materialCompositionDocUrl;

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
    // 입력값 반영 — detail·contacts·factories·risk-profile 재조회(정확한 서버 값으로).
    const [fresh, contactsRes, factoriesRes, rp] = await Promise.all([
      getSupplierDetail(supplierId).catch(() => null),
      getSupplierContacts(supplierId).catch(() => null),
      getSupplierFactories(supplierId).catch(() => null),
      getSupplierRiskProfile(supplierId).catch(() => null),
    ]);
    setApi(prev => (prev ? {
      ...prev,
      ...(fresh ? { detail: fresh } : {}),
      ...(contactsRes ? { contacts: contactsRes.contacts ?? [] } : {}),
      ...(factoriesRes ? { factories: factoriesRes.factories ?? [] } : {}),
      ...(rp ? { riskProfile: rp } : {}),
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
                  setFactoriesDraft((api?.factories ?? []).filter(f => f.isActive !== false).map(factoryToDraft));
                  setContactsDraft((api?.contacts ?? []).map(contactToDraft));
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
        <div className="grid grid-cols-6 gap-2">
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
              real={api}
              editable={editable}
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
