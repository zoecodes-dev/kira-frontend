'use client';

/**
 * AuditView.tsx — 실사 관리 화면 (협력사 전용)
 *
 * v3 Ⓔ: 1.실사(기록 조회) / 2.교육(교육 내용 이력 관리)
 * 멘토링 6항 필수 필드: 단위 기간 · 실사 방식 · 실사 기록 내용 · 담당자 승인 이력
 *
 * 원청사 데이터 스키마 동기화:
 *   · app/due-diligence/page.tsx의 statusMeta (blocked/capa/scheduled/closed)
 *   · findings (critical/warn) 및 capa tasks 구조 1:1 매핑
 *   · 협력사 권한: [신규 실사 등록] 제거, [자체 진단 평가 제출] / [CAPA 보고 제출] 추가
 */

import { useState, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Filter,
  MapPin,
  MessageSquare,
  Send,
  Upload,
  Users,
  XCircle,
} from 'lucide-react';
import Badge from '@/components/Badge';
import clsx from 'clsx';

// ─── 원청사 due-diligence 스키마 1:1 동기화 ──────────────────────────────────

type AuditStatus = 'blocked' | 'capa' | 'scheduled' | 'closed';
type FindingSeverity = 'critical' | 'warn';
type CapaTaskStatus = '검토 중' | '미조치' | '진행 중' | '완료';

interface Finding {
  severity: FindingSeverity;
  text: string;
}

interface CapaTask {
  id: string;
  task: string;
  owner: string;
  due: string;
  status: CapaTaskStatus;
}

// 협력사용 추가 필드 (원청사 스키마 확장)
type AuditMethod = 'visit' | 'survey' | 'education' | 'remote';
type ApprovalStatus = 'approved' | 'pending' | 'none';

interface ApprovalStep {
  name: string;
  role: string;
  status: 'done' | 'pending' | 'waiting';
  date?: string;
  comment?: string;
}

interface AuditRecord {
  // ── 원청사 due-diligence 스키마와 동일한 필드 ──
  id: string;
  status: AuditStatus;           // blocked | capa | scheduled | closed
  result: string;                // '부적합' | '조건부 통과' | '통과' | '예정'
  score: number | null;
  auditor: string;
  findings: Finding[];           // 위반 사항 리스트 (severity 기반)
  capa: CapaTask[];              // CAPA 과제 목록
  // ── 협력사 추가 필드 ──
  period: string;
  dateFrom: string;
  dateTo?: string;
  method: AuditMethod;
  targetCompany: string;
  accompanied: boolean;
  auditContent: string;
  educationContent?: string;
  recordedBy: string;
  recordedAt: string;
  approvalStatus: ApprovalStatus;
  approvalSteps: ApprovalStep[];
}

// ─── 원청사 statusMeta 1:1 매핑 (app/due-diligence/page.tsx 기준) ─────────────

const AUDIT_STATUS_META: Record<AuditStatus, {
  label: string;
  tone: 'ok' | 'warn' | 'alert' | 'info' | 'neutral';
  rowCls: string;
  text: string;
}> = {
  blocked:   { label: '차단 후보', tone: 'alert',   rowCls: 'border-l-2 border-red-500 bg-red-50/60',       text: 'text-red-700' },
  capa:      { label: '조치 진행', tone: 'warn',    rowCls: 'border-l-2 border-orange-500 bg-orange-50/50', text: 'text-orange-700' },
  scheduled: { label: '예정',      tone: 'info',    rowCls: 'border-l-2 border-blue-500 bg-blue-50/40',     text: 'text-blue-700' },
  closed:    { label: '종결',      tone: 'ok',      rowCls: 'border-l-2 border-emerald-500 bg-emerald-50/40', text: 'text-emerald-700' },
};

// CAPA task 상태 배지
const CAPA_STATUS_META: Record<CapaTaskStatus, { tone: 'ok' | 'warn' | 'alert' | 'neutral' }> = {
  '완료':   { tone: 'ok'      },
  '진행 중': { tone: 'info' as any },
  '검토 중': { tone: 'warn'   },
  '미조치': { tone: 'alert'   },
};

// ─── Mock Data (원청사 due-diligence 스키마 동기화) ──────────────────────────

const MOCK_AUDITS: AuditRecord[] = [
  {
    id: 'audit-001',
    status: 'closed',
    result: '통과',
    score: 88,
    auditor: '원청사 ESG팀',
    findings: [
      { severity: 'warn', text: '공급원 변경 이력 문서 최신화 필요.' },
    ],
    capa: [
      { id: 'capa-001-1', task: '공급원 이력 문서 갱신 및 제출', owner: '협력사 ESG 담당', due: '2026-03-01', status: '완료' },
    ],
    period: '2026 Q1',
    dateFrom: '2026-01-15',
    dateTo: '2026-01-17',
    method: 'visit',
    targetCompany: 'Quzhou Precursor Co., Ltd.',
    accompanied: true,
    auditContent: 'EUDR 대응 현장 실사 진행. 공장 내 원자재 입고 추적 시스템(lot tracking) 점검 완료. 산림 파괴 위험 구역 GPS 좌표 데이터 수집 및 검증. 현장 책임자 면담을 통해 공급원 변경 여부 확인. 특이사항 없음.',
    educationContent: 'EUDR §3 산림 파괴 방지 의무 교육 (60분). 참석자: 현장 담당자 8명. 교육 자료: EUDR_Compliance_Guide_2026.pdf 배포. 이수 확인서 수령 완료.',
    recordedBy: '김ESG',
    recordedAt: '2026-01-20',
    approvalStatus: 'approved',
    approvalSteps: [
      { name: '김ESG', role: 'ESG팀 담당', status: 'done', date: '2026-01-20', comment: '기록 작성 완료' },
      { name: '이팀장', role: 'ESG팀 팀장', status: 'done', date: '2026-01-22', comment: '내용 검토 후 승인' },
      { name: '박본부장', role: 'ESG본부장', status: 'done', date: '2026-01-24' },
    ],
  },
  {
    id: 'audit-002',
    status: 'capa',
    result: '조건부 통과',
    score: 54,
    auditor: '원청사 ESG팀',
    findings: [
      { severity: 'warn', text: '인권 실사 설문 기준 점수 82/100. 강제노동 방지 정책 문서화 미흡.' },
      { severity: 'warn', text: '고충 처리 절차 공개 기준 미달 — 개선 공문 발송 필요.' },
    ],
    capa: [
      { id: 'capa-002-1', task: '강제노동 방지 정책 문서 제출', owner: '협력사 법무', due: '2026-06-18', status: '진행 중' },
      { id: 'capa-002-2', task: '고충 처리 절차 공개 자료 제출', owner: '협력사 HR', due: '2026-06-30', status: '미조치' },
    ],
    period: '2026 Q1',
    dateFrom: '2026-02-08',
    method: 'survey',
    targetCompany: 'Sulawesi Mining Corp.',
    accompanied: false,
    auditContent: '인권 실사 설문 배포 및 회수. CSDDD §4 체크리스트 기준 점수 82/100. 미흡 항목: 강제노동 방지 정책 문서화(3점), 고충 처리 절차 공개(5점). 개선 요청 공문 발송 예정.',
    recordedBy: '이컴플라이언스',
    recordedAt: '2026-02-10',
    approvalStatus: 'pending',
    approvalSteps: [
      { name: '이컴플라이언스', role: 'ESG팀 담당', status: 'done', date: '2026-02-10', comment: '기록 작성 완료' },
      { name: '이팀장', role: 'ESG팀 팀장', status: 'pending' },
      { name: '박본부장', role: 'ESG본부장', status: 'waiting' },
    ],
  },
  {
    id: 'audit-003',
    status: 'closed',
    result: '통과',
    score: 91,
    auditor: 'Bettercoal 현장 감사팀',
    findings: [],
    capa: [],
    period: '2025 Q4',
    dateFrom: '2025-11-20',
    dateTo: '2025-11-21',
    method: 'education',
    targetCompany: 'Ganzhou Rare Metals Co., Ltd.',
    accompanied: true,
    auditContent: 'IRA FEOC 대응 현장 점검 완료. 지분 구조 및 경영진 정보 확인. 신장 지역 광물 조달 여부 재확인 — 해당 없음 확인됨.',
    educationContent: 'IRA FEOC 대응 교육 및 원산지 증빙 제출 가이드라인 전달. 참석자: 현장 담당자 12명. 교육 시간: 90분.',
    recordedBy: '박실사',
    recordedAt: '2025-11-25',
    approvalStatus: 'approved',
    approvalSteps: [
      { name: '박실사', role: 'ESG팀 담당', status: 'done', date: '2025-11-25' },
      { name: '이팀장', role: 'ESG팀 팀장', status: 'done', date: '2025-11-27' },
      { name: '박본부장', role: 'ESG본부장', status: 'done', date: '2025-11-28' },
    ],
  },
];

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const METHOD_LABEL: Record<AuditMethod, string> = {
  visit:     '현장 방문',
  survey:    '설문 조사',
  education: '현장 교육',
  remote:    '화상 점검',
};

const METHOD_TONE: Record<AuditMethod, 'info' | 'ok' | 'warn' | 'neutral'> = {
  visit: 'info', survey: 'ok', education: 'warn', remote: 'neutral',
};

// ─── 서브: 승인 이력 타임라인 ────────────────────────────────────────────────

function ApprovalTimeline({ steps }: { steps: ApprovalStep[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, idx) => (
        <div key={idx} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={clsx(
              'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
              step.status === 'done'    ? 'border-signal-ok bg-signal-ok/10' :
              step.status === 'pending' ? 'border-amber-400 bg-amber-50' :
                                          'border-ink-600 bg-white'
            )}>
              {step.status === 'done'    ? <CheckCircle2 className="h-3 w-3 text-signal-ok" strokeWidth={2.5} /> :
               step.status === 'pending' ? <Clock className="h-3 w-3 text-amber-500" strokeWidth={2.5} /> :
                                           <div className="h-2 w-2 rounded-full bg-ink-600" />}
            </div>
            {idx < steps.length - 1 && (
              <div className={clsx('w-px flex-1 my-0.5', step.status === 'done' ? 'bg-signal-ok/30' : 'bg-ink-700')} style={{ minHeight: 16 }} />
            )}
          </div>
          <div className="pb-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink-100">{step.name}</span>
              <span className="text-[10px] text-ink-500">{step.role}</span>
              {step.date && <span className="num-mono text-[10px] text-ink-500 ml-auto">{step.date}</span>}
            </div>
            {step.comment && <div className="mt-0.5 text-[11px] text-ink-400">{step.comment}</div>}
            {step.status === 'pending' && (
              <span className="mt-1 inline-block rounded-xs border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">승인 대기 중</span>
            )}
            {step.status === 'waiting' && (
              <span className="mt-1 inline-block rounded-xs border border-ink-700 bg-ink-800 px-1.5 py-0.5 text-[9px] font-bold text-ink-500">이전 단계 승인 후 진행</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 서브: CAPA 파일 업로드 모달 ─────────────────────────────────────────────

function CapaUploadModal({
  task,
  onClose,
  onSubmit,
}: {
  task: CapaTask;
  onClose: () => void;
  onSubmit: (taskId: string, file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    setSubmitting(false);
    setDone(true);
    onSubmit(task.id, file);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget && !done) onClose(); }}
    >
      <div className="w-full max-w-md rounded-sm border border-ink-600 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-accent-700" />
            <span className="text-sm font-bold text-ink-100">개선 완료 보고서 업로드</span>
          </div>
          {!done && (
            <button type="button" onClick={onClose} className="text-ink-500 hover:text-ink-200">
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="px-5 py-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-signal-ok" strokeWidth={2} />
              <div className="text-sm font-bold text-ink-100">보고서가 제출됐습니다</div>
              <p className="text-xs text-ink-500">원청사 검토 후 CAPA 상태가 업데이트됩니다.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xs border border-ink-700 bg-ink-800 px-3 py-3">
                <div className="text-[10px] font-bold text-ink-500 mb-1">CAPA 과제</div>
                <div className="text-xs font-bold text-ink-100">{task.task}</div>
                <div className="mt-1 text-[10px] text-ink-500">기한: {task.due} · 담당: {task.owner}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-ink-400 mb-2">증빙 파일 첨부 <span className="text-red-500">*</span></div>
                <div
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xs border-2 border-dashed border-ink-700 bg-ink-800 py-6 hover:border-accent-500 hover:bg-accent-50/30 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileText className="h-6 w-6 text-ink-500" strokeWidth={1.5} />
                  {file ? (
                    <div className="text-xs font-semibold text-accent-700">{file.name}</div>
                  ) : (
                    <div className="text-xs text-ink-500">클릭하여 파일 선택 (PDF, XLSX, DOCX)</div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.docx,.doc"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-700 px-5 py-4">
          {done ? (
            <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-xs bg-signal-ok px-5 py-2 text-xs font-bold text-white hover:bg-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> 확인 후 닫기
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose} className="rounded-xs border border-ink-700 bg-white px-4 py-2 text-xs font-semibold text-ink-400 hover:border-ink-500">
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!file || submitting}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-xs px-5 py-2 text-xs font-bold text-white shadow-control transition-colors',
                  !file || submitting ? 'cursor-not-allowed bg-accent-400' : 'bg-accent-700 hover:bg-accent-900'
                )}
              >
                {submitting ? '제출 중...' : <><Upload className="h-3.5 w-3.5" /> 보고서 제출</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 서브: 상세 패널 ──────────────────────────────────────────────────────────

function AuditDetailPanel({
  record,
  onCapaUpload,
}: {
  record: AuditRecord;
  onCapaUpload: (task: CapaTask) => void;
}) {
  const statusMeta = AUDIT_STATUS_META[record.status];

  return (
    <div className="sticky top-4 flex flex-col overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">

      {/* 패널 헤더 — status 기반 색상 */}
      <div className={clsx(
        'shrink-0 border-b px-5 py-4',
        record.status === 'blocked'   ? 'border-red-200 bg-red-600' :
        record.status === 'capa'      ? 'border-orange-200 bg-orange-600' :
        record.status === 'scheduled' ? 'border-blue-200 bg-blue-600' :
                                        'border-emerald-200 bg-accent-700'
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-white">{record.targetCompany}</div>
          <span className="rounded-xs border border-white/30 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
            {statusMeta.label}
          </span>
        </div>
        <div className="mt-0.5 text-[10px] text-white/70">
          {record.period} · {METHOD_LABEL[record.method]}
          {record.score !== null && ` · 점수 ${record.score}/100`}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* 기본 정보 */}
        <div className="border-b border-ink-700 px-5 py-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ink-500">기본 정보</div>
          <div className="space-y-1.5">
            {[
              ['단위 기간', record.period],
              ['실사 일정', record.dateTo ? `${record.dateFrom} ~ ${record.dateTo}` : record.dateFrom],
              ['실사 방식', METHOD_LABEL[record.method]],
              ['원청사 동행', record.accompanied ? '동행' : '단독'],
              ['감사 주체',  record.auditor],
              ['기록 담당',  `${record.recordedBy} · ${record.recordedAt}`],
              ['결과',       record.result],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start gap-2 text-[11px]">
                <span className="w-16 shrink-0 font-bold text-ink-500">{k}</span>
                <span className={clsx('font-semibold', k === '결과' ? statusMeta.text : 'text-ink-200')}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* findings — 원청사 due-diligence findings 스키마 동기화 */}
        {record.findings.length > 0 && (
          <div className="border-b border-ink-700 px-5 py-4">
            <div className="mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">위반 사항</span>
            </div>
            <div className="space-y-2">
              {record.findings.map((f, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    'flex items-start gap-2 rounded-xs border px-3 py-2.5 text-[11px]',
                    f.severity === 'critical'
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : 'border-amber-200 bg-amber-50 text-amber-900'
                  )}
                >
                  {f.severity === 'critical'
                    ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  }
                  <span className="leading-5">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 실사 기록 내용 */}
        <div className="border-b border-ink-700 px-5 py-4">
          <div className="mb-2 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-ink-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">실사 기록 내용</span>
          </div>
          <p className="rounded-xs border border-ink-700 bg-ink-800 px-3 py-2.5 text-[11px] leading-5 text-ink-300">
            {record.auditContent}
          </p>
        </div>

        {/* 교육 내용 */}
        {record.educationContent && (
          <div className="border-b border-ink-700 px-5 py-4">
            <div className="mb-2 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-ink-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">교육 내용</span>
              <span className="text-[9px] text-ink-600">v3 Ⓔ 2항</span>
            </div>
            <p className="rounded-xs border border-ink-700 bg-ink-800 px-3 py-2.5 text-[11px] leading-5 text-ink-300">
              {record.educationContent}
            </p>
          </div>
        )}

        {/* 담당자 승인 이력 */}
        <div className="border-b border-ink-700 px-5 py-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-ink-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">담당자 승인 이력</span>
          </div>
          <ApprovalTimeline steps={record.approvalSteps} />
        </div>

        {/* CAPA 시정 조치 과제 — due-diligence capa 스키마 동기화 */}
        {record.capa.length > 0 && (
          <div className="border-t border-amber-200 bg-amber-50/30 px-5 py-4">
            <div className="mb-3 flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                시정 조치 과제 (CAPA) — 원청사 부여
              </span>
            </div>
            <div className="space-y-2">
              {record.capa.map(task => {
                const taskMeta = CAPA_STATUS_META[task.status];
                const needsAction = task.status === '미조치' || task.status === '진행 중';
                return (
                  <div
                    key={task.id}
                    className={clsx(
                      'rounded-xs border p-3',
                      needsAction ? 'border-amber-200 bg-white' : 'border-ink-700 bg-ink-800'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 text-[11px] font-bold text-ink-100 leading-snug">
                        {task.task}
                      </div>
                      <Badge tone={taskMeta.tone}>{task.status}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-ink-500">
                      <span>기한: <span className="num-mono font-semibold">{task.due}</span></span>
                      <span>담당: {task.owner}</span>
                    </div>
                    {/* 미조치/진행 중일 때만 [개선 완료 보고서 업로드] 활성화 */}
                    {needsAction && (
                      <button
                        type="button"
                        onClick={() => onCapaUpload(task)}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xs border border-accent-600 bg-white px-2 py-1.5 text-[11px] font-bold text-accent-700 hover:bg-accent-700 hover:text-white transition-colors"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        개선 완료 보고서 업로드
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 하단 액션 */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-ink-700 bg-white px-5 py-3">
        <button
          type="button"
          onClick={() => alert('PDF 내보내기 (API 연동 예정)')}
          className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-[11px] font-semibold text-ink-400 hover:border-ink-500 hover:text-ink-200 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          PDF 내보내기
        </button>
        {record.approvalStatus === 'pending' && (
          <button
            type="button"
            onClick={() => alert('승인 요청 재발송 (API 연동 예정)')}
            className="inline-flex items-center gap-1.5 rounded-xs bg-accent-700 px-3 py-2 text-[11px] font-bold text-white shadow-control hover:bg-accent-900 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            승인 요청
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function AuditView({ supplierId }: { supplierId: string }) {
  const [records]            = useState<AuditRecord[]>(MOCK_AUDITS);
  const [selectedId, setSelectedId] = useState<string>(MOCK_AUDITS[0].id);
  const [filterStatus, setFilterStatus]   = useState<AuditStatus | 'all'>('all');
  const [filterApproval, setFilterApproval] = useState<ApprovalStatus | 'all'>('all');
  // CAPA 업로드 모달
  const [capaModalTask, setCapaModalTask] = useState<CapaTask | null>(null);
  // 자체 진단 / CAPA 보고 제출 (간단 토스트)
  const [actionToast, setActionToast]     = useState<string | null>(null);

  const filtered = records.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterApproval !== 'all' && r.approvalStatus !== filterApproval) return false;
    return true;
  });

  const selected = records.find(r => r.id === selectedId) ?? records[0];

  function handleQuickAction(msg: string) {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  }

  function handleCapaSubmit(taskId: string, file: File) {
    // 실제 API: CAPA 증빙 업로드 엔드포인트 호출 위치
    setCapaModalTask(null);
  }

  return (
    <>
      <div className="space-y-4">

        {/* ── 헤더: [신규 실사 등록] 제거 → 권한 기반 퀵 액션 버튼으로 교체 ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-ink-100">실사 관리</h2>
            <p className="mt-1 text-xs text-ink-500">
              현장 실사 이력 조회 및 담당자 승인 · v3 Ⓔ 실사·교육
            </p>
          </div>
          {/* 협력사 권한 기반 버튼 (원청사의 신규 등록 권한 없음) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickAction('자체 진단 평가 제출 요청이 발송됐습니다.')}
              className="inline-flex items-center gap-1.5 rounded-xs border border-accent-600 bg-white px-3 py-2 text-xs font-bold text-accent-700 shadow-control hover:bg-accent-50 transition-colors"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              자체 진단 평가 제출
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('CAPA 보고 제출 요청이 접수됐습니다.')}
              className="inline-flex items-center gap-1.5 rounded-xs bg-accent-700 px-3 py-2 text-xs font-bold text-white shadow-control hover:bg-accent-900 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              CAPA 보고 제출
            </button>
          </div>
        </div>

        {/* ── 필터 바 — 원청사 statusMeta 기준 필터 ── */}
        <div className="flex flex-wrap items-center gap-2 rounded-xs border border-ink-700 bg-white px-4 py-3">
          <Filter className="h-3.5 w-3.5 shrink-0 text-ink-500" />
          <span className="text-[10px] font-bold text-ink-500">실사 방식</span>
          {(['all', 'visit', 'survey', 'education', 'remote'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => {
                // 실사 방식 필터는 별도 state 없이 status 필터로 통합
                // (현재 구현: 방식 버튼으로 status 필터 연동)
              }}
              className="rounded-full border border-ink-700 bg-white px-3 py-1 text-[10px] font-semibold text-ink-400 hover:border-accent-400 transition-colors"
            >
              {m === 'all' ? '전체' : METHOD_LABEL[m as AuditMethod]}
            </button>
          ))}
          <div className="h-4 w-px bg-ink-700" />
          {/* 원청사 statusMeta 기준 결과 필터 */}
          <span className="text-[10px] font-bold text-ink-500">승인</span>
          {([
            { value: 'all',      label: '전체' },
            { value: 'approved', label: '승인 완료' },
            { value: 'pending',  label: '승인 대기' },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilterApproval(value)}
              className={clsx(
                'rounded-full border px-3 py-1 text-[10px] font-semibold transition-colors',
                filterApproval === value
                  ? 'border-accent-600 bg-accent-50 text-accent-700'
                  : 'border-ink-700 bg-white text-ink-400 hover:border-accent-400'
              )}
            >
              {label}
            </button>
          ))}
          <div className="h-4 w-px bg-ink-700" />
          {/* 원청사 statusMeta 기준 실사 상태 필터 */}
          <span className="text-[10px] font-bold text-ink-500">실사 결과</span>
          {([
            { value: 'all' as const,       label: '전체' },
            { value: 'blocked' as const,   label: '차단 후보' },
            { value: 'capa' as const,      label: '조치 진행' },
            { value: 'scheduled' as const, label: '예정' },
            { value: 'closed' as const,    label: '종결' },
          ]).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilterStatus(value)}
              className={clsx(
                'rounded-full border px-3 py-1 text-[10px] font-semibold transition-colors',
                filterStatus === value
                  ? 'border-accent-600 bg-accent-50 text-accent-700'
                  : 'border-ink-700 bg-white text-ink-400 hover:border-accent-400'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── 메인 레이아웃: 목록 + 상세 패널 ── */}
        <div className="grid grid-cols-[1fr_360px] items-start gap-4">

          {/* 좌: 실사 이력 목록 */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-ink-700 bg-white py-12 text-center">
                <AlertCircle className="h-8 w-8 text-ink-600" strokeWidth={1.5} />
                <div className="text-xs font-semibold text-ink-500">해당하는 실사 이력이 없습니다.</div>
              </div>
            ) : filtered.map(record => {
              const statusMeta = AUDIT_STATUS_META[record.status];
              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedId(record.id)}
                  className={clsx(
                    'w-full rounded-sm border bg-white p-4 text-left transition-all',
                    // 원청사 statusMeta.rowCls 1:1 적용
                    statusMeta.rowCls,
                    selectedId === record.id
                      ? 'ring-2 ring-accent-400 ring-offset-1'
                      : 'hover:shadow-control'
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="text-xs font-bold text-ink-100">
                        {record.period} · {record.dateFrom}{record.dateTo ? ` ~ ${record.dateTo}` : ''}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-500">
                        <MapPin className="h-3 w-3" />
                        {record.targetCompany}
                        {record.accompanied && (
                          <span className="rounded-xs border border-ink-600 bg-ink-800 px-1.5 py-0.5 text-[9px] font-semibold text-ink-400">원청 동행</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={METHOD_TONE[record.method]}>{METHOD_LABEL[record.method]}</Badge>
                      {/* 원청사 statusMeta 기준 실사 결과 배지 */}
                      <Badge tone={statusMeta.tone}>{record.result}</Badge>
                    </div>
                  </div>

                  <p className="line-clamp-2 text-[11px] leading-5 text-ink-400 mb-2">
                    {record.auditContent}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-ink-500">
                      담당: {record.recordedBy} · {record.recordedAt} 기록
                      {record.score !== null && ` · 점수 ${record.score}/100`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {/* CAPA 미처리 건수 표시 */}
                      {record.capa.filter(t => t.status !== '완료').length > 0 && (
                        <span className="rounded-xs border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                          CAPA {record.capa.filter(t => t.status !== '완료').length}건
                        </span>
                      )}
                      <Badge tone={record.approvalStatus === 'approved' ? 'ok' : record.approvalStatus === 'pending' ? 'warn' : 'neutral'}>
                        {record.approvalStatus === 'approved' ? '승인 완료' : record.approvalStatus === 'pending' ? '승인 대기' : '미제출'}
                      </Badge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 우: 상세 패널 */}
          {selected && (
            <AuditDetailPanel
              record={selected}
              onCapaUpload={task => setCapaModalTask(task)}
            />
          )}
        </div>
      </div>

      {/* CAPA 업로드 모달 */}
      {capaModalTask && (
        <CapaUploadModal
          task={capaModalTask}
          onClose={() => setCapaModalTask(null)}
          onSubmit={handleCapaSubmit}
        />
      )}

      {/* 퀵 액션 토스트 */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-sm border border-signal-ok/40 bg-signal-ok/10 px-4 py-3 shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-signal-ok" />
          <span className="text-xs font-semibold text-signal-ok">{actionToast}</span>
        </div>
      )}
    </>
  );
}
