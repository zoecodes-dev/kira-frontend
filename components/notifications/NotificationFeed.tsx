'use client';

// 대시보드/진입화면 인라인 알림 피드 — 벨과 별개로, 화면 본문에서도 최근 알림을 바로 확인.
// audience로 원청/협력사 알림을 구분하며, 항목 클릭 시 읽음 처리 + 딥링크 이동.
import { useRouter } from 'next/navigation';
import { Bell, ChevronRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useDemoNotifications, type DemoAudience, type DemoNotifType } from '@/lib/demo-notifications';
import { buildMapDeepLink } from '@/lib/notificationDeepLink';
import type { NotificationTarget } from '@/lib/api';

// 피드가 렌더에 필요로 하는 최소 필드 — 데모(DemoNotification)·실 API(NotificationItem) 모두 호환.
type FeedItem = {
  notification_id: string;
  notification_type: DemoNotifType;
  subject: string;
  body: string;
  status: 'pending' | 'read';
  created_at: string;
  deep_link?: string;
  target?: NotificationTarget;
  actor?: string;
};

const TYPE_ICON: Record<DemoNotifType, { icon: React.ElementType; cls: string; bar: string }> = {
  sla_warning:     { icon: Clock,         cls: 'text-warn-text',   bar: 'bg-warn-solid' },
  violation:       { icon: AlertTriangle, cls: 'text-alert-text',  bar: 'bg-alert-solid' },
  approval_needed: { icon: CheckCircle2,  cls: 'text-accent-700',  bar: 'bg-accent-600' },
  info:            { icon: Bell,          cls: 'text-ink-500',     bar: 'bg-ink-500' },
};

function relTime(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function NotificationFeed({
  audience,
  deepLinkMap,
  fallbackRoute,
  allRoute,
  limit = 5,
  className,
  notifications: injectedNotifications,
  onMarkRead,
}: {
  audience: DemoAudience;
  /** 딥링크 키 → 라우트 */
  deepLinkMap: Record<string, string>;
  /** 딥링크 미해석 시 이동 라우트 */
  fallbackRoute: string;
  /** "전체 보기" 클릭 시 이동할 알림함 라우트 (없으면 버튼 숨김) */
  allRoute?: string;
  limit?: number;
  className?: string;
  /** 실 API 등 외부 알림 주입(선택). 주면 데모 스토어 대신 이걸 표시. 원청은 실 API를 주입한다. */
  notifications?: FeedItem[];
  /** 주입 모드일 때의 읽음 처리. */
  onMarkRead?: (id: string) => void;
}) {
  const router = useRouter();
  const demo = useDemoNotifications(audience);
  // 외부 주입(실 API)이 있으면 그것을, 없으면 데모 스토어를 쓴다(하위 호환 — 협력사 등).
  const notifications: FeedItem[] = injectedNotifications ?? demo.notifications;
  const markRead = onMarkRead ?? demo.markRead;
  const unread = notifications.filter(n => n.status === 'pending').length;
  const shown = notifications.slice(0, limit);

  function open(n: FeedItem) {
    markRead(n.notification_id);
    // target(맵+협력사 노드)이 있으면 정밀 이동, 없으면 deep_link 라우트로 폴백.
    router.push(n.target ? buildMapDeepLink(n.target) : (n.deep_link && deepLinkMap[n.deep_link]) || fallbackRoute);
  }

  return (
    <div className={`rounded-sm border border-ink-700 bg-white shadow-control ${className ?? ''}`}>
      <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-accent-700" />
          <span className="text-sm font-bold text-ink-100">알림</span>
          {unread > 0 && (
            <span className="rounded-xs border border-alert-border bg-alert-bg px-1.5 py-0.5 text-[10px] font-bold text-alert-text">
              미확인 {unread}
            </span>
          )}
        </div>
        {allRoute && (
          <button
            type="button"
            onClick={() => router.push(allRoute)}
            className="text-[10px] font-semibold text-accent-700 hover:underline"
          >
            전체 보기 →
          </button>
        )}
      </div>
      <div className="divide-y divide-ink-800">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Bell className="h-7 w-7 text-ink-500" />
            <p className="text-xs font-medium text-ink-500">새 알림이 없습니다</p>
          </div>
        ) : (
          shown.map(n => {
            const cfg = TYPE_ICON[n.notification_type] ?? TYPE_ICON.info;
            const Icon = cfg.icon;
            const unreadItem = n.status === 'pending';
            return (
              <button
                key={n.notification_id}
                type="button"
                onClick={() => open(n)}
                className={`relative flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent-50/50 ${unreadItem ? 'bg-white' : 'bg-ink-800/40'}`}
              >
                <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${unreadItem ? cfg.bar : 'bg-ink-700'}`} />
                <span className={`mt-0.5 shrink-0 ${unreadItem ? cfg.cls : 'text-ink-500'}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-[11px] font-bold ${unreadItem ? 'text-ink-100' : 'text-ink-500'}`}>{n.subject}</span>
                    {unreadItem && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-alert-solid" />}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-ink-500">{n.body}</span>
                  <span className="mt-1 block text-[9px] text-ink-500">{n.actor ? `${n.actor} · ` : ''}{relTime(n.created_at)}</span>
                </span>
                <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-500" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
