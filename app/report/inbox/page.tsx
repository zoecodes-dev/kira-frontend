'use client';

import { useState } from 'react';
import clsx from 'clsx';
import {
  CheckCircle2,
  ChevronRight,
  FileText,
  MessageSquare,
  XCircle,
} from 'lucide-react';
import Badge from '@/components/Badge';
import PageHeader from '@/components/PageHeader';
import TopStatCard from '@/components/TopStatCard';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface InboxReport {
  id: string;
  title: string;
  type: string;
  author: string;
  authorRole: string;
  submittedAt: string;
  deadline: string;
  status: ReviewStatus;
  severity: 'high' | 'medium' | 'low';
  previousReviewers: Array<{ name: string; approved: boolean }>;
  summary: string;
  keyPoints: string[];
}

const inboxReports: InboxReport[] = [
  {
    id: 'RPT-2026-005',
    title: 'Ganzhou Refinery FEOC 위반 검토 보고서',
    type: 'FEOC 위반',
    author: '이서윤',
    authorRole: '컴플라이언스팀',
    submittedAt: '2026-06-10',
    deadline: '2026-06-13',
    status: 'pending',
    severity: 'high',
    previousReviewers: [{ name: '김법무 (법무팀장)', approved: true }],
    summary:
      'Ganzhou Refinery에서 FEOC 기준 직접 지분 41.2% 확인. IRA §30D 적격성 상실 가능성이 있으며 즉각적인 결재 및 조달 중단 검토가 필요합니다.',
    keyPoints: [
      'FEOC 직접 지분 41.2% — 기준치(25%) 초과',
      'IRA AMPC 크레딧 수령 중단 가능성',
      '대체 공급망: POS Cathode 전환 시 리드타임 약 8주',
    ],
  },
  {
    id: 'RPT-2026-007',
    title: 'Q2 리스크 조치 이행 현황 보고',
    type: '정기 보고',
    author: '김민재',
    authorRole: 'ESG팀',
    submittedAt: '2026-06-09',
    deadline: '2026-06-16',
    status: 'pending',
    severity: 'medium',
    previousReviewers: [],
    summary:
      'Q2 기준 고위험 협력사 5개사 중 3개사 CAPA 완료, 2개사 진행 중. DPP 발행 준비 완료 제품 3건.',
    keyPoints: [
      'Katanga Mining CAPA 이행률 50% → 조건부 승인 권고',
      'Ganzhou Refinery FEOC 검토 결과 별도 보고 중',
      'BMW iX3 DPP 발행 완료 (DPP-IX3-20260610)',
    ],
  },
  {
    id: 'RPT-2026-004',
    title: 'Katanga Mining 아동노동 CAPA 이행 보고서',
    type: '인권 실사',
    author: '최하린',
    authorRole: '구매실사팀',
    submittedAt: '2026-06-03',
    deadline: '2026-06-07',
    status: 'approved',
    severity: 'medium',
    previousReviewers: [{ name: '김법무 (법무팀장)', approved: true }],
    summary:
      'Katanga Mining CAPA 2건 중 1건 이행 완료. 커뮤니티 합의서 갱신은 2026-06-18 예정. 조건부 승인 가능.',
    keyPoints: [
      '아동노동 감사 보고서 원본 제출 완료',
      '커뮤니티 합의서 갱신 2026-06-18 예정 — 조건부 승인',
    ],
  },
];

const severityMeta = {
  high: { label: '긴급', tone: 'alert' as const },
  medium: { label: '중요', tone: 'warn' as const },
  low: { label: '일반', tone: 'neutral' as const },
};

const statusMeta: Record<ReviewStatus, { label: string; tone: 'ok' | 'warn' | 'alert' | 'neutral' }> = {
  pending: { label: '검토 필요', tone: 'warn' },
  approved: { label: '승인', tone: 'ok' },
  rejected: { label: '반려', tone: 'alert' },
};

export default function ReportInboxPage() {
  const [selectedId, setSelectedId] = useState(inboxReports[0].id);
  const [comment, setComment] = useState('');
  const [decisions, setDecisions] = useState<Record<string, ReviewStatus>>({});

  const selected = inboxReports.find(r => r.id === selectedId) ?? inboxReports[0];
  const effectiveStatus = decisions[selected.id] ?? selected.status;

  const pending = inboxReports.filter(r => (decisions[r.id] ?? r.status) === 'pending').length;
  const approved = inboxReports.filter(r => (decisions[r.id] ?? r.status) === 'approved').length;
  const rejected = inboxReports.filter(r => (decisions[r.id] ?? r.status) === 'rejected').length;

  function decide(id: string, decision: 'approved' | 'rejected') {
    if (!comment.trim() && decision === 'rejected') {
      window.alert('반려 시 의견을 입력해주세요.');
      return;
    }
    setDecisions(prev => ({ ...prev, [id]: decision }));
    setComment('');
  }

  return (
    <>
      <PageHeader
        title="결재함"
        description="내 차례인 보고서를 검토하고 승인 또는 반려합니다."
        badge="결재"
      />

      <main className="space-y-5 p-6">
        <section className="grid grid-cols-3 gap-3">
          <TopStatCard label="검토 필요" value={pending} unit="건" tone="warn" />
          <TopStatCard label="승인" value={approved} unit="건" tone="ok" />
          <TopStatCard label="반려" value={rejected} unit="건" tone="alert" />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[560px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 bg-ink-800/60 px-5 py-4">
              <h2 className="text-base font-bold text-ink-100">결재 대기 목록</h2>
            </div>
            <div className="divide-y divide-ink-700/50">
              {inboxReports.map(report => {
                const status = decisions[report.id] ?? report.status;
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedId(report.id)}
                    className={clsx(
                      'w-full px-5 py-4 text-left transition-colors hover:bg-slate-50',
                      report.id === selectedId && 'border-l-2 border-accent-600 bg-accent-50/60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge tone={severityMeta[report.severity].tone}>{severityMeta[report.severity].label}</Badge>
                          <span className="text-xs text-ink-500 num-mono">{report.id}</span>
                        </div>
                        <div className="mt-1.5 text-[15px] font-semibold leading-snug text-ink-100">{report.title}</div>
                        <div className="mt-1 text-sm text-ink-500">
                          {report.author} · {report.type} · 마감 <span className="num-mono">{report.deadline}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Badge tone={statusMeta[status].tone}>{statusMeta[status].label}</Badge>
                        <ChevronRight className="h-4 w-4 text-ink-500" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="space-y-5 rounded-sm border border-ink-700 bg-white p-5 shadow-control">
            <div className="flex items-start justify-between gap-3 border-b border-ink-700 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone={severityMeta[selected.severity].tone}>{severityMeta[selected.severity].label}</Badge>
                  <span className="text-xs text-ink-400 num-mono">{selected.id}</span>
                </div>
                <h3 className="mt-2 text-lg font-bold leading-snug text-ink-100">{selected.title}</h3>
                <p className="mt-1 text-sm text-ink-500">
                  {selected.authorRole} {selected.author} · {selected.submittedAt} 제출 · 마감 <span className="num-mono">{selected.deadline}</span>
                </p>
              </div>
              <Badge tone={statusMeta[effectiveStatus].tone}>{statusMeta[effectiveStatus].label}</Badge>
            </div>

            <section>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">보고 요약</h4>
              <p className="rounded-xs border border-ink-700 bg-slate-50 p-3 text-sm leading-6 text-ink-200">
                {selected.summary}
              </p>
            </section>

            <section>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">핵심 판단 근거</h4>
              <ul className="space-y-1.5">
                {selected.keyPoints.map(point => (
                  <li key={point} className="flex items-start gap-2 text-sm text-ink-200">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" />
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            {selected.previousReviewers.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">이전 결재</h4>
                <div className="space-y-1.5">
                  {selected.previousReviewers.map(r => (
                    <div key={r.name} className="flex items-center gap-2 text-sm">
                      {r.approved
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        : <XCircle className="h-4 w-4 text-red-600" />}
                      <span className="text-ink-200">{r.name}</span>
                      <span className={r.approved ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {r.approved ? '승인' : '반려'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {effectiveStatus === 'pending' && (
              <section className="space-y-3 border-t border-ink-700 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                  <MessageSquare className="inline h-3.5 w-3.5 mr-1" />
                  결재 의견 (선택)
                </h4>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  placeholder="의견을 입력하면 결재 이력에 기록됩니다."
                  className="w-full rounded-xs border border-ink-700 bg-slate-50 px-3 py-2 text-sm text-ink-100 outline-none placeholder:text-ink-500 focus:border-accent-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => decide(selected.id, 'approved')}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xs bg-emerald-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    승인
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(selected.id, 'rejected')}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xs bg-red-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-red-600"
                  >
                    <XCircle className="h-4 w-4" />
                    반려
                  </button>
                </div>
              </section>
            )}

            {effectiveStatus !== 'pending' && (
              <section className="rounded-xs border border-ink-700 bg-slate-50 p-3">
                <div className={clsx(
                  'flex items-center gap-2 text-sm font-bold',
                  effectiveStatus === 'approved' ? 'text-emerald-700' : 'text-red-700',
                )}>
                  {effectiveStatus === 'approved'
                    ? <CheckCircle2 className="h-4 w-4" />
                    : <XCircle className="h-4 w-4" />}
                  {effectiveStatus === 'approved' ? '승인 완료' : '반려 처리됨'}
                </div>
                {comment && <p className="mt-2 text-sm text-ink-400">{comment}</p>}
                <button
                  type="button"
                  onClick={() => setDecisions(prev => { const next = { ...prev }; delete next[selected.id]; return next; })}
                  className="mt-3 text-xs text-ink-500 underline hover:text-ink-100"
                >
                  결재 취소 (되돌리기)
                </button>
              </section>
            )}

            <button
              type="button"
              onClick={() => window.open(`/report`, '_self')}
              className="flex w-full items-center justify-center gap-2 rounded-xs border border-ink-700 px-3 py-2 text-sm text-ink-400 hover:border-accent-600 hover:text-accent-700"
            >
              <FileText className="h-4 w-4" />
              원문 보고서 보기
            </button>
          </aside>
        </section>
      </main>
    </>
  );
}
