'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  ClipboardList,
  Factory,
  ScanLine,
  FileCheck,
  FileText,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Network,
  ShieldAlert,
  ShieldCheck,
  Send,
  Upload,
} from 'lucide-react';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';
import SubmitWizardModal from '@/components/supplier/SubmitWizardModal';
import EightStageStepper from '@/components/supplier/EightStageStepper';
import SupplyChainMap from '@/components/supplier/SupplyChainMap';
import ViolationReportModal from '@/components/supplier/ViolationReportModal';
import SelfReportModal from '@/components/supplier/SelfReportModal';
import AuditView from '@/components/supplier/AuditView';
import SupplierNotificationBell from '@/components/supplier/SupplierNotificationBell';
import AiParsingView from '@/components/supplier/AiParsingView';
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
// '내 기업 정보'(company-info) 탭 전용 — 공장/인증서를 실제 API로 연동
import {
  getSupplierEsg,
  getSupplierFactories,
  getTokenSupplierId,
  type SupplierFactory,
} from '@/lib/api';
interface MockSupplier {
  id: string; name?: string; region?: string; country?: string; 
  status?: string; role?: string; 
}

interface MockContact {
  contactId: string; name: string; role?: string; jobTitle?: string; 
  department?: string; email?: string; phone?: string; isPrimary?: boolean; 
}

interface MockFactory {
  factoryId: string; 
  factoryName: string; 
  factoryNameEn?: string; 
  destination?: string; 
  address?: string; 
  establishedAt?: string; 
  capacity?: string; 
  destinationDetail?: string; 
  applicableRegulations?: string[]; 
  factoryRole?: string; 
  region?: string; 
  operatingPeriodFrom?: string;
  operatingPeriodTo?: string;
  monthlyCapacity?: string;
}

// ─── 주인공 페르소나: S-CELL-001 (Hanyang Cell, Tier 1 배터리 셀 제조사) ─────────
// T1 시점에서 하위 공급망(Upstream) 데이터 수집 시나리오를 구현
// Upstream(원재료 공급): S-CAM-001 양극재, S-CAM-002 양극재, S-ANO-001 음극재
// Downstream(납품처): 없음 (T1이 최상위 배터리 제조사 — 원청사가 최종 납품처)
// 협력사 포털 페르소나 — 로그인 토큰의 supplier_id(백엔드 UUID)를 목 데이터 키로 해석한다.
// 데모: 한양셀 a1111111 → 'S-CELL-001'. 미로그인/미매핑이면 데모 기본값으로 폴백.
// (포털 데이터가 아직 목 기반이라 UUID↔페르소나 변환을 둔다. 실데이터 연동 시 이 맵 제거.)
const BACKEND_SUPPLIER_PERSONA: Record<string, string> = {
  'a1111111-1111-4000-8000-000000000001': 'S-CELL-001', // 한양셀 제조(주)
};
const supplierId = (() => {
  const sid = getTokenSupplierId();
  return (sid && BACKEND_SUPPLIER_PERSONA[sid]) || 'S-CELL-001';
})();

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

// ESG API는 인증서 status를 주지 않음 → 만료일 기준으로 파생 (기준일 REFERENCE_DATE)
function deriveCertStatusPortal(expiresAt: string): 'active' | 'expiring_soon' | 'expired' {
  const exp = new Date(expiresAt + 'T00:00:00').getTime();
  if (Number.isNaN(exp)) return 'active';
  const days = Math.ceil((exp - REFERENCE_DATE.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'expired';
  if (days <= 60) return 'expiring_soon';
  return 'active';
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
      wrapperCls: 'border-alert-border bg-alert-bg',
      badgeCls:   'bg-alert-solid text-white',
    };
  }
  if (days <= 30) {
    return {
      wrapperCls: 'border-alert-border bg-alert-bg',
      badgeCls:   'bg-alert-solid text-white',
    };
  }
  return {
    wrapperCls: 'border-warn-border bg-warn-bg',
    badgeCls:   'bg-warn-solid text-white',
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
  | 'ai-parsing'
  | 'submission-status'
  | 'supply-chain'
  | 'data-collection'
  | 'audit'
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
    ? 'bg-info-bg text-info-text border-info-border'
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
    { id: 'dashboard'         as const, label: '홈',         subtitle: '요약 · 우선 조치',      icon: LayoutDashboard },
    { id: 'company-info'      as const, label: '내 기업 정보', subtitle: '완성도 · 인증서 · 담당자', icon: Building2 },
    { id: 'submit-documents'  as const, label: '자료 제출',   subtitle: '요청 자료 업로드',       icon: Upload },
    { id: 'ai-parsing'        as const, label: 'AI 파싱 확인', subtitle: '추출 결과 검토 · 수정',  icon: ScanLine },
    { id: 'submission-status' as const, label: '검증 현황',   subtitle: '검토 결과 · 재요청',     icon: ClipboardList },
    { id: 'supply-chain'      as const, label: '공급망 연결',        subtitle: '직접 연결 업체',          icon: Network },
    { id: 'data-collection'   as const, label: '내 공급망 데이터 수집', subtitle: '하위 협력사 자료 요청',   icon: ClipboardList },
    { id: 'audit'             as const, label: '실사 관리',   subtitle: '현장 실사 이력 · 승인',  icon: ClipboardCheck },
    { id: 'notifications'     as const, label: '원청사 알림', subtitle: '요청 · 기한',            icon: Bell },
    { id: 'edit-info'         as const, label: '계정 설정',   subtitle: '비밀번호 · 담당자 정보', icon: KeyRound },
  ];

  // 원청 AppShell 사이드바 양식(bg-brand · 흰 텍스트 · active 흰 바 · NavLink 스타일)으로
  // 통일. 메뉴 항목·onClick 탭 전환은 협력사 그대로 유지하고 시각 양식만 맞춘다.
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-brand text-white shadow-control">
      <div className="border-b border-white/10 p-5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-white shadow-control">
            <Factory className="h-4 w-4 text-brand" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight text-white">협력사 업무공간</div>
            <div className="truncate text-[11px] text-white/55">{supplierName}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-1">
        <div className="py-2.5">
          <div className="space-y-0.5">
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
                      ? 'flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-left font-semibold bg-white text-[#11352A] transition-colors'
                      : 'flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-left font-medium bg-transparent text-white/90 transition-colors hover:bg-white/8'
                  }
                >
                  <div className={
                    active
                      ? 'flex h-8 w-8 shrink-0 items-center justify-center text-[#11352A]'
                      : 'flex h-8 w-8 shrink-0 items-center justify-center text-white/75'
                  }>
                    <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px]">{item.label}</div>
                    <div className={`truncate text-[10px] ${active ? 'text-[#11352A]/60' : 'text-white/50'}`}>{item.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="border-t border-white/10 bg-black/15 p-4 shrink-0">
        <div className="text-[11px] font-semibold text-white/50">접속 권한</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-ok-solid pulse-soft" />
          <span className="text-xs font-semibold text-white/80">내 회사 기준 보기</span>
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
  onCertRenew,
  onRequestForm,
}: {
  supplierId: string;
  self?: boolean;
  /** 로그인 기업 기준 관계 방향 — self=true이면 불필요 */
  relation?: 'parent' | 'child';
  /** ③ 완성도 데이터 — self=true일 때 프로그레스바 표시용 */
  completeness?: { completionRate: number; filledFieldCount: number; requiredFieldCount: number; missingFields: string[] } | null;
  /** ⑤ 인증서 갱신 딥링크 콜백 — 인증서명을 인자로 받아 모달 진입 */
  onCertRenew?: (certName: string) => void;
  /** 하위 협력사(child)에게 표준 양식 요청 발송 — 공급망 연결 화면 퀵액션 */
  onRequestForm?: () => void;
}) {
  const supplier = suppliers.find(item => item.id === supplierId) as unknown as MockSupplier | undefined;
  const name = getSupplierName(supplierId);
  const contacts = getContacts(supplierId) as unknown as MockContact[];
  const factories = getFactories(supplierId) as unknown as MockFactory[];
  const production = factories.filter(factory => factory.factoryRole !== 'headquarters');
  const primary = contacts.find(contact => contact.isPrimary) ?? contacts[0];
  const certs = getCertifications(supplierId);

  // 관계 라벨 — Tier 숫자 대신 가시성 기반 표시
  const relationLabel = relation === 'parent' ? '직속 상위 (Parent)' : relation === 'child' ? '직속 하위 (Child)' : null;
  const relationBadgeCls = relation === 'parent'
    ? 'bg-info-bg text-info-text border-info-border'
    : 'bg-teal-50 text-teal-700 border-teal-200';

  if (!supplier) {
    return <div className="rounded-xs border border-ink-700 bg-white p-4 text-xs text-ink-500">협력사를 찾을 수 없습니다.</div>;
  }

  // ⑥ 상태값 메타 — 존재하지 않는 키는 원문 표시
  const statusMeta = supplierStatusMeta[supplier.status] ?? { label: supplier.status, tone: 'neutral' as const };

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
        {/* ① self 모드: Tier 배지 없이 좌측 텍스트만 / 연결사 모드: 관계 라벨 + 퀵액션 우측 배치 */}
        <div className={`flex gap-4 ${self ? '' : 'items-start justify-between'}`}>
          <div className="min-w-0">
            <div className="text-xs font-bold text-ink-500">{self ? '내 기업 기본정보' : '직접 연결 업체 정보'}</div>
            <div className="mt-2 text-base font-bold text-ink-100">{name?.nameEn ?? supplier.name}</div>
            <div className="mt-1 text-xs text-ink-500">{name?.nameKo ?? supplier.role} · {supplier.region}</div>
          </div>
          {!self && (
            <div className="flex shrink-0 items-center gap-2">
              {/* 하위 협력사(child)에게만 표준 양식 요청 발송 버튼 표시 */}
              {relation === 'child' && onRequestForm && (
                <button
                  type="button"
                  onClick={onRequestForm}
                  className="inline-flex items-center gap-1.5 rounded-xs border border-accent-600 bg-accent-50 px-3 py-1.5 text-[11px] font-bold text-accent-700 hover:bg-accent-700 hover:text-white transition-colors shadow-control"
                >
                  <Send className="h-3.5 w-3.5" />
                  표준 양식 요청 발송
                </button>
              )}
              {relationLabel && (
                <span className={`rounded-xs border px-2.5 py-1.5 text-[11px] font-bold ${relationBadgeCls}`}>
                  {relationLabel}
                </span>
              )}
            </div>
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
      </div>{/* /사업장 카드 */}

      {/* 인증서 카드 */}
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
                    isInactive ? 'border-alert-border bg-alert-bg' : 'border-ink-700 bg-ink-800'
                  }`}
                >
                  {/* 인증서명 + 발급기관 */}
                  <div className="min-w-0">
                    <div className={`truncate text-xs font-semibold ${isInactive ? 'text-alert-text' : 'text-ink-100'}`}>
                      {cert.certName}
                    </div>
                    <div className="truncate text-[10px] text-ink-500">{cert.issuingBody}</div>
                  </div>
                  {/* ② D-N 배지 + ⑤ 갱신 버튼 */}
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {isInactive ? (
                      <>
                        <span className={`rounded-xs px-2 py-0.5 text-[11px] font-bold tabular-nums ${badgeCls}`}>
                          {ddayLabel}
                        </span>
                        <span className="text-[10px] text-alert-text font-medium">
                          {certStatusLabel[cert.status]}
                        </span>
                        {/* ⑤ 갱신 증빙 업로드 버튼 — self 모드 + 콜백 있을 때만 */}
                        {self && onCertRenew && (
                          <button
                            type="button"
                            onClick={() => onCertRenew(cert.certName)}
                            className="mt-0.5 inline-flex items-center gap-1 rounded-xs border border-accent-500 bg-accent-50 px-2 py-1 text-[10px] font-bold text-accent-700 transition-colors hover:bg-accent-700 hover:text-white"
                          >
                            <Upload className="h-2.5 w-2.5" />
                            갱신 증빙 업로드
                          </button>
                        )}
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
      </div>{/* /인증서 카드 */}
    </div>
  );
}

export default function SupplierPage() {
  const [activeView, setActiveView] = useState<SupplierView>('dashboard');
  const [selectedRelatedId, setSelectedRelatedId] = useState('S-CAM-001');
  // ── 자료 제출 모달 상태 ──────────────────────────────────────────────────────
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitialItems, setWizardInitialItems] = useState<string[]>([]);
  const [wizardReworkMode, setWizardReworkMode] = useState(false);
  // certRenewalMode: 인증서 갱신 진입 시 Step 1 상단에 안내 배너 표시
  const [wizardCertRenewalMode, setWizardCertRenewalMode] = useState(false);
  // reworkReason: 재제출 시 모달 Step 2 상단 배너에 표시할 반려 사유
  const [wizardReworkReason, setWizardReworkReason] = useState<string | null>(null);
  // ── 시정 조치 모달 상태 ──────────────────────────────────────────────────────
  const [violationModalOpen, setViolationModalOpen] = useState(false);
  // violationId: 특정 위반 건과 모달을 바인딩 — null이면 일반 진입
  const [violationId, setViolationId] = useState<string | null>(null);
  // ── 자진 신고 모달 상태 (기획서 E-3) ─────────────────────────────────────────
  const [selfReportOpen, setSelfReportOpen] = useState(false);
  // 5-3. 정보 수정 승인 요청 상태 — true면 company-info에 "정보 변경 검토 중" 표시
  const [isProfilePending, setIsProfilePending] = useState(false);
  // ── 공급망 연결 화면 — 선택된 노드 ID (supply-chain 뷰 상세 패널 연동) ──────
  const [selectedSupplyNodeId, setSelectedSupplyNodeId] = useState<string | null>(null);

  // ── '내 기업 정보'(company-info) 탭 전용 — 공장/인증서 실제 API 연동 ──────────
  // NOTE: supplierId는 로그인 토큰의 supplier_id(백엔드 UUID)를 페르소나로 해석한 값.
  //       실데이터 연동 전까지는 목 데이터 키(S-CELL-001 등)로 매핑해 사용한다.
  const [apiFactories, setApiFactories] = useState<MockFactory[]>([]);
  const [apiCerts, setApiCerts] = useState<{ certId: string; certName: string; issuingBody: string; status: 'active' | 'expiring_soon' | 'expired'; expiresAt: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [fac, esg] = await Promise.all([
        getSupplierFactories(supplierId).catch(() => null),
        getSupplierEsg(supplierId).catch(() => null),
      ]);
      if (cancelled) return;
      const mapFactory = (f: SupplierFactory): MockFactory => ({
        factoryId: f.factoryId,
        factoryName: f.factoryName,
        factoryNameEn: f.factoryNameEn ?? undefined,
        destination: f.destination ?? undefined,
        address: f.address ?? undefined,
        operatingPeriodFrom: f.operatingPeriodFrom,
        operatingPeriodTo: f.operatingPeriodTo ?? undefined,
        establishedAt: f.operatingPeriodFrom,
        capacity: f.monthlyCapacity ?? undefined,
        monthlyCapacity: f.monthlyCapacity ?? undefined,
        destinationDetail: f.destinationDetail ?? undefined,
        applicableRegulations: undefined,
        factoryRole: f.factoryRole,
        region: f.region,
      });
      setApiFactories((fac?.factories ?? []).filter(f => f.factoryRole !== 'headquarters').map(mapFactory));
      setApiCerts((esg?.certifications ?? []).map(c => ({
        certId: c.certId,
        certName: c.certificationType,
        issuingBody: c.issuingBody,
        status: deriveCertStatusPortal(c.expiresAt),
        expiresAt: c.expiresAt,
      })));
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── 공유 알림 상태 — GNB 벨 + 수신함 페이지 1:1 동기화 ─────────────────────
  type NotifType = 'sla_warning' | 'violation' | 'approval_needed' | 'info';
  const [notifications, setNotifications] = useState<{
    notification_id: string; notification_type: NotifType;
    subject: string; body: string; status: 'pending' | 'read';
    created_at: string; deep_link?: string;
  }[]>([
    { notification_id: 'notif-001', notification_type: 'sla_warning',
      subject: '원산지 증빙 제출 기한 임박',
      body: '광산 폴리곤 좌표 등록 요청의 마감이 3일 남았습니다. 기한 내 미제출 시 보완 요청으로 전환됩니다.',
      status: 'pending', created_at: '2026-06-08T09:30:00Z', deep_link: 'submit-documents' },
    { notification_id: 'notif-002', notification_type: 'violation',
      subject: 'EUDR 규정 위반 항목 지적',
      body: '환경영향평가 갱신본이 기준을 충족하지 않아 반려되었습니다. 시정 완료 회신 폼을 제출해 주세요.',
      status: 'pending', created_at: '2026-06-07T14:20:00Z', deep_link: 'submission-status' },
    { notification_id: 'notif-003', notification_type: 'approval_needed',
      subject: 'AI 파싱 결과 확인 요청',
      body: '업로드하신 인증서 PDF의 AI 추출 결과에서 신뢰도 낮은 항목 2건이 발견되었습니다. 검토 후 확인해 주세요.',
      status: 'read', created_at: '2026-06-06T11:05:00Z', deep_link: 'ai-parsing' },
    { notification_id: 'notif-004', notification_type: 'sla_warning',
      subject: '커뮤니티 합의서 제출 기한 안내',
      body: '커뮤니티 합의서의 제출 기한이 2026-06-25로 9일 남았습니다.',
      status: 'read', created_at: '2026-06-05T10:00:00Z', deep_link: 'submit-documents' },
  ]);
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>('notif-001');
  function markNotifRead(id: string) {
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, status: 'read' as const } : n));
  }
  function markAllNotifsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
  }

  /** 일반 업로드 버튼: 항목 미선택 상태로 Step 1 열기 */
  function openWizard() {
    setWizardInitialItems([]);
    setWizardReworkMode(false);
    setWizardOpen(true);
  }

  /** 재제출 버튼: 해당 항목 선택 + rework 모드로 Step 2 바로 열기
   *  @param label   requestItems.label과 일치하는 항목명
   *  @param reason  반려 사유 (EightStageStepper에서 전달, 모달 배너에 표시)
   */
  function openWizardRework(label: string, reason?: string) {
    setWizardInitialItems([label]);
    setWizardReworkMode(true);
    setWizardReworkReason(reason ?? null);
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

  /**
   * ⑤ 인증서 갱신 증빙 업로드 딥링크:
   * - 인증서명을 requestItems 라벨과 매핑 시도
   * - 매핑 항목이 없으면 '환경영향평가 갱신본 업로드'를 기본 선택
   * - certRenewalMode=true로 Step 1 상단에 갱신 안내 배너 표시
   */
  function openWizardFromCertRenewal(certName: string) {
    // 인증서명 → requestItems 라벨 매핑 테이블
    const certToRequestLabel: Record<string, string> = {
      'Bettercoal Verified': '환경영향평가 갱신본 업로드',
      // 추후 인증서 추가 시 여기에 확장
    };
    const targetLabel = certToRequestLabel[certName] ?? '환경영향평가 갱신본 업로드';
    setWizardInitialItems([targetLabel]);
    setWizardReworkMode(false);
    setWizardCertRenewalMode(true);
    setActiveView('submit-documents'); // 탭도 자료 제출로 이동
    setWizardOpen(true);
  }
  const supplier = suppliers.find(item => item.id === supplierId) as unknown as MockSupplier | undefined;
  const name = getSupplierName(supplierId);
  const contacts = getContacts(supplierId) as unknown as MockContact[];

  // ── 작업7-1. completeness 오버라이드 — T1 배터리 제조사 현실적 완성도 반영 ──
  const completeness = (() => {
    const raw = getCompleteness(supplierId);
    return {
      ...(raw ?? {}),
      completionRate:    81.8,
      filledFieldCount:  18,
      requiredFieldCount:22,
      // 작업7-1. T1 배터리 제조사 실무 맞춤 누락 서류 3개
      missingFields: [
        '전과정평가(LCA) 보고서',
        '분쟁광물(3TG) 미사용 선언서',
        '공급망 실사(Due Diligence) 보고서',
      ],
    };
  })();

  const risk = getRiskProfile(supplierId);
  const factories = (getFactories(supplierId) as unknown as MockFactory[]).filter(factory => factory.factoryRole !== 'headquarters');

  // ── 작업7-2. certifications 오버라이드 — 만료 임박 인증서 강제 삽입 ──
  const certifications = (() => {
    const raw = getCertifications(supplierId) ?? [];
    const injected = [
      // 기존 인증서 유지
      ...raw,
      // 만료 임박 인증서 추가 (대시보드 리스크 카드 활성화용)
      {
        certId:      'CERT-RBA-001',
        certName:    'RBA (책임있는 비즈니스 연합) 인증',
        issuingBody: 'Responsible Business Alliance',
        status:      'expiring_soon' as const,
        expiresAt:   '2026-07-05',
      },
      {
        certId:      'CERT-ISO14001-002',
        certName:    'ISO 14001 환경경영시스템',
        issuingBody: 'TÜV NORD',
        status:      'expired' as const,
        expiresAt:   '2026-05-31',
      },
    ];
    return injected;
  })();

  const myPOs = purchaseOrders.filter(po => po.supplierId === supplierId);
  // ── 공급망 방향성 (Edge Direction) ──────────────────────────────────────────
  // supplyEdge: { from: 공급자, to: 수요자(납품처) }
  // · Downstream(납품처): 내(supplierId)가 from → 내가 납품하는 쪽
  // · Upstream(공급처):   내(supplierId)가 to   → 나에게 납품하는 쪽
  //
  // S-CELL-001 (T1 배터리 셀) 시점:
  //   양극재/음극재 → 배터리 셀 → 완성차(OEM)
  //
  // ── 1-Tier 보안 마스킹: 직상위/직하위만 포함 ─────────────────────────────────
  const downstreamEdges = supplyEdges.filter(edge => edge.from === supplierId);
  const upstreamEdges   = supplyEdges.filter(edge => edge.to   === supplierId);

  // Downstream: 내가 납품하는 곳 (edge.to가 파트너)
  const downstreamFromEdges = downstreamEdges
    .map(edge => ({ edge, supplier: suppliers.find(item => item.id === edge.to) as unknown as MockSupplier | undefined }))
    .filter((item): item is { edge: typeof downstreamEdges[number]; supplier: MockSupplier } => Boolean(item.supplier));

  // Upstream: 나에게 납품하는 곳 (edge.from이 파트너)
  const upstreamFromEdges = upstreamEdges
    .map(edge => ({ edge, supplier: suppliers.find(item => item.id === edge.from) as unknown as MockSupplier | undefined }))
    .filter((item): item is { edge: typeof upstreamEdges[number]; supplier: MockSupplier } => Boolean(item.supplier));

  // Mock 보완: supplyEdges 데이터가 부족한 경우 S-CELL-001 시점 공급망 보완
  // 작업8-1. Upstream Tier 표시 보정: T1 직속 공급사이므로 표시는 T2로 강제
  const upstreamMockFallback = upstreamFromEdges.length === 0
    ? (() => {
        const mockUpstreams = [
          { id: 'S-CAM-001', material: '양극 활물질 (NCM)', volume: '320 t/월' },
          { id: 'S-CAM-002', material: '양극 활물질 (NCA)', volume: '180 t/월' },
          { id: 'S-ANO-001', material: '음극 활물질 (흑연)', volume: '95 t/월'  },
        ];
        return mockUpstreams
          .map(u => ({
            edge: { from: u.id, to: supplierId, material: u.material, volume: u.volume } as const,
            // 작업8-1: tier를 T2로 강제 오버라이드
            supplier: (() => {
              const s = suppliers.find(item => item.id === u.id) as unknown as MockSupplier | undefined;
              return s ? { ...s, tier: 2, tiers: [2] } : s;
            })() as MockSupplier | undefined,
          }))
          .filter((item): item is { edge: typeof item.edge; supplier: MockSupplier } => Boolean(item.supplier));
      })()
    : upstreamFromEdges.map(item => ({
        ...item,
        supplier: { ...item.supplier, tier: 2, tiers: [2] } as MockSupplier,
      }));

  // 작업8-2. Downstream 가상 OEM 납품처 추가 — 시각적 완결성
  const oemVirtualNode: { edge: { from: string; to: string; material: string; volume: string }; supplier: MockSupplier } = {
    edge: { from: supplierId, to: 'OEM-001', material: '배터리 셀 (전량 납품)', volume: '연 120만 셀' },
    supplier: {
      id:      'OEM-001',
      name:    'Hanyang Motor Group (원청사)',
      role:    '최종 완성차 조립 · OEM',
      region:  '대한민국 · 서울',
      country: 'KR',
      status:  'verified',
      tier:    0,
      tiers:   [0],
    } as unknown as MockSupplier,
  };
  const downstreamMockFallback = downstreamFromEdges.length === 0
    ? [oemVirtualNode]
    : [...downstreamFromEdges, oemVirtualNode];

  const upstream   = upstreamMockFallback;   // 나에게 원재료를 공급하는 쪽 (양극재, 음극재) — T2 표시
  const downstream = downstreamMockFallback; // 내가 납품하는 쪽 (OEM 완성차 — 가상 노드 포함)
  const primary = contacts.find(contact => contact.isPrimary) ?? contacts[0];

  // ── ② 담당자 직위 실무 오버라이드 (Tier 1 전환으로 CEO 등 비현실적 직위 보정) ──
  // 렌더링 레이어에서만 덮어쓰기 — 원본 데이터 변경 없음
  const contactsWithOverride = contacts.map((c, idx) => ({
    ...c,
    jobTitle:   idx === 0 ? 'ESG 컴플라이언스 팀장'  : '구매팀 파트장',
    department: idx === 0 ? 'ESG · 지속가능경영팀'    : '구매 및 공급망 관리 담당 (Purchasing & Procurement)',
    isPrimary:  idx === 0,
  }));
  const primaryOverride = contactsWithOverride[0] ?? primary;
  const missing = completeness?.missingFields ?? [];
  const certRisk = certifications.filter(cert => cert.status !== 'active').length;
  const pendingRequests = missing.length + certRisk;

  // ── 3-1. 공급망 정보 수집 요청 — 승인 완료(verified/supplier_verified) 협력사에게만 노출 ──
  const isVerified =
    supplier?.status === 'verified' || supplier?.status === 'supplier_verified';

  // 3-2. 신규 항목 스펙
  const SUPPLY_MAP_REQUEST_LABEL = 'Nori-Nickel 제품 공급망 정보 입력 요망';
  const SUPPLY_MAP_REQUEST_DUE   = '2026-06-27'; // 기준일 2026-06-13 기준 D-14

  const requestItems = [
    { label: '광산 폴리곤 좌표 등록',    due: '2026-06-16', status: '제출 필요', tone: 'warn'    as const },
    { label: '환경영향평가 갱신본 업로드', due: '2026-06-20', status: '재요청',   tone: 'alert'   as const },
    { label: '커뮤니티 합의서 제출',      due: '2026-06-25', status: '대기',     tone: 'neutral' as const },
    { label: '광권 갱신 증빙',            due: '2026-07-05', status: '대기',     tone: 'neutral' as const },
    // 3-1. 승인 완료 협력사에게만 공급망 정보 수집 요청 추가
    ...(isVerified
      ? [{ label: SUPPLY_MAP_REQUEST_LABEL, due: SUPPLY_MAP_REQUEST_DUE, status: '제출 필요', tone: 'warn' as const }]
      : []),
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
          {/* 원청 페이지 표준 헤더(PageHeader) 적용 — 제목·배지·설명·우측 액션·로그아웃 고정.
              협력사 고유 액션(오늘 날짜·알림 벨)은 actions 슬롯에 그대로 보존. */}
          <PageHeader
            title="협력사 업무공간"
            badge="내 회사 기준"
            description="내 회사 정보, 원청 요청 자료, 직접 연결된 공급망만 확인합니다."
            actions={
              <>
                <div className="flex items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-medium text-ink-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="num-mono">
                    {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}
                  </span>
                </div>
                <SupplierNotificationBell
                  notifications={notifications}
                  onMarkRead={markNotifRead}
                  onMarkAllRead={markAllNotifsRead}
                  onNavigate={(view) => setActiveView(view as SupplierView)}
                />
              </>
            }
          />

          {/* ✨ ai-parsing 뷰일 때는 꽉 찬 높이(h-calc), 아닐 때는 기존 패딩 적용 ✨ */}
          <div className={activeView === 'ai-parsing' ? 'h-[calc(100vh-82px)]' : 'space-y-6 p-8'}>
            
            {/* AI 파싱 뷰 컴포넌트 삽입 */}
            {activeView === 'ai-parsing' && (
              <AiParsingView
                supplierId={supplierId}
                onConfirmComplete={() => setActiveView('submission-status')} 
              />
            )}

        {activeView === 'company-info' && (
        <div className="space-y-5">

          {/* ── 1단계: 기업 기본 정보 헤더 (InfoGeneralSection 통합) ── */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            {/* 상단 헤더 — 로그인 협력사 + 기본 정보 통합 */}
            <div className="border-b border-ink-700 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">내 기업 기본정보</div>
                  <div className="mt-1.5 text-xl font-bold text-ink-100">
                    {name?.nameEn ?? supplier?.name}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-500">
                    {name?.nameKo} · {supplier?.region}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {supplier && (() => {
                    // 1-2. 상태별 부연 설명 툴팁 텍스트
                    const statusSubText: Record<string, string> = {
                      pending:          '최초 승인 대기 중',
                      review:           '정보 변경 검토 중',
                      supplier_verified:'원청사 승인 완료',
                      verified:         '원청사 승인 완료',
                      suspended:        '거래 중지 상태',
                      rejected:         '검토 반려됨',
                    };
                    const subText = statusSubText[supplier.status] ?? '';
                    return (
                      <div className="group relative flex flex-col items-end gap-1">
                        <Badge
                          tone={
                            supplier.status === 'supplier_verified' || supplier.status === 'verified' ? 'ok' :
                            supplier.status === 'suspended' || supplier.status === 'rejected' ? 'alert' : 'neutral'
                          }
                        >
                          {supplierStatusMeta[supplier.status]?.label ?? supplier.status}
                        </Badge>
                        {/* 부연 설명 — 항상 표시 (text-[10px]) */}
                        {subText && (
                          <span className="text-[10px] text-ink-500 leading-none">{subText}</span>
                        )}
                        {/* 호버 툴팁 — 더 상세한 설명 */}
                        <div className="pointer-events-none absolute bottom-[calc(100%+6px)] right-0 z-20 hidden whitespace-nowrap rounded-xs bg-ink-100 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                          {supplier.status === 'pending' || supplier.status === 'review'
                            ? '원청사 담당자가 내용을 검토하고 있습니다.'
                            : supplier.status === 'supplier_verified' || supplier.status === 'verified'
                            ? '원청사의 검토가 완료된 상태입니다.'
                            : '원청사에 문의하세요.'}
                          <div className="absolute right-3 top-full border-4 border-transparent border-t-ink-100" />
                        </div>
                      </div>
                    );
                  })()}
                  {/* 1-1. 기업 기본정보 수정 요청 버튼 — 5-1. edit-info로 라우팅 통일 */}
                  {/* 5-3. isProfilePending 시 배지 덮어씌우기 */}
                  {isProfilePending && (
                    <span className="inline-flex items-center gap-1 rounded-xs border border-warn-border bg-warn-bg px-2 py-1 text-[10px] font-bold text-warn-text">
                      <Clock className="h-3 w-3" />
                      정보 변경 검토 중
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveView('edit-info')}
                    className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-[10px] font-semibold text-ink-400 hover:border-accent-600 hover:text-accent-700 transition-colors"
                  >
                    수정 요청
                  </button>
                </div>
              </div>
            </div>

            {/* 기본 정보 그리드 — InfoGeneralSection 스타일 */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: '역할',     value: supplier?.role ?? '—' },
                  { label: '국가/지역', value: supplier?.region ?? '—' },
                  { label: '상태',     value: supplierStatusMeta[supplier?.status ?? '']?.label ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xs border border-ink-700 bg-ink-800 px-4 py-3">
                    <div className="text-[10px] font-bold text-ink-500">{label}</div>
                    <div className="mt-1 text-xs font-bold text-ink-100">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 2단계: 담당자 정보 (InfoContactsSection) ── */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-6 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">담당자 정보</div>
                <div className="mt-0.5 text-[10px] text-ink-500">내 계정 기준 담당자</div>
              </div>
              <div className="flex items-center gap-2">
                {/* 5-3. 정보 변경 검토 중 배지 */}
                {isProfilePending && (
                  <span className="inline-flex items-center gap-1 rounded-xs border border-warn-border bg-warn-bg px-2 py-1 text-[10px] font-bold text-warn-text">
                    <Clock className="h-3 w-3" />
                    정보 변경 검토 중
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setActiveView('edit-info')}
                  className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-[10px] font-semibold text-ink-400 hover:border-accent-600 hover:text-accent-700 transition-colors"
                >
                  수정 요청
                </button>
              </div>
            </div>
            <div className="divide-y divide-ink-800 px-6">
              {contactsWithOverride.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-500">등록된 담당자가 없습니다.</div>
              ) : contactsWithOverride.map(contact => (
                <div key={contact.contactId} className="flex items-start justify-between gap-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-sm font-bold text-accent-700">
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink-100">{contact.name}</div>
                      <div className="mt-0.5 text-[10px] text-ink-500">
                        {contact.jobTitle ?? '직책 미등록'} · {contact.department ?? '부서 미등록'}
                      </div>
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="mt-1 block text-[10px] font-semibold text-accent-700 hover:underline"
                        >
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <div className="mt-0.5 text-[10px] text-ink-500">{contact.phone}</div>
                      )}
                    </div>
                  </div>
                  {contact.isPrimary && (
                    <Badge tone="info">주 담당자</Badge>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── 3단계: 공장/사업장 정보 (InfoFactoriesSection) ── */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-6 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">내 사업장 정보</div>
                <div className="mt-0.5 text-[10px] text-ink-500">
                  {apiFactories.length}개소 · 납품처별 규제 자동
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isProfilePending && (
                  <span className="inline-flex items-center gap-1 rounded-xs border border-warn-border bg-warn-bg px-2 py-1 text-[10px] font-bold text-warn-text">
                    <Clock className="h-3 w-3" />
                    정보 변경 검토 중
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setActiveView('edit-info')}
                  className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-[10px] font-semibold text-ink-400 hover:border-accent-600 hover:text-accent-700 transition-colors"
                >
                  수정 요청
                </button>
              </div>
            </div>
            <div className="divide-y divide-ink-800 px-6">
              {apiFactories.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-500">등록된 사업장이 없습니다.</div>
              ) : apiFactories.map(factory => (
                <div key={factory.factoryId} className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-ink-100">{factory.factoryName}</div>
                      <div className="mt-0.5 text-[10px] text-ink-500">{factory.factoryNameEn ?? factory.factoryName}</div>
                    </div>
                    <Badge
                      tone={
                        factory.destination === 'US' ? 'warn' :
                        factory.destination === 'EU' ? 'ok' : 'info'
                      }
                    >
                      {factory.destination ?? 'KR'}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                    {factory.address && (
                      <div className="flex items-start gap-1.5 text-ink-500">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        {factory.address}
                      </div>
                    )}
                    {factory.establishedAt && (
                      <div className="flex items-center gap-1.5 text-ink-500">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {factory.establishedAt} ~ 현재
                      </div>
                    )}
                    {factory.capacity && (
                      <div className="text-ink-500">월 처리량: {factory.capacity}</div>
                    )}
                    {factory.destinationDetail && (
                      <div className="text-ink-500">납품 흐름: {factory.destinationDetail}</div>
                    )}
                  </div>
                  {factory.applicableRegulations && factory.applicableRegulations.length > 0 && (
                    <div className="mt-3">
                      <div className="mb-1.5 text-[10px] font-bold text-ink-500">적용 규제</div>
                      <div className="flex flex-wrap gap-1.5">
                        {factory.applicableRegulations.map(reg => (
                          <span
                            key={reg}
                            className="rounded-xs border border-accent-100 bg-accent-50 px-2 py-0.5 text-[9px] font-bold text-accent-800"
                          >
                            {regulationMeta[reg]?.label ?? reg}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── 4단계: 인증서 정보 (InfoCertsSection) ── */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-6 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">인증서</div>
                <div className="mt-0.5 text-[10px] text-ink-500">
                  {apiCerts.length}건 · 제출/검토 기준
                </div>
              </div>
              <button
                type="button"
                onClick={() => openWizardFromCertRenewal(apiCerts[0]?.certName)}
                className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-[10px] font-semibold text-ink-400 hover:border-accent-600 hover:text-accent-700 transition-colors"
              >
                수정 요청
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6">
              {apiCerts.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-xs text-ink-500">
                  등록된 인증서가 없습니다.
                </div>
              ) : apiCerts.map(cert => {
                const { label: ddayLabel, days } = calculateDDay(cert.expiresAt);
                const { wrapperCls, badgeCls } = certDDayStyle(days);
                const isExpiring = cert.status !== 'active';
                return (
                  <div
                    key={cert.certId}
                    className={`rounded-xs border p-4 ${isExpiring ? wrapperCls : 'border-ink-700 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className={`text-xs font-bold ${isExpiring ? 'text-alert-text' : 'text-ink-100'}`}>
                          {cert.certName}
                        </div>
                        <div className="mt-0.5 text-[10px] text-ink-500">{cert.issuingBody ?? '발급 기관 미등록'}</div>
                      </div>
                      <Badge tone={cert.status === 'active' ? 'ok' : cert.status === 'expiring_soon' ? 'warn' : 'alert'}>
                        {certStatusLabel[cert.status] ?? cert.status}
                      </Badge>
                    </div>
                    {isExpiring && (
                      <div className="mt-3 flex items-center justify-between">
                        <span className={`rounded-xs px-2 py-0.5 text-[10px] font-bold tabular-nums ${badgeCls}`}>
                          {ddayLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => openWizardFromCertRenewal(cert.certName)}
                          className="text-[10px] font-bold text-accent-700 hover:underline"
                        >
                          갱신 증빙 업로드
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

        </div>
        )}

        {activeView === 'dashboard' && (
        <>
        {/* ── 영역 B: 진행 현황 KPI (상단 가로 4개) ── */}
        <section className="grid grid-cols-4 gap-4">
          <div
            onClick={() => setActiveView('submit-documents')}
            className="cursor-pointer rounded-sm border border-ink-700 bg-white p-5 shadow-control transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold text-ink-500">제출 완성도</span>
              <CheckCircle2 className="h-4 w-4 text-signal-ok" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="num-mono text-3xl font-bold text-ink-100">
                {completeness?.completionRate ?? 0}
              </span>
              <span className="text-sm font-bold text-ink-400">%</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (completeness?.completionRate ?? 0) >= 90 ? 'bg-signal-ok' :
                  (completeness?.completionRate ?? 0) >= 70 ? 'bg-accent-700' : 'bg-alert-solid'
                }`}
                style={{ width: `${completeness?.completionRate ?? 0}%` }}
              />
            </div>
            <div className="mt-1.5 text-[10px] text-ink-500">
              {completeness?.filledFieldCount ?? 0}/{completeness?.requiredFieldCount ?? 0} 항목
            </div>
          </div>

          <div
            onClick={() => setActiveView('submission-status')}
            className="cursor-pointer rounded-sm border border-ink-700 bg-white p-5 shadow-control transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold text-ink-500">보완 요청</span>
              <AlertCircle className={`h-4 w-4 ${pendingRequests > 0 ? 'text-warn-text' : 'text-signal-ok'}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`num-mono text-3xl font-bold ${pendingRequests > 0 ? 'text-warn-text' : 'text-ink-100'}`}>
                {pendingRequests}
              </span>
              <span className="text-sm font-bold text-ink-400">건</span>
            </div>
            <div className="mt-3 text-[10px] text-ink-500">누락 항목 + 인증서</div>
            {pendingRequests > 0 && (
              <div className="mt-1.5 text-[10px] font-bold text-warn-text">즉시 확인 필요</div>
            )}
          </div>

          <div className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold text-ink-500">현재 리스크</span>
              <ShieldCheck className={`h-4 w-4 ${
                risk?.riskLevel === 'low' ? 'text-signal-ok' :
                risk?.riskLevel === 'medium' ? 'text-warn-text' : 'text-alert-text'
              }`} />
            </div>
            <div className={`text-2xl font-bold ${
              risk?.riskLevel === 'low' ? 'text-signal-ok' :
              risk?.riskLevel === 'medium' ? 'text-warn-text' : 'text-alert-text'
            }`}>
              {risk ? riskLabel[risk.riskLevel] : '미확인'}
            </div>
            <div className="mt-3 text-[10px] text-ink-500">
              {risk?.feocStatus === 'eligible' ? 'FEOC 적격' : 'FEOC 검토 필요'}
            </div>
          </div>

          <div
            onClick={() => setActiveView('supply-chain')}
            className="cursor-pointer rounded-sm border border-ink-700 bg-white p-5 shadow-control transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold text-ink-500">직접 연결</span>
              <Network className="h-4 w-4 text-accent-700" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="num-mono text-3xl font-bold text-ink-100">
                {upstream.length + downstream.length}
              </span>
              <span className="text-sm font-bold text-ink-400">개사</span>
            </div>
            <div className="mt-3 text-[10px] text-ink-500">
              상위 {upstream.length} · 하위 {downstream.length}
            </div>
          </div>
        </section>

        {/* ── 메인 2단: 영역 A (오늘의 할 일) + 영역 C-preview (이슈) ── */}
        <section className="grid grid-cols-[1.1fr_0.9fr] gap-4">

          {/* 영역 A: 오늘의 할 일 — 확장 테이블 */}
          <div className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">오늘의 할 일</div>
                <div className="mt-0.5 text-[10px] text-ink-500">제출 기한이 가까운 원청 요청 · 우선순위 순</div>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('notifications')}
                className="text-[10px] font-semibold text-accent-700 hover:underline"
              >
                전체 보기 →
              </button>
            </div>
            <div className="divide-y divide-ink-800">
              {requestItems.map((item, idx) => {
                const { label: ddayLabel, days } = calculateDDay(item.due);
                const isUrgent = days <= 3;
                const isWarn   = days > 3 && days <= 7;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      // 3-3. 공급망 정보 요청 항목은 본인 공급망맵 입력 화면으로 이동
                      if (item.label === SUPPLY_MAP_REQUEST_LABEL) {
                        window.location.href = `/supplier/supply-chain?supplierId=${supplierId}`;
                      } else {
                        openWizardFromActionCenter(item.label, item.status);
                      }
                    }}
                    className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ink-800/30 ${
                      isUrgent ? 'bg-alert-bg' : 'bg-white'
                    }`}
                  >
                    {/* 순서 번호 */}
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isUrgent ? 'bg-alert-bg text-alert-text' :
                      isWarn   ? 'bg-warn-bg text-warn-text' :
                                 'bg-ink-800 text-ink-400'
                    }`}>
                      {idx + 1}
                    </div>
                    {/* 항목명 + 기한 */}
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-bold ${isUrgent ? 'text-alert-text' : 'text-ink-100'}`}>
                        {item.label}
                      </div>
                      <div className="mt-0.5 text-[10px] text-ink-500">
                        제출 기한 <span className="num-mono">{item.due}</span>
                      </div>
                    </div>
                    {/* D-day + 상태 */}
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`num-mono rounded-xs border px-2 py-0.5 text-[10px] font-bold ${
                        isUrgent ? 'border-alert-border bg-alert-bg text-alert-text' :
                        isWarn   ? 'border-warn-border bg-warn-bg text-warn-text' :
                                   'border-ok-border bg-ok-bg text-ok-text'
                      }`}>
                        {ddayLabel}
                      </span>
                      <Badge tone={item.tone}>{item.status}</Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-ink-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 우측 영역 */}
          <div className="flex flex-col gap-4">

            {/* 검토 결과 요약 */}
            <div className="rounded-sm border border-ink-700 bg-white shadow-control">
              <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
                <div>
                  <div className="text-sm font-bold text-ink-100">검토 결과</div>
                  <div className="mt-0.5 text-[10px] text-ink-500">원청사 검토 결과 · 내 자료 기준</div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('submission-status')}
                  className="text-[10px] font-semibold text-accent-700 hover:underline"
                >
                  전체 보기 →
                </button>
              </div>
              <div className="divide-y divide-ink-800">
                {reviewResults.map(item => (
                  <div key={item.label} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-ink-100">{item.label}</div>
                      <div className="mt-0.5 text-[10px] text-ink-500">{item.reason}</div>
                    </div>
                    <Badge tone={item.tone}>{item.result}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* 최근 변경사항 타임라인 */}
            <div className="rounded-sm border border-ink-700 bg-white shadow-control">
              <div className="border-b border-ink-700 px-5 py-4">
                <div className="text-sm font-bold text-ink-100">최근 변경사항</div>
                <div className="mt-0.5 text-[10px] text-ink-500">제출·검토·승인 이력</div>
              </div>
              <div className="divide-y divide-ink-800">
                {reviewTimeline.map(item => (
                  <div key={item.label} className="flex items-center gap-3 px-5 py-3">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${
                      item.tone === 'ok' ? 'bg-signal-ok' :
                      item.tone === 'warn' ? 'bg-warn-solid' :
                      item.tone === 'alert' ? 'bg-alert-solid' : 'bg-accent-500'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-ink-100">{item.label}</div>
                      <div className="mt-0.5 text-[10px] text-ink-500">{item.step}</div>
                    </div>
                    <span className="num-mono shrink-0 text-[10px] text-ink-500">{item.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 영역 C: 알림 및 이슈 (하단) ── */}
        <section className="grid grid-cols-[1fr_1fr] gap-4">

          {/* 만료 인증서 + 누락 항목 */}
          <div className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">리스크 · 보완 필요 항목</div>
                <div className="mt-0.5 text-[10px] text-ink-500">만료 인증서 · 누락 항목</div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {missing.slice(0, 3).map(item => (
                <div key={item} className="flex items-center gap-2 rounded-xs border border-warn-border bg-warn-bg px-3 py-2.5 text-xs text-warn-text">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warn-text" />
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
              {certifications.filter(cert => cert.status !== 'active').slice(0, 2).map(cert => {
                const { label: ddayLabel, days } = calculateDDay(cert.expiresAt);
                const { wrapperCls, badgeCls } = certDDayStyle(days);
                return (
                  <div
                    key={cert.certId}
                    className={`flex items-center justify-between gap-3 rounded-xs border px-3 py-2.5 text-xs ${wrapperCls}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileCheck className="h-3.5 w-3.5 shrink-0 text-alert-text" />
                      <span className="truncate font-semibold text-alert-text">{cert.certName}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-[10px] text-alert-text">{certStatusLabel[cert.status]}</span>
                      <span className={`rounded-xs px-2 py-0.5 text-[11px] font-bold tabular-nums ${badgeCls}`}>
                        {ddayLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 위반 항목 + 시정 조치 */}
          <div className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">위반 · 시정 조치</div>
                <div className="mt-0.5 text-[10px] text-ink-500">규제 위반 및 대응 필요 항목</div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {reviewResults.filter(r => r.tone === 'alert' || r.tone === 'warn').map(item => (
                <div key={item.label} className={`flex items-start gap-2 rounded-xs border px-3 py-2.5 text-xs ${
                  item.tone === 'alert' ? 'border-alert-border bg-alert-bg' : 'border-warn-border bg-warn-bg'
                }`}>
                  <ShieldAlert className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${item.tone === 'alert' ? 'text-alert-text' : 'text-warn-text'}`} />
                  <div>
                    <div className={`font-bold ${item.tone === 'alert' ? 'text-alert-text' : 'text-warn-text'}`}>
                      {item.label}
                    </div>
                    <div className={`mt-0.5 ${item.tone === 'alert' ? 'text-alert-text' : 'text-warn-text'}`}>
                      {item.reason}
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setViolationId('VIO-2026-0042');
                  setViolationModalOpen(true);
                }}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xs border border-alert-border bg-alert-bg px-3 py-2.5 text-xs font-bold text-alert-text transition-colors hover:bg-alert-solid hover:text-white hover:border-alert-border shadow-control"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                시정 조치 계획 제출하기
              </button>
            </div>
          </div>
        </section>
        </>
        )}

        {activeView === 'edit-info' && (
        <div className="space-y-5">

          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink-100">계정 설정 · 정보 수정 요청</h2>
              <p className="mt-1 text-xs text-ink-500">
                변경할 내용을 입력 후 [수정 승인 요청하기]를 누르면 원청사 검토 후 반영됩니다.
              </p>
            </div>
            {/* 5-2. Primary Action 버튼 — 우측 상단 */}
            <button
              type="button"
              onClick={() => {
                // 5-3. 순차 실행: 상태 변경 → alert → 화면 복귀
                setIsProfilePending(true);
                alert('원청사에 변경 승인 요청이 전송되었습니다.');
                setActiveView('company-info');
              }}
              className="inline-flex items-center gap-2 rounded-xs bg-accent-700 px-4 py-2.5 text-xs font-bold text-white shadow-control hover:bg-accent-900 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              원청사에 수정 승인 요청하기
            </button>
          </div>

          {/* ── 기업 기본 정보 ── */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 px-6 py-4">
              <div className="text-sm font-bold text-ink-100">기업 기본 정보</div>
              <div className="mt-0.5 text-[10px] text-ink-500">회사명, 사업자 등록 번호 등 법인 정보</div>
            </div>
            <div className="grid grid-cols-2 gap-5 px-6 py-5">
              {[
                { label: '기업명 (영문)', key: 'nameEn', value: name?.nameEn ?? supplier?.name ?? '', placeholder: 'Sulawesi Nickel Mine Corp.' },
                { label: '기업명 (한글)', key: 'nameKo', value: name?.nameKo ?? '', placeholder: '술라웨시 니켈광산(주)' },
                { label: '사업자 등록 번호', key: 'bizNum', value: '', placeholder: '000-00-00000' },
                { label: '국가 / 지역', key: 'region', value: supplier?.region ?? '', placeholder: 'ID · 술라웨시' },
                { label: '대표자명', key: 'ceo', value: '', placeholder: '대표자 이름 입력' },
                { label: '본사 주소', key: 'address', value: '', placeholder: '본사 주소 입력' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-[10px] font-bold text-ink-500 mb-1.5">{field.label}</label>
                  <input
                    type="text"
                    defaultValue={field.value}
                    placeholder={field.placeholder}
                    className="w-full rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs text-ink-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 transition-colors"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ── 담당자 정보 ── */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 px-6 py-4">
              <div className="text-sm font-bold text-ink-100">주 담당자 정보</div>
              <div className="mt-0.5 text-[10px] text-ink-500">ESG 업무 담당자 연락처 및 역할</div>
            </div>
            <div className="grid grid-cols-2 gap-5 px-6 py-5">
              {[
                { label: '담당자명', key: 'name', value: primaryOverride?.name ?? '', placeholder: 'Kim ESG' },
                { label: '직책', key: 'jobTitle', value: primaryOverride?.jobTitle ?? '', placeholder: 'ESG 컴플라이언스 팀장' },
                { label: '부서', key: 'department', value: primaryOverride?.department ?? '', placeholder: 'ESG · 지속가능경영팀' },
                { label: '이메일', key: 'email', value: primaryOverride?.email ?? '', placeholder: 'esg@hanyangcell.com' },
                { label: '연락처', key: 'phone', value: primaryOverride?.phone ?? '', placeholder: '+82-10-1234-5678' },
                { label: '비밀번호 변경', key: 'password', value: '', placeholder: '새 비밀번호 (변경 시에만 입력)' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-[10px] font-bold text-ink-500 mb-1.5">{field.label}</label>
                  <input
                    type={field.key === 'password' ? 'password' : field.key === 'email' ? 'email' : 'text'}
                    defaultValue={field.value}
                    placeholder={field.placeholder}
                    className="w-full rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs text-ink-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 transition-colors"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ── 사업장 정보 ── */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 px-6 py-4">
              <div className="text-sm font-bold text-ink-100">사업장 정보</div>
              <div className="mt-0.5 text-[10px] text-ink-500">{factories.length}개소 · 납품처별 규제 자동</div>
            </div>
            <div className="divide-y divide-ink-800 px-6">
              {factories.map(factory => (
                <div key={factory.factoryId} className="py-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Factory className="h-4 w-4 text-accent-600" />
                    <span className="text-xs font-bold text-ink-100">{factory.factoryName}</span>
                    <Badge tone={factory.destination === 'US' ? 'warn' : factory.destination === 'EU' ? 'ok' : 'info'}>
                      {factory.destination === 'BOTH' ? 'EU + US' : factory.destination ?? 'KR'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: '사업장명 (영문)', value: factory.factoryNameEn ?? factory.factoryName, placeholder: 'Sulawesi Nickel Mine' },
                      { label: '주소', value: factory.address ?? '', placeholder: '사업장 주소' },
                      { label: '월 처리량', value: factory.capacity ?? '', placeholder: '예: 850 t Ni' },
                      { label: '납품 흐름', value: factory.destinationDetail ?? '', placeholder: '예: QZ 전구체 → 전 시장' },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block text-[10px] font-bold text-ink-500 mb-1.5">{f.label}</label>
                        <input
                          type="text"
                          defaultValue={f.value}
                          placeholder={f.placeholder}
                          className="w-full rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs text-ink-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 하단 Primary Action 버튼 (하단에도 배치) */}
          <div className="flex items-center justify-between rounded-xs border border-ink-700 bg-white px-5 py-4 shadow-control">
            <div className="text-[11px] text-ink-500">
              수정 요청 후 원청사 검토가 완료되면 정보가 자동으로 업데이트됩니다.
            </div>
            <button
              type="button"
              onClick={() => {
                setIsProfilePending(true);
                alert('원청사에 변경 승인 요청이 전송되었습니다.');
                setActiveView('company-info');
              }}
              className="inline-flex items-center gap-2 rounded-xs bg-accent-700 px-5 py-2.5 text-xs font-bold text-white shadow-control hover:bg-accent-900 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              원청사에 수정 승인 요청하기
            </button>
          </div>

        </div>
        )}

        {activeView === 'submit-documents' && (
        <div className="space-y-4">

          {/* ── 상태 요약 KPI ── */}
          <section className="grid grid-cols-4 gap-3">
            {[
              { label: '제출 필요', count: requestItems.filter(i => i.status === '제출 필요').length, tone: 'alert' as const },
              { label: '재요청',   count: requestItems.filter(i => i.status === '재요청').length,   tone: 'warn'  as const },
              { label: '검토 중',  count: requestItems.filter(i => i.status === '대기').length,      tone: 'info'  as const },
              { label: '승인',     count: 1,                                                          tone: 'ok'    as const },
            ].map(s => (
              <div key={s.label} className="rounded-sm border border-ink-700 bg-white px-4 py-3 shadow-control">
                <div className="text-[10px] font-bold text-ink-500">{s.label}</div>
                <div className={`num-mono mt-1 text-2xl font-bold ${
                  s.tone === 'alert' ? 'text-alert-text' :
                  s.tone === 'warn'  ? 'text-warn-text' :
                  s.tone === 'info'  ? 'text-accent-700' : 'text-signal-ok'
                }`}>{s.count}</div>
              </div>
            ))}
          </section>

          {/* ── 통합 관리 테이블 ── */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            {/* 테이블 헤더 */}
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">자료 제출 현황</div>
                <div className="mt-0.5 text-[10px] text-ink-500">
                  원청 요청사항과 제출 상태를 한눈에 — 상태값은 원청사 검토 시스템과 1:1 동기화
                </div>
              </div>
              <button
                type="button"
                onClick={openWizard}
                className="inline-flex items-center gap-1.5 rounded-xs bg-accent-700 px-3 py-2 text-xs font-bold text-white shadow-control hover:bg-accent-900 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                새 서류 업로드
              </button>
            </div>

            {/* 컬럼 헤더 */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] border-b border-ink-700 bg-ink-800 px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">
              <div>문서 항목</div>
              <div>제출 기한</div>
              <div>원청사 상태</div>
              <div>D-day</div>
              <div className="w-20 text-right">액션</div>
            </div>

            {/* 통합 데이터 행 — submission-review/page.tsx의 statusMeta와 1:1 매핑 */}
            {(() => {
              // submission-review의 statusMeta와 동일한 매핑
              const submissionStatusMeta: Record<string, { label: string; tone: 'ok' | 'warn' | 'alert' | 'info' | 'neutral' }> = {
                pending:  { label: '제출 필요', tone: 'alert'   },
                review:   { label: '검토 중',   tone: 'info'    },
                approved: { label: '승인',      tone: 'ok'      },
                rework:   { label: '보완 요청', tone: 'warn'    },
                rejected: { label: '반려',      tone: 'alert'   },
              };

              // requestItems를 submission 상태값으로 정규화
              const unifiedRows = [
                { label: '광산 폴리곤 좌표 등록',     due: '2026-06-16', submissionStatus: 'pending',  reworkReason: null, isSupplyMapRequest: false },
                { label: '환경영향평가 갱신본 업로드', due: '2026-06-20', submissionStatus: 'rework',   reworkReason: 'Scope 3 산정 근거 보완 필요', isSupplyMapRequest: false },
                { label: '원산지 증명서',              due: '2026-06-10', submissionStatus: 'approved', reworkReason: null, isSupplyMapRequest: false },
                { label: '탄소 배출 보고서',           due: '2026-06-25', submissionStatus: 'review',   reworkReason: null, isSupplyMapRequest: false },
                { label: '커뮤니티 합의서 제출',       due: '2026-06-25', submissionStatus: 'pending',  reworkReason: null, isSupplyMapRequest: false },
                { label: '광권 갱신 증빙',             due: '2026-07-05', submissionStatus: 'pending',  reworkReason: null, isSupplyMapRequest: false },
                // 3-1. 승인 완료 협력사에게만 공급망 정보 수집 요청 추가
                ...(isVerified
                  ? [{
                      label: SUPPLY_MAP_REQUEST_LABEL,
                      due: SUPPLY_MAP_REQUEST_DUE,
                      submissionStatus: 'pending',
                      reworkReason: null,
                      // 3-3. 클릭 시 폼 이동 alert를 트리거하는 플래그
                      isSupplyMapRequest: true,
                    }]
                  : []),
              ];

              return unifiedRows.map(row => {
                const meta = submissionStatusMeta[row.submissionStatus] ?? submissionStatusMeta.pending;
                const { label: ddayLabel, days } = calculateDDay(row.due);
                const isRework  = row.submissionStatus === 'rework';
                const isPending = row.submissionStatus === 'pending';
                const isActionable = isRework || isPending;
                const isApproved = row.submissionStatus === 'approved';

                return (
                  <div
                    key={row.label}
                    className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center border-b border-ink-700 px-5 py-3.5 last:border-b-0 transition-colors hover:bg-ink-800/20 ${
                      isRework ? 'bg-warn-bg' : isApproved ? 'bg-ok-bg' : ''
                    }`}
                  >
                    {/* 문서명 */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className={`h-4 w-4 shrink-0 ${
                        isRework ? 'text-warn-text' : isApproved ? 'text-signal-ok' : 'text-ink-500'
                      }`} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-ink-100 truncate">{row.label}</div>
                        {isRework && row.reworkReason && (
                          <div className="mt-0.5 text-[10px] text-warn-text truncate">
                            사유: {row.reworkReason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 제출 기한 */}
                    <div className="num-mono text-[11px] text-ink-400">{row.due}</div>

                    {/* 원청사 상태 — submission-review statusMeta와 동일 */}
                    <div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>

                    {/* D-day */}
                    <div>
                      <span className={`num-mono rounded-xs border px-2 py-0.5 text-[10px] font-bold ${
                        days < 0  ? 'border-ink-600 bg-ink-800 text-ink-400' :
                        days <= 3  ? 'border-alert-border bg-alert-bg text-alert-text' :
                        days <= 7  ? 'border-warn-border bg-warn-bg text-warn-text' :
                                     'border-ok-border bg-ok-bg text-ok-text'
                      }`}>
                        {ddayLabel}
                      </span>
                    </div>

                    {/* 액션 버튼 — rework일 때만 [재제출], pending일 때 [업로드], 나머지 비활성 */}
                    <div className="w-20 text-right">
                      {isRework ? (
                        <button
                          type="button"
                          onClick={() => openWizardRework(row.label, row.reworkReason ?? '')}
                          className="rounded-xs border border-warn-border bg-warn-bg px-2.5 py-1.5 text-[10px] font-bold text-warn-text hover:bg-warn-solid hover:text-white transition-colors"
                        >
                          재제출
                        </button>
                      ) : isPending ? (
                        <button
                          type="button"
                          onClick={() => {
                            // 3-3. 공급망 정보 요청 항목은 본인 공급망맵 입력 화면으로 이동
                            if (row.isSupplyMapRequest) {
                              window.location.href = `/supplier/supply-chain?supplierId=${supplierId}`;
                            } else {
                              openWizardFromActionCenter(row.label, '제출 필요');
                            }
                          }}
                          className={`rounded-xs border px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                            row.isSupplyMapRequest
                              ? 'border-warn-border bg-warn-bg text-warn-text hover:bg-warn-solid hover:text-white'
                              : 'border-accent-100 bg-white text-accent-700 hover:border-accent-600'
                          }`}
                        >
                          {row.isSupplyMapRequest ? '정보 입력' : '업로드'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-ink-600">—</span>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </section>

          {/* ── 가이드 아코디언 (슬림화) ── */}
          {(() => {
            const [guideOpen, setGuideOpen] = (
              // React.useState를 직접 쓸 수 없으므로 외부 상태 활용
              // 실제 구현 시 컴포넌트 상단에 const [guideOpen, setGuideOpen] = useState(false) 추가
              [false, (_: boolean) => {}]
            );
            return null; // 아래 static 아코디언으로 대체
          })()}

          <details className="group rounded-sm border border-ink-700 bg-white shadow-control">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 select-none">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent-700" />
                <div>
                  <span className="text-xs font-bold text-ink-100">자료 작성 가이드 및 제출 기준</span>
                  <span className="ml-2 text-[10px] text-ink-500">클릭하여 펼치기</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-500 transition-transform group-open:rotate-90" />
            </summary>
            <div className="border-t border-ink-700 px-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">자료 작성 가이드</div>
                  <div className="space-y-2">
                    {guideItems.map(item => (
                      <div key={item.title} className="rounded-xs border border-ink-700 bg-ink-800 px-3 py-2.5">
                        <div className="text-[11px] font-bold text-ink-100">{item.title}</div>
                        <div className="mt-0.5 text-[10px] text-ink-500">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">자주 반려되는 항목</div>
                  <div className="space-y-2">
                    {['좌표계 누락', '서명본 미첨부', '기간 불일치', '배출 산정 근거 부족'].map(item => (
                      <div key={item} className="flex items-center gap-2 rounded-xs border border-warn-border bg-warn-bg px-3 py-2 text-[11px] font-semibold text-warn-text">
                        <AlertCircle className="h-3 w-3 shrink-0 text-warn-text" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </details>

        </div>
        )}

        {activeView === 'submission-status' && (
        <div className="space-y-4">

          {/* ── 원청사 파이프라인 동기화 안내 ── */}
          <div className="flex items-center justify-between rounded-xs border border-ink-700 bg-white px-4 py-3 shadow-control">
            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-ink-100">자료 검토 상태 타임라인</div>
              <div className="text-[10px] text-ink-500">
                제출됨 → 검토 중 → 보완 요청 → 최종 승인 흐름
              </div>
              <span className="inline-flex items-center gap-1 rounded-xs border border-accent-100 bg-accent-50 px-2 py-0.5 text-[9px] font-bold text-accent-700">
                원청사 파이프라인 8단계 동기화
              </span>
            </div>
          </div>

          {/* ── EightStageStepper — 전체 가로 폭 사용 ── */}
          <section className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
            <EightStageStepper
              onResubmit={(_, requestLabel, reason) =>
                openWizardRework(requestLabel, reason)
              }
            />
          </section>

          {/* ── 하단 상세 정보 2단 ── */}
          <section className="grid grid-cols-[1.1fr_0.9fr] gap-4">

            {/* 내 제출 요청 (PO 기반) */}
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

            {/* 검토 결과 및 재요청 사유 */}
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

          {/* ── 자진 신고 배너 — SelfReportModal 연결 유지 ── */}
          <div className="flex items-center justify-between rounded-xs border border-accent-100 bg-accent-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="text-xs font-bold text-accent-800">공급원 변경 사항이 있나요?</div>
              <div className="text-[11px] text-accent-700">사후 적발 전에 자진 신고하면 리스크를 줄일 수 있습니다.</div>
            </div>
            <button
              type="button"
              onClick={() => setSelfReportOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xs border border-accent-600 bg-white px-3 py-2 text-xs font-bold text-accent-700 shadow-control hover:bg-accent-700 hover:text-white transition-colors"
            >
              공급원 변경 자진 신고
            </button>
          </div>

        </div>
        )}

        {activeView === 'audit' && (
        <AuditView supplierId={supplierId} />
        )}

        {activeView === 'supply-chain' && (() => {
          // 선택된 노드 상태 — supply-chain 뷰 내부에서 관리
          const selectedNodeSupplier = selectedSupplyNodeId
            ? suppliers.find(s => s.id === selectedSupplyNodeId)
            : null;
            
          const isDownstream = selectedSupplyNodeId
            ? downstream.some((d: typeof downstream[number]) => d.supplier.id === selectedSupplyNodeId)
            : false;

          return (
            <div className="space-y-6">
              <SupplyChainMap
                supplierId={supplierId}
                upstream={upstream as never}
                downstream={downstream as never}
                onSelectNode={(s: { id: string } | null) => setSelectedSupplyNodeId(s ? s.id : null)}
                selectedId={selectedSupplyNodeId}
              />

              {/* 선택된 노드 상세 정보 */}
              {selectedNodeSupplier && (
                <div>
                  <div className="flex items-center gap-2 mb-4 border-t border-ink-700 pt-6">
                    <ChevronRight className="h-4 w-4 text-accent-600" />
                    <span className="text-xs font-bold text-ink-300">직접 연결 업체 상세 정보</span>
                    <span className="text-[10px] text-ink-500">
                      — {getSupplierName(selectedNodeSupplier.id)?.nameEn ?? selectedNodeSupplier.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSupplyNodeId(null)}
                      className="ml-auto text-[10px] text-ink-500 hover:text-ink-200"
                    >
                      닫기 ✕
                    </button>
                  </div>
                  <SupplierInfoPreview
                    supplierId={selectedNodeSupplier.id}
                    relation={isDownstream ? 'child' : 'parent'}
                    onRequestForm={
                      isDownstream
                        ? () => {
                            // ③ 퀵액션 고도화: 발송 확인 → 데이터 수집 탭 자동 전환
                            alert('하위 협력사 양식 요청이 접수되었습니다. 수집 현황 관리 및 독촉을 위해 [내 공급망 데이터 수집] 화면으로 이동합니다.');
                            setActiveView('data-collection');
                          }
                        : undefined
                    }
                  />
                </div>
              )}
            </div>
          );
        })()}

        {activeView === 'data-collection' && (() => {
          // ── 더미 데이터 — 하위 협력사 표준 양식 요청 현황 ──────────────────
          const dataCollectionRows = [
            {
              id: 'dc-001',
              company: 'Quzhou Precursor Co., Ltd.',
              companyKo: '취저우 전구체 유한공사',
              requestDate: '2026-06-10',
              status: '제출 완료' as const,
              material: '니켈 원광',
            },
            {
              id: 'dc-002',
              company: 'Ganzhou Rare Metals Co., Ltd.',
              companyKo: '간저우 희귀금속 유한공사',
              requestDate: '2026-06-12',
              status: '작성 중' as const,
              material: '니켈 원광',
            },
            {
              id: 'dc-003',
              company: 'PT Vale Indonesia',
              companyKo: 'PT Vale 인도네시아',
              requestDate: '2026-06-14',
              status: '요청 완료' as const,
              material: '니켈 슬래그',
            },
            {
              id: 'dc-004',
              company: 'Sulawesi Mining Corp.',
              companyKo: '술라웨시 마이닝 코퍼레이션',
              requestDate: '2026-06-15',
              status: '요청 완료' as const,
              material: '혼합 니켈',
            },
          ];

          const STATUS_META = {
            '요청 완료': { tone: 'info'    as const, label: '요청 완료' },
            '작성 중':   { tone: 'warn'    as const, label: '작성 중'   },
            '제출 완료': { tone: 'ok'      as const, label: '제출 완료' },
          };

          return (
            <div className="space-y-4">
              {/* 헤더 */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-ink-100">내 공급망 데이터 수집</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    하위 협력사(2차사)에게 표준 양식 작성을 요청하고 제출 현황을 관리합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alert('선택된 미제출 하위 협력사에게 일괄 독촉 알림이 발송됩니다.')}
                  className="inline-flex items-center gap-1.5 rounded-xs border border-accent-600 bg-white px-3 py-2 text-xs font-bold text-accent-700 shadow-control hover:bg-accent-50 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  미제출 일괄 독촉
                </button>
              </div>

              {/* KPI 요약 */}
              <section className="grid grid-cols-3 gap-3">
                {[
                  { label: '전체 요청',  count: dataCollectionRows.length,                                    tone: 'neutral' as const },
                  { label: '미제출',     count: dataCollectionRows.filter(r => r.status !== '제출 완료').length, tone: 'warn'    as const },
                  { label: '제출 완료',  count: dataCollectionRows.filter(r => r.status === '제출 완료').length, tone: 'ok'      as const },
                ].map(kpi => (
                  <div key={kpi.label} className="rounded-sm border border-ink-700 bg-white px-4 py-3 shadow-control">
                    <div className="text-[10px] font-bold text-ink-500">{kpi.label}</div>
                    <div className={`num-mono mt-1 text-2xl font-bold ${
                      kpi.tone === 'ok' ? 'text-signal-ok' :
                      kpi.tone === 'warn' ? 'text-warn-text' : 'text-ink-100'
                    }`}>{kpi.count}</div>
                  </div>
                ))}
              </section>

              {/* 테이블 */}
              <section className="rounded-sm border border-ink-700 bg-white shadow-control overflow-hidden">
                {/* 컬럼 헤더 */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] border-b border-ink-700 bg-ink-800 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  <div>발송 대상</div>
                  <div>요청 자재</div>
                  <div>요청 일자</div>
                  <div>진행 상태</div>
                  <div className="w-32 text-right">액션</div>
                </div>

                {/* 데이터 행 */}
                {dataCollectionRows.map(row => {
                  const meta = STATUS_META[row.status];
                  const isSubmitted = row.status === '제출 완료';
                  return (
                    <div
                      key={row.id}
                      className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center border-b border-ink-700 px-5 py-4 last:border-b-0 transition-colors hover:bg-ink-800/20 ${
                        isSubmitted ? 'bg-ok-bg' : ''
                      }`}
                    >
                      {/* 발송 대상 */}
                      <div>
                        <div className="text-xs font-bold text-ink-100">{row.company}</div>
                        <div className="mt-0.5 text-[10px] text-ink-500">{row.companyKo}</div>
                      </div>

                      {/* 요청 자재 */}
                      <div className="text-[11px] text-ink-400">{row.material}</div>

                      {/* 요청 일자 */}
                      <div className="num-mono text-[11px] text-ink-400">{row.requestDate}</div>

                      {/* 진행 상태 */}
                      <div>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>

                      {/* 액션 */}
                      <div className="w-32 text-right">
                        {isSubmitted ? (
                          <button
                            type="button"
                            onClick={() => alert(`${row.company}의 제출 내용을 확인합니다.`)}
                            className="rounded-xs border border-accent-200 bg-accent-50 px-2.5 py-1.5 text-[10px] font-bold text-accent-700 hover:bg-accent-700 hover:text-white transition-colors"
                          >
                            내용 보기
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => alert(`${row.company}에 독촉 알림톡이 재발송되었습니다.`)}
                            className="rounded-xs border border-warn-border bg-warn-bg px-2.5 py-1.5 text-[10px] font-bold text-warn-text hover:bg-warn-solid hover:text-white transition-colors"
                          >
                            독촉 알림 재발송
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>

              {/* 안내 */}
              <p className="text-[10px] text-ink-500 leading-5">
                이 화면은 직접 연결된 하위 협력사(1-Tier Downstream)에 대한 데이터 수집 현황만 표시합니다.
                2차사 이하의 정보는 보안 정책에 따라 표시되지 않습니다.
              </p>
            </div>
          );
        })()}

        {activeView === 'notifications' && (() => {
          const NOTIF_TYPE_CONFIG = {
            sla_warning:     { barCls: 'bg-warn-solid',  iconCls: 'text-warn-text',  bgUnread: 'bg-warn-bg',  label: '기한 임박' },
            violation:       { barCls: 'bg-alert-solid',    iconCls: 'text-alert-text',    bgUnread: 'bg-alert-bg',    label: '위반 지적' },
            approval_needed: { barCls: 'bg-accent-500', iconCls: 'text-accent-600', bgUnread: 'bg-accent-50/30', label: '확인 요청' },
            info:            { barCls: 'bg-ink-500',    iconCls: 'text-ink-500',    bgUnread: 'bg-ink-800/20',   label: '안내' },
          } as const;

          const unreadCount = notifications.filter(n => n.status === 'pending').length;
          const selectedNotif = notifications.find(n => n.notification_id === selectedNotifId);

          function handleNotifSelect(id: string) {
            setSelectedNotifId(id);
            markNotifRead(id);
          }

          function formatRelTime(iso: string) {
            const diff = Date.now() - new Date(iso).getTime();
            const min = Math.floor(diff / 60000);
            if (min < 60) return `${min}분 전`;
            const hr = Math.floor(min / 60);
            if (hr < 24) return `${hr}시간 전`;
            return `${Math.floor(hr / 24)}일 전`;
          }

          const deepLinkLabel: Record<string, string> = {
            'submit-documents':  '자료 제출',
            'submission-status': '검증 현황',
            'ai-parsing':        'AI 파싱 확인',
            'supply-chain':      '공급망 연결',
            'audit':             '실사 관리',
          };

          return (
            <div className="grid grid-cols-[340px_1fr] items-start gap-4 min-h-[600px]">

              {/* 좌: 수신함 목록 */}
              <div className="rounded-sm border border-ink-700 bg-white shadow-control overflow-hidden">
                <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-ink-500" />
                    <span className="text-xs font-bold text-ink-100">원청사 알림</span>
                    {unreadCount > 0 && (
                      <span className="rounded-xs border border-alert-border bg-alert-bg px-1.5 py-0.5 text-[9px] font-bold text-alert-text">
                        미확인 {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button type="button" onClick={markAllNotifsRead} className="text-[10px] font-medium text-accent-600 hover:underline">
                      모두 읽음
                    </button>
                  )}
                </div>
                <ul className="divide-y divide-ink-800">
                  {notifications.map(notif => {
                    const cfg = NOTIF_TYPE_CONFIG[notif.notification_type];
                    const isUnread   = notif.status === 'pending';
                    const isSelected = notif.notification_id === selectedNotifId;
                    return (
                      <li key={notif.notification_id}>
                        <button
                          type="button"
                          onClick={() => handleNotifSelect(notif.notification_id)}
                          className={[
                            'relative w-full text-left px-4 py-3.5 transition-colors',
                            isSelected  ? 'bg-accent-50 ring-1 ring-inset ring-accent-400' : '',
                            !isSelected && isUnread  ? cfg.bgUnread : '',
                            !isSelected && !isUnread ? 'bg-white hover:bg-ink-800/20' : '',
                          ].join(' ')}
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r-xs ${isUnread ? cfg.barCls : 'bg-ink-700'}`} />
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className={`text-[11px] font-bold leading-snug ${isUnread ? 'text-ink-100' : 'text-ink-500'}`}>
                              {notif.subject}
                            </span>
                            {isUnread && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-alert-solid" />}
                          </div>
                          <p className="line-clamp-2 text-[10px] text-ink-500 leading-relaxed mb-1.5">{notif.body}</p>
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-semibold rounded-xs border px-1.5 py-px ${isUnread ? 'bg-ink-800 border-ink-700 text-ink-500' : 'bg-ink-900 border-ink-800 text-ink-500'}`}>
                              {cfg.label}
                            </span>
                            <span className="text-[9px] text-ink-600">{formatRelTime(notif.created_at)}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* 우: 상세 내용 패널 */}
              {selectedNotif ? (
                <div className="rounded-sm border border-ink-700 bg-white shadow-control overflow-hidden flex flex-col">
                  {/* 상세 헤더 */}
                  <div className={`border-b px-6 py-5 ${
                    selectedNotif.notification_type === 'violation'     ? 'border-alert-border bg-alert-solid' :
                    selectedNotif.notification_type === 'sla_warning'   ? 'border-warn-border bg-warn-solid' :
                                                                          'border-accent-200 bg-accent-700'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">
                          {NOTIF_TYPE_CONFIG[selectedNotif.notification_type].label}
                        </div>
                        <div className="text-base font-bold text-white leading-snug">{selectedNotif.subject}</div>
                      </div>
                      <span className="shrink-0 rounded-xs border border-white/30 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                        {selectedNotif.status === 'pending' ? '미확인' : '읽음'}
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] text-white/60">{formatRelTime(selectedNotif.created_at)}</div>
                  </div>

                  {/* 본문 */}
                  <div className="flex-1 px-6 py-6">
                    <div className="mb-4 text-[10px] font-bold uppercase tracking-wider text-ink-500">메시지 본문</div>
                    <p className="rounded-xs border border-ink-700 bg-ink-800 px-4 py-4 text-xs leading-6 text-ink-200">
                      {selectedNotif.body}
                    </p>
                    <div className="mt-5 rounded-xs border border-ink-700 bg-white p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500 mb-3">관련 정보</div>
                      <div className="space-y-2 text-[11px]">
                        {[
                          ['발신', '원청사 ESG 담당팀'],
                          ['수신', '내 회사 담당자'],
                          ['유형', NOTIF_TYPE_CONFIG[selectedNotif.notification_type].label],
                          ...(selectedNotif.deep_link ? [['관련 탭', deepLinkLabel[selectedNotif.deep_link] ?? selectedNotif.deep_link]] : []),
                        ].map(([k, v]) => (
                          <div key={k} className="flex gap-3">
                            <span className="w-16 shrink-0 font-bold text-ink-500">{k}</span>
                            <span className={`font-semibold ${k === '유형' ? NOTIF_TYPE_CONFIG[selectedNotif.notification_type].iconCls : 'text-ink-200'}`}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 하단 CTA */}
                  <div className="border-t border-ink-700 bg-ink-800/20 px-6 py-4 flex items-center justify-between gap-3">
                    <div className="text-[10px] text-ink-500">
                      이 알림과 관련된 자료를 즉시 제출하거나 해당 화면으로 이동할 수 있습니다.
                    </div>
                    {selectedNotif.deep_link && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedNotif.deep_link === 'submit-documents') {
                            openWizardFromActionCenter(selectedNotif.subject, '제출 필요');
                          } else {
                            setActiveView(selectedNotif.deep_link as SupplierView);
                          }
                        }}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xs bg-accent-700 px-4 py-2.5 text-xs font-bold text-white shadow-control hover:bg-accent-900 transition-colors"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        {selectedNotif.deep_link === 'submit-documents' ? '해당 자료 제출하러 가기' : `${deepLinkLabel[selectedNotif.deep_link] ?? '관련 화면'} 바로 가기`}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-ink-700 bg-white py-16 text-center">
                  <Bell className="h-10 w-10 text-ink-600" strokeWidth={1.2} />
                  <div className="text-xs font-semibold text-ink-500">좌측에서 알림을 선택하세요</div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 푸터 — ai-parsing 전체화면 모드일 때 숨김 (작업 몰입도 확보) */}
        {activeView !== 'ai-parsing' && (
          <div className="rounded-sm border border-ink-700 bg-white p-4 text-xs leading-5 text-ink-500 shadow-control">
            이 협력사 화면은 전체 공급망 구조, 다른 협력사의 상세 연락처, PO 단가 비교, FEOC 세부 판정 근거, 내부 HITL 판단 로그, 감사 추적 로그, 경쟁 협력사 비교 지표를 표시하지 않습니다.
          </div>
        )}
          </div>
        </div>
      </div>

      {/* ── 자료 제출 Wizard 모달 ──────────────────────────────────────────── */}
      <SubmitWizardModal
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setWizardCertRenewalMode(false);
          setWizardReworkReason(null);
        }}
        initialSelectedLabels={wizardInitialItems}
        reworkMode={wizardReworkMode}
        reworkReason={wizardReworkReason ?? undefined}
        certRenewalMode={wizardCertRenewalMode}
        requestItems={requestItems}
        supplierId={supplierId}
        onSubmitComplete={() => {
          // 자료 제출 완료 → AI 파싱 확인 탭으로 자동 이동
          setWizardOpen(false);
          setWizardCertRenewalMode(false);
          setWizardReworkReason(null);
          setActiveView('ai-parsing');
        }}
      />
      {/* ── 시정 조치 계획 모달 — violationId로 특정 위반 건 바인딩 ─────── */}
      <ViolationReportModal
        open={violationModalOpen}
        onClose={() => {
          setViolationModalOpen(false);
          setViolationId(null);
        }}
        {...(violationId !== null && { violationId })}
      />
      {/* 자진 신고 모달 — 기획서 E-3 */}
      <SelfReportModal
        open={selfReportOpen}
        onClose={() => setSelfReportOpen(false)}
      />
    </main>
  );
}
// 주석test