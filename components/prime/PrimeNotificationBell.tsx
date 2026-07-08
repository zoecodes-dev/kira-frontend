'use client';

// 원청(KIRA) GNB 알림 벨 — 협력사 측 SupplierNotificationBell(범용 UI)을 재사용한다.
// 원청은 백엔드 실 알림(GET /notifications)만 표시한다(데모 스토어 미사용).
// 클릭 시 target(맵+협력사 노드)이 있으면 딥링크, 없으면 원청 라우트 맵으로 이동한다.
// AppShell 우상단(공통 헤더)에 마운트된다.

import { useRouter } from 'next/navigation';
import SupplierNotificationBell from '@/components/supplier/SupplierNotificationBell';
import { buildMapDeepLink } from '@/lib/notificationDeepLink';
import { useApiNotifications } from '@/lib/useApiNotifications';

// 원청 알림 딥링크 키 → 실제 라우트. 협력사 PARTNER_DEEP_LINK_ROUTE의 원청판.
export const PRIME_DEEP_LINK_ROUTE: Record<string, string> = {
  dashboard:        '/dashboard',
  'my-task':        '/my-task',
  'supply-chain':   '/supply-chain',
  'supply-chain-map': '/supply-chain/map',
  suppliers:        '/suppliers',
  'supplier-review':'/suppliers/check-info',
  audit:            '/audit',
};

export default function PrimeNotificationBell() {
  const router = useRouter();
  const { notifications, markRead, markAllRead } = useApiNotifications();

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
