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
// 인증(Auth) — 명세서 §1
//   POST /auth/login → JWT 발급. 응답 token을 setToken()으로 저장하면
//   이후 모든 요청에 Bearer 자동 첨부된다.
//   응답은 snake_case → camelCase 변환됨(token 키는 단어라 그대로).
// ───────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  role: "oem" | "supplier";
  userId: string;
  tenantId: string;
  supplierId: string | null; // 백엔드 매핑 도입 전까지 null (회신 §2)
  displayName: string;
}

export const login = (email: string, password: string) =>
  api.post<LoginResponse>("/auth/login", { email, password });

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
  providerType: SupplierType;
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

// ── 제품 / BOM (백엔드 구현됨: backend/domains/product/router.py) ──
// GET /products, GET /products/{id}, GET /products/{id}/bom(트리),
// GET /products/{id}/bom-versions(버전목록). 응답은 request()에서 camelCase 변환됨.
export interface ApiProduct {
  productId: string;
  productCode: string;
  productName: string;
  type: string;
}
export interface ApiBomVersion {
  bomVersionId: string;
  productId: string;
  versionNumber: string;
  status: string;
}
export interface ApiBomPart {
  partId: string;
  partCode: string;
  partName: string;
  tierLevel: number;
  parentPartId: string | null;
  materialType: string;
  functionPurpose: string;
  purchaseUnit: string;
  kind: string; // component | material | mineral
}
export interface ApiBomItem {
  bomItemId: string;
  bomVersionId: string;
  partId: string;
  requiredQuantity: number;
  requiredQuantityUnit: string;
  percentage: number;
  originCountry: string;
}
export interface ApiProductBom {
  bomVersions: ApiBomVersion[];
  parts: ApiBomPart[];
  bomItems: ApiBomItem[];
}

// ── 백엔드 실제 BOM 응답 (중첩 트리) ──
// GET /products/{id}/bom 은 평면 3배열이 아니라 단일 루트 children 트리를 반환한다.
// (backend/domains/product/repository.py get_bom_tree) 프론트 소비부는 평면 3배열을
// 가정하므로 normalizeProductBom 으로 평탄화해 ApiProductBom 으로 흡수한다.
export interface BomTreeNode {
  partId?: string; part_id?: string;
  partCode?: string; part_code?: string;
  partName?: string; part_name?: string;
  tierLevel?: number; tier_level?: number;
  parentPartId?: string | null; parent_part_id?: string | null;
  materialType?: string | null; material_type?: string | null;
  requiredQuantity?: number | null; required_quantity?: number | null;
  requiredQuantityUnit?: string | null; required_quantity_unit?: string | null;
  originCountry?: string | null; origin_country?: string | null;
  /** 백엔드 트리 노드엔 현재 없음(추가 협의 중). 있으면 사용, 없으면 0. */
  percentage?: number | null;
  children?: BomTreeNode[];
}
export interface BomTreeResponse {
  productId?: string; product_id?: string;
  bomVersion?: string; bom_version?: string; // version_number 문자열
  bomStatus?: string; bom_status?: string;
  tree: BomTreeNode | null;
  warning?: string;
}

/** snake/camel 어느 키로 와도 집어내는 헬퍼 (백엔드 직렬화 규약 변동 방어). */
function pick<T>(node: Record<string, unknown>, camel: string, snake: string): T | undefined {
  const v = node[camel] ?? node[snake];
  return v as T | undefined;
}

/**
 * 백엔드 중첩 BOM 트리 → 프론트가 기대하는 평면 3배열(ApiProductBom)로 평탄화.
 * - bomVersions: 트리 응답엔 버전 메타가 1개뿐이라(version_number 문자열) 합성 버전 1개 생성.
 *   bomVersionId 는 별도 GET /{id}/bom-versions 와 매칭 전까지 version 문자열 기반 합성키 사용.
 * - parts: 트리 DFS 전체 노드. kind 는 tier_level/leaf 여부로 파생(백엔드 미제공).
 * - bomItems: required_quantity 가 있는 노드만(= 백엔드 bom_items 실 데이터). percentage 는 노드값 ?? 0.
 */
export function normalizeProductBom(resp: BomTreeResponse, overrideBomVersionId?: string): ApiProductBom {
  const productId = resp.productId ?? resp.product_id ?? "";
  const versionNumber = resp.bomVersion ?? resp.bom_version ?? "";
  const status = resp.bomStatus ?? resp.bom_status ?? "active";
  // 실 bomVersionId(getProductBomVersions 매칭)가 있으면 그걸 키로, 없으면 version 문자열 기반 합성키.
  const bomVersionId = overrideBomVersionId ?? (versionNumber ? `${productId}:${versionNumber}` : productId);

  const bomVersions: ApiBomVersion[] = versionNumber
    ? [{ bomVersionId, productId, versionNumber, status }]
    : [];

  const parts: ApiBomPart[] = [];
  const bomItems: ApiBomItem[] = [];

  const walk = (node: BomTreeNode | null | undefined): void => {
    if (!node) return;
    const n = node as unknown as Record<string, unknown>;
    const partId = pick<string>(n, "partId", "part_id") ?? "";
    const tierLevel = pick<number>(n, "tierLevel", "tier_level") ?? 0;
    const children = (node.children ?? []) as BomTreeNode[];
    const isLeaf = children.length === 0;
    // kind 파생: 최상위(tier 1)=component, 말단=mineral, 중간=material
    const kind = tierLevel <= 1 ? "component" : isLeaf ? "mineral" : "material";
    const requiredQuantityUnit = pick<string>(n, "requiredQuantityUnit", "required_quantity_unit") ?? "";

    parts.push({
      partId,
      partCode: pick<string>(n, "partCode", "part_code") ?? "",
      partName: pick<string>(n, "partName", "part_name") ?? "",
      tierLevel,
      parentPartId: (pick<string | null>(n, "parentPartId", "parent_part_id") ?? null),
      materialType: pick<string>(n, "materialType", "material_type") ?? "",
      functionPurpose: "", // 백엔드 미제공
      purchaseUnit: requiredQuantityUnit,
      kind,
    });

    const requiredQuantity = pick<number>(n, "requiredQuantity", "required_quantity");
    // bom_items 실 데이터가 있는 노드만 항목 생성(재귀 하위 구조 노드는 제외)
    if (requiredQuantity !== undefined && requiredQuantity !== null) {
      bomItems.push({
        bomItemId: `${bomVersionId}:${partId}`,
        bomVersionId,
        partId,
        requiredQuantity,
        requiredQuantityUnit,
        percentage: (node.percentage ?? 0) as number,
        originCountry: pick<string>(n, "originCountry", "origin_country") ?? "",
      });
    }

    children.forEach(walk);
  };

  walk(resp.tree);

  return { bomVersions, parts, bomItems };
}

/**
 * 제품 목록. ⚠ 인증 필수 + 테넌트 격리(§0.2) — 토큰 없으면 401, 내 테넌트 제품만 반환.
 * (BOM 트리·bom-versions 는 무인증 공개. 목록/단건/§10.2a 맵만 인증 필요.)
 */
export const getProducts = () => api.get<ApiProduct[]>("/products");

/**
 * 제품의 BOM 트리 조회 → 평면 3배열(ApiProductBom)로 정규화해 반환.
 * 백엔드는 중첩 트리(BomTreeResponse)를 주지만 소비부는 평면 배열을 기대하므로
 * 여기(API 경계)에서 한 번만 변환한다(anti-corruption layer).
 */
export const getProductBom = async (
  productId: string,
  bomVersionId?: string,
): Promise<ApiProductBom> => {
  const resp = await api.get<BomTreeResponse>(`/products/${productId}/bom`);
  return normalizeProductBom(resp, bomVersionId);
};

/**
 * 제품 단건. ⚠ 인증 필수 + 테넌트 격리(§0.2) — 토큰 없으면 401, 남의 테넌트면 404(은닉).
 * 응답은 ProductBrief 직렬화(specs/created_at/updated_at 제외).
 */
export interface ApiProductDetail extends ApiProduct {
  manufacturerId: string | null;
  customerId: string | null;
  modelName: string | null;
  amperageAh: number | null;
  sourceSystem: string | null;
  syncedAt: string | null;
}
export const getProduct = (productId: string) =>
  api.get<ApiProductDetail>(`/products/${productId}`);

/**
 * 제품의 BOM 버전 목록(active + deprecated). 제품 없으면 404, 버전 0개면 200+[].
 * 실 bomVersionId 를 주므로 버전 드롭다운·선택에 사용(BOM 트리는 active 고정이라 트리만으론 부족).
 */
export interface ApiBomVersionListItem {
  bomVersionId: string;
  productId: string;
  versionNumber: string;
  status: string; // draft | active | deprecated
  isCurrent: boolean;
  productionFrom: string | null;
  productionTo: string | null;
  sourceSystem: string | null;
}
export const getProductBomVersions = (productId: string) =>
  api.get<ApiBomVersionListItem[]>(`/products/${productId}/bom-versions`);

// ═══════════════════════════════════════════════════════════
// 공급망(Supply Chain) 도메인 — backend/domains/supplychain (develop)
//   §10.2a GET /products/{id}/supply-chain-map  → 맵/비율/협력사/공장 (프론트 dataset 1:1)
//   §10.2b POST /supply-chain/maps/{mapId}/confirm  → link_status confirmed 전이
//   (저수준 대안: GET /supply-chain/tree?product_id= — 엣지 평면 리스트. 허브는 §10.2a 사용)
// ═══════════════════════════════════════════════════════════

/** §10.2a 맵 노드 — 대표 factory_id는 비율 최댓값 공장. */
export interface ApiSupplyChainMapNode {
  mapId: string;
  partId: string;
  supplierId: string;        // child_supplier_id
  factoryId: string | null;
  tierLevel: number | null;
  linkStatus: "supplychain_declared" | "supplychain_confirmed";
}
/** §10.2a 비율 — ratioPercent(엣지 내 공장 분할) + cumulativeContribution(루트→공장 경로 곱). */
export interface ApiSupplyChainRatio {
  partId: string;
  supplierId: string;
  ratioPercent: number | null;
  mapId: string;
  factoryId: string | null;
  cumulativeContribution: number | null;
}
export interface ApiSupplyChainSupplier {
  supplierId: string;
  companyName: string;
  providerType: SupplierType;
  status: string;
  riskLevel: SupplierRiskLevel | null;
  feocStatus: SupplierFeocStatus | null;
  completenessScore: number | null;
}
export interface ApiSupplyChainFactory {
  factoryId: string;
  supplierId: string;
  factoryName: string;
  address: string | null;
  country: string | null;
  region: string | null;
  factoryRole: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
}
export interface ApiSupplyChainValidationRow {
  sum: number;
  ok: boolean;
  [key: string]: unknown; // mapId / supplierId+partId 등 식별 키 포함
}
export interface ApiSupplyChainValidation {
  edges: ApiSupplyChainValidationRow[];
  tiers: ApiSupplyChainValidationRow[];
  allValid: boolean;
}
export interface ApiProductSupplyChainMap {
  supplyChainMap: ApiSupplyChainMapNode[];
  supplyChainRatios: ApiSupplyChainRatio[];
  supplyChainContributions?: ApiSupplyChainRatio[];
  validation: ApiSupplyChainValidation;
  suppliers: ApiSupplyChainSupplier[];
  supplierFactories: ApiSupplyChainFactory[];
}

export interface SupplyChainMapParams {
  bomVersionId?: string;
  periodFrom?: string;
  periodTo?: string;
  factoryId?: string;
  poNumber?: string;
}

function buildSupplyMapQuery(p: SupplyChainMapParams = {}): string {
  const q = new URLSearchParams();
  if (p.bomVersionId) q.set("bom_version_id", p.bomVersionId);
  if (p.periodFrom) q.set("period_from", p.periodFrom);
  if (p.periodTo) q.set("period_to", p.periodTo);
  if (p.factoryId) q.set("factory_id", p.factoryId);
  if (p.poNumber) q.set("po_number", p.poNumber);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * §10.2a 제품 공급망 맵. 맵/비율/협력사/공장을 한 번에 반환(프론트 dataset 1:1).
 * supply_chain_map 시드/데이터가 있어야 채워진다. 인증·테넌트 격리 적용(401/403 가능).
 */
export const getProductSupplyChainMap = (productId: string, params?: SupplyChainMapParams) =>
  api.get<ApiProductSupplyChainMap>(`/products/${productId}/supply-chain-map${buildSupplyMapQuery(params)}`);

/** §10.2b 공급망 맵 확인 → link_status = supplychain_confirmed. */
export const confirmSupplyChainMap = (mapId: string) =>
  api.post<{ mapId: string; status: string }>(`/supply-chain/maps/${mapId}/confirm`, { confirmed: true });
