'use client';

// STEP 4 — 자료 수집·보완 검토. 이 공급망 맵 협력사가 제출한 자료의 '문제'를 짚어주는 화면.
//  · 입력 누락(규제 필수필드 부족) 확인 → general review로 연결해 상세 확인 + 미완료 협력사 알림 요청
//  · 제출 자료(문서) 확인 → AI 처리 검토(PrimeAiParsingReviewModal)
//  · '전체 확인'을 눌러야 STEP5(최종 검증)로 넘어간다.
import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, ClipboardCheck, Eye, FileText, FileWarning, Loader2, X } from 'lucide-react';
import { getAiExtractions, getDataRequests, type AiExtraction, type ApiDataRequest, type SupplierBrief, type SupplyChainGapNode } from '@/lib/api';
import PrimeAiParsingReviewModal from '@/components/dashboard/PrimeAiParsingReviewModal';

const PROVIDER_LABEL: Record<string, string> = {
  manufacturer: '제조사', recycler: '재활용', trader: '유통', miner: '광산', smelter: '제련소',
};
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);
const LOW_CONF = 0.7;   // 신뢰도 이 미만이면 검토 필요로 본다.

export default function DataReviewModal({
  suppliers,
  gapNodes,
  allConfirmed,
  onRequest,
  onConfirmAll,
  onOpenReview,
  onClose,
}: {
  suppliers: SupplierBrief[];
  gapNodes: SupplyChainGapNode[];
  allConfirmed: boolean;                       // STEP4 '전체 확인' 완료 여부
  onRequest: (supplierId: string) => void;     // 미완료·제출대기 협력사 알림 요청
  onConfirmAll: () => void;                     // 자료 검토 전체 확인 → STEP5 개방
  onOpenReview: (supplierId: string, name: string) => void;  // general review 팝업(입력 현황 확인)
  onClose: () => void;
}) {
  const [extractions, setExtractions] = useState<AiExtraction[]>([]);
  const [requests, setRequests] = useState<ApiDataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<{ id: string; name: string } | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [ext, reqs] = await Promise.all([
        getAiExtractions().catch(() => []),
        getDataRequests().catch(() => []),
      ]);
      if (!cancelled) { setExtractions(ext ?? []); setRequests(reqs ?? []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const gapBySupplier = useMemo(() => {
    const m = new Map<string, SupplyChainGapNode>();
    gapNodes.forEach(n => m.set(n.supplier_id, n));
    return m;
  }, [gapNodes]);

  // supplierId별 마지막 자료요청일(requestedAt 최댓값).
  const lastRequestBySupplier = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of requests) {
      if (!r.targetSupplierId || !r.requestedAt) continue;
      const cur = m.get(r.targetSupplierId);
      if (!cur || r.requestedAt > cur) m.set(r.targetSupplierId, r.requestedAt);
    }
    return m;
  }, [requests]);

  // supplierId별 제출 문서 수 / 문제(미파싱·저신뢰·HITL 미승인) 문서 수.
  const docStat = useMemo(() => {
    const m = new Map<string, { total: number; problem: number }>();
    for (const e of extractions) {
      if (!e.supplierId) continue;
      const s = m.get(e.supplierId) ?? { total: 0, problem: 0 };
      s.total += 1;
      const hasProblem =
        e.unparsedFields.length > 0 ||
        Object.values(e.confidenceMap ?? {}).some(c => c < LOW_CONF) ||
        (e.hitlStatus != null && e.hitlStatus !== 'approved');
      if (hasProblem) s.problem += 1;
      m.set(e.supplierId, s);
    }
    return m;
  }, [extractions]);

  const handleRequest = (id: string) => {
    onRequest(id);
    setRequestedIds(prev => new Set(prev).add(id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-sm border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.2)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-base font-bold text-ink-100">자료 수집 · 보완 검토</div>
            <p className="mt-1 text-sm text-slate-500">
              협력사가 제출한 자료의 <b>입력 현황</b>과 <b>제출 문서</b>를 확인할 수 있습니다.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-100" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm font-semibold text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> 제출 자료 불러오는 중…
            </div>
          ) : suppliers.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">이 공급망 맵에 편입된 협력사가 없습니다.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {suppliers.map(s => {
                const gap = gapBySupplier.get(s.supplierId);
                const gapCount = gap?.gap_count ?? 0;
                const isMiner = s.providerType === 'miner';
                const docs = docStat.get(s.supplierId) ?? { total: 0, problem: 0 };
                const requested = requestedIds.has(s.supplierId);
                // 미완료(입력 누락) 또는 제출 대기(문서 없음)면 알림 요청 대상.
                const pending = (gap != null && gapCount > 0) || docs.total === 0;
                const lastReq = lastRequestBySupplier.get(s.supplierId);
                return (
                  <li key={s.supplierId} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-ink-100">{s.companyName}</div>
                        <div className="mt-0.5 text-xs font-medium text-slate-500">
                          {gap ? `${gap.depth}차 · ` : ''}{PROVIDER_LABEL[s.providerType] ?? s.providerType}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {/* 정보 확인 — general review로 연결해 입력/누락 상세 확인 */}
                        <button
                          type="button"
                          onClick={() => onOpenReview(s.supplierId, s.companyName)}
                          title="협력사 정보(general review) 확인 — 입력·누락 상세"
                          className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-2.5 text-xs font-bold text-ink-400 hover:border-brand hover:text-brand"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          정보 확인
                        </button>
                        {/* 제출 자료 — 제출 문서 보기 / AI 처리 검토 */}
                        {docs.total > 0 ? (
                          <button
                            type="button"
                            onClick={() => setReview({ id: s.supplierId, name: s.companyName })}
                            title="제출 문서 확인 · AI 처리 검토"
                            className={`inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs font-bold transition ${
                              docs.problem > 0
                                ? 'border-warn-border bg-warn-bg text-warn-text hover:opacity-90'
                                : 'border-slate-200 bg-white text-ink-400 hover:border-brand hover:text-brand'
                            }`}
                          >
                            {docs.problem > 0 ? <FileWarning className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                            {docs.problem > 0 ? `제출 자료 (검토 ${docs.problem})` : '제출 자료'}
                          </button>
                        ) : (
                          <span className="inline-flex h-8 items-center rounded-sm bg-slate-50 px-2.5 text-xs font-semibold text-slate-400">제출 대기</span>
                        )}
                        {/* 미완료·제출 대기 협력사 알림 요청 (광산 제외 — 제련소 대행) */}
                        {isMiner ? (
                          <span className="inline-flex h-8 items-center rounded-sm bg-slate-50 px-2.5 text-xs font-semibold text-slate-400">제련소 대행</span>
                        ) : pending && (
                          <button
                            type="button"
                            onClick={() => handleRequest(s.supplierId)}
                            disabled={requested || !isUuid(s.supplierId)}
                            title={requested ? '알림을 보냈습니다' : '이 협력사에 입력·제출 알림을 보냅니다'}
                            className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-brand px-2.5 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-50"
                          >
                            {requested ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                            {requested ? '요청됨' : '알림 요청'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 입력 현황 요약(상세는 정보 확인에서) + 마지막 요청일 */}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        {!gap ? (
                          <span className="inline-flex rounded-xs border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-400">입력 현황 확인 전</span>
                        ) : gapCount === 0 ? (
                          <span className="inline-flex rounded-xs border border-ok-border bg-ok-bg px-2 py-0.5 text-xs font-bold text-ok-text">입력 완비</span>
                        ) : (
                          <span className="inline-flex rounded-xs border border-alert-border bg-alert-bg px-2 py-0.5 text-xs font-bold text-alert-text">입력 미완료 · 미보유 {gapCount}건</span>
                        )}
                      </div>
                      {!isMiner && (
                        <span className="shrink-0 text-[11px] font-medium text-slate-400">
                          {lastReq ? `마지막 요청 ${lastReq.slice(0, 10)}` : '요청 이력 없음'}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
          <span className="text-xs font-medium text-slate-500">
            {allConfirmed ? '자료 검토를 전체 확인했습니다. 최종 검증(STEP5)으로 넘어갈 수 있어요.' : '검토가 끝나면 전체 확인을 눌러 최종 검증으로 넘어갑니다.'}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-sm border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              닫기
            </button>
            <button
              type="button"
              onClick={onConfirmAll}
              disabled={allConfirmed || suppliers.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-brand px-4 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {allConfirmed ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
              {allConfirmed ? '검토 완료' : '전체 확인'}
            </button>
          </div>
        </div>
      </div>

      {review && <PrimeAiParsingReviewModal supplierId={review.id} supplierName={review.name} onClose={() => setReview(null)} />}
    </div>
  );
}
