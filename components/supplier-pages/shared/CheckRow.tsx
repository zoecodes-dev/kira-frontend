import clsx from 'clsx';

export type CheckStatus = 'pass' | 'fail' | 'pending';

export const checkStatusMeta: Record<CheckStatus, { label: string; className: string }> = {
  pass: {
    label: '이행 완료',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700',
  },
  fail: {
    label: '미충족',
    className: 'border-red-500/40 bg-red-500/10 text-red-700',
  },
  pending: {
    label: '연동 대기',
    className: 'border-blue-500/40 bg-blue-500/10 text-blue-700',
  },
};

export function CheckRow({ label, status, detail }: {
  label: string;
  status: CheckStatus;
  detail?: string;
}) {
  const statusMeta = checkStatusMeta[status];

  return (
    <div className="flex items-center gap-3 py-2 border-b border-ink-700/30 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-ink-200">{label}</span>
          <span className={clsx('rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none', statusMeta.className)}>
            {statusMeta.label}
          </span>
        </div>
        {detail && (
          <div className={clsx('text-[10px] mt-0.5',
            status === 'fail'    ? 'text-red-400'  :
            status === 'pending' ? 'text-ink-500'  : 'text-ink-400',
          )}>
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}
