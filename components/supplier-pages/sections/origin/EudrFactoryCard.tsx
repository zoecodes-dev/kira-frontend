import type { Factory } from '@/lib/supplier-detail-data';
import { AlertCircle, CheckCircle2, MapPin } from 'lucide-react';
import { PendingBadgeBlock } from '../../shared/PendingBadgeBlock';

interface Props {
  factory: Factory;
  hasPolygon: boolean;
}

export function EudrFactoryCard({ factory: f, hasPolygon }: Props) {
  return (
    <div className="p-4 rounded-xs border border-ink-700/60 bg-ink-900/20 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold text-ink-100">{f.factoryName}</div>
          <div className="flex items-center gap-1.5 text-[10px] text-ink-500 mt-0.5">
            <MapPin className="w-3 h-3" />
            {f.country} · {f.region}
          </div>
        </div>
        <span className="text-[10px] text-ink-500 num-mono shrink-0">{f.factoryId}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xs border border-amber-700/30 bg-amber-500/8">
          <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
          <div>
            <div className="text-[10px] text-amber-500 font-medium">Point 좌표 제출됨</div>
            {f.coordinates && (
              <div className="text-[9px] text-ink-500 num-mono">
                {f.coordinates[1].toFixed(4)}, {f.coordinates[0].toFixed(4)}
              </div>
            )}
            <div className="text-[9px] text-amber-600/70 mt-0.5">폴리곤 아님 — EUDR 요건 미충족</div>
          </div>
        </div>

        {hasPolygon ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xs border border-emerald-700/30 bg-emerald-500/8">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            <div className="text-[10px] text-emerald-500 font-medium">폴리곤 좌표 제출됨</div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xs border border-red-700/30 bg-red-500/8">
            <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
            <div className="text-[10px] text-red-500 font-medium">폴리곤 좌표 미제출 ⚠</div>
          </div>
        )}

        <PendingBadgeBlock label="위성 이미지 검증" detail="AI 검증 대기 중" />
      </div>
    </div>
  );
}
