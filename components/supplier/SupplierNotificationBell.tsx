'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

type NotificationType = 'sla_warning' | 'violation' | 'approval_needed' | 'info';
type NotificationStatus = 'pending' | 'read';

interface Notification {
  notification_id: string;
  notification_type: NotificationType;
  subject: string;
  body: string;
  status: NotificationStatus;
  created_at: string;
  /** 클릭 시 이동할 내부 경로 (없으면 패널 내에서만 읽음 처리) */
  deep_link?: string;
}

// ─── Mock 알림 데이터 (notifications.mock.ts 구조 준수) ───────────────────────
//     실제 API 연동 시 이 상수를 fetch 호출로 교체합니다.

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    notification_id: 'notif-001',
    notification_type: 'sla_warning',
    subject: '원산지 증빙 제출 기한 임박',
    body: '광산 폴리곤 좌표 등록 요청의 마감이 3일 남았습니다. 기한 내 미제출 시 보완 요청으로 전환됩니다.',
    status: 'pending',
    created_at: '2026-06-08T09:30:00Z',
    deep_link: '/supplier/submit?step=1',
  },
  {
    notification_id: 'notif-002',
    notification_type: 'violation',
    subject: 'EUDR 규정 위반 항목 지적',
    body: '환경영향평가 갱신본이 기준을 충족하지 않아 반려되었습니다. 시정 완료 회신 폼을 제출해 주세요.',
    status: 'pending',
    created_at: '2026-06-07T14:20:00Z',
    deep_link: '/supplier/status',
  },
  {
    notification_id: 'notif-003',
    notification_type: 'approval_needed',
    subject: 'AI 파싱 결과 확인 요청',
    body: '업로드하신 인증서 PDF의 AI 추출 결과에서 신뢰도 낮은 항목 2건이 발견되었습니다. 검토 후 확인해 주세요.',
    status: 'read',
    created_at: '2026-06-06T11:05:00Z',
    deep_link: '/supplier/portal',
  },
];

// ─── 알림 유형별 스타일 맵 ────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotificationType,
  {
    icon: React.ElementType;
    iconClass: string;
    barClass: string;
    label: string;
  }
> = {
  sla_warning: {
    icon: Clock,
    iconClass: 'text-amber-500',
    barClass: 'bg-amber-500',
    label: '기한 임박',
  },
  violation: {
    icon: AlertTriangle,
    iconClass: 'text-red-500',
    barClass: 'bg-red-500',
    label: '위반 지적',
  },
  approval_needed: {
    icon: CheckCircle2,
    iconClass: 'text-accent-600',
    barClass: 'bg-accent-600',
    label: '확인 요청',
  },
  info: {
    icon: Bell,
    iconClass: 'text-ink-500',
    barClass: 'bg-ink-500',
    label: '안내',
  },
};

// ─── 날짜 포맷 헬퍼 ───────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function SupplierNotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => n.status === 'pending').length;

  // 드로어 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' as const })));
  }

  function markOneRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, status: 'read' as const } : n))
    );
  }

  return (
    // position:relative 기준점 — PageHeader의 flex row 안에서 정렬
    <div className="relative">

      {/* ── 알림 벨 버튼 ─────────────────────────────────────── */}
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={`알림 ${unreadCount > 0 ? `(미확인 ${unreadCount}건)` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`
          relative inline-flex items-center justify-center
          h-8 w-8 rounded-xs border
          transition-colors duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-1
          ${open
            ? 'border-accent-500 bg-accent-50 text-accent-600'
            : 'border-ink-700 bg-white text-ink-500 hover:border-accent-500 hover:text-accent-600'
          }
        `}
      >
        <Bell className="h-3.5 w-3.5" />

        {/* 미확인 배지 */}
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="
              absolute -top-1.5 -right-1.5
              min-w-[16px] h-4 px-[3px]
              flex items-center justify-center
              rounded-full bg-red-500
              text-[9px] font-bold leading-none text-white
              ring-2 ring-white
              pointer-events-none
            "
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── 슬라이드 오버 드로어 ──────────────────────────────── */}
      {/*
        PageHeader는 sticky top-0 z-10.
        드로어는 z-50으로 PageHeader보다 위에 렌더링되어야 하지만,
        position:fixed로 뷰포트 기준 우측 상단에 붙임으로써
        사이드바·콘텐츠 영역에 무관하게 올바르게 표시됩니다.
      */}

      {/* 배경 오버레이 (반투명) */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`
          fixed inset-0 z-40
          bg-black/20 backdrop-blur-[1px]
          transition-opacity duration-200
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* 드로어 패널 */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="알림 패널"
        className={`
          fixed top-0 right-0 z-50
          h-full w-[360px]
          flex flex-col
          bg-white border-l border-ink-700
          shadow-[−4px_0_24px_rgba(0,0,0,0.08)]
          transition-transform duration-250 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* 드로어 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-ink-500" />
            <span className="text-xs font-bold text-ink-100">알림</span>
            {unreadCount > 0 && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-xs bg-red-50 text-red-600 border border-red-200">
                미확인 {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] font-medium text-accent-600 hover:text-accent-700 hover:underline"
              >
                모두 읽음
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="알림 패널 닫기"
              className="inline-flex items-center justify-center h-7 w-7 rounded-xs border border-ink-700 text-ink-500 hover:border-ink-600 hover:text-ink-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 알림 목록 */}
        <ul className="flex-1 overflow-y-auto divide-y divide-ink-800" role="list">
          {notifications.length === 0 ? (
            <li className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Bell className="h-8 w-8 text-ink-500" />
              <p className="text-xs font-medium text-ink-500">새 알림이 없습니다</p>
            </li>
          ) : (
            notifications.map((notif) => {
              const cfg = TYPE_CONFIG[notif.notification_type];
              const Icon = cfg.icon;
              const isUnread = notif.status === 'pending';

              const cardContent = (
                <div
                  className={`
                    relative flex gap-3 px-5 py-4
                    transition-colors duration-100
                    ${isUnread ? 'bg-white' : 'bg-ink-800'}
                    hover:bg-accent-50/50
                  `}
                >
                  {/* 왼쪽 컬러 바 (알림 유형) */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isUnread ? cfg.barClass : 'bg-ink-700'} rounded-r-sm`} />

                  {/* 유형 아이콘 */}
                  <div className={`shrink-0 mt-0.5 ${isUnread ? cfg.iconClass : 'text-ink-500'}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* 본문 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className={`text-[11px] font-bold leading-snug ${isUnread ? 'text-ink-100' : 'text-ink-500'}`}>
                        {notif.subject}
                      </p>
                      {isUnread && (
                        <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-red-500 mt-1" aria-hidden="true" />
                      )}
                    </div>
                    <p className="text-[10px] text-ink-500 leading-relaxed line-clamp-2">
                      {notif.body}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-[9px] font-semibold px-1.5 py-px rounded-xs border ${
                        isUnread
                          ? 'bg-ink-800 text-ink-500 border-ink-700'
                          : 'bg-ink-900 text-ink-500 border-ink-800'
                      }`}>
                        {cfg.label}
                      </span>
                      <span className="text-[9px] text-ink-500">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* 딥링크 화살표 */}
                  {notif.deep_link && (
                    <div className={`shrink-0 self-center ${isUnread ? 'text-ink-500' : 'text-ink-600'}`}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              );

              return (
                <li key={notif.notification_id}>
                  {notif.deep_link ? (
                    <Link
                      href={notif.deep_link}
                      onClick={() => {
                        markOneRead(notif.notification_id);
                        setOpen(false);
                      }}
                      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500"
                    >
                      {cardContent}
                    </Link>
                  ) : (
                    <button
                      onClick={() => markOneRead(notif.notification_id)}
                      className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500"
                    >
                      {cardContent}
                    </button>
                  )}
                </li>
              );
            })
          )}
        </ul>

        {/* 드로어 푸터 */}
        <div className="px-5 py-3 border-t border-ink-700 bg-ink-800 shrink-0">
          <p className="text-[9px] text-ink-500 text-center">
            최근 30일 알림을 표시합니다
          </p>
        </div>
      </div>
    </div>
  );
}