'use client';

/**
 * SelfReportModal.tsx — 자진 신고 폼 (기획서 E-3)
 * 공급원 변경(신규·교체·추가) 시 협력사가 자발적으로 신고하는 화면.
 * v3 Ⓒ 5항 "하위 위임" 관련 핵심 기능.
 */

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Network,
  X,
} from 'lucide-react';
import clsx from 'clsx';

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export interface SelfReportModalProps {
  open: boolean;
  onClose: () => void;
}

type ChangeType = 'new' | 'replace' | 'add';

interface ChangeTypeOption {
  value: ChangeType;
  label: string;
  desc: string;
}

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const CHANGE_TYPE_OPTIONS: ChangeTypeOption[] = [
  { value: 'new',     label: '신규 추가',  desc: '기존에 없던 공급사를 새로 추가합니다.' },
  { value: 'replace', label: '교체',       desc: '기존 공급사를 다른 공급사로 대체합니다.' },
  { value: 'add',     label: '추가 병행',  desc: '기존 공급사를 유지하면서 추가 공급사를 등록합니다.' },
];

// 기존 공급사 Mock (읽기 전용 표시용) — 실제 API 연동 시 교체
const MOCK_CURRENT_SUPPLIER = {
  name: 'S-PRE-001 · 대성정밀(주)',
  country: '대한민국',
  material: '니켈 원광 (NORI-NCL-RAW)',
  contact: 'lee.ceo@daesung.kr',
};

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

export default function SelfReportModal({ open, onClose }: SelfReportModalProps) {
  // 폼 상태
  const [changeType, setChangeType]     = useState<ChangeType | ''>('');
  const [newName, setNewName]           = useState('');
  const [newCountry, setNewCountry]     = useState('');
  const [newContact, setNewContact]     = useState('');
  const [reason, setReason]             = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [typeOpen, setTypeOpen]         = useState(false);

  // 모달 열릴 때마다 초기화
  useEffect(() => {
    if (open) {
      setChangeType('');
      setNewName('');
      setNewCountry('');
      setNewContact('');
      setReason('');
      setSubmitting(false);
      setSubmitted(false);
      setErrors({});
      setTypeOpen(false);
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

  // 유효성 검사
  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!changeType)        next.changeType  = '변경 유형을 선택해 주세요.';
    if (!newName.trim())    next.newName     = '신규 공급사 회사명을 입력해 주세요.';
    if (!newCountry.trim()) next.newCountry  = '국가를 입력해 주세요.';
    if (!reason.trim())     next.reason      = '변경 사유를 입력해 주세요.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise(res => setTimeout(res, 1200));
    setSubmitting(false);
    setSubmitted(true);
  }

  const selectedOption = CHANGE_TYPE_OPTIONS.find(o => o.value === changeType);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget && !submitted) onClose(); }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-sm border border-ink-600 bg-white shadow-2xl">

        {/* ── 헤더 ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xs border border-accent-100 bg-accent-50">
              <Network className="h-4 w-4 text-accent-700" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink-100">공급원 변경 자진 신고</div>
              <div className="mt-0.5 text-[10px] text-ink-500">
                기획서 E-3 · v3 Ⓒ 5항 — 사후 적발 방지를 위해 자발적으로 신고합니다.
              </div>
            </div>
          </div>
          {!submitted && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xs p-1.5 text-ink-500 hover:bg-ink-800 hover:text-ink-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── 본문 ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {submitted ? (
            /* 제출 완료 화면 */
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-signal-ok bg-signal-ok/10">
                <CheckCircle2 className="h-7 w-7 text-signal-ok" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-sm font-bold text-ink-100">자진 신고가 접수됐습니다</div>
                <p className="mt-2 text-xs leading-5 text-ink-500">
                  원청사 공급망 담당팀이 검토 후 연락드립니다.<br />
                  처리까지 평균 1~3 영업일이 소요됩니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">

              {/* 안내 배너 */}
              <div className="flex items-start gap-2.5 rounded-xs border border-accent-100 bg-accent-50 px-3 py-3">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-700" />
                <p className="text-[10px] leading-5 text-accent-800">
                  공급원 변경 사실을 사전에 자진 신고하면 규제 위반 리스크를 줄일 수 있습니다.
                  허위 신고 시 계약 해지 및 법적 책임이 발생할 수 있습니다.
                </p>
              </div>

              {/* ① 변경 유형 선택 */}
              <div>
                <FieldLabel label="변경 유형" required />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTypeOpen(v => !v)}
                    className={clsx(
                      'flex w-full items-center justify-between rounded-xs border px-3 py-2.5 text-xs transition-colors',
                      errors.changeType ? 'border-red-400 bg-red-50' : 'border-ink-600 bg-white hover:border-accent-600',
                      selectedOption ? 'text-ink-100 font-semibold' : 'text-ink-500'
                    )}
                  >
                    {selectedOption ? selectedOption.label : '유형을 선택해 주세요'}
                    <ChevronDown className={`h-4 w-4 text-ink-500 transition-transform ${typeOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {typeOpen && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xs border border-ink-600 bg-white shadow-lg">
                      {CHANGE_TYPE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setChangeType(opt.value); setTypeOpen(false); if (errors.changeType) setErrors(p => ({ ...p, changeType: '' })); }}
                          className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-accent-50 transition-colors"
                        >
                          <span className="text-xs font-bold text-ink-100">{opt.label}</span>
                          <span className="mt-0.5 text-[10px] text-ink-500">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.changeType && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-red-600">
                    <AlertTriangle className="h-3 w-3" /> {errors.changeType}
                  </p>
                )}
              </div>

              {/* ② 기존 공급사 정보 (읽기 전용) */}
              {changeType === 'replace' && (
                <div>
                  <FieldLabel label="기존 공급사" sub="읽기 전용" />
                  <div className="space-y-1.5 rounded-xs border border-ink-700 bg-ink-800 px-3 py-3">
                    {[
                      ['공급사', MOCK_CURRENT_SUPPLIER.name],
                      ['국가', MOCK_CURRENT_SUPPLIER.country],
                      ['자재', MOCK_CURRENT_SUPPLIER.material],
                      ['연락처', MOCK_CURRENT_SUPPLIER.contact],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-[11px]">
                        <span className="w-12 shrink-0 font-bold text-ink-500">{k}</span>
                        <span className="text-ink-300">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ③ 신규 공급사 입력 */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-ink-400 border-b border-ink-700 pb-1.5">
                  신규 공급사 정보
                </div>
                <div>
                  <FieldLabel label="회사명" required />
                  <input
                    type="text"
                    value={newName}
                    placeholder="예: ㈜신규정련"
                    onChange={e => { setNewName(e.target.value); if (errors.newName) setErrors(p => ({ ...p, newName: '' })); }}
                    className={clsx(
                      'w-full rounded-xs border px-3 py-2.5 text-xs font-semibold outline-none transition-colors',
                      errors.newName ? 'border-red-400 bg-red-50' : 'border-ink-600 bg-white focus:border-accent-600'
                    )}
                  />
                  {errors.newName && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-red-600">
                      <AlertTriangle className="h-3 w-3" /> {errors.newName}
                    </p>
                  )}
                </div>
                <div>
                  <FieldLabel label="국가" required />
                  <input
                    type="text"
                    value={newCountry}
                    placeholder="예: 대한민국"
                    onChange={e => { setNewCountry(e.target.value); if (errors.newCountry) setErrors(p => ({ ...p, newCountry: '' })); }}
                    className={clsx(
                      'w-full rounded-xs border px-3 py-2.5 text-xs font-semibold outline-none transition-colors',
                      errors.newCountry ? 'border-red-400 bg-red-50' : 'border-ink-600 bg-white focus:border-accent-600'
                    )}
                  />
                  {errors.newCountry && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-red-600">
                      <AlertTriangle className="h-3 w-3" /> {errors.newCountry}
                    </p>
                  )}
                </div>
                <div>
                  <FieldLabel label="연락처" sub="이메일 또는 전화번호" />
                  <input
                    type="text"
                    value={newContact}
                    placeholder="예: contact@newsupplier.com"
                    onChange={e => setNewContact(e.target.value)}
                    className="w-full rounded-xs border border-ink-600 bg-white px-3 py-2.5 text-xs font-semibold outline-none transition-colors focus:border-accent-600"
                  />
                </div>
              </div>

              {/* ④ 변경 사유 */}
              <div>
                <FieldLabel label="변경 사유" required />
                <textarea
                  value={reason}
                  onChange={e => { setReason(e.target.value); if (errors.reason) setErrors(p => ({ ...p, reason: '' })); }}
                  placeholder="공급원 변경의 배경과 사유를 구체적으로 작성해 주세요."
                  rows={4}
                  className={clsx(
                    'w-full resize-y rounded-xs border px-3 py-2.5 text-xs leading-5 outline-none transition-colors',
                    errors.reason ? 'border-red-400 bg-red-50' : 'border-ink-600 bg-white focus:border-accent-600'
                  )}
                />
                {errors.reason && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-red-600">
                    <AlertTriangle className="h-3 w-3" /> {errors.reason}
                  </p>
                )}
              </div>

            </div>
          )}
        </div>

        {/* ── 푸터 ── */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-ink-700 bg-ink-800/30 px-6 py-4">
          <div className="text-[10px] text-ink-500">
            {submitted ? '담당팀 검토 후 공급망 맵이 업데이트됩니다.' : '제출 후 수정이 불가합니다.'}
          </div>
          <div className="flex items-center gap-2">
            {submitted ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xs bg-signal-ok px-5 py-2 text-xs font-bold text-white hover:bg-emerald-600 shadow-control"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> 확인 후 닫기
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xs border border-ink-700 bg-white px-4 py-2 text-xs font-semibold text-ink-400 hover:border-ink-500 hover:text-ink-200 transition-colors"
                >
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
                  {submitting ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 제출 중...</>
                  ) : (
                    <><Network className="h-3.5 w-3.5" /> 신고 제출</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
