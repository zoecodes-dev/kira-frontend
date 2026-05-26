'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import {
  AlertTriangle, CheckCircle2, Clock3, FileCheck2, Send,
  ShieldAlert, UserCheck, ArrowRight, Bell,
} from 'lucide-react';
import clsx from 'clsx';

type TaskStatus = 'today' | 'overdue' | 'waiting' | 'done';
type TaskType = 'submission_review' | 'risk_action' | 'hitl' | 'reminder' | 'dpp_blocker' | 'due_diligence';

const tasks: Array<{
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  owner: string;
  due: string;
  source: string;
  targetHref: string;
  targetLabel: string;
  description: string;
}> = [
  {
    id: 'TASK-001',
    title: 'FEOC 지분 공시 제출자료 보완 요청',
    type: 'submission_review',
    status: 'overdue',
    priority: 'critical',
    owner: '컴플라이언스 이서윤',
    due: '2026-05-30',
    source: '제출 자료 검토',
    targetHref: '/submission-review',
    targetLabel: '제출 자료 검토로 이동',
    description: 'Ganzhou Rare Metals의 직접 지분 41.2% 검증 결과가 DPP 발행을 막고 있습니다.',
  },
  {
    id: 'TASK-002',
    title: '아동노동 감사 보고서 원본 재요청',
    type: 'risk_action',
    status: 'today',
    priority: 'high',
    owner: '구매실사 최하린',
    due: '2026-06-10',
    source: '리스크 조치 보드',
    targetHref: '/risk/actions',
    targetLabel: '조치 보드로 이동',
    description: 'Katanga Cobalt Mining의 공급망 인권 실사 CAPA가 요청 발송 상태입니다.',
  },
  {
    id: 'TASK-003',
    title: 'Conflict Minerals 원산지 HITL 판단',
    type: 'hitl',
    status: 'waiting',
    priority: 'medium',
    owner: 'ESG팀 김민재',
    due: '2026-06-03',
    source: 'HITL 검토',
    targetHref: '/hitl',
    targetLabel: 'HITL 검토로 이동',
    description: 'NCM811 양극재의 코발트 원산지 증빙과 OCR 추출값 검토가 필요합니다.',
  },
  {
    id: 'TASK-004',
    title: '광산 좌표 폴리곤 업로드 리마인드',
    type: 'reminder',
    status: 'today',
    priority: 'high',
    owner: '공급망 데이터팀',
    due: '2026-06-07',
    source: '입력 현황',
    targetHref: '/submission-status',
    targetLabel: '입력 현황으로 이동',
    description: 'Sulawesi Nickel Mine의 EUDR 검증에 필요한 광산 경계 좌표가 누락되어 있습니다.',
  },
  {
    id: 'TASK-005',
    title: 'SN-2026-A1-082451 DPP blocker 확인',
    type: 'dpp_blocker',
    status: 'overdue',
    priority: 'critical',
    owner: 'DPP 운영 박서연',
    due: '2026-05-31',
    source: 'DPP Readiness',
    targetHref: '/dpp/readiness',
    targetLabel: 'DPP Readiness로 이동',
    description: 'FEOC, 대체 공급망, ISO 14001 갱신 blocker가 남아 발행 보류 상태입니다.',
  },
  {
    id: 'TASK-006',
    title: 'POS Cathode 제3자 감사 CAPA 완료 승인',
    type: 'due_diligence',
    status: 'done',
    priority: 'low',
    owner: 'ESG팀 박지훈',
    due: '2026-05-15',
    source: '공급망 실사 관리',
    targetHref: '/due-diligence',
    targetLabel: '실사 관리로 이동',
    description: '공정도 4단계 문서 최신화가 완료되어 CAPA 종료 승인이 필요합니다.',
  },
];

const typeMeta = {
  submission_review: { label: '제출 검토', icon: FileCheck2, tone: 'info' as const },
  risk_action: { label: '리스크 조치', icon: ShieldAlert, tone: 'alert' as const },
  hitl: { label: 'HITL', icon: UserCheck, tone: 'warn' as const },
  reminder: { label: '리마인드', icon: Bell, tone: 'warn' as const },
  dpp_blocker: { label: 'DPP Blocker', icon: AlertTriangle, tone: 'alert' as const },
  due_diligence: { label: '실사', icon: CheckCircle2, tone: 'ok' as const },
};

const statusMeta = {
  today: { label: '오늘 처리', tone: 'warn' as const },
  overdue: { label: '기한 초과', tone: 'alert' as const },
  waiting: { label: '대기', tone: 'info' as const },
  done: { label: '완료', tone: 'ok' as const },
};

const priorityTone = {
  critical: 'alert',
  high: 'alert',
  medium: 'warn',
  low: 'neutral',
} as const;

export default function MyTaskPage() {
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const filtered = filter === 'all' ? tasks : tasks.filter(task => task.status === filter);
  const selected = filtered[0] ?? tasks[0];

  const stats = useMemo(() => ({
    total: tasks.filter(task => task.status !== 'done').length,
    overdue: tasks.filter(task => task.status === 'overdue').length,
    today: tasks.filter(task => task.status === 'today').length,
    waiting: tasks.filter(task => task.status === 'waiting').length,
  }), []);

  return (
    <>
      <PageHeader
        title="My Task"
        description="담당자 개인이 오늘 처리해야 할 승인, 반려, 리마인드, 리스크 조치를 모아 보는 화면"
        badge="P1"
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric label="진행 업무" value={stats.total} unit="건" tone="neutral" />
          <Metric label="기한 초과" value={stats.overdue} unit="건" tone="alert" />
          <Metric label="오늘 처리" value={stats.today} unit="건" tone="warn" />
          <Metric label="대기" value={stats.waiting} unit="건" tone="info" />
        </div>

        <Card title="업무 출처" subtitle="각 task는 원본 관리 화면으로 연결됩니다">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {Object.entries(typeMeta).map(([key, meta]) => {
              const Icon = meta.icon;
              const count = tasks.filter(task => task.type === key).length;
              return (
                <div key={key} className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Icon className="w-4 h-4 text-accent-500" />
                    <span className="text-xs num-mono text-ink-400">{count}</span>
                  </div>
                  <div className="text-xs font-semibold text-ink-100 mt-3">{meta.label}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr] gap-6">
          <Card
            title="내 업무 목록"
            subtitle="우선순위와 마감일 기준으로 처리"
            action={
              <div className="flex rounded-xs border border-ink-700/60 overflow-hidden">
                {[
                  ['all', '전체'],
                  ['overdue', '초과'],
                  ['today', '오늘'],
                  ['waiting', '대기'],
                  ['done', '완료'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as any)}
                    className={clsx(
                      'px-2.5 py-1.5 text-[10px] font-semibold transition-colors',
                      filter === key ? 'bg-ink-700 text-ink-100' : 'text-ink-500 hover:text-ink-300',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="space-y-2">
              {filtered.map(task => {
                const meta = typeMeta[task.type];
                const Icon = meta.icon;
                return (
                  <div key={task.id} className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xs bg-ink-800 border border-ink-700 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-accent-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] text-ink-500 num-mono">{task.id}</span>
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                            <Badge tone={priorityTone[task.priority]}>{task.priority}</Badge>
                          </div>
                          <div className="text-sm font-semibold text-ink-100 mt-2">{task.title}</div>
                          <div className="text-[11px] text-ink-500 mt-1 leading-5">{task.description}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge tone={statusMeta[task.status].tone}>{statusMeta[task.status].label}</Badge>
                        <div className="text-[11px] text-ink-500 mt-2 num-mono">{task.due}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink-700/40 pt-3">
                      <div className="text-[11px] text-ink-500">{task.owner} · {task.source}</div>
                      <Link href={task.targetHref} className="inline-flex items-center gap-1 text-xs font-semibold text-accent-500 hover:text-accent-400">
                        {task.targetLabel}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            <Card title="오늘의 우선순위" subtitle="critical/high 업무를 먼저 처리">
              <div className="space-y-3">
                {tasks
                  .filter(task => task.status !== 'done')
                  .sort((a, b) => {
                    const rank = { critical: 0, high: 1, medium: 2, low: 3 };
                    return rank[a.priority] - rank[b.priority];
                  })
                  .slice(0, 4)
                  .map(task => (
                    <div key={task.id} className="flex items-start gap-3 rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
                      <Clock3 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink-100">{task.title}</div>
                        <div className="text-[11px] text-ink-500 mt-1">{task.owner} · {task.due}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>

            <Card title="업무 처리 원칙" subtitle="My Task는 결과 화면이 아니라 작업 진입점입니다">
              <div className="space-y-3">
                {[
                  '원본 관리 화면에서 승인·반려·조치를 수행한다.',
                  '완료된 업무는 감사 로그와 대시보드에 반영된다.',
                  'DPP blocker와 리스크 조치는 담당자와 마감일을 반드시 가진다.',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2 rounded-xs border border-emerald-700/30 bg-emerald-500/5 p-3">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-ink-300 leading-5">{item}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="빠른 실행" subtitle="자주 쓰는 운영 액션">
              <div className="grid grid-cols-2 gap-2">
                <QuickAction href="/submission-review" icon={FileCheck2} label="자료 검토" />
                <QuickAction href="/risk/actions" icon={ShieldAlert} label="리스크 조치" />
                <QuickAction href="/submission-status" icon={Send} label="리마인드" />
                <QuickAction href="/hitl" icon={UserCheck} label="HITL" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: 'neutral' | 'info' | 'warn' | 'alert' }) {
  const color = {
    neutral: 'text-ink-200',
    info: 'text-blue-400',
    warn: 'text-amber-400',
    alert: 'text-red-400',
  }[tone];
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className={clsx('text-2xl font-bold num-mono mt-2', color)}>{value}<span className="text-sm text-ink-500 ml-1">{unit}</span></div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-xs border border-ink-700 px-3 py-2 text-xs font-semibold text-ink-300 hover:bg-ink-800 hover:text-ink-100 transition-colors">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}
