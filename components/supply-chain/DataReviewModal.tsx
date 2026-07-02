'use client';

// STEP 4 — 자료 수집·보완 검토. 이 공급망 맵 협력사가 제출한 자료의 '문제'를 짚어주는 화면.
//  · 입력 누락(규제 필수필드 부족) 확인 + 협력사별 보완 '자료 요청'
//  · 제출 문서 중 파싱 문제(미파싱/저신뢰/HITL 미승인) → 눌러서 AI 파싱 검토(AiParsingReviewModal)로 넘어감
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileWarning, Loader2, Send, X } from 'lucide-react';
import { getAiExtractions, type AiExtraction, type SupplierBrief, type SupplyChainGapNode } from '@/lib/api';
import AiParsingReviewModal from '@/components/dashboard/AiParsingReviewModal';

const PROVIDER_LABEL: Record<string, string> = {
  manufacturer: '제조사', recycler: '재활용', trader: '유통', miner: '광산', smelter: '제련소',
};
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);
const LOW_CONF = 0.7;   // 신뢰도 이 미만이면 검토 필요로 본다.

export default function DataReviewModal({
  suppliers,
  gapNodes,
  onRequest,
  onClose,
}: {
  suppliers: SupplierBrief[];
  gapNodes: SupplyChainGapNode[];
  onRequest: (supplierId: string) => void;   // 누락 보완 자료 요청
  onClose: () => void;
}) {
  const [extractions, setExtractions] = useState<AiExtraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<{ id: string; name: string } | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await getAiExtractions().catch(() => []);
      if (!cancelled) { setExtractions(list ?? []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const gapBySupplier = useMemo(() => {
    const m = new Map<string, SupplyChainGapNode>();
    gapNodes.forEach(n => m.set(n.supplier_id, n));
    return m;
  }, [gapNodes]);

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
              이 공급망 맵 협력사가 제출한 자료의 <b>입력 누락</b>과 <b>문서 문제</b>를 확인하세요. 누락은 보완 요청하고, 문제 문서는 눌러 AI 파싱 검토를 진행합니다.
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
                const missing = gap?.missing_fields ?? [];
                const gapCount = gap?.gap_count ?? 0;
                const isMiner = s.providerType === 'miner';
                const docs = docStat.get(s.supplierId) ?? { total: 0, problem: 0 };
                const requested = requestedIds.has(s.supplierId);
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
                        {/* 제출 문서 문제 → AI 파싱 검토 */}
                        {docs.problem > 0 ? (
                          <button
                            type="button"
                            onClick={() => setReview({ id: s.supplierId, name: s.companyName })}
                            className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-warn-border bg-warn-bg px-2.5 text-xs font-bold text-warn-text hover:opacity-90"
                          >
                            <FileWarning className="h-3.5 w-3.5" />
                            AI 파싱 검토 {docs.problem}건
                          </button>
                        ) : docs.total > 0 ? (
                          <span className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-ok-border bg-ok-bg px-2.5 text-xs font-bold text-ok-text">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 문서 정상
                          </span>
                        ) : (
                          <span className="inline-flex h-8 items-center rounded-sm bg-slate-50 px-2.5 text-xs font-semibold text-slate-400">제출 대기</span>
                        )}
                        {/* 입력 누락 보완 요청 (광산 제외 — 제련소 대행) */}
                        {gap && gapCount > 0 && !isMiner && (
                          <button
                            type="button"
                            onClick={() => handleRequest(s.supplierId)}
                            disabled={requested || !isUuid(s.supplierId)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-brand px-2.5 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-50"
                          >
                            {requested ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                            {requested ? '요청됨' : '자료 요청'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 입력 누락 필드 (협력사 general review 입력 기준) */}
                    <div className="mt-2">
                      {!gap ? (
                        <span className="inline-flex rounded-xs border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-400">입력 현황 확인 전</span>
                      ) : gapCount === 0 ? (
                        <span className="inline-flex rounded-xs border border-ok-border bg-ok-bg px-2 py-0.5 text-xs font-bold text-ok-text">입력 완비</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="mr-1 text-xs font-bold text-alert-text">미보유 {gapCount}건</span>
                          {missing.slice(0, 6).map(f => (
                            <span key={f.field_name} className="inline-flex rounded-xs border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-ink-400">
                              {f.field_label || f.field_name}
                            </span>
                          ))}
                          {missing.length > 6 && <span className="text-xs text-slate-400">+{missing.length - 6}</span>}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-sm bg-ink-100 px-4 text-sm font-bold text-white hover:opacity-90">
            닫기
          </button>
        </div>
      </div>

      {review && <AiParsingReviewModal supplierId={review.id} supplierName={review.name} onClose={() => setReview(null)} />}
    </div>
  );
}
