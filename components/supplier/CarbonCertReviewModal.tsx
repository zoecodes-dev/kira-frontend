'use client';

import { useEffect, useState } from 'react';
import { X, ScanLine, Loader2 } from 'lucide-react';
import { checkCarbon, type ExtractionResult, type OriginCheckResult } from '@/lib/api';
import OriginRiskBanner from './OriginRiskBanner';

// 문자열("36.5 kgCO2eq/kWh")에서 앞쪽 숫자만 추출. 실패 시 null.
export function parseCarbonValue(v: unknown): number | null {
  if (v == null) return null;
  const m = String(v).replace(',', '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

// 파싱 결과에서 4.규제 prefill 값 추출.
//   api 래퍼(snakeToCamel)가 parsedFields 내부 키까지 camelCase로 바꾼다(carbon_intensity → carbonIntensity).
export function pickCarbonPrefill(r: ExtractionResult) {
  const pf = r.parsedFields ?? {};
  const s = (v: unknown) => (v != null && String(v).trim() ? String(v).trim() : '');
  return {
    carbonIntensity: s(pf.carbonIntensity),
    energySource: s(pf.energySource),
  };
}

const HIGHLIGHT_FIELDS: { key: string; label: string }[] = [
  { key: 'carbonIntensity', label: '탄소집약도 (kgCO2eq/kWh)' },
  { key: 'energySource', label: '에너지원' },
  { key: 'verificationStatus', label: '제3자 검증' },
];

export default function CarbonCertReviewModal({
  fileUrl, fileName, result, saving, onSave, onClose,
}: {
  fileUrl: string | null;
  fileName?: string;
  result: ExtractionResult | null;   // null = 파싱 중
  saving?: boolean;
  onSave?: () => void;               // 없으면 재열람 모드([저장] 숨김)
  onClose: () => void;
}) {
  const parsing = result === null;
  const pf = result?.parsedFields ?? {};
  const conf = result?.confidenceMap ?? {};
  const anyHighlighted = HIGHLIGHT_FIELDS.some(f => pf[f.key] != null && String(pf[f.key]).trim());

  // 파싱 완료 시, 추출된 탄소집약도로 Art.7 규제 판정을 걸어 모달 안에서 "왜 위반인지"를 보여준다.
  const [carbonResult, setCarbonResult] = useState<OriginCheckResult | 'loading' | null>(null);
  useEffect(() => {
    if (!result) { setCarbonResult(null); return; }
    const ci = parseCarbonValue(pf.carbonIntensity);
    if (ci == null) { setCarbonResult(null); return; }
    let cancelled = false;
    setCarbonResult('loading');
    checkCarbon({ carbon_intensity: ci })
      .then(r => { if (!cancelled) setCarbonResult(r); })
      .catch(() => { if (!cancelled) setCarbonResult(null); });   // 판정 실패는 조용히 무시(자문)
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-sm border border-ink-700 bg-white shadow-xl">

        {/* header */}
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-slate-50 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <ScanLine className="h-4 w-4 text-accent-700" />
            <div>
              <div className="text-sm font-bold text-ink-100">환경성적서 파싱 확인</div>
              <div className="text-[11px] text-ink-500">AI가 추출한 탄소집약도를 확인하고 저장하면 규제 항목에 자동 입력됩니다.</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xs p-1 text-ink-500 hover:bg-slate-100" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* body */}
        <div className="flex min-h-0 flex-1 gap-1 p-1">
          {/* left: 원본 문서 */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-sm border border-ink-700 bg-white">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-ink-700 bg-slate-50/60 px-4 py-2.5">
              <span className="truncate text-[11px] font-bold text-ink-500">{fileName ?? '원본 문서'}</span>
              {fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[11px] font-semibold text-accent-700 hover:underline">새 탭에서 열기 ↗</a>
              )}
            </div>
            {fileUrl ? (
              <iframe src={fileUrl} title={fileName ?? '원본 문서'} className="min-h-0 w-full flex-1 bg-[#E5E7EB]" />
            ) : (
              <div className="flex flex-1 items-center justify-center bg-[#E5E7EB] text-center text-ink-400">
                <div>
                  <p className="text-xs">{fileName ?? '문서'}</p>
                  <p className="mt-1 text-[11px] opacity-60">원본 업로드 중…</p>
                </div>
              </div>
            )}
          </div>

          {/* right: AI 추출 결과 + 규제 판정 */}
          <div className="flex w-[380px] shrink-0 flex-col overflow-hidden rounded-sm border border-ink-700 bg-white">
            <div className="shrink-0 border-b border-ink-700 bg-slate-50/60 px-4 py-2.5 text-xs font-bold text-ink-500">AI 추출 결과</div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {parsing ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm font-semibold">문서 파싱 중…</p>
                  <p className="text-[11px]">AI가 탄소 정보를 추출하고 있습니다.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {HIGHLIGHT_FIELDS.map(f => {
                    const raw = pf[f.key];
                    const val = raw != null ? String(raw) : '';
                    const c = conf[f.key];
                    return (
                      <div key={f.key} className={`rounded-xs border px-3 py-2 ${val ? 'border-accent-100 bg-accent-50' : 'border-ink-700 bg-white'}`}>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-ink-500">{f.label}</div>
                        <div className={`text-sm font-semibold ${val ? 'text-ink-100' : 'text-ink-400'}`}>{val || '— 추출 안 됨'}</div>
                        {val && typeof c === 'number' && <div className="mt-0.5 text-[10px] text-ink-500">신뢰도 {Math.round(c * 100)}%</div>}
                      </div>
                    );
                  })}
                  {result?.evidenceSummary && (
                    <p className="pt-1 text-[11px] text-ink-500">{result.evidenceSummary}</p>
                  )}
                  {!anyHighlighted && (
                    <p className="rounded-xs border border-warn-border bg-warn-bg px-3 py-2 text-[11px] text-warn-text">
                      탄소 항목을 추출하지 못했습니다. 원본을 확인하거나 규제 항목에 직접 입력해 주세요.
                    </p>
                  )}

                  {/* AI 규제 판정 — 왜 위반인지(추출된 탄소집약도 기반) */}
                  {carbonResult && (
                    <div className="mt-1 border-t border-ink-700 pt-2.5">
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">AI 규제 판정 (EU 배터리법 Art.7)</div>
                      {carbonResult === 'loading'
                        ? <div className="text-xs text-ink-500">규제 분석 중…</div>
                        : (carbonResult.isViolated || carbonResult.severity === 'warning')
                          ? <OriginRiskBanner result={carbonResult} />
                          : <div className="rounded-xs border border-ok-border bg-ok-bg px-3 py-2 text-xs text-ok-text">규제 위반 징후 없음 — 통과</div>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* footer */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-ink-700 bg-slate-50/60 px-4 py-3">
              <button type="button" onClick={onClose} className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-semibold text-ink-500 hover:border-ink-500">닫기</button>
              {onSave && (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={parsing || saving || !anyHighlighted}
                  className="rounded-xs border border-accent-700 bg-accent-700 px-3 py-1.5 text-xs font-bold text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? '저장 중…' : '저장 · 규제 항목에 입력'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
