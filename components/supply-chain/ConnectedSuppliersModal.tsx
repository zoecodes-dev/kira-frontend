'use client';

// STEP 3 — 이 맵에 연결된 협력사 목록. 각 협력사를 '확인' 처리하거나, 자료를 일괄 요청한다.
// (구 STEP4 정보확인 + STEP5 자료요청 + STEP6 정보입력요청을 한 곳으로 통합)
import { useState } from 'react';
import { Check, CheckCircle2, FileSignature, Loader2, Mail, Send, X } from 'lucide-react';
import type { SupplierBrief } from '@/lib/api';
import DataConsentModal from './DataConsentModal';

const PROVIDER_LABEL: Record<string, string> = {
  manufacturer: '제조사',
  recycler: '재활용',
  trader: '유통',
  miner: '광산',
};

export default function ConnectedSuppliersModal({
  suppliers,
  confirmed,
  requesting,
  onToggleConfirm,
  onConfirmAll,
  onRequestAll,
  onOpenMail,
  onClose,
}: {
  suppliers: SupplierBrief[];
  confirmed: Set<string>;
  requesting: boolean;
  onToggleConfirm: (supplierId: string) => void;
  onConfirmAll: () => void;
  onRequestAll: () => void;
  onOpenMail: () => void;   // 정보 입력 요청 메일 · 동의서 발송 화면(허브가 연다)
  onClose: () => void;
}) {
  const confirmedCount = suppliers.filter(s => confirmed.has(s.supplierId)).length;
  const allConfirmed = suppliers.length > 0 && confirmedCount === suppliers.length;
  const [consentSupplier, setConsentSupplier] = useState<SupplierBrief | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-sm border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.2)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-base font-bold text-ink-100">협력사 확인 · 자료 요청</div>
            <p className="mt-1 text-sm text-slate-500">
              이 맵에 연결된 {suppliers.length}개 협력사입니다. 검토 후 <b>확인</b> 처리하거나, 부족한 자료를 <b>일괄 요청</b>하세요.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-100" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">
          <span className="text-xs font-bold text-ink-400">확인 {confirmedCount} / {suppliers.length}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenMail}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-ink-400 hover:border-brand hover:text-brand"
            >
              <Mail className="h-3.5 w-3.5" /> 정보 입력 요청 메일 · 동의서
            </button>
            <button
              type="button"
              onClick={onConfirmAll}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-ink-400 hover:border-ok-border hover:text-ok-text"
            >
              <Check className="h-3.5 w-3.5" /> 전체 확인
            </button>
            <button
              type="button"
              onClick={onRequestAll}
              disabled={requesting}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-brand px-3 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {requesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} 자료 일괄 요청
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {suppliers.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">연결된 협력사가 없습니다. STEP 2에서 Pool을 확정하세요.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {suppliers.map(s => {
                const isConfirmed = confirmed.has(s.supplierId);
                return (
                  <li key={s.supplierId} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-ink-100">{s.companyName}</div>
                      <div className="mt-0.5 text-xs font-medium text-slate-500">
                        {PROVIDER_LABEL[s.providerType] ?? s.providerType}
                        {s.riskLevel ? <span className="ml-2 text-slate-400">· 리스크 {s.riskLevel}</span> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConsentSupplier(s)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-2.5 text-xs font-bold text-ink-400 hover:border-brand hover:text-brand"
                      >
                        <FileSignature className="h-3.5 w-3.5" />
                        동의서
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleConfirm(s.supplierId)}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-xs font-bold transition ${
                          isConfirmed
                            ? 'border-ok-border bg-ok-bg text-ok-text'
                            : 'border-slate-200 bg-white text-ink-400 hover:border-ok-border hover:text-ok-text'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isConfirmed ? '확인됨' : '확인'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
          <span className="text-xs font-medium text-slate-500">
            {allConfirmed ? '모든 협력사를 확인했습니다.' : '협력사 노드를 클릭하면 상세 정보가 맵에 표시됩니다.'}
          </span>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-sm bg-ink-100 px-4 text-sm font-bold text-white hover:opacity-90">
            닫기
          </button>
        </div>
      </div>

      {consentSupplier && <DataConsentModal supplier={consentSupplier} onClose={() => setConsentSupplier(null)} />}
    </div>
  );
}
