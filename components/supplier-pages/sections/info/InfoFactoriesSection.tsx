import { Building2, MapPin, Calendar, Factory } from 'lucide-react';
import clsx from 'clsx';
import { Section } from './InfoSection';
import { regulationMeta, type Regulation, type getFactories } from '@/lib/supplier-detail-data';

type Factories = ReturnType<typeof getFactories>;

const roleLabel: Record<string, string> = {
  headquarters: '본사',
  production:   '생산 공장',
  processing:   '가공·정제',
  mining:       '광산',
  outsourcing:  '외주',
};

const destLabel: Record<string, string> = {
  EU: 'EU 납품', US: 'US 납품', BOTH: 'EU + US', KR: '국내',
};
const destColor: Record<string, string> = {
  EU:   'border-info-border bg-info-bg text-info-text',
  US:   'border-warn-border bg-warn-bg text-warn-text',
  BOTH: 'border-purple-700/30 bg-purple-500/8 text-purple-600',
  KR:   'border-ok-border bg-ok-bg text-ok-text',
};

export function InfoFactoriesSection({ factories, hq, production }: {
  factories: Factories;
  hq: Factories[number] | undefined;
  production: Factories;
}) {
  return (
    <Section title="공장·사업장" subtitle={`${factories.length}개소 · 납품처별 규제 차등`}>
      {hq && (
        <div className="mb-3 p-3 rounded-xs border border-info-border bg-info-bg">
          <div className="flex items-center gap-2 text-xs font-semibold text-info-text mb-1">
            <Building2 className="w-3.5 h-3.5" />
            본사 (Headquarters)
          </div>
          <div className="text-[11px] text-ink-300 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-ink-500 shrink-0" />
            {hq.address}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {production.map(f => (
          <div key={f.factoryId} className="p-4 rounded-xs border border-ink-700/60 bg-ink-900/20">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-semibold text-ink-100">{f.factoryName}</div>
                {f.factoryNameEn && f.factoryNameEn !== f.factoryName && (
                  <div className="text-[11px] text-ink-400">{f.factoryNameEn}</div>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-400">
                  {roleLabel[f.factoryRole] ?? f.factoryRole}
                </span>
                {f.destination && (
                  <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-xs border', destColor[f.destination])}>
                    {destLabel[f.destination]}
                  </span>
                )}
                {!f.isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-xs border border-alert-border text-alert-text">가동 중지</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
              <div className="flex items-start gap-1.5 text-ink-300">
                <MapPin className="w-3 h-3 text-ink-500 shrink-0 mt-0.5" />
                {f.address}
              </div>
              <div className="flex items-center gap-1.5 text-ink-400 num-mono">
                <Calendar className="w-3 h-3 text-ink-500 shrink-0" />
                {f.operatingPeriodFrom} ~ {f.operatingPeriodTo ?? '현재'}
              </div>
              {f.monthlyCapacity && (
                <div className="text-ink-400 num-mono">월 처리량: {f.monthlyCapacity}</div>
              )}
              {f.supplyRatioPercent !== undefined && f.supplyQuantity && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-ink-700 rounded-xs overflow-hidden max-w-[80px]">
                    <div className="h-full bg-accent-600" style={{ width: `${f.supplyRatioPercent}%` }} />
                  </div>
                  <span className="text-accent-500 font-semibold">{f.supplyRatioPercent}%</span>
                  <span className="text-ink-500">({f.supplyQuantity})</span>
                </div>
              )}
            </div>

            {f.applicableRegulations && f.applicableRegulations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-ink-700/40">
                <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-1.5">적용 규제</div>
                <div className="flex flex-wrap gap-1">
                  {f.applicableRegulations.map(reg => {
                    const m = regulationMeta[reg as Regulation];
                    if (!m) return null;
                    return (
                      <span key={reg} className={clsx(
                        'text-[9px] px-1.5 py-0.5 rounded-xs border font-medium',
                        m.color === 'emerald' && 'border-ok-border text-ok-text bg-ok-bg',
                        m.color === 'teal'    && 'border-teal-700/30 text-teal-600 bg-teal-500/5',
                        m.color === 'amber'   && 'border-warn-border text-warn-text bg-warn-bg',
                        m.color === 'orange'  && 'border-warn-border text-warn-text bg-warn-bg',
                        m.color === 'blue'    && 'border-info-border text-info-text bg-info-bg',
                        m.color === 'cyan'    && 'border-cyan-700/30 text-cyan-600 bg-cyan-500/5',
                        m.color === 'purple'  && 'border-purple-700/30 text-purple-600 bg-purple-500/5',
                        m.color === 'red'     && 'border-alert-border text-alert-text bg-alert-bg',
                        m.color === 'violet'  && 'border-violet-700/30 text-violet-600 bg-violet-500/5',
                        m.color === 'slate'   && 'border-slate-700/30 text-slate-600 bg-slate-500/5',
                      )}>
                        {m.label}
                      </span>
                    );
                  })}
                </div>
                {f.hiddenRegulations && f.hiddenRegulations.length > 0 && (
                  <div className="mt-1 text-[9px] text-ink-500">
                    숨김: {f.hiddenRegulations.map(r => regulationMeta[r as Regulation]?.label).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
