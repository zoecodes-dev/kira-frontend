'use client';

import { useRef, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  FileText,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import Badge from '@/components/Badge';
import PageHeader from '@/components/PageHeader';
import TopStatCard from '@/components/TopStatCard';
import { getSupplierName, supplierRiskProfiles } from '@/lib/supplier-detail-data';

type AuditStatus = 'blocked' | 'capa' | 'scheduled' | 'closed';
type AuditFilter = 'all' | AuditStatus | 'missingReport';
type FindingSeverity = 'critical' | 'warn';

interface Finding {
  severity: FindingSeverity;
  text: string;
}

interface CapaTask {
  task: string;
  owner: string;
  due: string;
  status: '검토 중' | '미조치' | '진행 중' | '완료';
}

interface DueDiligenceAudit {
  id: string;
  supplierId: string;
  supplierAlias: string;
  factoryId: string;
  factoryName: string;
  factoryType: string;
  type: string;
  scope: string[];
  status: AuditStatus;
  result: string;
  score: number | null;
  plannedAt: string;
  completedAt: string | null;
  auditor: string;
  report: string | null;
  reportSize?: string;
  findings: Finding[];
  capa: CapaTask[];
}

const audits: DueDiligenceAudit[] = [
  {
    id: 'DD-2026-002',
    supplierId: 'S-REF-002',
    supplierAlias: 'Ganzhou Refinery',
    factoryId: 'F-013',
    factoryName: 'Ganzhou Processing Plant',
    factoryType: '정련소',
    type: '문서 실사',
    scope: ['FEOC', '환경', '공급망 추적'],
    status: 'blocked',
    result: '부적합',
    score: 32,
    plannedAt: '2026-05-20',
    completedAt: '2026-05-15',
    auditor: '원청사 ESG팀',
    report: 'ganzhou_feoc_review.pdf',
    reportSize: '1.2 MB',
    findings: [
      { severity: 'critical', text: 'FEOC 직접 지분 41.2% 정황이 확인되어 즉시 검토가 필요합니다.' },
      { severity: 'warn', text: 'ISO 14001 환경 경영 시스템 인증이 만료되어 최신 갱신본 제출이 필요합니다.' },
      { severity: 'warn', text: '상위 광물 추적 시스템이 미구축되어 원산지 불투명 리스크가 남아 있습니다.' },
    ],
    capa: [
      { task: 'FEOC 지분 구조 관계도 원본 및 증빙 재제출', owner: '협력사 재무', due: '2026-05-30', status: '검토 중' },
      { task: '규제 회피를 위한 대체 공급망 시나리오 검토', owner: '구매 전략팀', due: '2026-06-05', status: '미조치' },
    ],
  },
  {
    id: 'DD-2026-001',
    supplierId: 'S-MINE-002',
    supplierAlias: 'Katanga Mining',
    factoryId: 'F-017',
    factoryName: 'Katanga Cobalt Mine',
    factoryType: '광산',
    type: '현장 실사',
    scope: ['인권', '아동노동', '광산 안전'],
    status: 'capa',
    result: '조건부 통과',
    score: 54,
    plannedAt: '2026-05-28',
    completedAt: '2026-05-09',
    auditor: 'Bettercoal 현장 감사팀',
    report: 'katanga_site_audit_2026.pdf',
    reportSize: '3.8 MB',
    findings: [
      { severity: 'warn', text: '아동노동 감사 보고서 원본 보완이 필요합니다.' },
      { severity: 'warn', text: '커뮤니티 합의서 갱신이 지연되었습니다.' },
      { severity: 'warn', text: '광산 안전 교육 기록 일부가 누락되었습니다.' },
    ],
    capa: [
      { task: '아동노동 감사 원본 제출', owner: '협력사 CSR 담당자', due: '2026-06-10', status: '진행 중' },
      { task: '커뮤니티 합의서 갱신본 제출', owner: '협력사 법무', due: '2026-06-18', status: '진행 중' },
    ],
  },
  {
    id: 'DD-2026-004',
    supplierId: 'S-CAM-002',
    supplierAlias: 'CAM Partner CN',
    factoryId: 'F-008',
    factoryName: 'Yantai Cathode Plant',
    factoryType: '양극재',
    type: '원격 실사',
    scope: ['근로시간', 'FEOC', '원산지'],
    status: 'scheduled',
    result: '예정',
    score: null,
    plannedAt: '2026-06-04',
    completedAt: null,
    auditor: 'KPMG China',
    report: null,
    findings: [
      { severity: 'warn', text: '초과근무 개선조치 확인이 예정되어 있습니다.' },
      { severity: 'warn', text: '국영기업 간접 지분 확인이 예정되어 있습니다.' },
    ],
    capa: [],
  },
  {
    id: 'DD-2026-003',
    supplierId: 'S-CAM-001',
    supplierAlias: 'POS Cathode',
    factoryId: 'F-005',
    factoryName: 'Pohang Cathode Line',
    factoryType: '양극재',
    type: '정기 감사',
    scope: ['환경', '공정 문서', '재활용 함량'],
    status: 'closed',
    result: '통과',
    score: 88,
    plannedAt: '2026-04-20',
    completedAt: '2026-04-23',
    auditor: 'Bureau Veritas Korea',
    report: 'pos_cathode_audit_2026.pdf',
    reportSize: '2.1 MB',
    findings: [
      { severity: 'warn', text: '공정도 4단계 문서 최신화가 필요합니다.' },
    ],
    capa: [
      { task: '공정도 PDF 업데이트', owner: 'POS 품질팀', due: '2026-05-15', status: '완료' },
    ],
  },
];

const statusMeta: Record<AuditStatus, {
  label: string;
  tone: 'ok' | 'warn' | 'alert' | 'info' | 'neutral';
  text: string;
  row: string;
}> = {
  blocked: {
    label: '차단 후보',
    tone: 'alert',
    text: 'text-red-700',
    row: 'border-l-2 border-red-500 bg-red-50/60',
  },
  capa: {
    label: '조치 진행',
    tone: 'warn',
    text: 'text-orange-700',
    row: 'border-l-2 border-orange-500 bg-orange-50/50',
  },
  scheduled: {
    label: '예정',
    tone: 'info',
    text: 'text-blue-700',
    row: 'border-l-2 border-blue-500 bg-blue-50/40',
  },
  closed: {
    label: '종결',
    tone: 'ok',
    text: 'text-emerald-700',
    row: 'border-l-2 border-emerald-500 bg-emerald-50/40',
  },
};

const filterOptions: { value: AuditFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'blocked', label: '차단 후보' },
  { value: 'capa', label: '조치 진행' },
  { value: 'missingReport', label: '보고서 미등록' },
];

const processSteps = ['대상 선정', '자료 요청', '보고서 등록', 'CAPA 배정', '완료 승인'];

function getSupplierLabel(audit: DueDiligenceAudit) {
  return getSupplierName(audit.supplierId)?.shortNameEn ?? audit.supplierAlias;
}

function getCapaTone(status: CapaTask['status']) {
  if (status === '완료') return 'ok';
  if (status === '미조치') return 'alert';
  return 'warn';
}

export default function DueDiligencePage() {
  const [selectedId, setSelectedId] = useState(audits[0].id);
  const [filter, setFilter] = useState<AuditFilter>('all');
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = audits.find(audit => audit.id === selectedId) ?? audits[0];
  const risk = supplierRiskProfiles.find(item => item.supplierId === selected.supplierId);

  const stats = useMemo(() => ({
    total: audits.length,
    blocked: audits.filter(item => item.status === 'blocked').length,
    capa: audits.filter(item => item.status === 'capa' || item.capa.some(task => task.status !== '완료')).length,
    closed: audits.filter(item => item.status === 'closed').length,
  }), []);

  const filteredAudits = useMemo(() => {
    const query = search.trim().toLowerCase();
    return audits.filter(audit => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'missingReport' ? !audit.report : audit.status === filter);
      const matchesSearch = !query || [
        audit.id,
        audit.supplierAlias,
        audit.factoryId,
        audit.factoryName,
        audit.type,
        getSupplierLabel(audit),
      ].join(' ').toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  return (
    <>
      <PageHeader
        title="공급망 실사 관리"
        description="실사 계획, 보고서 검증, 부적합 지적사항과 개선조치(CAPA)를 한 화면에서 추적합니다."
        badge="P0"
        actions={
          <button
            type="button"
            onClick={() => {
              const name = window.prompt('실사 계획 ID를 입력하세요 (예: DD-2026-005)');
              if (name) window.alert(`실사 계획 "${name}" 생성 요청이 접수되었습니다.`);
            }}
            className="inline-flex items-center gap-2 rounded-xs border border-accent-700/40 bg-accent-50 px-3 py-2 text-xs font-bold text-accent-700 hover:border-accent-600 hover:bg-accent-100"
          >
            <Plus className="h-3.5 w-3.5" />
            실사 계획 생성
          </button>
        }
      />

      <main className="space-y-5 p-6">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <TopStatCard label="전체 실사" value={stats.total} unit="건" tone="neutral" />
          <TopStatCard label="차단 후보" value={stats.blocked} unit="건" tone="alert" />
          <TopStatCard label="CAPA 진행" value={stats.capa} unit="건" tone="warn" />
          <TopStatCard label="종결 완료" value={stats.closed} unit="건" tone="ok" />
        </section>

        <section className="rounded-sm border border-ink-700 bg-white p-3 shadow-control">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={clsx(
                    'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                    filter === option.value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-ink-700 bg-white text-ink-400 hover:border-accent-500 hover:text-accent-700',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="flex w-full items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2 focus-within:border-accent-500 lg:w-80">
              <Search className="h-4 w-4 text-ink-500" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-500"
                placeholder="협력사, 실사 ID, 공장 검색"
              />
            </label>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[720px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between gap-4 border-b border-ink-700 bg-ink-800/60 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-bold text-ink-100">실사 목록</h2>
                <p className="mt-1 text-xs text-ink-500">위험 공급사와 후속 조치 지연 건을 통합 비교합니다.</p>
              </div>
              <Badge tone="warn">조치 필요 {stats.blocked + stats.capa}건</Badge>
            </div>

            <div className="overflow-x-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink-700 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                    <th className="px-4 py-3">실사 ID</th>
                    <th className="px-3 py-3">협력사 / 공장</th>
                    <th className="px-3 py-3">상태</th>
                    <th className="px-3 py-3">결과</th>
                    <th className="px-3 py-3 text-center">점수</th>
                    <th className="px-3 py-3 text-center">CAPA</th>
                    <th className="px-3 py-3">보고서</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700/50 text-xs">
                  {filteredAudits.map(audit => {
                    const active = audit.id === selected.id;
                    const meta = statusMeta[audit.status];
                    return (
                      <tr
                        key={audit.id}
                        onClick={() => setSelectedId(audit.id)}
                        className={clsx(
                          'cursor-pointer transition-colors hover:bg-ink-800/60',
                          active ? meta.row : 'bg-white',
                        )}
                      >
                        <td className={clsx('px-4 py-3 font-bold num-mono', active ? 'text-accent-700' : 'text-ink-400')}>
                          {audit.id}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-bold text-ink-100">{audit.supplierAlias}</div>
                          <div className="mt-0.5 text-[11px] text-ink-500">{audit.factoryId} · {audit.factoryType}</div>
                        </td>
                        <td className="px-3 py-3"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                        <td className={clsx('px-3 py-3 font-semibold', meta.text)}>{audit.result}</td>
                        <td className={clsx('px-3 py-3 text-center font-bold num-mono', audit.score ? meta.text : 'text-ink-500')}>
                          {audit.score ?? '-'}
                        </td>
                        <td className={clsx('px-3 py-3 text-center font-bold num-mono', audit.capa.length ? meta.text : 'text-ink-500')}>
                          {audit.capa.length > 0 ? `${audit.capa.length}건` : '0건'}
                        </td>
                        <td className="px-3 py-3">
                          {audit.report ? (
                            <span className="inline-flex items-center gap-1.5 text-ink-400">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              등록
                            </span>
                          ) : (
                            <Badge tone="neutral">대기</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="min-w-0 space-y-5 rounded-sm border border-ink-700 bg-white p-5 shadow-control">
            <div className="flex items-start justify-between gap-4 border-b border-ink-700 pb-4">
              <div>
                <div className={clsx('text-[10px] font-bold tracking-wider num-mono', statusMeta[selected.status].text)}>
                  {selected.id} · {selected.type}
                </div>
                <h3 className="mt-1 text-lg font-bold text-ink-100">{selected.supplierAlias}</h3>
                <p className="mt-1 text-xs text-ink-500">{selected.factoryName} ({selected.factoryId})</p>
              </div>
              <Badge tone={statusMeta[selected.status].tone}>{statusMeta[selected.status].label}</Badge>
            </div>

            <section>
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div className={clsx(
                  'rounded-xs border p-3',
                  selected.status === 'blocked' ? 'border-red-200 bg-red-50' :
                  selected.status === 'capa' ? 'border-orange-200 bg-orange-50' :
                  selected.status === 'closed' ? 'border-emerald-200 bg-emerald-50' :
                  'border-blue-200 bg-blue-50',
                )}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">실사 점수</div>
                  <div className={clsx('mt-1 text-2xl font-bold num-mono', statusMeta[selected.status].text)}>
                    {selected.score ?? '-'}
                  </div>
                </div>
                <div className={clsx(
                  'rounded-xs border p-3',
                  risk?.riskLevel === 'critical' || risk?.riskLevel === 'high'
                    ? 'border-red-200 bg-red-50'
                    : risk?.riskLevel === 'medium'
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-emerald-200 bg-emerald-50',
                )}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">위험도 점수</div>
                  <div className={clsx(
                    'mt-1 text-2xl font-bold num-mono',
                    risk?.riskLevel === 'critical' || risk?.riskLevel === 'high'
                      ? 'text-red-700'
                      : risk?.riskLevel === 'medium'
                        ? 'text-orange-700'
                        : 'text-emerald-700',
                  )}>
                    {risk?.overallRiskScore ?? '-'}
                  </div>
                </div>
              </div>

              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">실사 요약</h4>
              <div className="grid grid-cols-2 gap-2">
                <Mini label="실사기관" value={selected.auditor} />
                <Mini label="완료일자" value={selected.completedAt ?? selected.plannedAt} />
                <Mini label="평가범위" value={selected.scope.join(' · ')} />
                <Mini label="시스템 위험도" value={risk?.riskLevel ?? '-'} valueClassName={selected.status === 'blocked' ? 'text-red-700' : undefined} />
              </div>
            </section>

            <section>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">주요 발견 및 위반 사항</h4>
              <div className="space-y-2">
                {selected.findings.map(finding => (
                  <div
                    key={finding.text}
                    className={clsx(
                      'flex items-start gap-2 rounded-xs border p-3 text-xs',
                      finding.severity === 'critical'
                        ? 'border-red-200 bg-red-50 text-red-800'
                        : 'border-orange-200 bg-orange-50 text-orange-800',
                    )}
                  >
                    {finding.severity === 'critical' ? (
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                    ) : (
                      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-600" />
                    )}
                    <span className="leading-5">{finding.text}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">검증 보고서</h4>
              {selected.report ? (
                <div
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xs border border-ink-700 bg-slate-50 px-3 py-2 text-xs hover:border-accent-500"
                  onClick={() => window.open(`/api/files/${selected.report}`, '_blank')}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-red-600" />
                    <span className="truncate font-semibold text-ink-100 num-mono">{selected.report}</span>
                  </div>
                  <span className="shrink-0 text-[11px] text-ink-500">{selected.reportSize}</span>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) window.alert(`"${file.name}" 업로드 완료`);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xs border border-dashed border-ink-700 px-3 py-3 text-xs font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    보고서 업로드
                  </button>
                </>
              )}
            </section>

            <section className="border-t border-ink-700 pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-100">시정 조치 과제 (CAPA)</h4>
                <Badge tone="neutral">{selected.capa.length}개 태스크</Badge>
              </div>

              <div className="space-y-2">
                {selected.capa.length > 0 ? selected.capa.map(item => (
                  <div key={item.task} className="flex items-start justify-between gap-4 rounded-xs border border-ink-700 bg-white p-3 text-xs">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-ink-100">{item.task}</div>
                      <div className="mt-1 text-[11px] text-ink-500">
                        {item.owner} · 기한 <span className="num-mono">{item.due}</span>
                      </div>
                    </div>
                    <Badge tone={getCapaTone(item.status)}>{item.status}</Badge>
                  </div>
                )) : (
                  <div className="flex items-center gap-2 rounded-xs border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    등록된 개선조치가 없습니다.
                  </div>
                )}
              </div>
            </section>
          </aside>
        </section>

        <details className="rounded-sm border border-dashed border-ink-700 bg-white p-4 text-xs text-ink-500 shadow-control">
          <summary className="cursor-pointer select-none font-bold text-ink-100 outline-none">
            실사 운영 표준 프로세스 보기
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {processSteps.map((step, index) => (
              <span key={step} className="rounded-full border border-ink-700 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-ink-400">
                {index + 1}. {step}
              </span>
            ))}
          </div>
        </details>
      </main>
    </>
  );
}

function Mini({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xs border border-ink-700 bg-slate-50 p-3">
      <div className="text-[11px] font-semibold text-ink-500">{label}</div>
      <div className={clsx('mt-1 truncate text-xs font-bold text-ink-100', valueClassName)}>
        {value}
      </div>
    </div>
  );
}
