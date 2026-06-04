import { RefreshCw } from 'lucide-react';

export function PendingBadgeBlock({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-ink-700/60 bg-ink-900/20 text-ink-500 text-[11px]">
      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
      <div>
        <span>{label}</span>
        {detail && <span className="text-[10px] text-ink-600 ml-2">— {detail}</span>}
      </div>
    </div>
  );
}
