'use client';

// ─── 데모 알림 코어 ────────────────────────────────────────────────────────────
// 백엔드에는 알림 생성(push) 엔드포인트가 없다. 데모 시나리오(process.md)의 핵심인
// "A가 행동하면 → B에게 알림이 뜨고 → 클릭하면 이동해 화면이 바뀐다"를 구현하기 위해
// 클라이언트 사이드 알림 스토어를 둔다.
//
// · 저장: localStorage (같은 브라우저의 모든 탭이 공유하는 durable 상태)
// · 전파: BroadcastChannel (원청 탭에서 발생시킨 알림을 협력사 탭이 "실시간"으로 수신)
// · 폴백: window 'storage' 이벤트 (BroadcastChannel 미지원 환경)
//
// audience 로 원청('prime') / 협력사('partner') 벨을 구분한다. 각 벨은 자기 audience의
// 알림만 렌더링한다. deep_link 는 클릭 시 이동할 라우트 키(각 side의 딥링크 맵에서 해석).

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { NotificationTarget } from './api';

export type DemoAudience = 'prime' | 'partner';
export type DemoNotifType = 'sla_warning' | 'violation' | 'approval_needed' | 'info';
export type DemoNotifStatus = 'pending' | 'read';

export interface DemoNotification {
  notification_id: string;
  audience: DemoAudience;
  notification_type: DemoNotifType;
  subject: string;
  body: string;
  status: DemoNotifStatus;
  created_at: string;
  /** 클릭 시 이동할 딥링크 키 — audience별 딥링크 맵에서 라우트로 해석 */
  deep_link?: string;
  /** 맵/협력사 노드 딥링크 좌표(선택). 있으면 deep_link보다 우선해 정밀 이동. */
  target?: NotificationTarget;
  /** 발신 주체 라벨(예: "한양셀 제조(주)", "KIRA 원청") — 표시에 참고 */
  actor?: string;
}

const STORAGE_KEY = 'kira_demo_notifications';
const SEED_FLAG_KEY = 'kira_demo_notifications_seeded';
const CHANNEL_NAME = 'kira-demo-notif';

const isBrowser = typeof window !== 'undefined';

// ─── 초기 시드 ──────────────────────────────────────────────────────────────────
// 데모 시작 시점에 벨이 비어 보이지 않도록 "과거 맥락" 알림을 최소한으로 심는다.
// 이후 실제 행동으로 발생하는 알림이 이 위에 쌓인다.
function seedNotifications(): DemoNotification[] {
  const now = Date.now();
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  return [
    {
      notification_id: 'seed-partner-1',
      audience: 'partner',
      notification_type: 'sla_warning',
      subject: '원산지 증빙 제출 기한 임박',
      body: '광산 폴리곤 좌표 등록 요청의 마감이 임박했습니다. 기한 내 미제출 시 보완 요청으로 전환됩니다.',
      status: 'pending',
      created_at: ago(180),
      deep_link: 'company-info',
      actor: 'KIRA 원청',
    },
    {
      notification_id: 'seed-partner-2',
      audience: 'partner',
      notification_type: 'approval_needed',
      subject: 'AI 파싱 결과 확인 요청',
      body: '업로드하신 문서의 AI 추출 결과에서 확인이 필요한 항목이 있습니다. 검토 후 제출해 주세요.',
      status: 'read',
      created_at: ago(600),
      deep_link: 'ai-parsing',
      actor: 'KIRA 시스템',
    },
    // 원청(prime) 시드는 두지 않는다 — 원청 알림은 백엔드 실 알림(GET /notifications)만 표시한다.
  ];
}

// ─── 모듈 스토어 ────────────────────────────────────────────────────────────────
let cache: DemoNotification[] = [];
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
let initialized = false;

function readStorage(): DemoNotification[] {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DemoNotification[];
  } catch {
    /* 파싱 실패 시 빈 배열 */
  }
  return [];
}

function writeStorage(list: DemoNotification[]) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* 용량 초과 등 무시 */
  }
}

function ensureInit() {
  if (initialized || !isBrowser) return;
  initialized = true;

  // 최초 1회 시드 (브라우저당 한 번). 이후에는 localStorage 내용을 그대로 사용.
  if (!window.localStorage.getItem(SEED_FLAG_KEY)) {
    const seeded = seedNotifications();
    writeStorage(seeded);
    window.localStorage.setItem(SEED_FLAG_KEY, '1');
    cache = seeded;
  } else {
    cache = readStorage();
  }

  // 다른 탭에서의 변경 수신 → 캐시 재로드 후 구독자 통지
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => {
      cache = readStorage();
      emit();
    };
  } catch {
    channel = null;
  }

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      cache = readStorage();
      emit();
    }
  });
}

function emit() {
  listeners.forEach((l) => l());
}

/** 변경 사항을 저장 + 다른 탭에 전파 + 구독자 통지 */
function commit(next: DemoNotification[]) {
  cache = next;
  writeStorage(next);
  try {
    channel?.postMessage({ type: 'update' });
  } catch {
    /* 채널 없음 무시 */
  }
  emit();
}

function genId(): string {
  if (isBrowser && 'crypto' in window && typeof window.crypto.randomUUID === 'function') {
    return `demo-${window.crypto.randomUUID()}`;
  }
  return `demo-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// ─── 공개 API (React 밖에서도 호출 가능) ──────────────────────────────────────────

export interface AddDemoNotificationInput {
  audience: DemoAudience;
  notification_type?: DemoNotifType;
  subject: string;
  body: string;
  deep_link?: string;
  target?: NotificationTarget;
  actor?: string;
}

/**
 * 데모 알림 1건을 발생시킨다. 반대편(또는 같은) audience의 벨에 즉시 나타난다.
 * 서버가 없어도 동작하므로 어떤 이벤트 핸들러에서든 안전하게 호출할 수 있다.
 */
export function addDemoNotification(input: AddDemoNotificationInput): DemoNotification {
  ensureInit();
  const notif: DemoNotification = {
    notification_id: genId(),
    audience: input.audience,
    notification_type: input.notification_type ?? 'info',
    subject: input.subject,
    body: input.body,
    status: 'pending',
    created_at: new Date().toISOString(),
    deep_link: input.deep_link,
    target: input.target,
    actor: input.actor,
  };
  // 최신이 위로 오도록 앞에 붙인다.
  commit([notif, ...cache]);
  return notif;
}

/**
 * 현재 알림 스냅샷을 즉시 반환(초기화 포함). React 렌더 스냅샷은 SSR-하이드레이션 정합을 위해
 * 첫 렌더에서 빈 배열이라, "마운트 시점에 이미 존재하던 알림" 기준선을 잡을 때는 이걸 쓴다.
 */
export function peekDemoNotifications(): DemoNotification[] {
  ensureInit();
  return cache;
}

export function markDemoRead(id: string) {
  ensureInit();
  if (!cache.some((n) => n.notification_id === id && n.status !== 'read')) return;
  commit(cache.map((n) => (n.notification_id === id ? { ...n, status: 'read' as const } : n)));
}

export function markDemoAllRead(audience: DemoAudience) {
  ensureInit();
  if (!cache.some((n) => n.audience === audience && n.status !== 'read')) return;
  commit(
    cache.map((n) => (n.audience === audience ? { ...n, status: 'read' as const } : n)),
  );
}

/** 데모 리셋 — 시드 상태로 되돌린다(반복 시연용). */
export function resetDemoNotifications() {
  ensureInit();
  const seeded = seedNotifications();
  commit(seeded);
}

// ─── React 바인딩 ────────────────────────────────────────────────────────────────
function subscribe(cb: () => void): () => void {
  ensureInit();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): DemoNotification[] {
  return cache;
}

const SERVER_SNAPSHOT: DemoNotification[] = [];
function getServerSnapshot(): DemoNotification[] {
  return SERVER_SNAPSHOT;
}

export interface UseDemoNotifications {
  notifications: DemoNotification[];
  add: (input: Omit<AddDemoNotificationInput, 'audience'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

/**
 * audience별 데모 알림을 구독하는 훅. 두 탭 사이의 실시간 동기화가 내장되어 있다.
 */
export function useDemoNotifications(audience: DemoAudience): UseDemoNotifications {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const notifications = useMemo(
    () => all.filter((n) => n.audience === audience),
    [all, audience],
  );
  const add = useCallback(
    (input: Omit<AddDemoNotificationInput, 'audience'>) =>
      addDemoNotification({ ...input, audience }),
    [audience],
  );
  const markRead = useCallback((id: string) => markDemoRead(id), []);
  const markAllRead = useCallback(() => markDemoAllRead(audience), [audience]);
  return { notifications, add, markRead, markAllRead };
}
