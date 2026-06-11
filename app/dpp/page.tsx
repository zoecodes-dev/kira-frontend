'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import TopStatCard from '@/components/TopStatCard';
import { dppRecords, type DPP } from '@/lib/data';
import { Check, ChevronDown, Copy, Download, Eye, FileText, Mail, Share2, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

type PeriodFilter = '7d' | '1m' | '3m' | 'custom';
type DestinationFilter = 'all' | 'EU' | 'US';
type ApproverFilter = 'all' | string;
type StatusFilter = 'all' | HistoryStatus;
type HistoryStatus = 'issued' | 'reissued' | 'corrected' | 'revoked';

interface HistoryRecord extends DPP {
  historyStatus: HistoryStatus;
  supplyChainVersion: string;
  dppVersion: string;
}

const statusMeta: Record<HistoryStatus, { label: string; tone: 'ok' | 'warn' | 'info' | 'alert' | 'neutral' }> = {
  issued: { label: '발행 완료', tone: 'ok' },
  reissued: { label: '재발행', tone: 'warn' },
  corrected: { label: '정정 발행', tone: 'info' },
  revoked: { label: '폐기', tone: 'alert' },
};

const historyRecords: HistoryRecord[] = dppRecords.map((record, index) => ({
  ...record,
  historyStatus: (['issued', 'reissued', 'corrected', 'revoked', 'issued'] as HistoryStatus[])[index] ?? 'issued',
  supplyChainVersion: `SCM-2026.05.${String(index + 1).padStart(2, '0')}`,
  dppVersion: `v${index === 0 ? '1.0' : index === 1 ? '1.1' : index === 2 ? '2.0' : '1.0'}`,
}));

export default function DppPage() {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('7d');
  const [destinationFilter, setDestinationFilter] = useState<DestinationFilter>('all');
  const [approverFilter, setApproverFilter] = useState<ApproverFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [customStart, setCustomStart] = useState('2026-05-01');
  const [customEnd, setCustomEnd] = useState('2026-05-14');
  const [appliedCustomRange, setAppliedCustomRange] = useState({ start: customStart, end: customEnd });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    return historyRecords
      .filter(record => destinationFilter === 'all' || record.destination === destinationFilter)
      .filter(record => approverFilter === 'all' || record.approvedBy === approverFilter)
      .filter(record => statusFilter === 'all' || record.historyStatus === statusFilter)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }, [approverFilter, destinationFilter, statusFilter]);

  const approverOptions = useMemo(() => {
    return Array.from(new Set(historyRecords.map(record => record.approvedBy)));
  }, []);

  const selectedRecord = selectedId
    ? filteredRecords.find(record => record.id === selectedId) ?? historyRecords.find(record => record.id === selectedId)
    : null;

  const kpis = {
    monthlyIssued: historyRecords.filter(record => record.historyStatus !== 'revoked').length,
    euIssued: historyRecords.filter(record => record.destination === 'EU').length,
    usIssued: historyRecords.filter(record => record.destination === 'US').length,
    reissued: historyRecords.filter(record => record.historyStatus === 'reissued').length,
  };

  const periodLabel = {
    '7d': '최근 7일',
    '1m': '1개월',
    '3m': '3개월',
    custom: `${appliedCustomRange.start} ~ ${appliedCustomRange.end}`,
  }[periodFilter];

  return (
    <>
      <PageHeader
        title="DPP 발행 이력"
        description="발행된 DPP의 이력, 상태, 승인자, 추적 버전을 조회합니다."
      />

      <div className="p-8 space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TopStatCard label="이번 달 발행" value={kpis.monthlyIssued} unit="건" tone="neutral" />
          <TopStatCard label="EU 발행" value={kpis.euIssued} unit="건" tone="info" />
          <TopStatCard label="US 발행" value={kpis.usIssued} unit="건" tone="warn" />
          <TopStatCard label="재발행" value={kpis.reissued} unit="건" tone="alert" />
        </section>

        <section className="rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-700 bg-ink-800/60 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-ink-100">최근 발행 이력</h2>
              <p className="mt-1 text-sm text-ink-500">{periodLabel} 기준, 최신 발행순으로 표시합니다.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={periodFilter}
                onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
                className="rounded-xs border border-ink-700 bg-white px-3 py-2 text-sm font-medium text-ink-100 outline-none focus:border-accent-600"
                aria-label="발행 기간"
              >
                <option value="7d">최근 7일</option>
                <option value="1m">1개월</option>
                <option value="3m">3개월</option>
                <option value="custom">직접 설정</option>
              </select>
            </div>
          </div>

          {periodFilter === 'custom' && (
            <div className="flex flex-wrap items-end gap-3 border-b border-ink-700 bg-white px-5 py-4">
              <DateField label="시작일" value={customStart} onChange={setCustomStart} />
              <DateField label="종료일" value={customEnd} onChange={setCustomEnd} />
              <button
                onClick={() => setAppliedCustomRange({ start: customStart, end: customEnd })}
                className="rounded-xs border border-accent-600 bg-accent-700 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-800"
              >
                조회
              </button>
            </div>
          )}

          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[1040px]">
              <thead>
                <tr className="border-b border-ink-700">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-500">발행일</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-500">DPP ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-500">제품 코드</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-500">제품명</th>
                  <th className="px-5 py-3 text-left">
                    <ColumnFilter
                      label="목적지"
                      value={destinationFilter}
                      onChange={(value) => setDestinationFilter(value as DestinationFilter)}
                      options={[
                        { value: 'all', label: '전체' },
                        { value: 'EU', label: 'EU' },
                        { value: 'US', label: 'US' },
                      ]}
                    />
                  </th>
                  <th className="px-5 py-3 text-left">
                    <ColumnFilter
                      label="승인자"
                      value={approverFilter}
                      onChange={setApproverFilter}
                      options={[
                        { value: 'all', label: '전체' },
                        ...approverOptions.map(approver => ({ value: approver, label: approver })),
                      ]}
                    />
                  </th>
                  <th className="px-5 py-3 text-left">
                    <ColumnFilter
                      label="상태"
                      value={statusFilter}
                      onChange={(value) => setStatusFilter(value as StatusFilter)}
                      options={[
                        { value: 'all', label: '전체' },
                        ...Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label })),
                      ]}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(record => (
                  <tr
                    key={record.id}
                    data-testid={`dpp-history-row-${record.id}`}
                    onClick={() => setSelectedId(record.id)}
                    className={clsx(
                      'cursor-pointer border-b border-ink-700/70 transition-colors hover:bg-ink-800/40',
                      selectedRecord?.id === record.id && 'bg-accent-50',
                    )}
                  >
                    <td className="px-5 py-4 text-sm text-ink-500 num-mono">{record.issuedAt}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-ink-100 num-mono">{record.id}</td>
                    <td className="px-5 py-4 text-sm text-ink-500 num-mono">{record.productId}</td>
                    <td className="px-5 py-4 text-sm font-medium text-ink-100">{record.modelName}</td>
                    <td className="px-5 py-4 text-sm text-ink-500">{record.destination}</td>
                    <td className="px-5 py-4 text-sm text-ink-500">{record.approvedBy}</td>
                    <td className="px-5 py-4"><StatusBadge status={record.historyStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-sm border border-ink-700 bg-white shadow-control">
          {selectedRecord ? (
            <DppDetail record={selectedRecord} />
          ) : (
            <div className="flex min-h-[220px] items-center justify-center px-6 py-10 text-center">
              <div>
                <FileText className="mx-auto h-8 w-8 text-ink-500" />
                <h2 className="mt-3 text-base font-semibold text-ink-100">발행 이력을 선택하세요</h2>
                <p className="mt-2 text-sm text-ink-500">상단 표의 행을 클릭하면 제품 코드, DPP ID, 추적 버전과 공유 정보를 확인할 수 있습니다.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function ColumnFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value)?.label ?? '전체';

  return (
    <div className="relative inline-block min-w-[104px]">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className={clsx(
          'inline-flex w-full items-center justify-between gap-2 rounded-xs px-2 py-1.5 text-xs font-semibold transition-colors',
          value === 'all'
            ? 'text-ink-500 hover:bg-ink-800'
            : 'bg-accent-50 text-accent-800',
        )}
        aria-expanded={open}
        aria-label={`${label} 컬럼 필터`}
      >
        <span>{label}</span>
        <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-xs border border-ink-700 bg-white shadow-control">
          {options.map(option => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={clsx(
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors',
                  active ? 'bg-accent-700 text-white' : 'text-ink-500 hover:bg-ink-800 hover:text-ink-100',
                )}
              >
                <span className="truncate">{option.label}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
      {value !== 'all' && (
        <div className="mt-1 truncate text-xs font-medium text-accent-800">{selected}</div>
      )}
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-500">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xs border border-ink-700 bg-white px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent-600"
      />
    </label>
  );
}

function DppDetail({ record }: { record: HistoryRecord }) {
  const recycledTotal = record.recycledContent.Co + record.recycledContent.Ni + record.recycledContent.Li;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-700 bg-ink-800/60 px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-ink-100">{record.modelName}</h2>
            <StatusBadge status={record.historyStatus} size="md" />
          </div>
          <p className="mt-1 text-sm text-ink-500 num-mono">{record.id}</p>
        </div>
      </div>

      <div className="grid items-stretch gap-6 p-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="flex h-full flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <DetailField label="제품 코드" value={record.productId} mono />
            <DetailField label="제조사" value={record.manufacturer} />
            <DetailField label="용량" value={record.capacity} />
            <DetailField label="목적지" value={record.destination} />
            <DetailField label="발행일" value={record.issuedAt} mono />
            <DetailField label="승인자" value={record.approvedBy} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <MetricPanel label="탄소발자국" value={`${record.carbonFootprint}`} unit="kgCO2e / kWh" />
            <div className="rounded-sm border border-ink-700 bg-white p-4">
              <div className="text-xs font-semibold text-ink-500">재활용 함량</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-emerald-700 num-mono">{recycledTotal}</span>
                <span className="text-sm text-ink-500">%</span>
              </div>
              <div className="mt-3 space-y-2">
                <RecycledRow metal="Co" label="코발트" value={record.recycledContent.Co} />
                <RecycledRow metal="Ni" label="니켈" value={record.recycledContent.Ni} />
                <RecycledRow metal="Li" label="리튬" value={record.recycledContent.Li} />
              </div>
            </div>
          </div>
        </div>

        <div className="h-full">
          <div className="h-full rounded-sm border border-ink-700 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-100">
              <ShieldCheck className="h-4 w-4 text-accent-700" />
              추적 정보
            </div>
            <div className="mt-4 grid gap-3">
              <DetailField label="공급망 버전" value={record.supplyChainVersion} mono />
              <DetailField label="DPP 버전" value={record.dppVersion} mono />
              <DetailField label="발행 승인자" value={record.approvedBy} />
              <DetailField label="발행일시" value={record.issuedAt} mono />
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 pb-5">
        <SharePanel record={record} />
      </div>
    </div>
  );
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-sm border border-ink-700 bg-white p-3">
      <div className="text-xs font-semibold text-ink-500">{label}</div>
      <div className={clsx('mt-1 text-sm font-medium text-ink-100', mono && 'num-mono')}>{value}</div>
    </div>
  );
}

function MetricPanel({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-sm border border-ink-700 bg-white p-4">
      <div className="text-xs font-semibold text-ink-500">{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-emerald-700 num-mono">{value}</span>
        <span className="text-sm text-ink-500">{unit}</span>
      </div>
    </div>
  );
}

function RecycledRow({ metal, label, value }: { metal: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-7 shrink-0 text-ink-500 num-mono">{metal}</span>
      <span className="w-14 shrink-0 text-ink-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-700">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, value * 4)}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right font-semibold text-ink-100 num-mono">{value}%</span>
    </div>
  );
}

function SharePanel({ record }: { record: HistoryRecord }) {
  return (
    <div className="rounded-sm border border-ink-700 bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-100">
        <Share2 className="h-4 w-4 text-accent-700" />
        외부 공유
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-3 xl:grid-cols-[1.15fr_1fr]">
          <div className="grid grid-cols-2 gap-2">
            <ShareButton icon={Download} label="PDF 다운로드" />
            <ShareButton icon={Eye} label="DPP 상세 보기" />
            <ShareButton icon={Mail} label="외부 공유" />
            <ShareButton icon={Copy} label="공유 링크 복사" />
          </div>

          <div className="rounded-sm border border-ink-700 bg-ink-800/40 p-3">
            <div className="text-xs font-semibold text-ink-500">공유 기능 확장 영역</div>
            <div className="mt-2 text-sm leading-6 text-ink-500">
              고객사 공유, 이메일 전송, 링크 발급 기능을 연결할 수 있습니다.
              <span className="ml-2 whitespace-nowrap">선택 DPP <span className="num-mono text-ink-100">{record.id}</span></span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <DetailField label="마지막 공유 일시" value="2026-05-14 11:20" mono />
          <DetailField label="공유 대상" value={`${record.destination} 고객사 품질/ESG 담당자`} />
          <DetailField label="공유 횟수" value="3회" />
        </div>
      </div>
    </div>
  );
}

function ShareButton({ icon: Icon, label }: { icon: typeof Download; label: string }) {
  return (
    <button className="flex items-center justify-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2.5 text-sm font-semibold text-ink-100 hover:border-accent-600 hover:text-accent-700">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function StatusBadge({ status, size = 'sm' }: { status: HistoryStatus; size?: 'sm' | 'md' }) {
  const meta = statusMeta[status];
  return <Badge tone={meta.tone} size={size}>{meta.label}</Badge>;
}
