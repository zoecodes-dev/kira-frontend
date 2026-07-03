'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Factory,
  ScanLine,
  FileText,
  KeyRound,
  LayoutDashboard,
  Network,
} from 'lucide-react';

import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';
import { SupplierGeneralReviewContent } from '@/app/suppliers/check-info/SupplierGeneralReview';
import SupplyChainMap from '@/components/supplier/SupplyChainMap';
import SelfReportModal from '@/components/supplier/SelfReportModal';
import SupplierNotificationBell from '@/components/supplier/SupplierNotificationBell';
import AiParsingView from '@/components/supplier/AiParsingView';
import { suppliers, supplyEdges } from '@/lib/data';
import {
  getContacts,
  getSupplierName,
  parts,
  purchaseOrders,
} from '@/lib/supplier-detail-data';
// '내 기업 정보'(company-info) 탭 전용 — 공장/인증서를 실제 API로 연동
import {
  getSupplierFactories,
  getTokenSupplierId,
  getNotifications,
  markNotificationRead,
  type SupplierFactory,
  type NotificationItem,
} from '@/lib/api';

interface MockSupplier {
  id: string; name?: string; region?: string; country?: string; 
  status?: string; role?: string; 
}

interface MockContact {
  contactId: string; name: string; role?: string; jobTitle?: string; 
  department?: string; email?: string; phone?: string; isPrimary?: boolean; 
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
  | 'supply-chain'
  | 'audit'
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
    { id: 'company-info'      as const, label: '내 기업 정보', subtitle: '정보 확인 · 자료 제출(입력)', icon: Building2 },
    { id: 'ai-parsing'        as const, label: 'AI 파싱 확인', subtitle: '추출 결과 검토 · 수정',  icon: ScanLine },
    { id: 'supply-chain'      as const, label: '공급망 연결',        subtitle: '직접 연결 업체',          icon: Network },
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


export default function SupplierPage() {
  const [activeView, setActiveView] = useState<SupplierView>('dashboard');
  const [selectedRelatedId, setSelectedRelatedId] = useState('S-CAM-001');
  // ── 자진 신고 모달 상태 (기획서 E-3) ─────────────────────────────────────────
  const [selfReportOpen, setSelfReportOpen] = useState(false);
  // 계정 설정 · 담당자 정보 수정 승인 요청 상태 — true면 입력 폼이 잠기고 대기 패널 표시
  const [isPendingReview, setIsPendingReview] = useState(false);
  // 계정 설정 · 담당자 정보 읽기 모드 vs 편집 모드
  const [isEditingContact, setIsEditingContact] = useState(false);
  // 계정 설정 · 비밀번호 변경 폼 펼침 여부
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  // 계정 설정 · 비밀번호 변경 폼 입력값 (유효성 검사용 controlled input)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // 계정 설정 · 비밀번호 변경 인라인 피드백 — true면 버튼 대신 완료 문구를 3초간 표시
  const [passwordChanged, setPasswordChanged] = useState(false);
  // 비밀번호 변경 완료 시각 — 성공 문구에 표시할 실제 현재 시각
  const [passwordChangedAt, setPasswordChangedAt] = useState('');

  // 협력사 본인 supplier UUID — '내 기업 정보' 탭의 표준 양식(SupplierGeneralReviewContent)이
  // 실 백엔드 6섹션을 fetch하는 데 쓴다. 미로그인/미매핑이면 데모 기본값.
  const supplierUuid = getTokenSupplierId() ?? 'a1111111-1111-4000-8000-000000000001';

  // ─── 공유 알림 상태 — GNB 벨 + 수신함 페이지 1:1 동기화 ─────────────────────
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);

  useEffect(() => {
    getNotifications().then(list => {
      setNotifications(list ?? []);
      if (list && list.length > 0) setSelectedNotifId(list[0].notification_id);
    }).catch(() => setNotifications([]));
  }, []);

  function markNotifRead(id: string) {
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, status: 'read' as const } : n));
    markNotificationRead(id).catch(() => {});
  }
  function markAllNotifsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
  }

  // 계정 설정 · 비밀번호 변경 완료 — 유효성 검사 통과 시에만 버튼이 활성화되어 호출됨.
  // 폼을 닫고 입력값을 비운 뒤, 실제 현재 시각으로 3초간 완료 문구를 보여주고 버튼으로 복귀
  function handlePasswordChangeSubmit() {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setPasswordChangedAt(
      `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    );
    setIsPasswordFormOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordChanged(true);
    setTimeout(() => setPasswordChanged(false), 3000);
  }

  const supplier = suppliers.find(item => item.id === supplierId) as unknown as MockSupplier | undefined;
  const name = getSupplierName(supplierId);
  const contacts = getContacts(supplierId) as unknown as MockContact[];

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

  const requestItems = [
    { label: '광산 폴리곤 좌표 등록',    due: '2026-06-16', status: '제출 필요', tone: 'warn'    as const },
    { label: '환경영향평가 갱신본 업로드', due: '2026-06-20', status: '재요청',   tone: 'alert'   as const },
    { label: '커뮤니티 합의서 제출',      due: '2026-06-25', status: '대기',     tone: 'neutral' as const },
    { label: '광권 갱신 증빙',            due: '2026-07-05', status: '대기',     tone: 'neutral' as const },
  ];
  // 오늘의 알림 카드 전용 — 상태 배지 톤별 스타일 (components/Badge.tsx의 toneStyles와 동일한 배색 유지,
  // 이 섹션만 큰 글자 크기(text-base 이상)를 적용하기 위해 공용 Badge 대신 인라인으로 렌더링)
  const STATUS_TONE_CLS: Record<'ok' | 'warn' | 'alert' | 'info' | 'neutral', string> = {
    ok:      'bg-ok-bg text-ok-text border-ok-border',
    warn:    'bg-warn-bg text-warn-text border-warn-border',
    alert:   'bg-alert-bg text-alert-text border-alert-border',
    info:    'bg-info-bg text-info-text border-info-border',
    neutral: 'bg-slate-50 text-slate-700 border-slate-300',
  };

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
                onConfirmComplete={() => setActiveView('dashboard')} 
              />
            )}

        {activeView === 'company-info' && (
          <SupplierGeneralReviewContent supplierId={supplierUuid} mode="supplier" embedded />
        )}

        {/* ── 기타 뷰들은 기존과 동일 ── */}
        {activeView === 'dashboard' && (
        <>
        {/* ── 오늘의 알림 — 홈 화면 유일 섹션. 전체 폭 활용 + 확대된 텍스트(text-base 이상) ── */}
        <section className="w-full">
          <div className="w-full rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 px-6 py-4">
              <div className="text-base font-bold text-ink-100">오늘의 알림</div>
              <div className="mt-0.5 text-base text-ink-500">제출 기한이 가까운 원청 요청 · 우선순위 순</div>
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
                    onClick={() => setActiveView('company-info')}
                    className={`grid w-full grid-cols-[auto_2fr_1fr_auto_auto_auto] items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-ink-800/30 ${
                      isUrgent ? 'bg-alert-bg' : 'bg-white'
                    }`}
                  >
                    {/* 순서 번호 */}
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                      isUrgent ? 'bg-alert-bg text-alert-text' :
                      isWarn   ? 'bg-warn-bg text-warn-text' :
                                 'bg-ink-800 text-ink-400'
                    }`}>
                      {idx + 1}
                    </div>
                    {/* 항목명 */}
                    <div className={`min-w-0 truncate text-base font-bold ${isUrgent ? 'text-alert-text' : 'text-ink-100'}`}>
                      {item.label}
                    </div>
                    {/* 제출 기한 */}
                    <div className="min-w-0 text-base text-ink-500">
                      제출 기한 <span className="num-mono">{item.due}</span>
                    </div>
                    {/* D-day */}
                    <span className={`num-mono rounded-xs border px-2 py-0.5 text-base font-bold ${
                      isUrgent ? 'border-alert-border bg-alert-bg text-alert-text' :
                      isWarn   ? 'border-warn-border bg-warn-bg text-warn-text' :
                                 'border-ok-border bg-ok-bg text-ok-text'
                    }`}>
                      {ddayLabel}
                    </span>
                    {/* 상태 */}
                    <span className={`inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 text-base font-semibold whitespace-nowrap ${STATUS_TONE_CLS[item.tone]}`}>
                      {item.status}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-600" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        </>
        )}

        {activeView === 'edit-info' && (
        <div className="space-y-5">

          {/* 헤더 */}
          <div>
            <h2 className="text-base font-bold text-ink-100">계정 설정 · 로그인 정보 및 담당자 연락처</h2>
            <p className="mt-1 text-base text-ink-500">
              로그인 계정 보안과 담당자 연락처를 관리합니다.
            </p>
          </div>

          {/* ── 계정 상태 요약 배너 (순수 상태 표시 · 입력 없음) ── */}
          <div className="rounded-sm border border-ink-700 bg-white shadow-control divide-y divide-ink-800">
            <div className="flex items-center gap-2.5 px-5 py-3.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-signal-ok" />
              <span className="text-base font-semibold text-ink-100">로그인 계정 활성 · 마지막 접속 2026.07.02</span>
            </div>
            <div className="flex items-center gap-2.5 px-5 py-3.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-signal-ok" />
              <span className="text-base font-semibold text-ink-100">주 담당자 등록 완료 · 원청사 승인 상태</span>
            </div>
            <div className="flex items-center gap-2.5 bg-warn-bg px-5 py-3.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warn-text" />
              <span className="text-base font-bold text-warn-text">비밀번호 최종 변경 183일 전 → 변경 권장</span>
            </div>
          </div>

          {/* ── 블록 1: 계정 보안 ── */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 px-6 py-4">
              <div className="text-base font-bold text-ink-100">계정 보안</div>
              <div className="mt-0.5 text-base text-ink-500">로그인 이메일 및 비밀번호 관리</div>
            </div>
            <div className="px-6 py-5">
              {/* 이메일 — 폼이 열리면 옆에 빈 칸이 남지 않도록 혼자 한 줄을 차지 */}
              <div className={isPasswordFormOpen ? 'grid grid-cols-1 gap-5' : 'grid grid-cols-2 gap-5'}>
                <div>
                  <label className="block text-base font-bold text-ink-500 mb-1.5">이메일</label>
                  <input
                    type="email"
                    defaultValue={primaryOverride?.email ?? 'esg@hanyangcell.com'}
                    disabled
                    className="w-full cursor-not-allowed rounded-xs border border-ink-700 bg-ink-800 px-3 py-2 text-base text-ink-400"
                  />
                  <p className="mt-1.5 text-base text-ink-500">이메일 변경은 원청사에 문의하세요</p>
                </div>
                {!isPasswordFormOpen && (
                  <div>
                    <label className="block text-base font-bold text-ink-500 mb-1.5">비밀번호</label>
                    {passwordChanged ? (
                      <div className="flex w-full items-center gap-2 rounded-xs border border-ok-border bg-ok-bg px-3 py-2 text-base font-bold text-ok-text">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        비밀번호가 변경되었습니다 · {passwordChangedAt}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsPasswordFormOpen(true)}
                        className="w-full rounded-xs border border-ink-600 bg-ink-800 px-3 py-2 text-base font-semibold text-ink-300 transition-colors hover:border-accent-600 hover:bg-accent-50 hover:text-accent-700"
                      >
                        비밀번호 변경
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 비밀번호 변경 폼 — 이메일 아래 새 행에서 전체 너비를 차지, 3개 필드가 한 줄에 균등 배치 */}
              {isPasswordFormOpen && (() => {
                const newPasswordTooShort = newPassword.length > 0 && newPassword.length < 8;
                const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
                const canSubmit = newPassword.length >= 8 && newPassword === confirmPassword;
                return (
                  <div className="mt-5 border-t border-ink-700 pt-5">
                    <div className="grid grid-cols-3 gap-5">
                      <div>
                        <label className="block text-base font-bold text-ink-500 mb-1.5">현재 비밀번호</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          placeholder="현재 비밀번호"
                          className="w-full rounded-xs border border-ink-700 bg-white px-3 py-2 text-base text-ink-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-bold text-ink-500 mb-1.5">새 비밀번호</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="새 비밀번호"
                          className="w-full rounded-xs border border-ink-700 bg-white px-3 py-2 text-base text-ink-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 transition-colors"
                        />
                        {newPasswordTooShort && (
                          <p className="mt-1.5 text-base font-semibold text-alert-text">비밀번호는 8자리 이상이어야 합니다.</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-base font-bold text-ink-500 mb-1.5">비밀번호 확인</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="비밀번호 확인"
                          className="w-full rounded-xs border border-ink-700 bg-white px-3 py-2 text-base text-ink-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 transition-colors"
                        />
                        {passwordsMismatch && (
                          <p className="mt-1.5 text-base font-semibold text-alert-text">비밀번호가 일치하지 않습니다.</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePasswordChangeSubmit}
                        disabled={!canSubmit}
                        className="inline-flex items-center gap-2 rounded-xs bg-accent-700 px-5 py-2.5 text-base font-bold text-white shadow-control transition-colors hover:bg-accent-900 disabled:cursor-not-allowed disabled:bg-ink-600 disabled:hover:bg-ink-600"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        변경 완료
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPasswordFormOpen(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="rounded-xs border border-ink-600 bg-white px-5 py-2.5 text-base font-semibold text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-200"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* ── 블록 2: 주 담당자 정보 ── */}
          <section className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 px-6 py-4">
              <div className="text-base font-bold text-ink-100">주 담당자 정보</div>
              <div className="mt-0.5 text-base text-ink-500">ESG 업무 담당자 연락처 및 역할</div>
            </div>

            {(() => {
              const contactFields = [
                { label: '담당자명', key: 'name', value: primaryOverride?.name ?? '', placeholder: 'Kim ESG' },
                { label: '직책', key: 'jobTitle', value: primaryOverride?.jobTitle ?? '', placeholder: 'ESG 컴플라이언스 팀장' },
                { label: '부서', key: 'department', value: primaryOverride?.department ?? '', placeholder: 'ESG · 지속가능경영팀' },
                { label: '이메일', key: 'email', value: primaryOverride?.email ?? '', placeholder: 'esg@hanyangcell.com' },
                { label: '연락처', key: 'phone', value: primaryOverride?.phone ?? '', placeholder: '+82-10-1234-5678' },
              ];

              // ── 잠금 상태: 승인 요청 처리 중 — 입력은 disabled + 연회색 배경으로 잠기고 대기 안내만 표시 ──
              if (isPendingReview) {
                return (
                  <>
                    <div className="grid grid-cols-2 gap-5 px-6 py-5">
                      {contactFields.map(field => (
                        <div key={field.key}>
                          <label className="block text-base font-bold text-ink-500 mb-1.5">{field.label}</label>
                          <input
                            type={field.key === 'email' ? 'email' : 'text'}
                            defaultValue={field.value}
                            disabled
                            readOnly
                            className="w-full cursor-not-allowed rounded-xs border border-ink-700 bg-gray-50 px-3 py-2 text-base text-ink-400"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mx-6 mb-6 flex items-center justify-between gap-3 rounded-xs border border-warn-border bg-warn-bg px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 shrink-0 text-warn-text" />
                        <span className="text-base font-semibold text-warn-text">
                          ⏱ 검토 요청 중 · 2026.07.03 제출 · 원청사 승인 후 반영됩니다
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPendingReview(false)}
                        className="shrink-0 rounded-xs border border-warn-border bg-white px-3 py-1.5 text-base font-semibold text-warn-text transition-colors hover:bg-warn-bg"
                      >
                        요청 취소
                      </button>
                    </div>
                  </>
                );
              }

              // ── 편집 모드: 입력 폼 + 승인 요청/취소 ──
              if (isEditingContact) {
                return (
                  <>
                    <div className="grid grid-cols-2 gap-5 px-6 py-5">
                      {contactFields.map(field => (
                        <div key={field.key}>
                          <label className="block text-base font-bold text-ink-500 mb-1.5">{field.label}</label>
                          <input
                            type={field.key === 'email' ? 'email' : 'text'}
                            defaultValue={field.value}
                            placeholder={field.placeholder}
                            className="w-full rounded-xs border border-ink-700 bg-white px-3 py-2 text-base text-ink-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2 px-6 pb-6">
                      <button
                        type="button"
                        onClick={() => setIsEditingContact(false)}
                        className="rounded-xs border border-ink-600 bg-white px-5 py-2.5 text-base font-semibold text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-200"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPendingReview(true)}
                        className="inline-flex items-center gap-2 rounded-xs bg-accent-700 px-5 py-2.5 text-base font-bold text-white shadow-control hover:bg-accent-900 transition-colors"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        원청사에 수정 승인 요청하기
                      </button>
                    </div>
                  </>
                );
              }

              // ── 읽기 모드(기본): 일반 텍스트 + 승인 상태 + 수정 진입 버튼 ──
              return (
                <>
                  <div className="grid grid-cols-2 gap-5 px-6 py-5">
                    {contactFields.map(field => (
                      <div key={field.key}>
                        <div className="text-base font-bold text-ink-500 mb-1">{field.label}</div>
                        <div className="text-base font-semibold text-ink-100">{field.value || '—'}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-6 pb-6">
                    <span className="text-base font-semibold text-ok-text">상태: 원청사 승인 완료</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingContact(true)}
                      className="inline-flex items-center gap-1.5 rounded-xs border border-ink-600 bg-ink-800 px-4 py-2 text-base font-semibold text-ink-300 transition-colors hover:border-accent-600 hover:bg-accent-50 hover:text-accent-700"
                    >
                      담당자 정보 수정 →
                    </button>
                  </div>
                </>
              );
            })()}
          </section>

        </div>
        )}

        {activeView === 'supply-chain' && (
          <div className="space-y-6">
            <SupplyChainMap
              supplierId={supplierId}
              upstream={upstream as never}
              downstream={downstream as never}
            />
          </div>
        )}

        {/* 푸터 — ai-parsing 전체화면 모드일 때 숨김 (작업 몰입도 확보) */}
        {activeView !== 'ai-parsing' && (
          <div className="rounded-sm border border-ink-700 bg-white p-4 text-xs leading-5 text-ink-500 shadow-control">
            이 협력사 화면은 전체 공급망 구조, 다른 협력사의 상세 연락처, PO 단가 비교, 내부 HITL 판단 로그, 감사 추적 로그, 경쟁 협력사 비교 지표를 표시하지 않습니다.
          </div>
        )}
          </div>
        </div>
      </div>

      {/* 자진 신고 모달 — 기획서 E-3.
          parentSupplierId=로그인 협력사 본인. bomVersionId/partId 는 협력사 포털에 출처가 없어
          미전달 → 모달이 데모 접수 모드로 폴백(docs/HANDOFF_supplychain_self_report.md). */}
      <SelfReportModal
        open={selfReportOpen}
        onClose={() => setSelfReportOpen(false)}
        parentSupplierId={supplierId}
      />
    </main>
  );
}
// 주석test