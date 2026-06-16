'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileText,
  Send,
  ScanLine,
  ClipboardCheck,
  Inbox,
  Search,
  XCircle,
  ShieldCheck,
  QrCode,
  Download,
} from 'lucide-react';

// ─── 타입 정의 ──────────────────────────────────────────────────────────────────

export type StageStatus =
  | 'done'       // 완료 (초록)
  | 'active'     // 현재 진행 중 (accent 깜빡 펄스)
  | 'rejected'   // 보완 요청 / 반려 (빨강)
  | 'pending';   // 대기 (회색)

export interface Stage {
  no: number;
  label: string;
  sublabel: string;           // 단계 설명 (툴팁용)
  status: StageStatus;
  completedAt?: string;       // 완료 일시
}

export interface Submission {
  id: string;
  documentName: string;       // 서류명
  submittedAt: string;        // 최초 제출일
  stages: Stage[];
  /** 반려된 경우 해당 단계 번호 (1-based) */
  rejectedStageNo?: number;
  rejectionReason?: string;   // 반려 사유
  onResubmit?: () => void;    // [재제출 하기] 클릭 콜백
}

// ─── 8단계 아이콘 매핑 ──────────────────────────────────────────────────────────

const STAGE_ICONS = [
  Send,          // 1. 제출 완료
  ScanLine,      // 2. AI 파싱 중
  FileText,      // 3. AI 파싱 완료
  ClipboardCheck,// 4. 협력사 확인
  Inbox,         // 5. 원청 접수
  Search,        // 6. 원청 검토중
  XCircle,       // 7. 보완 요청
  ShieldCheck,   // 8. 최종 승인
];

// ─── Mock 데이터 (API 연동 시 이 배열을 fetch 결과로 교체) ──────────────────────

export const mockSubmissions: Submission[] = [
  {
    id: 'sub-001',
    documentName: '탄소 배출 보고서',
    submittedAt: '2026-05-19',
    rejectedStageNo: undefined,
    rejectionReason: undefined,
    stages: [
      { no: 1, label: '제출 완료',   sublabel: '협력사 최초 업로드 완료',      status: 'done',    completedAt: '2026-05-19 09:12' },
      { no: 2, label: 'AI 파싱 중',  sublabel: 'LLM 문서 추출 파이프라인 처리', status: 'done',    completedAt: '2026-05-19 09:14' },
      { no: 3, label: 'AI 파싱 완료',sublabel: '데이터 추출 결과 생성 완료',    status: 'done',    completedAt: '2026-05-19 09:15' },
      { no: 4, label: '협력사 확인', sublabel: '협력사 담당자 파싱 결과 검토',   status: 'done',    completedAt: '2026-05-20 14:30' },
      { no: 5, label: '원청 접수',   sublabel: '원청사 검토 큐 진입',            status: 'done',    completedAt: '2026-05-21 10:00' },
      { no: 6, label: '원청 검토중', sublabel: '원청사 담당자 내용 검토 중',     status: 'active' },
      { no: 7, label: '보완 요청',   sublabel: '미비 사항 재제출 요청',          status: 'pending' },
      { no: 8, label: '최종 승인',   sublabel: 'DPP 발행 승인 완료',            status: 'pending' },
    ],
  },
  {
    id: 'sub-002',
    documentName: '광산 폴리곤 좌표',
    submittedAt: '2026-05-21',
    rejectedStageNo: 7,
    rejectionReason: '제출 파일에 담당자 서명 및 직인이 누락되어 있습니다. EUDR 검증 기준 §4.2 충족 불가.',
    stages: [
      { no: 1, label: '제출 완료',   sublabel: '협력사 최초 업로드 완료',      status: 'done',    completedAt: '2026-05-21 11:05' },
      { no: 2, label: 'AI 파싱 중',  sublabel: 'LLM 문서 추출 파이프라인 처리', status: 'done',    completedAt: '2026-05-21 11:07' },
      { no: 3, label: 'AI 파싱 완료',sublabel: '데이터 추출 결과 생성 완료',    status: 'done',    completedAt: '2026-05-21 11:08' },
      { no: 4, label: '협력사 확인', sublabel: '협력사 담당자 파싱 결과 검토',   status: 'done',    completedAt: '2026-05-22 09:45' },
      { no: 5, label: '원청 접수',   sublabel: '원청사 검토 큐 진입',            status: 'done',    completedAt: '2026-05-23 10:00' },
      { no: 6, label: '원청 검토중', sublabel: '원청사 담당자 내용 검토 중',     status: 'done',    completedAt: '2026-05-27 16:20' },
      { no: 7, label: '보완 요청',   sublabel: '미비 사항 재제출 요청',          status: 'rejected',completedAt: '2026-05-27 16:22' },
      { no: 8, label: '최종 승인',   sublabel: 'DPP 발행 승인 완료',            status: 'pending' },
    ],
  },
];

// batch.status 분기용 Mock — 기획서 E-3 스펙
// · batch_completed  → DPP QR 다운로드 버튼 표시
// · batch_rejected   → 시정 완료 회신 버튼 (page.tsx에서 ViolationReportModal 연결)
// · batch_processing → 조회만 가능
// · batch_hitl_wait  → 보완 제출 딥링크
export type BatchStatus = 'batch_processing' | 'batch_hitl_wait' | 'batch_completed' | 'batch_rejected';

export const MOCK_BATCH_STATUS: BatchStatus = 'batch_processing'; // 시나리오 전환용

// ─── 단계 노드 ──────────────────────────────────────────────────────────────────

function StageNode({
  stage,
  isLast,
}: {
  stage: Stage;
  isLast: boolean;
}) {
  const Icon = STAGE_ICONS[stage.no - 1];

  // ── 노드 스타일 ──
  const nodeStyle = {
    done:     'border-signal-ok    bg-signal-ok    text-white',
    active:   'border-accent-600   bg-white        text-accent-600   ring-4 ring-accent-100 animate-pulse',
    rejected: 'border-red-500      bg-red-500      text-white        ring-4 ring-red-100',
    pending:  'border-ink-600      bg-white        text-ink-500',
  }[stage.status];

  // ── 연결선 색상 ──
  const lineStyle = {
    done:     'bg-signal-ok',
    active:   'bg-gradient-to-r from-signal-ok to-ink-600',
    rejected: 'bg-red-400',
    pending:  'bg-ink-700',
  }[stage.status];

  // ── 라벨 색상 ──
  const labelStyle = {
    done:     'text-signal-ok     font-semibold',
    active:   'text-accent-700    font-bold',
    rejected: 'text-red-600       font-bold',
    pending:  'text-ink-500       font-medium',
  }[stage.status];

  const dateStyle = {
    done:     'text-ink-500',
    active:   'text-accent-600',
    rejected: 'text-red-500',
    pending:  'text-ink-700',
  }[stage.status];

  return (
    // 노드 + 오른쪽 연결선을 한 묶음으로 처리
    <div className="flex flex-1 flex-col items-center min-w-0">
      {/* 노드 행: 원 + 연결선 */}
      <div className="flex w-full items-center">
        {/* 동그란 노드 */}
        <div className="relative flex shrink-0 flex-col items-center">
          <div
            className={`
              flex h-9 w-9 items-center justify-center
              rounded-full border-2 transition-all duration-300
              ${nodeStyle}
            `}
            title={stage.sublabel}
          >
            {stage.status === 'done' ? (
              <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
            ) : stage.status === 'rejected' ? (
              <AlertTriangle className="h-4 w-4" strokeWidth={2.5} />
            ) : (
              <Icon className="h-4 w-4" strokeWidth={stage.status === 'active' ? 2.5 : 1.8} />
            )}
          </div>
        </div>

        {/* 연결선 (마지막 노드엔 없음) */}
        {!isLast && (
          <div className={`h-[2px] flex-1 ${lineStyle}`} />
        )}
      </div>

      {/* 라벨 + 날짜 (노드 아래) */}
      <div className="mt-2 w-full text-center px-1">
        <div className={`text-[10px] leading-tight ${labelStyle}`}>
          {stage.label}
        </div>
        {stage.completedAt ? (
          <div className={`mt-0.5 text-[9px] num-mono leading-tight ${dateStyle}`}>
            {stage.completedAt.split(' ')[0]}
          </div>
        ) : (
          <div className="mt-0.5 text-[9px] text-ink-700">—</div>
        )}
      </div>
    </div>
  );
}

// ─── 단일 서류 Stepper 카드 ─────────────────────────────────────────────────────

function SubmissionStepperCard({
  submission,
  onResubmit,
}: {
  submission: Submission;
  onResubmit?: (id: string, requestLabel: string, reason?: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const activeStage  = submission.stages.find(s => s.status === 'active');
  const rejectedStage = submission.stages.find(s => s.status === 'rejected');
  const isRejected   = Boolean(rejectedStage);
  const isDone       = submission.stages.every(s => s.status === 'done');

  // 헤더 배지
  const headerBadge = isDone
    ? { label: '최종 승인',   cls: 'bg-signal-ok/10 text-signal-ok   border-signal-ok/30' }
    : isRejected
    ? { label: '보완 요청',   cls: 'bg-red-50       text-red-600     border-red-200' }
    : activeStage
    ? { label: '검토 진행 중', cls: 'bg-accent-50    text-accent-700  border-accent-200' }
    : { label: '대기 중',      cls: 'bg-ink-800      text-ink-400     border-ink-700' };

  return (
    <div
      className={`
        rounded-sm border shadow-control overflow-hidden
        ${isRejected ? 'border-red-300' : 'border-ink-700'}
        bg-white
      `}
    >
      {/* ── 카드 헤더 ────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-ink-800/20 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* 서류 아이콘 */}
          <div
            className={`
              flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border
              ${isRejected
                ? 'border-red-200 bg-red-50 text-red-500'
                : 'border-accent-100 bg-accent-50 text-accent-700'
              }
            `}
          >
            <FileText className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink-100 truncate">
                {submission.documentName}
              </span>
              <span
                className={`
                  shrink-0 rounded-xs border px-2 py-0.5
                  text-[10px] font-semibold
                  ${headerBadge.cls}
                `}
              >
                {headerBadge.label}
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-ink-500">
              최초 제출 <span className="num-mono">{submission.submittedAt}</span>
              {activeStage && (
                <span className="ml-2 text-accent-600 font-semibold">
                  · 현재 {activeStage.no}단계 {activeStage.label}
                </span>
              )}
              {rejectedStage && (
                <span className="ml-2 text-red-500 font-semibold">
                  · {rejectedStage.no}단계에서 반려됨
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 접기/펼치기 */}
        <div className="shrink-0 text-ink-500">
          {expanded
            ? <ChevronUp className="h-4 w-4" />
            : <ChevronDown className="h-4 w-4" />
          }
        </div>
      </button>

      {/* ── 접힌 진행 미니바 (collapsed 상태) ───────────── */}
      {!expanded && (
        <div className="px-5 pb-3">
          <div className="h-1.5 w-full rounded-full bg-ink-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isRejected ? 'bg-red-500' : 'bg-signal-ok'}`}
              style={{
                width: `${(submission.stages.filter(s => s.status === 'done' || s.status === 'rejected').length / 8) * 100}%`,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-ink-600 num-mono">
            <span>1단계</span>
            <span>8단계</span>
          </div>
        </div>
      )}

      {/* ── 펼쳐진 스테퍼 본문 ───────────────────────────── */}
      {expanded && (
        <div className={`border-t px-5 pt-5 pb-4 ${isRejected ? 'border-red-200 bg-red-50/30' : 'border-ink-700 bg-ink-800/20'}`}>

          {/* 가로 Stepper */}
          <div className="flex items-start w-full overflow-x-auto pb-1">
            {submission.stages.map((stage, idx) => (
              <StageNode
                key={stage.no}
                stage={stage}
                isLast={idx === submission.stages.length - 1}
              />
            ))}
          </div>

          {/* ── 반려 패널 ──────────────────────────────────── */}
          {isRejected && rejectedStage && (
            <div className="mt-5 rounded-xs border border-red-300 bg-red-50 p-4">
              {/* 반려 헤더 */}
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-red-400 bg-red-100">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-red-800">
                    {rejectedStage.no}단계 &ldquo;{rejectedStage.label}&rdquo; 에서 보완 요청되었습니다
                  </div>
                  {rejectedStage.completedAt && (
                    <div className="mt-0.5 text-[10px] text-red-500 num-mono">
                      {rejectedStage.completedAt}
                    </div>
                  )}
                </div>
              </div>

              {/* 반려 사유 */}
              {submission.rejectionReason && (
                <div className="mt-3 rounded-xs border border-red-200 bg-white px-3 py-2.5">
                  <div className="text-[10px] font-bold text-red-500 mb-1">사유</div>
                  <p className="text-xs text-red-800 leading-5">
                    {submission.rejectionReason}
                  </p>
                </div>
              )}

              {/* 재제출 버튼 */}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    // requestItems.label과 매핑하여 자동 체크가 정확히 동작하도록
                    const requestLabel =
                      DOC_NAME_TO_REQUEST_LABEL[submission.documentName]
                      ?? submission.documentName;
                    onResubmit?.(submission.id, requestLabel, submission.rejectionReason);
                  }}
                  className="
                    inline-flex items-center gap-2
                    rounded-xs border border-red-400 bg-white
                    px-4 py-2 text-xs font-bold text-red-600
                    shadow-control
                    hover:bg-red-600 hover:text-white hover:border-red-600
                    transition-colors duration-150
                  "
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  재제출 하기
                </button>
              </div>
            </div>
          )}

          {/* ── 승인 완료 패널 + DPP QR 다운로드 (기획서 E-3: batch_completed) ── */}
          {isDone && (
            <div className="mt-5 rounded-xs border border-signal-ok/40 bg-signal-ok/5 p-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-signal-ok shrink-0" strokeWidth={2.5} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-signal-ok">최종 승인 완료</div>
                  <div className="text-[10px] text-ink-500 mt-0.5">
                    DPP가 발행됐습니다. QR 코드를 다운로드해 고객사에 제출하세요.
                  </div>
                </div>
                {/* DPP QR 다운로드 버튼 — 기획서 E-3: stage_issuance + batch_completed 시 표시 */}
                <button
                  type="button"
                  onClick={() => alert('DPP QR 코드 다운로드 (API 연동 예정)')}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xs border border-signal-ok bg-white px-3 py-2 text-xs font-bold text-signal-ok shadow-control hover:bg-signal-ok hover:text-white transition-colors"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  DPP QR 다운로드
                  <Download className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 메인 Export 컴포넌트 ──────────────────────────────────────────────────────
//
//  사용법:
//    import EightStageStepper from '@/components/supplier/EightStageStepper';
//
//    <EightStageStepper
//      submissions={mockSubmissions}        // 기본값으로 내장 mockSubmissions 사용
//      onResubmit={(id, name) => {
//        openWizardRework(name);            // SubmitWizardModal의 reWork 진입
//      }}
//    />

// documentName(서류명) → requestItems label 매핑
// Stepper 내부 서류명과 page.tsx requestItems.label이 다를 경우 여기서 맞춤
const DOC_NAME_TO_REQUEST_LABEL: Record<string, string> = {
  '광산 폴리곤 좌표':    '광산 폴리곤 좌표 등록',
  '탄소 배출 보고서':    '환경영향평가 갱신본 업로드',
  '환경영향평가 보고서': '환경영향평가 갱신본 업로드',
  '원산지 증명서':      '광산 폴리곤 좌표 등록',  // 필요 시 수정
  '광권 갱신 증빙':     '광권 갱신 증빙',
  '커뮤니티 합의서':    '커뮤니티 합의서 제출',
};

interface EightStageStepperProps {
  submissions?: Submission[];
  /** submissionId, requestItems 라벨(매핑 완료), 반려 사유 */
  onResubmit?: (submissionId: string, requestLabel: string, reason?: string) => void;
}

export default function EightStageStepper({
  submissions = mockSubmissions,
  onResubmit,
}: EightStageStepperProps) {
  const rejectedCount = submissions.filter(s => s.stages.some(st => st.status === 'rejected')).length;
  const activeCount   = submissions.filter(s => s.stages.some(st => st.status === 'active')).length;
  const doneCount     = submissions.filter(s => s.stages.every(st => st.status === 'done')).length;

  return (
    <div className="space-y-3">
      {/* 상단 요약 배지 바 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-ink-400">
          {submissions.length}건 추적 중
        </span>
        <span className="h-3 w-px bg-ink-700" />
        {doneCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-xs border border-signal-ok/30 bg-signal-ok/10 px-2 py-0.5 text-[10px] font-semibold text-signal-ok">
            <CheckCircle2 className="h-3 w-3" /> 승인 {doneCount}건
          </span>
        )}
        {activeCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-xs border border-accent-200 bg-accent-50 px-2 py-0.5 text-[10px] font-semibold text-accent-700">
            검토 중 {activeCount}건
          </span>
        )}
        {rejectedCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-xs border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
            <AlertTriangle className="h-3 w-3" /> 보완 요청 {rejectedCount}건
          </span>
        )}
      </div>

      {/* 서류별 Stepper 카드 목록 */}
      {submissions.map(sub => (
        <SubmissionStepperCard
          key={sub.id}
          submission={sub}
          onResubmit={onResubmit}
        />
      ))}
    </div>
  );
}
