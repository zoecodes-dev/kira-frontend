import type { TrainingMaterial } from '@/lib/supplier-detail-data';
import { BookOpen } from 'lucide-react';
import clsx from 'clsx';
import { categoryLabel, formatIcon } from './TrainingRecordCard';

interface Props {
  material: TrainingMaterial;
  isAssigned: boolean;
}

export function TrainingMaterialCard({ material: m, isAssigned }: Props) {
  const FmtIcon = formatIcon[m.format] ?? BookOpen;

  return (
    <div className={clsx(
      'p-3 rounded-xs border',
      isAssigned ? 'border-accent-700/30 bg-accent-500/5' : 'border-ink-700/60 bg-ink-900/20'
    )}>
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-xs bg-ink-700/50 flex items-center justify-center shrink-0">
          <FmtIcon className="w-3.5 h-3.5 text-ink-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <div className="text-xs font-medium text-ink-200 truncate">{m.title}</div>
              <div className="text-[10px] text-ink-500 num-mono mt-0.5">
                {m.durationMinutes}분 · {m.version} · {m.updatedAt.slice(0, 10)}
              </div>
            </div>
            {isAssigned && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-accent-700/20 border border-accent-700/30 text-accent-500 shrink-0">
                배정됨
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-400">
              {categoryLabel[m.category] ?? m.category}
            </span>
            {m.requiredFor.slice(0, 3).map(reg => (
              <span key={reg} className="text-[9px] px-1.5 py-0.5 rounded-xs bg-ink-700/50 text-ink-500">
                {reg}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
