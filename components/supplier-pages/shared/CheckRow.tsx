import clsx from 'clsx';
import { RefreshCw } from 'lucide-react';

export type CheckStatus = 'pass' | 'fail' | 'pending';

export function CheckRow({ label, status, detail }: {
  label: string;
  status: CheckStatus;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-ink-700/30 last:border-0">
      <div className="shrink-0 text-base leading-none">
        {status === 'pass' ? '✅' : status === 'fail' ? '❌' : '🔄'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-ink-200">{label}</div>
        {detail && (
          <div className={clsx('text-[10px] mt-0.5',
            status === 'fail'    ? 'text-red-400'  :
            status === 'pending' ? 'text-ink-500'  : 'text-ink-400',
          )}>
            {detail}
          </div>
        )}
      </div>
      {status === 'pending' && (
        <span className="shrink-0 flex items-center gap-1 text-[10px] text-ink-500 border border-ink-700/60 bg-ink-800 px-2 py-0.5 rounded-xs">
          <RefreshCw className="w-2.5 h-2.5" />
          대기
        </span>
      )}
    </div>
  );
}
