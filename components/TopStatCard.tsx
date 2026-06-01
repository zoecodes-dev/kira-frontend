import clsx from 'clsx';

type TopStatTone = 'neutral' | 'info' | 'ok' | 'warn' | 'alert' | 'critical' | 'purple';

interface TopStatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  tone?: TopStatTone;
  active?: boolean;
  onClick?: () => void;
}

const toneStyles: Record<TopStatTone, { card: string; value: string }> = {
  neutral: { card: 'border-slate-300 bg-slate-50/80 hover:border-slate-400', value: 'text-slate-700' },
  info: { card: 'border-blue-300 bg-blue-50/80 hover:border-blue-400', value: 'text-blue-700' },
  ok: { card: 'border-emerald-300 bg-emerald-50/80 hover:border-emerald-400', value: 'text-emerald-700' },
  warn: { card: 'border-orange-300 bg-orange-50/80 hover:border-orange-400', value: 'text-orange-700' },
  alert: { card: 'border-red-300 bg-red-50/80 hover:border-red-400', value: 'text-red-700' },
  critical: { card: 'border-red-400 bg-red-50 hover:border-red-500', value: 'text-red-800' },
  purple: { card: 'border-violet-300 bg-violet-50/80 hover:border-violet-400', value: 'text-violet-700' },
};

export default function TopStatCard({
  label,
  value,
  unit,
  tone = 'neutral',
  active = false,
  onClick,
}: TopStatCardProps) {
  const Component = onClick ? 'button' : 'div';
  const style = toneStyles[tone];

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'w-full rounded-xs border px-4 py-3 text-left shadow-control transition-colors',
        style.card,
        active && 'ring-1 ring-accent-500/40',
        onClick && 'focus:outline-none focus:ring-2 focus:ring-accent-500/30',
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-bold text-ink-100">{label}</span>
        <span className="flex items-baseline gap-2">
          <span className={clsx('text-xl font-bold num-mono', style.value)}>{value}</span>
          {unit && <span className="text-sm font-semibold text-ink-500">{unit}</span>}
        </span>
      </div>
    </Component>
  );
}
