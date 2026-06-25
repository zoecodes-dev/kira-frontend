'use client';

// DPP 발행 준비도 목록과 선택 제품 상세 분석을 제공하는 화면
import { useMemo, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import TopStatCard from '@/components/TopStatCard';
import { productInstances, dppRecords } from '@/lib/data';
import { CheckCircle2, CircleAlert, FileBadge, LockKeyhole, Send, UserCheck } from 'lucide-react';
import clsx from 'clsx';

type ReadinessStatus = 'ready' | 'blocked';
type CheckStatus = 'pass' | 'review' | 'fail';
type Severity = 'medium' | 'high' | 'critical';

interface ReadinessRow {
  serialNumber: string;
  readiness: number;
  status: ReadinessStatus;
  owner: string;
  blockers: {
    key: string;
    label: string;
    source: string;
    owner: string;
    due: string;
    severity: Severity;
  }[];
  checks: {
    label: string;
    status: CheckStatus;
  }[];
}

const readinessRows: ReadinessRow[] = [
  {
    serialNumber: 'SN-2026-A1-082427',
    readiness: 86,
    status: 'blocked',
    owner: 'ESG팀 김민재',
    blockers: [
      { key: 'origin_certs_valid', label: 'Conflict Minerals 원산지 추가 확인', source: '물질 관리', owner: 'ESG팀 김민재', due: '2026-06-03', severity: 'medium' },
      { key: 'no_open_actions', label: '코발트 원산지 조치 검토 중', source: '리스크 조치 보드', owner: 'ESG팀 김민재', due: '2026-06-03', severity: 'medium' },
    ],
    checks: [
      { label: '필수 데이터 완성도', status: 'pass' },
      { label: '자재 규제 검증', status: 'review' },
      { label: '협력사 신뢰성', status: 'pass' },
      { label: '실사 미해결 이슈', status: 'pass' },
      { label: 'HITL 대기', status: 'pass' },
    ],
  },
  {
    serialNumber: 'SN-2026-A1-082451',
    readiness: 62,
    status: 'blocked',
    owner: '컴플라이언스 이서윤',
    blockers: [
      { key: 'feoc_violation', label: 'FEOC 직접 지분 41.2% 확인 필요', source: '제출 자료 검토', owner: '컴플라이언스 이서윤', due: '2026-05-30', severity: 'critical' },
      { key: 'alternative_supply', label: '대체 코발트 공급망 검토 필요', source: '리스크 조치 보드', owner: '구매 전략팀', due: '2026-06-05', severity: 'critical' },
      { key: 'audit_issue', label: 'ISO 14001 만료 갱신 필요', source: '협력사 신뢰성 평가', owner: 'ESG팀 박지훈', due: '2026-06-01', severity: 'high' },
    ],
    checks: [
      { label: '필수 데이터 완성도', status: 'review' },
      { label: '자재 규제 검증', status: 'fail' },
      { label: '협력사 신뢰성', status: 'fail' },
      { label: '실사 미해결 이슈', status: 'review' },
      { label: 'HITL 대기', status: 'review' },
    ],
  },
  {
    serialNumber: 'SN-2026-A2-082468',
    readiness: 92,
    status: 'ready',
    owner: 'DPP 운영 박서연',
    blockers: [],
    checks: [
      { label: '필수 데이터 완성도', status: 'pass' },
      { label: '자재 규제 검증', status: 'pass' },
      { label: '협력사 신뢰성', status: 'pass' },
      { label: '실사 미해결 이슈', status: 'pass' },
      { label: 'HITL 대기', status: 'pass' },
    ],
  },
];

const statusMeta: Record<ReadinessStatus | 'issued' | 'in_progress' | 'pending', { label: string; tone: 'ok' | 'warn' | 'alert' | 'info' }> = {
  issued: { label: '발행 완료', tone: 'ok' },
  ready: { label: '발행 가능', tone: 'ok' },
  blocked: { label: '발행 보류', tone: 'alert' },
  in_progress: { label: '검증 중', tone: 'info' },
  pending: { label: '대기', tone: 'warn' },
};

const checkMeta: Record<CheckStatus, { label: string; tone: 'ok' | 'warn' | 'alert'; note: string }> = {
  pass: { label: '충족', tone: 'ok', note: '발행 조건에 반영 완료' },
  review: { label: '확인 필요', tone: 'warn', note: '담당자 확인 또는 증빙 보완 필요' },
  fail: { label: '미충족', tone: 'alert', note: '발행 전 조치 필요' },
};

const severityTone: Record<Severity, 'warn' | 'alert'> = {
  medium: 'warn',
  high: 'alert',
  critical: 'alert',
};

const readinessTone = (value: number) =>
  value >= 90 ? 'bg-emerald-500' : value >= 75 ? 'bg-amber-500' : 'bg-red-500';

export default function DppReadinessPage() {
  const [selectedSerial, setSelectedSerial] = useState(readinessRows[0].serialNumber);
  const selected = readinessRows.find(row => row.serialNumber === selectedSerial) ?? readinessRows[0];
  const selectedInstance = productInstances.find(item => item.serialNumber === selected.serialNumber);

  const stats = useMemo(() => ({
    issued: dppRecords.length,
    ready: readinessRows.filter(row => row.status === 'ready').length,
    blocked: readinessRows.filter(row => row.status === 'blocked').length,
    blockers: readinessRows.reduce((sum, row) => sum + row.blockers.length, 0),
  }), []);

  return (
    <>
      <PageHeader
        title="DPP Readiness"
        description="선택 제품의 DPP 발행 준비도와 blocker를 확인하고 발행 전 조치를 연결하는 화면"
        badge="P1"
      />

      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric label="발행 완료" value={stats.issued} unit="건" tone="ok" />
          <Metric label="발행 가능" value={stats.ready} unit="건" tone="ok" />
          <Metric label="발행 보류" value={stats.blocked} unit="건" tone="alert" />
          <Metric label="남은 Blocker" value={stats.blockers} unit="건" tone="warn" />
        </div>

        <div className="space-y-4">
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 bg-slate-50 px-4 py-3">
              <h2 className="text-base font-semibold text-ink-100">발행 대기 제품</h2>
              <p className="mt-1 text-sm text-ink-500">제품 행을 선택하면 아래 분석 패널이 갱신됩니다.</p>
            </div>
            <div className="max-h-[304px] overflow-auto">
              <table className="w-full min-w-[980px]">
                <thead className="sticky top-0 z-10 border-b border-ink-700 bg-white">
                  <tr>
                    <TableHead>Serial</TableHead>
                    <TableHead>제품명</TableHead>
                    <TableHead>목적지</TableHead>
                    <TableHead>Readiness</TableHead>
                    <TableHead>Blocker</TableHead>
                    <TableHead>상태</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700/60">
                  {readinessRows.map(row => {
                    const instance = productInstances.find(item => item.serialNumber === row.serialNumber);
                    const isSelected = selectedSerial === row.serialNumber;

                    return (
                      <tr
                        key={row.serialNumber}
                        onClick={() => setSelectedSerial(row.serialNumber)}
                        className={clsx(
                          'cursor-pointer transition-colors hover:bg-slate-50',
                          isSelected && 'border-l-2 border-l-accent-600 bg-accent-50/50'
                        )}
                      >
                        <td className="px-3 py-3 align-middle text-xs font-semibold text-ink-100 num-mono">{row.serialNumber}</td>
                        <td className="max-w-[220px] px-3 py-3 align-middle text-sm font-semibold text-ink-100">
                          <div className="truncate">{instance?.modelName ?? row.serialNumber}</div>
                        </td>
                        <td className="px-3 py-3 align-middle text-sm text-ink-500">{instance?.destination ?? '-'}</td>
                        <td className="px-3 py-3 align-middle">
                          <ReadinessBar value={row.readiness} />
                        </td>
                        <td className="px-3 py-3 align-middle text-sm font-semibold text-ink-300 num-mono">{row.blockers.length}</td>
                        <td className="px-3 py-3 align-middle">
                          <Badge tone={statusMeta[row.status].tone}>{statusMeta[row.status].label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-700 bg-slate-50 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-semibold text-ink-100">{selectedInstance?.modelName ?? selected.serialNumber}</h2>
                  <Badge tone={statusMeta[selected.status].tone}>{statusMeta[selected.status].label}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-500">
                  <span className="font-semibold text-ink-100 num-mono">{selected.serialNumber}</span>
                  <span>{selectedInstance?.destination ?? '-'} destination</span>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 md:grid-cols-4">
                <Mini label="Readiness" value={`${selected.readiness}%`} />
                <Mini label="담당자" value={selected.owner} />
                <Mini label="생산일" value={selectedInstance?.producedAt ?? '-'} />
                <Mini label="Blocker 수" value={`${selected.blockers.length}건`} />
              </div>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-ink-100">발행 조건 체크리스트</h3>
                <div className="overflow-x-auto rounded-xs border border-ink-700">
                  <table className="w-full min-w-[640px]">
                    <thead className="border-b border-ink-700 bg-slate-50">
                      <tr>
                        <TableHead>조건</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>비고</TableHead>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-700/60">
                      {selected.checks.map(check => (
                        <tr key={check.label}>
                          <td className="px-3 py-2.5 text-sm font-medium text-ink-100">{check.label}</td>
                          <td className="px-3 py-2.5">
                            <Badge tone={checkMeta[check.status].tone}>{checkMeta[check.status].label}</Badge>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-ink-500">{checkMeta[check.status].note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-ink-100">Blocker</h3>
                {selected.blockers.length > 0 ? (
                  <div className="overflow-x-auto rounded-xs border border-ink-700">
                    <table className="w-full min-w-[720px]">
                      <thead className="border-b border-ink-700 bg-slate-50">
                        <tr>
                          <TableHead>Blocker명</TableHead>
                          <TableHead>관련 문서/근거</TableHead>
                          <TableHead>마감일</TableHead>
                          <TableHead>심각도</TableHead>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-700/60">
                        {selected.blockers.map(blocker => (
                          <tr key={blocker.key}>
                            <td className="px-3 py-2.5 text-sm font-semibold text-ink-100">
                              <span className="inline-flex items-center gap-2">
                                <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                {blocker.label}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-sm text-ink-500">{blocker.source}</td>
                            <td className="px-3 py-2.5 text-sm text-ink-500 num-mono">{blocker.due}</td>
                            <td className="px-3 py-2.5">
                              <Badge tone={severityTone[blocker.severity]}>{blocker.severity}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xs border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    발행을 막는 blocker가 없습니다.
                  </div>
                )}
              </section>

              <div className="flex flex-wrap justify-end gap-2 border-t border-ink-700 pt-4">
                <Action icon={Send} label="보완 요청" tone="warn" href="/supply-chain/request-map" />
                <Action icon={UserCheck} label="HITL 요청" tone="neutral" href="/hitl" />
                <Action icon={FileBadge} label="DPP 발행" tone={selected.blockers.length > 0 ? 'disabled' : 'ok'} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-xs font-semibold text-ink-500">{children}</th>;
}

function ReadinessBar({ value }: { value: number }) {
  return (
    <div className="flex min-w-28 items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div className={clsx('h-full rounded-full', readinessTone(value))} style={{ width: `${value}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-bold text-ink-100 num-mono">{value}%</span>
    </div>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: 'ok' | 'warn' | 'alert' }) {
  return <TopStatCard label={label} value={value} unit={unit} tone={tone} />;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xs border border-ink-700 bg-slate-50 p-3">
      <div className="text-xs font-semibold text-ink-500">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-ink-100">{value}</div>
    </div>
  );
}

function Action({ icon: Icon, label, tone, href }: { icon: any; label: string; tone: 'ok' | 'warn' | 'alert' | 'neutral' | 'disabled'; href?: string }) {
  const style = {
    ok: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400',
    alert: 'border-red-200 bg-red-50 text-red-800 hover:border-red-400',
    neutral: 'border-ink-700 bg-white text-ink-400 hover:border-accent-600 hover:text-accent-700',
    disabled: 'border-ink-700 bg-slate-100 text-ink-500 cursor-not-allowed opacity-60',
  }[tone];
  const className = clsx('inline-flex items-center justify-center gap-2 rounded-xs border px-3 py-2 text-sm font-semibold transition-colors', style);
  const content = (
    <>
      <Icon className="h-4 w-4" />
      {label}
    </>
  );

  if (href && tone !== 'disabled') {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={tone === 'disabled'}
      className={className}
    >
      {content}
    </button>
  );
}
