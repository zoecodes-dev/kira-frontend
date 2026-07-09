'use client';

// [작업1] AI CSDDD 실사 분석 보고서 — 파싱된 SAQ 항목(고충처리 채널·강제노동 징후 등)을
//   백엔드 RAG(CSDDD 공급망 실사 지침)로 판정한 결과를 표시.
//   리스크 발견 시 단순 '위반'이 아니라 근거 조항(예: CSDDD Art.9)을 인용한 경고 Alert.
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { analyzeSaqRegulation, type SaqComplianceResult } from '@/lib/api';

export default function SaqComplianceReport({ saqFields }: { saqFields: Record<string, unknown> | null }) {
  const [result, setResult] = useState<SaqComplianceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  if (!hasFields) return null;

  const violation = result?.verdict === 'violation';
  const pass = result?.verdict === 'pass';
  const badgeCls = violation
    ? 'border-alert-border bg-alert-bg text-alert-text'
    : pass
      ? 'border-ok-border bg-ok-bg text-ok-text'
      : 'border-warn-border bg-warn-bg text-warn-text';

  return (
    <div className="mt-3 rounded-sm border border-ink-700 bg-white">
      <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-2.5">
        <ShieldAlert className="h-4 w-4 text-accent-700" />
        <span className="text-xs font-bold text-ink-100">AI CSDDD 실사 분석 보고서</span>
        <span className="text-[10px] text-ink-500">RAG · 공급망 실사 지침 조회</span>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin text-accent-700" />
            CSDDD 규제 지식베이스(RAG)를 조회해 인권·환경 실사 위반 여부를 분석 중…
          </div>
        ) : error ? (
          <div className="text-xs text-alert-text">{error}</div>
        ) : result ? (
          <div className="space-y-2.5">
            {/* 위반 시 강조 경고 Alert — 근거 조항 인용 포함 */}
            {violation ? (
              <div className="flex items-start gap-2 rounded-xs border border-alert-border bg-alert-bg px-3 py-2.5 text-sm font-semibold text-alert-text">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>🚨 {result.citation ? `${result.citation} 위반 위험` : 'CSDDD 위반 위험'}: {result.reasoning}</span>
              </div>
            ) : (
              <>
                <div className={`inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 text-xs font-bold ${badgeCls}`}>
                  {pass ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {pass ? '실사 요건 충족' : '검토 필요'}
                </div>
                <div className="text-sm leading-6 text-ink-100">{result.reasoning}</div>
              </>
            )}
            <div className="rounded-xs border border-ink-700 bg-ink-800/40 p-2.5 text-[11px] text-ink-400">
              <div className="font-semibold text-ink-300">
                근거 법령: {result.regulationName}{result.citation ? ` · ${result.citation}` : ''}
              </div>
              {result.clauseText && <div className="mt-1 leading-5">&ldquo;{result.clauseText}&rdquo;</div>}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
