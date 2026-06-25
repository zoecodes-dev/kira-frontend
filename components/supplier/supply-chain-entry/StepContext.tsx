'use client';

// STEP 1 — provider type(getSupplierDetail pre-fill) + 직상위 정보(읽기전용) + PO 선택
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Building2, Loader2 } from 'lucide-react';
import { getSupplierDetail } from '@/lib/api';
import type { ContextData, ProviderType } from './SupplyChainEntry';
import StepFooter from '@/components/supplier/onboarding/StepFooter';

const providerOptions: { v: ProviderType; label: string }[] = [
  { v: 'manufacturer', label: '제조사' },
  { v: 'recycler', label: '재활용' },
  { v: 'trader', label: '트레이더' },
  { v: 'miner', label: '광산' },
];

// 협력사에게 들어온 PO (백엔드 PO 엔드포인트 없어 mock)
const MOCK_POS = [
  { po: 'PO-2026-0520', item: 'Cathode Active Material', period: '2026-05' },
  { po: 'PO-2026-0508', item: 'Lithium Hydroxide', period: '2026-05' },
  { po: 'PO-2026-0512', item: 'Cobalt Sulfate', period: '2026-05' },
];

export default function StepContext({
  supplierId,
  parentName,
  data,
  onChange,
  onNext,
}: {
  supplierId?: string;
  parentName?: string;
  data: ContextData;
  onChange: (d: ContextData) => void;
  onNext: () => void;
}) {
  const [prefilling, setPrefilling] = useState(Boolean(supplierId));

  useEffect(() => {
    if (!supplierId) return;
    let cancelled = false;
    (async () => {
      setPrefilling(true);
      try {
        const detail = await getSupplierDetail(supplierId);
        if (!cancelled) {
          onChange({ ...data, providerType: data.providerType || detail.supplierType });
        }
      } catch {
        // 토큰/백엔드 없으면 빈 폼으로 진행 (graceful)
      } finally {
        if (!cancelled) setPrefilling(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  function togglePo(po: string) {
    const set = new Set(data.selectedPos);
    if (set.has(po)) set.delete(po);
    else set.add(po);
    onChange({ ...data, selectedPos: Array.from(set) });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      {/* 직상위 정보 */}
      <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <Building2 className="h-4 w-4" />
          직상위 협력사
        </div>
        <div className="mt-1 text-sm font-semibold text-ink-100">{parentName ?? '직상위 정보 없음'}</div>
        <p className="mt-1 text-[11px] text-slate-500">직상위가 요청한 자재의 공급망 정보를 입력합니다.</p>
      </section>

      {/* provider type */}
      <section className="mt-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-100">
          Provider Type
          {prefilling && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {providerOptions.map(opt => (
            <button
              key={opt.v}
              type="button"
              onClick={() => onChange({ ...data, providerType: opt.v })}
              className={clsx(
                'rounded-md border px-3 py-2.5 text-sm font-semibold transition',
                data.providerType === opt.v ? 'border-[#046949] bg-emerald-50 text-[#046949]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* PO 선택 */}
      <section className="mt-5">
        <div className="mb-2 text-sm font-bold text-ink-100">대상 PO 선택</div>
        <div className="space-y-2">
          {MOCK_POS.map(po => {
            const checked = data.selectedPos.includes(po.po);
            return (
              <label
                key={po.po}
                className={clsx(
                  'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition',
                  checked ? 'border-[#046949] bg-emerald-50/60' : 'border-slate-200 bg-white hover:bg-slate-50',
                )}
              >
                <input type="checkbox" checked={checked} onChange={() => togglePo(po.po)} className="h-4 w-4 accent-emerald-600" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink-100">{po.po}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{po.item} · {po.period}</div>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <StepFooter onNext={onNext} nextDisabled={!data.providerType || data.selectedPos.length === 0} />
    </div>
  );
}
