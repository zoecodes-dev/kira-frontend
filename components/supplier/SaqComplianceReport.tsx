'use client';

// [작업1] AI CSDDD 실사 분석 보고서 — 파싱된 SAQ 항목(고충처리 채널·강제노동 징후 등)을
//   백엔드 RAG(CSDDD 공급망 실사 지침)로 판정한 결과를 표시.
//   리스크 발견 시 단순 '위반'이 아니라 근거 조항(예: CSDDD Art.9)을 인용한 경고 Alert.
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { analyzeSaqRegulation, type SaqComplianceResult } from '@/lib/api';

export default function SaqComplianceReport({ saqFields, onVerdictChange, visible = true }: {
  saqFields: Record<string, unknown> | null;
  /** RAG 판정 변경 통보 — 최상위(공통 제출 버튼)가 위반(Red) 여부를 알 수 있게 상태를 끌어올린다.
      분석 전/해제 시 null. */
  onVerdictChange?: (verdict: SaqComplianceResult['verdict'] | null) => void;
  /** false면 분석(RAG 조회 + onVerdictChange 통보)은 그대로 돌지만 카드 UI는 렌더하지 않는다.
      협력사 화면에서는 보고서를 숨기되, 제출 전 규제 위반 게이트는 계속 동작해야 하므로 필요. */
  visible?: boolean;
}) {
  const [result, setResult] = useState<SaqComplianceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 콜백 identity 변동(인라인 arrow)에 흔들리지 않도록 ref로 고정.
  const onVerdictChangeRef = useRef(onVerdictChange);
  useEffect(() => { onVerdictChangeRef.current = onVerdictChange; });
  // 판정 결과가 바뀔 때마다 부모에 통보, 언마운트 시 해제(null).
  useEffect(() => { onVerdictChangeRef.current?.(result?.verdict ?? null); }, [result]);
  useEffect(() => () => { onVerdictChangeRef.current?.(null); }, []);

  // saqFields의 의미있는 키 개수 — 항목이 하나라도 있어야 분석한다.
  const hasFields = !!saqFields && Object.values(saqFields).some(v => v !== null && v !== undefined && v !== '');
  const fieldsSig = JSON.stringify(saqFields ?? {});

  useEffect(() => {
    if (!hasFields) { setResult(null); return; }
    let cancelled = false;
    setLoading(true); setError('');
    analyzeSaqRegulation(saqFields as Record<string, unknown>)
      .then(r => { if (!cancelled) setResult(r); })
      .catch(() => { if (!cancelled) setError('CSDDD 실사 분석에 실패했습니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldsSig]);

  if (!hasFields || !visible) return null;

  const violation = result?.verdict === 'violation';
  const pass = result?.verdict === 'pass';
  const badgeCls = violation
    ? 'border-alert-border bg-alert-bg text-alert-text'
    : pass
      ? 'border-ok-border bg-ok-bg text-ok-text'
      : 'border-warn-border bg-warn-bg text-warn-text';
  // 본문을 빈 줄(\n\n) 기준 문단으로 분리 — 문단 간 여백을 space-y로 직접 제어.
  //   줄바꿈 없는 응답(구 프롬프트)도 문단 1개로 자연 표시된다.
  const paragraphs = (result?.reasoning ?? '').split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

  return (
    <div className="mt-4 rounded-md border border-ink-700 bg-white shadow-control">
      <div className="flex items-center gap-2 border-b border-ink-700 px-5 py-3.5">
        <ShieldAlert className="h-4 w-4 text-accent-700" />
        <span className="text-sm font-bold text-ink-100">AI CSDDD 실사 분석 보고서</span>
        <span className="text-xs text-ink-400">RAG · 공급망 실사 지침 조회</span>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin text-accent-700" />
            CSDDD 규제 지식베이스(RAG)를 조회해 인권·환경 실사 위반 여부를 분석 중…
          </div>
        ) : error ? (
          <div className="text-sm text-alert-text">{error}</div>
        ) : result ? (
          /* 와이드 화면: 본문 2/3 + 근거 법령 세로 배너 1/3 — 좁은 화면(lg 미만)은 1단 스택 */
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              {/* 위반 시 강조 경고 Alert — 근거 조항 인용 포함 */}
              {violation ? (
                <div className="flex items-start gap-2 rounded-xs border border-alert-border bg-alert-bg px-3.5 py-3 text-sm font-semibold leading-7 tracking-[0.01em] text-alert-text">
                  <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
                  <div className="space-y-3">
                    {paragraphs.map((p, i) => (
                      <p key={i} className="whitespace-pre-line">
                        {i === 0 ? `🚨 ${result.citation ? `${result.citation} 위반 위험` : 'CSDDD 위반 위험'}: ${p}` : p}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className={`inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 text-xs font-bold ${badgeCls}`}>
                    {pass ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {pass ? '실사 요건 충족' : '검토 필요'}
                  </div>
                  <div className="space-y-3 text-sm leading-7 tracking-[0.01em] text-ink-100">
                    {paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
                  </div>
                </>
              )}
            </div>
            <div className="rounded-xs border border-ink-700 bg-ink-800/40 p-4 text-sm text-ink-400 lg:col-span-1">
              <div className="font-semibold text-ink-200">
                근거 법령: {result.regulationName}{result.citation ? ` · ${result.citation}` : ''}
              </div>
              {result.clauseText && <div className="mt-2 whitespace-pre-line leading-7 text-ink-300">&ldquo;{result.clauseText}&rdquo;</div>}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
