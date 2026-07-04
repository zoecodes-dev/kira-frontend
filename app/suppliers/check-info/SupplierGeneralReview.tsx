'use client';

// 협력사 입력 데이터 수집 현황을 원청사가 검토하는 화면
import { useEffect, useRef, useState } from 'react';
import {
  createDataRequest, getDataRequests,
  getSupplierCompleteness, getSupplierContacts, getSupplierDetail, getSupplierFactories,
  getSupplierSuppliedItems, submitMasterForm,
  getSupplierRiskProfile, uploadFile, type SupplierRiskProfileResponse as ApiRiskProfile,
  type SupplierDetail as ApiSupplierDetail, type SupplierContact as ApiSupplierContact,
  type SupplierFactory as ApiSupplierFactory, type SupplierCompleteness as ApiCompleteness,
  type SuppliedItem as ApiItem, type ApiDataRequest,
  ApiError,
} from '@/lib/api';

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
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Save,
  Send,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';

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
    key: 'materials',
    order: 2,
    title: '소재 구성',
    completed: 0, total: 1, status: '미입력',
    icon: <Box className="h-5 w-5" />,
    comment: '핵심광물(Li/Co/Ni) 함량(%)을 입력하세요.', missing: [],
  },
  {
    key: 'factories',
    order: 3,
    title: '공장 정보',
    completed: 0, total: 1, status: '미입력',
    icon: <Building2 className="h-5 w-5" />,
    comment: '공급비율·위치(원산지)·공장 담당자.', missing: [],
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

function CompanyGrid({ rows = companyRows, editable = false, fieldKeys, fieldPrefix = 'company', selects }: { rows?: string[][]; editable?: boolean; fieldKeys?: string[]; fieldPrefix?: string; selects?: Record<string, { value: string; label: string }[]> }) {
  return (
    <div className="grid overflow-hidden rounded-sm border border-ink-700 md:grid-cols-2">
      {rows.map(([label, value, status], i) => {
        const key = fieldKeys?.[i];
        const opts = key ? selects?.[key] : undefined;
        const dataField = key ? `${fieldPrefix}.${key}` : undefined;
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
              <input
                defaultValue={value === '-' || value === '미입력' ? '' : value}
                placeholder={`${label} 입력`}
                data-field={dataField}
                className="w-full rounded-xs border border-ink-700 bg-white px-2.5 py-1.5 text-sm text-ink-100 outline-none placeholder:text-ink-500 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20"
              />
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

// 공장 정보 편집 테이블 — 행 추가/삭제. 좌표는 latitude/longitude 입력(있으면 coordinates로 매핑).
function FactoryEditor({ rows, onChange }: { rows: FactoryDraft[]; onChange: (rows: FactoryDraft[]) => void }) {
  const update = (i: number, patch: Partial<FactoryDraft>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, emptyFactoryDraft()]);
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-sm border border-ink-700">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['공장명', '국가', '지역', '주소', '역할', '납품처', '공급비율(%)', '위도', '경도', '담당자 이름', '직책', '연락처', '메일', ''].map((h, i) => (
                <th key={`${h}-${i}`} className="whitespace-nowrap border-b border-ink-700 px-3 py-2.5 text-left text-xs font-semibold text-ink-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-ink-700 last:border-b-0">
                <td className="px-2 py-1.5"><input value={r.factoryName} onChange={e => update(i, { factoryName: e.target.value })} placeholder="공장명" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.country} onChange={e => update(i, { country: e.target.value })} placeholder="국가" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.region} onChange={e => update(i, { region: e.target.value })} placeholder="지역" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.address} onChange={e => update(i, { address: e.target.value })} placeholder="주소" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.factoryRole} onChange={e => update(i, { factoryRole: e.target.value })} placeholder="역할" className={editCellCls} /></td>
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
              <tr><td colSpan={14} className="px-3 py-6 text-center text-sm text-ink-500">등록된 공장이 없습니다. 행을 추가하세요.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} className="rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-100">행 추가</button>
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

// 백엔드 완성도(provider_type별 필수셋)로 섹션 집계 도출 — requiredFields/missingFields가 SSOT.
//   해당 섹션 필수 필드가 0개면 '해당 없음'(예: 광산의 소재구성·규제, 유통사의 소재구성).
function deriveSectionMetaFromBackend(
  key: SectionKey,
  comp: ApiCompleteness,
): Pick<CollectionSection, 'completed' | 'total' | 'status' | 'missing'> {
  const req = (comp.requiredFields ?? []).filter(f => sectionOfField(f) === key);
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
): Pick<CollectionSection, 'completed' | 'total' | 'status' | 'missing'> {
  const comp = real.comp;
  if (comp && comp.requiredFieldCount != null && Array.isArray(comp.requiredFields)) {
    return deriveSectionMetaFromBackend(key, comp);
  }
  const has = (v: unknown) => v !== null && v !== undefined && v !== '';
  const d = real.detail;
  if (key === 'company') {
    const fields: [string, unknown][] = [
      ['회사명', d?.companyName],
      ['소재 국가', d?.country],
      ['사업자 등록번호', d?.businessRegNo],
      ['업종(provider type)', d?.providerType],
    ];
    const missing = fields.filter(([, v]) => !has(v)).map(([l]) => l);
    const completed = fields.length - missing.length;
    return { completed, total: fields.length, missing, status: sectionStatusFrom(completed, fields.length) };
  }
  if (key === 'materials') {
    const cm = d?.coreMinerals ?? {};
    const fields: [string, unknown][] = [['Li 함량', cm.Li], ['Co 함량', cm.Co], ['Ni 함량', cm.Ni]];
    const missing = fields.filter(([, v]) => !has(v)).map(([l]) => l);
    const completed = fields.length - missing.length;
    return { completed, total: fields.length, missing, status: sectionStatusFrom(completed, fields.length) };
  }
  if (key === 'regulation') {
    const m = (d?.manufacturerDetail ?? {}) as Record<string, unknown>;
    const fields: [string, unknown][] = [
      ['탄소집약도', m.carbonIntensity],
      ['에너지원', m.energySource],
      ['실사 자가진단', real.riskProfile?.selfReportedRiskLevel && real.riskProfile.selfReportedRiskLevel !== 'unknown' ? real.riskProfile.selfReportedRiskLevel : null],
    ];
    const missing = fields.filter(([, v]) => !has(v)).map(([l]) => l);
    const completed = fields.length - missing.length;
    return { completed, total: fields.length, missing, status: sectionStatusFrom(completed, fields.length) };
  }
  if (key === 'documents') {
    const fields: [string, unknown][] = [['사업자등록증', d?.businessRegDocUrl], ['환경성적서', d?.environmentalReportUrl]];
    const missing = fields.filter(([, v]) => !has(v)).map(([l]) => l);
    const completed = fields.length - missing.length;
    return { completed, total: fields.length, missing, status: sectionStatusFrom(completed, fields.length) };
  }
  // factories
  const count = real.factories.length;
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

// 협력사 입력 양식 5섹션 — 모두 실 백엔드(supplier detail/factories/contacts/risk-profile)로 렌더.
// editable=true면 값 셀이 입력칸(data-field=섹션.필드)으로. DD 보고서는 원청(isPrime)만 노출.
function SectionContent({ section, real, editable = false, isPrime = false, supplierId, factoriesDraft, setFactoriesDraft, contactsDraft, setContactsDraft }: {
  section: CollectionSection;
  real?: RealData | null;
  editable?: boolean;
  isPrime?: boolean;
  supplierId: string;
  factoriesDraft?: FactoryDraft[];
  setFactoriesDraft?: (rows: FactoryDraft[]) => void;
  contactsDraft?: ContactDraft[];
  setContactsDraft?: (rows: ContactDraft[]) => void;
}) {
  let content: ReactNode;
  const d = real?.detail ?? null;

  if (section.key === 'company') {
    // 입력 모드에선 smelter 구분 행을 항상 노출(업종 변경 가능하도록).
    const showSmelter = editable || (d?.providerType as string) === 'smelter';
    const rows: string[][] = [
      ['회사명', d?.companyName ?? '-', fieldFilled(d?.companyName)],
      ['소재 국가', d?.country ?? '-', fieldFilled(d?.country)],
      ['사업자 등록번호', d?.businessRegNo ?? '-', fieldFilled(d?.businessRegNo)],
      ['DUNS 번호 (선택)', d?.dunsNumber ?? '-', '완료'],
      ['업종(provider type)', d?.providerType ?? '', fieldFilled(d?.providerType)],
      ...(showSmelter ? [['smelter 구분', d?.smelterType ?? '', '완료'] as string[]] : []),
    ];
    const keys = ['companyName', 'country', 'businessRegNo', 'dunsNumber', 'providerType', ...(showSmelter ? ['smelterType'] : [])];
    content = <CompanyGrid rows={rows} editable={editable} fieldKeys={keys} fieldPrefix="company" selects={{ providerType: PROVIDER_OPTS, smelterType: SMELTER_OPTS }} />;
  } else if (section.key === 'materials') {
    const cm = (d?.coreMinerals ?? {}) as Record<string, number>;
    const rows: string[][] = [
      ['Li (리튬) 함량(%)', cm.Li != null ? String(cm.Li) : '-', fieldFilled(cm.Li)],
      ['Co (코발트) 함량(%)', cm.Co != null ? String(cm.Co) : '-', fieldFilled(cm.Co)],
      ['Ni (니켈) 함량(%)', cm.Ni != null ? String(cm.Ni) : '-', fieldFilled(cm.Ni)],
    ];
    content = <CompanyGrid rows={rows} editable={editable} fieldKeys={['Li', 'Co', 'Ni']} fieldPrefix="materials" />;
  } else if (section.key === 'factories') {
    // 입력 모드: 공장·담당자를 모두 편집(master-form REPLACE-ALL 라운드트립). 보기 모드: 읽기 전용 테이블.
    if (editable && factoriesDraft && setFactoriesDraft) {
      content = (
        <div className="space-y-5">
          <div>
            <div className="mb-2 text-xs font-bold text-ink-500">공장 정보 (공급비율·위치(원산지)·역할)</div>
            <FactoryEditor rows={factoriesDraft} onChange={setFactoriesDraft} />
          </div>
          {contactsDraft && setContactsDraft && (
            <div>
              <div className="mb-2 text-xs font-bold text-ink-500">협력사 담당자 (PIC · 연락처)</div>
              <ContactEditor rows={contactsDraft} onChange={setContactsDraft} />
            </div>
          )}
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
    const rows: string[][] = [
      ['탄소집약도 (kgCO2eq/kg)', ci != null ? String(ci) : '-', fieldFilled(ci)],
      ['에너지원', (es as string) ?? '-', fieldFilled(es)],
      ['실사 자가진단', srRaw, srRaw ? '완료' : '미입력'],
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
    content = (
      <div className="space-y-2">
        <DocUploadField label="사업자등록증" field="documents.businessRegDocUrl" initialUrl={d?.businessRegDocUrl} editable={editable} supplierId={supplierId} />
        <DocUploadField label="환경성적서" field="documents.environmentalReportUrl" initialUrl={d?.environmentalReportUrl} editable={editable} supplierId={supplierId} />
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
      />
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
  // 광산 안내 배너 — 광산은 입력 주체가 아니고, '공장 정보'만 상위 제련소(정보관리 주체)가
  //   입력한 데이터로 채운다. 광산 리뷰는 읽기 전용(편집/자료 제출 비활성).
  const [managedBanner, setManagedBanner] = useState<{ mineName: string } | null>(null);
  const editable = isSupplier && editing && !managedBanner;
  const formRef = useRef<HTMLElement>(null);
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
  useEffect(() => {
    if (!isRealSupplier) { setApi(null); setLatestRequest(null); setManagedBanner(null); return; }
    let cancelled = false;
    (async () => {
      // 광산이어도 자기 id로 조회한다 — 백엔드가 광산의 공장 정보를 '정보관리 주체'인 상위
      //   제련소의 supplier_factories 로 알아서 리다이렉트해 돌려준다(공장=곧 광산, 광산은 보기만).
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
      // 광산은 입력 주체가 아니라 읽기 전용 + 공장 정보는 상위 제련소 입력값을 안내.
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
  const liveSections = api ? sections.map(s => ({ ...s, ...deriveSectionMeta(s.key, api) })) : sections;
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
    // 소재 구성 → core_minerals.
    const li = read('materials.Li'), co = read('materials.Co'), ni = read('materials.Ni');
    if (li !== undefined || co !== undefined || ni !== undefined) {
      const cm: Record<string, number> = {};
      if (li) cm.Li = Number(li);
      if (co) cm.Co = Number(co);
      if (ni) cm.Ni = Number(ni);
      company.core_minerals = Object.keys(cm).length ? cm : null;
    } else if (d?.coreMinerals) {
      company.core_minerals = d.coreMinerals;   // round-trip
    }
    // 필요문서 업로드(S3 키) — company 컬럼으로 영속화.
    const braUrl = read('documents.businessRegDocUrl'); if (braUrl !== undefined) company.business_reg_doc_url = braUrl || null;
    const envUrl = read('documents.environmentalReportUrl'); if (envUrl !== undefined) company.environmental_report_url = envUrl || null;
    const saUrl = read('regulation.selfAssessmentDocUrl'); if (saUrl !== undefined) company.self_assessment_doc_url = saUrl || null;

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
    <main ref={formRef} className={embedded ? '' : 'min-h-screen bg-slate-50 px-7 py-5'}>
      {managedBanner && (
        <div className="mb-4 flex items-start gap-2 rounded-sm border border-info-border bg-info-bg px-4 py-3 text-sm text-info-text">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>{managedBanner.mineName}</b>은 데이터 입력 주체가 아닙니다. 공장 정보는 정보관리 주체인 상위 제련소가 입력한 데이터입니다(읽기 전용).
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
            <button
              type="button"
              onClick={() => {
                setSaved(false);
                setFactoriesDraft((api?.factories ?? []).filter(f => f.isActive !== false).map(factoryToDraft));
                setContactsDraft((api?.contacts ?? []).map(contactToDraft));
                setEditing(true);
              }}
              className="inline-flex h-9 items-center gap-2 rounded-sm bg-accent-700 px-3 text-sm font-semibold text-white shadow-control transition-colors hover:bg-accent-900 active:opacity-75"
            >
              <Pencil className="h-4 w-4" />
              자료 제출 · 정보 입력
            </button>
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
        </div>
      </section>

      <section className="mt-4 rounded-sm border border-ink-700 bg-white shadow-control">
        {liveSections.map(section => (
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
          />
        ))}
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
