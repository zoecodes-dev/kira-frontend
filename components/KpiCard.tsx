import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { value: string; trend: 'up' | 'down' | 'neutral' };
  icon?: LucideIcon;
  tone?: 'default' | 'ok' | 'warn' | 'alert' | 'info';
  hint?: string;
  onClick?: () => void;
  active?: boolean;
}

const toneStyles = {
  default: 'border-ink-700 bg-white',
  ok: 'border-emerald-300 bg-emerald-50/60',
  warn: 'border-amber-300 bg-amber-50/70',
  alert: 'border-red-300 bg-red-50/70',
  info: 'border-blue-300 bg-blue-50/70',
};

const valueColors = {
  default: 'text-ink-100',
  ok: 'text-emerald-800',
  warn: 'text-amber-800',
  alert: 'text-red-800',
  info: 'text-blue-800',
};

const accentBars = {
  default: 'bg-slate-400',
  ok: 'bg-emerald-600',
  warn: 'bg-amber-500',
  alert: 'bg-red-600',
  info: 'bg-blue-600',
};

export default function KpiCard({
  label,
  value,
  unit,
  delta,
  icon: Icon,
  tone = 'default',
  hint,
  onClick,
  active = false,
}: KpiCardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'relative w-full rounded-sm border p-5 text-left shadow-control transition-colors overflow-hidden',
        toneStyles[tone],
        onClick && 'cursor-pointer hover:border-ink-600 hover:shadow-panel focus:outline-none focus:ring-2 focus:ring-accent-500/30',
        active && 'border-accent-600 ring-1 ring-accent-500/30'
      )}
    >
      <div className={clsx('absolute inset-x-0 top-0 h-1', accentBars[tone])} />
      <div className="flex items-start justify-between mb-4">
        <div className="text-xs font-semibold text-ink-500">{label}</div>
        {Icon && (
          <div className="w-8 h-8 rounded-xs border border-ink-700 bg-white flex items-center justify-center">
            <Icon className="w-4 h-4 text-ink-400" strokeWidth={1.8} />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={clsx('text-4xl font-semibold num-mono tracking-tight', valueColors[tone])}>
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-ink-500">{unit}</span>}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {delta && (
          <span className={clsx(
            'text-xs font-medium num-mono',
            delta.trend === 'up' && 'text-emerald-800',
            delta.trend === 'down' && 'text-red-800',
            delta.trend === 'neutral' && 'text-ink-500'
          )}>
            {delta.trend === 'up' && '↑ '}
            {delta.trend === 'down' && '↓ '}
            {delta.value}
          </span>
        )}
        {hint && <span className="text-xs text-ink-500">{hint}</span>}
      </div>
    </Component>
  );
}
