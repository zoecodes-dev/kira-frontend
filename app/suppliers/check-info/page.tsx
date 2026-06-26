'use client';

// 협력사 입력 데이터 수집 현황을 원청사가 검토하는 화면
import { Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { suppliers } from '@/lib/data';
import { getRemindLogs, getSupplierName, supplierCompleteness } from '@/lib/supplier-detail-data';
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

function CompanyGrid() {
  return (
    <div className="grid overflow-hidden rounded-sm border border-ink-700 md:grid-cols-2">
      {companyRows.map(([label, value, status]) => (
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

function ReviewComment({ section }: { section: CollectionSection }) {
  return (
    <aside className="rounded-sm border border-ink-700 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-ink-100">원청 검토 코멘트</div>
      <p className="mt-3 text-sm leading-6 text-ink-500">{section.comment}</p>
      <button type="button" className="mt-4 rounded-sm border border-ink-700 bg-white px-3 py-2 text-sm font-medium text-ink-500 hover:text-accent-700">
        코멘트 보기
      </button>
    </aside>
  );
}

function SectionContent({ section }: { section: CollectionSection }) {
  const content = {
    company: <CompanyGrid />,
    contacts: <DataTable headers={['구분', '담당자', '이메일', '연락처', '상태']} rows={contactRows} />,
    factories: <DataTable headers={['공장명', '국가', '주소', '생산능력', '납품지역', '상태']} rows={factoryRows} />,
    certificates: <DataTable headers={['인증서명', '발급기관', '발급일', '만료일', '상태', '첨부파일']} rows={certificateRows} />,
    items: <DataTable headers={['제품 코드', '제품명', '역할', '목적지', '상태']} rows={supplyItemRows} />,
    origin: <DataTable headers={['규제', '대상 지역', '필요 증빙', '상태']} rows={originRows} />,
  }[section.key];

  return (
    <div className="space-y-[14px] border-t border-ink-700 bg-white p-4">
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
  return (
    <section id={`section-${section.key}`} className="scroll-mt-24 overflow-hidden border-b border-ink-700 bg-white first:rounded-t-sm first:border-t last:rounded-b-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-slate-50">
        <div className="flex min-w-0 items-center gap-3">
          <span className={clsx('flex h-5 w-5 items-center justify-center', iconTone(section.status))}>{section.icon}</span>
          <span className="truncate text-base font-semibold text-ink-100">
            {section.order}. {section.title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="text-sm font-medium text-ink-500">{section.completed} / {section.total} 완료</span>
          <span className="h-4 w-px bg-ink-700" />
          <StatusBadge status={section.status} />
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-ink-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-ink-400" />
          )}
        </div>
      </button>
      {isOpen && <SectionContent section={section} />}
    </section>
  );
}

function inputStatusMeta(rate: number, missingCount: number, reminderCount: number) {
  if (missingCount === 0) {
    return { label: '완료', className: 'border-ok-border bg-ok-bg text-ok-text' };
  }
  if (reminderCount >= 2) {
    return { label: '보완 지연', className: 'border-alert-border bg-alert-bg text-alert-text' };
  }
  if (rate >= 80) {
    return { label: '검토 대기', className: 'border-warn-border bg-warn-bg text-warn-text' };
  }
  return { label: '작성중', className: 'border-info-border bg-info-bg text-info-text' };
}

function SupplierCheckInfoIndex() {
  const rows = supplierCompleteness
    .map(item => {
      const supplier = suppliers.find(entry => entry.id === item.supplierId);
      const name = getSupplierName(item.supplierId);
      const reminders = getRemindLogs(item.supplierId);
      const status = inputStatusMeta(item.completionRate, item.missingFields.length, reminders.length);

      return { ...item, supplier, name, status };
    })
    .sort((a, b) => {
      if (a.missingFields.length !== b.missingFields.length) return b.missingFields.length - a.missingFields.length;
      return a.completionRate - b.completionRate;
    });

  const pendingCount = rows.filter(row => row.missingFields.length > 0).length;
  const reviewCount = rows.filter(row => row.status.label === '검토 대기').length;
  const delayedCount = rows.filter(row => row.status.label === '보완 지연').length;
  const avgRate = rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.completionRate, 0) / rows.length) : 0;

  return (
    <main className="min-h-screen bg-slate-50 px-7 py-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-100">협력사 입력 현황</h1>
          <p className="mt-2 text-sm text-ink-500">작성중이거나 검토가 필요한 협력사를 선택해 상세 수집 현황을 확인합니다.</p>
        </div>
        <Link
          href="/supply-chain/map"
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-ink-700 bg-white px-3 text-sm font-semibold text-ink-500 shadow-control hover:border-accent-200 hover:text-accent-700"
        >
          <Send className="h-4 w-4" />
          공급망 맵에서 요청
        </Link>
      </div>

      <section className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          { label: '전체 협력사', value: rows.length, tone: 'text-ink-100' },
          { label: '작성중/누락', value: pendingCount, tone: 'text-info-text' },
          { label: '검토 대기', value: reviewCount, tone: 'text-warn-text' },
          { label: '보완 지연', value: delayedCount, tone: 'text-alert-text' },
        ].map(item => (
          <div key={item.label} className="rounded-sm border border-ink-700 bg-white px-4 py-3 shadow-control">
            <div className="text-xs font-semibold text-ink-500">{item.label}</div>
            <div className={clsx('mt-2 text-2xl font-bold num-mono', item.tone)}>{item.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 bg-slate-50 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink-100">작성중인 협력사</h2>
            <p className="mt-1 text-sm text-ink-500">평균 입력률 {avgRate}% · 누락 항목이 많은 순으로 정렬</p>
          </div>
          <div className="text-sm font-medium text-ink-500">협력사명 또는 검토 버튼을 누르면 상세 화면으로 이동합니다.</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px]">
            <thead className="border-b border-ink-700 bg-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">협력사</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">Tier</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">국가</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">입력률</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">상태</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">누락 항목</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">최근 업데이트</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/60">
              {rows.map(row => {
                const supplierLabel = row.name?.nameEn ?? row.supplier?.name ?? row.supplierId;
                const visibleMissing = row.missingFields.slice(0, 2);
                const hiddenCount = Math.max(row.missingFields.length - visibleMissing.length, 0);
                const progressTone =
                  row.completionRate >= 90 ? 'bg-ok-solid' :
                  row.completionRate >= 75 ? 'bg-warn-solid' :
                  row.completionRate >= 60 ? 'bg-warn-solid' :
                  'bg-alert-solid';

                return (
                  <tr key={row.supplierId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 align-middle">
                      <Link
                        href={`/suppliers/check-info?supplierId=${row.supplierId}&supplier=${encodeURIComponent(supplierLabel)}`}
                        className="group inline-block max-w-[280px]"
                      >
                        <div className="truncate font-semibold text-ink-100 group-hover:text-accent-700 group-hover:underline">
                          {supplierLabel}
                        </div>
                        <div className="mt-1 truncate text-sm text-ink-500 group-hover:text-accent-600">
                          {row.name?.nameKo ?? row.supplierId}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle text-sm font-semibold text-ink-300 num-mono">
                      T{row.supplier?.tier ?? '-'}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-ink-500">{row.supplier?.country ?? '-'}</td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex min-w-36 items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-slate-100">
                          <div className={clsx('h-full rounded-full', progressTone)} style={{ width: `${row.completionRate}%` }} />
                        </div>
                        <span className="w-12 text-right text-sm font-bold text-ink-100 num-mono">{row.completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={clsx('inline-flex rounded-xs border px-2.5 py-1 text-xs font-semibold', row.status.className)}>
                        {row.status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {row.missingFields.length === 0 ? (
                        <span className="text-sm text-ink-500">없음</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {visibleMissing.map(field => (
                            <span key={field} className="rounded-xs border border-ink-700 bg-slate-50 px-2 py-1 text-xs font-medium text-ink-300">
                              {field}
                            </span>
                          ))}
                          {hiddenCount > 0 && (
                            <span className="rounded-xs border border-ink-700 bg-white px-2 py-1 text-xs font-semibold text-ink-500">
                              외 {hiddenCount}건
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-ink-500 num-mono">{row.lastUpdatedAt}</td>
                    <td className="px-4 py-3 align-middle">
                      <Link
                        href={`/suppliers/check-info?supplierId=${row.supplierId}&supplier=${encodeURIComponent(supplierLabel)}`}
                        className="inline-flex items-center gap-1 rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-sm font-semibold text-accent-700 hover:border-accent-600"
                      >
                        검토 <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function SupplierGeneralReviewContent() {
  const searchParams = useSearchParams();
  const supplierId = searchParams.get('supplierId') ?? '';
  const supplierName = searchParams.get('supplier') ?? supplierSummary.name;
  const selectedSupplier = suppliers.find(supplier => supplier.id === supplierId);
  const selectedName = getSupplierName(supplierId);
  const selectedCompleteness = supplierCompleteness.find(item => item.supplierId === supplierId);
  const displayName = selectedName?.nameKo ?? supplierName;
  const displayRole = selectedSupplier?.role ?? supplierSummary.role;
  const displayCountry = selectedSupplier?.country ?? supplierSummary.country;
  const displayTier = selectedSupplier ? `T${selectedSupplier.tier}` : supplierSummary.tier;
  const displayRate = selectedCompleteness?.completionRate ?? supplierSummary.collectionRate;
  const displayCompleted = selectedCompleteness?.filledFieldCount ?? supplierSummary.completed;
  const displayTotal = selectedCompleteness?.requiredFieldCount ?? supplierSummary.total;
  const displayLastUpdated = selectedCompleteness?.lastUpdatedAt ?? supplierSummary.lastSubmittedAt;
  const [openSections, setOpenSections] = useState<SectionKey[]>(['company']);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
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

  const urgentCount = sections.reduce((sum, section) =>
    section.status === '미입력' || section.status === '확인 필요' ? sum + section.missing.length : sum, 0);

  function sendRequest() {
    setRequestSent(true);
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
    return <SupplierCheckInfoIndex />;
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
                <span>{supplierSummary.manager}</span>
                <span className="h-3 w-px bg-ink-700" />
                <span>{supplierSummary.email}</span>
                <span className="h-3 w-px bg-ink-700" />
                <span>{supplierSummary.phone}</span>
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
                <div className="mt-1 text-xs text-ink-500">{supplierSummary.name} · {supplierSummary.email}</div>
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
