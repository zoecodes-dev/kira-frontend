'use client';

// 협력사 입력 데이터 수집 현황을 원청사가 검토하는 화면
import { Suspense, useEffect, useState } from 'react';
import {
  createDataRequest,
  getSupplierCompleteness, getSupplierContacts, getSupplierDetail, getSupplierFactories,
  getSupplierEsg, getSupplierOriginCertificates, getSupplierSuppliedItems,
  type SupplierDetail as ApiSupplierDetail, type SupplierContact as ApiSupplierContact,
  type SupplierFactory as ApiSupplierFactory, type SupplierCompleteness as ApiCompleteness,
  type EsgCertification as ApiCert, type OriginCert as ApiOriginCert, type SuppliedItem as ApiItem,
} from '@/lib/api';

const providerTypeLabel: Record<string, string> = {
  manufacturer: '제조사', recycler: '재활용', trader: '트레이더', miner: '광산',
};

interface RealData {
  detail: ApiSupplierDetail | null;
  contacts: ApiSupplierContact[];
  factories: ApiSupplierFactory[];
  comp: ApiCompleteness | null;
  certs: ApiCert[];
  originCerts: ApiOriginCert[];
  items: ApiItem[];
}
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Phone,
  Send,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';

type ReviewStatus = '완료' | '입력 중' | '확인 필요' | '미입력' | '해당 없음';
type SectionKey = 'company' | 'contacts' | 'factories' | 'certificates' | 'items' | 'origin';

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
  dataSource: '협력사 포털 직접 입력',
  nextDueDate: '2025-05-28',
};

const sections: CollectionSection[] = [
  {
    key: 'company',
    order: 1,
    title: '기업 기본정보',
    completed: 3,
    total: 7,
    status: '확인 필요',
    icon: <FileText className="h-5 w-5" />,
    comment: '대표자 정보의 공식 문서 첨부가 필요합니다. (2025-05-14)',
    missing: ['대표자 공식 증빙', '직원 수 확인', '설립연도 증빙', '웹사이트 소유 확인'],
  },
  {
    key: 'contacts',
    order: 2,
    title: '담당자 연락처',
    completed: 0,
    total: 4,
    status: '미입력',
    icon: <UserRound className="h-5 w-5" />,
    comment: '품질·물류·비상 연락 담당자가 아직 입력되지 않았습니다.',
    missing: ['품질 담당자', '물류 담당자', '비상 연락처', '대체 승인자'],
  },
  {
    key: 'factories',
    order: 3,
    title: '공장·사업장',
    completed: 0,
    total: 5,
    status: '미입력',
    icon: <Building2 className="h-5 w-5" />,
    comment: '공장 주소와 생산능력, 납품지역을 표 기준으로 보완 요청해야 합니다.',
    missing: ['생산능력', '납품지역', '공장 담당자', '가동 상태', '주소 증빙'],
  },
  {
    key: 'certificates',
    order: 4,
    title: '인증서',
    completed: 2,
    total: 8,
    status: '확인 필요',
    icon: <FileText className="h-5 w-5" />,
    comment: 'IATF 16949와 ISO 14001 갱신본 첨부가 필요합니다.',
    missing: ['IATF 16949', 'ISO 14001 갱신본', 'RMI 인증', '첨부파일 2건', '발급기관 확인', '만료일 확인'],
  },
  {
    key: 'items',
    order: 5,
    title: '공급 품목',
    completed: 1,
    total: 5,
    status: '입력 중',
    icon: <Box className="h-5 w-5" />,
    comment: 'Pack 공급 품목과 납품 모델 매핑을 확인해야 합니다.',
    missing: ['품목별 HS 코드', '납품 모델', '월 공급량', 'BOM 연결'],
  },
  {
    key: 'origin',
    order: 6,
    title: '원산지/규제 정보',
    completed: 1,
    total: 3,
    status: '확인 필요',
    icon: <Globe className="h-5 w-5" />,
    comment: 'EU/US 목적지별 원산지 증빙과 FEOC 자기선언을 확인해야 합니다.',
    missing: ['원산지 증명서', 'FEOC 자기선언'],
  },
];

const companyRows = [
  ['영문 정식명칭', 'Hanyang Mfg', '완료'],
  ['설립연도', '2010', '입력 중'],
  ['한글 명칭', '한양 제조(주)', '완료'],
  ['직원 수', '250명', '미입력'],
  ['사업자 등록번호', '123-45-67890', '완료'],
  ['웹사이트', 'www.hanyangmfg.com', '입력 중'],
  ['DUNS 번호', '98-765-4321', '완료'],
  ['대표자', 'Kim CEO', '완료'],
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

const certificateRows = [
  ['ISO 9001:2015', 'TUV Rheinland', '2024-03-01', '2027-02-28', '완료', '첨부됨'],
  ['ISO 14001:2015', 'TUV Rheinland', '2024-03-01', '2027-02-28', '확인 필요', '갱신본 요청'],
  ['IATF 16949:2016', 'Bureau Veritas', '2023-07-15', '2026-07-14', '입력 중', '미첨부'],
  ['RMI 인증', '-', '-', '-', '미입력', '미첨부'],
];

const supplyItemRows = [
  ['BAT-NCM811-100Ah', 'Premium NCM811 100Ah', 'Pack', 'EU', '완료'],
  ['BAT-LFP-120Ah', 'LFP Power 120Ah', 'Pack', 'EU', '입력 중'],
  ['BAT-NCM622-90Ah', 'NCM622 90Ah', 'Pack', 'US', '미입력'],
];

const originRows = [
  ['EU Battery', 'EU', '원산지 증명서', '확인 필요'],
  ['IRA/FEOC', 'US', 'FEOC 자기선언', '미입력'],
  ['CSDDD', 'EU', '공급망 실사 응답', '입력 중'],
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
      className="rounded-sm border border-ink-700 bg-white p-4 text-left shadow-control transition hover:border-accent-200 hover:bg-accent-50/30"
    >
      <div className="flex items-start gap-3">
        <div className={clsx('mt-0.5', iconTone(section.status))}>{section.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink-100">{section.title}</div>
          <div className="mt-1 text-sm text-ink-500">{section.completed} / {section.total}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <ProgressBar value={rate} status={section.status} />
        <div className="w-9 text-right text-sm font-semibold text-ink-100">{rate}%</div>
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

function CompanyGrid({ rows = companyRows }: { rows?: string[][] }) {
  return (
    <div className="grid overflow-hidden rounded-sm border border-ink-700 md:grid-cols-2">
      {rows.map(([label, value, status]) => (
        <div key={label} className="grid grid-cols-[150px_minmax(0,1fr)_96px] items-center border-b border-r border-ink-700 px-4 py-3 last:border-b-0 even:border-r-0">
          <div className="text-sm font-medium text-ink-500">{label}</div>
          <div className="truncate text-sm font-semibold text-ink-100">{value}</div>
          <div className="flex justify-end">
            <FieldStatus status={status as ReviewStatus} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
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
                  {cellIndex === row.length - 1 ? <StatusBadge status={cell as ReviewStatus} /> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const fieldFilled = (v: unknown): ReviewStatus => (v !== null && v !== undefined && v !== '' ? '완료' : '미입력');
const certStatus = (expiresAt: string | null): ReviewStatus =>
  (expiresAt && new Date(expiresAt).getTime() < Date.now() ? '확인 필요' : '완료');
const originStatus = (s: string | null): ReviewStatus =>
  ({ valid: '완료', expiring_soon: '확인 필요', expired: '미입력', under_review: '입력 중' } as Record<string, ReviewStatus>)[s ?? ''] ?? '완료';

function EmptyData() {
  return <div className="rounded-sm border border-dashed border-ink-700 bg-slate-50 px-4 py-8 text-center text-sm text-ink-500">등록된 데이터가 없습니다.</div>;
}

function SectionContent({ section, real }: { section: CollectionSection; real?: RealData | null }) {
  let content: ReactNode;
  // 실데이터(UUID)면 company/contacts/factories는 백엔드 값으로. 나머지(인증서/품목/원산지)는 mock 유지.
  if (real && section.key === 'company' && real.detail) {
    const d = real.detail;
    const rows: string[][] = [
      ['영문 정식명칭', d.companyNameEn ?? '-', fieldFilled(d.companyNameEn)],
      ['한글 명칭', d.companyNameKo ?? '-', fieldFilled(d.companyNameKo)],
      ['대표자', d.ceoName ?? '-', fieldFilled(d.ceoName)],
      ['사업자 등록번호', d.businessRegNo ?? '-', fieldFilled(d.businessRegNo)],
      ['DUNS 번호', d.dunsNumber ?? '-', fieldFilled(d.dunsNumber)],
      ['웹사이트', d.website ?? '-', fieldFilled(d.website)],
      ['설립연도', d.establishedYear != null ? String(d.establishedYear) : '-', fieldFilled(d.establishedYear)],
      ['직원 수', d.employeeCount != null ? `${d.employeeCount}명` : '-', fieldFilled(d.employeeCount)],
    ];
    content = <CompanyGrid rows={rows} />;
  } else if (real && section.key === 'contacts') {
    const rows = real.contacts.map(c => [c.role ?? '-', c.name ?? '-', c.email ?? '-', (c.mobile ?? c.phone) ?? '-', fieldFilled(c.email)]);
    content = rows.length ? <DataTable headers={['구분', '담당자', '이메일', '연락처', '상태']} rows={rows} /> : <EmptyData />;
  } else if (real && section.key === 'factories') {
    const rows = real.factories.map(f => [f.factoryName ?? '-', f.country ?? '-', f.address ?? '-', f.monthlyCapacity ?? '미입력', f.destination ?? '-', fieldFilled(f.factoryName)]);
    content = rows.length ? <DataTable headers={['공장명', '국가', '주소', '생산능력', '납품지역', '상태']} rows={rows} /> : <EmptyData />;
  } else if (real && section.key === 'certificates') {
    const rows = real.certs.map(c => [c.certificationType ?? '-', c.issuingBody ?? '-', c.issuedAt?.slice(0, 10) ?? '-', c.expiresAt?.slice(0, 10) ?? '-', c.documentUrl ? '첨부됨' : '미첨부', certStatus(c.expiresAt)]);
    content = rows.length ? <DataTable headers={['인증서명', '발급기관', '발급일', '만료일', '첨부', '상태']} rows={rows} /> : <EmptyData />;
  } else if (real && section.key === 'items') {
    const rows = real.items.map(i => [i.partCode ?? '-', i.partName ?? '-', i.tierLevel != null ? `T${i.tierLevel}` : '-', i.materialType ?? '-', '완료']);
    content = rows.length ? <DataTable headers={['부품 코드', '부품명', 'Tier', '자재 유형', '상태']} rows={rows} /> : <EmptyData />;
  } else if (real && section.key === 'origin') {
    const rows = real.originCerts.map(o => [o.certType ?? '-', o.originCountry ?? '-', o.issuingAuthority ?? '-', o.expiresAt?.slice(0, 10) ?? '-', originStatus(o.status)]);
    content = rows.length ? <DataTable headers={['증빙 유형', '원산지', '발급기관', '만료일', '상태']} rows={rows} /> : <EmptyData />;
  } else {
    content = {
      company: <CompanyGrid />,
      contacts: <DataTable headers={['구분', '담당자', '이메일', '연락처', '상태']} rows={contactRows} />,
      factories: <DataTable headers={['공장명', '국가', '주소', '생산능력', '납품지역', '상태']} rows={factoryRows} />,
      certificates: <DataTable headers={['인증서명', '발급기관', '발급일', '만료일', '상태', '첨부파일']} rows={certificateRows} />,
      items: <DataTable headers={['제품 코드', '제품명', '역할', '목적지', '상태']} rows={supplyItemRows} />,
      origin: <DataTable headers={['규제', '대상 지역', '필요 증빙', '상태']} rows={originRows} />,
    }[section.key];
  }

  return (
    <div className="space-y-[14px] border-t border-ink-700 bg-white p-4">
      {content}
    </div>
  );
}

function AccordionSection({
  section,
  isOpen,
  onToggle,
  onRequestSection,
  real,
}: {
  section: CollectionSection;
  isOpen: boolean;
  onToggle: () => void;
  onRequestSection: (section: CollectionSection) => void;
  real?: RealData | null;
}) {
  // 미입력/확인 필요 섹션은 그 자리에서 바로 보완 요청할 수 있게 인라인 버튼 노출.
  const needsRequest = (section.status === '미입력' || section.status === '확인 필요') && section.missing.length > 0;
  return (
    <section id={`section-${section.key}`} className="scroll-mt-24 overflow-hidden border-b border-ink-700 bg-white first:rounded-t-sm first:border-t last:rounded-b-sm">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-4 hover:bg-slate-50">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className={clsx('flex h-5 w-5 items-center justify-center', iconTone(section.status))}>{section.icon}</span>
          <span className="truncate text-base font-semibold text-ink-100">
            {section.order}. {section.title}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-medium text-ink-500">{section.completed} / {section.total} 완료</span>
          <span className="h-4 w-px bg-ink-700" />
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
          <button type="button" onClick={onToggle} aria-label="섹션 펼치기/접기">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-ink-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-ink-400" />
            )}
          </button>
        </div>
      </div>
      {isOpen && <SectionContent section={section} real={real} />}
    </section>
  );
}

function SupplierGeneralReviewContent() {
  const searchParams = useSearchParams();
  const supplierId = searchParams.get('supplierId') ?? '';
  const supplierName = searchParams.get('supplier') ?? supplierSummary.name;
  // supplierId가 UUID면 실 백엔드(detail·contacts·completeness)에서 채우고, mock S-ID면 기존 mock 폴백.
  const isRealSupplier = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(supplierId);
  const [api, setApi] = useState<RealData | null>(null);
  useEffect(() => {
    if (!isRealSupplier) { setApi(null); return; }
    let cancelled = false;
    (async () => {
      const [detail, contactsRes, factoriesRes, comp, esgRes, originRes, itemsRes] = await Promise.all([
        getSupplierDetail(supplierId).catch(() => null),
        getSupplierContacts(supplierId).catch(() => null),
        getSupplierFactories(supplierId).catch(() => null),
        getSupplierCompleteness(supplierId).catch(() => null),
        getSupplierEsg(supplierId).catch(() => null),
        getSupplierOriginCertificates(supplierId).catch(() => null),
        getSupplierSuppliedItems(supplierId).catch(() => null),
      ]);
      if (cancelled) return;
      setApi({
        detail,
        contacts: contactsRes?.contacts ?? [],
        factories: factoriesRes?.factories ?? [],
        comp,
        certs: esgRes?.certifications ?? [],
        originCerts: originRes?.originCertificates ?? [],
        items: itemsRes?.items ?? [],
      });
    })();
    return () => { cancelled = true; };
  }, [isRealSupplier, supplierId]);

  const apiPrimary = api?.contacts.find(c => c.isPrimary) ?? api?.contacts[0];
  const selectedSupplier = suppliers.find(supplier => supplier.id === supplierId);
  const selectedName = getSupplierName(supplierId);
  const selectedCompleteness = supplierCompleteness.find(item => item.supplierId === supplierId);
  // mock 대표 연락처
  const mockContacts = getContacts(supplierId);
  const mockPrimary = mockContacts.find(c => c.isPrimary) ?? mockContacts[0];

  const displayName = api?.detail?.companyName ?? selectedName?.nameKo ?? supplierName;
  const displayRole = (api?.detail && providerTypeLabel[api.detail.providerType]) ?? selectedSupplier?.role ?? supplierSummary.role;
  const displayCountry = selectedSupplier?.country ?? supplierSummary.country;
  const displayTier = selectedSupplier ? `T${selectedSupplier.tier}` : supplierSummary.tier;
  const displayRate = api?.comp?.completionRate ?? selectedCompleteness?.completionRate ?? supplierSummary.collectionRate;
  const displayCompleted = api?.comp?.filledFieldCount ?? selectedCompleteness?.filledFieldCount ?? supplierSummary.completed;
  const displayTotal = api?.comp?.requiredFieldCount ?? selectedCompleteness?.requiredFieldCount ?? supplierSummary.total;
  const displayLastUpdated = (api?.comp?.lastUpdatedAt ?? selectedCompleteness?.lastUpdatedAt ?? supplierSummary.lastSubmittedAt)?.slice(0, 16).replace('T', ' ');
  const displayManager = apiPrimary?.name ?? mockPrimary?.name ?? supplierSummary.manager;
  const displayEmail = apiPrimary?.email ?? mockPrimary?.email ?? supplierSummary.email;
  const displayPhone = apiPrimary?.mobile ?? apiPrimary?.phone ?? mockPrimary?.mobile ?? mockPrimary?.phone ?? supplierSummary.phone;
  const [openSections, setOpenSections] = useState<SectionKey[]>(['company']);
  // 입력 현황에서 '자료 요청'으로 넘어오면(request=1) 요청 모달을 바로 연다 — 자연스러운 흐름 연결.
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(searchParams.get('request') === '1');
  const [requestSent, setRequestSent] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => {
    const preChecked = new Set<string>();
    sections.forEach(section => {
      if (section.status === '미입력' || section.status === '확인 필요') {
        section.missing.forEach(item => preChecked.add(`${section.key}:${item}`));
      }
    });
    return preChecked;
  });

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

  const urgentCount = sections.reduce((sum, section) =>
    section.status === '미입력' || section.status === '확인 필요' ? sum + section.missing.length : sum, 0);

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

  function toggleSection(sectionKey: SectionKey) {
    setOpenSections(current =>
      current.includes(sectionKey)
        ? current.filter(key => key !== sectionKey)
        : [...current, sectionKey]
    );
  }

  function setAllSections(open: boolean) {
    setOpenSections(open ? sections.map(section => section.key) : []);
  }

  if (!supplierId) {
    return <SupplierInputStatusBoard />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-7 py-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <button type="button" className="inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-accent-700">
          <ArrowLeft className="h-4 w-4" />
          협력사 목록으로 돌아가기
        </button>
        <div className="flex items-center gap-2">
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
          <ToolbarButton icon={<BarChart3 className="h-4 w-4" />} label="데이터 비교" />
          <ToolbarButton icon={<Download className="h-4 w-4" />} label="내보내기" />
          <ToolbarButton icon={<MoreHorizontal className="h-4 w-4" />} />
        </div>
      </div>

      <section className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="grid items-center gap-6 px-5 py-5 xl:grid-cols-[minmax(0,1.4fr)_280px_240px_210px]">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ok-solid text-xl font-bold text-white">H</div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-ink-100">{displayName}</h1>
                <span className="rounded-full border border-ok-border bg-ok-bg px-2 py-0.5 text-xs font-semibold text-ok-text">
                  {displayTier}
                </span>
              </div>
              <div className="mt-2 text-sm font-medium text-ink-500">{displayRole} <span className="mx-2 text-ink-700">|</span> {displayCountry}</div>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-500">
                <span className="font-semibold text-ink-100">담당자</span>
                <span>{displayManager}</span>
                <span className="h-3 w-px bg-ink-700" />
                <span>{displayEmail}</span>
                <span className="h-3 w-px bg-ink-700" />
                <span>{displayPhone}</span>
              </div>
            </div>
          </div>

          <div className="border-l border-ink-700 pl-6">
            <div className="text-sm font-medium text-ink-500">전체 수집률</div>
            <div className="mt-2 flex items-center gap-5">
              <span className="text-3xl font-semibold text-ok-text">{displayRate}%</span>
              <div className="min-w-28 flex-1">
                <ProgressBar value={displayRate} status="완료" />
              </div>
            </div>
            <div className="mt-2 text-sm text-ink-500">{displayCompleted} / {displayTotal} 항목 수집 완료</div>
          </div>

          <div className="border-l border-ink-700 pl-6">
            <div className="text-sm font-medium text-ink-500">최근 제출일</div>
            <div className="mt-3 flex items-center gap-3 text-sm font-semibold text-ink-100">
              {displayLastUpdated}
              <StatusBadge status="완료" />
            </div>
          </div>

          <div className="border-l border-ink-700 pl-6">
            <div className="text-sm font-medium text-ink-500">원청 검토 상태</div>
            <div className="mt-3">
              <StatusBadge status={supplierSummary.reviewStatus} />
            </div>
            <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-info-text hover:text-info-text">
              상태 이력
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-sm border border-ink-700 bg-white p-4 shadow-control">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink-100">수집 항목 요약</h2>
          <button
            type="button"
            onClick={() => setAllSections(openSections.length !== sections.length)}
            className="inline-flex items-center gap-2 rounded-sm border border-ink-700 bg-white px-3 py-2 text-sm font-medium text-ink-500 hover:text-accent-700"
          >
            {openSections.length === sections.length ? '항목 전체 접기' : '항목 전체 펼치기'}
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-3 2xl:grid-cols-6">
          {sections.map(section => <SummaryCard key={section.key} section={section} />)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <LegendItem status="완료" icon={<CheckCircle2 className="h-4 w-4" />} />
          <LegendItem status="입력 중" icon={<HelpCircle className="h-4 w-4" />} />
          <LegendItem status="확인 필요" icon={<HelpCircle className="h-4 w-4" />} />
          <LegendItem status="미입력" icon={<XCircle className="h-4 w-4" />} />
          <LegendItem status="해당 없음" icon={<span className="block h-3 w-3 rounded-full bg-slate-300" />} />
        </div>
      </section>

      <section className="mt-4 rounded-sm border border-ink-700 bg-white shadow-control">
        {sections.map(section => (
          <AccordionSection
            key={section.key}
            section={section}
            isOpen={openSections.includes(section.key)}
            onToggle={() => toggleSection(section.key)}
            onRequestSection={openRequestForSection}
            real={api}
          />
        ))}
      </section>

      <section className="mt-4 grid rounded-sm border border-ink-700 bg-white shadow-control md:grid-cols-3">
        <MetaItem label="데이터 출처" value={supplierSummary.dataSource} />
        <MetaItem label="마지막 업데이트" value={displayLastUpdated} />
        <MetaItem label="다음 제출 예정일" value={supplierSummary.nextDueDate} />
      </section>

      {isRequestModalOpen && (
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
              {sections
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

export default function SupplierGeneralReviewPage() {
  return (
    <Suspense>
      <SupplierGeneralReviewContent />
    </Suspense>
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
