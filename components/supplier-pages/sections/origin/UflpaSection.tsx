import type { OriginCertificate } from '@/lib/supplier-detail-data';
import { CheckCircle2 } from 'lucide-react';
import { WarningBanner } from '../../shared/WarningBanner';
import { OriginCertCard } from '../../shared/OriginCertCard';
import { certStatusStyle } from '../../utils/originMeta';

interface Props {
  uflpaCerts: OriginCertificate[];
  hasMineralTracking: boolean;
}

export function UflpaSection({ uflpaCerts, hasMineralTracking }: Props) {
  return (
    <div className="space-y-3">
      {uflpaCerts.length === 0 && (
        <WarningBanner>UFLPA 반증 서류 미제출 — CBP 통관 시 강제노동 추정 적용</WarningBanner>
      )}
      {uflpaCerts.map(cert => {
        const s = certStatusStyle[cert.status];
        return (
          <OriginCertCard
            key={cert.certId}
            cert={cert}
            label={s.label}
            labelColor={s.text}
            labelUppercase
            showOriginCountry
          />
        );
      })}
      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">N차 추적성 상태</div>
        {hasMineralTracking ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-emerald-700/30 bg-emerald-500/8 text-emerald-500 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            광물 추적 시스템 등록됨
          </div>
        ) : (
          <WarningBanner>광물 추적 시스템 미구축 — N차 추적성 보장 불가</WarningBanner>
        )}
      </div>
    </div>
  );
}
