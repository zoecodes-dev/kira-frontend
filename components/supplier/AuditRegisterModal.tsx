'use client';

/**
 * AuditRegisterModal.tsx — 신규 실사 등록 모달
 * 멘토링 6항 필수 필드: 단위 기간 · 실사 방식 · 실사 기록 내용 · 교육 내용
 * v3 Ⓔ: 1.실사 / 2.교육
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Loader2, X } from 'lucide-react';
import clsx from 'clsx';

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export type AuditMethod = 'visit' | 'survey' | 'education' | 'remote';

export interface AuditRegisterModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AuditFormData) => void;
}

export interface AuditFormData {
  period: string;          // 단위 기간 (예: 2026 Q2)
  dateFrom: string;        // 실사 시작일
  dateTo: string;          // 실사 종료일
  method: AuditMethod;     // 실사 방식
  targetCompany: string;   // 대상 업체
  accompanied: boolean;    // 원청사 동행 여부
  auditContent: string;    // 실사 기록 내용
  educationContent: string;// 교육 내용 (선택)
}

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const METHOD_OPTIONS: { value: AuditMethod; label: string }[] = [
  { value: 'visit',      label: '현장 방문' },
  { value: 'survey',     label: '설문 조사' },
  { value: 'education',  label: '현장 교육' },
  { value: 'remote',     label: '화상 점검' },
];

const PERIOD_OPTIONS = ['2026 Q1', '2026 Q2', '2026 Q3', '2026 Q4', '2025 Q4'];

// 연결된 파트너사 목록 Mock — 실제 API 연동 시 교체
const PARTNER_OPTIONS = [
  'Quzhou Precursor Co., Ltd.',
  'Sulawesi Mining Corp.',
  'Ganzhou Rare Metals Co., Ltd.',
];

// ─── 라벨 컴포넌트 ─────────────────────────────────────────────────────────────

function FieldLabel({ label, sub, required }: { label: string; sub?: string; required?: boolean }) {
  return (
    <div className="mb-1.5">
      <span className="text-xs font-bold text-ink-400">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {sub && <span className="ml-2 text-[10px] text-ink-600">{sub}</span>}
    </div>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function AuditRegisterModal({ open, onClose, onSubmit }: AuditRegisterModalProps) {
  const [period, setPeriod]               = useState('');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');
  const [method, setMethod]               = useState<AuditMethod>('visit');
  const [targetCompany, setTargetCompany] = useState('');
  const [accompanied, setAccompanied]     = useState(false);
  const [auditContent, setAuditContent]   = useState('');
  const [educationContent, setEducationContent] = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [submitted, setSubmitted]         = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setPeriod('');
      setDateFrom('');
      setDateTo('');
      setMethod('visit');
      setTargetCompany('');
      setAccompanied(false);
      setAuditContent('');
      setEducationContent('');
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

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!period)               next.period        = '단위 기간을 선택해 주세요.';
    if (!dateFrom)             next.dateFrom      = '실사 시작일을 입력해 주세요.';
    if (!targetCompany)        next.targetCompany = '대상 업체를 선택해 주세요.';
    if (!auditContent.trim())  next.auditContent  = '실사 기록 내용을 입력해 주세요.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise(res => setTimeout(res, 1000));
    const data: AuditFormData = {
      period, dateFrom, dateTo, method, targetCompany,
      accompanied, auditContent, educationContent,
    };
    setSubmitting(false);
    setSubmitted(true);
    onSubmit(data);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget && !submitted) onClose(); }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-sm border border-ink-600 bg-white shadow-2xl">

        {/* ── 헤더 ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xs border border-amber-200 bg-amber-50">
              <ClipboardCheck className="h-4 w-4 text-amber-700" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink-100">신규 실사 등록</div>
              <div className="mt-0.5 text-[10px] text-ink-500">v3 Ⓔ 실사·교육 · 멘토링 6항 필수 필드</div>
            </div>
          </div>
          {!submitted && (
            <button type="button" onClick={onClose} className="rounded-xs p-1.5 text-ink-500 hover:bg-ink-800 hover:text-ink-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── 본문 ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-signal-ok bg-signal-ok/10">
                <CheckCircle2 className="h-7 w-7 text-signal-ok" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-sm font-bold text-ink-100">실사 기록이 등록됐습니다</div>
                <p className="mt-2 text-xs leading-5 text-ink-500">
                  담당자 승인 요청이 발송됐습니다.<br />승인 완료 후 이력에 반영됩니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">

              {/* 단위 기간 + 실사 일정 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="단위 기간" required />
                  <select
                    value={period}
                    onChange={e => { setPeriod(e.target.value); if (errors.period) setErrors(p => ({ ...p, period: '' })); }}
                    className={clsx(
                      'w-full rounded-xs border px-3 py-2.5 text-xs font-semibold outline-none transition-colors',
                      errors.period ? 'border-red-400 bg-red-50' : 'border-ink-600 bg-white focus:border-accent-600'
                    )}
                  >
                    <option value="">선택</option>
                    {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errors.period && <p className="mt-1 flex items-center gap-1 text-[10px] text-red-600"><AlertTriangle className="h-3 w-3" />{errors.period}</p>}
                </div>
                <div>
                  <FieldLabel label="실사 시작일" required />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => { setDateFrom(e.target.value); if (errors.dateFrom) setErrors(p => ({ ...p, dateFrom: '' })); }}
                    className={clsx(
                      'w-full rounded-xs border px-3 py-2.5 text-xs font-semibold outline-none transition-colors',
                      errors.dateFrom ? 'border-red-400 bg-red-50' : 'border-ink-600 bg-white focus:border-accent-600'
                    )}
                  />
                  {errors.dateFrom && <p className="mt-1 flex items-center gap-1 text-[10px] text-red-600"><AlertTriangle className="h-3 w-3" />{errors.dateFrom}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="실사 종료일" sub="당일 실사 시 생략 가능" />
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full rounded-xs border border-ink-600 bg-white px-3 py-2.5 text-xs font-semibold outline-none transition-colors focus:border-accent-600"
                  />
                </div>
                <div>
                  <FieldLabel label="대상 업체" required />
                  <select
                    value={targetCompany}
                    onChange={e => { setTargetCompany(e.target.value); if (errors.targetCompany) setErrors(p => ({ ...p, targetCompany: '' })); }}
                    className={clsx(
                      'w-full rounded-xs border px-3 py-2.5 text-xs font-semibold outline-none transition-colors',
                      errors.targetCompany ? 'border-red-400 bg-red-50' : 'border-ink-600 bg-white focus:border-accent-600'
                    )}
                  >
                    <option value="">선택</option>
                    {PARTNER_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errors.targetCompany && <p className="mt-1 flex items-center gap-1 text-[10px] text-red-600"><AlertTriangle className="h-3 w-3" />{errors.targetCompany}</p>}
                </div>
              </div>

              {/* 실사 방식 */}
              <div>
                <FieldLabel label="실사 방식" required />
                <div className="flex flex-wrap gap-2">
                  {METHOD_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMethod(opt.value)}
                      className={clsx(
                        'rounded-xs border px-3 py-2 text-xs font-bold transition-colors',
                        method === opt.value
                          ? 'border-accent-600 bg-accent-50 text-accent-700'
                          : 'border-ink-600 bg-white text-ink-400 hover:border-accent-400'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 원청사 동행 여부 */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAccompanied(v => !v)}
                  className={clsx(
                    'relative h-5 w-9 rounded-full transition-colors',
                    accompanied ? 'bg-accent-700' : 'bg-ink-600'
                  )}
                >
                  <span className={clsx(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                    accompanied ? 'translate-x-4' : 'translate-x-0.5'
                  )} />
                </button>
                <span className="text-xs font-semibold text-ink-300">원청사 동행 실사</span>
              </div>

              {/* 실사 기록 내용 — 멘토링 6항 필수 */}
              <div>
                <FieldLabel label="실사 기록 내용" required />
                <textarea
                  value={auditContent}
                  onChange={e => { setAuditContent(e.target.value); if (errors.auditContent) setErrors(p => ({ ...p, auditContent: '' })); }}
                  placeholder="실사에서 확인한 내용, 특이사항, 점검 결과 등을 기재해 주세요."
                  rows={4}
                  className={clsx(
                    'w-full resize-y rounded-xs border px-3 py-2.5 text-xs leading-5 outline-none transition-colors',
                    errors.auditContent ? 'border-red-400 bg-red-50' : 'border-ink-600 bg-white focus:border-accent-600'
                  )}
                />
                {errors.auditContent && <p className="mt-1 flex items-center gap-1 text-[10px] text-red-600"><AlertTriangle className="h-3 w-3" />{errors.auditContent}</p>}
              </div>

              {/* 교육 내용 — v3 Ⓔ 2항 */}
              <div>
                <FieldLabel label="교육 내용" sub="v3 Ⓔ 2항 — 현장 교육 진행 시 기재" />
                <textarea
                  value={educationContent}
                  onChange={e => setEducationContent(e.target.value)}
                  placeholder="진행한 교육 주제, 참석자 수, 교육 자료 등을 기재해 주세요. (선택)"
                  rows={3}
                  className="w-full resize-y rounded-xs border border-ink-600 bg-white px-3 py-2.5 text-xs leading-5 outline-none transition-colors focus:border-accent-600"
                />
              </div>

            </div>
          )}
        </div>

        {/* ── 푸터 ── */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-ink-700 bg-ink-800/20 px-6 py-4">
          <div className="text-[10px] text-ink-500">
            {submitted ? '담당자 승인 완료 후 이력에 반영됩니다.' : '등록 후 담당자 승인 요청이 자동 발송됩니다.'}
          </div>
          <div className="flex items-center gap-2">
            {submitted ? (
              <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-xs bg-signal-ok px-5 py-2 text-xs font-bold text-white hover:bg-emerald-600 shadow-control">
                <CheckCircle2 className="h-3.5 w-3.5" /> 확인 후 닫기
              </button>
            ) : (
              <>
                <button type="button" onClick={onClose} className="rounded-xs border border-ink-700 bg-white px-4 py-2 text-xs font-semibold text-ink-400 hover:border-ink-500 hover:text-ink-200 transition-colors">
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-xs px-5 py-2 text-xs font-bold text-white shadow-control transition-colors',
                    submitting ? 'cursor-not-allowed bg-accent-400' : 'bg-accent-700 hover:bg-accent-900'
                  )}
                >
                  {submitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 등록 중...</> : <><ClipboardCheck className="h-3.5 w-3.5" /> 등록 및 승인 요청</>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
