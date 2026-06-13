'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardList,
  Factory,
  FileCheck,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Network,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import KpiCard from '@/components/KpiCard';
import SubmitWizardModal from '@/components/supplier/SubmitWizardModal';
import EightStageStepper from '@/components/supplier/EightStageStepper';
import SupplyChainMap from '@/components/supplier/SupplyChainMap';
import ViolationReportModal from '@/components/supplier/ViolationReportModal';
import { suppliers, supplyEdges } from '@/lib/data';
import {
  getCertifications,
  getCompleteness,
  getContacts,
  getFactories,
  getRiskProfile,
  getSupplierName,
  parts,
  purchaseOrders,
  regulationMeta,
} from '@/lib/supplier-detail-data';

const supplierId = 'S-MINE-001';

const riskLabel: Record<string, string> = {
  low: '저위험',
  medium: '중위험',
  high: '고위험',
  critical: '최고위험',
};

// ⑥ 협력사 상태값 → 한글 라벨 + Badge tone 매핑
const supplierStatusMeta: Record<string, { label: string; tone: 'ok' | 'warn' | 'alert' | 'info' | 'neutral' }> = {
  pending:          { label: '검토 대기',  tone: 'neutral' },
  review:           { label: '검토 중',    tone: 'info'    },
  supplier_verified:{ label: '승인 완료',  tone: 'ok'      },
  verified:         { label: '승인 완료',  tone: 'ok'      },
  suspended:        { label: '거래 중지',  tone: 'alert'   },
  rejected:         { label: '반려',       tone: 'alert'   },
};

const certStatusLabel: Record<string, string> = {
  active: '유효',
  expiring_soon: '만료 임박',
  expired: '만료',
};

// ─── D-Day 계산 유틸 ──────────────────────────────────────────────────────────
// 기준일: 2026-06-13 (시스템 날짜)
// 반환값: { label: 'D-12' | 'D-Day' | '만료됨', days: number }
const REFERENCE_DATE = new Date('2026-06-13T00:00:00');

function calculateDDay(expiresAt: string): { label: string; days: number } {
  const expiry = new Date(expiresAt + 'T00:00:00');
  const diffMs = expiry.getTime() - REFERENCE_DATE.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: '만료됨', days };
  if (days === 0) return { label: 'D-Day', days };
  return { label: `D-${days}`, days };
}

// 잔여일 기준 배지 스타일 결정
// · 만료됨(days<0) or 7일 이하 → 최고 긴급 (진한 빨강)
// · 8~30일             → 긴급     (중간 빨강)
// · 31~60일            → 주의     (주황)
function certDDayStyle(days: number): {
  wrapperCls: string;
  badgeCls: string;
} {
  if (days <= 7) {
    return {
      wrapperCls: 'border-red-300 bg-red-50',
      badgeCls:   'bg-red-600 text-white',
    };
  }
  if (days <= 30) {
    return {
      wrapperCls: 'border-red-200 bg-red-50',
      badgeCls:   'bg-red-500 text-white',
    };
  }
  return {
    wrapperCls: 'border-amber-300 bg-amber-50',
    badgeCls:   'bg-amber-500 text-white',
  };
}

// Action Center 제출 기한 D-day → Badge tone 매핑
// · 기한 초과(days<0) or D-7 이하 → alert (빨강): 즉시 조치 필요
// · D-8 ~ D-14                   → warn  (주황): 이번 주 내 처리
// · D-15 이상                     → info  (파랑): 여유 있음
type BadgeTone = 'ok' | 'warn' | 'alert' | 'info' | 'neutral';
function dueDateTone(days: number): BadgeTone {
  if (days <= 7)  return 'alert';
  if (days <= 14) return 'warn';
  return 'info';
}

type SupplierView =
  | 'dashboard'
  | 'company-info'
  | 'submit-documents'
  | 'submission-status'
  | 'supply-chain'
  | 'notifications'
  | 'edit-info';

function RelationRow({
  supplier,
  detail,
  selected,
  relation,
  onSelect,
}: {
  supplier: NonNullable<(typeof suppliers)[number]>;
  detail: string;
  selected?: boolean;
  /** 로그인 기업 기준 관계 방향 — Tier 숫자 대신 표시 */
  relation: 'parent' | 'child';
  onSelect?: () => void;
}) {
  const name = getSupplierName(supplier.id);
  const relationLabel = relation === 'parent' ? '직속 상위' : '직속 하위';
  const relationBadgeCls = relation === 'parent'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-teal-50 text-teal-700 border-teal-200';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        selected
          ? 'flex w-full items-center justify-between gap-3 rounded-xs border border-accent-600 bg-accent-50 px-3 py-3 text-left'
          : 'flex w-full items-center justify-between gap-3 rounded-xs border border-transparent px-3 py-3 text-left transition-colors hover:border-accent-100 hover:bg-white'
      }
    >
      <div className="min-w-0">
        <div className="truncate text-xs font-bold text-ink-100">{name?.nameEn ?? supplier.name}</div>
        <div className="mt-0.5 truncate text-[10px] text-ink-500">{name?.nameKo ?? supplier.region}</div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        {/* Tier 숫자 대신 관계 기반 라벨 표시 */}
        <span className={`rounded-xs border px-1.5 py-0.5 text-[10px] font-bold ${relationBadgeCls}`}>
          {relationLabel}
        </span>
        <div className="text-[10px] text-ink-500">{detail}</div>
      </div>
    </button>
  );
}

function SupplierSidebar({
  supplierName,
  activeView,
  onSelect,
}: {
  supplierName: string;
  activeView: SupplierView;
  onSelect: (view: SupplierView) => void;
}) {
  const menu = [
    { id: 'dashboard' as const, label: '홈', subtitle: '요약 · 우선 조치', icon: LayoutDashboard },
    { id: 'company-info' as const, label: '내 기업 정보', subtitle: '기본정보 · 사업장', icon: Building2 },
    { id: 'submit-documents' as const, label: '자료 제출', subtitle: '요청 자료 업로드', icon: Upload },
    { id: 'submission-status' as const, label: '제출/검토 현황', subtitle: '검토 결과 · 재요청', icon: ClipboardList },
    { id: 'supply-chain' as const, label: '공급망 연결', subtitle: '직접 연결 업체', icon: Network },
    { id: 'notifications' as const, label: '원청사 알림', subtitle: '요청 · 기한', icon: Bell },
    { id: 'edit-info' as const, label: '계정 설정', subtitle: '비밀번호 · 등록정보', icon: KeyRound },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-ink-700 bg-white shadow-control">
      <div className="border-b border-ink-700 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent-700 text-white">
            <Factory className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-ink-100">협력사 업무공간</div>
            <div className="truncate text-[11px] text-ink-500">{supplierName}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {menu.map(item => {
          const Icon = item.icon;
          const active = item.id === activeView;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={
                active
                  ? 'flex w-full items-center gap-3 rounded-sm border border-accent-100 bg-accent-50 px-3 py-2.5 text-left text-accent-900'
                  : 'flex w-full items-center gap-3 rounded-sm border border-transparent px-3 py-2.5 text-left text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100'
              }
            >
              <div className={
                active
                  ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-accent-700 bg-accent-700 text-white'
                  : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-ink-700 bg-white text-ink-400'
              }>
                <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 1.9} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold">{item.label}</div>
                <div className="truncate text-[10px] text-ink-500">{item.subtitle}</div>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-ink-700 bg-ink-800 p-4">
        <div className="text-[11px] font-semibold text-ink-500">접속 권한</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-ok" />
          <span className="text-xs font-semibold text-ink-200">내 회사 기준 보기</span>
        </div>
      </div>
    </aside>
  );
}

function SupplierInfoPreview({
  supplierId,
  self = false,
  relation,
  completeness,
}: {
  supplierId: string;
  self?: boolean;
  /** 로그인 기업 기준 관계 방향 — self=true이면 불필요 */
  relation?: 'parent' | 'child';
  /** ③ 완성도 데이터 — self=true일 때 프로그레스바 표시용 */
  completeness?: { completionRate: number; filledFieldCount: number; requiredFieldCount: number; missingFields: string[] } | null;
}) {
  const supplier = suppliers.find(item => item.id === supplierId);
  const name = getSupplierName(supplierId);
  const contacts = getContacts(supplierId);
  const factories = getFactories(supplierId);
  const production = factories.filter(factory => factory.factoryRole !== 'headquarters');
  const primary = contacts.find(contact => contact.isPrimary) ?? contacts[0];
  const certs = getCertifications(supplierId);

  // 관계 라벨 — Tier 숫자 대신 가시성 기반 표시
  const relationLabel = relation === 'parent' ? '직속 상위 (Parent)' : relation === 'child' ? '직속 하위 (Child)' : null;
  const relationBadgeCls = relation === 'parent'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-teal-50 text-teal-700 border-teal-200';

  if (!supplier) {
    return <div className="rounded-xs border border-ink-700 bg-white p-4 text-xs text-ink-500">협력사를 찾을 수 없습니다.</div>;
  }

  // ⑥ 상태값 메타 — 존재하지 않는 키는 원문 표시
  const statusMeta = supplierStatusMeta[supplier.status] ?? { label: supplier.status, tone: 'neutral' as const };

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
        {/* ① self 모드: Tier 배지 없이 좌측 텍스트만 / 연결사 모드: 관계 라벨 우측 배치 */}
        <div className={`flex gap-4 ${self ? '' : 'items-start justify-between'}`}>
          <div className="min-w-0">
            <div className="text-xs font-bold text-ink-500">{self ? '내 기업 기본정보' : '직접 연결 업체 정보'}</div>
            <div className="mt-2 text-base font-bold text-ink-100">{name?.nameEn ?? supplier.name}</div>
            <div className="mt-1 text-xs text-ink-500">{name?.nameKo ?? supplier.role} · {supplier.region}</div>
          </div>
          {/* self=true이면 관계 라벨 영역 자체를 렌더링하지 않음 (Tier 완전 제거) */}
          {!self && relationLabel && (
            <span className={`shrink-0 rounded-xs border px-2.5 py-1.5 text-[11px] font-bold ${relationBadgeCls}`}>
              {relationLabel}
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
            <div className="text-[11px] font-semibold text-ink-500">역할</div>
            <div className="mt-1 text-xs font-bold text-ink-100">{supplier.role}</div>
          </div>
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
            <div className="text-[11px] font-semibold text-ink-500">국가/지역</div>
            <div className="mt-1 text-xs font-bold text-ink-100">{supplier.country} · {supplier.region}</div>
          </div>
          {/* ⑥ 상태값 → 한글 Badge 변환 */}
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
            <div className="text-[11px] font-semibold text-ink-500">상태</div>
            <div className="mt-1.5">
              <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            </div>
          </div>
        </div>
      </div>

      {primary && (
        <div className="rounded-sm border border-ink-700 bg-white shadow-control">
          {/* 카드 헤더 — 수정 요청 버튼 포함 */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink-700">
            <div>
              <div className="text-xs font-bold text-ink-100">{self ? '담당자 정보' : '공개 담당 창구'}</div>
              <div className="mt-0.5 text-[11px] text-ink-500">{self ? '내 계정 기준 담당자' : '직접 연결 업무에 필요한 범위만 표시'}</div>
            </div>
            {/* ④ 수정 요청 버튼 — self 모드에서만 노출 */}
            {self && (
              <button
                type="button"
                onClick={() => alert('원청사에 변경 승인 요청이 전송되었습니다. (검토 대기)')}
                className="inline-flex items-center gap-1.5 rounded-xs border border-ink-600 bg-ink-800 px-3 py-1.5 text-[11px] font-semibold text-ink-400 transition-colors hover:border-accent-600 hover:bg-accent-50 hover:text-accent-700"
              >
                수정 요청
              </button>
            )}
          </div>
          <div className="p-5">
            <div className="rounded-xs border border-ink-700 bg-ink-800 p-4">
              <div className="text-xs font-bold text-ink-100">{primary.name}</div>
              <div className="mt-1 text-xs text-ink-500">{primary.role}{primary.department ? ` · ${primary.department}` : ''}</div>
              <div className="mt-3 text-xs font-semibold text-accent-700">{primary.email}</div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink-700">
          <div>
            <div className="text-xs font-bold text-ink-100">{self ? '내 사업장 정보' : '사업장 정보'}</div>
            <div className="mt-0.5 text-[11px] text-ink-500">{production.length}개소 · 납품처별 규제 차등</div>
          </div>
          {self && (
            <button
              type="button"
              onClick={() => alert('원청사에 변경 승인 요청이 전송되었습니다. (검토 대기)')}
              className="inline-flex items-center gap-1.5 rounded-xs border border-ink-600 bg-ink-800 px-3 py-1.5 text-[11px] font-semibold text-ink-400 transition-colors hover:border-accent-600 hover:bg-accent-50 hover:text-accent-700"
            >
              수정 요청
            </button>
          )}
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {production.map(factory => (
              <div key={factory.factoryId} className="rounded-xs border border-ink-700 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-ink-100">{factory.factoryName}</div>
                    {factory.factoryNameEn && factory.factoryNameEn !== factory.factoryName && (
                      <div className="mt-0.5 text-[11px] text-ink-500">{factory.factoryNameEn}</div>
                    )}
                  </div>
                  <Badge tone={factory.destination === 'US' ? 'warn' : factory.destination === 'EU' ? 'ok' : 'info'}>
                    {factory.destination === 'BOTH' ? 'EU + US' : factory.destination ?? 'KR'}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-ink-500">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{factory.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 num-mono">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span>{factory.operatingPeriodFrom} ~ {factory.operatingPeriodTo ?? '현재'}</span>
                  </div>
                  {factory.monthlyCapacity && <div>월 처리량: {factory.monthlyCapacity}</div>}
                  {factory.destinationDetail && <div>납품 흐름: {factory.destinationDetail}</div>}
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
        </div>
      </div>

      {/* ── 복원된 인증서 카드 영역 ── */}
      <div className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink-700">
          <div>
            <div className="text-xs font-bold text-ink-100">인증서</div>
            <div className="mt-0.5 text-[11px] text-ink-500">{certs.length}건 · 제출/검토 기준</div>
          </div>
          {self && (
            <button
              type="button"
              onClick={() => alert('원청사에 변경 승인 요청이 전송되었습니다. (검토 대기)')}
              className="inline-flex items-center gap-1.5 rounded-xs border border-ink-600 bg-ink-800 px-3 py-1.5 text-[11px] font-semibold text-ink-400 transition-colors hover:border-accent-600 hover:bg-accent-50 hover:text-accent-700"
            >
              수정 요청
            </button>
          )}
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-2">
            {certs.map(cert => {
              const isInactive = cert.status !== 'active';
              const { label: ddayLabel, days } = calculateDDay(cert.expiresAt);
              const { badgeCls } = certDDayStyle(days);
              return (
                <div
                  key={cert.certId}
                  className={`flex items-start justify-between gap-3 rounded-xs border px-3 py-2.5 ${
                    isInactive ? 'border-red-200 bg-red-50' : 'border-ink-700 bg-ink-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className={`truncate text-xs font-semibold ${isInactive ? 'text-red-900' : 'text-ink-100'}`}>
                      {cert.certName}
                    </div>
                    <div className="truncate text-[10px] text-ink-500">{cert.issuingBody}</div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {isInactive ? (
                      <>
                        <span className={`rounded-xs px-2 py-0.5 text-[11px] font-bold tabular-nums ${badgeCls}`}>
                          {ddayLabel}
                        </span>
                        <span className="text-[10px] text-red-600 font-medium">
                          {certStatusLabel[cert.status]}
                        </span>
                      </>
                    ) : (
                      <Badge tone="ok">유효</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SupplierPage() {
  const [activeView, setActiveView] = useState<SupplierView>('dashboard');
  const [selectedRelatedId, setSelectedRelatedId] = useState('S-PRE-001');
  // ── 자료 제출 모달 상태 ──────────────────────────────────────────────────────
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitialItems, setWizardInitialItems] = useState<string[]>([]);
  const [wizardReworkMode, setWizardReworkMode] = useState(false);
  // ── 시정 조치 모달 상태 ──────────────────────────────────────────────────────
  const [violationModalOpen, setViolationModalOpen] = useState(false);
  // violationId: 특정 위반 건과 모달을 바인딩 — null이면 일반 진입
  const [violationId, setViolationId] = useState<string | null>(null);

  /** 일반 업로드 버튼: 항목 미선택 상태로 Step 1 열기 */
  function openWizard() {
    setWizardInitialItems([]);
    setWizardReworkMode(false);
    setWizardOpen(true);
  }

  /** 재제출 버튼: 해당 항목 선택 + rework 모드로 Step 2 바로 열기 */
  function openWizardRework(label: string) {
    setWizardInitialItems([label]);
    setWizardReworkMode(true);
    setWizardOpen(true);
  }

  /**
   * Action Center 딥링크 진입:
   * - 일반 항목(제출 필요/대기): Step 1에서 해당 항목 자동 체크된 채로 열기
   * - 재요청 항목: rework 모드로 Step 2 바로 열기
   */
  function openWizardFromActionCenter(label: string, status: string) {
    const isRework = status === '재요청';
    setWizardInitialItems([label]);
    setWizardReworkMode(isRework);
    setWizardOpen(true);
  }
  const supplier = suppliers.find(item => item.id === supplierId);
  const name = getSupplierName(supplierId);
  const contacts = getContacts(supplierId);
  const completeness = getCompleteness(supplierId);
  const risk = getRiskProfile(supplierId);
  const factories = getFactories(supplierId).filter(factory => factory.factoryRole !== 'headquarters');
  const certifications = getCertifications(supplierId);
  const myPOs = purchaseOrders.filter(po => po.supplierId === supplierId);
  const downstreamEdges = supplyEdges.filter(edge => edge.from === supplierId);
  const upstreamEdges = supplyEdges.filter(edge => edge.to === supplierId);
  const downstream = downstreamEdges
    .map(edge => ({ edge, supplier: suppliers.find(item => item.id === edge.to) }))
    .filter((item): item is { edge: typeof downstreamEdges[number]; supplier: NonNullable<typeof supplier> } => Boolean(item.supplier));
  const upstreamFromEdges = upstreamEdges
    .map(edge => ({ edge, supplier: suppliers.find(item => item.id === edge.from) }))
    .filter((item): item is { edge: typeof upstreamEdges[number]; supplier: NonNullable<typeof supplier> } => Boolean(item.supplier));

  // ⑦ Parent 데이터 보완: supplyEdges에 S-PRE-001→S-MINE-001 edge가 없을 경우
  // PO-006(NORI-NCL-RAW)에서 S-MINE-001이 S-PRE-001에 납품하는 관계가 확인되므로 Mock으로 보완
  const upstreamMockFallback = upstreamFromEdges.length === 0
    ? (() => {
        const parentSupplier = suppliers.find(item => item.id === 'S-PRE-001');
        if (!parentSupplier) return [];
        return [{
          edge: { from: 'S-PRE-001', to: supplierId, material: '니켈 원광', volume: '21,000 kg/월' } as const,
          supplier: parentSupplier,
        }];
      })()
    : upstreamFromEdges;
  const upstream = upstreamMockFallback;
  const primary = contacts.find(contact => contact.isPrimary) ?? contacts[0];
  const missing = completeness?.missingFields ?? [];
  const certRisk = certifications.filter(cert => cert.status !== 'active').length;
  const pendingRequests = missing.length + certRisk;
  const requestItems = [
    { label: '광산 폴리곤 좌표 등록',    due: '2026-06-16', status: '제출 필요', tone: 'warn'    as const },
    { label: '환경영향평가 갱신본 업로드', due: '2026-06-20', status: '재요청',   tone: 'alert'   as const },
    { label: '커뮤니티 합의서 제출',      due: '2026-06-25', status: '대기',     tone: 'neutral' as const },
    { label: '광권 갱신 증빙',            due: '2026-07-05', status: '대기',     tone: 'neutral' as const },
  ];
  const guideItems = [
    { title: '광산 좌표 제출 가이드', detail: 'EUDR 검증용 폴리곤 좌표 형식' },
    { title: 'FEOC 자료 작성법', detail: '원산지·소유구조 증빙 제출 기준' },
    { title: '탄소 배출 보고서 기준', detail: 'Scope 1/2/3 산정 근거 예시' },
  ];
  const reviewResults = [
    { label: '원산지 증명서', result: '승인', reason: 'NORI-NCL-RAW 원산지 증빙 확인', tone: 'ok' as const },
    { label: '탄소 배출 보고서', result: '재요청', reason: 'Scope 3 산정 근거 보완 필요', tone: 'warn' as const },
    { label: '광산 폴리곤 좌표', result: '미제출', reason: 'EUDR 검증 필수 좌표 누락', tone: 'alert' as const },
  ];
  const reviewTimeline = [
    { label: '원산지 증명서', step: '승인 완료', date: '2026-05-16', tone: 'ok' as const },
    { label: '탄소 배출 보고서', step: '재요청 확인 필요', date: '2026-05-19', tone: 'warn' as const },
    { label: '광산 폴리곤 좌표', step: '자료 미제출', date: '2026-05-31', tone: 'alert' as const },
    { label: '환경영향평가 보고서', step: '검토 대기', date: '2026-06-03', tone: 'info' as const },
  ];
  const selectedRelation = [...upstream, ...downstream].find(item => item.supplier.id === selectedRelatedId);

  return (
    <main className="min-h-screen bg-[#F4F7F9] text-ink-100">
      <div className="flex min-h-screen">
        <SupplierSidebar
          supplierName={name?.shortNameKo ?? name?.shortNameEn ?? supplier?.name ?? supplierId}
          activeView={activeView}
          onSelect={setActiveView}
        />
        <div className="min-w-0 flex-1">
          <header className="border-b border-ink-700 bg-white px-8 py-5 shadow-control">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-accent-700 text-white">
                  <Factory className="h-5 w-5" strokeWidth={2.3} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold tracking-tight">협력사 업무공간</h1>
                    <Badge tone="info">내 회사 기준</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    내 회사 정보, 원청 요청 자료, 직접 연결된 공급망만 확인합니다.
                  </p>
                </div>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                로그아웃
              </Link>
            </div>
          </header>

          <div className="space-y-6 p-8">
        {activeView === 'company-info' && (
        <>
        <section className="grid grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-ink-500">로그인 협력사</div>
                <div className="mt-2 text-lg font-bold text-ink-100">{name?.nameEn ?? supplier?.name}</div>
                <div className="mt-1 text-xs text-ink-500">{name?.nameKo} · {supplier?.region}</div>
              </div>
              {/* Tier 숫자는 제품 기준 상대적 위치이므로 협력사 포털에서 노출하지 않음 */}
            </div>

            {/* ③ 완성도 프로그레스바 — completeness 데이터가 있을 때만 표시 */}
            {completeness && (
              <div className="mt-5 rounded-xs border border-ink-700 bg-ink-800 p-4">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-ink-500">제출 완성도</div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="num-mono text-xl font-bold text-ink-100">
                        {completeness.completionRate}%
                      </span>
                      <span className="text-[11px] text-ink-500">
                        ({completeness.filledFieldCount}/{completeness.requiredFieldCount} 항목)
                      </span>
                    </div>
                  </div>
                  <Badge
                    tone={completeness.completionRate >= 90 ? 'ok' : completeness.completionRate >= 70 ? 'warn' : 'alert'}
                  >
                    {completeness.completionRate >= 90 ? '양호' : completeness.completionRate >= 70 ? '보완 필요' : '미흡'}
                  </Badge>
                </div>
                {/* 프로그레스바 */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      completeness.completionRate >= 90 ? 'bg-signal-ok' :
                      completeness.completionRate >= 70 ? 'bg-accent-700' : 'bg-red-500'
                    }`}
                    style={{ width: `${completeness.completionRate}%` }}
                  />
                </div>
                {/* 누락 항목 — 있을 때만 표시 */}
                {completeness.missingFields.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {completeness.missingFields.map(field => (
                      <span
                        key={field}
                        className="flex items-center gap-1 rounded-xs border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                      >
                        <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                        {field}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="text-[11px] font-semibold text-ink-500">주 담당자</div>
                <div className="mt-1 text-xs font-bold">{primary?.name ?? '미등록'}</div>
                <div className="mt-0.5 text-[10px] text-ink-500">{primary?.email}</div>
              </div>
              <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="text-[11px] font-semibold text-ink-500">사업장</div>
                <div className="mt-1 num-mono text-lg font-bold">{factories.length}</div>
              </div>
              <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="text-[11px] font-semibold text-ink-500">공개 범위</div>
                <div className="mt-1 text-xs font-bold text-accent-700">내 회사 + 직접 연결</div>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-amber-300 bg-amber-50 p-5 shadow-control">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-800" />
              <div>
                <div className="text-xs font-bold text-amber-900">표시 범위 안내</div>
                <p className="mt-2 text-xs leading-5 text-amber-800">
                  내 회사와 직접 연결된 공급망만 표시합니다. 타 협력사 연락처, PO 단가, 내부 판단 로그는 표시하지 않습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        <SupplierInfoPreview supplierId={supplierId} self completeness={completeness} />
        </>
        )}

        {activeView === 'dashboard' && (
        <>
        <section className="grid grid-cols-4 gap-4">
          <KpiCard
            label="제출 완성도"
            value={completeness?.completionRate ?? 0}
            unit="%"
            icon={CheckCircle2}
            tone={(completeness?.completionRate ?? 0) >= 90 ? 'ok' : 'warn'}
            hint={`${completeness?.filledFieldCount ?? 0}/${completeness?.requiredFieldCount ?? 0} 항목`}
          />
          <KpiCard
            label="보완 요청"
            value={pendingRequests}
            unit="건"
            icon={AlertCircle}
            tone={pendingRequests > 0 ? 'warn' : 'ok'}
            hint="누락 항목 + 인증서"
          />
          <KpiCard
            label="현재 리스크"
            value={risk ? riskLabel[risk.riskLevel] : '미확인'}
            icon={ShieldCheck}
            tone={risk?.riskLevel === 'low' ? 'ok' : risk?.riskLevel === 'medium' ? 'warn' : 'alert'}
            hint={risk?.feocStatus === 'eligible' ? 'FEOC 적격' : 'FEOC 검토 필요'}
          />
          <KpiCard
            label="직접 연결"
            value={upstream.length + downstream.length}
            unit="개사"
            icon={Network}
            tone="info"
            hint={`상위 ${upstream.length} · 하위 ${downstream.length}`}
          />
        </section>

        <section className="grid grid-cols-[1fr_1fr] gap-4">
          <Card title="오늘 먼저 처리할 일" subtitle="제출 기한이 가까운 원청 요청만 모았습니다">
            <div className="space-y-2">
              {requestItems.slice(0, 3).map(item => {
                const { label: ddayLabel, days } = calculateDDay(item.due);
                const ddayTone = dueDateTone(days);
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => openWizardFromActionCenter(item.label, item.status)}
                    className="flex w-full items-center gap-3 rounded-xs border border-ink-700 bg-white px-3 py-3 text-left transition-colors hover:border-accent-600 hover:bg-ink-800"
                  >
                    {/* 좌: 항목명 + 기한 텍스트 */}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-ink-100">{item.label}</div>
                      <div className="mt-0.5 text-[11px] text-ink-500">
                        제출 기한 <span className="num-mono">{item.due}</span>
                      </div>
                    </div>
                    {/* 우: D-day 배지 + 상태 배지 */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge tone={ddayTone}>{ddayLabel}</Badge>
                      <Badge tone={item.tone}>{item.status}</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="내 리스크/보완 필요 항목" subtitle="내 자료 기준으로만 표시합니다">
            <div className="space-y-2">
              {missing.slice(0, 3).map(item => (
                <div key={item} className="flex items-center gap-2 rounded-xs border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
              {certifications.filter(cert => cert.status !== 'active').slice(0, 2).map(cert => {
                const { label: ddayLabel, days } = calculateDDay(cert.expiresAt);
                const { wrapperCls, badgeCls } = certDDayStyle(days);
                return (
                  <div
                    key={cert.certId}
                    className={`flex items-center justify-between gap-3 rounded-xs border px-3 py-2 text-xs ${wrapperCls}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileCheck className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span className="truncate font-semibold text-red-900">
                        {cert.certName}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-[10px] text-red-700">{certStatusLabel[cert.status]}</span>
                      <span className={`rounded-xs px-2 py-0.5 text-[11px] font-bold tabular-nums ${badgeCls}`}>
                        {ddayLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* ── 시정 조치 계획 제출 버튼 ──────────────────────────── */}
            {/* violationId를 먼저 세팅 후 모달 오픈 → 특정 위반 건과 바인딩 */}
            <button
              type="button"
              onClick={() => {
                setViolationId('VIO-2026-0042');
                setViolationModalOpen(true);
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xs border border-red-300 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-600 hover:text-white hover:border-red-600 shadow-control"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              시정 조치 계획 제출하기
            </button>
          </Card>
        </section>

        <section className="grid grid-cols-[0.9fr_1.1fr] gap-4">
          <Card title="직접 연결 공급망" subtitle="내 회사와 직접 연결된 업체만 표시합니다">
            <div className="space-y-3">
              <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="mb-2 text-xs font-bold text-ink-500">Parent / 상위 관계</div>
                {upstream.length === 0 ? (
                  <div className="rounded-xs border border-dashed border-ink-700 bg-white p-4 text-xs text-ink-500">
                    등록된 직접 상위 공급사가 없습니다.
                  </div>
                ) : upstream.map(({ edge, supplier: related }) => (
                  <RelationRow
                    key={edge.from}
                    supplier={related}
                    detail={`${edge.material} · ${edge.volume}`}
                    relation="parent"
                    selected={selectedRelatedId === related.id}
                    onSelect={() => setSelectedRelatedId(related.id)}
                  />
                ))}
              </div>
              <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="mb-2 text-xs font-bold text-ink-500">Child / 하위 관계</div>
                {downstream.map(({ edge, supplier: related }) => (
                  <RelationRow
                    key={edge.to}
                    supplier={related}
                    detail={`${edge.material} · ${edge.volume}`}
                    relation="child"
                    selected={selectedRelatedId === related.id}
                    onSelect={() => setSelectedRelatedId(related.id)}
                  />
                ))}
              </div>
            </div>
          </Card>

          <SupplierInfoPreview
            supplierId={selectedRelatedId}
            relation={
              upstream.some(({ supplier: s }) => s.id === selectedRelatedId)
                ? 'parent'
                : 'child'
            }
          />
        </section>
        </>
        )}

        {activeView === 'edit-info' && (
        <section className="grid grid-cols-[0.95fr_1.05fr] gap-4">
          <Card title="계정 설정" subtitle="비밀번호, 사업자 등록 번호, 담당자 정보를 변경 요청합니다">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '비밀번호 변경', detail: '계정 보안 정보', icon: KeyRound },
                { label: '사업자 등록 번호', detail: '원청사 승인 후 반영', icon: FileText },
                { label: '담당자 연락처', detail: primary?.email ?? '미등록', icon: Building2 },
                { label: '공장 정보', detail: `${factories.length}개 사업장`, icon: Factory },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.label} className="rounded-xs border border-ink-700 bg-white p-3 text-left transition-colors hover:border-accent-600 hover:bg-ink-800">
                    <Icon className="h-4 w-4 text-accent-700" />
                    <div className="mt-2 text-xs font-bold text-ink-100">{item.label}</div>
                    <div className="mt-0.5 text-[11px] text-ink-500">{item.detail}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="내 사업장 정보" subtitle="협력사 본인 사업장만 표시합니다">
            <div className="grid grid-cols-2 gap-3">
              {factories.map(factory => (
                <div key={factory.factoryId} className="rounded-xs border border-ink-700 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold">{factory.factoryName}</div>
                      <div className="mt-1 text-xs text-ink-500">{factory.region}</div>
                    </div>
                    <Badge tone={factory.destination === 'US' ? 'warn' : factory.destination === 'EU' ? 'ok' : 'info'}>
                      {factory.destination ?? 'KR'}
                    </Badge>
                  </div>
                  <div className="mt-3 text-[11px] leading-5 text-ink-500">
                    {factory.destinationDetail ?? '제출 대상 시장 정보 미등록'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
        )}

        {activeView === 'submit-documents' && (
        <>
        <section className="grid grid-cols-[1fr_1fr] gap-4">
          <Card title="원청 요청사항" subtitle="원청사가 협력사에 요청한 제출·보완 항목">
            <div className="space-y-2">
              {requestItems.map(item => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-ink-800 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-ink-500" />
                    <div>
                      <div className="text-xs font-semibold text-ink-100">{item.label}</div>
                      <div className="mt-0.5 text-[11px] text-ink-500">제출 기한 {item.due}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={item.tone}>{item.status}</Badge>
                    <button
                      onClick={() =>
                        item.status === '재요청'
                          ? openWizardRework(item.label)
                          : openWizard()
                      }
                      className="rounded-xs border border-accent-100 bg-white px-2.5 py-1.5 text-[11px] font-bold text-accent-700 hover:border-accent-600">
                      {item.status === '재요청' ? '재제출' : item.status === '제출 필요' ? '업로드' : '확인'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="내 제출 자료" subtitle="원청사에 제출할 자료만 표시합니다">
            <div className="space-y-2">
              {[
                { label: '원산지 증명서', status: '승인', tone: 'ok' as const },
                { label: '탄소 배출 보고서', status: '검토 중', tone: 'info' as const },
                { label: '광산 폴리곤 좌표', status: '미제출', tone: 'alert' as const },
                { label: '환경영향평가 보고서', status: '재요청', tone: 'warn' as const },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-white px-3 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-ink-500" />
                    <span className="text-xs font-semibold text-ink-100">{item.label}</span>
                  </div>
                  <Badge tone={item.tone}>{item.status}</Badge>
                </div>
              ))}
              <button
                onClick={openWizard}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xs bg-accent-700 px-4 py-3 text-xs font-bold text-white shadow-control hover:bg-accent-900">
                새 서류 업로드
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-[0.95fr_1.05fr] gap-4">
          <Card title="자료 작성 가이드" subtitle="원청사가 공유한 제출 기준만 표시합니다">
            <div className="grid grid-cols-3 gap-3">
              {guideItems.map(item => (
                <button key={item.title} className="rounded-xs border border-ink-700 bg-white p-3 text-left transition-colors hover:border-accent-600 hover:bg-ink-800">
                  <BookOpen className="h-4 w-4 text-accent-700" />
                  <div className="mt-2 text-xs font-bold text-ink-100">{item.title}</div>
                  <div className="mt-0.5 text-[11px] leading-4 text-ink-500">{item.detail}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card title="제출 기준 메모" subtitle="자료별로 자주 반려되는 항목">
            <div className="grid grid-cols-2 gap-2">
              {['좌표계 누락', '서명본 미첨부', '기간 불일치', '배출 산정 근거 부족'].map(item => (
                <div key={item} className="rounded-xs border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </section>
        </>
        )}

        {activeView === 'submission-status' && (
        <>
        <section className="grid grid-cols-[1fr_1fr] gap-4">
          {/* ── 8단계 검증 상태 Stepper ── */}
          <Card title="자료 검토 상태 타임라인" subtitle="제출됨 → 검토 중 → 보완 요청 → 최종 승인 흐름">
            <EightStageStepper
              onResubmit={(_, docName) => openWizardRework(docName)}
            />
          </Card>

          <Card title="내 제출 데이터 완성도" subtitle="필수 항목 충족률과 누락 필드">
            <div className="rounded-xs border border-ink-700 bg-ink-800 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs font-bold text-ink-500">완성도</div>
                  <div className="mt-1 num-mono text-xl font-bold text-ink-100">{completeness?.completionRate ?? 0}%</div>
                </div>
                <div className="text-right text-xs font-semibold text-ink-500">
                  {completeness?.filledFieldCount ?? 0}/{completeness?.requiredFieldCount ?? 0} 항목
                </div>
              </div>
              <div className="mt-4 h-2 rounded-xs bg-white">
                <div className="h-full rounded-xs bg-accent-700" style={{ width: `${completeness?.completionRate ?? 0}%` }} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {missing.map(item => (
                <div key={item} className="flex items-center gap-2 rounded-xs border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-[1.1fr_0.9fr] gap-4">
          <Card title="내 제출 요청" subtitle="내 회사가 원청사에 제출해야 하는 PO 기반 자료">
            <div className="space-y-2">
              {myPOs.map(po => {
                const part = parts.find(item => item.id === po.partId);
                return (
                  <div key={po.poId} className="rounded-xs border border-ink-700 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="num-mono text-xs font-bold text-ink-100">{po.originalPoNumber}</div>
                        <div className="mt-1 text-xs font-semibold">{part?.partName ?? po.partId}</div>
                        <div className="mt-1 text-[11px] text-ink-500">납기 {po.deliveryDate} · 원산지 {po.originCountry}</div>
                      </div>
                      <Badge tone={po.status === 'verified' ? 'ok' : po.status === 'delivered' ? 'neutral' : 'warn'}>
                        {po.status === 'verified' ? '검증 완료' : po.status === 'delivered' ? '납품 완료' : '제출 필요'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="검토 결과 및 재요청 사유" subtitle="원청사 검토 결과 중 내 자료에 대한 결과만 표시합니다">
            <div className="space-y-3">
              {reviewResults.map(item => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-ink-800 px-3 py-3">
                  <div>
                    <div className="text-xs font-semibold text-ink-100">{item.label}</div>
                    <div className="mt-0.5 text-[11px] text-ink-500">{item.reason}</div>
                  </div>
                  <Badge tone={item.tone}>{item.result}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </section>
        </>
        )}

        {activeView === 'supply-chain' && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <SupplyChainMap
            supplierId={supplierId}
            upstream={upstream as any}
            downstream={downstream as any}
          />
        )}

        {activeView === 'notifications' && (
        <section className="grid grid-cols-[0.95fr_1.05fr] gap-4">
          <Card title="원청사 알림" subtitle="원청사에서 보낸 요청과 안내">
            <div className="space-y-2">
              {[
                { label: '광산 폴리곤 좌표 제출 요청', date: '2026-05-21', tone: 'warn' as const },
                { label: '환경영향평가 갱신본 확인 필요', date: '2026-05-19', tone: 'warn' as const },
                { label: 'NORI-NCL-RAW 원산지 증빙 승인', date: '2026-05-16', tone: 'ok' as const },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-ink-800 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-ink-500" />
                    <span className="text-xs font-semibold text-ink-100">{item.label}</span>
                  </div>
                  <Badge tone={item.tone}>{item.date}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card title="자료 제출 기한" subtitle="다가오는 기한만 정리해서 보여줍니다">
            <div className="space-y-2">
              {requestItems.map(item => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-white px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-ink-500" />
                    <span className="text-xs font-semibold text-ink-100">{item.label}</span>
                  </div>
                  <span className="num-mono text-xs font-bold text-ink-400">{item.due}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
        )}

        <div className="rounded-sm border border-ink-700 bg-white p-4 text-xs leading-5 text-ink-500 shadow-control">
          이 협력사 화면은 전체 공급망 구조, 다른 협력사의 상세 연락처, PO 단가 비교, FEOC 세부 판정 근거, 내부 HITL 판단 로그, 감사 추적 로그, 경쟁 협력사 비교 지표를 표시하지 않습니다.
        </div>
          </div>
        </div>
      </div>

      {/* ── 자료 제출 Wizard 모달 ──────────────────────────────────────────── */}
      <SubmitWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        initialSelectedLabels={wizardInitialItems}
        reworkMode={wizardReworkMode}
        requestItems={requestItems}
      />
      {/* ── 시정 조치 계획 모달 — violation 속성으로 수정 완료 ─────── */}
      <ViolationReportModal
        open={violationModalOpen}
        onClose={() => {
          setViolationModalOpen(false);
          setViolationId(null);
        }}
        violation={violationId ? { violationId: violationId } as any : undefined}
      />
    </main>
  );
}