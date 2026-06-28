'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Edit2, ChevronRight, Info, Save, CheckCircle2, Send } from 'lucide-react';
import Badge from '@/components/Badge';

// 신뢰도에 따른 색상/톤 반환 함수 (기획서 D-3 스펙)
// · 0.90 이상 → 초록(#F0FDF4) — 자동 확인 처리, 수동 검토 불필요
// · 0.70~0.89 → 주황(#FFFBEB) — 요주의, 담당자 검토 권장
// · 0.70 미만  → 빨강(#FEF2F2) — 반드시 수정 필요
function getConfidenceStyle(confidence: number): {
  tone: 'ok' | 'warn' | 'alert';
  rowBg: string;
  inputBg: string;
  inputBorder: string;
  warningLevel: 'none' | 'review' | 'required';
} {
  if (confidence >= 0.9) {
    return {
      tone: 'ok',
      rowBg: 'bg-[#F0FDF4]',
      inputBg: 'bg-white',
      inputBorder: 'border-ink-700 focus:border-signal-ok',
      warningLevel: 'none',
    };
  }
  if (confidence >= 0.7) {
    return {
      tone: 'warn',
      rowBg: 'bg-[#FFFBEB]',
      inputBg: 'bg-warn-bg',
      inputBorder: 'border-warn-border focus:border-warn-border',
      warningLevel: 'review',
    };
  }
  return {
    tone: 'alert',
    rowBg: 'bg-[#FEF2F2]',
    inputBg: 'bg-alert-bg',
    inputBorder: 'border-alert-border focus:border-alert-border',
    warningLevel: 'required',
  };
}

// localStorage 키 생성 — 기획서 C-3 스펙: kira_draft_{supplierId}_{docId}
function draftKey(supplierId: string, docId: string) {
  return `kira_draft_${supplierId}_${docId}`;
}

interface DraftData {
  editedValues: Record<string, string>;
  unparsedInputs: Record<string, string>;
  savedAt: string; // ISO 날짜 문자열 — 토스트에 표시
}

interface ExtractionTableProps {
  doc: any;
  supplierId: string;
  onConfirmComplete: () => void;
  /**
   * 현재 탭이 마지막 미완료 문서인지 여부
   * true → 버튼 텍스트를 "원청사로 제출"로 변경 (submission-review → review 상태로 전송)
   */
  isLastDoc?: boolean;
  /** 'supplier'(협력사 제출) | 'oem'(원청 검토). 버튼·문구를 보는 주체에 맞게 분리. */
  mode?: 'supplier' | 'oem';
}

// ─── 토스트 컴포넌트 ────────────────────────────────────────────────────────
function Toast({
  message,
  tone,
  onClose,
}: {
  message: string;
  tone: 'ok' | 'info';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-sm border px-4 py-3 text-xs font-semibold shadow-lg transition-all ${
        tone === 'ok'
          ? 'border-ok-border bg-ok-bg text-ok-text'
          : 'border-accent-100 bg-accent-50 text-accent-800'
      }`}
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      {message}
      <button
        type="button"
        onClick={onClose}
        className="ml-2 text-[10px] opacity-50 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

// ─── 초안 불러오기 확인 배너 ─────────────────────────────────────────────────
function DraftBanner({
  savedAt,
  onRestore,
  onDiscard,
}: {
  savedAt: string;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-warn-border bg-warn-bg px-5 py-2.5">
      <div className="flex items-center gap-2 text-[11px] text-warn-text">
        <Save className="h-3.5 w-3.5 shrink-0" />
        <span>
          이전에 저장된 초안이 있습니다.
          <span className="ml-1 text-[10px] text-warn-text">({savedAt} 저장)</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onDiscard}
          className="text-[11px] font-semibold text-warn-text hover:text-warn-text"
        >
          무시
        </button>
        <button
          type="button"
          onClick={onRestore}
          className="rounded-xs border border-warn-border bg-white px-3 py-1 text-[11px] font-bold text-warn-text hover:bg-warn-bg"
        >
          불러오기
        </button>
      </div>
    </div>
  );
}

export default function ExtractionTable({ doc, supplierId, onConfirmComplete, isLastDoc = false, mode = 'supplier' }: ExtractionTableProps) {
  const oem = mode === 'oem';
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [unparsedInputs, setUnparsedInputs] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);

  // 토스트 상태 — { message, tone } | null
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'info' } | null>(null);

  // 초안 배너 상태
  const [pendingDraft, setPendingDraft] = useState<DraftData | null>(null);

  // ── 마운트 시 localStorage 초안 확인 ──────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(supplierId, doc.docId));
      if (!raw) return;
      const draft: DraftData = JSON.parse(raw);
      // 편집값이 하나라도 있어야 배너 표시 (빈 초안 무시)
      const hasEdits =
        Object.keys(draft.editedValues).length > 0 ||
        Object.keys(draft.unparsedInputs).length > 0;
      if (hasEdits) setPendingDraft(draft);
    } catch {
      // 파싱 오류는 무시
    }
  }, [supplierId, doc.docId]);

  // ── 초안 불러오기 ──────────────────────────────────────────────────────────
  function handleRestore() {
    if (!pendingDraft) return;
    setEditedValues(pendingDraft.editedValues);
    setUnparsedInputs(pendingDraft.unparsedInputs);
    setPendingDraft(null);
    setToast({ message: '이전 초안을 불러왔습니다.', tone: 'info' });
  }

  // ── 초안 무시 ──────────────────────────────────────────────────────────────
  function handleDiscardDraft() {
    localStorage.removeItem(draftKey(supplierId, doc.docId));
    setPendingDraft(null);
  }

  // ── 임시 저장 ──────────────────────────────────────────────────────────────
  const handleDraftSave = useCallback(() => {
    const draft: DraftData = {
      editedValues,
      unparsedInputs,
      savedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    try {
      localStorage.setItem(draftKey(supplierId, doc.docId), JSON.stringify(draft));
      setToast({ message: '임시 저장됐습니다.', tone: 'ok' });
    } catch {
      setToast({ message: '저장에 실패했습니다. 저장 공간을 확인해 주세요.', tone: 'ok' });
    }
  }, [editedValues, unparsedInputs, supplierId, doc.docId]);

  // ── 최종 제출 — localStorage 초안 삭제 후 완료 ────────────────────────────
  const handleSubmit = async () => {
    setConfirming(true);
    await new Promise(res => setTimeout(res, 800));
    // 제출 완료 시 초안 삭제
    localStorage.removeItem(draftKey(supplierId, doc.docId));
    setConfirming(false);
    onConfirmComplete();
  };

  const handleEdit = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const handleUnparsedInput = (key: string, value: string) => {
    setUnparsedInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <div className="flex h-full w-[420px] shrink-0 flex-col overflow-hidden rounded-sm border border-ink-700 bg-white">
        {/* 헤더 */}
        <div className="shrink-0 border-b border-ink-700 bg-ink-800/30 px-5 py-3">
          <div className="text-xs font-bold text-ink-100">추출 데이터 검토 및 보완</div>
          <p className="mt-1 text-[10px] text-ink-500 leading-4">
            AI가 추출한 데이터를 확인하고 필요한 경우 직접 수정해 주세요. 신뢰도가 낮은 항목은 붉은색으로 표시됩니다.
          </p>
        </div>

        {/* 초안 불러오기 배너 — 이전 임시저장 있을 때만 표시 */}
        {pendingDraft && (
          <DraftBanner
            savedAt={pendingDraft.savedAt}
            onRestore={handleRestore}
            onDiscard={handleDiscardDraft}
          />
        )}

        {/* 스크롤 가능한 폼 영역 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="space-y-4">
            {doc.extractionResult.fields.map((field: any) => {
              const style = getConfidenceStyle(field.confidence);
              const currentValue = editedValues[field.key] !== undefined ? editedValues[field.key] : field.aiValue;

              return (
                <div
                  key={field.key}
                  className={`rounded-xs border px-3 py-3 transition-colors ${
                    style.warningLevel === 'required'
                      ? 'border-alert-border'
                      : style.warningLevel === 'review'
                      ? 'border-warn-border'
                      : 'border-transparent'
                  } ${style.rowBg}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-ink-400">{field.label}</label>
                    <div className="flex items-center gap-1.5">
                      {style.warningLevel === 'review' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-warn-text">
                          <Info className="h-3 w-3" />
                          검토 권장
                        </span>
                      )}
                      {style.warningLevel === 'required' && (
                        <span className="flex items-center gap-1 rounded-xs bg-alert-bg px-1.5 py-0.5 text-[10px] font-bold text-alert-text">
                          <AlertTriangle className="h-3 w-3" />
                          수정 필요
                        </span>
                      )}
                      <Badge tone={style.tone}>신뢰도 {Math.round(field.confidence * 100)}%</Badge>
                    </div>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(e) => handleEdit(field.key, e.target.value)}
                      className={`w-full rounded-xs border px-3 py-2 text-xs font-bold outline-none transition-all pr-12 ${style.inputBg} ${style.inputBorder}`}
                    />
                    {field.unit && (
                      <span className="absolute right-3 text-[10px] text-ink-400 pointer-events-none">{field.unit}</span>
                    )}
                  </div>
                  {field.warning && (
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] text-alert-text font-semibold">
                      <AlertTriangle className="h-3 w-3" /> {field.warning}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* 미파싱 필드 */}
          {doc.extractionResult.unparsedFields.length > 0 && (
            <div className="border-t border-ink-700 pt-5 space-y-4">
              <div className="flex items-center gap-1.5">
                <Edit2 className="h-3.5 w-3.5 text-accent-700" />
                <span className="text-[11px] font-bold text-accent-800">추가 정보 직접 입력 (AI 추출 실패)</span>
              </div>
              {doc.extractionResult.unparsedFields.map((label: string) => (
                <div key={label}>
                  <label className="text-[11px] font-bold text-ink-400 mb-1.5 block">{label}</label>
                  <input
                    type="text"
                    placeholder="직접 입력해 주세요"
                    value={unparsedInputs[label] || ''}
                    onChange={(e) => handleUnparsedInput(label, e.target.value)}
                    className="w-full rounded-xs border border-ink-600 bg-white px-3 py-2 text-xs font-semibold outline-none transition-colors focus:border-accent-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 액션 버튼 */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-ink-700 bg-white px-5 py-4 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <button
            type="button"
            onClick={handleDraftSave}
            className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-4 py-2 text-xs font-bold text-ink-400 hover:border-ink-600 hover:text-ink-200 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            임시 저장
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={confirming}
            className={`inline-flex items-center gap-1.5 rounded-xs px-5 py-2 text-xs font-bold text-white shadow-control transition-colors disabled:opacity-70 ${
              isLastDoc ? 'bg-signal-ok hover:bg-ok-solid' : 'bg-accent-700 hover:bg-accent-900'
            }`}
          >
            {confirming ? '처리 중...' : isLastDoc ? (
              /* 마지막 문서 — 협력사: 원청사로 제출 / 원청: 검토 완료 */
              <><Send className="h-3.5 w-3.5" /> {oem ? '검토 완료' : '원청사로 제출'}</>
            ) : (
              <>{oem ? '확인 및 다음으로' : '저장 및 다음으로'} <ChevronRight className="h-3.5 w-3.5" /></>
            )}
          </button>
        </div>
      </div>

      {/* 토스트 — 컴포넌트 외부에 portal처럼 fixed 배치 */}
      {toast && (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
