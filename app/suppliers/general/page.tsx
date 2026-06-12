'use client';

// 협력사 입력 데이터 수집 현황을 원청사가 검토하는 화면
import { useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileText,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react';
import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';

type ReviewStatus = '완료' | '입력 중' | '확인 필요' | '미입력';
type SectionKey = 'company' | 'contacts' | 'factories' | 'certificates' | 'items' | 'origin';

interface CollectionSection {
  key: SectionKey;
  title: string;
  completed: number;
  total: number;
  status: ReviewStatus;
  comment: string;
  missing: string[];
}

const supplierSummary = {
  name: '한양 제조(주)',
  tier: 'Tier1',
  role: 'Pack 제조',
  country: 'KR',
  manager: '김지민 ESG 담당자',
  email: 'jimin.kim@hanyang-cell.co.kr',
  phone: '+82-10-3456-7890',
  collectionRate: 27,
  completed: 3,
  total: 11,
  lastSubmittedAt: '2026-06-10',
  reviewStatus: '확인 필요' as ReviewStatus,
};

const sections: CollectionSection[] = [
  {
    key: 'company',
    title: '기업 기본정보',
    completed: 3,
    total: 7,
    status: '확인 필요',
    comment: '대표자 정보 공식 증빙과 DUNS 번호 확인이 필요합니다.',
    missing: ['대표자 증빙', 'DUNS 번호', '사업자등록증 원본', '최종 갱신일'],
  },
  {
    key: 'contacts',
    title: '담당자 연락처',
    completed: 0,
    total: 4,
    status: '미입력',
    comment: 'ESG 담당자 외 품질·물류 담당자 연락처가 제출되지 않았습니다.',
    missing: ['품질 담당자', '물류 담당자', '비상 연락처', '언어 가능 여부'],
  },
  {
    key: 'factories',
    title: '공장·사업장',
    completed: 0,
    total: 5,
    status: '미입력',
    comment: '공장 주소와 생산능력 보완 요청이 필요합니다.',
    missing: ['공장 상세 주소', '월 생산능력', '납품지역', '가동 상태', '공장 담당자'],
  },
  {
    key: 'certificates',
    title: '인증서',
    completed: 2,
    total: 8,
    status: '입력 중',
    comment: 'IATF 16949 사본과 ISO 14001 갱신본 첨부가 필요합니다.',
    missing: ['IATF 16949', 'ISO 45001', 'RMI 인증', '만료일 증빙', '첨부파일 2건', '발급기관 확인'],
  },
  {
    key: 'items',
    title: '공급 품목',
    completed: 1,
    total: 5,
    status: '확인 필요',
    comment: 'Pack 공급 품목과 납품 모델 매핑을 확인해야 합니다.',
    missing: ['품목별 HS 코드', '납품 모델', '월 공급량', 'BOM 연결'],
  },
  {
    key: 'origin',
    title: '원산지/규제 정보',
    completed: 1,
    total: 3,
    status: '확인 필요',
    comment: 'EU/US 목적지별 원산지 증빙과 FEOC 확인이 필요합니다.',
    missing: ['원산지 증명서', 'FEOC 자기선언', 'EU Battery Art.47 대응 여부'],
  },
];

const companyRows = [
  ['협력사명', supplierSummary.name],
  ['사업자등록번호', '123-45-67890'],
  ['법인등록번호', '110111-1234567'],
  ['DUNS 번호', '미제출'],
  ['대표자', '확인 필요'],
  ['설립연도', '2008'],
  ['웹사이트', 'https://hanyang-cell.co.kr'],
];

const contactRows = [
  ['ESG 담당자', '김지민 ESG 담당자', 'jimin.kim@hanyang-cell.co.kr', '+82-10-3456-7890', '제출'],
  ['품질 담당자', '-', '-', '-', '미입력'],
  ['물류 담당자', '-', '-', '-', '미입력'],
  ['비상 연락처', '-', '-', '-', '미입력'],
];

const factoryRows = [
  ['청주 1공장', 'KR', '충북 청주시 오송생명로 200', '2.4 GWh/월', 'EU · US', '주소 확인 필요'],
  ['청주 2공장', 'KR', '충북 청주시 오송생명로 220', '미제출', 'EU', '생산능력 미입력'],
  ['본사', 'KR', '서울 강남구 테헤란로 152', '-', '-', '검토 제외'],
];

const certificateRows = [
  ['ISO 9001:2015', 'TUV Rheinland', '2024-03-01', '2027-02-28', '완료', '첨부됨'],
  ['ISO 14001:2015', 'TUV Rheinland', '2024-03-01', '2027-02-28', '확인 필요', '갱신본 요청'],
  ['IATF 16949:2016', 'Bureau Veritas', '2023-07-15', '2026-07-14', '입력 중', '미첨부'],
  ['RMI 인증', '-', '-', '-', '미입력', '미첨부'],
];

const supplyItemRows = [
  ['BAT-NCM811-100Ah', 'Premium NCM811 100Ah', 'Pack', 'EU', '완료'],
  ['BAT-LFP-120Ah', 'LFP Power 120Ah', 'Pack', 'EU', '확인 필요'],
  ['BAT-NCM622-90Ah', 'NCM622 90Ah', 'Pack', 'US', '미입력'],
];

const originRows = [
  ['EU Battery', 'EU', '원산지 증명서', '확인 필요'],
  ['IRA/FEOC', 'US', 'FEOC 자기선언', '미입력'],
  ['CSDDD', 'EU', '공급망 실사 응답', '입력 중'],
];

function statusClasses(status: ReviewStatus) {
  return {
    완료: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    '입력 중': 'border-amber-200 bg-amber-50 text-amber-700',
    '확인 필요': 'border-red-200 bg-red-50 text-red-700',
    미입력: 'border-slate-200 bg-slate-50 text-slate-600',
  }[status];
}

function progressTone(status: ReviewStatus) {
  return {
    완료: 'bg-emerald-500',
    '입력 중': 'bg-amber-500',
    '확인 필요': 'bg-red-500',
    미입력: 'bg-slate-400',
  }[status];
}

function sectionIcon(status: ReviewStatus) {
  if (status === '완료') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === '입력 중') return <Clock3 className="h-4 w-4 text-amber-600" />;
  if (status === '확인 필요') return <AlertTriangle className="h-4 w-4 text-red-600" />;
  return <ClipboardList className="h-4 w-4 text-slate-500" />;
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={clsx('inline-flex items-center rounded-xs border px-2.5 py-1 text-xs font-semibold', statusClasses(status))}>
      {status}
    </span>
  );
}

function ProgressBar({ value, status }: { value: number; status: ReviewStatus }) {
  return (
    <div className="h-2 w-full rounded-full bg-ink-700">
      <div className={clsx('h-2 rounded-full', progressTone(status))} style={{ width: `${value}%` }} />
    </div>
  );
}

function ReviewComment({ section }: { section: CollectionSection }) {
  return (
    <aside className="rounded-sm border border-ink-700 bg-ink-800/50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-100">
        <FileText className="h-4 w-4 text-accent-600" />
        원청 검토 코멘트
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-500">{section.comment}</p>
      <div className="mt-4 border-t border-ink-700 pt-3">
        <div className="text-xs font-semibold text-ink-400">누락·보완 항목</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {section.missing.map(item => (
            <span key={item} className="rounded-xs border border-red-100 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
              {item}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

function FieldTable({ rows }: { rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-sm border border-ink-700">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-ink-700 last:border-b-0">
              <th className="w-44 bg-ink-800/60 px-4 py-3 text-left font-semibold text-ink-500">{label}</th>
              <td className="px-4 py-3 font-medium text-ink-100">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-ink-700">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-ink-800/70">
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
            <tr key={`${row[0]}-${rowIndex}`} className="border-b border-ink-700 last:border-b-0 hover:bg-accent-50/40">
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className={clsx('whitespace-nowrap px-4 py-3 text-ink-500', cellIndex === 0 && 'font-semibold text-ink-100')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionBody({ section }: { section: CollectionSection }) {
  const content = {
    company: <FieldTable rows={companyRows} />,
    contacts: <DataTable headers={['구분', '담당자', '이메일', '연락처', '상태']} rows={contactRows} />,
    factories: <DataTable headers={['공장명', '국가', '주소', '생산능력', '납품지역', '상태']} rows={factoryRows} />,
    certificates: <DataTable headers={['인증서명', '발급기관', '발급일', '만료일', '상태', '첨부파일']} rows={certificateRows} />,
    items: <DataTable headers={['제품 코드', '제품명', '역할', '목적지', '상태']} rows={supplyItemRows} />,
    origin: <DataTable headers={['규제', '대상 지역', '필요 증빙', '상태']} rows={originRows} />,
  }[section.key];

  return (
    <div className="grid gap-5 border-t border-ink-700 bg-white p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      {content}
      <ReviewComment section={section} />
    </div>
  );
}

function AccordionSection({
  section,
  isOpen,
  onToggle,
}: {
  section: CollectionSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const rate = Math.round((section.completed / section.total) * 100);

  return (
    <section className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-ink-800/50"
      >
        <div className="flex min-w-0 items-center gap-3">
          {sectionIcon(section.status)}
          <div className="min-w-0">
            <div className="text-base font-semibold text-ink-100">{section.title}</div>
            <div className="mt-1 flex items-center gap-3 text-sm text-ink-500">
              <span>{section.completed} / {section.total} 완료</span>
              <span>{rate}%</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <StatusBadge status={section.status} />
          <ChevronDown className={clsx('h-4 w-4 text-ink-400 transition-transform', isOpen && 'rotate-180')} />
        </div>
      </button>
      {isOpen && <SectionBody section={section} />}
    </section>
  );
}

export default function SupplierGeneralReviewPage() {
  const [openSections, setOpenSections] = useState<SectionKey[]>(['company']);

  function toggleSection(sectionKey: SectionKey) {
    setOpenSections(current =>
      current.includes(sectionKey)
        ? current.filter(key => key !== sectionKey)
        : [...current, sectionKey]
    );
  }

  return (
    <div className="min-h-screen bg-ink-900/40">
      <PageHeader
        title="협력사 입력 데이터 검토"
        description="협력사가 제출한 기본정보, 사업장, 인증서, 품목, 원산지 정보를 원청사가 수집 현황 기준으로 확인합니다."
      />

      <main className="space-y-6 p-8">
        <section className="rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-accent-100 bg-accent-50 text-accent-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold tracking-tight text-ink-100">{supplierSummary.name}</h2>
                  <p className="mt-2 text-base text-ink-500">
                    {supplierSummary.tier} · {supplierSummary.role} · {supplierSummary.country}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <SummaryInfo icon={<UserRound className="h-4 w-4" />} label="담당자" value={supplierSummary.manager} />
                <SummaryInfo icon={<Mail className="h-4 w-4" />} label="이메일" value={supplierSummary.email} />
                <SummaryInfo icon={<Phone className="h-4 w-4" />} label="연락처" value={supplierSummary.phone} />
              </div>
            </div>

            <div className="rounded-sm border border-ink-700 bg-ink-800/50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-ink-500">전체 수집률</div>
                  <div className="mt-1 text-3xl font-semibold text-accent-700">{supplierSummary.collectionRate}%</div>
                </div>
                <StatusBadge status={supplierSummary.reviewStatus} />
              </div>
              <div className="mt-4">
                <ProgressBar value={supplierSummary.collectionRate} status={supplierSummary.reviewStatus} />
                <div className="mt-2 text-sm font-medium text-ink-500">
                  {supplierSummary.completed} / {supplierSummary.total} 항목 완료
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <SummaryMetric label="최근 제출일" value={supplierSummary.lastSubmittedAt} />
                <SummaryMetric label="원청 검토 상태" value={supplierSummary.reviewStatus} />
              </div>
            </div>
          </div>
        </section>

        <Card title="수집 항목 요약" subtitle="협력사 입력 양식 섹션별 완료 수와 검토 상태입니다.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sections.map(section => {
              const rate = Math.round((section.completed / section.total) * 100);
              return (
                <button
                  type="button"
                  key={section.key}
                  onClick={() => {
                    if (!openSections.includes(section.key)) {
                      setOpenSections(current => [...current, section.key]);
                    }
                    document.getElementById(`section-${section.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="rounded-sm border border-ink-700 bg-white p-4 text-left hover:border-accent-200 hover:bg-accent-50/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-ink-100">{section.title}</div>
                      <div className="mt-1 text-sm text-ink-500">{section.completed} / {section.total}</div>
                    </div>
                    <StatusBadge status={section.status} />
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={rate} status={section.status} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-3">
          {sections.map(section => (
            <div key={section.key} id={`section-${section.key}`} className="scroll-mt-24">
              <AccordionSection
                section={section}
                isOpen={openSections.includes(section.key)}
                onToggle={() => toggleSection(section.key)}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function SummaryInfo({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-sm border border-ink-700 bg-ink-800/50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-400">
        <span className="text-accent-700">{icon}</span>
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-medium text-ink-100">{value}</div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-ink-700 bg-white px-4 py-3">
      <div className="text-xs font-semibold text-ink-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink-100">{value}</div>
    </div>
  );
}
