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
  // 본문을 빈 줄(\n\n) 기준 문단으로 분리 — 문단 간 여백을 space-y로 직접 제어.
  //   줄바꿈 없는 응답(구 프롬프트)도 문단 1개로 자연 표시된다.
  const paragraphs = (result?.reasoning ?? '').split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

  return (
    <div className="mt-4 rounded-md border border-ink-700 bg-white shadow-control">
      <div className="flex items-center gap-2 border-b border-ink-700 px-5 py-3.5">
        <ShieldAlert className="h-4 w-4 text-accent-700" />
        <span className="text-sm font-bold text-ink-100">AI 규제 분석 보고서</span>
        <span className="text-xs text-ink-400">RAG · 규제 지식베이스 조회</span>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin text-accent-700" />
            규제 지식베이스(RAG)를 조회해 준수 여부를 분석 중…
          </div>
        ) : error ? (
          <div className="text-sm text-alert-text">{error}</div>
        ) : result ? (
          /* 와이드 화면: 본문 2/3 + 근거 법령 세로 배너 1/3 — 좁은 화면(lg 미만)은 1단 스택 */
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              <div className={`inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 text-xs font-bold ${badgeCls}`}>
                {violation ? <AlertTriangle className="h-3.5 w-3.5" /> : pass ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {violation ? '규제 위반' : pass ? '규제 준수' : '검토 필요'}
              </div>
              <div className="space-y-3 text-sm leading-7 tracking-[0.01em] text-ink-100">
                {paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
              </div>
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
