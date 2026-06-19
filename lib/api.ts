/**
 * lib/api.ts  (W5-#04 — 공통 fetch 래퍼)
 *
 * 프론트(Vercel) ↔ 백엔드(EC2 Docker) 비동기 HTTP의 단일 진입점.
 * 모든 도메인 화면은 lib/data.ts mock 대신 이 모듈을 호출한다.
 *
 * [HTTPS 우회 — Vercel rewrites 방식]
 *   EC2 백엔드에 도메인/인증서가 없어 http(80)로만 서빙되므로,
 *   브라우저가 직접 EC2를 부르면 https 페이지에서 mixed-content로 차단된다.
 *   → next.config.js의 rewrite가 "/api/*" 를 EC2로 프록시(서버-서버).
 *   → 따라서 base는 절대 URL이 아니라 같은 출처의 "/api" 접두어를 쓴다.
 *
 * 책임:
 *   1) "/api" 접두어 기반 경로 조립 (Vercel rewrite가 EC2로 전달)
 *   2) JWT 토큰 자동 첨부 (localStorage 'kira_token')
 *   3) snake_case → camelCase 응답 어댑터
 *   4) 공통 에러 처리 (401 → 토큰 만료, 그 외 status별 throw)
 *
 * 주의: React 컴포넌트에서 <form> 금지(onClick/onChange) — 본 모듈은 fetch만 담당.
 */

// 같은 출처의 /api 접두어. next.config.js rewrite가 EC2 백엔드로 프록시한다.
// (로컬에서 rewrite 없이 직접 백엔드를 부르려면 NEXT_PUBLIC_API_BASE_URL로 덮어쓰기)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

const TOKEN_KEY = "kira_token";

// ───────────────────────────────────────────────────────────
// 토큰 헬퍼 (localStorage — CSR 환경. SSR에서는 window 가드)
// ───────────────────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

// ───────────────────────────────────────────────────────────
// snake_case → camelCase 어댑터 (재귀, 배열/객체 모두 처리)
//   백엔드 응답 키는 snake_case, 프론트 타입은 camelCase로 통일.
// ───────────────────────────────────────────────────────────
function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function snakeToCamel<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((item) => snakeToCamel(item)) as unknown as T;
  }
  if (input !== null && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[toCamel(k)] = snakeToCamel(v);
    }
    return out as T;
  }
  return input as T;
}

// ───────────────────────────────────────────────────────────
// 공통 에러 타입
// ───────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// ───────────────────────────────────────────────────────────
// 핵심 fetch 래퍼
//   - path는 "/suppliers" 처럼 선행 슬래시 포함 권장
//   - 토큰 자동 첨부, JSON 직렬화, camelCase 변환까지 일괄 처리
// ───────────────────────────────────────────────────────────
interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** true면 snake→camel 변환 생략(원본 그대로 반환) */
  raw?: boolean;
}

async function request<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, raw, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  const token = getToken();
  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content → 빈 응답
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text; // JSON이 아니면 원문 유지
    }
  }

  if (!res.ok) {
    // 401 → 토큰 만료/무효. 토큰 정리 후 호출부가 로그인으로 보내도록 throw.
    if (res.status === 401) {
      clearToken();
    }
    const msg =
      (payload && typeof payload === "object" && "detail" in payload
        ? String((payload as Record<string, unknown>).detail)
        : `HTTP ${res.status}`) || `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, payload);
  }

  return raw ? (payload as T) : snakeToCamel<T>(payload);
}

// ───────────────────────────────────────────────────────────
// HTTP 메서드 단축 함수
// ───────────────────────────────────────────────────────────
export const api = {
  get: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

// ───────────────────────────────────────────────────────────
// 도메인 호출 예시 (검증용 — listSuppliers)
//   각 도메인 담당자는 이 패턴으로 자기 화면 호출을 추가한다.
// ───────────────────────────────────────────────────────────
export function listSuppliers<T = unknown>(): Promise<T> {
  // API_BASE_URL("/api") + "/suppliers" → "/api/suppliers" → rewrite로 EC2 전달
  return api.get<T>("/suppliers");
}

// ───────────────────────────────────────────────────────────
// 도메인 타입 & 함수
// ───────────────────────────────────────────────────────────

export interface HitlQueueItem {
  reviewId: string;
  batchId: string;
  reason: string;
  triggerStage: string | null;
  status: string;
  createdAt: string;
  confidenceScore: number | null;
}

export interface BatchItem {
  batchId: string;
  productId: string | null;
  tenantId: string | null;
  destination: string;
  currentStage: string;
  status: string;
  confidenceScore: number | null;
  receivedAt: string | null;
  sourceSystem: string | null;
  externalId: string | null;
}

export interface BatchesResponse {
  status: string;
  total: number;
  byStage: Record<string, BatchItem[]>;
}

export interface DashboardKpis {
  totalBatches: number;
  processingBatches: number;
  hitlWaitBatches: number;
  completedBatches: number;
  rejectedBatches: number;
  dppIssuedCount: number;
  compliancePassRate: number;
  avgConfidenceScore: number;
}

export interface AuditTrailItem {
  stepNumber: number;
  timestamp: string;
  nodeType: "agent" | "tool" | "human";
  nodeName: string;
  model: string | null;
  promptVersion: string | null;
  durationMs: number;
  inputHash: string;
  outputHash: string;
  decision: string | null;
  citations: string[] | null;
}

export interface ActionItem {
  actionId: string;
  sourceType: string;
  title: string;
  supplierId: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  actionStatus: string;
}

export const getHitlQueue = () => api.get<HitlQueueItem[]>("/hitl/queue");

export const getBatches = (
  status: "processing" | "hitl_wait" | "completed" | "rejected"
) => api.get<BatchesResponse>(`/batches?status=${status}`);

export const getDashboardKpis = () => api.get<DashboardKpis>("/dashboard/kpis");

export const getAuditTrail = (batchId: string) =>
  api.get<AuditTrailItem[]>(`/audit/trail/${batchId}`);

export const getActions = (status?: string) =>
  api.get<ActionItem[]>(status ? `/actions?status=${status}` : "/actions");
