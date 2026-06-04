import clsx from 'clsx';
import { PendingBadgeBlock } from '../../shared/PendingBadgeBlock';

interface Props {
  countryEntries: [string, number][];
}

export function CrmaSection({ countryEntries }: Props) {
  if (countryEntries.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-ink-500 border border-dashed border-ink-700/40 rounded-xs">
        공장 데이터 없음
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {countryEntries.map(([country, ratio]) => {
          const isAbove65 = ratio >= 65;
          const isAbove50 = ratio >= 50;
          return (
            <div key={country}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-ink-200 font-medium">{country}</span>
                <span className={clsx('text-[11px] font-bold num-mono',
                  isAbove65 ? 'text-red-500' : isAbove50 ? 'text-amber-500' : 'text-ink-300'
                )}>
                  {ratio}%
                  {isAbove65 && <span className="ml-1 text-[9px]">⚠ CRMA 기준 초과</span>}
                  {!isAbove65 && isAbove50 && <span className="ml-1 text-[9px]">⚠ 주의</span>}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-ink-700/60">
                <div
                  className={clsx('absolute left-0 top-0 h-full rounded-full transition-all',
                    isAbove65 ? 'bg-red-500' : isAbove50 ? 'bg-amber-500' : 'bg-violet-500'
                  )}
                  style={{ width: `${ratio}%` }}
                />
                <div className="absolute top-[-4px] bottom-[-4px] w-px border-l border-dashed border-red-500/60"   style={{ left: '65%' }} />
                <div className="absolute top-[-4px] bottom-[-4px] w-px border-l border-dashed border-amber-500/40" style={{ left: '50%' }} />
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-4 mt-2 text-[10px] text-ink-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-px border-t border-dashed border-amber-500/60" />
            50% 주의선
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-px border-t border-dashed border-red-500/60" />
            65% CRMA 기준선
          </span>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <PendingBadgeBlock label="전체 공급망 집계 계산 대기" detail="시스템 집계 후 표시됩니다" />
        <div className="text-[10px] text-ink-500 px-1">전체 공급망 의존도는 시스템 집계 후 표시됩니다</div>
      </div>
    </div>
  );
}
