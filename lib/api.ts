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

// ═══════════════════════════════════════════════════════════
// 협력사(Suppliers) 도메인  — W5-#18
//   계약: FRONTEND_W5-18_suppliers_api.md  §1, §3
//   모든 응답은 request() 래퍼에서 snake_case → camelCase로 변환된다.
//   따라서 아래 타입은 "변환 후" 형태(camelCase)로 정의한다.
//   주의: latitude/longitude 처럼 단어 단위 키는 변환되지 않고 그대로 유지된다.
// ═══════════════════════════════════════════════════════════

// ── Enum 사전 (§3) ──────────────────────────────────────────
export type SupplierType = "manufacturer" | "recycler" | "trader" | "miner";
export type SupplierStatusCode =
  | "supplier_pending"
  | "supplier_requested"
  | "supplier_in_progress"
  | "supplier_review"
  | "supplier_verified"
  | "supplier_violation"
  | "supplier_suspended";
export type SupplierRiskLevel = "low" | "medium" | "high" | "critical";
export type SupplierFeocStatus =
  | "eligible"
  | "ineligible"
  | "under_review"
  | "unknown";

// ── Brief (목록·단건 공통) ──────────────────────────────────
export interface SupplierBrief {
  supplierId: string;
  companyName: string;
  supplierType: SupplierType;
  status: SupplierStatusCode;
  riskLevel: SupplierRiskLevel;
}

// ── CTI 상세 (provider type별 1종, 나머지는 null) ───────────
export interface SupplierManufacturerDetail {
  productionLine?: string | null;
  annualCapacity?: string | null;
  qualitySystem?: string | null;
  processTraceability?: string | null;
  [key: string]: unknown;
}
export interface SupplierRecyclerDetail {
  recyclingMethod?: string | null;
  annualRecoveredMaterial?: string | null;
  wastePermitId?: string | null;
  recoveryRate?: number | null;
  [key: string]: unknown;
}
export interface SupplierTraderDetail {
  disclosureCompleteness?: number | null;
  disclosedUpstreamCount?: number | null;
  declaredMaterialScope?: string | null;
  readinessInput?: string | null;
  [key: string]: unknown;
}
export interface SupplierMinerDetail {
  concessionId?: string | null;
  extractedMinerals?: string[] | null;
  geoVerificationStatus?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: unknown;
}

export interface SupplierDetail extends SupplierBrief {
  feocStatus: SupplierFeocStatus;
  manufacturerDetail: SupplierManufacturerDetail | null;
  recyclerDetail: SupplierRecyclerDetail | null;
  traderDetail: SupplierTraderDetail | null;
  minerDetail: SupplierMinerDetail | null;
}

// ── Risk profile ───────────────────────────────────────────
export interface SupplierRiskProfileResponse {
  supplierId: string;
  overallRiskScore: number;
  riskLevel: SupplierRiskLevel;
  feocStatus: SupplierFeocStatus;
}

// ── ESG (§1 배열/중첩 항목 필드) ───────────────────────────
export interface EsgCertification {
  certId: string;
  certificationType: string;
  certificationNo: string;
  issuedAt: string;
  expiresAt: string;
  issuingBody: string;
  documentUrl: string | null;
}
export interface EsgHumanRightsIssue {
  issueId: string;
  factoryId: string | null;
  issueType: string;
  severity: "critical" | "major" | "minor";
  description: string;
  detectedAt: string;
  status: "open" | "in_remediation" | "resolved" | "monitoring";
  source: string;
  resolvedAt: string | null;
}
export interface EsgIndustrialAccident {
  accidentId: string;
  factoryId: string | null;
  accidentDate: string;
  accidentType: string;
  description: string;
  casualties: number;
  ltifr: number | null;
  status: "reported" | "investigating" | "closed";
  correctiveAction: string | null;
}
export interface EsgAuditRecord {
  auditRecordId: string;
  auditDate: string;
  auditType: string;
  auditor: string;
  auditStatus: string;
  result: "pass" | "conditional_pass" | "fail" | "pending";
  nextAuditDue: string;
  reportUrl: string | null;
}
export interface SupplierEsgResponse {
  supplierId: string;
  certifications: EsgCertification[];
  humanRightsIssues: EsgHumanRightsIssue[];
  industrialAccidents: EsgIndustrialAccident[];
  auditRecords: EsgAuditRecord[];
}

// ── 교육(Training) ─────────────────────────────────────────
export interface TrainingMaterial {
  materialId: string;
  title: string;
  category: string;
  format: string;
  durationMinutes: number;
}
export interface TrainingRecord {
  recordId: string;
  factoryId: string | null;
  traineeCount: number;
  totalEligible: number;
  completionRate: number;
  completedAt: string | null;
  dueDate: string | null;
  status: "completed" | "in_progress" | "overdue" | "not_started";
  instructor: string | null;
  notes: string | null;
  material: TrainingMaterial | null;
}
export interface SupplierTrainingResponse {
  supplierId: string;
  records: TrainingRecord[];
}

// ── 신뢰도(Reliability) ────────────────────────────────────
export interface SupplierReliabilityResponse {
  supplierId: string;
  completenessScore: number | null;
  overallRiskScore: number | null;
  riskLevel: SupplierRiskLevel | null;
  feocStatus: SupplierFeocStatus | null;
  isHighRiskFlag: boolean | null;
  lastRiskReviewAt: string | null;
  consentStatus: "consent_pending" | "consent_agreed" | "consent_rejected" | null;
  agreementStatus: "pending" | "agreed" | "rejected" | null;
  slaDueDate: string | null;
  reminderCount: number | null;
  lastRemindedAt: string | null;
  totalAudits: number | null;
  lastAuditDate: string | null;
  lastAuditResult: string | null;
}

// ── 공장(Factories) — 좌표는 latitude/longitude로 분해 (§4 note7) ─
export interface SupplierFactory {
  factoryId: string;
  factoryName: string;
  factoryNameEn: string | null;
  address: string;
  country: string;
  region: string;
  factoryRole: "headquarters" | "production" | "outsourcing" | "processing" | "mining";
  isActive: boolean;
  operatingPeriodFrom: string;
  operatingPeriodTo: string | null;
  monthlyCapacity: string | null;
  destination: "EU" | "US" | "KR" | "BOTH" | null;
  destinationDetail: string | null;
  supplyRatioPercent: number | null;
  supplyQuantity: string | null;
  latitude: number | null;
  longitude: number | null;
}
export interface SupplierFactoriesResponse {
  supplierId: string;
  factories: SupplierFactory[];
}

// ── 목록 필터 (§1 — query는 snake_case) ────────────────────
export interface SupplierListParams {
  status?: SupplierStatusCode;
  riskLevel?: SupplierRiskLevel;
  feocStatus?: SupplierFeocStatus;
  page?: number;
  size?: number;
}

function buildSupplierQuery(params: SupplierListParams = {}): string {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.riskLevel) q.set("risk_level", params.riskLevel);
  if (params.feocStatus) q.set("feoc_status", params.feocStatus);
  if (params.page != null) q.set("page", String(params.page));
  if (params.size != null) q.set("size", String(params.size));
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ── 도메인 함수 (§1·§2 매핑) ───────────────────────────────
/** 목록. envelope 없는 순수 배열. 빈 결과 → []. (§4 note1) */
export const getSuppliers = (params?: SupplierListParams) =>
  api.get<SupplierBrief[]>(`/suppliers${buildSupplierQuery(params)}`);

/** 단건 brief. 없으면 404. */
export const getSupplier = (id: string) =>
  api.get<SupplierBrief>(`/suppliers/${id}`);

/** CTI 상세 (provider type별 detail 1종). 없으면 404. */
export const getSupplierDetail = (id: string) =>
  api.get<SupplierDetail>(`/suppliers/${id}/detail`);

/** 리스크 프로필. 없으면 404. */
export const getSupplierRiskProfile = (id: string) =>
  api.get<SupplierRiskProfileResponse>(`/suppliers/${id}/risk-profile`);

/** 리스크 점수 갱신. 0~100 범위 밖 422, 없으면 404. (§4 note5 — form 금지) */
export const patchSupplierRiskScore = (id: string, score: number) =>
  api.patch<SupplierRiskProfileResponse>(`/suppliers/${id}/risk-score`, { score });

/** ESG. supplier 존재 시 빈 항목은 200+빈 배열, supplier 자체가 없으면 404. (§4 note3) */
export const getSupplierEsg = (id: string) =>
  api.get<SupplierEsgResponse>(`/suppliers/${id}/esg`);

/** 교육 이수 현황. 200+빈 배열 / 404. */
export const getSupplierTraining = (id: string) =>
  api.get<SupplierTrainingResponse>(`/suppliers/${id}/training`);

/** 신뢰도. 프로필/온보딩 없으면 해당 필드 null. 200 / 404. */
export const getSupplierReliability = (id: string) =>
  api.get<SupplierReliabilityResponse>(`/suppliers/${id}/reliability`);

/** 공장 목록. 좌표는 latitude/longitude. 200+빈 배열 / 404. */
export const getSupplierFactories = (id: string) =>
  api.get<SupplierFactoriesResponse>(`/suppliers/${id}/factories`);
