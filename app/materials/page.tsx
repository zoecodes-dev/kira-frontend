'use client';

// 자재별 BOM 버전과 공급망 변경 이력을 추적하는 화면
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import {
  parts, purchaseOrders, getSupplierName,
} from '@/lib/supplier-detail-data';
import { ArrowUpRight, GitBranch, PackageSearch } from 'lucide-react';
import clsx from 'clsx';

type VersionStatus = 'active' | 'current' | 'archived';
type RegulationResult = 'PASS' | 'REVIEW' | 'RECHECK REQUIRED' | 'WARNING';

interface BomVersion {
  version: string;
  effectiveMonth: string;
  status: VersionStatus;
  sources: string[];
  origins: string[];
  poNumbers: string[];
  appliedProducts: {
    productName: string;
    startDate: string;
    endDate: string;
    bomVersion: string;
  }[];
  regulations: {
    code: string;
    result: RegulationResult;
    reason: string;
  }[];
  events: {
    date: string;
    title: string;
    detail: string;
  }[];
}

interface MaterialVersionProfile {
  partId: string;
  currentVersion: string;
  activeVersionCount: number;
  appliedProductCount: number;
  sourceCount: number;
  regulationImpactCount: number;
  versions: BomVersion[];
  comparisons: {
    label: string;
    addedSources: string[];
    removedSources: string[];
    originChange: string;
    regulationImpact: string;
  }[];
}

const materialVersionProfiles: MaterialVersionProfile[] = [
  {
    partId: 'PRT-005',
    currentVersion: 'v3',
    activeVersionCount: 3,
    appliedProductCount: 12,
    sourceCount: 8,
    regulationImpactCount: 2,
    versions: [
      {
        version: 'v1',
        effectiveMonth: '2025-03',
        status: 'active',
        sources: ['POS Cathode Materials', 'Quzhou Precursor'],
        origins: ['KR', 'CN'],
        poNumbers: ['PO-001', 'PO-004'],
        appliedProducts: [
          { productName: 'BMW i4', startDate: '2025-03-01', endDate: '2025-07-31', bomVersion: 'v1' },
          { productName: 'BMW iX3', startDate: '2025-04-10', endDate: '2025-08-15', bomVersion: 'v1' },
        ],
        regulations: [
          { code: 'EU Battery', result: 'PASS', reason: '기준 공급원 유지' },
          { code: 'Conflict Minerals', result: 'PASS', reason: '코발트 원산지 KR/CN 체계 확인' },
          { code: 'FEOC', result: 'PASS', reason: '직접 지분 이슈 없음' },
        ],
        events: [
          { date: '2025-03', title: 'BOM v1 생성', detail: 'NCM811 양극재 최초 운영 BOM 등록' },
          { date: '2025-04', title: 'BMW iX3 적용', detail: '초기 양산 제품에 v1 적용 시작' },
        ],
      },
      {
        version: 'v2',
        effectiveMonth: '2025-08',
        status: 'active',
        sources: ['POS Cathode Materials', 'Quzhou Precursor', 'DRC Mining'],
        origins: ['KR', 'CD', 'CN'],
        poNumbers: ['PO-001', 'PO-008', 'PO-021'],
        appliedProducts: [
          { productName: 'BMW i4', startDate: '2025-08-01', endDate: '2026-01-31', bomVersion: 'v2' },
          { productName: 'BMW iX3', startDate: '2025-08-16', endDate: '2026-02-15', bomVersion: 'v2' },
          { productName: 'Mercedes EQS', startDate: '2025-10-01', endDate: '2026-02-28', bomVersion: 'v2' },
        ],
        regulations: [
          { code: 'EU Battery', result: 'PASS', reason: '재활용 함량 증빙 유지' },
          { code: 'Conflict Minerals', result: 'REVIEW', reason: '신규 DRC 공급원 추가' },
          { code: 'FEOC', result: 'RECHECK REQUIRED', reason: '중국 정제 공급원 병행 사용' },
        ],
        events: [
          { date: '2025-08', title: 'BOM v2 생성', detail: 'DRC Mining 공급원 추가' },
          { date: '2025-08', title: 'DRC Mining 추가', detail: '코발트 원산지 CD가 공급망에 포함' },
          { date: '2025-09', title: 'Conflict Minerals 재검토', detail: '분쟁광물 원산지 증빙 재검토 요청' },
        ],
      },
      {
        version: 'v3',
        effectiveMonth: '2026-02',
        status: 'current',
        sources: ['POS Cathode Materials', 'Quzhou Precursor', 'Katanga Mining', 'Ganzhou Rare'],
        origins: ['KR', 'CD', 'CN'],
        poNumbers: ['PO-026', 'PO-031', 'PO-044'],
        appliedProducts: [
          { productName: 'BMW i4', startDate: '2026-02-01', endDate: '-', bomVersion: 'v3' },
          { productName: 'BMW iX3', startDate: '2026-02-16', endDate: '-', bomVersion: 'v3' },
          { productName: 'Mercedes EQS', startDate: '2026-03-01', endDate: '-', bomVersion: 'v3' },
          { productName: 'Premium NCM811 100Ah', startDate: '2026-02-20', endDate: '-', bomVersion: 'v3' },
        ],
        regulations: [
          { code: 'EU Battery', result: 'PASS', reason: 'DPP 필수 물질 정보 충족' },
          { code: 'Conflict Minerals', result: 'REVIEW', reason: 'Katanga 원산지 증빙 보완 필요' },
          { code: 'FEOC', result: 'RECHECK REQUIRED', reason: 'Ganzhou Rare 소유 구조 확인 필요' },
        ],
        events: [
          { date: '2026-02', title: 'BOM v3 승인', detail: 'Katanga Mining과 Ganzhou Rare 공급원 반영' },
          { date: '2026-02', title: 'PO-044 연결', detail: '신규 정제 공급원 PO를 BOM v3에 연결' },
          { date: '2026-03', title: 'FEOC 재확인', detail: '중국 공급원 지분 구조 검토로 전환' },
        ],
      },
    ],
    comparisons: [
      { label: 'v1 ↔ v2', addedSources: ['DRC Mining'], removedSources: ['없음'], originChange: 'KR / CN → KR / CD / CN', regulationImpact: 'Conflict Minerals 재검토 필요' },
      { label: 'v2 ↔ v3', addedSources: ['Katanga Mining', 'Ganzhou Rare'], removedSources: ['DRC Mining'], originChange: 'KR / CD / CN → KR / CD / CN', regulationImpact: 'FEOC 재확인 필요' },
    ],
  },
  {
    partId: 'PRT-007',
    currentVersion: 'v2',
    activeVersionCount: 2,
    appliedProductCount: 8,
    sourceCount: 5,
    regulationImpactCount: 3,
    versions: [
      {
        version: 'v1',
        effectiveMonth: '2025-05',
        status: 'active',
        sources: ['Quzhou Precursor', 'Sulawesi Nickel'],
        origins: ['CN', 'ID'],
        poNumbers: ['PO-011', 'PO-015'],
        appliedProducts: [
          { productName: 'BMW i4 Module', startDate: '2025-05-01', endDate: '2026-01-15', bomVersion: 'v1' },
          { productName: 'Mercedes EQS', startDate: '2025-06-01', endDate: '2026-01-31', bomVersion: 'v1' },
        ],
        regulations: [
          { code: 'EU Battery', result: 'PASS', reason: '전구체 구성 정보 확인' },
          { code: 'FEOC', result: 'REVIEW', reason: '중국 공급원 포함' },
          { code: 'CRMA', result: 'WARNING', reason: '단일 국가 의존도 높음' },
        ],
        events: [
          { date: '2025-05', title: 'BOM v1 생성', detail: 'NCM 전구체 공급망 최초 등록' },
          { date: '2025-06', title: 'Sulawesi Nickel 연결', detail: '니켈 원광 공급원을 v1에 연결' },
        ],
      },
      {
        version: 'v2',
        effectiveMonth: '2026-01',
        status: 'current',
        sources: ['Quzhou Precursor', 'Sulawesi Nickel', 'Ganzhou Rare'],
        origins: ['CN', 'ID'],
        poNumbers: ['PO-030', 'PO-036', 'PO-039'],
        appliedProducts: [
          { productName: 'BMW i4 Module', startDate: '2026-01-16', endDate: '-', bomVersion: 'v2' },
          { productName: 'Pouch Cell NMC 811 100Ah', startDate: '2026-02-01', endDate: '-', bomVersion: 'v2' },
        ],
        regulations: [
          { code: 'EU Battery', result: 'PASS', reason: '필수 전구체 정보 유지' },
          { code: 'FEOC', result: 'RECHECK REQUIRED', reason: 'Ganzhou Rare 추가' },
          { code: 'UFLPA', result: 'REVIEW', reason: '원료 추적 보고서 보완 필요' },
        ],
        events: [
          { date: '2026-01', title: 'BOM v2 승인', detail: '코발트 정제 공급원 변경 반영' },
          { date: '2026-01', title: 'FEOC 재검토', detail: 'Ganzhou Rare 공급원 추가에 따른 재판정' },
        ],
      },
    ],
    comparisons: [
      { label: 'v1 ↔ v2', addedSources: ['Ganzhou Rare'], removedSources: ['없음'], originChange: 'CN / ID → CN / ID', regulationImpact: 'FEOC 재확인 필요' },
    ],
  },
  {
    partId: 'PRT-008',
    currentVersion: 'v2',
    activeVersionCount: 2,
    appliedProductCount: 6,
    sourceCount: 4,
    regulationImpactCount: 1,
    versions: [
      {
        version: 'v1',
        effectiveMonth: '2025-04',
        status: 'active',
        sources: ['Sulawesi Nickel Mine'],
        origins: ['ID'],
        poNumbers: ['PO-006'],
        appliedProducts: [
          { productName: 'BMW iX3', startDate: '2025-04-01', endDate: '2025-12-31', bomVersion: 'v1' },
        ],
        regulations: [
          { code: 'EU Battery', result: 'PASS', reason: '광산 좌표 제출' },
          { code: 'EUDR', result: 'PASS', reason: '산림 훼손 고위험 좌표 아님' },
        ],
        events: [
          { date: '2025-04', title: 'BOM v1 생성', detail: '니켈 원광 단일 공급원 등록' },
        ],
      },
      {
        version: 'v2',
        effectiveMonth: '2026-01',
        status: 'current',
        sources: ['Sulawesi Nickel Mine', 'Pilbara International Works'],
        origins: ['ID', 'AU'],
        poNumbers: ['PO-027', 'PO-035'],
        appliedProducts: [
          { productName: 'BMW iX3', startDate: '2026-01-01', endDate: '-', bomVersion: 'v2' },
          { productName: 'Premium NCM811 100Ah', startDate: '2026-02-01', endDate: '-', bomVersion: 'v2' },
        ],
        regulations: [
          { code: 'EU Battery', result: 'PASS', reason: '광산 좌표 유지' },
          { code: 'CRMA', result: 'REVIEW', reason: '신규 원산지 AU 공급비율 검토' },
        ],
        events: [
          { date: '2026-01', title: 'BOM v2 생성', detail: '호주 공급원 보조 공급망 추가' },
          { date: '2026-02', title: 'CRMA 검토', detail: '전략 원자재 공급비율 재계산' },
        ],
      },
    ],
    comparisons: [
      { label: 'v1 ↔ v2', addedSources: ['Pilbara International Works'], removedSources: ['없음'], originChange: 'ID → ID / AU', regulationImpact: 'CRMA 공급비율 검토' },
    ],
  },
  {
    partId: 'PRT-009',
    currentVersion: 'v3',
    activeVersionCount: 3,
    appliedProductCount: 10,
    sourceCount: 6,
    regulationImpactCount: 3,
    versions: [
      {
        version: 'v1',
        effectiveMonth: '2025-03',
        status: 'archived',
        sources: ['Katanga Mining'],
        origins: ['CD'],
        poNumbers: ['PO-003'],
        appliedProducts: [
          { productName: 'BMW i4', startDate: '2025-03-01', endDate: '2025-08-31', bomVersion: 'v1' },
        ],
        regulations: [
          { code: 'Conflict Minerals', result: 'REVIEW', reason: '분쟁광물 증빙 필요' },
          { code: 'CSDDD', result: 'REVIEW', reason: '아동노동 감사 보고서 요청' },
        ],
        events: [
          { date: '2025-03', title: 'BOM v1 생성', detail: 'Katanga 단일 공급원 기준 등록' },
        ],
      },
      {
        version: 'v2',
        effectiveMonth: '2025-09',
        status: 'active',
        sources: ['Katanga Mining', 'DRC Mining'],
        origins: ['CD'],
        poNumbers: ['PO-018', 'PO-021'],
        appliedProducts: [
          { productName: 'BMW i4', startDate: '2025-09-01', endDate: '2026-01-31', bomVersion: 'v2' },
          { productName: 'BMW iX3', startDate: '2025-09-15', endDate: '2026-02-28', bomVersion: 'v2' },
        ],
        regulations: [
          { code: 'Conflict Minerals', result: 'REVIEW', reason: 'DRC Mining 추가' },
          { code: 'CSDDD', result: 'REVIEW', reason: '현장 감사 보고서 미제출' },
          { code: 'EU Battery', result: 'REVIEW', reason: '실사 문서 부족' },
        ],
        events: [
          { date: '2025-09', title: 'DRC Mining 추가', detail: '공급 안정성 확보 목적 공급원 추가' },
          { date: '2025-10', title: 'CSDDD 실사 요청', detail: '아동노동 감사 보고서 보완 요청' },
        ],
      },
      {
        version: 'v3',
        effectiveMonth: '2026-02',
        status: 'current',
        sources: ['Katanga Mining', 'DRC Mining', 'Ganzhou Rare'],
        origins: ['CD', 'CN'],
        poNumbers: ['PO-033', 'PO-041', 'PO-046'],
        appliedProducts: [
          { productName: 'BMW iX3', startDate: '2026-03-01', endDate: '-', bomVersion: 'v3' },
          { productName: 'Mercedes EQS', startDate: '2026-03-01', endDate: '-', bomVersion: 'v3' },
        ],
        regulations: [
          { code: 'Conflict Minerals', result: 'REVIEW', reason: 'CD/CN 복수 원산지 운영' },
          { code: 'CSDDD', result: 'REVIEW', reason: '실사 문서 일부 미제출' },
          { code: 'FEOC', result: 'RECHECK REQUIRED', reason: 'Ganzhou Rare 정제 연계' },
        ],
        events: [
          { date: '2026-02', title: 'BOM v3 승인', detail: '중국 정제 공급원을 포함한 복수 공급원 운영' },
          { date: '2026-03', title: 'FEOC 재점검', detail: '정제 공급원 소유 구조 확인 필요' },
        ],
      },
    ],
    comparisons: [
      { label: 'v1 ↔ v2', addedSources: ['DRC Mining'], removedSources: ['없음'], originChange: 'CD → CD', regulationImpact: 'CSDDD 실사 요청' },
      { label: 'v2 ↔ v3', addedSources: ['Ganzhou Rare'], removedSources: ['없음'], originChange: 'CD → CD / CN', regulationImpact: 'FEOC 재점검 필요' },
    ],
  },
  {
    partId: 'PRT-010',
    currentVersion: 'v2',
    activeVersionCount: 2,
    appliedProductCount: 7,
    sourceCount: 4,
    regulationImpactCount: 1,
    versions: [
      {
        version: 'v1',
        effectiveMonth: '2025-06',
        status: 'active',
        sources: ['Pohang Refining Works'],
        origins: ['AU'],
        poNumbers: ['PO-014'],
        appliedProducts: [
          { productName: 'LFP Power 120Ah', startDate: '2025-06-01', endDate: '2026-01-31', bomVersion: 'v1' },
        ],
        regulations: [
          { code: 'EU Battery', result: 'PASS', reason: '탄소·원산지 증빙 제출' },
          { code: 'CRMA', result: 'PASS', reason: '호주 원산지 확인' },
        ],
        events: [
          { date: '2025-06', title: 'BOM v1 생성', detail: '리튬 원광 공급원 등록' },
        ],
      },
      {
        version: 'v2',
        effectiveMonth: '2026-02',
        status: 'current',
        sources: ['Pohang Refining Works', 'Pilbara International Works'],
        origins: ['AU'],
        poNumbers: ['PO-038', 'PO-049'],
        appliedProducts: [
          { productName: 'LFP Power 120Ah', startDate: '2026-02-01', endDate: '-', bomVersion: 'v2' },
          { productName: 'Premium NCM811 100Ah', startDate: '2026-02-15', endDate: '-', bomVersion: 'v2' },
        ],
        regulations: [
          { code: 'EU Battery', result: 'PASS', reason: '공급원 이원화 후 증빙 유지' },
          { code: 'CRMA', result: 'REVIEW', reason: 'Pilbara 신규 공급원 등록' },
        ],
        events: [
          { date: '2026-02', title: 'BOM v2 승인', detail: 'Pilbara 공급원 추가' },
          { date: '2026-02', title: 'CRMA 검토', detail: '전략 원자재 공급원 다변화 검토' },
        ],
      },
    ],
    comparisons: [
      { label: 'v1 ↔ v2', addedSources: ['Pilbara International Works'], removedSources: ['없음'], originChange: 'AU → AU', regulationImpact: 'CRMA 신규 공급원 검토' },
    ],
  },
];

const statusMeta: Record<VersionStatus, { label: string; tone: 'ok' | 'info' | 'neutral' }> = {
  active: { label: '활성', tone: 'info' },
  current: { label: '현재', tone: 'ok' },
  archived: { label: '보관', tone: 'neutral' },
};

const regulationTone: Record<RegulationResult, 'ok' | 'warn' | 'alert' | 'info'> = {
  PASS: 'ok',
  REVIEW: 'info',
  'RECHECK REQUIRED': 'alert',
  WARNING: 'warn',
};

const regulationToneClasses: Record<RegulationResult, string> = {
  PASS: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  REVIEW: 'border-blue-300 bg-blue-50 text-blue-800',
  'RECHECK REQUIRED': 'border-red-300 bg-red-50 text-red-800',
  WARNING: 'border-amber-300 bg-amber-50 text-amber-800',
};

const versionReason: Record<string, string> = {
  v1: '초기 등록',
  v2: '신규 광산 추가',
  v3: '공급원 변경',
};

const versionDppStatus: Record<string, string> = {
  v1: '이력 보관',
  v2: '전환 중',
  v3: '발행 반영',
};

export default function MaterialsPage() {
  const [selectedPartId, setSelectedPartId] = useState(materialVersionProfiles[0].partId);
  const selectedProfile = materialVersionProfiles.find(item => item.partId === selectedPartId) ?? materialVersionProfiles[0];
  const [selectedVersion, setSelectedVersion] = useState(selectedProfile.currentVersion);
  const selectedPart = parts.find(part => part.id === selectedProfile.partId);
  const selectedBom = selectedProfile.versions.find(version => version.version === selectedVersion)
    ?? selectedProfile.versions.find(version => version.version === selectedProfile.currentVersion)
    ?? selectedProfile.versions[0];

  useEffect(() => {
    if (!selectedProfile.versions.some(version => version.version === selectedVersion)) {
      setSelectedVersion(selectedProfile.currentVersion);
    }
  }, [selectedProfile.currentVersion, selectedProfile.partId, selectedProfile.versions, selectedVersion]);

  const selectedComparison = selectedProfile.comparisons.find(comparison => comparison.label.endsWith(selectedBom.version))
    ?? selectedProfile.comparisons[selectedProfile.comparisons.length - 1];
  const currentBom = selectedProfile.versions.find(version => version.version === selectedProfile.currentVersion) ?? selectedBom;
  const currentRegulationImpact = currentBom.regulations.find(regulation => regulation.result !== 'PASS')?.code ?? '없음';
  const currentStartDate = currentBom.appliedProducts[0]?.startDate ?? currentBom.effectiveMonth;
  const impactSummary = {
    addedSources: selectedComparison?.addedSources.filter(source => source !== '없음').length ?? 0,
    removedSources: selectedComparison?.removedSources.filter(source => source !== '없음').length ?? 0,
    originChanges: selectedComparison && selectedComparison.originChange.split('→')[0]?.trim() !== selectedComparison.originChange.split('→')[1]?.trim() ? 1 : 0,
    regulationReviews: selectedBom.regulations.filter(regulation => regulation.result !== 'PASS').length,
    impactedProducts: selectedBom.appliedProducts.length,
  };

  const stats = useMemo(() => ({
    versions: materialVersionProfiles.reduce((sum, item) => sum + item.versions.length, 0),
    current: materialVersionProfiles.length,
    impacts: materialVersionProfiles.reduce((sum, item) => sum + item.regulationImpactCount, 0),
    sources: materialVersionProfiles.reduce((sum, item) => sum + item.sourceCount, 0),
  }), []);

  return (
    <>
      <PageHeader
        title="자재/BOM 버전 관리"
        description="자재별 BOM 버전, 공급원 변경, 원산지 변경, 규제 영향을 추적합니다."
        badge="Supply Change Hub"
      />

      <div className="space-y-5 p-6">
        <section className="rounded-sm border border-ink-700 bg-white px-5 py-4 shadow-control">
          <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_repeat(4,minmax(120px,auto))]">
            <div>
              <div className="text-xs font-semibold text-ink-500">운영 요약</div>
              <h2 className="mt-1 text-lg font-semibold text-ink-100">BOM 버전 및 공급망 변경 현황</h2>
            </div>
            <Summary label="관리 버전" value={stats.versions} unit="개" />
            <Summary label="현재 BOM" value={stats.current} unit="개" />
            <Summary label="규제 영향" value={stats.impacts} unit="건" />
            <Summary label="관련 공급원" value={stats.sources} unit="개" />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control lg:sticky lg:top-[112px]">
            <div className="border-b border-ink-700 px-5 py-4">
              <h2 className="text-sm font-semibold text-ink-100">자재 목록</h2>
              <p className="mt-1 text-xs text-ink-500">BOM 버전 변경 추적 대상</p>
            </div>
            <div className="divide-y divide-ink-700">
              {materialVersionProfiles.map(profile => {
                const part = parts.find(item => item.id === profile.partId);
                const active = selectedPartId === profile.partId;
                return (
                  <button
                    key={profile.partId}
                    type="button"
                    onClick={() => {
                      setSelectedPartId(profile.partId);
                      setSelectedVersion(profile.currentVersion);
                    }}
                    className={clsx(
                      'w-full px-5 py-4 text-left transition-colors',
                      active ? 'bg-accent-50' : 'bg-white hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink-100">{part?.partName ?? profile.partId}</div>
                        <div className="mt-1 text-xs text-ink-500">{part?.partCode} · 현재 {profile.currentVersion}</div>
                      </div>
                      <Badge tone={profile.regulationImpactCount > 1 ? 'warn' : 'ok'}>{profile.regulationImpactCount}건</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-ink-500">
                      <span>{profile.activeVersionCount} 버전</span>
                      <span>{profile.appliedProductCount} 제품</span>
                      <span>{profile.sourceCount} 공급원</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-5 min-w-0">
            <section className="rounded-sm border border-ink-700 bg-white shadow-control">
              <div className="border-b border-ink-700 px-5 py-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                      <PackageSearch className="h-4 w-4" />
                      {selectedPart?.partCode ?? selectedProfile.partId}
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-ink-100">{selectedPart?.partName ?? selectedProfile.partId}</h2>
                    <p className="mt-1 text-sm text-ink-500">이 자재의 공급망이 어떤 BOM 버전에서 어떻게 바뀌었는지 추적합니다.</p>
                  </div>
                  <div className="rounded-xs border border-accent-200 bg-accent-50 px-4 py-3">
                    <div className="text-xs font-semibold text-accent-800">현재 운영 버전</div>
                    <div className="mt-1 text-2xl font-bold text-accent-900 num-mono">{currentBom.version}</div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <CurrentSummary label="변경 사유" value={versionReason[currentBom.version] ?? '공급망 변경'} />
                      <CurrentSummary label="영향 규제" value={currentRegulationImpact} />
                      <CurrentSummary label="영향 제품" value={`${currentBom.appliedProducts.length}개`} />
                      <CurrentSummary label="적용 시작일" value={currentStartDate} mono />
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-5">
                  <InlineMetric label="현재 운영 버전" value={selectedProfile.currentVersion} />
                  <InlineMetric label="활성 버전 수" value={`${selectedProfile.activeVersionCount}개`} />
                  <InlineMetric label="적용 제품" value={`${selectedProfile.appliedProductCount}개`} />
                  <InlineMetric label="관련 공급원" value={`${selectedProfile.sourceCount}개`} />
                  <InlineMetric label="규제 영향" value={`${selectedProfile.regulationImpactCount}건`} />
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="mb-3 flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-accent-700" />
                  <h3 className="text-sm font-semibold text-ink-100">BOM 버전 타임라인</h3>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {selectedProfile.versions.map(version => {
                    const active = selectedBom.version === version.version;
                    return (
                      <button
                        key={version.version}
                        type="button"
                        onClick={() => setSelectedVersion(version.version)}
                        className={clsx(
                          'min-w-[160px] rounded-xs border px-4 py-3 text-left transition-colors',
                          active ? 'border-accent-600 bg-accent-50' : 'border-ink-700 bg-white hover:bg-slate-50',
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-base font-bold text-ink-100 num-mono">{version.version}</span>
                          <Badge tone={statusMeta[version.status].tone}>{statusMeta[version.status].label}</Badge>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-ink-500 num-mono">{version.effectiveMonth}</div>
                        <div className="mt-1 text-xs font-semibold text-ink-500">{versionReason[version.version] ?? '공급망 변경'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
              <div className="rounded-sm border border-ink-700 bg-white shadow-control">
                <PanelTitle title={`BOM ${selectedBom.version} 공급원 정보`} subtitle="선택 버전 기준 공급원, 원산지, 관련 PO" />
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-ink-700 bg-slate-50">
                      <tr>
                        {['공급원', '원산지', '관련 PO'].map(header => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-700/60">
                      {selectedBom.sources.map((source, index) => (
                        <tr key={`${source}-${index}`} className="hover:bg-slate-50">
                          <td className="px-2.5 py-2.5 text-sm font-semibold text-ink-100">{source}</td>
                          <td className="px-2.5 py-2.5 text-sm text-ink-500 num-mono">{selectedBom.origins[index] ?? selectedBom.origins[selectedBom.origins.length - 1] ?? '-'}</td>
                          <td className="px-2.5 py-2.5 text-sm font-semibold text-ink-100 num-mono">{selectedBom.poNumbers[index] ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-ink-700 bg-slate-50 px-4 py-3">
                  <Link
                    href={`/supply-chain/product-map?material=${encodeURIComponent(selectedPart?.partName ?? selectedProfile.partId)}&bom=${selectedBom.version}`}
                    className="inline-flex items-center gap-1.5 rounded-xs border border-accent-600 bg-white px-3 py-2 text-sm font-semibold text-accent-700 hover:bg-accent-50"
                  >
                    공급망 맵 보기
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="rounded-sm border border-ink-700 bg-white shadow-control">
                <PanelTitle title="버전 비교" subtitle="직전 운영 버전 대비 공급망 변경" />
                {selectedComparison ? (
                  <div className="grid gap-4 p-4 xl:grid-cols-[1fr_0.9fr]">
                    <div className="space-y-3">
                      <div className="text-sm font-bold text-ink-100 num-mono">{selectedComparison.label}</div>
                      <CompareRow label="추가 공급원" values={selectedComparison.addedSources} prefix="+" tone="ok" />
                      <CompareRow label="삭제 공급원" values={selectedComparison.removedSources} prefix="-" tone="alert" />
                      <DetailLine label="원산지 변경" value={selectedComparison.originChange} />
                      <DetailLine label="규제 영향" value={selectedComparison.regulationImpact} emphasis />
                    </div>
                    <div className="rounded-xs border border-ink-700 bg-slate-50 p-3">
                      <div className="mb-2 text-xs font-semibold text-ink-500">{selectedComparison.label.replace('↔', '→')} 영향도</div>
                      <ImpactLine label="추가 공급원" value={`${impactSummary.addedSources}개`} />
                      <ImpactLine label="삭제 공급원" value={`${impactSummary.removedSources}개`} />
                      <ImpactLine label="원산지 변경" value={`${impactSummary.originChanges}건`} />
                      <ImpactLine label="규제 재검토" value={`${impactSummary.regulationReviews}건`} />
                      <ImpactLine label="영향 제품" value={`${impactSummary.impactedProducts}개`} />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-sm text-ink-500">비교 가능한 이전 버전이 없습니다.</div>
                )}
              </div>
            </section>

            <section className="rounded-sm border border-ink-700 bg-white shadow-control">
              <PanelTitle title="적용 제품" subtitle={`BOM ${selectedBom.version}이 사용되는 제품 목록`} />
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-ink-700 bg-slate-50">
                    <tr>
                      {['제품명', '적용 시작일', '적용 종료일', '사용 BOM 버전', 'DPP 상태'].map(header => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-700/60">
                    {selectedBom.appliedProducts.map(product => (
                      <tr key={`${product.productName}-${product.startDate}`} className="hover:bg-slate-50">
                        <td className="px-2.5 py-2.5 text-sm font-semibold text-ink-100">{product.productName}</td>
                        <td className="px-2.5 py-2.5 text-sm text-ink-500 num-mono">{product.startDate}</td>
                        <td className="px-2.5 py-2.5 text-sm text-ink-500 num-mono">{product.endDate}</td>
                        <td className="px-2.5 py-2.5 text-sm font-semibold text-accent-700 num-mono">{product.bomVersion}</td>
                        <td className="px-2.5 py-2.5 text-sm font-semibold text-ink-500">{versionDppStatus[product.bomVersion] ?? '검토 중'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
              <div className="rounded-sm border border-ink-700 bg-white shadow-control">
                <PanelTitle title="규제 영향 분석" subtitle={`BOM ${selectedBom.version} 기준 판정`} />
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead className="border-b border-ink-700 bg-slate-50">
                      <tr>
                        <TableHead className="w-[48%]">규제</TableHead>
                        <TableHead className="break-words">근거</TableHead>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-700/60">
                      {selectedBom.regulations.map(regulation => (
                        <tr key={regulation.code}>
                          <td className="px-2 py-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold break-words text-ink-100">{regulation.code}</span>
                              <span className={clsx(
                                'inline-flex max-w-full break-all rounded-xs border px-1.5 py-0.5 text-center text-[10px] font-semibold leading-3',
                                regulationToneClasses[regulation.result]
                              )}>
                                {regulation.result}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="text-[11px] leading-4 text-ink-500">
                              {regulation.reason}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-sm border border-ink-700 bg-white shadow-control">
                <PanelTitle title="공급망 변경 이력" subtitle="변경 일시, 유형, 대상, 내용, 영향 규제" />
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-ink-700 bg-slate-50">
                      <tr>
                        {['변경 일시', '변경 유형', '변경 대상', '변경 내용', '영향 규제'].map(header => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-700/60">
                      {getChangeRows(selectedBom).map(row => (
                        <tr key={`${row.date}-${row.type}-${row.target}`} className="hover:bg-slate-50">
                          <td className="px-2.5 py-2.5 text-xs font-semibold text-ink-500 num-mono">{row.date}</td>
                          <td className="px-2.5 py-2.5 text-sm font-semibold text-ink-100">{row.type}</td>
                          <td className="px-2.5 py-2.5 text-sm text-ink-300">{row.target}</td>
                          <td className="px-2.5 py-2.5 text-sm leading-5 text-ink-500">{row.content}</td>
                          <td className="px-2.5 py-2.5 text-sm font-semibold text-amber-700">{row.impact}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </section>
        </div>
      </div>
    </>
  );
}

function Summary({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-ink-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-ink-100 num-mono">
        {value}
        <span className="ml-1 text-sm font-semibold text-ink-500">{unit}</span>
      </div>
    </div>
  );
}

function CurrentSummary({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-accent-700">{label}</div>
      <div className={clsx('mt-0.5 text-xs font-bold text-ink-100', mono && 'num-mono')}>{value}</div>
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-ink-700 pl-3">
      <div className="text-xs font-semibold text-ink-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-ink-100">{value}</div>
    </div>
  );
}

function ImpactLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-ink-700 py-1.5 first:border-t-0">
      <span className="text-xs font-semibold text-ink-500">{label}</span>
      <span className="text-sm font-bold text-ink-100 num-mono">{value}</span>
    </div>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-ink-700 bg-slate-50 px-4 py-3">
      <h3 className="text-sm font-semibold text-ink-100">{title}</h3>
      <p className="mt-1 text-xs text-ink-500">{subtitle}</p>
    </div>
  );
}

function CompareRow({ label, values, prefix, tone }: { label: string; values: string[]; prefix: string; tone: 'ok' | 'alert' }) {
  const color = tone === 'ok' ? 'text-emerald-700' : 'text-red-700';
  return (
    <div>
      <div className="text-xs font-semibold text-ink-500">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {values.map(value => (
          <span key={value} className={clsx('rounded-xs border border-ink-700 bg-slate-50 px-2 py-1 text-xs font-semibold', color)}>
            {prefix} {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function DetailLine({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="border-t border-ink-700 pt-3">
      <div className="text-xs font-semibold text-ink-500">{label}</div>
      <div className={clsx('mt-1 text-sm font-semibold', emphasis ? 'text-amber-700' : 'text-ink-100')}>{value}</div>
    </div>
  );
}

function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={clsx('px-2.5 py-2 text-left text-xs font-semibold text-ink-500', className)}>{children}</th>;
}

function getChangeRows(version: BomVersion) {
  return version.events.map(event => {
    const title = event.title;
    const firstSource = version.sources[version.sources.length - 1] ?? '-';
    const firstPo = version.poNumbers[version.poNumbers.length - 1] ?? '-';
    const impact = version.regulations.find(regulation => regulation.result !== 'PASS')?.code ?? '없음';

    if (title.includes('PO')) {
      return {
        date: event.date,
        type: 'PO 연결',
        target: firstPo,
        content: `BOM ${version.version} 연결`,
        impact: '없음',
      };
    }

    if (title.includes('검토') || title.includes('재확인') || title.includes('재점검')) {
      return {
        date: event.date,
        type: '규제 재검토',
        target: impact,
        content: event.detail,
        impact,
      };
    }

    if (title.includes('추가')) {
      return {
        date: event.date,
        type: '공급원 추가',
        target: firstSource,
        content: '신규 공급원 등록',
        impact,
      };
    }

    return {
      date: event.date,
      type: title.includes('승인') ? 'BOM 승인' : 'BOM 생성',
      target: `BOM ${version.version}`,
      content: event.detail,
      impact,
    };
  });
}
