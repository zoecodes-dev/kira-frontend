'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  ApiError,
  getSupplier,
  getSupplierDetail,
  getSupplierEsg,
  getSupplierFactories,
  getSupplierReliability,
  getSupplierRiskProfile,
  type SupplierBrief,
  type SupplierDetail,
  type SupplierEsgResponse,
  type SupplierFactoriesResponse,
  type SupplierReliabilityResponse,
  type SupplierRiskProfileResponse,
  type ProviderType,
} from '@/lib/api';
import { SUPPLIER_NOW } from './utils/supplierNow';
import { InfoSummary } from './sections/info/InfoSummary';
import { InfoGeneralSection } from './sections/info/InfoGeneralSection';
import { InfoContactsSection } from './sections/info/InfoContactsSection';
import { InfoFactoriesSection } from './sections/info/InfoFactoriesSection';
import { InfoCertsSection } from './sections/info/InfoCertsSection';
import { InfoCompletenessSection } from './sections/info/InfoCompletenessSection';

const providerTypeLabel: Record<ProviderType, string> = {
  manufacturer: '제조사',
  recycler: '재활용',
  trader: '트레이더',
  miner: '광산', smelter: '제련소',
};

// API 상태코드(7종) → 기존 화면 모델의 4종 상태로 매핑
function toShortStatus(status: SupplierBrief['status']): 'verified' | 'pending' | 'review' | 'violation' {
  switch (status) {
    case 'supplier_verified': return 'verified';
    case 'supplier_review': return 'review';
    case 'supplier_violation':
    case 'supplier_suspended': return 'violation';
    default: return 'pending';
  }
}

function deriveCertStatus(expiresAt: string): 'active' | 'expiring_soon' | 'expired' {
  const exp = new Date(expiresAt).getTime();
  if (Number.isNaN(exp)) return 'active';
  const days = Math.ceil((exp - SUPPLIER_NOW.getTime()) / 86400000);
  if (days < 0) return 'expired';
  if (days < 60) return 'expiring_soon';
  return 'active';
}

// API 분리 응답(detail.*Detail) → 화면 CTI 모델로 합성
function mapCtiDetails(detail: SupplierDetail | null) {
  if (!detail) return null;
  if (detail.manufacturerDetail) {
    const d = detail.manufacturerDetail;
    return {
      providerType: 'manufacturer' as const,
      productionLine: d.productionLine ?? '',
      annualCapacity: d.annualCapacity ?? '',
      qualitySystem: d.qualitySystem ?? '',
      processTraceability: d.processTraceability ?? '',
    };
  }
  if (detail.recyclerDetail) {
    const d = detail.recyclerDetail;
    return {
      providerType: 'recycler' as const,
      recyclingMethod: d.recyclingMethod ?? '',
      annualRecoveredMaterial: d.annualRecoveredMaterial ?? '',
      wastePermitId: d.wastePermitId ?? '',
      recoveryRate: d.recoveryRate ?? 0,
    };
  }
  if (detail.traderDetail) {
    const d = detail.traderDetail;
    return {
      providerType: 'trader' as const,
      disclosureCompleteness: d.disclosureCompleteness ?? 0,
      disclosedUpstreamCount: d.disclosedUpstreamCount ?? 0,
      declaredMaterialScope: d.declaredMaterialScope ?? '',
      readinessInput: d.readinessInput ?? '',
    };
  }
  if (detail.minerDetail) {
    const d = detail.minerDetail;
    return {
      providerType: 'miner' as const,
      mineCoordinates:
        d.latitude != null && d.longitude != null
          ? ([d.latitude, d.longitude] as [number, number])
          : null,
      concessionId: d.concessionId ?? '',
      extractedMinerals: d.extractedMinerals ?? [],
      geoVerificationStatus: d.geoVerificationStatus ?? '',
    };
  }
  return null;
}

interface InfoData {
  brief: SupplierBrief;
  detail: SupplierDetail | null;
  factories: SupplierFactoriesResponse | null;
  reliability: SupplierReliabilityResponse | null;
  esg: SupplierEsgResponse | null;
  riskProfile: SupplierRiskProfileResponse | null;
}

export default function SupplierInfoPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const activeInfoTab = searchParams.get('tab') === 'general' ? 'general' : 'summary';

  const [data, setData] = useState<InfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const brief = await getSupplier(id);
        if (cancelled) return;
        // 나머지는 보조 — 실패해도 화면은 표시(빈 항목)
        const [detail, factories, reliability, esg, riskProfile] = await Promise.all([
          getSupplierDetail(id).catch(() => null),
          getSupplierFactories(id).catch(() => null),
          getSupplierReliability(id).catch(() => null),
          getSupplierEsg(id).catch(() => null),
          getSupplierRiskProfile(id).catch(() => null),
        ]);
        if (!cancelled) setData({ brief, detail, factories, reliability, esg, riskProfile });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError && err.status === 404
              ? '협력사를 찾을 수 없습니다'
              : '협력사 정보를 불러오지 못했습니다',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-xs text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        협력사 정보를 불러오는 중…
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-8 text-xs text-ink-500">{error ?? '협력사를 찾을 수 없습니다'}</div>;
  }

  const { brief, detail, factories: facRes, reliability, esg } = data;
  const feocStatus = detail?.feocStatus ?? reliability?.feocStatus ?? 'unknown';

  // ── 화면 모델 합성 (API에 없는 필드는 빈 값) ──
  const supplier = {
    id: brief.supplierId,
    name: brief.companyName,
    tier: 1 as const,
    tiers: [] as [],
    role: providerTypeLabel[brief.providerType] ?? brief.providerType,
    country: '',
    region: '',
    coordinates: [0, 0] as [number, number],
    status: toShortStatus(brief.status),
    risk: brief.riskLevel,
    material: [] as string[],
    parentIds: [] as string[],
    certifications: [] as string[],
    lastVerified: '',
    carbonIntensity: 0,
  };

  const name = {
    supplierId: brief.supplierId,
    nameEn: brief.companyName,
  };

  // 연락처·사업자정보·제조공정 API 미제공 → 빈 값
  const contacts: never[] = [];
  const ext = undefined;

  const factories = (facRes?.factories ?? []).map(f => ({
    factoryId: f.factoryId,
    supplierId: brief.supplierId,
    factoryName: f.factoryName,
    factoryNameEn: f.factoryNameEn ?? undefined,
    factoryRole: f.factoryRole,
    address: f.address,
    country: f.country,
    region: f.region,
    coordinates: [f.longitude ?? 0, f.latitude ?? 0] as [number, number],
    operatingPeriodFrom: f.operatingPeriodFrom,
    operatingPeriodTo: f.operatingPeriodTo,
    monthlyCapacity: f.monthlyCapacity ?? undefined,
    isActive: f.isActive,
    destination: f.destination ?? undefined,
    destinationDetail: f.destinationDetail ?? undefined,
    applicableRegulations: undefined,
    hiddenRegulations: undefined,
    supplyRatioPercent: f.supplyRatioPercent ?? undefined,
    supplyQuantity: f.supplyQuantity ?? undefined,
  }));

  const certs = (esg?.certifications ?? []).map(c => ({
    certId: c.certId,
    supplierId: brief.supplierId,
    certName: c.certificationType,
    issuingBody: c.issuingBody,
    certNumber: c.certificationNo,
    issuedAt: c.issuedAt,
    expiresAt: c.expiresAt,
    status: deriveCertStatus(c.expiresAt),
    documentUrl: c.documentUrl ?? undefined,
  }));

  // 완성도: reliability.completeness_score만 제공(세부 필드 카운트·누락항목은 API 없음)
  const completeness = {
    supplierId: brief.supplierId,
    requiredFieldCount: 0,
    filledFieldCount: 0,
    completionRate: reliability?.completenessScore ?? 0,
    missingFields: [] as string[],
    lastUpdatedAt: '',
  };

  const risk = {
    supplierId: brief.supplierId,
    overallRiskScore: data.riskProfile?.overallRiskScore ?? reliability?.overallRiskScore ?? 0,
    riskLevel: brief.riskLevel,
    feocStatus,
    isHighRiskFlag: reliability?.isHighRiskFlag ?? false,
    highRiskReasons: [] as string[],
    auditRecords: [] as never[],
    humanRightsIssues: [] as never[],
    industrialAccidents: [] as never[],
    lastRiskReviewAt: reliability?.lastRiskReviewAt ?? '',
  };

  const ctiDetails = mapCtiDetails(detail);

  const hq = factories.find(f => f.factoryRole === 'headquarters');
  const production = factories.filter(f => f.factoryRole !== 'headquarters');

  return (
    <div className="w-full space-y-8 p-8">
      {activeInfoTab === 'summary' ? (
        <InfoSummary
          supplier={supplier}
          name={name}
          contacts={contacts}
          factories={factories}
          certs={certs}
          completeness={completeness}
          risk={risk}
        />
      ) : (
        <>
          <InfoGeneralSection supplier={supplier} name={name} ext={ext} ctiDetails={ctiDetails} />
          <InfoContactsSection contacts={contacts} factories={factories} />
          <InfoFactoriesSection factories={factories} hq={hq} production={production} />
          <InfoCertsSection certs={certs} />
          <InfoCompletenessSection completeness={completeness} />
        </>
      )}
    </div>
  );
}
