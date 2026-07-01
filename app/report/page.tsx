'use client';

import { useState } from 'react';
import clsx from 'clsx';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react';
import Badge from '@/components/Badge';
import PageHeader from '@/components/PageHeader';
import TopStatCard from '@/components/TopStatCard';

type ReportStatus = 'draft' | 'submitted' | 'reviewing' | 'approved' | 'rejected';
type ReviewerStatus = 'pending' | 'approved' | 'rejected' | 'waiting';

interface Reviewer {
  name: string;
  role: string;
  status: ReviewerStatus;
}

interface ReportRecord {
  id: string;
  title: string;
  type: string;
  relatedBatch: string;
  author: string;
  submittedAt: string | null;
  status: ReportStatus;
  reviewers: Reviewer[];
  summary: string;
  rejectReason?: string;
}

const reports: ReportRecord[] = [
  {
    id: 'RPT-2026-004',
    title: 'Katanga Mining 아동노동 CAPA 이행 보고서',
    type: '인권 실사',
    relatedBatch: 'BATCH-2026-038',
    author: '구매실사 최하린',
    submittedAt: '2026-06-03',
    status: 'approved',
    reviewers: [
      { name: '김법무', role: '법무팀장', status: 'approved' },
      { name: '박ESG', role: 'ESG 총괄', status: 'approved' },
    ],
    summary:
      'Katanga Mining CAPA 2건 중 1건 이행 완료. 커뮤니티 합의서 갱신은 2026-06-18 예정으로 조건부 승인. 이행 완료 후 통관 적합성 판정 진행 가능.',
  },
  {
    id: 'RPT-2026-003',
    title: '광산 좌표 미제출 EUDR 위험 보고서',
    type: 'Geo/EUDR',
    relatedBatch: 'BATCH-2026-031',
    author: '공급망 데이터팀',
    submittedAt: '2026-05-28',
    status: 'rejected',
    reviewers: [
      { name: '김법무', role: '법무팀장', status: 'rejected' },
    ],
    summary: 'S-MINE-001 광산 경계 좌표 미제출로 EUDR 검증 지연. 좌표 업로드 후 재보고 요청.',
    rejectReason: '좌표 폴리곤 원본 첨부 누락. 첨부 파일 보완 후 재제출 필요.',
  },
  {
    id: 'RPT-2026-006',
    title: 'CAM Partner CN 원격 실사 사전 보고',
    type: '실사',
    relatedBatch: 'BATCH-2026-044',
    author: 'ESG팀 김민재',
    submittedAt: null,
    status: 'draft',
    reviewers: [],
    summary:
      'CAM Partner CN 2026-06-04 예정 원격 실사에 대한 사전 점검 보고서. 초과근무 개선 확인 및 국영기업 간접 지분 검토 예정.',
  },
  {
    id: 'RPT-2026-002',
    title: 'Q1 공급망 규제 대응 현황 종합 보고',
    type: '정기 보고',
    relatedBatch: 'BATCH-2026-018',
    author: '컴플라이언스 이서윤',
    submittedAt: '2026-04-15',
    status: 'approved',
    reviewers: [
      { name: '김법무', role: '법무팀장', status: 'approved' },
      { name: '박ESG', role: 'ESG 총괄', status: 'approved' },
      { name: '최대표', role: '최종 결재', status: 'approved' },
    ],
    summary:
      'Q1 기준 규제 위반 2건, CAPA 진행 4건, 규제 검증 완료 1건. 전반적 개선 추세로 2분기 목표치 달성 가능할 것으로 판단.',
  },
];

const statusMeta: Record<ReportStatus, { label: string; tone: 'ok' | 'warn' | 'alert' | 'info' | 'neutral' }> = {
  draft: { label: '작성중', tone: 'neutral' },
  submitted: { label: '제출됨', tone: 'info' },
  reviewing: { label: '결재중', tone: 'warn' },
  approved: { label: '승인', tone: 'ok' },
  rejected: { label: '반려', tone: 'alert' },
};

const reviewerStatusStyle: Record<ReviewerStatus, string> = {
  pending: 'text-warn-text',
  approved: 'text-ok-text',
  rejected: 'text-alert-text',
  waiting: 'text-ink-400',
};

const reviewerStatusLabel: Record<ReviewerStatus, string> = {
  pending: '검토중',
  approved: '승인',
  rejected: '반려',
  waiting: '대기',
};

export default function ReportPage() {
  const [selectedId, setSelectedId] = useState(reports[0].id);
  const selected = reports.find(r => r.id === selectedId) ?? reports[0];

  const stats = {
    total: reports.length,
    reviewing: reports.filter(r => r.status === 'reviewing' || r.status === 'submitted').length,
    approved: reports.filter(r => r.status === 'approved').length,
    rejected: reports.filter(r => r.status === 'rejected').length,
  };

  return (
    <>
      <PageHeader
        title="보고 관리"
        description="HITL 결정 및 실사 결과를 결재선에 따라 보고하고 승인을 추적합니다."
        badge="보고"
        actions={
          <button
            type="button"
            onClick={() => window.alert('보고서 작성 기능은 준비 중입니다.')}
            className="inline-flex items-center gap-2 rounded-xs border border-accent-700/40 bg-accent-50 px-3 py-2 text-xs font-bold text-accent-700 hover:border-accent-600 hover:bg-accent-100"
          >
            <Plus className="h-3.5 w-3.5" />
            보고서 작성
          </button>
        }
      />

      <main className="space-y-5 p-6">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <TopStatCard label="전체 보고서" value={stats.total} unit="건" tone="neutral" />
          <TopStatCard label="결재 진행" value={stats.reviewing} unit="건" tone="warn" />
          <TopStatCard label="승인 완료" value={stats.approved} unit="건" tone="ok" />
          <TopStatCard label="반려" value={stats.rejected} unit="건" tone="alert" />
        </section>

        <section className="space-y-[14px]">
          <div className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 bg-ink-800/60 px-5 py-4">
              <h2 className="text-base font-bold text-ink-100">보고서 목록</h2>
            </div>
            <div className="divide-y divide-ink-700/50">
              {reports.map(report => (
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
                      <div className="text-xs font-bold text-ink-400 num-mono">{report.id} · {report.type}</div>
                      <div className="mt-1 text-[15px] font-semibold leading-snug text-ink-100">{report.title}</div>
                      <div className="mt-1 text-sm text-ink-500">{report.author} · {report.submittedAt ?? '미제출'}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge tone={statusMeta[report.status].tone}>{statusMeta[report.status].label}</Badge>
                      <ChevronRight className="h-4 w-4 text-ink-500" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <aside className="space-y-5 rounded-sm border border-ink-700 bg-white p-5 shadow-control">
            <div className="flex items-start justify-between gap-3 border-b border-ink-700 pb-4">
              <div>
                <div className="text-xs font-bold text-ink-400 num-mono">{selected.id} · {selected.type}</div>
                <h3 className="mt-1 text-lg font-bold leading-snug text-ink-100">{selected.title}</h3>
                <p className="mt-1 text-sm text-ink-500">{selected.author} · 관련 배치 <span className="num-mono">{selected.relatedBatch}</span></p>
              </div>
              <Badge tone={statusMeta[selected.status].tone}>{statusMeta[selected.status].label}</Badge>
            </div>

            <section>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">보고 요약</h4>
              <p className="rounded-xs border border-ink-700 bg-slate-50 p-3 text-sm leading-6 text-ink-200">
                {selected.summary}
              </p>
            </section>

            {selected.rejectReason && (
              <section className="rounded-xs border border-alert-border bg-alert-bg p-3">
                <div className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-alert-text" />
                  <div>
                    <div className="text-xs font-bold text-alert-text">반려 사유</div>
                    <div className="mt-1 text-sm text-alert-text">{selected.rejectReason}</div>
                  </div>
                </div>
              </section>
            )}

            <section>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-500">결재선</h4>
              {selected.reviewers.length > 0 ? (
                <div className="space-y-2">
                  {selected.reviewers.map((r, i) => (
                    <div key={r.name} className="flex items-center gap-3 rounded-xs border border-ink-700 bg-slate-50 px-3 py-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-700 bg-white text-xs font-bold text-ink-400 num-mono">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink-100">{r.name}</div>
                        <div className="text-xs text-ink-500">{r.role}</div>
                      </div>
                      <span className={clsx('text-xs font-bold', reviewerStatusStyle[r.status])}>
                        {reviewerStatusLabel[r.status]}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xs border border-dashed border-ink-700 px-3 py-4 text-center text-sm text-ink-400">
                  결재선 미설정 (작성중)
                </div>
              )}
            </section>

            <section className="flex gap-2 border-t border-ink-700 pt-4">
              {selected.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => window.alert('결재를 요청합니다.')}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xs bg-accent-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-accent-600"
                >
                  <Send className="h-4 w-4" />
                  결재 요청
                </button>
              )}
              {selected.status === 'rejected' && (
                <button
                  type="button"
                  onClick={() => window.alert('수정 후 재제출합니다.')}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xs bg-accent-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-accent-600"
                >
                  <RefreshCw className="h-4 w-4" />
                  수정 후 재제출
                </button>
              )}
              {selected.status === 'approved' && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xs border border-ink-700 px-3 py-2.5 text-sm font-bold text-ink-100 hover:border-accent-600 hover:text-accent-700"
                >
                  <FileText className="h-4 w-4" />
                  PDF 출력
                </button>
              )}
              {(selected.status === 'reviewing' || selected.status === 'submitted') && (
                <div className="inline-flex flex-1 items-center justify-center gap-2 rounded-xs border border-ink-700 bg-slate-50 px-3 py-2.5 text-sm text-ink-400">
                  <Clock className="h-4 w-4" />
                  결재 진행중
                </div>
              )}
            </section>
          </aside>
        </section>
      </main>
    </>
  );
}
