import clsx from 'clsx';
import { AlertCircle } from 'lucide-react';
import { Section } from './InfoSection';
import type { getCompleteness } from '@/lib/supplier-detail-data';

type Completeness = NonNullable<ReturnType<typeof getCompleteness>>;

export function InfoCompletenessSection({ completeness }: { completeness: Completeness }) {
  return (
    <Section title="데이터 완성도" subtitle="필수 항목 충족률">
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1 h-3 bg-ink-700 rounded-xs overflow-hidden">
          <div
            className="h-full rounded-xs"
            style={{
              width: `${completeness.completionRate}%`,
              backgroundColor:
                completeness.completionRate >= 90 ? '#10B981' :
                completeness.completionRate >= 70 ? '#F59E0B' : '#EF4444',
            }}
          />
        </div>
        <span className={clsx('text-xl font-semibold num-mono',
          completeness.completionRate >= 90 ? 'text-emerald-600' :
          completeness.completionRate >= 70 ? 'text-amber-600' : 'text-red-600',
        )}>
          {completeness.completionRate}%
        </span>
        <span className="text-xs text-ink-400 num-mono">
          {completeness.filledFieldCount}/{completeness.requiredFieldCount}
        </span>
      </div>
      {completeness.missingFields.length > 0 && (
        <div className="space-y-1">
          {completeness.missingFields.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-600">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {f}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
