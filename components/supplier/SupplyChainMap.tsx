'use client';

/**
 * SupplyChainMap.tsx
 * 협력사 전용 공급망 연결 맵 — 1-Tier 제한 시각화
 *
 * ── page.tsx 조립 방법 ──────────────────────────────────────────────────────
 *
 * 1) import 추가
 *    import SupplyChainMap from '@/components/supplier/SupplyChainMap';
 *
 * 2) supply-chain 뷰 블록 교체
 *    {activeView === 'supply-chain' && (
 *      <SupplyChainMap
 *        supplierId={supplierId}
 *        upstream={upstream}
 *        downstream={downstream}
 *      />
 *    )}
 *
 *    → 기존 <section className="grid grid-cols-[0.9fr_1.1fr] ..."> 블록 전체를 위 한 줄로 교체.
 *    → selectedRelatedId / setSelectedRelatedId state는 컴포넌트 내부로 이동했으므로
 *      page.tsx 상단의 두 줄도 제거 가능합니다.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Factory,
  MapPin,
  Calendar,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Network,
} from 'lucide-react';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import { suppliers } from '@/lib/data';
import {
  getCertifications,
  getContacts,
  getFactories,
  getRiskProfile,
  getSupplierName,
  regulationMeta,
} from '@/lib/supplier-detail-data';
import clsx from 'clsx';

// ─── 타입 ──────────────────────────────────────────────────────────────────────

interface SupplyEdge {
  from: string;
  to: string;
  material: string;
  volume: string;
}

interface RelationItem {
  edge: SupplyEdge;
  supplier: NonNullable<(typeof suppliers)[number]>;
}

interface SupplyChainMapProps {
  supplierId: string;
  upstream: RelationItem[];
  downstream: RelationItem[];
}

// ─── 리스크 레벨 스타일 매핑 ──────────────────────────────────────────────────

const riskConfig: Record<string, { label: string; tone: 'ok' | 'warn' | 'alert' | 'neutral'; dot: string; icon: typeof ShieldCheck }> = {
  low:      { label: '저위험',   tone: 'ok',      dot: 'bg-signal-ok', icon: ShieldCheck },
  medium:   { label: '중위험',   tone: 'warn',    dot: 'bg-amber-500', icon: ShieldAlert },
  high:     { label: '고위험',   tone: 'alert',   dot: 'bg-red-500',   icon: ShieldAlert },
  critical: { label: '최고위험', tone: 'alert',   dot: 'bg-red-600',   icon: ShieldAlert },
};

// ─── status 기반 노드 카드 스타일 (기획서 F-2: green/yellow/red) ─────────────
function nodeCardStyle(status: string): string {
  if (status === 'active' || status === 'verified') {
    return 'border-l-[3px] border-l-[#10B981] bg-[#F0FDF4]';
  }
  if (status === 'pending') {
    return 'border-l-[3px] border-l-amber-400 bg-[#FFFBEB]';
  }
  if (status === 'suspended' || status === 'rejected') {
    return 'border-l-[3px] border-l-red-400 bg-[#FEF2F2]';
  }
  return '';
}

// ─── 규제 풀네임 매핑 (마우스오버 툴팁 — 기획서 F-2) ─────────────────────────
const REGULATION_FULLNAME: Record<string, string> = {
  EU_BATTERY: 'EU Battery Regulation 2023/1542',
  CSDDD:      'EU 공급망 실사 지침',
  EUDR:       'EU 산림 파괴 방지 규정',
  UFLPA:      '위구르 강제노동 방지법',
  IRA:        '미국 인플레이션 감축법',
  CRMA:       'EU 핵심 원자재법',
  FEOC:       '외국 우려 기업 규정',
  CBAM:       'EU 탄소국경조정제도',
  LkSG:       '독일 공급망 실사법',
};

const certStatusLabel: Record<string, string> = {
  active: '유효', expiring_soon: '만료 임박', expired: '만료',
};

// ─── 상태 배지 색 (supplier.status 기준) ─────────────────────────────────────

function statusTone(status: string): 'ok' | 'warn' | 'alert' | 'neutral' | 'info' {
  if (status === 'active' || status === 'verified') return 'ok';
  if (status === 'pending') return 'warn';
  if (status === 'suspended' || status === 'rejected') return 'alert';
  return 'neutral';
}

// ─── 서브: 방향 라벨 칩 ──────────────────────────────────────────────────────

function DirectionChip({ direction }: { direction: 'upstream' | 'downstream' }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
      direction === 'upstream'
        ? 'border-accent-200 bg-accent-50 text-accent-600'
        : 'border-accent-300 bg-accent-50 text-accent-700'
    )}>
      {direction === 'upstream' ? '↑ Upstream' : '↓ Downstream'}
    </span>
  );
}

// ─── 서브: 공급사 노드 카드 (좌·우 컬럼용) ───────────────────────────────────

function SupplierNodeCard({
  item,
  direction,
  isSelected,
  onSelect,
}: {
  item: RelationItem;
  direction: 'upstream' | 'downstream';
  isSelected: boolean;
  onSelect: () => void;
}) {
  const name = getSupplierName(item.supplier.id);
  const risk = getRiskProfile(item.supplier.id);
  const rc = risk ? (riskConfig[risk.riskLevel] ?? riskConfig.low) : null;
  const displayName = name?.nameEn ?? item.supplier.name;
  const displayNameKo = name?.nameKo ?? item.supplier.role;

  // status 기반 카드 배경색 (기획서 F-2)
  const statusCls = nodeCardStyle(item.supplier.status);
  // 노드 하단 규제 배지 — 첫 번째 공장 기준, 최대 3개 (기획서 F-2)
  const factories = getFactories(item.supplier.id);
  const regs = factories[0]?.applicableRegulations?.slice(0, 3) ?? [];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'group w-full rounded-sm border text-left transition-all duration-150',
        isSelected
          ? 'border-accent-500 shadow-[0_0_0_2px_theme(colors.accent.200)] shadow-accent-200'
          : 'border-ink-700 hover:border-accent-300 hover:shadow-control',
        statusCls
      )}
    >
      <div className="p-4">
        {/* 상단: 방향 칩 + Tier */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <DirectionChip direction={direction} />
          <span className="num-mono text-[11px] font-bold text-accent-700">T{item.supplier.tier}</span>
        </div>

        {/* 회사명 */}
        <div className="font-bold text-xs text-ink-100 leading-tight">{displayName}</div>
        <div className="mt-0.5 text-[10px] text-ink-500 leading-snug">{displayNameKo}</div>

        {/* 품목 · 물량 */}
        <div className="mt-3 flex items-center gap-2 rounded-xs border border-ink-700 bg-ink-800 px-2.5 py-1.5">
          <span className="text-[10px] text-ink-500">품목</span>
          <span className="flex-1 text-[11px] font-bold text-ink-100 truncate">{item.edge.material}</span>
          <span className="num-mono text-[11px] font-semibold text-accent-600 shrink-0">{item.edge.volume}</span>
        </div>

        {/* 리스크 배지 + 선택 화살표 */}
        <div className="mt-2 flex items-center justify-between gap-2">
          {rc ? (
            <div className="flex items-center gap-1">
              <span className={clsx('h-1.5 w-1.5 rounded-full', rc.dot)} />
              <span className="text-[10px] font-semibold text-ink-500">{rc.label}</span>
            </div>
          ) : (
            <span className="text-[10px] text-ink-600">리스크 미평가</span>
          )}
          <ChevronRight className={clsx(
            'h-3.5 w-3.5 transition-colors',
            isSelected ? 'text-accent-600' : 'text-ink-600 group-hover:text-accent-400'
          )} />
        </div>

        {/* 규제 배지 — 기획서 F-2: 노드 하단 최대 3개 + 마우스오버 툴팁 */}
        {regs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {regs.map(reg => (
              <div key={reg} className="group/reg relative">
                <span className="inline-block cursor-default rounded-xs border border-accent-100 bg-accent-50 px-1.5 py-0.5 text-[9px] font-bold text-accent-800">
                  {regulationMeta[reg]?.label ?? reg}
                </span>
                {/* 툴팁 — 규제 풀네임 표시 */}
                <div className="pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-xs bg-ink-100 px-2 py-1 text-[9px] font-semibold text-white shadow-lg group-hover/reg:block">
                  {REGULATION_FULLNAME[reg] ?? reg}
                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink-100" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── 서브: 중앙 내 회사 카드 ─────────────────────────────────────────────────

function MyCompanyCard({
  supplierId,
}: {
  supplierId: string;
}) {
  const supplier = suppliers.find(s => s.id === supplierId);
  const name = getSupplierName(supplierId);
  const risk = getRiskProfile(supplierId);
  const rc = risk ? (riskConfig[risk.riskLevel] ?? riskConfig.low) : null;
  const RiskIcon = rc?.icon ?? ShieldCheck;

  return (
    <div className="relative rounded-sm border-2 border-accent-500 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.10)] p-5 flex flex-col items-center text-center">
      {/* 상단 표시 바 */}
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-sm bg-gradient-to-r from-accent-600 via-accent-400 to-accent-600" />

      {/* 아이콘 */}
      <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-sm bg-accent-700 text-white shadow-control">
        <Factory className="h-6 w-6" strokeWidth={2.2} />
      </div>

      {/* 회사명 */}
      <div className="mt-3 text-[10px] font-bold text-ink-500 uppercase tracking-wider">내 회사</div>
      <div className="mt-1 text-base font-bold text-ink-100 leading-tight">
        {name?.nameEn ?? supplier?.name ?? supplierId}
      </div>
      {name?.nameKo && (
        <div className="mt-0.5 text-xs text-ink-500">{name.nameKo}</div>
      )}

      {/* Tier + ID */}
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-xs border border-accent-200 bg-accent-50 px-2.5 py-1 num-mono text-xs font-bold text-accent-800">
          T{supplier?.tier ?? '—'}
        </span>
        <span className="rounded-xs border border-ink-700 bg-ink-800 px-2 py-1 num-mono text-[10px] text-ink-400">
          {supplierId}
        </span>
      </div>

      {/* 리스크 배지 */}
      {rc && (
        <div className="mt-3 flex items-center gap-1.5 rounded-xs border border-ink-700 bg-ink-800 px-3 py-2">
          <RiskIcon className={clsx('h-3.5 w-3.5 shrink-0',
            risk?.riskLevel === 'low' ? 'text-signal-ok' :
            risk?.riskLevel === 'medium' ? 'text-amber-500' : 'text-red-500'
          )} strokeWidth={2.2} />
          <span className="text-[10px] font-semibold text-ink-300">{rc.label}</span>
        </div>
      )}

      {/* 국가/지역 */}
      {supplier && (
        <div className="mt-2 text-[10px] text-ink-500">
          {supplier.country} · {supplier.region}
        </div>
      )}
    </div>
  );
}

// ─── 서브: 상세 패널 (클릭된 업체의 정보) ────────────────────────────────────

function SupplierDetailPanel({
  item,
  myId,
}: {
  item: RelationItem;
  myId: string;
}) {
  const name = getSupplierName(item.supplier.id);
  const contacts = getContacts(item.supplier.id);
  const allFactories = getFactories(item.supplier.id);
  const production = allFactories.filter(f => f.factoryRole !== 'headquarters');
  const primary = contacts.find(c => c.isPrimary) ?? contacts[0];
  const certs = getCertifications(item.supplier.id);
  const risk = getRiskProfile(item.supplier.id);
  const rc = risk ? (riskConfig[risk.riskLevel] ?? riskConfig.low) : null;
  const direction = item.edge.from === myId ? 'downstream' : 'upstream';

  return (
    <div className="space-y-4">
      {/* ── 연결 관계 요약 카드 ──────────────────────────────────── */}
      <div className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <DirectionChip direction={direction} />
              <Badge tone={statusTone(item.supplier.status)}>{item.supplier.status}</Badge>
            </div>
            <div className="text-base font-bold text-ink-100 leading-tight">
              {name?.nameEn ?? item.supplier.name}
            </div>
            <div className="mt-0.5 text-xs text-ink-500">
              {name?.nameKo ?? item.supplier.role} · {item.supplier.region}
            </div>
          </div>
          <div className="shrink-0 rounded-xs border border-ink-700 bg-ink-800 px-3 py-2 text-right">
            <div className="text-[10px] font-bold text-ink-500">Tier</div>
            <div className="num-mono text-lg font-bold text-accent-700">T{item.supplier.tier}</div>
          </div>
        </div>

        {/* 거래 정보 3칸 */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
            <div className="text-[11px] font-semibold text-ink-500">관계 유형</div>
            <div className="mt-1 text-xs font-bold text-ink-100">
              {direction === 'upstream' ? 'Parent / 상위' : 'Child / 하위'}
            </div>
          </div>
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
            <div className="text-[11px] font-semibold text-ink-500">품목</div>
            <div className="mt-1 text-xs font-bold text-ink-100">{item.edge.material}</div>
          </div>
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
            <div className="text-[11px] font-semibold text-ink-500">물량</div>
            <div className="mt-1 num-mono text-xs font-bold text-ink-100">{item.edge.volume}</div>
          </div>
        </div>

        {/* 리스크 */}
        {rc && (
          <div className="mt-4 flex items-center gap-2 rounded-xs border border-ink-700 bg-ink-800 px-3 py-2.5">
            <span className={clsx('h-2 w-2 rounded-full', rc.dot)} />
            <span className="text-xs font-bold text-ink-300">리스크 평가:</span>
            <Badge tone={rc.tone}>{rc.label}</Badge>
          </div>
        )}
      </div>

      {/* ── 공개 담당 창구 ─────────────────────────────────────── */}
      {primary && (
        <Card title="공개 담당 창구" subtitle="직접 연결 업무에 필요한 범위만 표시">
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-4">
            <div className="text-xs font-bold text-ink-100">{primary.name}</div>
            <div className="mt-1 text-xs text-ink-500">
              {primary.role}{primary.department ? ` · ${primary.department}` : ''}
            </div>
            <div className="mt-3 text-xs font-semibold text-accent-700">{primary.email}</div>
          </div>
        </Card>
      )}

      {/* ── 사업장 정보 ────────────────────────────────────────── */}
      <Card
        title="사업장 정보"
        subtitle={`${production.length}개소 · 납품처별 규제 차등`}
      >
        <div className="space-y-3">
          {production.length === 0 ? (
            <div className="rounded-xs border border-dashed border-ink-700 p-4 text-xs text-ink-500">
              등록된 사업장 정보가 없습니다.
            </div>
          ) : production.map(factory => (
            <div key={factory.factoryId} className="rounded-xs border border-ink-700 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-ink-100 truncate">{factory.factoryName}</div>
                  {factory.factoryNameEn && factory.factoryNameEn !== factory.factoryName && (
                    <div className="mt-0.5 text-[11px] text-ink-500 truncate">{factory.factoryNameEn}</div>
                  )}
                </div>
                <Badge tone={factory.destination === 'US' ? 'warn' : factory.destination === 'EU' ? 'ok' : 'info'}>
                  {factory.destination === 'BOTH' ? 'EU + US' : factory.destination ?? 'KR'}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-ink-500">
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="leading-snug">{factory.address}</span>
                </div>
                <div className="flex items-center gap-1.5 num-mono">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{factory.operatingPeriodFrom} ~ {factory.operatingPeriodTo ?? '현재'}</span>
                </div>
                {factory.monthlyCapacity && <div>월 처리량: {factory.monthlyCapacity}</div>}
                {factory.destinationDetail && <div className="col-span-2 leading-snug">납품 흐름: {factory.destinationDetail}</div>}
              </div>
              {factory.applicableRegulations && factory.applicableRegulations.length > 0 && (
                <div className="mt-3 border-t border-ink-700 pt-3">
                  <div className="mb-1.5 text-[10px] font-bold text-ink-500">적용 규제</div>
                  <div className="flex flex-wrap gap-1.5">
                    {factory.applicableRegulations.map(reg => (
                      <span key={reg} className="rounded-xs border border-accent-100 bg-accent-50 px-2 py-1 text-[10px] font-bold text-accent-900">
                        {regulationMeta[reg]?.label ?? reg}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── 인증서 ────────────────────────────────────────────── */}
      <Card title="인증서" subtitle={`${certs.length}건 · 제출/검토 기준`}>
        {certs.length === 0 ? (
          <div className="rounded-xs border border-dashed border-ink-700 p-4 text-xs text-ink-500">
            등록된 인증서가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {certs.map(cert => (
              <div key={cert.certId} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-ink-800 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-ink-100">{cert.certName}</div>
                  <div className="truncate text-[10px] text-ink-500">{cert.issuingBody}</div>
                </div>
                <Badge tone={cert.status === 'active' ? 'ok' : cert.status === 'expired' ? 'alert' : 'warn'}>
                  {certStatusLabel[cert.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

export default function SupplyChainMap({
  supplierId,
  upstream,
  downstream,
}: SupplyChainMapProps) {
  // 선택된 파트너사 ID (클릭 시 우측 상세 패널 토글)
  const [selectedId, setSelectedId] = useState<string | null>(
    // 기본값: 첫 번째 downstream 또는 upstream
    downstream[0]?.supplier.id ?? upstream[0]?.supplier.id ?? null
  );

  const allItems = [...upstream, ...downstream];
  const selectedItem = allItems.find(item => item.supplier.id === selectedId);

  function handleSelect(id: string) {
    setSelectedId(prev => prev === id ? null : id); // 같은 카드 재클릭 시 패널 닫기
  }

  return (
    <div className="space-y-6">

      {/* ── 섹션 제목 + 접근 제한 배너 ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink-100">공급망 연결</h2>
          <p className="mt-1 text-xs text-ink-500">직접 연결된 1-Tier 파트너사만 표시합니다</p>
        </div>
        <div className="flex items-center gap-2 rounded-xs border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>보안 정책: 직상위·직하위 1단계만 표시 · 전체 공급망 구조 비공개</span>
        </div>
      </div>

      {/* ── 3단 공급망 맵 ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 items-start gap-0">

        {/* ── 좌측: Upstream (상위 공급사) ──────────────────────────────── */}
        <div className="pr-4">
          <div className="mb-3 flex items-center gap-2">
            <Network className="h-4 w-4 text-accent-500" />
            <span className="text-xs font-bold text-ink-400 uppercase tracking-wider">Upstream</span>
            <span className="text-[10px] text-ink-600">원재료 공급</span>
          </div>

          {upstream.length === 0 ? (
            <div className="rounded-xs border border-dashed border-ink-700 bg-white p-5 text-center">
              <Building2 className="mx-auto mb-2 h-6 w-6 text-ink-600" />
              <div className="text-xs font-semibold text-ink-500">등록된 직접 상위 공급사가 없습니다</div>
              <div className="mt-1 text-[10px] text-ink-600">(원청사 최상위 또는 미연결)</div>
            </div>
          ) : (
            <div className="space-y-3">
              {upstream.map(item => (
                <SupplierNodeCard
                  key={item.supplier.id}
                  item={item}
                  direction="upstream"
                  isSelected={selectedId === item.supplier.id}
                  onSelect={() => handleSelect(item.supplier.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── 중앙: 흐름 화살표 + 내 회사 카드 ──────────────────────────── */}
        <div className="flex flex-col items-center gap-4 px-4">
          {/* 좌측→중앙 화살표 */}
          <div className="flex w-full items-center gap-1.5 mt-7">
            <div className="flex-1 border-t-2 border-dashed border-accent-200" />
            <ArrowRight className="h-5 w-5 shrink-0 text-accent-400" strokeWidth={2.5} />
          </div>

          {/* 내 회사 카드 */}
          <MyCompanyCard supplierId={supplierId} />

          {/* 중앙→우측 화살표 */}
          <div className="flex w-full items-center gap-1.5">
            <ArrowRight className="h-5 w-5 shrink-0 text-accent-600" strokeWidth={2.5} />
            <div className="flex-1 border-t-2 border-dashed border-accent-200" />
          </div>
        </div>

        {/* ── 우측: Downstream (하위 납품처) ────────────────────────────── */}
        <div className="pl-4">
          <div className="mb-3 flex items-center gap-2">
            <Network className="h-4 w-4 text-accent-600" />
            <span className="text-xs font-bold text-ink-400 uppercase tracking-wider">Downstream</span>
            <span className="text-[10px] text-ink-600">납품처</span>
          </div>

          {downstream.length === 0 ? (
            <div className="rounded-xs border border-dashed border-ink-700 bg-white p-5 text-center">
              <Building2 className="mx-auto mb-2 h-6 w-6 text-ink-600" />
              <div className="text-xs font-semibold text-ink-500">등록된 직접 하위 납품처가 없습니다</div>
            </div>
          ) : (
            <div className="space-y-3">
              {downstream.map(item => (
                <SupplierNodeCard
                  key={item.supplier.id}
                  item={item}
                  direction="downstream"
                  isSelected={selectedId === item.supplier.id}
                  onSelect={() => handleSelect(item.supplier.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 하단 구분선 + 상세 패널 (클릭 토글) ──────────────────────────────── */}
      {selectedItem && (
        <>
          <div className="flex items-center gap-3 border-t border-ink-700 pt-6">
            <ChevronRight className="h-4 w-4 text-accent-600" />
            <span className="text-xs font-bold text-ink-300">
              직접 연결 업체 상세 정보
            </span>
            <span className="text-[10px] text-ink-500">
              — {getSupplierName(selectedItem.supplier.id)?.nameEn ?? selectedItem.supplier.name}
            </span>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="ml-auto text-[10px] text-ink-500 hover:text-ink-200"
            >
              닫기 ✕
            </button>
          </div>
          <SupplierDetailPanel item={selectedItem} myId={supplierId} />
        </>
      )}

      {/* ── 접근 제한 안내 풋노트 ────────────────────────────────────────────── */}
      <div className="rounded-xs border border-ink-700 bg-white p-4 text-[10px] leading-5 text-ink-500">
        이 화면은 직접 연결된 1단계 파트너사 정보만 표시합니다.
        전체 공급망 구조, 타사 비교, PO 단가, FEOC 세부 판정 근거, 감사 추적 로그, 경쟁 협력사 비교 지표는 제공하지 않습니다.
      </div>
    </div>
  );
}
