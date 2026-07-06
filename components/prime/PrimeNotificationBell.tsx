'use client';

// 원청(KIRA) GNB 알림 벨 — 협력사 측 SupplierNotificationBell(범용 UI)을 재사용한다.
// 데모 알림 스토어(audience='prime')와 백엔드 실 알림(GET /notifications)을 함께 병합해 표시하고,
// 클릭 시 target(맵+협력사 노드)이 있으면 딥링크, 없으면 원청 라우트 맵으로 이동한다.
// AppShell 우상단에 floating으로 마운트된다.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SupplierNotificationBell from '@/components/supplier/SupplierNotificationBell';
import { useDemoNotifications } from '@/lib/demo-notifications';
import { buildMapDeepLink } from '@/lib/notificationDeepLink';
import { getNotifications, markNotificationRead, type NotificationItem } from '@/lib/api';

// 원청 알림 딥링크 키 → 실제 라우트. 협력사 PARTNER_DEEP_LINK_ROUTE의 원청판.
export const PRIME_DEEP_LINK_ROUTE: Record<string, string> = {
  dashboard:        '/dashboard',
  'my-task':        '/my-task',
  'supply-chain':   '/supply-chain',
  'supply-chain-map': '/supply-chain/map',
  suppliers:        '/suppliers',
  'supplier-review':'/suppliers/check-info',
  report:           '/report',
  'report-inbox':   '/report/inbox',
  audit:            '/audit',
};

export default function PrimeNotificationBell() {
  const router = useRouter();
  const demo = useDemoNotifications('prime');

  // 백엔드 실 알림 — 마운트 시 1회 조회. 미로그인/실패 시 빈 배열(데모만 표시).
  const [apiNotifications, setApiNotifications] = useState<NotificationItem[]>([]);
  useEffect(() => {
    getNotifications()
      .then(list => setApiNotifications(list ?? []))
      .catch(() => setApiNotifications([]));
  }, []);

  // 데모 + 실 알림 병합, 최신순. (데모 타입은 UI 관점에서 NotificationItem과 필드 호환)
  const notifications = useMemo(() => {
    const merged = [...(demo.notifications as unknown as NotificationItem[]), ...apiNotifications];
    return merged.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [demo.notifications, apiNotifications]);

  // id가 데모 스토어에 있으면 데모, 아니면 실 API 알림으로 판정.
  const isDemoId = (id: string) => demo.notifications.some(n => n.notification_id === id);

  function markRead(id: string) {
    if (isDemoId(id)) {
      demo.markRead(id);
      return;
    }
    // 실 API: 서버 반영 + 로컬 낙관적 갱신.
    markNotificationRead(id).catch(() => {});
    setApiNotifications(prev =>
      prev.map(n => (n.notification_id === id ? { ...n, status: 'read' as const } : n)),
    );
  }

  function markAllRead() {
    demo.markAllRead();
    const unread = apiNotifications.filter(n => n.status === 'pending');
    unread.forEach(n => markNotificationRead(n.notification_id).catch(() => {}));
    if (unread.length > 0) {
      setApiNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
    }
  }

  return (
    <SupplierNotificationBell
      notifications={notifications}
      onMarkRead={markRead}
      onMarkAllRead={markAllRead}
      onNavigate={(view) => router.push(PRIME_DEEP_LINK_ROUTE[view] ?? '/my-task')}
      onNavigateTarget={(target) => router.push(buildMapDeepLink(target))}
    />
  );
}
