'use client';

// STEP 3 — 이 맵에 편입된 협력사(전 차수) 목록. 각 협력사를 '확인' 처리하고, 협력사별로 정보요청 메일·동의서를 보낸다.
import { useEffect, useState } from 'react';
import { Check, CheckCircle2, FileSignature, Mail, Paperclip, X } from 'lucide-react';
import { getDataConsents, getDataRequests, type SupplierBrief } from '@/lib/api';
import DataConsentModal from './DataConsentModal';

const PROVIDER_LABEL: Record<string, string> = {
  manufacturer: '제조사',
  recycler: '재활용',
  trader: '유통',
  miner: '광산',
  smelter: '제련소',
};

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

export default function ConnectedSuppliersModal({
  suppliers,
  confirmed,
  onToggleConfirm,
  onConfirmAll,
  onOpenMail,
  onOpenMailFor,
  onClose,
}: {
  suppliers: SupplierBrief[];
  confirmed: Set<string>;
  onToggleConfirm: (supplierId: string) => void;
  onConfirmAll: () => void;
  onOpenMail: () => void;   // 정보 입력 요청 메일 · 동의서 발송 화면(허브가 연다)
  onOpenMailFor?: (supplierId: string) => void;   // 특정 협력사로 메일 팝업을 미리 선택해 연다
  onClose: () => void;
}) {
  const confirmedCount = suppliers.filter(s => confirmed.has(s.supplierId)).length;
  const allConfirmed = suppliers.length > 0 && confirmedCount === suppliers.length;
  const [consentSupplier, setConsentSupplier] = useState<SupplierBrief | null>(null);
  // 협력사별 상태 — mailed(정보요청 메일/자료요청 발송됨), consentReceived(동의서 회신·서명 수신됨).
  const [status, setStatus] = useState<Record<string, { mailed: boolean; consentReceived: boolean }>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = suppliers.map(s => s.supplierId).filter(isUuid);
      const entries = await Promise.all(
        ids.map(async id => {
          const [consents, requests] = await Promise.all([
            getDataConsents(id).catch(() => []),
            getDataRequests({ supplierId: id }).catch(() => []),
          ]);
          const consentReceived = (consents ?? []).some(c => c.status === 'returned' || c.status === 'agreed');
          const mailed = (requests ?? []).length > 0 || (consents ?? []).length > 0;
          return [id, { mailed, consentReceived }] as const;
        }),
      );
      if (!cancelled) setStatus(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [suppliers]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-sm border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.2)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-base font-bold text-ink-100">협력사 확인 · 자료 요청</div>
            <p className="mt-1 text-sm text-slate-500">
              이 맵에 편입된 {suppliers.length}개 협력사(전 차수)입니다. 검토 후 <b>확인</b> 처리하고, 필요하면 협력사별로 <b>정보요청 메일·동의서</b>를 보내세요. (광산은 제련소가 데이터를 대행 제공)
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
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {suppliers.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">이 공급망 맵에 편입된 협력사가 없습니다.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {suppliers.map(s => {
                const isConfirmed = confirmed.has(s.supplierId);
                const isMiner = s.providerType === 'miner';
                const st = status[s.supplierId];
                const mailed = st?.mailed ?? false;
                const consentReceived = st?.consentReceived ?? false;
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
                      {/* 광산은 데이터 요청 대상이 아님(제련소가 대행 제공) */}
                      {isMiner ? (
                        <span className="inline-flex h-8 items-center rounded-sm bg-slate-50 px-2.5 text-xs font-semibold text-slate-400">제련소 대행</span>
                      ) : onOpenMailFor && (
                        <button
                          type="button"
                          onClick={() => onOpenMailFor(s.supplierId)}
                          title={mailed ? '이미 발송됨 · 다시 보내기' : `${s.companyName}에 정보 입력 요청 메일 보내기`}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs font-bold transition ${
                            mailed
                              ? 'border-ok-border bg-ok-bg text-ok-text'
                              : 'border-slate-200 bg-white text-ink-400 hover:border-brand hover:text-brand'
                          }`}
                        >
                          {mailed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                          {mailed ? '발송됨' : '메일'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConsentSupplier(s)}
                        disabled={isMiner}
                        title={isMiner ? '광산은 동의서 대상이 아닙니다(제련소 대행)' : consentReceived ? '동의서 수신됨 · 내용 보기' : '동의서'}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          consentReceived
                            ? 'border-ok-border bg-ok-bg text-ok-text'
                            : 'border-slate-200 bg-white text-ink-400 hover:border-brand hover:text-brand'
                        }`}
                      >
                        {consentReceived ? <Paperclip className="h-3.5 w-3.5" /> : <FileSignature className="h-3.5 w-3.5" />}
                        {consentReceived ? '동의서 수신' : '동의서'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleConfirm(s.supplierId)}
                        title={isConfirmed ? '확인을 취소합니다' : '이 협력사를 확인 처리합니다'}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-xs font-bold transition ${
                          isConfirmed
                            ? 'border-ok-border bg-ok-bg text-ok-text hover:border-alert-border hover:bg-alert-bg hover:text-alert-text'
                            : 'border-slate-200 bg-white text-ink-400 hover:border-ok-border hover:text-ok-text'
                        }`}
                      >
                        {isConfirmed ? <X className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {isConfirmed ? '확인 취소' : '확인'}
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
            {allConfirmed ? '모든 협력사를 확인했습니다. 최종 검증으로 넘어갈 수 있어요.' : '협력사를 전부 확인하면 다음 단계로 넘어갑니다.'}
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
