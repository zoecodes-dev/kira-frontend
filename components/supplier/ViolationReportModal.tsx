'use client';

/**
 * ViolationReportModal.tsx
 * 규제 위반 시정 조치 계획 및 소명서 제출 모달
 *
 * ── 사용법 ──────────────────────────────────────────────────────────────────
 *  import ViolationReportModal from '@/components/supplier/ViolationReportModal';
 *
 *  <ViolationReportModal
 *    open={violationModalOpen}
 *    onClose={() => setViolationModalOpen(false)}
 *  />
 * ────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Paperclip,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import clsx from 'clsx';

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export interface ViolationReportModalProps {
  /** 모달 오픈 여부 */
  open: boolean;
  /** 닫기 콜백 */
  onClose: () => void;
  /**
   * 위반 내역 — 외부에서 주입 가능, 기본값은 Mock 데이터
   * (실제 API 연동 시 compliance_results 레코드를 전달)
   */
  violation?: ViolationItem;
}

export interface ViolationItem {
  violationId: string;
  regulation: string;       // e.g. 'UFLPA'
  regulationLabel: string;  // e.g. 'UFLPA 위구르 강제노동 방지법'
  summary: string;          // 위반 요약 문장
  detectedAt: string;       // ISO date string
  severity: 'high' | 'critical';
}

// ─── Mock 기본 위반 데이터 ────────────────────────────────────────────────────

const DEFAULT_VIOLATION: ViolationItem = {
  violationId: 'VIO-2026-0042',
  regulation: 'UFLPA',
  regulationLabel: 'UFLPA 위구르 강제노동 방지법',
  summary: '신장(Xinjiang) 지역 코발트 정련소 사용 추정 — 공급원 역추적 증빙 불충분. 소명 자료 제출 필요.',
  detectedAt: '2026-06-05',
  severity: 'critical',
};

// ─── 파일 항목 ────────────────────────────────────────────────────────────────

interface AttachedFile {
  id: string;
  file: File;
  state: 'ready' | 'uploading' | 'done';
  progress: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

// ─── 라벨 + 서브텍스트 래퍼 ──────────────────────────────────────────────────

function FieldLabel({ label, sub, required }: { label: string; sub?: string; required?: boolean }) {
  return (
    <div className="mb-1.5">
      <span className="text-xs font-bold text-ink-400">
        {label}
        {required && <span className="ml-1 text-alert-text">*</span>}
      </span>
      {sub && <span className="ml-2 text-[10px] text-ink-600">{sub}</span>}
    </div>
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

export default function ViolationReportModal({
  open,
  onClose,
  violation = DEFAULT_VIOLATION,
}: ViolationReportModalProps) {
  // ── 폼 상태 ────────────────────────────────────────────────────────────────
  const [reason, setReason]             = useState('');
  const [plan, setPlan]                 = useState('');
  const [targetDate, setTargetDate]     = useState('');
  const [files, setFiles]               = useState<AttachedFile[]>([]);
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [dragging, setDragging]         = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 모달 열릴 때마다 폼 초기화
  useEffect(() => {
    if (open) {
      setReason('');
      setPlan('');
      setTargetDate('');
      setFiles([]);
      setSubmitting(false);
      setSubmitted(false);
      setErrors({});
    }
  }, [open]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitted) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, submitted, onClose]);

  // ── 유효성 검사 ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!reason.trim())     next.reason     = '발생 사유 및 소명 내용을 입력해 주세요.';
    if (!plan.trim())       next.plan       = '시정 조치 계획을 입력해 주세요.';
    if (!targetDate)        next.targetDate = '조치 완료 예정일을 선택해 주세요.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── 파일 추가 (모의 업로드 진행) ───────────────────────────────────────────
  function addFiles(fileList: FileList) {
    const newItems: AttachedFile[] = Array.from(fileList).map(f => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file: f,
      state: 'uploading',
      progress: 0,
    }));
    setFiles(prev => [...prev, ...newItems]);

    newItems.forEach(item => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 25) + 10;
        if (progress >= 100) {
          clearInterval(interval);
          setFiles(prev =>
            prev.map(f => f.id === item.id ? { ...f, progress: 100, state: 'done' } : f)
          );
        } else {
          setFiles(prev =>
            prev.map(f => f.id === item.id ? { ...f, progress } : f)
          );
        }
      }, 200);
    });
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  // ── 제출 ───────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    // Mock: 1.5초 후 완료 처리 (실제 API로 교체)
    await new Promise(res => setTimeout(res, 1500));
    setSubmitting(false);
    setSubmitted(true);
  }

  // ── 드래그 앤 드롭 ─────────────────────────────────────────────────────────
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  if (!open) return null;

  const severityColor = violation.severity === 'critical' ? 'text-alert-text' : 'text-warn-text';
  const severityBg    = violation.severity === 'critical' ? 'bg-alert-solid' : 'bg-warn-solid';

  return (
    /* ── 오버레이 ──────────────────────────────────────────────────────────── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="시정 조치 계획 제출"
    >
      {/* 딤 배경 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => !submitted && onClose()}
        aria-hidden="true"
      />

      {/* ── 모달 패널 ────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-sm border border-alert-border bg-white shadow-[0_24px_64px_rgba(0,0,0,0.20)] max-h-[92vh]">

        {/* ── 헤더 (빨간 경고 톤) ──────────────────────────────────────── */}
        <div className="flex shrink-0 items-start justify-between gap-4 rounded-t-sm border-b border-alert-border bg-alert-bg px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border border-alert-border bg-white">
              <ShieldAlert className="h-5 w-5 text-alert-text" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-xs font-bold text-alert-text">시정 조치 계획 및 소명서 제출</div>
              <div className="mt-0.5 text-[10px] text-alert-text">
                규제 위반 적발 건에 대한 공식 소명 및 시정 계획을 원청사에 제출합니다
              </div>
            </div>
          </div>
          {!submitted && (
            <button
              type="button"
              onClick={onClose}
              aria-label="모달 닫기"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-alert-border text-alert-text hover:border-alert-border hover:text-alert-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ── 본문 (스크롤 가능) ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── 제출 완료 화면 ─────────────────────────────────────────── */}
          {submitted ? (
            <div className="flex flex-col items-center justify-center gap-4 py-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-signal-ok bg-signal-ok/10">
                <CheckCircle2 className="h-8 w-8 text-signal-ok" strokeWidth={2.2} />
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-ink-100">소명서가 제출되었습니다</div>
                <div className="mt-1 text-xs text-ink-500">
                  원청사 담당자가 검토 후 결과를 안내드립니다.
                </div>
              </div>
              <div className="w-full rounded-xs border border-ink-700 bg-ink-800 px-5 py-4 text-center">
                <div className="text-[10px] uppercase tracking-wider text-ink-500">위반 ID</div>
                <div className="mt-1 num-mono text-xs font-bold text-ink-100">{violation.violationId}</div>
                <div className="mt-2 text-[10px] text-ink-400">
                  조치 완료 예정일 <span className="font-semibold text-ink-200">{targetDate}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">

              {/* ① 위반 내역 (Read-only) ─────────────────────────────── */}
              <div>
                <FieldLabel label="위반 내역" sub="원청사 판정 결과 · 수정 불가" />
                <div className="rounded-xs border border-alert-border bg-alert-bg px-4 py-3">
                  {/* 규제 배지 + ID */}
                  <div className="mb-2 flex items-center gap-2">
                    <span className={clsx(
                      'rounded-xs border px-2 py-0.5 text-[10px] font-bold',
                      violation.severity === 'critical'
                        ? 'border-alert-border bg-alert-bg text-alert-text'
                        : 'border-warn-border bg-warn-bg text-warn-text'
                    )}>
                      {violation.regulation}
                    </span>
                    <span className="num-mono text-[10px] text-ink-500">{violation.violationId}</span>
                    <span className="ml-auto num-mono text-[10px] text-ink-500">
                      적발일 {violation.detectedAt}
                    </span>
                  </div>
                  {/* 규제 전체명 */}
                  <div className="text-xs font-bold text-alert-text mb-1">{violation.regulationLabel}</div>
                  {/* 위반 요약 */}
                  <div className="text-xs leading-5 text-alert-text">{violation.summary}</div>
                  {/* 심각도 바 */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-alert-bg overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full', severityBg)}
                        style={{ width: violation.severity === 'critical' ? '100%' : '65%' }}
                      />
                    </div>
                    <span className={clsx('text-[10px] font-bold', severityColor)}>
                      {violation.severity === 'critical' ? '최고위험' : '고위험'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ② 발생 사유 및 소명 ─────────────────────────────────── */}
              <div>
                <FieldLabel
                  label="발생 사유 및 소명"
                  sub="위반이 발생하게 된 경위와 소명 내용을 구체적으로 작성해 주세요"
                  required
                />
                <textarea
                  value={reason}
                  onChange={e => {
                    setReason(e.target.value);
                    if (errors.reason) setErrors(prev => ({ ...prev, reason: '' }));
                  }}
                  placeholder="예) 당사는 해당 코발트 정련소가 신장 지역과 무관한 것으로 인지하고 있었으나, 2026년 5월 실사 결과 간접 연계 가능성이 확인되었습니다. 이에 공급원 변경 절차를 즉시 개시하였습니다..."
                  rows={4}
                  className={clsx(
                    'w-full rounded-xs border px-3 py-2.5 text-xs text-ink-100 leading-5 resize-y',
                    'placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-alert-border focus:border-alert-border',
                    'transition-colors',
                    errors.reason ? 'border-alert-border bg-alert-bg' : 'border-ink-600 bg-white focus:border-alert-border'
                  )}
                />
                {errors.reason && (
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-alert-text">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {errors.reason}
                  </div>
                )}
              </div>

              {/* ③ 시정 조치 계획 ────────────────────────────────────── */}
              <div>
                <FieldLabel
                  label="시정 조치 계획"
                  sub="구체적인 개선 플랜, 대체 공급원, 일정을 명시해 주세요"
                  required
                />
                <textarea
                  value={plan}
                  onChange={e => {
                    setPlan(e.target.value);
                    if (errors.plan) setErrors(prev => ({ ...prev, plan: '' }));
                  }}
                  placeholder="예) 1단계(2026-06-15): 기존 정련소 계약 즉시 중단 / 2단계(2026-06-30): 필리핀 Coral Bay Nickel 전환 계약 체결 / 3단계(2026-07-15): 대체 공급원 원산지 증빙 재제출..."
                  rows={4}
                  className={clsx(
                    'w-full rounded-xs border px-3 py-2.5 text-xs text-ink-100 leading-5 resize-y',
                    'placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-alert-border',
                    'transition-colors',
                    errors.plan ? 'border-alert-border bg-alert-bg' : 'border-ink-600 bg-white focus:border-alert-border'
                  )}
                />
                {errors.plan && (
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-alert-text">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {errors.plan}
                  </div>
                )}
              </div>

              {/* ④ 조치 완료 예정일 ──────────────────────────────────── */}
              <div>
                <FieldLabel label="조치 완료 예정일" required />
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500 pointer-events-none" />
                  <input
                    type="date"
                    value={targetDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => {
                      setTargetDate(e.target.value);
                      if (errors.targetDate) setErrors(prev => ({ ...prev, targetDate: '' }));
                    }}
                    className={clsx(
                      'w-full rounded-xs border pl-9 pr-3 py-2.5 text-xs text-ink-100',
                      'focus:outline-none focus:ring-2 focus:ring-alert-border transition-colors',
                      errors.targetDate ? 'border-alert-border bg-alert-bg' : 'border-ink-600 bg-white focus:border-alert-border'
                    )}
                  />
                </div>
                {errors.targetDate && (
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-alert-text">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {errors.targetDate}
                  </div>
                )}
              </div>

              {/* ⑤ 증빙 자료 첨부 ────────────────────────────────────── */}
              <div>
                <FieldLabel
                  label="증빙 자료 첨부"
                  sub="PDF, 이미지, Excel · 선택사항 (권장)"
                />
                {/* 드롭존 */}
                <div
                  onDragEnter={() => setDragging(true)}
                  onDragLeave={() => setDragging(false)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={clsx(
                    'flex flex-col items-center justify-center gap-2 rounded-xs border-2 border-dashed',
                    'px-6 py-6 cursor-pointer select-none transition-colors',
                    dragging
                      ? 'border-alert-border bg-alert-bg'
                      : 'border-ink-600 bg-ink-800/20 hover:border-alert-border hover:bg-alert-bg'
                  )}
                >
                  <Paperclip className={clsx(
                    'h-6 w-6 transition-colors',
                    dragging ? 'text-alert-text' : 'text-ink-500'
                  )} />
                  <div className="text-center">
                    <div className="text-xs font-semibold text-ink-300">
                      {dragging ? '여기에 파일을 놓아주세요' : '파일을 드래그하거나 클릭해서 첨부'}
                    </div>
                    <div className="mt-0.5 text-[10px] text-ink-500">PDF, xlsx, docx, jpg, png · 최대 50MB</div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={e => { if (e.target.files) addFiles(e.target.files); }}
                  />
                </div>

                {/* 첨부 파일 목록 */}
                {files.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {files.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xs border border-ink-700 bg-white px-3 py-2.5"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-ink-500" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="truncate text-[10px] font-semibold text-ink-100">
                              {item.file.name}
                            </span>
                            <span className="shrink-0 num-mono text-[10px] text-ink-500">
                              {formatBytes(item.file.size)}
                            </span>
                          </div>
                          {/* 진행 바 */}
                          <div className="h-1 w-full rounded-full bg-ink-700 overflow-hidden">
                            <div
                              className={clsx(
                                'h-full rounded-full transition-all duration-300',
                                item.state === 'done' ? 'bg-signal-ok' : 'bg-alert-solid'
                              )}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <div className="mt-0.5 text-[9px] text-ink-500">
                            {item.state === 'done'
                              ? '✓ 업로드 완료'
                              : `업로드 중 ${item.progress}%`
                            }
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(item.id)}
                          className="shrink-0 rounded-xs p-1 text-ink-500 hover:bg-alert-bg hover:text-alert-text"
                          aria-label={`${item.file.name} 삭제`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 주의 안내 */}
              <div className="flex items-start gap-2.5 rounded-xs border border-warn-border bg-warn-bg px-3 py-3">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warn-text mt-0.5" />
                <div className="text-[10px] text-warn-text leading-5">
                  제출한 소명서는 원청사 규제 대응팀이 검토합니다. 허위 사실 기재 시 계약 해지 및 법적 책임이 발생할 수 있습니다.
                  제출 후 수정이 불가하므로 내용을 충분히 검토해 주세요.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 푸터: 액션 버튼 ──────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-b-sm border-t border-alert-border bg-alert-bg px-6 py-4">
          <div className="text-[10px] text-ink-500">
            {submitted
              ? '검토까지 평균 1~2 영업일이 소요됩니다.'
              : `위반 ID: ${violation.violationId}`
            }
          </div>
          <div className="flex items-center gap-2">
            {!submitted ? (
              <>
                {/* 취소 버튼 */}
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-4 py-2 text-xs font-semibold text-ink-400 hover:border-ink-500 hover:text-ink-200 transition-colors"
                >
                  취소
                </button>

                {/* 최종 제출 버튼 — 빨간 강조 */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-xs px-5 py-2.5',
                    'text-xs font-bold text-white shadow-control transition-colors',
                    submitting
                      ? 'bg-alert-solid cursor-not-allowed'
                      : 'bg-alert-solid hover:bg-alert-solid active:bg-alert-solid'
                  )}
                >
                  {submitting ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 제출 중...</>
                  ) : (
                    <><ShieldAlert className="h-3.5 w-3.5" /> 시정 계획 최종 제출</>
                  )}
                </button>
              </>
            ) : (
              /* 제출 완료 후 닫기 버튼 */
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xs bg-signal-ok px-5 py-2.5 text-xs font-bold text-white hover:bg-ok-solid shadow-control"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> 확인 후 닫기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
