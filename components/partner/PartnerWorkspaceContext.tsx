'use client';

// 협력사 업무공간(/partner) 공유 데이터 컨텍스트 — app/supplier/page.tsx의 SupplierPage 안에 있던
// "여러 화면이 공유하는" 서버/업무 데이터(submissions, notifications, 내 회사 프로필 등)를 한 곳에서 fetch/보관한다.
// 화면별 route(page.tsx)는 이 컨텍스트를 구독만 하므로, 같은 데이터를 화면마다 따로 useState로 들고
// 있다가 서로 다른 값이 되는 문제(제출 상태를 한 화면에서 바꿨는데 다른 화면 요약 카드가 옛 값을 보여주는 등)를 막는다.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { suppliers, supplyEdges } from '@/lib/data';
import {
  getContacts,
  getFactories,
  getRiskProfile,
  getSupplierName,
} from '@/lib/supplier-detail-data';
import {
  getTokenSupplierId,
  getSubmissions,
  getNotifications,
  markNotificationRead,
  type SubmissionBrief,
  type NotificationItem,
} from '@/lib/api';
import { useDemoNotifications } from '@/lib/demo-notifications';
import type { MockContact, MockFactory, MockSupplier, Submission } from './partnerTypes';

/** 백엔드 status → 8단계 스테이지 배열로 변환 */
function mapToSubmission(s: SubmissionBrief): Submission {
  const STATUS_STAGE: Record<string, number> = {
    submission_requested: 1,
    submission_in_progress: 1,
    submission_submitted: 4,
    submission_review: 5,
    submission_rework: 7,
    submission_approved: 8,
    submission_rejected: 6,
  };
  const STAGE_LABELS = [
    { label: '제출 완료',   sublabel: '협력사 최초 업로드 완료' },
    { label: 'AI 처리 중',  sublabel: 'LLM 문서 추출 파이프라인 처리' },
    { label: 'AI 처리 완료',sublabel: '데이터 추출 결과 생성 완료' },
    { label: '협력사 확인', sublabel: '협력사 담당자 파싱 결과 검토' },
    { label: '원청 접수',   sublabel: '원청사 검토 큐 진입' },
    { label: '원청 검토중', sublabel: '원청사 담당자 내용 검토 중' },
    { label: '보완 요청',   sublabel: '미비 사항 재제출 요청' },
    { label: '최종 승인',   sublabel: '규제 적합성 최종 승인 완료' },
  ];
  const activeStage = STATUS_STAGE[s.status ?? ''] ?? 1;
  const isRejected = s.status === 'submission_rejected';
  const isApproved = s.status === 'submission_approved';
  return {
    id: s.submissionId,
    documentName: s.type ?? '문서',
    submittedAt: s.submittedAt ?? s.dueDate ?? '',
    rejectedStageNo: isRejected ? activeStage : undefined,
    stages: STAGE_LABELS.map((meta, i) => {
      const stageNo = i + 1;
      let status: 'done' | 'active' | 'pending' | 'rejected' = 'pending';
      if (isApproved) status = 'done';
      else if (isRejected && stageNo === activeStage) status = 'rejected';
      else if (stageNo < activeStage) status = 'done';
      else if (stageNo === activeStage) status = 'active';
      return { no: stageNo, ...meta, status };
    }),
  };
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

interface PartnerWorkspaceValue {
  supplierId: string;
  supplierUuid: string;
  supplier: MockSupplier | undefined;
  name: ReturnType<typeof getSupplierName>;
  contacts: MockContact[];
  contactsWithOverride: MockContact[];
  primaryOverride: MockContact | undefined;
  risk: ReturnType<typeof getRiskProfile>;
  factories: MockFactory[];
  // 실제 supplyEdges(SupplyEdge)와 mock 폴백 edge의 필드 타입이 달라(volume: number vs string),
  // 원본 코드처럼 개별 표현식 추론에 맡기지 않고 명시 타입을 쓰는 대신 느슨하게 둔다.
  upstream: { edge: any; supplier: MockSupplier }[];
  downstream: { edge: any; supplier: MockSupplier }[];
  submissions: Submission[];
  notifications: NotificationItem[];
  markNotifRead: (id: string) => void;
  markAllNotifsRead: () => void;
}

const PartnerWorkspaceContext = createContext<PartnerWorkspaceValue | null>(null);

export function usePartnerWorkspace(): PartnerWorkspaceValue {
  const ctx = useContext(PartnerWorkspaceContext);
  if (!ctx) throw new Error('usePartnerWorkspace는 PartnerWorkspaceProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}

export function PartnerWorkspaceProvider({ children }: { children: ReactNode }) {
  const supplierId = useMemo(() => {
    const sid = getTokenSupplierId();
    return (sid && BACKEND_SUPPLIER_PERSONA[sid]) || 'S-CELL-001';
  }, []);
  // 협력사 본인 supplier UUID — '내 기업 정보' 탭의 표준 양식(SupplierGeneralReviewContent)이
  // 실 백엔드 6섹션을 fetch하는 데 쓴다. 미로그인/미매핑이면 데모 기본값.
  const supplierUuid = getTokenSupplierId() ?? 'a1111111-1111-4000-8000-000000000001';

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  useEffect(() => {
    getSubmissions()
      .then(list => setSubmissions(list.map(mapToSubmission)))
      .catch(() => { /* mock 유지 */ });
  }, []);

  // ─── 공유 알림 상태 — GNB 벨 + 수신함 페이지 1:1 동기화 ─────────────────────
  // 두 소스를 병합한다:
  //  ① 백엔드 알림(getNotifications) — 서버가 내려주는 알림
  //  ② 데모 알림 스토어(audience='partner') — 원청 탭의 행동(메일 발송·보완 요청 등)이
  //     BroadcastChannel로 이 탭에 실시간 전달한 알림. process.md 핸드오프의 핵심.
  const [apiNotifications, setApiNotifications] = useState<NotificationItem[]>([]);
  useEffect(() => {
    getNotifications().then(list => {
      setApiNotifications(list ?? []);
    }).catch(() => setApiNotifications([]));
  }, []);

  const demo = useDemoNotifications('partner');

  const notifications: NotificationItem[] = useMemo(() => {
    const merged = [...(demo.notifications as unknown as NotificationItem[]), ...apiNotifications];
    return merged.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [demo.notifications, apiNotifications]);

  function markNotifRead(id: string) {
    // 데모 알림이면 스토어에서, 백엔드 알림이면 로컬 상태 + API로 처리(서로 무해).
    demo.markRead(id);
    setApiNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, status: 'read' as const } : n));
    markNotificationRead(id).catch(() => {});
  }
  function markAllNotifsRead() {
    demo.markAllRead();
    setApiNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
  }

  const supplier = suppliers.find(item => item.id === supplierId) as unknown as MockSupplier | undefined;
  const name = getSupplierName(supplierId);
  const contacts = getContacts(supplierId) as unknown as MockContact[];

  const risk = getRiskProfile(supplierId);
  const factories = (getFactories(supplierId) as unknown as MockFactory[]).filter(factory => factory.factoryRole !== 'headquarters');

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
      name:    'Hanyang Motor Group (고객사)',
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

  const value: PartnerWorkspaceValue = {
    supplierId,
    supplierUuid,
    supplier,
    name,
    contacts,
    contactsWithOverride,
    primaryOverride,
    risk,
    factories,
    upstream,
    downstream,
    submissions,
    notifications,
    markNotifRead,
    markAllNotifsRead,
  };

  return (
    <PartnerWorkspaceContext.Provider value={value}>
      {children}
    </PartnerWorkspaceContext.Provider>
  );
}
