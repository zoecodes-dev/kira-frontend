import clsx from 'clsx';

type BadgeTone = 'ok' | 'warn' | 'alert' | 'info' | 'neutral';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  dot?: boolean;
  size?: 'sm' | 'md';
}

const toneStyles: Record<BadgeTone, string> = {
  ok:      'bg-signal-ok/15 text-emerald-300 border-signal-ok/30',
  warn:    'bg-signal-warn/15 text-amber-300 border-signal-warn/30',
  alert:   'bg-signal-alert/15 text-red-300 border-signal-alert/30',
  info:    'bg-signal-info/15 text-blue-300 border-signal-info/30',
  neutral: 'bg-ink-700/50 text-ink-300 border-ink-600',
};

const dotColors: Record<BadgeTone, string> = {
  ok: 'bg-signal-ok',
  warn: 'bg-signal-warn',
  alert: 'bg-signal-alert',
  info: 'bg-signal-info',
  neutral: 'bg-ink-400',
};

export default function Badge({ tone = 'neutral', children, dot, size = 'sm' }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 border rounded-xs font-medium tracking-wide',
      size === 'sm' ? 'text-[10px] uppercase px-1.5 py-0.5' : 'text-xs px-2 py-1',
      toneStyles[tone]
    )}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[tone])} />}
      {children}
    </span>
  );
}
