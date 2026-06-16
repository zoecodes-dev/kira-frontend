'use client';

import { useState } from 'react';
import Link from 'next/link';
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

// ─── 1. 타입 정의 (에러 해결) ────────────────────────────────────────────────────────
interface Contact {
  contactId: string;
  name: string;
  jobTitle?: string;
  department?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

interface Factory {
  factoryId: string; 
  factoryName: string; 
  factoryNameEn?: string; 
  destination?: 'US' | 'EU' | 'KR' | 'BOTH'; 
  address?: string; 
  operatingPeriodFrom?: string; 
  operatingPeriodTo?: string; 
  establishedAt?: string;
  capacity?: string;
  destinationDetail?: string;
  applicableRegulations?: string[];
}

type SupplierStatus = 'verified' | 'suspended' | 'rejected' | 'supplier_verified' | 'pending' | 'review';

// ─── 2. 상수 매핑 정의 (에러 해결) ───────────────────────────────────────────────────
const STATUS_TONE_MAP: Record<string, 'ok' | 'alert' | 'neutral'> = {
  verified: 'ok',
  supplier_verified: 'ok',
  suspended: 'alert',
  rejected: 'alert',
  pending: 'neutral',
  review: 'neutral'
};

const DESTINATION_TONE_MAP: Record<string, 'warn' | 'ok' | 'info'> = {
  US: 'warn',
  EU: 'ok',
  KR: 'info',
};

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

const supplierId = 'S-MINE-001';

// ─── D-Day 계산 유틸 ──────────────────────────────────────────────────────────
const REFERENCE_DATE = new Date('2026-06-13T00:00:00');

function calculateDDay(expiresAt: string): { label: string; days: number } {
  const expiry = new Date(expiresAt + 'T00:00:00');
  const diffMs = expiry.getTime() - REFERENCE_DATE.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: '만료됨', days };
  if (days === 0) return { label: 'D-Day', days };
  return { label: `D-${days}`, days };
}

function certDDayStyle(days: number): {
  wrapperCls: string;
  badgeCls: string;
} {
  if (days <= 7) {
    return { wrapperCls: 'border-red-300 bg-red-50', badgeCls: 'bg-red-600 text-white' };
  }
  if (days <= 30) {
    return { wrapperCls: 'border-red-200 bg-red-50', badgeCls: 'bg-red-500 text-white' };
  }
  return { wrapperCls: 'border-amber-300 bg-amber-50', badgeCls: 'bg-amber-500 text-white' };
}

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
    { id: 'supply-chain'      as const, label: '공급망 연결', subtitle: '직접 연결 업체',         icon: Network },
    { id: 'audit'             as const, label: '실사 관리',   subtitle: '현장 실사 이력 · 승인',  icon: ClipboardCheck },
    { id: 'notifications'     as const, label: '원청사 알림', subtitle: '요청 · 기한',            icon: Bell },
    { id: 'edit-info'         as const, label: '계정 설정',   subtitle: '비밀번호 · 담당자 정보', icon: KeyRound },
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

// 기존 SupplierInfoPreview (변경점 없음)
function SupplierInfoPreview({
  supplierId,
  self = false,
  relation,
  completeness,
  onCertRenew,
}: {
  supplierId: string;
  self?: boolean;
  relation?: 'parent' | 'child';
  completeness?: { completionRate: number; filledFieldCount: number; requiredFieldCount: number; missingFields: string[] } | null;
  onCertRenew?: (certName: string) => void;
}) {
  const supplier = suppliers.find(item => item.id === supplierId);
  const name = getSupplierName(supplierId);
  const contacts = getContacts(supplierId);
  const factories = getFactories(supplierId);
  const production = factories.filter(factory => factory.factoryRole !== 'headquarters');
  const primary = contacts.find(contact => contact.isPrimary) ?? contacts[0];
  const certs = getCertifications(supplierId);

  const relationLabel = relation === 'parent' ? '직속 상위 (Parent)' : relation === 'child' ? '직속 하위 (Child)' : null;
  const relationBadgeCls = relation === 'parent'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-teal-50 text-teal-700 border-teal-200';

  if (!supplier) {
    return <div className="rounded-xs border border-ink-700 bg-white p-4 text-xs text-ink-500">협력사를 찾을 수 없습니다.</div>;
  }

  const statusMeta = supplierStatusMeta[supplier.status] ?? { label: supplier.status, tone: 'neutral' as const };

  return (
    <div className="space-y-4">
      {/* ... Info Preview 내부 코드 동일 (생략 최소화를 위해 유지) ... */}
      <div className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
        <div className={`flex gap-4 ${self ? '' : 'items-start justify-between'}`}>
          <div className="min-w-0">
            <div className="text-xs font-bold text-ink-500">{self ? '내 기업 기본정보' : '직접 연결 업체 정보'}</div>
            <div className="mt-2 text-base font-bold text-ink-100">{name?.nameEn ?? supplier.name}</div>
            <div className="mt-1 text-xs text-ink-500">{name?.nameKo ?? supplier.role} · {supplier.region}</div>
          </div>
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
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink-700">
            <div>
              <div className="text-xs font-bold text-ink-100">{self ? '담당자 정보' : '공개 담당 창구'}</div>
              <div className="mt-0.5 text-[11px] text-ink-500">{self ? '내 계정 기준 담당자' : '직접 연결 업무에 필요한 범위만 표시'}</div>
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
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {isInactive ? (
                      <>
                        <span className={`rounded-xs px-2 py-0.5 text-[11px] font-bold tabular-nums ${badgeCls}`}>
                          {ddayLabel}
                        </span>
                        <span className="text-[10px] text-red-600 font-medium">
                          {certStatusLabel[cert.status]}
                        </span>
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
      </div>
    </div>
  );
}

export default function SupplierPage() {
  const [activeView, setActiveView] = useState<SupplierView>('dashboard');
  const [selectedRelatedId, setSelectedRelatedId] = useState('S-PRE-001');

  // ── 자료 제출 및 각종 모달 상태 ──
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitialItems, setWizardInitialItems] = useState<string[]>([]);
  const [wizardReworkMode, setWizardReworkMode] = useState(false);
  const [wizardCertRenewalMode, setWizardCertRenewalMode] = useState(false);
  const [wizardReworkReason, setWizardReworkReason] = useState<string | null>(null);

  const [violationModalOpen, setViolationModalOpen] = useState(false);
  const [violationId, setViolationId] = useState<string | null>(null);
  const [selfReportOpen, setSelfReportOpen] = useState(false);

  // ─── 공유 알림 상태 (클로드 작업본 병합) ───
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

  // ── 기능 함수들 ──
  function openWizard() {
    setWizardInitialItems([]);
    setWizardReworkMode(false);
    setWizardOpen(true);
  }

  function openWizardRework(label: string, reason?: string) {
    setWizardInitialItems([label]);
    setWizardReworkMode(true);
    setWizardReworkReason(reason ?? null);
    setWizardOpen(true);
  }

  function openWizardFromActionCenter(label: string, status: string) {
    const isRework = status === '재요청';
    setWizardInitialItems([label]);
    setWizardReworkMode(isRework);
    setWizardOpen(true);
  }

  function openWizardFromCertRenewal(certName: string) {
    const certToRequestLabel: Record<string, string> = {
      'Bettercoal Verified': '환경영향평가 갱신본 업로드',
    };
    const targetLabel = certToRequestLabel[certName] ?? '환경영향평가 갱신본 업로드';
    setWizardInitialItems([targetLabel]);
    setWizardReworkMode(false);
    setWizardCertRenewalMode(true);
    setActiveView('submit-documents');
    setWizardOpen(true);
  }

  // ── 데이터 준비 ──
  const supplier = suppliers.find(item => item.id === supplierId);
  const name = getSupplierName(supplierId);
  const contacts = getContacts(supplierId);
  const completeness = getCompleteness(supplierId);
  const risk = getRiskProfile(supplierId);
  const factories = getFactories(supplierId).filter(factory => factory.factoryRole !== 'headquarters');
  const certifications = getCertifications(supplierId);
  const myPOs = purchaseOrders.filter(po => po.supplierId === supplierId);

  // ── 공급망 방향성 필터링 (클로드 작업본 병합) ──
  const downstreamEdges = supplyEdges.filter(edge => edge.from === supplierId);
  const upstreamEdges   = supplyEdges.filter(edge => edge.to   === supplierId);

  const downstreamFromEdges = downstreamEdges
    .map(edge => ({ edge, supplier: suppliers.find(item => item.id === edge.to) }))
    .filter((item): item is { edge: typeof downstreamEdges[number]; supplier: NonNullable<typeof supplier> } => Boolean(item.supplier));

  const upstreamFromEdges = upstreamEdges
    .map(edge => ({ edge, supplier: suppliers.find(item => item.id === edge.from) }))
    .filter((item): item is { edge: typeof upstreamEdges[number]; supplier: NonNullable<typeof supplier> } => Boolean(item.supplier));

  const downstreamMockFallback = downstreamFromEdges.length === 0
    ? (() => {
        const downstreamSupplier = suppliers.find(item => item.id === 'S-PRE-001');
        if (!downstreamSupplier) return [];
        return [{
          edge: { from: supplierId, to: 'S-PRE-001', material: '니켈 원광', volume: '21,000 kg/월' } as const,
          supplier: downstreamSupplier,
        }];
      })()
    : downstreamFromEdges;

  const upstream   = upstreamFromEdges;
  const downstream = downstreamMockFallback;

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

  return (
    <main className="min-h-screen bg-[#F4F7F9] text-ink-100">
      <div className="flex min-h-screen">
        <SupplierSidebar
          supplierName={name?.shortNameKo ?? name?.shortNameEn ?? supplier?.name ?? supplierId}
          activeView={activeView}
          onSelect={setActiveView}
        />
        <div className="min-w-0 flex-1">
          <header className="shrink-0 border-b border-ink-700 bg-white px-8 py-5 shadow-control">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
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
              
              {/* 클로드 작업본 병합: SupplierNotificationBell 연동 부분 */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-bold text-ink-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}
                </div>
                <SupplierNotificationBell
                  notifications={notifications}
                  onMarkRead={markNotifRead}
                  onMarkAllRead={markAllNotifsRead}
                  onNavigate={(view) => setActiveView(view as any)}
                />
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  로그아웃
                </Link>
              </div>
            </div>
          </header>

          <div className={activeView === 'ai-parsing' ? 'h-[calc(100vh-82px)]' : 'space-y-6 p-8'}>
            
            {activeView === 'ai-parsing' && (
              <AiParsingView
                supplierId={supplierId}
                onConfirmComplete={() => setActiveView('submission-status')} 
              />
            )}

        {/* 안정본 텍스트 병합: (contact: Contact), DESTINATION_TONE_MAP 등이 포함된 company-info 뷰 */}
        {activeView === 'company-info' && (
        <div className="space-y-5">
          {/* 기업 기본 정보 */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
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
                <div className="flex items-center gap-2">
                  {supplier && (
                    <Badge tone={supplierStatusMeta[supplier.status]?.tone ?? 'neutral'}>
                      {supplierStatusMeta[supplier.status]?.label ?? supplier.status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
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

          {/* 담당자 정보 (타입 명시 병합 적용) */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-6 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">담당자 정보</div>
                <div className="mt-0.5 text-[10px] text-ink-500">내 계정 기준 담당자</div>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('edit-info')}
                className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-[10px] font-semibold text-ink-400 hover:border-accent-600 hover:text-accent-700 transition-colors"
              >
                수정 요청
              </button>
            </div>
            <div className="divide-y divide-ink-800 px-6">
              {contacts.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-500">등록된 담당자가 없습니다.</div>
              ) : contacts.map((contact: Contact) => (
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

          {/* 사업장 정보 (타입 명시 & DESTINATION_TONE_MAP 병합 적용) */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-6 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">내 사업장 정보</div>
                <div className="mt-0.5 text-[10px] text-ink-500">
                  {factories.length}개소 · 납품처별 규제 자동
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('edit-info')}
                className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-[10px] font-semibold text-ink-400 hover:border-accent-600 hover:text-accent-700 transition-colors"
              >
                수정 요청
              </button>
            </div>
            <div className="divide-y divide-ink-800 px-6">
              {factories.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-500">등록된 사업장이 없습니다.</div>
              ) : factories.map((factory: Factory) => (
                <div key={factory.factoryId} className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-ink-100">{factory.factoryName}</div>
                      <div className="mt-0.5 text-[10px] text-ink-500">{factory.factoryNameEn ?? factory.factoryName}</div>
                    </div>
                    <Badge tone={DESTINATION_TONE_MAP[factory.destination ?? ''] || 'info'}>
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
                    <div className="mt-3 border-t border-ink-700 pt-3">
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

          {/* 인증서 정보 */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-6 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">인증서</div>
                <div className="mt-0.5 text-[10px] text-ink-500">
                  {certifications.length}건 · 제출/검토 기준
                </div>
              </div>
              <button
                type="button"
                onClick={() => openWizardFromCertRenewal(certifications[0]?.certName)}
                className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-[10px] font-semibold text-ink-400 hover:border-accent-600 hover:text-accent-700 transition-colors"
              >
                수정 요청
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6">
              {certifications.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-xs text-ink-500">
                  등록된 인증서가 없습니다.
                </div>
              ) : certifications.map(cert => {
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
                        <div className={`text-xs font-bold ${isExpiring ? 'text-red-900' : 'text-ink-100'}`}>
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

          <p className="text-[10px] text-ink-500 leading-5">
            이 화면은 내 회사와 직접 연결된 공급망만 표시합니다.
            타 협력사 연락처, PO 단가, FEOC 세부 판정 근거, 내부 HITL 판단 로그는 표시하지 않습니다.
          </p>

        </div>
        )}

        {/* ── 기타 뷰들은 기존과 동일 ── */}
        {activeView === 'dashboard' && (
        <>
        <section className="grid grid-cols-4 gap-4">
          <div onClick={() => setActiveView('submit-documents')} className="cursor-pointer rounded-sm border border-ink-700 bg-white p-5 shadow-control transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold text-ink-500">제출 완성도</span>
              <CheckCircle2 className="h-4 w-4 text-signal-ok" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="num-mono text-3xl font-bold text-ink-100">{completeness?.completionRate ?? 0}</span>
              <span className="text-sm font-bold text-ink-400">%</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
              <div className={`h-full rounded-full transition-all duration-500 ${(completeness?.completionRate ?? 0) >= 90 ? 'bg-signal-ok' : (completeness?.completionRate ?? 0) >= 70 ? 'bg-accent-700' : 'bg-red-500'}`} style={{ width: `${completeness?.completionRate ?? 0}%` }} />
            </div>
            <div className="mt-1.5 text-[10px] text-ink-500">{completeness?.filledFieldCount ?? 0}/{completeness?.requiredFieldCount ?? 0} 항목</div>
          </div>

          <div onClick={() => setActiveView('submission-status')} className="cursor-pointer rounded-sm border border-ink-700 bg-white p-5 shadow-control transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold text-ink-500">보완 요청</span>
              <AlertCircle className={`h-4 w-4 ${pendingRequests > 0 ? 'text-amber-500' : 'text-signal-ok'}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`num-mono text-3xl font-bold ${pendingRequests > 0 ? 'text-amber-600' : 'text-ink-100'}`}>{pendingRequests}</span>
              <span className="text-sm font-bold text-ink-400">건</span>
            </div>
            <div className="mt-3 text-[10px] text-ink-500">누락 항목 + 인증서</div>
            {pendingRequests > 0 && <div className="mt-1.5 text-[10px] font-bold text-amber-600">즉시 확인 필요</div>}
          </div>

          <div className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold text-ink-500">현재 리스크</span>
              <ShieldCheck className={`h-4 w-4 ${risk?.riskLevel === 'low' ? 'text-signal-ok' : risk?.riskLevel === 'medium' ? 'text-amber-500' : 'text-red-500'}`} />
            </div>
            <div className={`text-2xl font-bold ${risk?.riskLevel === 'low' ? 'text-signal-ok' : risk?.riskLevel === 'medium' ? 'text-amber-600' : 'text-red-600'}`}>
              {risk ? riskLabel[risk.riskLevel] : '미확인'}
            </div>
            <div className="mt-3 text-[10px] text-ink-500">{risk?.feocStatus === 'eligible' ? 'FEOC 적격' : 'FEOC 검토 필요'}</div>
          </div>

          <div onClick={() => setActiveView('supply-chain')} className="cursor-pointer rounded-sm border border-ink-700 bg-white p-5 shadow-control transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold text-ink-500">직접 연결</span>
              <Network className="h-4 w-4 text-accent-700" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="num-mono text-3xl font-bold text-ink-100">{upstream.length + downstream.length}</span>
              <span className="text-sm font-bold text-ink-400">개사</span>
            </div>
            <div className="mt-3 text-[10px] text-ink-500">상위 {upstream.length} · 하위 {downstream.length}</div>
          </div>
        </section>

        <section className="grid grid-cols-[1.1fr_0.9fr] gap-4">
          <div className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">오늘의 할 일</div>
                <div className="mt-0.5 text-[10px] text-ink-500">제출 기한이 가까운 원청 요청 · 우선순위 순</div>
              </div>
              <button type="button" onClick={() => setActiveView('notifications')} className="text-[10px] font-semibold text-accent-700 hover:underline">
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
                    onClick={() => openWizardFromActionCenter(item.label, item.status)}
                    className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ink-800/30 ${isUrgent ? 'bg-red-50/30' : 'bg-white'}`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isUrgent ? 'bg-red-100 text-red-600' : isWarn ? 'bg-amber-100 text-amber-700' : 'bg-ink-800 text-ink-400'}`}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-bold ${isUrgent ? 'text-red-700' : 'text-ink-100'}`}>{item.label}</div>
                      <div className="mt-0.5 text-[10px] text-ink-500">제출 기한 <span className="num-mono">{item.due}</span></div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`num-mono rounded-xs border px-2 py-0.5 text-[10px] font-bold ${isUrgent ? 'border-red-200 bg-red-50 text-red-600' : isWarn ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
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

          <div className="flex flex-col gap-4">
            <div className="rounded-sm border border-ink-700 bg-white shadow-control">
              <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
                <div>
                  <div className="text-sm font-bold text-ink-100">검토 결과</div>
                  <div className="mt-0.5 text-[10px] text-ink-500">원청사 검토 결과 · 내 자료 기준</div>
                </div>
                <button type="button" onClick={() => setActiveView('submission-status')} className="text-[10px] font-semibold text-accent-700 hover:underline">전체 보기 →</button>
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

            <div className="rounded-sm border border-ink-700 bg-white shadow-control">
              <div className="border-b border-ink-700 px-5 py-4">
                <div className="text-sm font-bold text-ink-100">최근 변경사항</div>
                <div className="mt-0.5 text-[10px] text-ink-500">제출·검토·승인 이력</div>
              </div>
              <div className="divide-y divide-ink-800">
                {reviewTimeline.map(item => (
                  <div key={item.label} className="flex items-center gap-3 px-5 py-3">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${item.tone === 'ok' ? 'bg-signal-ok' : item.tone === 'warn' ? 'bg-amber-400' : item.tone === 'alert' ? 'bg-red-500' : 'bg-accent-500'}`} />
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

        <section className="grid grid-cols-[1fr_1fr] gap-4">
          <div className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">리스크 · 보완 필요 항목</div>
                <div className="mt-0.5 text-[10px] text-ink-500">만료 인증서 · 누락 항목</div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {missing.slice(0, 3).map(item => (
                <div key={item} className="flex items-center gap-2 rounded-xs border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
              {certifications.filter(cert => cert.status !== 'active').slice(0, 2).map(cert => {
                const { label: ddayLabel, days } = calculateDDay(cert.expiresAt);
                const { wrapperCls, badgeCls } = certDDayStyle(days);
                return (
                  <div key={cert.certId} className={`flex items-center justify-between gap-3 rounded-xs border px-3 py-2.5 text-xs ${wrapperCls}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <FileCheck className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span className="truncate font-semibold text-red-900">{cert.certName}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-[10px] text-red-700">{certStatusLabel[cert.status]}</span>
                      <span className={`rounded-xs px-2 py-0.5 text-[11px] font-bold tabular-nums ${badgeCls}`}>{ddayLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">위반 · 시정 조치</div>
                <div className="mt-0.5 text-[10px] text-ink-500">규제 위반 및 대응 필요 항목</div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {reviewResults.filter(r => r.tone === 'alert' || r.tone === 'warn').map(item => (
                <div key={item.label} className={`flex items-start gap-2 rounded-xs border px-3 py-2.5 text-xs ${item.tone === 'alert' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                  <ShieldAlert className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${item.tone === 'alert' ? 'text-red-500' : 'text-amber-500'}`} />
                  <div>
                    <div className={`font-bold ${item.tone === 'alert' ? 'text-red-900' : 'text-amber-900'}`}>{item.label}</div>
                    <div className={`mt-0.5 ${item.tone === 'alert' ? 'text-red-700' : 'text-amber-700'}`}>{item.reason}</div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => { setViolationId('VIO-2026-0042'); setViolationModalOpen(true); }}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xs border border-red-300 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-600 hover:text-white hover:border-red-600 shadow-control"
              >
                <ShieldAlert className="h-3.5 w-3.5" /> 시정 조치 계획 제출하기
              </button>
            </div>
          </div>
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
        <div className="space-y-4">
          <section className="grid grid-cols-4 gap-3">
            {[
              { label: '제출 필요', count: requestItems.filter(i => i.status === '제출 필요').length, tone: 'alert' as const },
              { label: '재요청',   count: requestItems.filter(i => i.status === '재요청').length,   tone: 'warn'  as const },
              { label: '검토 중',  count: requestItems.filter(i => i.status === '대기').length,      tone: 'info'  as const },
              { label: '승인',     count: 1,                                                          tone: 'ok'    as const },
            ].map(s => (
              <div key={s.label} className="rounded-sm border border-ink-700 bg-white px-4 py-3 shadow-control">
                <div className="text-[10px] font-bold text-ink-500">{s.label}</div>
                <div className={`num-mono mt-1 text-2xl font-bold ${s.tone === 'alert' ? 'text-red-600' : s.tone === 'warn' ? 'text-amber-600' : s.tone === 'info' ? 'text-accent-700' : 'text-signal-ok'}`}>{s.count}</div>
              </div>
            ))}
          </section>

          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">자료 제출 현황</div>
                <div className="mt-0.5 text-[10px] text-ink-500">원청 요청사항과 제출 상태를 한눈에 — 상태값은 원청사 검토 시스템과 1:1 동기화</div>
              </div>
              <button type="button" onClick={openWizard} className="inline-flex items-center gap-1.5 rounded-xs bg-accent-700 px-3 py-2 text-xs font-bold text-white shadow-control hover:bg-accent-900 transition-colors">
                <Upload className="h-3.5 w-3.5" /> 새 서류 업로드
              </button>
            </div>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] border-b border-ink-700 bg-ink-800 px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">
              <div>문서 항목</div><div>제출 기한</div><div>원청사 상태</div><div>D-day</div><div className="w-20 text-right">액션</div>
            </div>
            {(() => {
              const submissionStatusMeta: Record<string, { label: string; tone: 'ok' | 'warn' | 'alert' | 'info' | 'neutral' }> = {
                pending:  { label: '제출 필요', tone: 'alert'   },
                review:   { label: '검토 중',   tone: 'info'    },
                approved: { label: '승인',      tone: 'ok'      },
                rework:   { label: '보완 요청', tone: 'warn'    },
                rejected: { label: '반려',      tone: 'alert'   },
              };

              const unifiedRows = [
                { label: '광산 폴리곤 좌표 등록',     due: '2026-06-16', submissionStatus: 'pending',  reworkReason: null },
                { label: '환경영향평가 갱신본 업로드', due: '2026-06-20', submissionStatus: 'rework',   reworkReason: 'Scope 3 산정 근거 보완 필요' },
                { label: '원산지 증명서',              due: '2026-06-10', submissionStatus: 'approved', reworkReason: null },
                { label: '탄소 배출 보고서',           due: '2026-06-25', submissionStatus: 'review',   reworkReason: null },
                { label: '커뮤니티 합의서 제출',       due: '2026-06-25', submissionStatus: 'pending',  reworkReason: null },
                { label: '광권 갱신 증빙',             due: '2026-07-05', submissionStatus: 'pending',  reworkReason: null },
              ];

              return unifiedRows.map(row => {
                const meta = submissionStatusMeta[row.submissionStatus] ?? submissionStatusMeta.pending;
                const { label: ddayLabel, days } = calculateDDay(row.due);
                const isRework  = row.submissionStatus === 'rework';
                const isPending = row.submissionStatus === 'pending';
                const isApproved = row.submissionStatus === 'approved';

                return (
                  <div key={row.label} className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center border-b border-ink-700 px-5 py-3.5 last:border-b-0 transition-colors hover:bg-ink-800/20 ${isRework ? 'bg-amber-50/30' : isApproved ? 'bg-green-50/20' : ''}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className={`h-4 w-4 shrink-0 ${isRework ? 'text-amber-500' : isApproved ? 'text-signal-ok' : 'text-ink-500'}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-ink-100 truncate">{row.label}</div>
                        {isRework && row.reworkReason && <div className="mt-0.5 text-[10px] text-amber-700 truncate">사유: {row.reworkReason}</div>}
                      </div>
                    </div>
                    <div className="num-mono text-[11px] text-ink-400">{row.due}</div>
                    <div><Badge tone={meta.tone}>{meta.label}</Badge></div>
                    <div>
                      <span className={`num-mono rounded-xs border px-2 py-0.5 text-[10px] font-bold ${days < 0 ? 'border-ink-600 bg-ink-800 text-ink-400' : days <= 3 ? 'border-red-200 bg-red-50 text-red-600' : days <= 7 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-green-200 bg-green-50 text-green-700'}`}>{ddayLabel}</span>
                    </div>
                    <div className="w-20 text-right">
                      {isRework ? (
                        <button type="button" onClick={() => openWizardRework(row.label, row.reworkReason ?? '')} className="rounded-xs border border-amber-400 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-800 hover:bg-amber-400 hover:text-white transition-colors">재제출</button>
                      ) : isPending ? (
                        <button type="button" onClick={() => openWizardFromActionCenter(row.label, '제출 필요')} className="rounded-xs border border-accent-100 bg-white px-2.5 py-1.5 text-[10px] font-bold text-accent-700 hover:border-accent-600 transition-colors">업로드</button>
                      ) : (<span className="text-[10px] text-ink-600">—</span>)}
                    </div>
                  </div>
                );
              });
            })()}
          </section>

          <details className="group rounded-sm border border-ink-700 bg-white shadow-control">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 select-none">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent-700" />
                <div><span className="text-xs font-bold text-ink-100">자료 작성 가이드 및 제출 기준</span><span className="ml-2 text-[10px] text-ink-500">클릭하여 펼치기</span></div>
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
                      <div key={item} className="flex items-center gap-2 rounded-xs border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
                        <AlertCircle className="h-3 w-3 shrink-0 text-amber-600" />{item}
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
          <div className="flex items-center justify-between rounded-xs border border-ink-700 bg-white px-4 py-3 shadow-control">
            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-ink-100">자료 검토 상태 타임라인</div>
              <div className="text-[10px] text-ink-500">제출됨 → 검토 중 → 보완 요청 → 최종 승인 흐름</div>
              <span className="inline-flex items-center gap-1 rounded-xs border border-accent-100 bg-accent-50 px-2 py-0.5 text-[9px] font-bold text-accent-700">원청사 파이프라인 8단계 동기화</span>
            </div>
          </div>
          <section className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
            <EightStageStepper onResubmit={(_, requestLabel, reason) => openWizardRework(requestLabel, reason)} />
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

          <div className="flex items-center justify-between rounded-xs border border-accent-100 bg-accent-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="text-xs font-bold text-accent-800">공급원 변경 사항이 있나요?</div>
              <div className="text-[11px] text-accent-700">사후 적발 전에 자진 신고하면 리스크를 줄일 수 있습니다.</div>
            </div>
            <button type="button" onClick={() => setSelfReportOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xs border border-accent-600 bg-white px-3 py-2 text-xs font-bold text-accent-700 shadow-control hover:bg-accent-700 hover:text-white transition-colors">
              공급원 변경 자진 신고
            </button>
          </div>
        </div>
        )}

        {/* ── 클로드 작업본 병합: 실사 관리 뷰 ── */}
        {activeView === 'audit' && (
          <AuditView supplierId={supplierId} />
        )}

        {/* ── 클로드 작업본 병합: 공급망 뷰 ── */}
        {activeView === 'supply-chain' && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <SupplyChainMap
            supplierId={supplierId}
            upstream={upstream as any}
            downstream={downstream as any}
          />
        )}

        {/* ── 클로드 작업본 병합: 수신함(Inbox) 뷰 ── */}
        {activeView === 'notifications' && (() => {
          const NOTIF_TYPE_CONFIG = {
            sla_warning:     { barCls: 'bg-amber-400',  iconCls: 'text-amber-600',  bgUnread: 'bg-amber-50/40',  label: '기한 임박' },
            violation:       { barCls: 'bg-red-500',    iconCls: 'text-red-600',    bgUnread: 'bg-red-50/40',    label: '위반 지적' },
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
                      <span className="rounded-xs border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
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
                            {isUnread && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />}
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
                    selectedNotif.notification_type === 'violation'     ? 'border-red-200 bg-red-600' :
                    selectedNotif.notification_type === 'sla_warning'   ? 'border-amber-200 bg-amber-600' :
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
                    <p className="rounded-xs border border-ink-700 bg-ink-800 px-4 py-4 text-xs leading-6 text-ink-200 whitespace-pre-wrap">
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
                            setActiveView(selectedNotif.deep_link as any);
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

        {activeView !== 'ai-parsing' && (
          <div className="rounded-sm border border-ink-700 bg-white p-4 text-xs leading-5 text-ink-500 shadow-control">
            이 협력사 화면은 전체 공급망 구조, 다른 협력사의 상세 연락처, PO 단가 비교, FEOC 세부 판정 근거, 내부 HITL 판단 로그, 감사 추적 로그, 경쟁 협력사 비교 지표를 표시하지 않습니다.
          </div>
        )}
          </div>
        </div>
      </div>

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
          setWizardOpen(false);
          setWizardCertRenewalMode(false);
          setWizardReworkReason(null);
          setActiveView('ai-parsing');
        }}
      />
      <ViolationReportModal
        open={violationModalOpen}
        onClose={() => {
          setViolationModalOpen(false);
          setViolationId(null);
        }}
        {...(violationId !== null && { violationId })}
      />
      <SelfReportModal
        open={selfReportOpen}
        onClose={() => setSelfReportOpen(false)}
      />
    </main>
  );
}