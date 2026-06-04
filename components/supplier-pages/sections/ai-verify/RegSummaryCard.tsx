import clsx from 'clsx';

interface RegMeta {
  label: string;
  sub: string;
  color: string;
  accent: string;
}

interface Props {
  meta: RegMeta;
  rate: number;
  passed: number;
  total: number;
  isActive: boolean;
  onClick: () => void;
}

export function RegSummaryCard({ meta, rate, passed, total, isActive, onClick }: Props) {
  const rateColor =
    rate >= 80 ? 'text-emerald-500' : rate >= 50 ? 'text-amber-500' : 'text-red-500';
  const barColor =
    rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <button
      onClick={onClick}
      className={clsx(
        'text-left p-3 rounded-xs border transition-all',
        isActive
          ? `${meta.color} ring-1 ring-inset ring-white/10`
          : 'border-ink-700/60 bg-ink-900/20 hover:border-ink-600 hover:bg-ink-800/40'
      )}
    >
      <div className={clsx('text-[11px] font-bold mb-0.5', isActive ? meta.accent : 'text-ink-200')}>
        {meta.label}
      </div>
      <div className="text-[9px] text-ink-500 mb-2 truncate">{meta.sub}</div>
      <div className="h-1 rounded-full bg-ink-700/60 mb-1">
        <div
          className={clsx('h-full rounded-full transition-all', barColor)}
          style={{ width: `${rate}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className={clsx('text-[11px] font-bold num-mono', rateColor)}>{rate}%</span>
        <span className="text-[9px] text-ink-500 num-mono">{passed}/{total}</span>
      </div>
    </button>
  );
}
