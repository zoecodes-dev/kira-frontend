'use client';

// [목표3] AI 규제 분석 보고서 — 추출된 탄소집약도·에너지원을 백엔드 RAG(EU 배터리법 Art.7)로
//   판정한 결과를 표시. 위반=붉은 경고 / 준수=녹색 체크 + 근거 법령·조항 인용.
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { analyzeCarbonRegulation, type CarbonComplianceResult } from '@/lib/api';

export default function CarbonComplianceReport({ carbonIntensity, energySource }: {
  carbonIntensity?: number | null;
  energySource?: string | null;
}) {
  const [result, setResult] = useState<CarbonComplianceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (carbonIntensity == null && !energySource) { setResult(null); return; }
    let cancelled = false;
    setLoading(true); setError('');
    analyzeCarbonRegulation({ carbonIntensity, energySource })
      .then(r => { if (!cancelled) setResult(r); })
      .catch(() => { if (!cancelled) setError('규제 분석에 실패했습니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [carbonIntensity, energySource]);

  if (carbonIntensity == null && !energySource) return null;

  const violation = result?.verdict === 'violation';
  const pass = result?.verdict === 'pass';
  const badgeCls = violation
    ? 'border-alert-border bg-alert-bg text-alert-text'
    : pass
      ? 'border-ok-border bg-ok-bg text-ok-text'
      : 'border-warn-border bg-warn-bg text-warn-text';

  return (
    <div className="mt-3 rounded-sm border border-ok-border bg-ok-bg">
      <div className="flex items-center gap-2 border-b border-ok-border px-4 py-2.5">
        <ShieldAlert className="h-4 w-4 text-accent-700" />
        <span className="text-xs font-bold text-ink-100">AI 규제 분석 보고서</span>
        <span className="text-[10px] text-ink-500">RAG · 규제 지식베이스 조회</span>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin text-accent-700" />
            규제 지식베이스(RAG)를 조회해 준수 여부를 분석 중…
          </div>
        ) : error ? (
          <div className="text-xs text-alert-text">{error}</div>
        ) : result ? (
          <div className="space-y-2.5">
            <div className={`inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 text-xs font-bold ${badgeCls}`}>
              {violation ? <AlertTriangle className="h-3.5 w-3.5" /> : pass ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {violation ? '규제 위반' : pass ? '규제 준수' : '검토 필요'}
            </div>
            {result.checks && result.checks.length > 0 && (
              <ul className="space-y-1.5">
                {result.checks.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-6 text-ink-100">
                    {c.passed
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok-solid" />
                      : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-alert-text" />}
                    <span>
                      <b>{c.label}</b>
                      {c.note && <span className="text-ink-400"> — {c.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="text-sm leading-6 text-ink-100">{result.reasoning}</div>
            <div className="rounded-xs border border-ink-700 bg-white p-2.5 text-[11px] text-ink-400">
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
