'use client';

import { useParams } from 'next/navigation';
import {
  getCompleteness, getOriginCertificates, getCertifications, getFactories,
} from '@/lib/supplier-detail-data';
import clsx from 'clsx';
import { UflpaSection } from './sections/origin/UflpaSection';
import { EudrSection } from './sections/origin/EudrSection';
import { ConflictMineralsSection } from './sections/origin/ConflictMineralsSection';
import { CrmaSection } from './sections/origin/CrmaSection';

function Section({ title, accent, dot, children }: {
  title: string; accent: string; dot: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className={clsx('w-2 h-2 rounded-full shrink-0', dot)} />
        <h2 className={clsx('text-sm font-semibold', accent)}>{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function SupplierOriginPage() {
  const { id } = useParams<{ id: string }>();

  const completeness = getCompleteness(id);
  const certs        = getOriginCertificates(id);
  const certis       = getCertifications(id);
  const factories    = getFactories(id);
  const missing      = completeness?.missingFields ?? [];
  const hasMissing   = (keyword: string) => missing.some(m => m.includes(keyword));

  const uflpaCerts         = certs.filter(c => c.certType === 'UFLPA_REBUTTAL');
  const hasMineralTracking = !hasMissing('광물 추적 시스템');
  const eudrFactories      = factories.filter(f => f.applicableRegulations?.includes('EUDR'));
  const hasFsc             = certis.some(c => c.certName.includes('FSC') || c.certName.includes('EUDR'));
  const hasPolygon         = !hasMissing('광산 폴리곤 좌표');
  const conflictCerts      = certs.filter(c => c.certType === 'CONFLICT_FREE');
  const fscCerts           = certis.filter(c => c.certName.includes('FSC'));

  const countryMap: Record<string, number> = {};
  factories.forEach(f => {
    if (f.supplyRatioPercent) {
      countryMap[f.country] = (countryMap[f.country] ?? 0) + f.supplyRatioPercent;
    }
  });
  const countryEntries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      <Section title="UFLPA 반증 서류 현황" accent="text-amber-500" dot="bg-amber-500">
        <UflpaSection uflpaCerts={uflpaCerts} hasMineralTracking={hasMineralTracking} />
      </Section>
      <Section title="EUDR 좌표 제출 현황" accent="text-emerald-500" dot="bg-emerald-500">
        <EudrSection eudrFactories={eudrFactories} hasPolygon={hasPolygon} hasFsc={hasFsc} fscCerts={fscCerts} />
      </Section>
      <Section title="Conflict Minerals (분쟁광물) 현황" accent="text-red-400" dot="bg-red-500">
        <ConflictMineralsSection conflictCerts={conflictCerts} />
      </Section>
      <Section title="CRMA 국가별 공급 의존도" accent="text-violet-400" dot="bg-violet-500">
        <CrmaSection countryEntries={countryEntries} />
      </Section>
    </div>
  );
}
