'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Mail,
  Phone,
  Search,
  Send,
  UserRound,
  X,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import TopStatCard from '@/components/TopStatCard';
import { suppliers, supplyEdges } from '@/lib/data';
import { getContacts, getSupplierName } from '@/lib/supplier-detail-data';

type BoardStatus = 'overdue' | 'submitted' | 'dueSoon' | 'progress' | 'reviewed' | 'rework' | 'rejected';
type FilterMode = 'all' | BoardStatus;

interface FlowNode {
  supplierId?: string;
  name: string;
  status: BoardStatus;
}

interface RequestItem {
  id: string;
  supplierId: string;
  title: string;
  status: BoardStatus;
  progress: number;
  dueDate: string;
  requestCount: number;
  lastSent: string;
  lastReply: string;
  reviewedAt?: string;
  missingItems: string[];
  products: string[];
  history: string[];
  actions: string[];
  flow: FlowNode[];
}

const REVIEWED_DATE = '2026-06-04';
const REQUEST_STATUS_STORAGE_KEY = 'kira-request-map-status';

const queueOrder: BoardStatus[] = ['overdue', 'submitted', 'rework', 'rejected', 'dueSoon', 'progress'];
const filterOrder: FilterMode[] = ['all', 'overdue', 'dueSoon', 'progress', 'submitted', 'reviewed'];

const statusMeta: Record<BoardStatus, {
  label: string;
  queueLabel: string;
  dot: string;
  chip: string;
  border: string;
  active: string;
  statTone: 'neutral' | 'info' | 'ok' | 'warn' | 'alert';
  progress: string;
  text: string;
}> = {
  overdue: {
    label: '기한 초과',
    queueLabel: '초과',
    dot: 'bg-red-500',
    chip: 'border-red-200 bg-red-50 text-red-700',
    border: 'border-red-300',
    active: 'border-red-400 bg-red-50 ring-2 ring-red-100',
    statTone: 'alert',
    progress: 'bg-red-500',
    text: 'text-red-700',
  },
  submitted: {
    label: '검토 대기',
    queueLabel: '대기',
    dot: 'bg-emerald-500',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    border: 'border-emerald-300',
    active: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100',
    statTone: 'ok',
    progress: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  dueSoon: {
    label: '만료 임박',
    queueLabel: '임박',
    dot: 'bg-orange-500',
    chip: 'border-orange-200 bg-orange-50 text-orange-700',
    border: 'border-orange-300',
    active: 'border-orange-400 bg-orange-50 ring-2 ring-orange-100',
    statTone: 'warn',
    progress: 'bg-orange-500',
    text: 'text-orange-700',
  },
  progress: {
    label: '입력 중',
    queueLabel: '입력중',
    dot: 'bg-blue-500',
    chip: 'border-blue-200 bg-blue-50 text-blue-700',
    border: 'border-blue-300',
    active: 'border-blue-400 bg-blue-50 ring-2 ring-blue-100',
    statTone: 'info',
    progress: 'bg-blue-500',
    text: 'text-blue-700',
  },
  reviewed: {
    label: '검토 완료',
    queueLabel: '완료',
    dot: 'bg-slate-400',
    chip: 'border-slate-200 bg-slate-100 text-slate-700',
    border: 'border-slate-300',
    active: 'border-slate-400 bg-slate-100 ring-2 ring-slate-200',
    statTone: 'neutral',
    progress: 'bg-slate-400',
    text: 'text-slate-700',
  },
  rework: {
    label: '보완 요청',
    queueLabel: '보완',
    dot: 'bg-purple-500',
    chip: 'border-purple-200 bg-purple-50 text-purple-700',
    border: 'border-purple-300',
    active: 'border-purple-400 bg-purple-50 ring-2 ring-purple-100',
    statTone: 'warn',
    progress: 'bg-purple-500',
    text: 'text-purple-700',
  },
  rejected: {
    label: '반려',
    queueLabel: '반려',
    dot: 'bg-slate-950',
    chip: 'border-slate-900 bg-slate-950 text-white',
    border: 'border-slate-900',
    active: 'border-slate-950 bg-slate-100 ring-2 ring-slate-300',
    statTone: 'neutral',
    progress: 'bg-slate-950',
    text: 'text-slate-950',
  },
};

const initialRequests: RequestItem[] = [
  {
    id: 'REQ-001',
    supplierId: 'S-MINE-002',
    title: '코발트 원광 원산지 및 인권 실사 자료',
    status: 'overdue',
    progress: 59,
    dueDate: '2026-06-03',
    requestCount: 3,
    lastSent: '2026-05-28',
    lastReply: '응답 없음',
    missingItems: ['광산 소유 구조 증빙', '아동 노동 리스크 점검표', '현장 감사 보고서', '공급망 원산지 선언서'],
    products: ['EV High-Nickel Cell A', 'PHEV Custom Cell C'],
    history: ['2026-05-20 최초 요청 발송', '2026-05-25 1차 리마인드', '2026-05-28 2차 리마인드 발송 후 미응답'],
    actions: ['즉시 재요청과 담당자 직접 확인을 진행합니다.', '1차 협력사에도 지연 위험을 공유합니다.', '미응답 지속 시 리스크 조치 보드로 이관합니다.'],
    flow: [
      { supplierId: 'S-MINE-002', name: 'Katanga Cobalt', status: 'overdue' },
      { supplierId: 'S-REF-002', name: 'Ganzhou Rare', status: 'dueSoon' },
      { supplierId: 'S-PRE-001', name: 'QZ Precursor', status: 'progress' },
      { supplierId: 'S-CAM-001', name: 'POS Cathode', status: 'submitted' },
      { supplierId: 'S-CELL-001', name: 'Hanyang Cell', status: 'reviewed' },
    ],
  },
  {
    id: 'REQ-002',
    supplierId: 'S-CAM-001',
    title: 'NCM811 양극재 공정 및 탄소 배출 산정서',
    status: 'submitted',
    progress: 100,
    dueDate: '2026-06-12',
    requestCount: 1,
    lastSent: '2026-06-01',
    lastReply: '2026-06-04 제출 완료',
    missingItems: ['원산지 증빙 일치 여부 확인', '공정도 4단계 표기 검토', '탄소 배출 산정 방식 검토'],
    products: ['EV High-Nickel Cell A'],
    history: ['2026-06-01 자료 요청 발송', '2026-06-04 협력사 제출 완료, 검토 대기 전환'],
    actions: ['제출 자료를 검토하고 승인 여부를 결정합니다.', '검토 완료 후 완료 큐로 이동합니다.', '불일치 항목은 보완 요청으로 되돌립니다.'],
    flow: [
      { supplierId: 'S-MINE-002', name: 'Katanga Cobalt', status: 'overdue' },
      { supplierId: 'S-REF-002', name: 'Ganzhou Rare', status: 'dueSoon' },
      { supplierId: 'S-CAM-001', name: 'POS Cathode', status: 'submitted' },
      { supplierId: 'S-CELL-001', name: 'Hanyang Cell', status: 'reviewed' },
    ],
  },
  {
    id: 'REQ-003',
    supplierId: 'S-REF-002',
    title: '정제 코발트 FEOC 및 소유 구조 확인',
    status: 'dueSoon',
    progress: 85,
    dueDate: '2026-06-07',
    requestCount: 2,
    lastSent: '2026-05-30',
    lastReply: '2026-06-01 일부 응답',
    missingItems: ['정제소 소유 구조 증빙', 'FEOC 스크리닝 확인서'],
    products: ['EV High-Nickel Cell A'],
    history: ['2026-05-30 최초 요청 발송', '2026-06-01 일부 파일 제출, 소유 구조 증빙 누락'],
    actions: ['만료 전 보완 리마인드를 발송합니다.', '누락 파일만 선택해 재요청합니다.', '마감 후 자동으로 기한 초과 큐에 올립니다.'],
    flow: [
      { supplierId: 'S-REF-002', name: 'Ganzhou Rare', status: 'dueSoon' },
      { supplierId: 'S-PRE-001', name: 'QZ Precursor', status: 'progress' },
      { supplierId: 'S-CAM-001', name: 'POS Cathode', status: 'submitted' },
      { supplierId: 'S-CELL-001', name: 'Hanyang Cell', status: 'reviewed' },
    ],
  },
  {
    id: 'REQ-004',
    supplierId: 'S-PRE-001',
    title: '전구체 배합 데이터 및 제조 공정도',
    status: 'progress',
    progress: 75,
    dueDate: '2026-06-14',
    requestCount: 1,
    lastSent: '2026-06-01',
    lastReply: '2026-06-03 작성 중',
    missingItems: ['전구체 배합 데이터', '탄소 배출 산정표'],
    products: ['EV High-Nickel Cell A'],
    history: ['2026-06-01 최초 요청 발송', '2026-06-03 담당자가 입력 중으로 상태 변경'],
    actions: ['마감 전 알림을 예약합니다.', '미입력 필드만 안내합니다.', '완료 예상일을 담당자에게 확인합니다.'],
    flow: [
      { supplierId: 'S-PRE-001', name: 'QZ Precursor', status: 'progress' },
      { supplierId: 'S-CAM-001', name: 'POS Cathode', status: 'submitted' },
      { supplierId: 'S-CELL-001', name: 'Hanyang Cell', status: 'reviewed' },
    ],
  },
  {
    id: 'REQ-005',
    supplierId: 'S-CELL-001',
    title: '셀 조립 데이터 및 최종 제출 패키지',
    status: 'reviewed',
    progress: 100,
    dueDate: '2026-06-03',
    reviewedAt: '2026-06-04',
    requestCount: 1,
    lastSent: '2026-05-29',
    lastReply: '2026-06-03 제출 완료',
    missingItems: ['모든 항목 검토 완료'],
    products: ['EV High-Nickel Cell A'],
    history: ['2026-05-29 자료 요청 발송', '2026-06-03 제출 완료', '2026-06-04 담당자 검토 완료'],
    actions: ['최근 7일 완료 항목으로 보관합니다.', '추가 조치는 없습니다.'],
    flow: [
      { supplierId: 'S-CELL-001', name: 'Hanyang Cell', status: 'reviewed' },
      { name: 'EV High-Nickel Cell A', status: 'reviewed' },
    ],
  },
];

function supplierLabel(supplierId: string) {
  const name = getSupplierName(supplierId);
  const fallback = suppliers.find(supplier => supplier.id === supplierId)?.name;
  return name?.shortNameEn ?? fallback ?? supplierId;
}

function getPrimaryContact(supplierId: string) {
  const contacts = getContacts(supplierId);
  return contacts.find(contact => contact.isPrimary) ?? contacts[0] ?? null;
}

function findConnectedSuppliers(supplierId: string, requests: RequestItem[]) {
  const ids = new Set<string>([supplierId]);
  supplyEdges.forEach(edge => {
    if (edge.from === supplierId) ids.add(edge.to);
    if (edge.to === supplierId) ids.add(edge.from);
  });

  return Array.from(ids).slice(0, 4).map(id => {
    const request = requests.find(item => item.supplierId === id);
    return {
      id,
      name: supplierLabel(id),
      status: request?.status ?? 'reviewed',
    };
  });
}

function KpiCard({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'info' | 'ok' | 'warn' | 'alert';
  active?: boolean;
  onClick?: () => void;
}) {
  return <TopStatCard label={label} value={value} tone={tone} active={active} onClick={onClick} />;
}

function StatusChip({ status }: { status: BoardStatus }) {
  const meta = statusMeta[status];
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold', meta.chip)}>
      {meta.label}
    </span>
  );
}

function isBoardStatus(value: unknown): value is BoardStatus {
  return typeof value === 'string' && value in statusMeta;
}

function readStoredRequestStatuses() {
  if (typeof window === 'undefined') return {};

  try {
    const cookie = document.cookie
      .split('; ')
      .find(item => item.startsWith(`${REQUEST_STATUS_STORAGE_KEY}=`))
      ?.split('=')[1];
    if (cookie) return JSON.parse(decodeURIComponent(cookie)) as Record<string, { status?: unknown; reviewedAt?: string }>;
  } catch {
    // Fall through to the localStorage fallback below.
  }

  try {
    const raw = window.localStorage.getItem(REQUEST_STATUS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as Record<string, { status?: unknown; reviewedAt?: string }> : {};
  } catch {
    return {};
  }
}

function applyStoredRequestStatuses(items: RequestItem[]) {
  const stored = readStoredRequestStatuses();

  return items.map(item => {
    const override = stored[item.supplierId];
    const nextStatus = isBoardStatus(override?.status) ? override.status : item.status;
    const reviewedAt = nextStatus === 'reviewed' ? override?.reviewedAt ?? item.reviewedAt ?? REVIEWED_DATE : item.reviewedAt;

    return {
      ...item,
      status: nextStatus,
      reviewedAt,
      flow: item.flow.map(node => {
        if (!node.supplierId) return node;
        const nodeOverride = stored[node.supplierId];
        return isBoardStatus(nodeOverride?.status) ? { ...node, status: nodeOverride.status } : node;
      }),
    };
  });
}

function applyRequestStatus(items: RequestItem[], supplierId: string, status: BoardStatus, reviewedAt?: string) {
  return items.map(item => {
    const itemStatus = item.supplierId === supplierId ? status : item.status;
    return {
      ...item,
      status: itemStatus,
      reviewedAt: itemStatus === 'reviewed' ? reviewedAt ?? item.reviewedAt ?? REVIEWED_DATE : item.reviewedAt,
      actions: item.supplierId === supplierId && itemStatus === 'reviewed'
        ? ['최근 7일 완료 항목으로 보관합니다.', '추가 조치는 없습니다.']
        : item.actions,
      flow: item.flow.map(node => (
        node.supplierId === supplierId ? { ...node, status } : node
      )),
    };
  });
}

function writeStoredRequestStatus(supplierId: string, status: BoardStatus, reviewedAt?: string) {
  if (typeof window === 'undefined') return;

  const stored = readStoredRequestStatuses();
  const next = JSON.stringify({
    ...stored,
    [supplierId]: { status, reviewedAt },
  });
  try {
    window.localStorage.setItem(REQUEST_STATUS_STORAGE_KEY, next);
  } catch {
    // Cookie fallback still keeps the pages in sync.
  }
  try {
    document.cookie = `${REQUEST_STATUS_STORAGE_KEY}=${encodeURIComponent(next)}; path=/; max-age=604800`;
  } catch {
    // No-op.
  }
}

export default function RequestMapPage() {
  const [requests, setRequests] = useState<RequestItem[]>(() => applyStoredRequestStatuses(initialRequests));
  const [selectedId, setSelectedId] = useState(initialRequests[0].id);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewTargetId, setReviewTargetId] = useState<string | null>(null);

  const selected = requests.find(item => item.id === selectedId) ?? requests[0];
  const reviewTarget = reviewTargetId ? requests.find(item => item.id === reviewTargetId) ?? null : null;
  const contact = getPrimaryContact(selected.supplierId);
  const connectedSuppliers = findConnectedSuppliers(selected.supplierId, requests);

  useEffect(() => {
    const refreshStatuses = () => {
      setRequests(current => applyStoredRequestStatuses(current));
    };

    const params = new URLSearchParams(window.location.search);
    const syncSupplierId = params.get('syncSupplierId');
    const syncStatus = params.get('syncStatus');
    const syncReviewedAt = params.get('reviewedAt') ?? undefined;
    if (syncSupplierId && isBoardStatus(syncStatus)) {
      writeStoredRequestStatus(syncSupplierId, syncStatus, syncReviewedAt);
      setRequests(current => applyRequestStatus(current, syncSupplierId, syncStatus, syncReviewedAt));
      const cleanUrl = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState(null, '', cleanUrl);
    }

    refreshStatuses();
    window.addEventListener('storage', refreshStatuses);
    window.addEventListener('focus', refreshStatuses);

    return () => {
      window.removeEventListener('storage', refreshStatuses);
      window.removeEventListener('focus', refreshStatuses);
    };
  }, []);

  const kpi = useMemo(() => ({
    total: requests.length,
    overdue: requests.filter(item => item.status === 'overdue').length,
    submitted: requests.filter(item => item.status === 'submitted').length,
    dueSoon: requests.filter(item => item.status === 'dueSoon').length,
    progress: requests.filter(item => item.status === 'progress').length,
    reviewed: requests.filter(item => item.status === 'reviewed').length,
  }), [requests]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter(item => {
      const itemContact = getPrimaryContact(item.supplierId);
      const matchesFilter = filterMode === 'all'
        ? item.status !== 'reviewed'
        : item.status === filterMode;
      const matchesSearch = !query || [
        item.id,
        item.title,
        supplierLabel(item.supplierId),
        itemContact?.name ?? '',
        itemContact?.nameEn ?? '',
        ...item.products,
      ].join(' ').toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filterMode, requests, search]);

  const groupedQueue = (filterMode === 'reviewed' ? ['reviewed'] : queueOrder)
    .map(status => ({
      status,
      items: filteredItems.filter(item => item.status === status),
    }))
    .filter(group => group.items.length > 0);

  const handleAction = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2500);
  };

  const openReviewModal = (requestId: string) => {
    setSelectedId(requestId);
    setReviewTargetId(requestId);
  };

  const handleSelectRequest = (item: RequestItem) => {
    if (item.status === 'submitted') {
      openReviewModal(item.id);
      return;
    }
    setSelectedId(item.id);
  };

  const markReviewed = (requestId: string) => {
    setRequests(current => current.map(item => {
      if (item.id !== requestId) return item;
      writeStoredRequestStatus(item.supplierId, 'reviewed', REVIEWED_DATE);
      return {
        ...item,
        status: 'reviewed',
        reviewedAt: REVIEWED_DATE,
        history: [...item.history, `${REVIEWED_DATE} 검토 완료 처리`],
        actions: ['최근 7일 완료 항목으로 보관합니다.', '추가 조치는 없습니다.'],
        flow: item.flow.map(node => node.status === 'submitted' ? { ...node, status: 'reviewed' } : node),
      };
    }));
    setSelectedId(requestId);
    setReviewTargetId(null);
    setNotice('검토 완료 처리되었습니다.');
    window.setTimeout(() => setNotice(null), 2500);
  };

  const openFlowNode = (node: FlowNode) => {
    if (node.status !== 'submitted' || !node.supplierId) return;
    const target = requests.find(item => item.supplierId === node.supplierId && item.status === 'submitted')
      ?? requests.find(item => item.status === 'submitted');
    if (target) openReviewModal(target.id);
  };

  return (
    <>
      <PageHeader
        title="자료 요청 업무 보드"
        description="협력사 자료 요청의 기한, 제출 상태, 검토 대기 항목과 다음 조치를 한 화면에서 처리합니다."
        actions={
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/supply-chain/product-map"
              className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
            >
              공급망 지도
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />

      {notice && (
        <div className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xs border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      )}

      {reviewTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-6">
          <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <StatusChip status="submitted" />
                <h2 className="mt-3 text-xl font-bold text-ink-100">{supplierLabel(reviewTarget.supplierId)}</h2>
                <p className="mt-1 text-sm leading-5 text-ink-500">
                  협력사가 자료를 제출했습니다. 제출 현황 페이지에서 상세 검토하거나, 현재 화면에서 바로 검토 완료 처리할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewTargetId(null)}
                className="rounded-xs border border-ink-700 p-2 text-ink-400 hover:border-ink-500 hover:text-ink-100"
                aria-label="팝업 닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-2">
              <Link
                href="/submission-review"
                className="rounded-xs bg-slate-900 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
              >
                제출 현황 페이지로 이동
              </Link>
              <button
                type="button"
                onClick={() => markReviewed(reviewTarget.id)}
                className="rounded-xs bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700"
              >
                검토 완료
              </button>
              <button
                type="button"
                onClick={() => setReviewTargetId(null)}
                className="rounded-xs border border-ink-700 bg-white py-3 text-sm font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="space-y-5 p-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <KpiCard label="전체 요청" value={kpi.total} tone="neutral" active={filterMode === 'all'} onClick={() => setFilterMode('all')} />
          <KpiCard label="기한 초과" value={kpi.overdue} tone="alert" active={filterMode === 'overdue'} onClick={() => setFilterMode('overdue')} />
          <KpiCard label="검토 대기" value={kpi.submitted} tone="ok" active={filterMode === 'submitted'} onClick={() => setFilterMode('submitted')} />
          <KpiCard label="만료 임박" value={kpi.dueSoon} tone="warn" active={filterMode === 'dueSoon'} onClick={() => setFilterMode('dueSoon')} />
          <KpiCard label="입력 중" value={kpi.progress} tone="info" active={filterMode === 'progress'} onClick={() => setFilterMode('progress')} />
          <KpiCard label="검토 완료" value={kpi.reviewed} tone="neutral" active={filterMode === 'reviewed'} onClick={() => setFilterMode('reviewed')} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
          <aside className="flex flex-col rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="shrink-0 border-b border-ink-700 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-ink-100">업무 큐</h2>
                <span className="text-xs font-semibold text-ink-500">초과 · 대기 · 임박 · 입력</span>
              </div>
              <label className="mt-3 flex items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2 focus-within:border-accent-500">
                <Search className="h-4 w-4 text-ink-500" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="협력사, 품목, 담당자 검색"
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-500"
                />
              </label>
              <div className="mt-3 grid grid-cols-6 gap-1.5">
                {filterOrder.map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilterMode(mode)}
                    className={clsx(
                      'rounded-xs border px-1.5 py-1.5 text-[11px] font-bold transition-colors',
                      filterMode === mode
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-ink-700 bg-white text-ink-400 hover:border-accent-500 hover:text-accent-700',
                    )}
                  >
                    {mode === 'all' ? '전체' : statusMeta[mode].queueLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {groupedQueue.length === 0 && (
                <div className="rounded-xs border border-dashed border-ink-700 p-6 text-center text-sm text-ink-500">
                  조건에 맞는 요청이 없습니다.
                </div>
              )}
              {groupedQueue.map(group => (
                <div key={group.status}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className={clsx('text-xs font-bold', statusMeta[group.status].text)}>{statusMeta[group.status].label}</div>
                    <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-ink-500">{group.items.length}</div>
                  </div>
                  <div className="space-y-2">
                    {group.items.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectRequest(item)}
                        className={clsx(
                          'w-full rounded-sm border bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-control',
                          selected.id === item.id ? statusMeta[item.status].active : 'border-ink-700 hover:border-accent-500',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={clsx('h-2 w-2 rounded-full', statusMeta[item.status].dot)} />
                              <div className="truncate text-sm font-bold text-ink-100">{supplierLabel(item.supplierId)}</div>
                            </div>
                            <div className="mt-1 line-clamp-2 text-xs leading-5 text-ink-500">{item.title}</div>
                          </div>
                          <StatusChip status={item.status} />
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className={clsx('h-full rounded-full', statusMeta[item.status].progress)} style={{ width: `${item.progress}%` }} />
                          </div>
                          <span className="text-[11px] font-bold num-mono text-ink-100">{item.progress}%</span>
                        </div>
                        <div className="mt-2 flex justify-between text-[11px] text-ink-500">
                          <span>{item.status === 'reviewed' ? `검토 완료 ${item.reviewedAt}` : `마감 ${item.dueDate}`}</span>
                          <span>{item.missingItems.length}건</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="min-w-0 rounded-sm border border-ink-700 bg-white p-5 shadow-control">
            <div className="flex flex-col justify-between gap-4 border-b border-ink-700 pb-5 lg:flex-row">
              <div>
                <StatusChip status={selected.status} />
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink-100">{supplierLabel(selected.supplierId)}</h2>
                <p className="mt-1 text-sm text-ink-500">{selected.title} · {selected.id}</p>
              </div>
              <div className="text-left lg:text-right">
                <div className="text-xs font-bold text-ink-500">자료 완성도</div>
                <div className={clsx('mt-1 text-3xl font-bold num-mono', statusMeta[selected.status].text)}>
                  {selected.progress}%
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {[
                [selected.status === 'reviewed' ? '검토 완료일' : '마감일', selected.status === 'reviewed' ? selected.reviewedAt : selected.dueDate],
                ['요청 횟수', `${selected.requestCount}회`],
                ['최근 요청', selected.lastSent],
                ['최근 응답', selected.lastReply],
              ].map(([label, value]) => (
                <div key={label} className="rounded-sm border border-ink-700 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-ink-500">{label}</div>
                  <div className="mt-1 text-sm font-bold text-ink-100">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-sm border border-ink-700 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-ink-100">누락 / 검토 항목</h3>
                <span className={clsx('rounded-full border px-2.5 py-1 text-[11px] font-bold', statusMeta[selected.status].chip)}>
                  {selected.missingItems.length}건
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {selected.missingItems.map(item => (
                  <div key={item} className={clsx('rounded-sm border p-3 text-sm font-semibold', statusMeta[selected.status].chip)}>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-sm border border-ink-700 p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div>
                  <h3 className="text-sm font-bold text-ink-100">영향받는 제품 / 공급망 경로</h3>
                  <p className="mt-1 text-xs text-ink-500">경로 안의 협력사도 현재 요청 상태 색상으로 표시합니다.</p>
                </div>
                <span className={clsx('h-fit rounded-full border px-2.5 py-1 text-[11px] font-bold', statusMeta[selected.status].chip)}>
                  현재 상태: {statusMeta[selected.status].label}
                </span>
              </div>

              <div className="mt-4 overflow-x-auto rounded-sm border border-ink-700 bg-slate-50 p-4">
                <div className="inline-flex min-w-full items-center gap-2">
                  {selected.flow.map((node, index) => (
                    <div key={`${node.name}-${index}`} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openFlowNode(node)}
                        className={clsx(
                          'w-36 rounded-sm border p-3 text-center shadow-sm transition-all',
                          statusMeta[node.status].chip,
                          node.supplierId === selected.supplierId && 'scale-[1.04] outline outline-2 outline-offset-2 outline-emerald-500 shadow-lg',
                          node.status === 'submitted' ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-control' : 'cursor-default',
                        )}
                      >
                        <div className="text-[10px] font-bold opacity-70">{statusMeta[node.status].label}</div>
                        <div className="mt-1 text-xs font-bold leading-4">{node.name}</div>
                        {node.supplierId === selected.supplierId && (
                          <div className="mt-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            선택됨
                          </div>
                        )}
                      </button>
                      {index < selected.flow.length - 1 && <ArrowRight className="h-4 w-4 text-slate-300" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-sm border border-ink-700 bg-slate-50 p-4">
                <div className="text-xs font-bold text-ink-500">영향 제품</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.products.map(product => (
                    <span key={product} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      {product}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {connectedSuppliers.map(item => (
                    <span key={item.id} className={clsx('rounded-full border px-3 py-1 text-[11px] font-semibold', statusMeta[item.status].chip)}>
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-sm border border-ink-700 p-5">
              <h3 className="text-sm font-bold text-ink-100">요청 · 검토 이력</h3>
              <div className="mt-4 space-y-3">
                {selected.history.map(item => (
                  <div key={item} className="flex gap-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                    <div className="text-sm text-ink-400">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
            <h2 className="text-sm font-bold text-ink-100">다음 조치</h2>
            <p className="mt-1 text-xs leading-5 text-ink-500">검토 대기는 승인 처리로, 지연 요청은 재요청과 리스크 공유로 바로 이어집니다.</p>

            <div className="mt-5 rounded-sm border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <UserRound className="h-4 w-4" />
                담당자
              </div>
              <div className="mt-3 text-base font-bold text-ink-100">{contact?.nameEn ?? contact?.name ?? '담당자 미지정'}</div>
              <div className="mt-1 text-xs text-emerald-700">{contact?.role ?? '역할 정보 없음'}{contact?.department ? ` · ${contact.department}` : ''}</div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 rounded-xs border border-emerald-100 bg-white/80 p-3 text-xs font-semibold text-emerald-800">
                  <Mail className="h-3.5 w-3.5" />
                  {contact?.email ?? 'email@example.com'}
                </div>
                <div className="flex items-center gap-2 rounded-xs border border-emerald-100 bg-white/80 p-3 text-xs font-semibold text-emerald-800">
                  <Phone className="h-3.5 w-3.5" />
                  {contact?.phone ?? '+82-00-0000-0000'}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-sm border border-ink-700 p-4">
              <div className="text-xs font-bold text-ink-100">권장 조치</div>
              <div className="mt-3 space-y-2">
                {selected.actions.map((action, index) => (
                  <div key={action} className="rounded-xs border border-slate-100 bg-slate-50 p-3 text-sm leading-5 text-ink-400">
                    <b className="text-ink-100">{index + 1}.</b> {action}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {selected.status === 'submitted' && (
                <>
                  <button
                    type="button"
                    onClick={() => openReviewModal(selected.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xs bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    검토 처리
                  </button>
                  <Link
                    href="/submission-review"
                    className="block w-full rounded-xs border border-ink-700 bg-white py-3 text-center text-sm font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
                  >
                    제출 현황 페이지로 이동
                  </Link>
                </>
              )}
              {selected.status === 'overdue' && (
                <Link
                  href={`/suppliers/check-info?supplierId=${selected.supplierId}&supplier=${encodeURIComponent(supplierLabel(selected.supplierId))}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xs bg-red-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700"
                >
                  <Send className="h-4 w-4" />
                  재요청 / 리마인드 발송
                </Link>
              )}
              {selected.status === 'dueSoon' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleAction('마감 전 리마인드를 발송했습니다.')}
                    className="flex w-full items-center justify-center gap-2 rounded-xs bg-orange-500 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
                  >
                    <Clock3 className="h-4 w-4" />
                    마감 전 리마인드 발송
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('담당자 확인 요청을 보냈습니다.')}
                    className="w-full rounded-xs border border-ink-700 bg-white py-3 text-sm font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
                  >
                    담당자 확인
                  </button>
                </>
              )}
              {selected.status === 'progress' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleAction('입력 현황 확인 요청을 보냈습니다.')}
                    className="w-full rounded-xs bg-blue-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                  >
                    입력 현황 확인
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('마감 전 알림을 예약했습니다.')}
                    className="w-full rounded-xs border border-ink-700 bg-white py-3 text-sm font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
                  >
                    마감 전 알림 예약
                  </button>
                </>
              )}
              {selected.status === 'reviewed' && (
                <button
                  type="button"
                  onClick={() => handleAction('이미 검토 완료된 요청입니다.')}
                  className="flex w-full items-center justify-center gap-2 rounded-xs border border-slate-200 bg-slate-100 py-3 text-sm font-bold text-slate-600"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  검토 완료됨
                </button>
              )}
            </div>

            <div className="mt-5 rounded-sm border border-ink-700 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-ink-100">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                상태 정의
              </div>
              <div className="mt-3 space-y-2 text-xs leading-5 text-ink-500">
                <div><b className="text-red-600">기한 초과</b> = 마감일을 넘겨 즉시 재요청이 필요합니다.</div>
                <div><b className="text-emerald-600">검토 대기</b> = 제출은 완료됐고 내부 검토가 필요합니다.</div>
                <div><b className="text-orange-600">만료 임박</b> = 7일 이내 마감되는 요청입니다.</div>
                <div><b className="text-blue-600">입력 중</b> = 협력사가 자료를 작성 중입니다.</div>
                <div><b className="text-slate-600">검토 완료</b> = 최근 7일 동안 완료 버튼에서 확인할 수 있습니다.</div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}
