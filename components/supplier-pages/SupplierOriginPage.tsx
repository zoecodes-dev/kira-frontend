'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import {
  ApiError,
  getSupplierFactories,
  type SupplierFactory,
} from '@/lib/api';
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

  const [factories, setFactories] = useState<SupplierFactory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getSupplierFactories(id);
        if (!cancelled) setFactories(res.factories ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError && err.status === 404
              ? '협력사를 찾을 수 없습니다'
              : '원산지·추적 데이터를 불러오지 못했습니다',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // 국가별 공급 의존도 — factories.supply_ratio_percent 합산 (CRMA, 유일하게 API 백킹)
  const countryMap: Record<string, number> = {};
  factories.forEach(f => {
    if (f.supplyRatioPercent) {
      countryMap[f.country] = (countryMap[f.country] ?? 0) + f.supplyRatioPercent;
    }
  });
  const countryEntries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]);

  // 아래 항목들은 현재 API 미제공(원산지증명서·완성도 누락항목·공장별 적용규제·FSC) → 빈/미검증 상태
  const uflpaCerts: never[] = [];
  const conflictCerts: never[] = [];
  const fscCerts: never[] = [];
  const eudrFactories: never[] = [];
  const hasMineralTracking = false;
  const hasPolygon = false;
  const hasFsc = false;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-xs text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        원산지·추적 데이터를 불러오는 중…
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-xs text-ink-500">{error}</div>;
  }

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
