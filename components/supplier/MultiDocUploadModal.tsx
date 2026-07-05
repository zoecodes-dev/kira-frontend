'use client';

import { useRef, useState } from 'react';
import { X, ScanLine, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  uploadFile, ingestSelfUpload, getExtractionResult, checkOrigin, checkCarbon,
  type ExtractionResult, type OriginCheckResult,
} from '@/lib/api';
import { pickOriginPrefill } from './OriginCertReviewModal';
import { pickCarbonPrefill, parseCarbonValue } from './CarbonCertReviewModal';
import OriginRiskBanner from './OriginRiskBanner';
import type { CertRef } from './OriginCertUpload';

// 카드로 넘길 통합 값 (개편안 A · 14필드 중 AI 자동입력분).
export interface MergedFactoryValues {
  factoryName: string; country: string; region: string; address: string;
  carbonIntensity: string; energySource: string;
}

interface DocState {
  name: string;
  docId?: string;
  status: 'uploading' | 'parsing' | 'done' | 'error';
  result?: ExtractionResult;
  fileUrl?: string | null;
}

// 파일명으로 doc_kind 대략 추론(파싱 자체는 Vision이 내용으로 분류하므로 metadata용).
function inferDocKind(name: string): 'origin_certificate' | 'carbon' {
  const n = name.toLowerCase();
  if (/환경|carbon|epd|탄소|배출|emission/.test(n)) return 'carbon';
  return 'origin_certificate';
}

// 여러 문서의 parsedFields를 합집합 병합 → 통합 값. 각 필드는 먼저 채운 문서 값 우선.
function mergeDocs(docs: DocState[]): MergedFactoryValues {
  const out: MergedFactoryValues = { factoryName: '', country: '', region: '', address: '', carbonIntensity: '', energySource: '' };
  for (const d of docs) {
    if (!d.result) continue;
    const o = pickOriginPrefill(d.result);
    const c = pickCarbonPrefill(d.result);
    if (!out.factoryName && o.factoryName) out.factoryName = o.factoryName;
    if (!out.country && o.country) out.country = o.country;
    if (!out.region && o.region) out.region = o.region;
    if (!out.address && o.address) out.address = o.address;
    if (!out.carbonIntensity && c.carbonIntensity) out.carbonIntensity = c.carbonIntensity;
    if (!out.energySource && c.energySource) out.energySource = c.energySource;
  }
  return out;
}

export default function MultiDocUploadModal({
  supplierId, factoryName, onApply, onClose,
}: {
  supplierId: string;
  factoryName?: string;
  onApply: (values: MergedFactoryValues, certRef: CertRef | null) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [docs, setDocs] = useState<DocState[]>([]);
  const [busy, setBusy] = useState(false);
  const [merged, setMerged] = useState<MergedFactoryValues | null>(null);
  const [originV, setOriginV] = useState<OriginCheckResult | 'loading' | null>(null);
  const [carbonV, setCarbonV] = useState<OriginCheckResult | 'loading' | null>(null);

  const parseOne = async (file: File): Promise<DocState> => {
    const base: DocState = { name: file.name, status: 'uploading' };
    try {
      const up = await uploadFile(file, `factory-doc:${supplierId}`);
      const { documentId } = await ingestSelfUpload({ supplier_id: supplierId, s3_key: up.s3Key, file_name: up.fileName || file.name, doc_kind: inferDocKind(file.name) });
      let r: ExtractionResult | null = null;
      for (let i = 0; i < 16 && !r; i++) { await new Promise(res => setTimeout(res, 2500)); r = await getExtractionResult(documentId); }
      if (!r) return { ...base, status: 'error' };
      return { name: file.name, docId: documentId, status: 'done', result: r, fileUrl: up.url };
    } catch { return { ...base, status: 'error' }; }
  };

  const handleFiles = async (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    if (!files.length) return;
    setBusy(true); setMerged(null); setOriginV(null); setCarbonV(null);
    // 각 파일을 "파싱 중"으로 먼저 표시
    setDocs(files.map(f => ({ name: f.name, status: 'parsing' as const })));
    try {
      const results = await Promise.all(files.map(parseOne));
      setDocs(results);
      const m = mergeDocs(results);
      setMerged(m);
      // advisory 판정 (원산지 + 탄소)
      if (m.country || m.region) {
        setOriginV('loading');
        checkOrigin({ factory_name: m.factoryName || factoryName || undefined, country: m.country || undefined, region: m.region || undefined, address: m.address || undefined })
          .then(v => setOriginV(v)).catch(() => setOriginV(null));
      }
      const ci = parseCarbonValue(m.carbonIntensity);
      if (ci != null) {
        setCarbonV('loading');
        checkCarbon({ factory_name: m.factoryName || factoryName || undefined, carbon_intensity: ci })
          .then(v => setCarbonV(v)).catch(() => setCarbonV(null));
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleApply = () => {
    if (!merged) return;
    // 대표 서류(첫 파싱 성공분) 참조를 카드에 부착(행별 재열람용).
    const primary = docs.find(d => d.status === 'done' && d.result);
    const certRef: CertRef | null = primary?.result ? { fileUrl: primary.fileUrl ?? null, fileName: primary.name, result: primary.result } : null;
    onApply(merged, certRef);
    onClose();
  };

  const anyMerged = merged && Object.values(merged).some(v => v && v.trim());
  const showOrigin = originV === 'loading' || (!!originV && typeof originV !== 'string' && (originV.isViolated || originV.severity === 'warning'));
  const showCarbon = carbonV === 'loading' || (!!carbonV && typeof carbonV !== 'string' && (carbonV.isViolated || carbonV.severity === 'warning'));

  const FIELDS: { k: keyof MergedFactoryValues; label: string }[] = [
    { k: 'factoryName', label: '공장명' },
    { k: 'country', label: '원산지 국가' },
    { k: 'region', label: '원산지 지역' },
    { k: 'address', label: '주소' },
    { k: 'carbonIntensity', label: '탄소집약도 (kgCO2eq/kWh)' },
    { k: 'energySource', label: '에너지원' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-sm border border-ink-700 bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-slate-50 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <ScanLine className="h-4 w-4 text-accent-700" />
            <div>
              <div className="text-sm font-bold text-ink-100">통합 증빙 서류 업로드{factoryName ? ` — ${factoryName}` : ''}</div>
              <div className="text-[11px] text-ink-500">원산지 증명서·환경성적서 등을 한 번에 올리면 AI가 종합해 이 공장 카드를 채웁니다.</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xs p-1 text-ink-500 hover:bg-slate-100" aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[280px_1fr]">
          {/* 파일 목록 */}
          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto border-b border-ink-700 p-4 sm:border-b-0 sm:border-r">
            <input ref={inputRef} type="file" accept=".pdf,image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="rounded-xs border border-dashed border-accent-100 bg-accent-50/60 px-3 py-3 text-xs font-bold text-accent-700 hover:bg-accent-100 disabled:opacity-50">
              {busy ? '업로드/파싱 중…' : '＋ 파일 선택 (여러 개 가능)'}
            </button>
            {docs.map((d, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xs border border-ink-700 px-2.5 py-2 text-[11px]">
                <span className="min-w-0 flex-1 truncate font-semibold text-ink-100">{d.name}</span>
                {d.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ok-text" />}
                {(d.status === 'parsing' || d.status === 'uploading') && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-ink-400" />}
                {d.status === 'error' && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-alert-text" />}
              </div>
            ))}
            {docs.length === 0 && <p className="text-[11px] text-ink-400">아직 올린 파일이 없습니다.</p>}
          </div>

          {/* 통합 결과 + 판정 */}
          <div className="min-h-0 overflow-y-auto p-4">
            {!merged ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-ink-400">
                {busy ? <><Loader2 className="h-6 w-6 animate-spin" /><p className="text-sm font-semibold">문서 파싱 중…</p></>
                      : <><ScanLine className="h-7 w-7 opacity-30" /><p className="text-sm">파일을 올리면 AI 통합 결과가 여기에 표시됩니다.</p></>}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wide text-accent-700">AI 통합 결과 · {docs.filter(d => d.status === 'done').length}개 문서</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {FIELDS.map(f => {
                    const v = merged[f.k];
                    return (
                      <div key={f.k} className={`rounded-xs border px-3 py-2 ${v ? 'border-accent-100 bg-accent-50' : 'border-ink-700 bg-white'}`}>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-ink-500">{f.label}</div>
                        <div className={`text-sm font-semibold ${v ? 'text-ink-100' : 'text-ink-400'}`}>{v || '— 추출 안 됨'}</div>
                      </div>
                    );
                  })}
                </div>
                {!anyMerged && (
                  <p className="rounded-xs border border-warn-border bg-warn-bg px-3 py-2 text-[11px] text-warn-text">추출된 값이 없습니다. 서류를 확인하거나 카드에 직접 입력해 주세요.</p>
                )}
                {(showOrigin || showCarbon) && (
                  <div className="space-y-2 border-t border-ink-700 pt-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-ink-500">AI 규제 판정</div>
                    {showOrigin && (originV === 'loading' ? <div className="text-xs text-ink-500">원산지 분석 중…</div> : <OriginRiskBanner result={originV} />)}
                    {showCarbon && (carbonV === 'loading' ? <div className="text-xs text-ink-500">탄소 분석 중…</div> : <OriginRiskBanner result={carbonV} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-ink-700 bg-slate-50/60 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-semibold text-ink-500 hover:border-ink-500">닫기</button>
          <button type="button" onClick={handleApply} disabled={busy || !anyMerged} className="rounded-xs border border-accent-700 bg-accent-700 px-3 py-1.5 text-xs font-bold text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">저장 및 적용 → 카드에 반영</button>
        </div>
      </div>
    </div>
  );
}
