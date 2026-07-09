'use client';

// 협력사 승인 (HITL) — 협력사가 자료를 제출하면 AI agent가 파싱하고, 사람이 검증한다.
// 입력 데이터 + AI가 분석한 값 + 신뢰도(어떻게 산출했는지)를 보여주고, 자동통과 항목도 확인·승인한다.
// 데이터 출처: GET /data-requests/ai-extractions (document_extraction_results — 자료 요청과 연결).
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Bot, CheckCircle2, ChevronDown, ChevronRight, Loader2, ScanLine, ShieldAlert, XCircle } from 'lucide-react';
import { approveDataRequest, approveHitl, getAiExtractions, rejectHitl, type AiExtraction } from '@/lib/api';
import PrimeAiParsingReviewModal from './PrimeAiParsingReviewModal';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  submission_approved: { label: '승인됨', cls: 'border-ok-border bg-ok-bg text-ok-text' },
  submission_rework:   { label: '재작업', cls: 'border-alert-border bg-alert-bg text-alert-text' },
  submission_submitted:{ label: '제출됨', cls: 'border-info-border bg-info-bg text-info-text' },
  submission_requested:{ label: '요청됨', cls: 'border-slate-200 bg-slate-50 text-slate-500' },
};
const ATTENTION = 0.8; // 신뢰도 0.8 미만 = 사람 검토 필요(그 이상은 AI 자동통과)

// 자기완결형 모듈 — 대시보드·My Task 협력사 승인에서 동일하게 사용(검토→AI 처리 뷰 내장).
export default function HitlReviewCard() {
  const [items, setItems] = useState<AiExtraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [review, setReview] = useState<{ supplierId: string; supplierName: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const all = await getAiExtractions();
      // 이미 사람이 승인한 건은 목록에서 뺀다 — 이 카드는 "검토가 필요한 건"만 보여준다.
      setItems(all.filter(x => x.submissionStatus !== 'submission_approved'));
    }
    catch { setItems([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // 승인 = 자료요청 완료 + (연결된 경우) HITL 리뷰 승인(파이프라인 재개).
  async function approve(x: AiExtraction) {
    setBusyId(x.requestId);
    try {
      if (x.batchId && x.hitlReviewId) await approveHitl(x.batchId, '검토 완료').catch(() => {});
      await approveDataRequest(x.requestId, '검토 완료').catch(() => {});
      await load();
    } finally { setBusyId(null); }
  }
  // 반려 = (연결된 경우) HITL 리뷰 반려(파이프라인 차단) — 협력사 재요청 대상.
  async function reject(x: AiExtraction) {
    setBusyId(x.requestId);
    try {
      if (x.batchId && x.hitlReviewId) await rejectHitl(x.batchId, '검토 반려 — 재요청').catch(() => {});
      await load();
    } finally { setBusyId(null); }
  }

  const attentionCount = (x: AiExtraction) =>
    Object.entries(x.confidenceMap).filter(([, c]) => c < ATTENTION).length + x.unparsedFields.length;

  return (
    <>
    <section className="rounded-sm border border-ink-700 bg-white shadow-control">
      <div className="flex items-center justify-between gap-3 border-b border-ink-700 px-5 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-bold text-ink-100">협력사 검토 · 승인</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-ink-400">{items.length}건</span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">협력사 제출 → AI → 사람 검증 · 자료 요청과 연결</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm font-semibold">AI 처리 결과 불러오는 중…</span></div>
      ) : items.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">검토할 자료가 없습니다. 협력사가 자료를 제출하면 여기에 나타납니다.</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map(x => {
            const open = openId === x.requestId;
            const attn = attentionCount(x);
            const sm = STATUS_META[x.submissionStatus ?? ''] ?? { label: x.submissionStatus ?? '-', cls: 'border-slate-200 bg-slate-50 text-slate-500' };
            const fields = Object.keys(x.parsedFields);
            return (
              <li key={x.requestId}>
                <div className="flex items-center justify-between gap-3 px-5 py-3">
                  <button type="button" onClick={() => setOpenId(open ? null : x.requestId)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    {open ? <ChevronDown className="h-4 w-4 text-ink-400" /> : <ChevronRight className="h-4 w-4 text-ink-400" />}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-ink-100">{x.supplierName ?? '-'} <span className="text-slate-400">· {x.requestedDataType ?? '-'}</span></div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                        <span className={clsx('rounded-full border px-1.5 py-0.5 font-bold', sm.cls)}>{sm.label}</span>
                        <span className="text-slate-500">AI 추출 {fields.length}개 항목</span>
                        {attn > 0
                          ? <span className="inline-flex items-center gap-1 rounded-full border border-alert-border bg-alert-bg px-1.5 py-0.5 font-bold text-alert-text"><ShieldAlert className="h-3 w-3" />검토 필요 {attn}</span>
                          : <span className="inline-flex items-center gap-1 rounded-full border border-ok-border bg-ok-bg px-1.5 py-0.5 font-bold text-ok-text"><CheckCircle2 className="h-3 w-3" />AI 자동통과</span>}
                        {x.hitlReviewId && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-warn-border bg-warn-bg px-1.5 py-0.5 font-bold text-warn-text">
                            <Bot className="h-3 w-3" />HITL {x.hitlReason ?? ''} {x.hitlStatus === 'hitl_pending' ? '검토대기' : x.hitlStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {x.supplierId && (
                      <button type="button" onClick={() => setReview({ supplierId: x.supplierId!, supplierName: x.supplierName ?? '협력사' })}
                        className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-ink-700 bg-white px-3 text-xs font-bold text-ink-200 hover:bg-slate-50">
                        <ScanLine className="h-3.5 w-3.5" /> 검토
                      </button>
                    )}
                    {x.hitlReviewId && (
                      <button type="button" onClick={() => reject(x)} disabled={busyId === x.requestId}
                        className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-alert-border bg-white px-3 text-xs font-bold text-alert-text hover:bg-alert-bg disabled:opacity-50">
                        <XCircle className="h-3.5 w-3.5" /> 반려
                      </button>
                    )}
                    <button type="button" onClick={() => approve(x)} disabled={busyId === x.requestId || x.submissionStatus === 'submission_approved'}
                      className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-brand px-3 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-50">
                      {busyId === x.requestId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {x.submissionStatus === 'submission_approved' ? '승인됨' : '승인'}
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="bg-slate-50/60 px-5 pb-4 pt-1">
                    <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500">
                          <tr><th className="px-3 py-2 text-left">항목</th><th className="px-3 py-2 text-left">AI 추출값(입력 분석)</th><th className="px-3 py-2 text-left">신뢰도</th><th className="px-3 py-2 text-left">판정</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {fields.map(k => {
                            const conf = x.confidenceMap[k] ?? 0;
                            const attnRow = conf < ATTENTION;
                            return (
                              <tr key={k}>
                                <td className="px-3 py-2 font-semibold text-ink-100">{k}</td>
                                <td className="px-3 py-2 text-ink-500">{String(x.parsedFields[k])}</td>
                                <td className="px-3 py-2">
                                  <span className={clsx('font-mono font-bold', attnRow ? 'text-alert-text' : 'text-ok-text')}>{Math.round(conf * 100)}%</span>
                                </td>
                                <td className="px-3 py-2">
                                  {attnRow
                                    ? <span className="inline-flex items-center gap-1 text-xs font-bold text-alert-text"><ShieldAlert className="h-3 w-3" />검토 필요</span>
                                    : <span className="inline-flex items-center gap-1 text-xs font-bold text-ok-text"><CheckCircle2 className="h-3 w-3" />AI 자동통과</span>}
                                </td>
                              </tr>
                            );
                          })}
                          {x.unparsedFields.map(k => (
                            <tr key={`u-${k}`} className="bg-alert-bg/30">
                              <td className="px-3 py-2 font-semibold text-ink-100">{k}</td>
                              <td className="px-3 py-2 text-alert-text" colSpan={3}>협력사에 재요청 필요</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">모두 확인 후 "승인"하면 자료 요청이 완료됩니다.</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
    {review && (
      <PrimeAiParsingReviewModal supplierId={review.supplierId} supplierName={review.supplierName} onClose={() => setReview(null)} />
    )}
    </>
  );
}
