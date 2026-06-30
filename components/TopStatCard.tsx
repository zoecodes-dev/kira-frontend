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
  info: { card: 'border-info-border bg-info-bg hover:border-info-border', value: 'text-info-text' },
  ok: { card: 'border-ok-border bg-ok-bg hover:border-ok-border', value: 'text-ok-text' },
  warn: { card: 'border-warn-border bg-warn-bg hover:border-warn-border', value: 'text-warn-text' },
  alert: { card: 'border-alert-border bg-alert-bg hover:border-alert-border', value: 'text-alert-text' },
  critical: { card: 'border-alert-border bg-alert-bg hover:border-alert-border', value: 'text-alert-text' },
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
