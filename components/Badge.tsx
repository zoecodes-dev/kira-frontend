import clsx from 'clsx';

type BadgeTone = 'ok' | 'warn' | 'alert' | 'info' | 'neutral';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  dot?: boolean;
  size?: 'sm' | 'md';
}

const toneStyles: Record<BadgeTone, string> = {
  ok:      'bg-signal-ok/10 text-emerald-700 border-signal-ok/40',
  warn:    'bg-signal-warn/10 text-amber-700 border-signal-warn/40',
  alert:   'bg-signal-alert/10 text-red-700 border-signal-alert/40',
  info:    'bg-signal-info/10 text-blue-700 border-signal-info/40',
  neutral: 'bg-ink-800 text-ink-300 border-ink-700',
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
