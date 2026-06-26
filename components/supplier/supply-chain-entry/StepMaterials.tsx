'use client';

// STEP 2 — 자재 정보: 소재구성/유해물질/재활용·회수율 + 공장별 공급비율(원산지) + 하위 자재명 + 증빙
import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { getSupplierFactories } from '@/lib/api';
import type { DocItem, FactoryRatioRow, MaterialsData } from './SupplyChainEntry';
import DocRow from './DocRow';
import StepFooter from '@/components/supplier/onboarding/StepFooter';

const pctInput = 'h-9 w-24 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-brand';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-sm font-bold text-ink-100">{children}</div>;
}

export default function StepMaterials({
  supplierId,
  data,
  onChange,
  onBack,
  onNext,
}: {
  supplierId?: string;
  data: MaterialsData;
  onChange: (d: MaterialsData) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [loadingFactories, setLoadingFactories] = useState(false);

  // 공장별 공급비율 pre-fill (getSupplierFactories) — 비어있을 때만
  useEffect(() => {
    if (!supplierId || data.factories.length > 0) return;
    let cancelled = false;
    (async () => {
      setLoadingFactories(true);
      try {
        const res = await getSupplierFactories(supplierId);
        if (!cancelled && res.factories.length > 0) {
          const rows: FactoryRatioRow[] = res.factories.map(f => ({
            factoryId: f.factoryId,
            factoryName: f.factoryName,
            origin: [f.country, f.region].filter(Boolean).join(' · '),
            destination: f.destination ?? '-',
            ratioPct: f.supplyRatioPercent != null ? String(f.supplyRatioPercent) : '',
          }));
          onChange({ ...data, factories: rows });
        }
      } catch {
        // graceful — 빈 폼
      } finally {
        if (!cancelled) setLoadingFactories(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  function setMineral(i: number, patch: Partial<MaterialsData['minerals'][number]>) {
    onChange({ ...data, minerals: data.minerals.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) });
  }
  function setFactoryRatio(i: number, ratioPct: string) {
    onChange({ ...data, factories: data.factories.map((f, idx) => (idx === i ? { ...f, ratioPct } : f)) });
  }
  function setDoc(list: DocItem[], i: number, fileName: string): DocItem[] {
    return list.map((d, idx) => (idx === i ? { ...d, fileName } : d));
  }
  function setChild(i: number, v: string) {
    onChange({ ...data, childMaterials: data.childMaterials.map((c, idx) => (idx === i ? v : c)) });
  }

  const ratioSum = data.factories.reduce((sum, f) => sum + (parseFloat(f.ratioPct) || 0), 0);

  return (
    <div className="space-y-4">
      {/* 소재 구성 */}
      <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle>소재 구성 (핵심 광물 함량)</SectionTitle>
        <div className="space-y-2">
          {data.minerals.map((m, i) => (
            <div key={m.mineral} className="flex items-center gap-3">
              <span className="w-10 text-sm font-bold text-ink-100">{m.mineral}</span>
              <input
                value={m.contentPct}
                onChange={e => setMineral(i, { contentPct: e.target.value })}
                placeholder="함량"
                className={pctInput}
              />
              <span className="text-sm text-slate-400">%</span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <span className="text-xs font-semibold text-slate-600">유해물질</span>
          <textarea
            value={data.harmfulSubstances}
            onChange={e => onChange({ ...data, harmfulSubstances: e.target.value })}
            rows={2}
            placeholder="유해물질 정보를 입력하세요 (예: SVHC 해당 없음)"
            className="mt-1 w-full rounded-md border border-slate-200 p-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* 재활용 */}
      <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle>재활용 함량 · 소재별 회수율</SectionTitle>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-600">재활용 함량</span>
          <input
            value={data.recycledContentPct}
            onChange={e => onChange({ ...data, recycledContentPct: e.target.value })}
            placeholder="함량"
            className={pctInput}
          />
          <span className="text-sm text-slate-400">%</span>
        </div>
        <div className="mt-3 space-y-2">
          {data.minerals.map((m, i) => (
            <div key={m.mineral} className="flex items-center gap-3">
              <span className="w-10 text-sm font-bold text-ink-100">{m.mineral}</span>
              <span className="text-xs text-slate-500">회수율</span>
              <input
                value={m.recoveryPct}
                onChange={e => setMineral(i, { recoveryPct: e.target.value })}
                placeholder="회수율"
                className={pctInput}
              />
              <span className="text-sm text-slate-400">%</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {data.recyclingDocs.map((doc, i) => (
            <DocRow key={doc.label} label={doc.label} value={doc.fileName} onChange={v => onChange({ ...data, recyclingDocs: setDoc(data.recyclingDocs, i, v) })} />
          ))}
        </div>
      </div>

      {/* 공장별 공급비율 · 원산지 */}
      <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <SectionTitle>공장별 공급비율 · 원산지</SectionTitle>
          {loadingFactories && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
        </div>
        {data.factories.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
            연동된 공장 정보가 없습니다. (백엔드/토큰 연결 시 자동 표시)
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {data.factories.map((f, i) => (
                <div key={f.factoryId} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink-100">{f.factoryName}</div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500">원산지 {f.origin || '-'} · 목적지 {f.destination}</div>
                  </div>
                  <input value={f.ratioPct} onChange={e => setFactoryRatio(i, e.target.value)} placeholder="비율" className={pctInput} />
                  <span className="text-sm text-slate-400">%</span>
                </div>
              ))}
            </div>
            <div className={`mt-2 text-right text-xs font-semibold ${Math.round(ratioSum) === 100 ? 'text-ok-text' : 'text-warn-text'}`}>
              합계 {ratioSum.toFixed(0)}% {Math.round(ratioSum) === 100 ? '' : '(100% 권장)'}
            </div>
          </>
        )}
      </div>

      {/* 하위 협력사 공급 자재명 */}
      <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle>하위 협력사로부터 공급받는 자재명</SectionTitle>
        <div className="space-y-2">
          {data.childMaterials.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={c}
                onChange={e => setChild(i, e.target.value)}
                placeholder="자재명"
                className="h-9 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand"
              />
              {data.childMaterials.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...data, childMaterials: data.childMaterials.filter((_, idx) => idx !== i) })}
                  className="text-slate-400 hover:text-alert-text"
                  aria-label="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...data, childMaterials: [...data.childMaterials, ''] })}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-500 hover:border-brand hover:text-brand"
        >
          <Plus className="h-4 w-4" />
          자재 추가
        </button>
      </div>

      <div className="rounded-sm border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <StepFooter onBack={onBack} onNext={onNext} />
      </div>
    </div>
  );
}
