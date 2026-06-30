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
import {
  getSuppliers, getSupplierSuppliedItems, declareSourceChange, getTokenSupplierId,
  getCurrentSupplySource,
  type SupplierBrief, type SuppliedItem, type CurrentSupplySource,
} from '@/lib/api';

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export interface SelfReportModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * 공급원 변경 대상 컨텍스트(기획서 E-3). 백엔드 POST /supply-chain/declarations/source-change 는
   * BOM 버전·부품 단위로 parent→new_child 링크를 만들므로 아래 3종이 모두 있어야 실호출 가능.
   *  · bomVersionId / partId      : 변경 대상 BOM 버전·부품 (원청 BOM 식별자)
   *  · parentSupplierId           : 신고 주체(상위 협력사). 미지정 시 토큰 supplier_id 사용.
   * 미지정(특히 bomVersionId 부재) 시 → 데모 접수 모드로 동작(실호출 생략, 콘솔 경고).
   * ⚠️ 협력사 포털은 현재 원청 bomVersionId 출처가 없음 → docs 핸드오프 참조.
   */
  bomVersionId?: string;
  partId?: string;
  parentSupplierId?: string;
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


// ─── 라벨 컴포넌트 ─────────────────────────────────────────────────────────────

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

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function SelfReportModal({ open, onClose, bomVersionId, partId, parentSupplierId }: SelfReportModalProps) {
  // 폼 상태
  const [changeType, setChangeType]       = useState<ChangeType | ''>('');
  const [currentSource, setCurrentSource] = useState<CurrentSupplySource | null>(null);
  const [newSupplierId, setNewSupplierId] = useState('');   // new_child_supplier_id = 기존 등록 협력사
  const [suppliers, setSuppliers]         = useState<SupplierBrief[]>([]);
  // 공급 품목(= 변경 대상 part·bom_version). 내가 공급하는 품목 목록에서 선택해
  // declareSourceChange 의 partId/bomVersionId 를 채운다. key = `${partId}::${bomVersionId}`.
  const [items, setItems]                 = useState<SuppliedItem[]>([]);
  const [selectedItemKey, setSelectedItemKey] = useState('');
  const [itemOpen, setItemOpen]           = useState(false);
  const [reason, setReason]               = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [submitted, setSubmitted]         = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [typeOpen, setTypeOpen]           = useState(false);
  const [supplierOpen, setSupplierOpen]   = useState(false);
  const [submitError, setSubmitError]     = useState('');

  // 모달 열릴 때마다 초기화 + 기존 등록 협력사 목록 로드(new_child 선택지).
  useEffect(() => {
    if (!open) return;
    setChangeType('');
    setCurrentSource(null);
    setNewSupplierId('');
    setSelectedItemKey('');
    setReason('');
    setSubmitting(false);
    setSubmitted(false);
    setErrors({});
    setTypeOpen(false);
    setSupplierOpen(false);
    setItemOpen(false);
    setSubmitError('');
    getSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
    // 내가 공급하는 품목(part·bom_version) 로드 — 변경 대상 선택지. 신고 주체=상위 협력사 본인.
    const parent = parentSupplierId ?? getTokenSupplierId() ?? '';
    if (parent) {
      getSupplierSuppliedItems(parent).then(r => setItems(r.items)).catch(() => setItems([]));
    } else {
      setItems([]);
    }
  }, [open, parentSupplierId]);

  // 교체 선택 시 현재 공급원 조회
  useEffect(() => {
    if (changeType !== 'replace') return;
    const parent = parentSupplierId ?? getTokenSupplierId() ?? '';
    const selItem = items.find(i => `${i.partId}::${i.bomVersionId}` === selectedItemKey);
    const bv = selItem?.bomVersionId ?? bomVersionId;
    const pt = selItem?.partId ?? partId;
    if (bv && pt && parent) {
      getCurrentSupplySource(bv, pt, parent)
        .then(data => setCurrentSource(data))
        .catch(() => setCurrentSource(null));
    }
  }, [changeType, selectedItemKey, bomVersionId, partId, parentSupplierId, items]);

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
    if (!changeType)    next.changeType    = '변경 유형을 선택해 주세요.';
    // 공급 품목이 있을 때만 필수 — 없으면(데이터 미구축) 데모 접수로 폴백한다.
    if (items.length > 0 && !selectedItemKey) next.item = '변경 대상 공급 품목을 선택해 주세요.';
    if (!newSupplierId) next.newSupplierId = '변경할 공급사(기존 등록 협력사)를 선택해 주세요.';
    if (!reason.trim()) next.reason        = '변경 사유를 입력해 주세요.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError('');

    // 실호출 계약: 백엔드는 BOM 버전·부품 단위로 parent→new_child 링크를 만든다.
    // 4종(bomVersionId·partId·parentSupplierId·newSupplierId)이 모두 있어야 실호출 가능.
    const parent = parentSupplierId ?? getTokenSupplierId() ?? '';
    // 선택한 공급 품목에서 part·bom_version 컨텍스트를 얻는다(없으면 props 폴백).
    const selItem = items.find(i => `${i.partId}::${i.bomVersionId}` === selectedItemKey);
    const effBomVersionId = selItem?.bomVersionId ?? bomVersionId;
    const effPartId = selItem?.partId ?? partId;
    const canDeclare = Boolean(effBomVersionId && effPartId && parent && newSupplierId);

    try {
      if (canDeclare) {
        await declareSourceChange({
          bomVersionId: effBomVersionId!,
          parentSupplierId: parent,
          newChildSupplierId: newSupplierId,
          partId: effPartId!,
          reason: reason.trim(),
        });
      } else {
        // 데모 접수 모드 — 공급 품목 데이터가 없어 part·bom_version 컨텍스트를 못 얻을 때만.
        // (docs/HANDOFF_supplychain_self_report.md 참조)
        console.warn('[SelfReportModal] source-change 컨텍스트 부족(공급 품목 없음) → 데모 접수로 처리');
        await new Promise(res => setTimeout(res, 900));
      }
      setSubmitted(true);
    } catch {
      setSubmitError('자진신고 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedOption = CHANGE_TYPE_OPTIONS.find(o => o.value === changeType);
  const selectedSupplier = suppliers.find(s => s.supplierId === newSupplierId);
  const selectedItem = items.find(i => `${i.partId}::${i.bomVersionId}` === selectedItemKey);
  const itemLabel = (it: SuppliedItem) =>
    `${it.partName ?? it.partCode ?? it.partId}${it.bomVersionNumber ? ` · BOM ${it.bomVersionNumber}` : ''}`;

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
                      errors.changeType ? 'border-alert-border bg-alert-bg' : 'border-ink-600 bg-white hover:border-accent-600',
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
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-alert-text">
                    <AlertTriangle className="h-3 w-3" /> {errors.changeType}
                  </p>
                )}
              </div>

              {/* ①.5 변경 대상 공급 품목 — partId·bomVersionId 출처(실호출 컨텍스트) */}
              <div>
                <FieldLabel label="변경 대상 공급 품목" sub="내가 공급하는 품목" required={items.length > 0} />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setItemOpen(v => !v)}
                    disabled={items.length === 0}
                    className={clsx(
                      'flex w-full items-center justify-between rounded-xs border px-3 py-2.5 text-xs transition-colors',
                      errors.item ? 'border-alert-border bg-alert-bg' : 'border-ink-600 bg-white hover:border-accent-600',
                      selectedItem ? 'text-ink-100 font-semibold' : 'text-ink-500',
                      items.length === 0 && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    {selectedItem
                      ? itemLabel(selectedItem)
                      : (items.length ? '공급 품목을 선택해 주세요' : '공급 품목 없음 — 데모 접수로 처리됩니다')}
                    <ChevronDown className={`h-4 w-4 text-ink-500 transition-transform ${itemOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {itemOpen && items.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xs border border-ink-600 bg-white shadow-lg">
                      {items.map(it => {
                        const key = `${it.partId}::${it.bomVersionId}`;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => { setSelectedItemKey(key); setItemOpen(false); if (errors.item) setErrors(p => ({ ...p, item: '' })); }}
                            className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-accent-50 transition-colors"
                          >
                            <span className="text-xs font-bold text-ink-100">{it.partName ?? it.partCode ?? it.partId}</span>
                            <span className="mt-0.5 text-[10px] text-ink-500">
                              {it.partCode ?? '—'}{it.bomVersionNumber ? ` · BOM ${it.bomVersionNumber}` : ''}{it.materialType ? ` · ${it.materialType}` : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {errors.item && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-alert-text">
                    <AlertTriangle className="h-3 w-3" /> {errors.item}
                  </p>
                )}
              </div>

              {/* ② 기존 공급사 정보 (읽기 전용) */}
              {changeType === 'replace' && (
                <div>
                  <FieldLabel label="기존 공급사" sub="읽기 전용" />
                  <div className="space-y-1.5 rounded-xs border border-ink-700 bg-ink-800 px-3 py-3">
                    {currentSource ? (
                      [
                        ['공급사', currentSource.name],
                        ['국가', currentSource.country],
                        ['자재', currentSource.material],
                        ['연락처', currentSource.contact],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2 text-[11px]">
                          <span className="w-12 shrink-0 font-bold text-ink-500">{k}</span>
                          <span className="text-ink-300">{v || '—'}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-ink-500">공급 품목을 먼저 선택해 주세요.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ③ 변경할 공급사 선택 — new_child_supplier_id(기존 등록 협력사) */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-ink-400 border-b border-ink-700 pb-1.5">
                  변경할 공급사 (기존 등록 협력사에서 선택)
                </div>
                <div>
                  <FieldLabel label="공급사" required />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSupplierOpen(v => !v)}
                      className={clsx(
                        'flex w-full items-center justify-between rounded-xs border px-3 py-2.5 text-xs transition-colors',
                        errors.newSupplierId ? 'border-alert-border bg-alert-bg' : 'border-ink-600 bg-white hover:border-accent-600',
                        selectedSupplier ? 'text-ink-100 font-semibold' : 'text-ink-500'
                      )}
                    >
                      {selectedSupplier
                        ? selectedSupplier.companyName
                        : (suppliers.length ? '공급사를 선택해 주세요' : '협력사 목록 불러오는 중…')}
                      <ChevronDown className={`h-4 w-4 text-ink-500 transition-transform ${supplierOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {supplierOpen && suppliers.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xs border border-ink-600 bg-white shadow-lg">
                        {suppliers.map(s => (
                          <button
                            key={s.supplierId}
                            type="button"
                            onClick={() => { setNewSupplierId(s.supplierId); setSupplierOpen(false); if (errors.newSupplierId) setErrors(p => ({ ...p, newSupplierId: '' })); }}
                            className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-accent-50 transition-colors"
                          >
                            <span className="text-xs font-bold text-ink-100">{s.companyName}</span>
                            <span className="mt-0.5 text-[10px] text-ink-500">{s.providerType} · {s.status}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.newSupplierId && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-alert-text">
                      <AlertTriangle className="h-3 w-3" /> {errors.newSupplierId}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-ink-600">
                    미등록 신규 공급사는 먼저 협력사로 등록한 뒤 선택할 수 있습니다.
                  </p>
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
                    errors.reason ? 'border-alert-border bg-alert-bg' : 'border-ink-600 bg-white focus:border-accent-600'
                  )}
                />
                {errors.reason && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-alert-text">
                    <AlertTriangle className="h-3 w-3" /> {errors.reason}
                  </p>
                )}
              </div>

              {/* 제출 실패 안내 */}
              {submitError && (
                <div className="flex items-center gap-2 rounded-xs border border-alert-border bg-alert-bg px-3 py-2.5 text-[11px] text-alert-text">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {submitError}
                </div>
              )}

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
                className="inline-flex items-center gap-2 rounded-xs bg-signal-ok px-5 py-2 text-xs font-bold text-white hover:bg-ok-solid shadow-control"
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
