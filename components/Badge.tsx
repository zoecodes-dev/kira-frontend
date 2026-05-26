import clsx from 'clsx';

type BadgeTone = 'ok' | 'warn' | 'alert' | 'info' | 'neutral';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  dot?: boolean;
  size?: 'sm' | 'md';
}

const toneStyles: Record<BadgeTone, string> = {
  ok:      'bg-emerald-50 text-emerald-800 border-emerald-300',
  warn:    'bg-amber-50 text-amber-800 border-amber-300',
  alert:   'bg-red-50 text-red-800 border-red-300',
  info:    'bg-blue-50 text-blue-800 border-blue-300',
  neutral: 'bg-slate-50 text-slate-700 border-slate-300',
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
      'inline-flex items-center gap-1.5 border rounded-xs font-semibold tracking-normal whitespace-nowrap',
      size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
      toneStyles[tone]
    )}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[tone])} />}
      {children}
    </span>
  );
}
