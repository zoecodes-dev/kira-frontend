import type { OriginCertificate } from '@/lib/supplier-detail-data';
import { Globe } from 'lucide-react';
import clsx from 'clsx';
import { certStatusStyle, calcDaysLeft } from '../utils/originMeta';

interface Props {
  cert: OriginCertificate;
  label: string;
  labelColor: string;
  labelUppercase?: boolean;
  showOriginCountry?: boolean;
  originCountryPrefix?: boolean;
  originCountryBeforeDates?: boolean;
  cardClass?: string;
}

export function OriginCertCard({
  cert, label, labelColor, labelUppercase,
  showOriginCountry, originCountryPrefix, originCountryBeforeDates,
  cardClass,
}: Props) {
  const s        = certStatusStyle[cert.status];
  const daysLeft = calcDaysLeft(cert.expiresAt);

  const countrySpan = showOriginCountry ? (
    <span className="flex items-center gap-1">
      <Globe className="w-3 h-3" />
      {originCountryPrefix ? `원산지: ${cert.originCountry}` : cert.originCountry}
    </span>
  ) : null;

  return (
    <div className={clsx('p-4 rounded-xs border', cardClass ?? clsx(s.border, s.bg))}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('text-[10px] font-bold', labelUppercase && 'uppercase', labelColor)}>
              {label}
            </span>
            <span className="text-xs font-semibold text-ink-100 num-mono truncate">{cert.certNumber}</span>
          </div>
          <div className="text-[11px] text-ink-400">{cert.issuingAuthority}</div>
          <div className="flex items-center gap-3 text-[10px] text-ink-500 num-mono flex-wrap">
            {originCountryBeforeDates && countrySpan}
            <span>발급: {cert.issuedAt.slice(0, 10)}</span>
            <span>만료: {cert.expiresAt.slice(0, 10)}</span>
            {!originCountryBeforeDates && countrySpan}
          </div>
          {cert.coveredMinerals && cert.coveredMinerals.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-ink-500">적용 광물:</span>
              {cert.coveredMinerals.map(m => (
                <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-300">{m}</span>
              ))}
            </div>
          )}
        </div>
        <div className={clsx('text-sm font-bold num-mono shrink-0', s.text)}>
          {cert.status === 'expired'       ? '만료' :
           cert.status === 'expiring_soon' ? `${daysLeft}일 남음` :
           cert.status === 'under_review'  ? '검토 중' : '유효'}
        </div>
      </div>
    </div>
  );
}
