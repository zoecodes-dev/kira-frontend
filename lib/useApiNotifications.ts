'use client';

// 백엔드 실 알림(GET /notifications)을 구독하는 훅 — 데모 스토어(useDemoNotifications)의
// 실 API 버전. 원청은 데모가 아니라 이 훅으로 알림을 받는다(마운트 시 1회 조회, 폴링 없음).
// 읽음 처리는 PATCH /notifications/{id}/read + 로컬 낙관적 갱신.

import { useCallback, useEffect, useState } from 'react';
import { getNotifications, markNotificationRead, type NotificationItem } from './api';

export interface UseApiNotifications {
  notifications: NotificationItem[];
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export function useApiNotifications(): UseApiNotifications {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    getNotifications()
      .then(list => setNotifications((list ?? []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))))
      .catch(() => setNotifications([]));
  }, []);

  const markRead = useCallback((id: string) => {
    markNotificationRead(id).catch(() => {});
    setNotifications(prev =>
      prev.map(n => (n.notification_id === id ? { ...n, status: 'read' as const } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      prev
        .filter(n => n.status === 'pending')
        .forEach(n => markNotificationRead(n.notification_id).catch(() => {}));
      return prev.map(n => ({ ...n, status: 'read' as const }));
    });
  }, []);

  return { notifications, markRead, markAllRead };
}
