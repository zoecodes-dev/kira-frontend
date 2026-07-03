'use client';

// 원청사 알림 (/partner/notifications) — app/supplier/page.tsx의 activeView==='notifications' 분기를 이관.
// 선택된 알림(selectedNotifId)은 특정 알림으로 딥링크 공유가 의미 있는 값이라 URL 쿼리(?notif=)로 관리한다.
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Bell } from 'lucide-react';
import { usePartnerWorkspace } from './PartnerWorkspaceContext';
import { PARTNER_DEEP_LINK_LABEL, PARTNER_DEEP_LINK_ROUTE } from './partnerFormatters';

const NOTIF_TYPE_CONFIG = {
  sla_warning:     { barCls: 'bg-warn-solid',  iconCls: 'text-warn-text',  bgUnread: 'bg-warn-bg',  label: '기한 임박' },
  violation:       { barCls: 'bg-alert-solid',    iconCls: 'text-alert-text',    bgUnread: 'bg-alert-bg',    label: '위반 지적' },
  approval_needed: { barCls: 'bg-accent-500', iconCls: 'text-accent-600', bgUnread: 'bg-accent-50/30', label: '확인 요청' },
  info:            { barCls: 'bg-ink-500',    iconCls: 'text-ink-500',    bgUnread: 'bg-ink-800/20',   label: '안내' },
} as const;

function formatRelTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export default function PartnerNotifications() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notifications, markNotifRead, markAllNotifsRead } = usePartnerWorkspace();

  const selectedNotifId = searchParams.get('notif');

  // 쿼리에 선택된 알림이 없으면(최초 진입) 첫 알림을 기본 선택 — 기존 activeView 체계의
  // "목록 로드 시 첫 알림 자동 선택" 동작과 동일하게 유지. history를 늘리지 않도록 replace 사용.
  useEffect(() => {
    if (!selectedNotifId && notifications.length > 0) {
      router.replace(`/partner/notifications?notif=${notifications[0].notification_id}`);
    }
  }, [selectedNotifId, notifications, router]);

  const unreadCount = notifications.filter(n => n.status === 'pending').length;
  const selectedNotif = notifications.find(n => n.notification_id === selectedNotifId);

  function handleNotifSelect(id: string) {
    router.push(`/partner/notifications?notif=${id}`);
    markNotifRead(id);
  }

  return (
    <div className="grid grid-cols-[340px_1fr] items-start gap-4 min-h-[600px]">

      {/* 좌: 수신함 목록 */}
      <div className="rounded-sm border border-ink-700 bg-white shadow-control overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-ink-500" />
            <span className="text-xs font-bold text-ink-100">원청사 알림</span>
            {unreadCount > 0 && (
              <span className="rounded-xs border border-alert-border bg-alert-bg px-1.5 py-0.5 text-[9px] font-bold text-alert-text">
                미확인 {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllNotifsRead} className="text-[10px] font-medium text-accent-600 hover:underline">
              모두 읽음
            </button>
          )}
        </div>
        <ul className="divide-y divide-ink-800">
          {notifications.map(notif => {
            const cfg = NOTIF_TYPE_CONFIG[notif.notification_type];
            const isUnread   = notif.status === 'pending';
            const isSelected = notif.notification_id === selectedNotifId;
            return (
              <li key={notif.notification_id}>
                <button
                  type="button"
                  onClick={() => handleNotifSelect(notif.notification_id)}
                  className={[
                    'relative w-full text-left px-4 py-3.5 transition-colors',
                    isSelected  ? 'bg-accent-50 ring-1 ring-inset ring-accent-400' : '',
                    !isSelected && isUnread  ? cfg.bgUnread : '',
                    !isSelected && !isUnread ? 'bg-white hover:bg-ink-800/20' : '',
                  ].join(' ')}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r-xs ${isUnread ? cfg.barCls : 'bg-ink-700'}`} />
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`text-[11px] font-bold leading-snug ${isUnread ? 'text-ink-100' : 'text-ink-500'}`}>
                      {notif.subject}
                    </span>
                    {isUnread && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-alert-solid" />}
                  </div>
                  <p className="line-clamp-2 text-[10px] text-ink-500 leading-relaxed mb-1.5">{notif.body}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-semibold rounded-xs border px-1.5 py-px ${isUnread ? 'bg-ink-800 border-ink-700 text-ink-500' : 'bg-ink-900 border-ink-800 text-ink-500'}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[9px] text-ink-600">{formatRelTime(notif.created_at)}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 우: 상세 내용 패널 */}
      {selectedNotif ? (
        <div className="rounded-sm border border-ink-700 bg-white shadow-control overflow-hidden flex flex-col">
          {/* 상세 헤더 */}
          <div className={`border-b px-6 py-5 ${
            selectedNotif.notification_type === 'violation'     ? 'border-alert-border bg-alert-solid' :
            selectedNotif.notification_type === 'sla_warning'   ? 'border-warn-border bg-warn-solid' :
                                                                  'border-accent-200 bg-accent-700'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">
                  {NOTIF_TYPE_CONFIG[selectedNotif.notification_type].label}
                </div>
                <div className="text-base font-bold text-white leading-snug">{selectedNotif.subject}</div>
              </div>
              <span className="shrink-0 rounded-xs border border-white/30 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                {selectedNotif.status === 'pending' ? '미확인' : '읽음'}
              </span>
            </div>
            <div className="mt-2 text-[10px] text-white/60">{formatRelTime(selectedNotif.created_at)}</div>
          </div>

          {/* 본문 */}
          <div className="flex-1 px-6 py-6">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-wider text-ink-500">메시지 본문</div>
            <p className="rounded-xs border border-ink-700 bg-ink-800 px-4 py-4 text-xs leading-6 text-ink-200">
              {selectedNotif.body}
            </p>
            <div className="mt-5 rounded-xs border border-ink-700 bg-white p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500 mb-3">관련 정보</div>
              <div className="space-y-2 text-[11px]">
                {[
                  ['발신', '원청사 ESG 담당팀'],
                  ['수신', '내 회사 담당자'],
                  ['유형', NOTIF_TYPE_CONFIG[selectedNotif.notification_type].label],
                  ...(selectedNotif.deep_link ? [['관련 탭', PARTNER_DEEP_LINK_LABEL[selectedNotif.deep_link] ?? selectedNotif.deep_link]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3">
                    <span className="w-16 shrink-0 font-bold text-ink-500">{k}</span>
                    <span className={`font-semibold ${k === '유형' ? NOTIF_TYPE_CONFIG[selectedNotif.notification_type].iconCls : 'text-ink-200'}`}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 하단 CTA */}
          <div className="border-t border-ink-700 bg-ink-800/20 px-6 py-4 flex items-center justify-between gap-3">
            <div className="text-[10px] text-ink-500">
              이 알림과 관련된 자료를 즉시 제출하거나 해당 화면으로 이동할 수 있습니다.
            </div>
            {selectedNotif.deep_link && (
              <button
                type="button"
                onClick={() => router.push(PARTNER_DEEP_LINK_ROUTE[selectedNotif.deep_link as string] ?? '/partner')}
                className="inline-flex shrink-0 items-center gap-2 rounded-xs bg-accent-700 px-4 py-2.5 text-xs font-bold text-white shadow-control hover:bg-accent-900 transition-colors"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                {selectedNotif.deep_link === 'company-info' ? '해당 자료 제출하러 가기' : `${PARTNER_DEEP_LINK_LABEL[selectedNotif.deep_link] ?? '관련 화면'} 바로 가기`}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-ink-700 bg-white py-16 text-center">
          <Bell className="h-10 w-10 text-ink-600" strokeWidth={1.2} />
          <div className="text-xs font-semibold text-ink-500">좌측에서 알림을 선택하세요</div>
        </div>
      )}
    </div>
  );
}
