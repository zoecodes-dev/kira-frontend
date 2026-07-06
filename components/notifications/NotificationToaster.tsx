'use client';

// 새 알림 토스트 팝업 — audience의 데모 알림 스토어를 구독하다가, 마운트 이후 "새로 도착한"
// 알림(다른 탭에서 BroadcastChannel로 전파된 것 포함)을 우상단 토스트로 띄운다.
// 클릭하면 읽음 처리 + 딥링크 이동, 일정 시간 후 자동 소멸.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { useDemoNotifications, peekDemoNotifications, type DemoAudience, type DemoNotifType, type DemoNotification } from '@/lib/demo-notifications';
import { buildMapDeepLink } from '@/lib/notificationDeepLink';

const TYPE_META: Record<DemoNotifType, { icon: React.ElementType; ring: string; icon_cls: string; label: string }> = {
  sla_warning:     { icon: Clock,         ring: 'border-l-warn-solid',  icon_cls: 'text-warn-text',   label: '기한 임박' },
  violation:       { icon: AlertTriangle, ring: 'border-l-alert-solid', icon_cls: 'text-alert-text',  label: '위반 지적' },
  approval_needed: { icon: CheckCircle2,  ring: 'border-l-accent-600',  icon_cls: 'text-accent-700',  label: '확인 요청' },
  info:            { icon: Bell,          ring: 'border-l-ink-500',     icon_cls: 'text-ink-500',     label: '안내' },
};

const AUTO_DISMISS_MS = 7000;

export default function NotificationToaster({
  audience,
  deepLinkMap,
  fallbackRoute,
}: {
  audience: DemoAudience;
  deepLinkMap: Record<string, string>;
  fallbackRoute: string;
}) {
  const router = useRouter();
  const { notifications, markRead } = useDemoNotifications(audience);
  const [toasts, setToasts] = useState<DemoNotification[]>([]);
  // 마운트 시점에 이미 존재하던 알림(시드 등)은 토스트하지 않기 위해 seen을 초기화.
  const seen = useRef<Set<string>>(new Set());
  const ready = useRef(false);

  useEffect(() => {
    if (!ready.current) {
      // 마운트 시점 기준선: 이미 존재하던 알림(시드·기존)은 토스트하지 않는다.
      // React 렌더 스냅샷은 첫 렌더에 빈 배열(SSR 정합)이라, 스토어의 실제 현재값(peek)으로 기준선을 잡는다.
      peekDemoNotifications().forEach(n => {
        if (n.audience === audience) seen.current.add(n.notification_id);
      });
      ready.current = true;
      return;
    }
    const fresh = notifications.filter(n => !seen.current.has(n.notification_id));
    if (fresh.length === 0) return;
    fresh.forEach(n => seen.current.add(n.notification_id));
    // 새로 도착한(pending) 알림만 토스트로. 최신이 위로.
    const toToast = fresh.filter(n => n.status === 'pending');
    if (toToast.length > 0) {
      setToasts(prev => [...toToast, ...prev].slice(0, 4));
    }
  }, [notifications]);

  // 각 토스트 자동 소멸 타이머
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map(t =>
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.notification_id !== t.notification_id));
      }, AUTO_DISMISS_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  function dismiss(id: string) {
    setToasts(prev => prev.filter(x => x.notification_id !== id));
  }
  function open(n: DemoNotification) {
    markRead(n.notification_id);
    dismiss(n.notification_id);
    // target(맵+협력사 노드)이 있으면 정밀 이동, 없으면 deep_link 라우트로 폴백.
    router.push(n.target ? buildMapDeepLink(n.target) : (n.deep_link && deepLinkMap[n.deep_link]) || fallbackRoute);
  }

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[60] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map(n => {
        const meta = TYPE_META[n.notification_type] ?? TYPE_META.info;
        const Icon = meta.icon;
        return (
          <div
            key={n.notification_id}
            className={`toast-in pointer-events-auto relative overflow-hidden rounded-sm border border-l-4 border-ink-700 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.14)] ${meta.ring}`}
          >
            <button type="button" onClick={() => open(n)} className="flex w-full items-start gap-3 px-4 py-3 text-left">
              <span className={`mt-0.5 shrink-0 ${meta.icon_cls}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="rounded-xs bg-ink-800 px-1.5 py-0.5 text-[9px] font-bold text-ink-500">{meta.label}</span>
                  <span className="truncate text-[11px] font-bold text-ink-100">{n.subject}</span>
                </span>
                <span className="mt-1 block text-[10px] leading-relaxed text-ink-500 line-clamp-2">{n.body}</span>
                <span className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-accent-700">
                  바로 확인 <ChevronRight className="h-3 w-3" />
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => dismiss(n.notification_id)}
              aria-label="닫기"
              className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-xs text-ink-500 hover:bg-ink-800 hover:text-ink-200"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
