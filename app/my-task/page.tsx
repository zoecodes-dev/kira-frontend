'use client';

import { useMemo, useState, useEffect } from 'react';
import { getActions, type ActionItem } from '@/lib/api';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import TabBar from '@/components/TabBar';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import {
  AlertTriangle, CheckCircle2, Clock3, FileCheck2,
  ShieldAlert, UserCheck, ArrowRight, Bell, X,
} from 'lucide-react';
import clsx from 'clsx';

type TaskStatus = 'today' | 'overdue' | 'waiting' | 'done';
type TaskType = 'submission_review' | 'risk_action' | 'hitl' | 'reminder' | 'dpp_blocker' | 'due_diligence';
type MetricKey = 'active' | 'overdue' | 'today' | 'waiting';

type Task = {
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
};

const _MOCK_TASKS: Task[] = [
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
    source: '공급망 실사 관리',
    targetHref: '/submission-review?tab=dd',
    targetLabel: '실사 관리로 이동',
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
    targetHref: '/submission-review?tab=dd',
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

const metricMeta: Record<MetricKey, { label: string }> = {
  active: { label: '진행 업무' },
  overdue: { label: '기한 초과' },
  today: { label: '오늘 처리' },
  waiting: { label: '대기' },
};

const taskFilters: Array<['all' | TaskStatus, string]> = [
  ['all', '전체'],
  ['overdue', '초과'],
  ['today', '오늘'],
  ['waiting', '대기'],
  ['done', '완료'],
];

const priorityOrder: Record<Task['priority'], number> = { critical: 0, high: 1, medium: 2, low: 3 };
const sortByPriority = (items: Task[]) =>
  [...items].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (b.status === 'done' && a.status !== 'done') return -1;
    const p = priorityOrder[a.priority] - priorityOrder[b.priority];
    return p !== 0 ? p : a.due.localeCompare(b.due);
  });
const sortByDueAsc = (items: Task[]) => [...items].sort((a, b) => a.due.localeCompare(b.due));
const getTodayKey = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};
const isOverdue = (task: Task, todayKey: string) => task.status === 'overdue' || task.due < todayKey;

const _STATUS_FROM_API: Record<string, TaskStatus> = {
  open: 'waiting', sent: 'waiting', review: 'today', resolved: 'done', blocked: 'overdue',
};
const _TYPE_FROM_API: Record<string, TaskType> = {
  SUB: 'submission_review', DD: 'due_diligence', HITL: 'hitl',
};
const _HREF_FROM_TYPE: Record<TaskType, string> = {
  submission_review: '/submission-review', risk_action: '/submission-review?tab=dd',
  hitl: '/hitl', reminder: '/submission-status', dpp_blocker: '/dpp/readiness',
  due_diligence: '/submission-review?tab=dd',
};

function adaptAction(item: ActionItem): Task {
  const type = _TYPE_FROM_API[item.sourceType] ?? 'submission_review';
  const status = _STATUS_FROM_API[item.actionStatus] ?? 'waiting';
  return {
    id: item.actionId,
    title: item.title,
    type,
    status,
    priority: 'medium',
    owner: item.assignedTo ?? '-',
    due: item.dueDate?.slice(0, 10) ?? '-',
    source: item.sourceType,
    targetHref: _HREF_FROM_TYPE[type],
    targetLabel: `${type} 이동`,
    description: item.title,
  };
}

// 자료 요청 작업 구역 (구 자료요청 업무 보드의 핵심을 흡수 — 상태별 요청 + 액션)
type RequestStatus = 'overdue' | 'submitted' | 'dueSoon' | 'progress';
const requestStatusMeta: Record<RequestStatus, { label: string; chip: string; dot: string }> = {
  overdue:   { label: '기한 초과', chip: 'border-alert-border bg-alert-bg text-alert-text', dot: 'bg-alert-solid' },
  submitted: { label: '검토 대기', chip: 'border-ok-border bg-ok-bg text-ok-text', dot: 'bg-ok-solid' },
  dueSoon:   { label: '만료 임박', chip: 'border-warn-border bg-warn-bg text-warn-text', dot: 'bg-warn-solid' },
  progress:  { label: '입력 중', chip: 'border-info-border bg-info-bg text-info-text', dot: 'bg-info-solid' },
};

interface DataRequest {
  supplier: string;
  supplierId: string;
  title: string;
  status: RequestStatus;
  due: string;
  missing: number;
}
const dataRequests: DataRequest[] = [
  { supplier: 'DRC Mining Co.', supplierId: 'S-MINE-002', title: '코발트 원광 원산지·인권 실사 자료', status: 'overdue', due: '2026-06-03', missing: 4 },
  { supplier: 'Ganzhou Rare Metals', supplierId: 'S-REF-002', title: '정제 코발트 FEOC·소유 구조 확인', status: 'dueSoon', due: '2026-06-07', missing: 2 },
  { supplier: 'POS Cathode Materials', supplierId: 'S-CAM-001', title: 'NCM811 양극재 공정·탄소 배출 산정서', status: 'submitted', due: '2026-06-12', missing: 3 },
  { supplier: 'QZ Precursor', supplierId: 'S-PRE-001', title: '전구체 배합 데이터·제조 공정도', status: 'progress', due: '2026-06-14', missing: 2 },
];

function RequestArea() {
  const order: RequestStatus[] = ['overdue', 'submitted', 'dueSoon', 'progress'];
  const counts = order.map(s => ({ s, n: dataRequests.filter(r => r.status === s).length }));
  return (
    <section className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 bg-ink-800/60 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-ink-100">자료 요청</h2>
          <p className="mt-0.5 text-sm text-ink-500">협력사 자료 요청의 기한·제출·검토 대기를 한 곳에서 처리</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {counts.map(({ s, n }) => (
            <span key={s} className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold', requestStatusMeta[s].chip)}>
              {requestStatusMeta[s].label} {n}
            </span>
          ))}
        </div>
      </div>
      <div className="divide-y divide-ink-700/30">
        {dataRequests.map(req => {
          const meta = requestStatusMeta[req.status];
          const reviewMode = req.status === 'submitted';
          const href = reviewMode
            ? '/submission-review'
            : `/suppliers/check-info?supplierId=${req.supplierId}&supplier=${encodeURIComponent(req.supplier)}`;
          return (
            <div key={req.supplierId} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
              <span className={clsx('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-bold text-ink-100">{req.supplier}</span>
                  <span className={clsx('rounded-full border px-2 py-0.5 text-[10px] font-bold', meta.chip)}>{meta.label}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-ink-500">{req.title}</div>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <div className="text-[11px] text-ink-500">마감 {req.due}</div>
                <div className="text-[11px] text-ink-500">누락 {req.missing}건</div>
              </div>
              <Link
                href={href}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
              >
                {reviewMode ? '검토' : '재요청·확인'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function MyTaskPage() {
  const [tasks, setTasks] = useState<Task[]>(_MOCK_TASKS);
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const [metricModal, setMetricModal] = useState<MetricKey | null>(null);

  useEffect(() => {
    getActions().then(items => {
      if (items && items.length > 0) setTasks(items.map(adaptAction));
    }).catch(() => {/* mock 유지 */});
  }, []);

  const filtered = sortByPriority(filter === 'all' ? tasks : tasks.filter(task => task.status === filter));

  const stats = useMemo(() => ({
    total: tasks.filter(task => task.status !== 'done').length,
    overdue: tasks.filter(task => task.status === 'overdue').length,
    today: tasks.filter(task => task.status === 'today').length,
    waiting: tasks.filter(task => task.status === 'waiting').length,
  }), [tasks]);

  const metricTasks = useMemo<Record<MetricKey, typeof tasks>>(() => ({
    active: sortByDueAsc(tasks.filter(task => task.status !== 'done')),
    overdue: sortByDueAsc(tasks.filter(task => task.status === 'overdue')),
    today: sortByDueAsc(tasks.filter(task => task.status === 'today')),
    waiting: sortByDueAsc(tasks.filter(task => task.status === 'waiting')),
  }), [tasks]);

  const priorityTasks = useMemo(
    () => sortByDueAsc(tasks.filter(task => task.status !== 'done' && (task.priority === 'critical' || task.priority === 'high'))),
    [tasks],
  );
  const todayKey = useMemo(getTodayKey, []);
  const priorityOverdueCount = priorityTasks.filter(task => isOverdue(task, todayKey)).length;
  const [view, setView] = useState<'list' | 'request'>('list');

  return (
    <>
      <PageHeader
        title="My Task"
        description="담당자 개인이 오늘 처리해야 할 승인, 반려, 리마인드, 리스크 조치를 모아 보는 화면"
        badge="P1"
      />

      <div className="px-8 pt-6">
        <TabBar<'list' | 'request'>
          tabs={[{ key: 'list', label: '내 업무 목록' }, { key: 'request', label: '자료 요청' }]}
          value={view}
          onChange={setView}
        />
      </div>

      {view === 'request' ? (
        <div className="p-8 pt-4">
          <RequestArea />
        </div>
      ) : (
      <div className="p-8 pt-4 space-y-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="진행 업무" value={stats.total} unit="건" tone="info" onClick={() => setMetricModal('active')} />
          <Metric label="기한 초과" value={stats.overdue} unit="건" tone="alert" onClick={() => setMetricModal('overdue')} />
          <Metric label="오늘 처리" value={stats.today} unit="건" tone="warn" onClick={() => setMetricModal('today')} />
          <Metric label="대기" value={stats.waiting} unit="건" tone="neutral" onClick={() => setMetricModal('waiting')} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.85fr] gap-6">
          {/* 내 업무 목록 — 표 */}
          <div className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 bg-ink-800/60 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-ink-100">내 업무 목록</h2>
                <p className="mt-0.5 text-sm text-ink-500">우선순위 · 마감일 순</p>
              </div>
              <div className="flex overflow-hidden rounded-xs border border-ink-700/60">
                {taskFilters.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={clsx(
                      'px-2.5 py-1.5 text-xs font-semibold transition-colors',
                      filter === key ? 'bg-ink-700 text-ink-100' : 'text-ink-500 hover:text-ink-200',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-ink-700/30">
              {filtered.length === 0 && (
                <div className="px-5 py-12 text-center text-sm text-ink-500">해당하는 업무가 없습니다.</div>
              )}
              {filtered.map(task => {
                const meta = typeMeta[task.type];
                const TypeIcon = meta.icon;
                const dot = { critical: 'bg-alert-solid', high: 'bg-alert-solid', medium: 'bg-warn-solid', low: 'bg-ok-solid' }[task.priority];
                const statusCls = { today: 'text-warn-text', overdue: 'text-alert-text', waiting: 'text-ink-400', done: 'text-ok-text' }[task.status];
                return (
                  <button
                    key={task.id}
                    onClick={() => (window.location.href = task.targetHref)}
                    className={clsx(
                      'flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50',
                      task.status === 'done' && 'opacity-50',
                    )}
                  >
                    <span className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', dot)} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold text-ink-100">{task.title}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                        <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-semibold">{meta.label}</span>
                        <span className="opacity-40">·</span>
                        <span className="truncate">{task.description}</span>
                      </div>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <div className={clsx('text-sm font-bold', statusCls)}>{statusMeta[task.status].label}</div>
                      <div className="mt-0.5 text-[11px] text-ink-500">{task.owner} · <span className="num-mono">{task.due}</span></div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-500" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <Card
              title={`오늘의 우선순위 (${priorityTasks.length})`}
              subtitle={priorityOverdueCount > 0 ? `기한 초과 ${priorityOverdueCount}건` : undefined}
            >
              <div className="space-y-3">
                {priorityTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
                    <Clock3 className="w-3.5 h-3.5 text-warn-text shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs font-semibold text-ink-100">{task.title}</div>
                        {isOverdue(task, todayKey) && (
                          <span className="rounded-xs border border-alert-border bg-alert-bg px-1.5 py-0.5 text-[10px] font-bold text-alert-text">
                            기한 초과
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-500 mt-1">{task.owner} · {task.due}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
      )}

      {metricModal && (
        <TaskModal
          title={metricMeta[metricModal].label}
          tasks={metricTasks[metricModal]}
          onClose={() => setMetricModal(null)}
        />
      )}
    </>
  );
}

function Metric({
  label,
  value,
  unit,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  unit: string;
  tone: 'neutral' | 'info' | 'warn' | 'alert';
  onClick: () => void;
}) {
  const color = {
    neutral: 'text-slate-700',
    info: 'text-info-text',
    warn: 'text-warn-text',
    alert: 'text-alert-text',
  }[tone];
  const cardTone = {
    neutral: 'border-slate-300 bg-slate-50/80 hover:border-slate-400',
    info: 'border-info-border bg-info-bg hover:border-info-border',
    warn: 'border-warn-border bg-warn-bg hover:border-warn-border',
    alert: 'border-alert-border bg-alert-bg hover:border-alert-border',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx('rounded-xs border px-4 py-3 text-left transition-colors hover:bg-white', cardTone)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-bold text-ink-100">{label}</span>
        <span className="flex items-baseline gap-2">
          <span className={clsx('text-xl font-bold num-mono', color)}>{value}</span>
          <span className="text-sm font-semibold text-ink-500">{unit}</span>
        </span>
      </div>
    </button>
  );
}

function TaskModal({ title, tasks, onClose }: { title: string; tasks: Task[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-6">
      <div className="w-full max-w-2xl rounded-sm border border-ink-700 bg-white shadow-panel">
        <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-ink-100">{title} {tasks.length}건</h2>
            <p className="mt-1 text-xs text-ink-500">마감일 오름차순으로 정렬된 관련 업무입니다</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xs border border-ink-700 text-ink-500 hover:bg-ink-800 hover:text-ink-100"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-5">
          {tasks.length === 0 ? (
            <div className="rounded-xs border border-dashed border-ink-700 p-8 text-center text-sm text-ink-500">해당 업무가 없습니다</div>
          ) : (
            tasks.map(task => (
              <Link
                key={task.id}
                href={task.targetHref}
                onClick={onClose}
                className="block rounded-xs border border-ink-700 bg-white p-3 transition-colors hover:border-accent-600 hover:bg-accent-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-ink-500 num-mono">{task.id}</span>
                      <Badge tone={statusMeta[task.status].tone}>{statusMeta[task.status].label}</Badge>
                      <Badge tone={priorityTone[task.priority]}>{task.priority}</Badge>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-ink-100">{task.title}</div>
                    <div className="mt-1 text-[11px] leading-5 text-ink-500">{task.owner} · {task.source}</div>
                  </div>
                  <div className="shrink-0 text-[11px] text-ink-500 num-mono">{task.due}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
