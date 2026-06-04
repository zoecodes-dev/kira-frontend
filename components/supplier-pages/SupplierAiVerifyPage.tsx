'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import clsx from 'clsx';
import { CheckRow } from './shared/CheckRow';
import { RegSummaryCard } from './sections/ai-verify/RegSummaryCard';
import { REG_META, buildChecklists, calcRate, type RegKey } from './utils/aiVerifyChecklists';

export default function SupplierAiVerifyPage() {
  const { id } = useParams<{ id: string }>();
  const [selected, setSelected] = useState<RegKey>('UFLPA');

  const checklists  = buildChecklists(id);
  const regKeys     = Object.keys(REG_META) as RegKey[];
  const activeItems = checklists[selected];
  const activeMeta  = REG_META[selected];

  return (
    <div className="p-8 space-y-6 max-w-5xl">

      {/* ── 규제별 이행률 요약 카드 ── */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-3">
          규제별 이행률 요약
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {regKeys.map(key => {
            const items = checklists[key];
            const rate  = calcRate(items);
            return (
              <RegSummaryCard
                key={key}
                meta={REG_META[key]}
                rate={rate}
                passed={items.filter(i => i.status === 'pass').length}
                total={items.length}
                isActive={selected === key}
                onClick={() => setSelected(key)}
              />
            );
          })}
        </div>
      </div>

      {/* ── 선택된 규제 체크리스트 ── */}
      <div className={clsx('rounded-xs border p-5', activeMeta.color)}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className={clsx('text-sm font-bold', activeMeta.accent)}>{activeMeta.label}</div>
            <div className="text-[11px] text-ink-400 mt-0.5">{activeMeta.sub}</div>
          </div>
          <div className="text-right">
            <div className={clsx('text-2xl font-bold num-mono',
              calcRate(activeItems) >= 80 ? 'text-emerald-500' :
              calcRate(activeItems) >= 50 ? 'text-amber-500' : 'text-red-500'
            )}>
              {calcRate(activeItems)}%
            </div>
            <div className="text-[10px] text-ink-500 num-mono">
              {activeItems.filter(i => i.status === 'pass').length} / {activeItems.length} 항목
            </div>
          </div>
        </div>

        {selected === 'EU_BATTERY' && (
          <div className="mb-4 px-3 py-2 rounded-xs border border-blue-700/30 bg-blue-500/5 text-[10px] text-blue-400">
            2030년: Co/Ni/Li 4% 이상 ｜ 2035년: Co 12%, Ni 4%, Li 4% 이상
          </div>
        )}

        <div className="space-y-1.5">
          {activeItems.map((item, i) => (
            <CheckRow key={i} label={item.label} status={item.status} detail={item.detail} />
          ))}
        </div>
      </div>

      {/* ── 범례 ── */}
      <div className="flex items-center gap-4 text-[10px] text-ink-500">
        <span>✅ 이행 완료</span>
        <span>❌ 미충족</span>
        <span>🔄 백엔드 연동 대기</span>
      </div>
    </div>
  );
}
