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
}

const toneStyles = {
  default: 'border-ink-700 bg-ink-800/40',
  ok: 'border-signal-ok/30 bg-signal-ok/5',
  warn: 'border-signal-warn/30 bg-signal-warn/5',
  alert: 'border-signal-alert/30 bg-signal-alert/5',
  info: 'border-signal-info/30 bg-signal-info/5',
};

const valueColors = {
  default: 'text-ink-50',
  ok: 'text-emerald-400',
  warn: 'text-amber-400',
  alert: 'text-red-400',
  info: 'text-blue-400',
};

export default function KpiCard({ label, value, unit, delta, icon: Icon, tone = 'default', hint }: KpiCardProps) {
  return (
    <div className={clsx('relative rounded-sm border p-5', toneStyles[tone])}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-[10px] font-medium uppercase tracking-wider text-ink-400">
          {label}
        </div>
        {Icon && <Icon className="w-4 h-4 text-ink-500" strokeWidth={1.5} />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={clsx('text-3xl font-semibold num-mono tracking-tight', valueColors[tone])}>
          {value}
        </span>
        {unit && <span className="text-sm text-ink-400">{unit}</span>}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {delta && (
          <span className={clsx(
            'text-[11px] num-mono',
            delta.trend === 'up' && 'text-emerald-400',
            delta.trend === 'down' && 'text-red-400',
            delta.trend === 'neutral' && 'text-ink-400'
          )}>
            {delta.trend === 'up' && '↑ '}
            {delta.trend === 'down' && '↓ '}
            {delta.value}
          </span>
        )}
        {hint && <span className="text-[11px] text-ink-500">{hint}</span>}
      </div>
    </div>
  );
}
