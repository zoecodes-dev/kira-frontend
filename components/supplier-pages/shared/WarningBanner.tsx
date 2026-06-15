import { AlertCircle } from 'lucide-react';

export function WarningBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-red-700/30 bg-red-500/8 text-red-500 text-[11px]">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {children}
    </div>
  );
}
