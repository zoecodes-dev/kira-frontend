import clsx from 'clsx';

export function Section({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-base font-bold text-ink-100">{title}</h2>
        {subtitle && <span className="text-xs text-ink-500">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

export function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 w-32 shrink-0 pt-0.5">{label}</div>
      <div className={clsx('text-xs text-ink-200 flex-1', mono && 'font-mono')}>{value || '—'}</div>
    </div>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-3 text-center">
      <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-semibold text-ink-100">{value}</div>
    </div>
  );
}
