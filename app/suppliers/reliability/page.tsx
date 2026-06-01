'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Info,
  Search,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';
import { suppliers } from '@/lib/data';
import {
  getCertifications,
  getCompleteness,
  getContacts,
  getSupplierName,
  supplierRiskProfiles,
} from '@/lib/supplier-detail-data';

type AssessmentStatus = 'approved' | 'review' | 'rework';
type AssessmentFilter = 'all' | AssessmentStatus;

const selfAssessments = [
  { supplierId: 'S-CELL-001', selfRisk: 'low', score: 91, status: 'approved', submittedAt: '2026-05-10', owner: 'ESG팀 김민재' },
  { supplierId: 'S-CAM-001', selfRisk: 'low', score: 88, status: 'approved', submittedAt: '2026-05-12', owner: 'ESG팀 김민재' },
  { supplierId: 'S-CAM-002', selfRisk: 'medium', score: 62, status: 'review', submittedAt: '2026-05-14', owner: '컴플라이언스 이서윤' },
  { supplierId: 'S-REF-002', selfRisk: 'medium', score: 44, status: 'rework', submittedAt: '2026-05-08', owner: 'ESG팀 박지훈' },
  { supplierId: 'S-MINE-002', selfRisk: 'high', score: 38, status: 'review', submittedAt: '2026-05-03', owner: '구매실사 최하린' },
] as const;

const evidenceItems = [
  { label: '사업자등록증', required: true },
  { label: '행동강령 서약서', required: true },
  { label: '인권 정책', required: true },
  { label: '환경 협력 평가', required: true },
  { label: '안전 정책', required: false },
  { label: '공급망 자가 평가', required: true },
];

const statusMeta: Record<AssessmentStatus, { label: string; tone: 'ok' | 'info' | 'warn' }> = {
  approved: { label: '승인', tone: 'ok' },
  review: { label: '검토 중', tone: 'info' },
  rework: { label: '보완 요청', tone: 'warn' },
};

const riskMeta = {
  low: { label: '저위험', tone: 'ok' as const },
  medium: { label: '중위험', tone: 'warn' as const },
  high: { label: '고위험', tone: 'alert' as const },
  critical: { label: '최고위험', tone: 'alert' as const },
};

export default function SupplierReliabilityPage() {
  const [selectedId, setSelectedId] = useState<string>(selfAssessments[0].supplierId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AssessmentFilter>('all');

  const filteredAssessments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return selfAssessments.filter(item => {
      const name = getSupplierName(item.supplierId);
      const matchesFilter = filter === 'all' || item.status === filter;
      const matchesQuery = !query || [
        item.supplierId,
        name?.nameEn,
        name?.nameKo,
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });
  }, [filter, search]);

  const selectedAssessment = selfAssessments.find(item => item.supplierId === selectedId) ?? selfAssessments[0];
  const selectedRisk = supplierRiskProfiles.find(item => item.supplierId === selectedId) ?? supplierRiskProfiles[0];
  const selectedSupplier = suppliers.find(item => item.id === selectedId);
  const selectedName = getSupplierName(selectedId);
  const completeness = getCompleteness(selectedId);
  const contacts = getContacts(selectedId);
  const primaryContact = contacts.find(contact => contact.isPrimary) ?? contacts[0];
  const certs = getCertifications(selectedId);
  const risk = riskMeta[selectedRisk.riskLevel];

  return (
    <>
      <PageHeader
        title="협력사 신뢰성 평가"
        description="자가 평가, 행동강령, 인권·환경 증빙과 공급망 리스크를 검토하고 승인합니다"
        badge="P0"
      />

      <div className="p-8">
        <div className="grid min-h-[760px] grid-cols-1 overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b border-ink-700 bg-ink-800/60 xl:border-b-0 xl:border-r">
            <div className="border-b border-ink-700 px-4 py-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-ink-100">평가 대상 협력사</h2>
                <span className="num-mono rounded-full border border-ink-700 bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-500">
                  {filteredAssessments.length}개
                </span>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="협력사명 또는 ID 검색"
                  className="w-full rounded-xs border border-ink-700 bg-white py-2.5 pl-9 pr-3 text-xs text-ink-100 outline-none transition-colors placeholder:text-ink-500 focus:border-accent-600 focus:ring-2 focus:ring-accent-500/20"
                />
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-ink-700 px-4 py-3">
              {([
                ['all', '전체'],
                ['approved', '승인'],
                ['review', '검토 중'],
                ['rework', '보완 요청'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={clsx(
                    'whitespace-nowrap rounded-xs border px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                    filter === value
                      ? 'border-accent-200 bg-accent-50 text-accent-800'
                      : 'border-transparent text-ink-500 hover:border-ink-700 hover:bg-white hover:text-ink-200',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {filteredAssessments.map(item => {
                const name = getSupplierName(item.supplierId);
                const meta = statusMeta[item.status];
                return (
                  <button
                    key={item.supplierId}
                    type="button"
                    onClick={() => setSelectedId(item.supplierId)}
                    className={clsx(
                      'w-full rounded-xs border p-3 text-left transition-colors',
                      selectedId === item.supplierId
                        ? 'border-accent-500 bg-accent-50 shadow-control'
                        : 'border-ink-700 bg-white hover:border-ink-600 hover:bg-ink-800',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-ink-100">{name?.nameEn ?? item.supplierId}</div>
                        <div className="mt-0.5 truncate text-[11px] text-ink-500">{name?.nameKo ?? item.supplierId}</div>
                      </div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                      <span className="num-mono text-ink-500">{item.supplierId}</span>
                      <span className="num-mono font-bold text-ink-300">{item.score}점</span>
                    </div>
                  </button>
                );
              })}
              {filteredAssessments.length === 0 && (
                <div className="rounded-xs border border-dashed border-ink-700 bg-white p-5 text-center text-xs text-ink-500">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>
          </aside>

          <main className="min-w-0 bg-white p-6 xl:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-ink-100">{selectedName?.nameKo ?? selectedName?.nameEn ?? selectedId}</h2>
                <p className="mt-1 text-xs text-ink-500">{selectedName?.nameEn ?? selectedId} · {selectedId}</p>
              </div>
              <Badge tone={statusMeta[selectedAssessment.status].tone} size="md">
                {statusMeta[selectedAssessment.status].label}
              </Badge>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard label="ESG 종합 점수" value={selectedAssessment.score} unit="/ 100점" tone="info" />
              <MetricCard label="데이터 입력 완성도" value={completeness?.completionRate ?? 0} unit="%" tone="ok" />
              <MetricCard label="공급망 리스크 평가" value={risk.label} tone={selectedRisk.riskLevel === 'low' ? 'ok' : selectedRisk.riskLevel === 'medium' ? 'warn' : 'alert'} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 2xl:grid-cols-2">
              <Card title="기업 세부 프로필" subtitle="평가 판단에 필요한 기본 기준 정보">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Mini label="협력사 계층" value={`Tier ${selectedSupplier?.tier ?? '-'}`} />
                  <Mini label="자가 평가 위험도" value={riskMeta[selectedAssessment.selfRisk].label} />
                  <Mini label="FEOC 자격 요건" value={selectedRisk.feocStatus.replace('_', ' ')} />
                  <Mini label="제출일" value={selectedAssessment.submittedAt} />
                </div>
                <div className="mt-4 rounded-xs border border-ink-700 bg-ink-800/50 p-3">
                  <div className="text-xs font-bold text-ink-100">검토 담당자</div>
                  <div className="mt-1 text-[11px] text-ink-500">{selectedAssessment.owner}</div>
                  {primaryContact && (
                    <div className="mt-1 text-[11px] text-ink-400">협력사 담당자: {primaryContact.name} · {primaryContact.email}</div>
                  )}
                </div>
              </Card>

              <Card title="컴플라이언스 리스크 시그널" subtitle="검토 우선순위를 결정하는 핵심 신호">
                <div className="space-y-3">
                  <Signal
                    tone={selectedRisk.highRiskReasons.length > 0 ? 'warn' : 'ok'}
                    title={selectedRisk.highRiskReasons.length > 0 ? '추가 검토가 필요한 리스크 신호' : '현재 열린 고위험 사유 없음'}
                    desc={selectedRisk.highRiskReasons[0] ?? '등록된 규제·인권·환경 위험 신호가 없습니다.'}
                  />
                  <Signal
                    tone={certs.every(cert => cert.status === 'active') ? 'ok' : 'warn'}
                    title="핵심 인증서 유효성"
                    desc={`${certs.length}건의 기본 인증서 중 ${certs.filter(cert => cert.status === 'active').length}건이 유효 상태입니다.`}
                  />
                </div>
              </Card>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
              <Card title="증빙 제출 현황" subtitle="필수·선택 증빙 자료 검토 상태">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {evidenceItems.map((item, index) => {
                    const done = selectedAssessment.score - index * 7 > 45;
                    return (
                      <div key={item.label} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-ink-800/40 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {done ? <FileCheck className="h-3.5 w-3.5 text-emerald-700" /> : <Upload className="h-3.5 w-3.5 text-amber-700" />}
                          <div>
                            <div className="text-xs font-semibold text-ink-200">{item.label}</div>
                            <div className="mt-0.5 text-[10px] text-ink-500">{item.required ? '필수 증빙' : '선택 증빙'}</div>
                          </div>
                        </div>
                        <Badge tone={done ? 'ok' : 'warn'}>{done ? '제출됨' : '보완'}</Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card title="검토 결과와 조치" subtitle="결과는 협력사 목록과 DPP 판단에 반영됩니다">
                <div className="space-y-2">
                  {selectedRisk.highRiskReasons.length > 0 ? (
                    selectedRisk.highRiskReasons.slice(0, 3).map(reason => (
                      <div key={reason} className="flex items-start gap-2 rounded-xs border border-red-200 bg-red-50 p-3">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-700" />
                        <div className="text-xs leading-5 text-red-900">{reason}</div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 rounded-xs border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                      현재 열린 고위험 사유가 없습니다.
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton tone="ok" label="승인" />
                  <ActionButton tone="warn" label="보완 요청" />
                  <ActionButton tone="alert" label="고위험 지정" />
                  <ActionButton tone="neutral" label="실사 요청" />
                </div>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone: 'info' | 'ok' | 'warn' | 'alert';
}) {
  const toneStyle = {
    info: 'border-blue-300 bg-blue-50 text-blue-700',
    ok: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    warn: 'border-orange-300 bg-orange-50 text-orange-700',
    alert: 'border-red-300 bg-red-50 text-red-700',
  }[tone];
  return (
    <div className={clsx('rounded-xs border px-4 py-4 shadow-control', toneStyle)}>
      <div className="text-xs font-semibold text-ink-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="num-mono text-2xl font-bold">{value}</span>
        {unit && <span className="text-xs font-semibold text-ink-500">{unit}</span>}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xs border border-ink-700 bg-ink-800/50 p-3">
      <div className="text-[11px] text-ink-500">{label}</div>
      <div className="mt-1 truncate text-sm font-bold text-ink-100">{value}</div>
    </div>
  );
}

function Signal({ title, desc, tone }: { title: string; desc: string; tone: 'ok' | 'warn' }) {
  return (
    <div className={clsx('rounded-xs border p-3', tone === 'ok' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
      <div className="flex items-center gap-2 text-sm font-bold text-ink-100">
        {tone === 'ok' ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <ShieldAlert className="h-4 w-4 text-amber-700" />}
        {title}
      </div>
      <p className="mt-1.5 text-[11px] leading-5 text-ink-500">{desc}</p>
    </div>
  );
}

function ActionButton({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'alert' | 'neutral' }) {
  const style = {
    ok: 'border-emerald-300 text-emerald-800 hover:bg-emerald-50',
    warn: 'border-amber-300 text-amber-800 hover:bg-amber-50',
    alert: 'border-red-300 text-red-800 hover:bg-red-50',
    neutral: 'border-ink-700 text-ink-300 hover:bg-ink-800',
  }[tone];
  return <button type="button" className={clsx('rounded-xs border bg-white px-3 py-2 text-xs font-semibold transition-colors', style)}>{label}</button>;
}
