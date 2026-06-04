import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

export type KpiTone = 'ok' | 'warn' | 'critical' | 'neutral';

const TONE_COLORS: Record<KpiTone, { border: string; val: string }> = {
  ok:       { border: 'border-emerald-700/30', val: 'text-emerald-600' },
  warn:     { border: 'border-amber-700/30',   val: 'text-amber-600' },
  critical: { border: 'border-red-700/30',     val: 'text-red-600' },
  neutral:  { border: 'border-ink-700',        val: 'text-ink-300' },
};

export function KpiTile({ icon: Icon, label, value, unit, tone }: {
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
  tone: KpiTone;
}) {
  const c = TONE_COLORS[tone];
  return (
    <div className={clsx('rounded-xs border p-3 bg-ink-800/30', c.border)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-ink-400">{label}</span>
        <Icon className="w-3.5 h-3.5 text-ink-500" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={clsx('text-2xl font-semibold num-mono', c.val)}>{value}</span>
        <span className="text-xs text-ink-500">{unit}</span>
      </div>
    </div>
  );
}
