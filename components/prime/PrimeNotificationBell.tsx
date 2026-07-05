'use client';

// 원청(KIRA) GNB 알림 벨 — 협력사 측 SupplierNotificationBell(범용 UI)을 그대로 재사용하되,
// 데모 알림 스토어(audience='prime')를 구독하고 원청 딥링크 맵으로 라우팅한다.
// AppShell 우상단에 floating으로 마운트된다.

import { useRouter } from 'next/navigation';
import SupplierNotificationBell from '@/components/supplier/SupplierNotificationBell';
import { useDemoNotifications } from '@/lib/demo-notifications';

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
  const { notifications, markRead, markAllRead } = useDemoNotifications('prime');

  return (
    <SupplierNotificationBell
      notifications={notifications}
      onMarkRead={markRead}
      onMarkAllRead={markAllRead}
      onNavigate={(view) => router.push(PRIME_DEEP_LINK_ROUTE[view] ?? '/my-task')}
    />
  );
}
