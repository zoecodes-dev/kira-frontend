import type { EsgIndustrialAccident } from '@/lib/api';
import { CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { accidentTypeMeta } from '../../utils/esgUtils';

interface Props {
  accident: EsgIndustrialAccident;
}

export function IndustrialAccidentCard({ accident: acc }: Props) {
  const atm     = accidentTypeMeta[acc.accidentType] ?? accidentTypeMeta.near_miss;
  const isFatal = acc.accidentType === 'fatality';

  return (
    <div className={clsx(
      'p-4 rounded-xs border',
      isFatal                               ? 'border-red-700/40 bg-red-500/8' :
      acc.accidentType === 'serious_injury' ? 'border-red-700/30 bg-red-500/5' :
                                              'border-amber-700/30 bg-amber-500/5'
    )}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className={clsx('text-sm font-bold', atm.color)}>{atm.label}</div>
          <div className="text-[11px] text-ink-400 num-mono">{acc.accidentDate}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] text-ink-400">사상자</div>
          <div className={clsx('text-lg font-bold num-mono', isFatal ? 'text-red-600' : 'text-amber-600')}>
            {acc.casualties}명
          </div>
          {acc.ltifr != null && (
            <div className="text-[10px] text-ink-500 num-mono">LTIFR {acc.ltifr}</div>
          )}
        </div>
      </div>
      <p className="text-xs text-ink-200 leading-relaxed mb-2">{acc.description}</p>
      {acc.correctiveAction && (
        <div className="flex items-start gap-1.5 text-[11px] text-ink-400 pt-2 border-t border-ink-700/30">
          <CheckCircle2 className="w-3 h-3 text-ink-500 shrink-0 mt-0.5" />
          {acc.correctiveAction}
        </div>
      )}
      <div className="text-[10px] text-ink-500 mt-1">
        상태: {acc.status === 'reported' ? '보고됨' : acc.status === 'investigating' ? '조사 중' : '종결'}
      </div>
    </div>
  );
}
