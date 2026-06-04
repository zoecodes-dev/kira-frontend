import type { Factory, Certification } from '@/lib/supplier-detail-data';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { EudrFactoryCard } from './EudrFactoryCard';

interface Props {
  eudrFactories: Factory[];
  hasPolygon: boolean;
  hasFsc: boolean;
  fscCerts: Certification[];
}

export function EudrSection({ eudrFactories, hasPolygon, hasFsc, fscCerts }: Props) {
  return (
    <div className="space-y-3">
      {eudrFactories.length === 0 ? (
        <div className="py-6 text-center text-xs text-ink-500 border border-dashed border-ink-700/40 rounded-xs">
          EUDR 적용 공장 없음
        </div>
      ) : (
        <div className="space-y-3">
          {eudrFactories.map(f => (
            <EudrFactoryCard key={f.factoryId} factory={f} hasPolygon={hasPolygon} />
          ))}
        </div>
      )}
      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">FSC 인증 여부</div>
        {hasFsc ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-emerald-700/30 bg-emerald-500/8 text-emerald-500 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            FSC 인증 보유
            {fscCerts.map(c => (
              <span key={c.certId} className="text-[10px] text-emerald-600/80 num-mono">— {c.certNumber}</span>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-ink-700/60 bg-ink-900/20 text-ink-400 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            FSC 인증 미보유
          </div>
        )}
      </div>
    </div>
  );
}
