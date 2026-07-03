'use client';

// STEP 3 — 제3자 동의 메일 발송. 이 맵에 편입된(노출된 차수) 협력사에게 정보요청 메일·제3자 정보제공 동의서를 발송한다.
//   협력사 '확인'(동의서 수신 확인)은 STEP4로 분리됐다. 여기서는 발송과 발송/회신 상태 표시만 담당한다.
import { useEffect, useState } from 'react';
import { CheckCircle2, FileSignature, Mail, Paperclip, X } from 'lucide-react';
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
  onOpenMail,
  onOpenMailFor,
  onClose,
}: {
  suppliers: SupplierBrief[];
  onOpenMail: () => void;   // 정보 입력 요청 메일 · 동의서 발송 화면(허브가 연다)
  onOpenMailFor?: (supplierId: string) => void;   // 특정 협력사로 메일 팝업을 미리 선택해 연다
  onClose: () => void;
}) {
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

  const mailableCount = suppliers.filter(s => s.providerType !== 'miner').length;
  const mailedCount = suppliers.filter(s => status[s.supplierId]?.mailed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-sm border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.2)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-base font-bold text-ink-100">제3자 동의 메일 발송</div>
            <p className="mt-1 text-sm text-slate-500">
              이 맵에 편입된 {suppliers.length}개 협력사입니다. 협력사별로 <b>정보요청 메일·제3자 정보제공 동의서</b>를 발송하세요. 수신 확인은 다음 단계(STEP 4)에서 합니다. (광산은 제련소가 데이터를 대행 제공)
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-100" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">
          <span className="text-xs font-bold text-ink-400">발송 {mailedCount} / {mailableCount}</span>
          <button
            type="button"
            onClick={onOpenMail}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-ink-400 hover:border-brand hover:text-brand"
          >
            <Mail className="h-3.5 w-3.5" /> 정보 입력 요청 메일 · 동의서
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {suppliers.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">이 공급망 맵에 편입된 협력사가 없습니다.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {suppliers.map(s => {
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
                        title={isMiner ? '광산은 동의서 대상이 아닙니다(제련소 대행)' : consentReceived ? '동의서 수신됨 · 내용 보기' : '제3자 정보제공 동의서 발송·내역'}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          consentReceived
                            ? 'border-ok-border bg-ok-bg text-ok-text'
                            : 'border-slate-200 bg-white text-ink-400 hover:border-brand hover:text-brand'
                        }`}
                      >
                        {consentReceived ? <Paperclip className="h-3.5 w-3.5" /> : <FileSignature className="h-3.5 w-3.5" />}
                        {consentReceived ? '동의서 수신' : '동의서'}
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
            협력사에 동의 메일을 발송한 뒤, STEP 4에서 동의서 수신을 확인하세요.
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
