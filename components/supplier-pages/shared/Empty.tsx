import clsx from 'clsx';
import { CheckCircle2 } from 'lucide-react';

export function Empty({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className={clsx(
      'flex items-center justify-center gap-2 py-6 text-xs rounded-xs border border-dashed',
      ok ? 'border-emerald-700/30 text-emerald-600 bg-emerald-500/5' : 'border-ink-700/40 text-ink-500',
    )}>
      {ok && <CheckCircle2 className="w-4 h-4" />}
      {label}
    </div>
  );
}
