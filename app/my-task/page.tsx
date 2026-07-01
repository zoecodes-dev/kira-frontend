'use client';

import { useState, useEffect } from 'react';
import { createDataRequest, getMyActions, getDataRequests, getSuppliers, type ActionItem, type ApiDataRequest, type SupplierBrief } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import SupplierInputStatusBoard from '@/components/suppliers/SupplierInputStatusBoard';
import HitlReviewCard from '@/components/dashboard/HitlReviewCard';
import RegulationResultsCard, { type RegReviewRow } from '@/components/dashboard/RegulationResultsCard';
import AiParsingReviewModal from '@/components/dashboard/AiParsingReviewModal';
import RegulationReviewModal from '@/components/dashboard/RegulationReviewModal';
import { getStoredRequests, type DataRequestRecord } from '@/lib/data-request-store';
import { getSupplierName } from '@/lib/supplier-detail-data';
import {
  CheckCircle2, FileCheck2,
  ShieldAlert, UserCheck, ArrowRight, Bell, Plus, Send,
} from 'lucide-react';
import clsx from 'clsx';

type TaskStatus = 'today' | 'overdue' | 'waiting' | 'done';
type TaskType = 'submission_review' | 'risk_action' | 'hitl' | 'reminder' | 'due_diligence';

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


const typeMeta = {
  submission_review: { label: '제출 검토', icon: FileCheck2, tone: 'info' as const },
  risk_action: { label: '리스크 조치', icon: ShieldAlert, tone: 'alert' as const },
  hitl: { label: 'HITL', icon: UserCheck, tone: 'warn' as const },
  reminder: { label: '리마인드', icon: Bell, tone: 'warn' as const },
  due_diligence: { label: '실사', icon: CheckCircle2, tone: 'ok' as const },
};

const statusMeta = {
  today: { label: '오늘 처리', tone: 'warn' as const },
  overdue: { label: '기한 초과', tone: 'alert' as const },
  waiting: { label: '대기', tone: 'info' as const },
  done: { label: '완료', tone: 'ok' as const },
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

const _STATUS_FROM_API: Record<string, TaskStatus> = {
  open: 'waiting', sent: 'waiting', review: 'today', resolved: 'done', blocked: 'overdue',
};
const _TYPE_FROM_API: Record<string, TaskType> = {
  SUB: 'submission_review', DD: 'due_diligence', HITL: 'hitl',
};
const _HREF_FROM_TYPE: Record<TaskType, string> = {
  submission_review: '/suppliers/check-info', risk_action: '/suppliers/check-info',
  hitl: '/my-task?tab=hitl', reminder: '/submission-status',
  due_diligence: '/suppliers/check-info',
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
  { supplier: 'Ganzhou Rare Metals', supplierId: 'S-REF-002', title: '정제 코발트 소유 구조 확인', status: 'dueSoon', due: '2026-06-07', missing: 2 },
  { supplier: 'POS Cathode Materials', supplierId: 'S-CAM-001', title: 'NCM811 양극재 공정·탄소 배출 산정서', status: 'submitted', due: '2026-06-12', missing: 3 },
  { supplier: 'QZ Precursor', supplierId: 'S-PRE-001', title: '전구체 배합 데이터·제조 공정도', status: 'progress', due: '2026-06-14', missing: 2 },
];

// 백엔드 상태(submission/response) → 프론트 4버킷 파생.
function deriveRequestStatus(r: ApiDataRequest): RequestStatus {
  if (r.responseStatus === 'response_overdue') return 'overdue';
  if (r.submissionStatus === 'submission_submitted' || r.submissionStatus === 'submission_review' || r.submissionStatus === 'submission_approved') return 'submitted';
  if (r.dueDate) {
    const diff = new Date(r.dueDate).getTime() - Date.now();
    if (diff < 0) return 'overdue';
    if (diff < 7 * 86400000) return 'dueSoon';
  }
  return 'progress';
}

function RequestArea({ onReview }: { onReview?: (supplierId: string, supplierName: string) => void }) {
  // 실 백엔드 GET /data-requests + 협력사명(getSuppliers). 공급망 맵의 자료 요청 추가(POST)를 여기로 끌어옴.
  const [apiRows, setApiRows] = useState<DataRequest[] | null>(null);
  const [stored, setStored] = useState<DataRequestRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierBrief[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addSup, setAddSup] = useState('');
  const [addType, setAddType] = useState('');
  const [addDue, setAddDue] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setStored(getStoredRequests());
    try {
      const [reqs, sups] = await Promise.all([getDataRequests(), getSuppliers()]);
      setSuppliers(sups);
      const nameById = new Map(sups.map(s => [s.supplierId, s.companyName]));
      setApiRows(reqs.map(r => ({
        supplierId: r.targetSupplierId ?? r.requestId,
        supplier: (r.targetSupplierId && nameById.get(r.targetSupplierId)) || '협력사',
        title: r.requestedDataType ?? '자료 요청',
        status: deriveRequestStatus(r),
        due: r.dueDate?.slice(0, 10) ?? '-',
        missing: r.missingCount ?? -1,
      })));
    } catch {
      setApiRows(null); // 인증/네트워크 실패 → mock 유지
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // 작성 요청 추가 — 공급망 맵에서 쓰던 createDataRequest를 My Task로.
  async function addRequest() {
    if (!addSup || !addType.trim()) return;
    setBusy(true);
    try {
      await createDataRequest({ targetSupplierId: addSup, requestedDataType: addType.trim(), dueDate: addDue || undefined });
      setShowAdd(false); setAddSup(''); setAddType(''); setAddDue('');
      await load();
    } catch { /* noop */ } finally { setBusy(false); }
  }

  const base: DataRequest[] = apiRows ?? dataRequests;
  const requests: (DataRequest | DataRequestRecord)[] = [
    ...stored,
    ...base.filter(d => !stored.some(s => s.supplierId === d.supplierId)),
  ];
  const order: RequestStatus[] = ['overdue', 'submitted', 'dueSoon', 'progress'];
  const counts = order.map(s => ({ s, n: requests.filter(r => r.status === s).length }));
  return (
    <section className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 bg-ink-800/60 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-ink-100">자료 요청</h2>
          <p className="mt-0.5 text-sm text-ink-500">협력사 자료 요청의 기한·제출·검토 대기를 한 곳에서 처리</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {counts.map(({ s, n }) => (
            <span key={s} className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold', requestStatusMeta[s].chip)}>
              {requestStatusMeta[s].label} {n}
            </span>
          ))}
          <button type="button" onClick={() => setShowAdd(v => !v)} className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-sm bg-brand px-3 text-xs font-bold text-white hover:bg-brand-hover">
            <Plus className="h-3.5 w-3.5" /> 작성 요청 추가
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="flex flex-wrap items-end gap-2 border-b border-ink-700/40 bg-slate-50 px-5 py-3">
          <label className="flex flex-col gap-1 text-[11px] font-bold text-ink-500">협력사
            <select value={addSup} onChange={e => setAddSup(e.target.value)} className="h-9 min-w-[180px] rounded-sm border border-slate-200 px-2 text-sm text-ink-100">
              <option value="">선택</option>
              {suppliers.map(s => <option key={s.supplierId} value={s.supplierId}>{s.companyName}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-ink-500">요청 자료
            <input value={addType} onChange={e => setAddType(e.target.value)} placeholder="예: 환경성적서, 원산지 증빙" className="h-9 min-w-[200px] rounded-sm border border-slate-200 px-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-ink-500">마감일
            <input type="date" value={addDue} onChange={e => setAddDue(e.target.value)} className="h-9 rounded-sm border border-slate-200 px-2 text-sm" />
          </label>
          <button type="button" onClick={addRequest} disabled={busy || !addSup || !addType.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-brand px-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50">
            <Send className="h-3.5 w-3.5" /> 요청 발송
          </button>
        </div>
      )}
      <div className="divide-y divide-ink-700/30">
        {requests.map(req => {
          const meta = requestStatusMeta[req.status];
          const reviewMode = req.status === 'submitted';
          // 협력사명은 정식 명칭(master)에서 끌어와 mock/저장본 드리프트 방지.
          const supplierLabel = getSupplierName(req.supplierId)?.nameKo ?? req.supplier;
          // 협력사 관리 페이지로 이탈하지 않고 보드에서 인라인 검토(닫으면 보드로 복귀).
          return (
            <div key={req.supplierId} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
              <span className={clsx('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-bold text-ink-100">{supplierLabel}</span>
                  <span className={clsx('rounded-full border px-2 py-0.5 text-[10px] font-bold', meta.chip)}>{meta.label}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-ink-500">{req.title}</div>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <div className="text-[11px] text-ink-500">마감 {req.due}</div>
                {req.missing >= 0 && <div className="text-[11px] text-ink-500">누락 {req.missing}건</div>}
              </div>
              <button
                type="button"
                onClick={() => onReview?.(req.supplierId, supplierLabel)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
              >
                {reviewMode ? '검토' : '재요청·확인'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type MyTaskView = 'request' | 'hitl' | 'inputStatus';

export default function MyTaskPage() {
  // 업무 분장 단위 허브 — 실제 쓰이는 기능만: 자료 요청(+추가), 협력사 승인(HITL), 입력 현황.
  const [view, setView] = useState<MyTaskView>('request');
  // 검토 클릭 시 AI 파싱 뷰를 띄울 대상 협력사(데이터 추출 검토).
  const [review, setReview] = useState<{ supplierId: string; supplierName: string } | null>(null);
  // 규제 검증 검토 — AI 판정 결과 + 파싱 뷰 함께.
  const [regReview, setRegReview] = useState<RegReviewRow | null>(null);
  // audit 업무 큐 — GET /actions(audit 도메인)에서 내 담당 액션 아이템.
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskFilter, setTaskFilter] = useState<'all' | TaskStatus>('all');
  // 딥링크 ?tab=hitl|inputStatus|request (규제 검증 결과 등 편입 화면 진입용).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'hitl' || t === 'inputStatus' || t === 'request') setView(t);
  }, []);
  useEffect(() => {
    getMyActions().then(items => setTasks(sortByPriority(items.map(adaptAction)))).catch(() => {});
  }, []);
  const openReview = (supplierId: string, supplierName: string) => setReview({ supplierId, supplierName });
  const visibleTasks = taskFilter === 'all' ? tasks : tasks.filter(t => t.status === taskFilter);
  return (
    <>
      <PageHeader
        title="My Task"
        description="담당자 업무 분장 — 협력사 자료 요청, 제출 자료 AI 검증(HITL) 승인, 입력 현황을 한 곳에서"
        badge="P1"
        tabs={[
          { label: '자료 요청', active: view === 'request', onClick: () => setView('request') },
          { label: '협력사 승인 (HITL)', active: view === 'hitl', onClick: () => setView('hitl') },
          { label: '협력사 입력 현황', active: view === 'inputStatus', onClick: () => setView('inputStatus') },
        ]}
      />
      <div className="p-8 pt-4">
        {view === 'request' && <RequestArea onReview={openReview} />}
        {view === 'hitl' && (
          <div className="space-y-5">
            {/* AI 파싱 결과 = 데이터 추출 검토 + 규제 검증 결과. 검토 클릭 → AI 파싱 뷰 모달. */}
            <HitlReviewCard />
            <RegulationResultsCard onReview={setRegReview} />
            {/* audit 업무 큐 — GET /actions 에서 내 담당 액션 아이템 목록 */}
            {tasks.length > 0 && (
              <section className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 bg-ink-800/60 px-5 py-4">
                  <div>
                    <h2 className="text-base font-bold text-ink-100">업무 큐</h2>
                    <p className="mt-0.5 text-sm text-ink-500">담당자에게 배정된 액션 아이템</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {taskFilters.map(([s, label]) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTaskFilter(s)}
                        className={clsx(
                          'rounded-full border px-2.5 py-1 text-[11px] font-bold',
                          taskFilter === s
                            ? 'border-brand bg-brand text-white'
                            : 'border-ink-700 bg-white text-ink-400 hover:text-ink-100',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-ink-700/30">
                  {visibleTasks.length === 0 && (
                    <p className="px-5 py-6 text-sm text-ink-500">해당 항목이 없습니다.</p>
                  )}
                  {visibleTasks.map(task => {
                    const tm = typeMeta[task.type];
                    const sm = statusMeta[task.status];
                    const Icon = tm.icon;
                    return (
                      <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                        <Icon className="h-4 w-4 shrink-0 text-ink-400" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-bold text-ink-100">{task.title}</span>
                            <span className={clsx('rounded-full border px-2 py-0.5 text-[10px] font-bold',
                              sm.tone === 'alert' ? 'border-alert-border bg-alert-bg text-alert-text' :
                              sm.tone === 'warn'  ? 'border-warn-border bg-warn-bg text-warn-text'   :
                              sm.tone === 'ok'    ? 'border-ok-border bg-ok-bg text-ok-text'         :
                                                    'border-info-border bg-info-bg text-info-text',
                            )}>{sm.label}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-ink-500">마감 {task.due} · {tm.label}</div>
                        </div>
                        <a
                          href={task.targetHref}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
                        >
                          {task.targetLabel} <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
        {view === 'inputStatus' && <SupplierInputStatusBoard embedded />}
      </div>
      {review && (
        <AiParsingReviewModal supplierId={review.supplierId} supplierName={review.supplierName} onClose={() => setReview(null)} />
      )}
      {regReview && (
        <RegulationReviewModal row={regReview} onClose={() => setRegReview(null)} />
      )}
    </>
  );
}
