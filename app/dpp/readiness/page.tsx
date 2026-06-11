'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import TopStatCard from '@/components/TopStatCard';
import { productInstances, dppRecords } from '@/lib/data';
import { CheckCircle2, CircleAlert, FileBadge, LockKeyhole, Send, UserCheck } from 'lucide-react';
import clsx from 'clsx';

const readinessRows = [
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

const statusMeta = {
  issued: { label: '발행 완료', tone: 'ok' as const },
  ready: { label: '발행 가능', tone: 'ok' as const },
  blocked: { label: '발행 보류', tone: 'alert' as const },
  in_progress: { label: '검증 중', tone: 'info' as const },
  pending: { label: '대기', tone: 'warn' as const },
};

const checkMeta = {
  pass: { label: '충족', tone: 'ok' as const },
  review: { label: '확인 필요', tone: 'warn' as const },
  fail: { label: '미충족', tone: 'alert' as const },
};

const severityTone = {
  medium: 'warn',
  high: 'alert',
  critical: 'alert',
} as const;

export default function DppReadinessPage() {
  const pendingInstances = productInstances.filter(item => item.dppStatus !== 'issued');
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
        description="제품별 DPP 발행 가능 여부와 blocker를 확인하고 발행 전 조치를 연결하는 화면"
        badge="P1"
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric label="발행 완료" value={stats.issued} unit="건" tone="ok" />
          <Metric label="발행 가능" value={stats.ready} unit="건" tone="ok" />
          <Metric label="발행 보류" value={stats.blocked} unit="건" tone="alert" />
          <Metric label="남은 Blocker" value={stats.blockers} unit="건" tone="warn" />
        </div>

        <Card title="Readiness 판단 기준" subtitle="승인된 결과만 DPP 발행 조건에 반영">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {['필수 데이터 완성도', '자재 규제 검증', '협력사 신뢰성', '실사 미해결 이슈', 'HITL 대기'].map(item => (
              <div key={item} className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-500" />
                  {item}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-6">
          <Card title="발행 대기 제품" subtitle="DPP 미발행 제품과 readiness 상태">
            <div className="space-y-2">
              {readinessRows.map(row => {
                const instance = productInstances.find(item => item.serialNumber === row.serialNumber);
                return (
                  <button
                    key={row.serialNumber}
                    onClick={() => setSelectedSerial(row.serialNumber)}
                    className={clsx(
                      'w-full rounded-xs border p-3 text-left transition-colors',
                      selectedSerial === row.serialNumber
                        ? 'border-accent-500/70 bg-accent-500/8'
                        : 'border-ink-700/60 bg-ink-900/30 hover:bg-ink-800/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink-100 num-mono">{row.serialNumber}</div>
                        <div className="text-sm text-ink-100 mt-1 truncate">{instance?.modelName ?? row.serialNumber}</div>
                        <div className="text-[11px] text-ink-500">{instance?.destination} · {instance?.producedAt}</div>
                      </div>
                      <Badge tone={statusMeta[row.status as keyof typeof statusMeta].tone}>{statusMeta[row.status as keyof typeof statusMeta].label}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-ink-700 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full', row.readiness >= 90 ? 'bg-emerald-500' : row.readiness >= 75 ? 'bg-amber-500' : 'bg-red-500')}
                          style={{ width: `${row.readiness}%` }}
                        />
                      </div>
                      <span className="text-xs text-ink-200 num-mono w-10 text-right">{row.readiness}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            <Card
              title={selectedInstance?.modelName ?? selected.serialNumber}
              subtitle={`${selected.serialNumber} · ${selectedInstance?.destination ?? '-'} destination`}
              action={<Badge tone={statusMeta[selected.status as keyof typeof statusMeta].tone}>{statusMeta[selected.status as keyof typeof statusMeta].label}</Badge>}
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
                <Mini label="Readiness" value={`${selected.readiness}%`} />
                <Mini label="담당자" value={selected.owner} />
                <Mini label="생산일" value={selectedInstance?.producedAt ?? '-'} />
                <Mini label="Blocker" value={`${selected.blockers.length}건`} />
              </div>

              <div className="space-y-2">
                {selected.checks.map(check => (
                  <div key={check.label} className="flex items-center justify-between rounded-xs border border-ink-700/60 bg-ink-900/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      {check.status === 'pass'
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        : <CircleAlert className="w-3.5 h-3.5 text-amber-400" />}
                      <span className="text-xs text-ink-200">{check.label}</span>
                    </div>
                    <Badge tone={checkMeta[check.status as keyof typeof checkMeta].tone}>{checkMeta[check.status as keyof typeof checkMeta].label}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="발행 Blocker" subtitle="해소 전까지 DPP 발행을 보류하는 항목">
              {selected.blockers.length > 0 ? (
                <div className="space-y-3">
                  {selected.blockers.map(blocker => (
                    <div key={blocker.key} className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <LockKeyhole className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <div className="text-sm font-semibold text-ink-100">{blocker.label}</div>
                          </div>
                          <div className="text-[11px] text-ink-500 mt-2">{blocker.source} · {blocker.owner} · {blocker.due}</div>
                        </div>
                        <Badge tone={severityTone[blocker.severity as keyof typeof severityTone]}>{blocker.severity}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xs border border-emerald-700/30 bg-emerald-500/5 p-3 text-xs text-ink-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  발행을 막는 blocker가 없습니다.
                </div>
              )}
            </Card>

            <Card title="발행 전 액션" subtitle="blocker 해소 또는 DPP 발행으로 연결">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Action icon={Send} label="보완 요청" tone="warn" />
                <Action icon={UserCheck} label="HITL 요청" tone="neutral" />
                <Action icon={CircleAlert} label="조치 보드" tone="alert" />
                <Action icon={FileBadge} label="DPP 발행" tone={selected.blockers.length > 0 ? 'disabled' : 'ok'} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: 'ok' | 'warn' | 'alert' }) {
  return <TopStatCard label={label} value={value} unit={unit} tone={tone} />;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-2">
      <div className="text-[10px] text-ink-500">{label}</div>
      <div className="text-xs font-semibold text-ink-100 mt-1 truncate">{value}</div>
    </div>
  );
}

function Action({ icon: Icon, label, tone }: { icon: any; label: string; tone: 'ok' | 'warn' | 'alert' | 'neutral' | 'disabled' }) {
  const style = {
    ok: 'border-emerald-700/40 text-emerald-500 hover:bg-emerald-500/10',
    warn: 'border-amber-700/40 text-amber-400 hover:bg-amber-500/10',
    alert: 'border-red-700/40 text-red-400 hover:bg-red-500/10',
    neutral: 'border-ink-700 text-ink-300 hover:bg-ink-800',
    disabled: 'border-ink-700 text-ink-600 cursor-not-allowed opacity-60',
  }[tone];
  return (
    <button disabled={tone === 'disabled'} className={clsx('inline-flex items-center justify-center gap-2 rounded-xs border px-3 py-2 text-xs font-semibold transition-colors', style)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
