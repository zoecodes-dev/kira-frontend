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

// JWT payload 의 supplier_id 클레임(협력사 본인 식별 §0.5). 클라이언트 전용·미로그인/OEM 이면 null.
// 협력사 포털이 로그인한 본인 supplier 로 스코프를 잡는 소스.
export function getTokenSupplierId(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof claims.supplier_id === "string" ? claims.supplier_id : null;
  } catch {
    return null;
  }
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
// 백엔드 user.role 실제 값(docker/01_schema.sql chk_user_role).
// 원청(OEM) 측: admin·owner_esg·owner_purchasing / 협력사 측: supplier_ceo·supplier_esg.
export type UserRole =
  | "admin"
  | "owner_esg"
  | "owner_purchasing"
  | "supplier_ceo"
  | "supplier_esg";

export interface LoginResponse {
  token: string;
  role: UserRole;
  userId: string;
  tenantId: string;
  supplierId: string | null; // 백엔드 매핑 도입 전까지 null (회신 §2)
  displayName: string;
  // 회원가입 게이팅 — 계정의 온보딩 완료 여부. (Phase1: 계정 존재 ⇒ 항상 true)
  onboardingComplete?: boolean;
}

// 협력사 역할 판별 — 로그인 후 화면 분기/권한에 쓴다.
// 백엔드는 'supplier' 단일값이 아니라 supplier_ceo/supplier_esg 처럼 세분화된 값을
// 내려주므로 접두사로 판별한다(=== 'supplier' 정확비교는 항상 false라 협력사가 원청으로 샜음).
export const isSupplierRole = (role: string | null | undefined): boolean =>
  typeof role === "string" && role.startsWith("supplier");

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

/** 배치 상태 코드 — EightStageStepper 의 batch_completed/rejected/hitl 분기 SSOT. */
export type BatchStatusCode =
  | "batch_processing" | "batch_hitl_wait" | "batch_completed" | "batch_rejected";

/** 배치 상세(BE-3 GET /batches/{id}). 5종 판정 결과는 화면에서 안 쓰면 생략 가능(unknown). */
export interface BatchDetail {
  batchId: string;
  productId: string | null;
  destination: string | null;
  currentStage: string;
  status: BatchStatusCode | string;
  confidenceScore: number | null;
  readinessScore: number | null;
  receivedAt: string | null;
}

/** 배치 1건 상세 조회. 8단계 트래커의 완료/반려/HITL 분기를 실 상태로 구동. */
export const getBatch = (batchId: string) =>
  api.get<BatchDetail>(`/batches/${batchId}`);

export const getDashboardKpis = () => api.get<DashboardKpis>("/dashboard/kpis");

export interface DashboardSupplierStats {
  totalCount: number;
  verifiedCount: number;
  highRiskCount: number;
  incompleteCount: number;
  averageCompleteness: number;
}
export const getDashboardSupplierStats = () => api.get<DashboardSupplierStats>("/dashboard/supplier-stats");

export const getAuditTrail = (batchId: string) =>
  api.get<AuditTrailItem[]>(`/audit/trail/${batchId}`);

export const getActions = (status?: string) =>
  api.get<ActionItem[]>(status ? `/actions?status=${status}` : "/actions");

export const getMyActions = () => api.get<ActionItem[]>("/actions/mine");

// ═══════════════════════════════════════════════════════════
// 협력사(Suppliers) 도메인  — W5-#18
//   계약: FRONTEND_W5-18_suppliers_api.md  §1, §3
//   모든 응답은 request() 래퍼에서 snake_case → camelCase로 변환된다.
//   따라서 아래 타입은 "변환 후" 형태(camelCase)로 정의한다.
//   주의: latitude/longitude 처럼 단어 단위 키는 변환되지 않고 그대로 유지된다.
// ═══════════════════════════════════════════════════════════

// ── Enum 사전 (§3) ──────────────────────────────────────────
export type ProviderType = "manufacturer" | "recycler" | "trader" | "miner" | "smelter";
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
  providerType: ProviderType;
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
  // 기업 기본정보 (suppliers 테이블 — 없으면 null)
  companyNameEn?: string | null;
  companyNameKo?: string | null;
  ceoName?: string | null;
  businessRegNo?: string | null;
  dunsNumber?: string | null;
  website?: string | null;
  establishedYear?: number | null;
  employeeCount?: number | null;
  completenessScore?: number | null;
  // 협력사 입력 양식 확장 필드 (마스터폼)
  country?: string | null;                  // 소재 국가
  smelterType?: string | null;              // provider_type='smelter'일 때 rmi/private
  coreMinerals?: Record<string, number> | null;  // 소재 구성: 핵심광물 함량(%) {"Li":..}
  businessRegDocUrl?: string | null;        // 사업자등록증 업로드 URL
  environmentalReportUrl?: string | null;   // 환경성적서 업로드 URL
  selfAssessmentDocUrl?: string | null;     // 실사 자가진단 보고서 업로드 URL
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
  selfReportedRiskLevel?: string | null;   // 실사 자가진단 결과(협력사 자가신고)
  feocStatus: SupplierFeocStatus;
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

/** 협력사 담당자 연락처 목록(대표 우선). 내 테넌트 소유만(아니면 404). */
export interface SupplierContact {
  contactId: string;
  factoryId: string | null;
  name: string | null;
  nameEn: string | null;
  role: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  isPrimary: boolean;
  language: string | null;
}
export const getSupplierContacts = (id: string) =>
  api.get<{ supplierId: string; contacts: SupplierContact[] }>(`/suppliers/${id}/contacts`);

/** 협력사 입력 완성도(data_completeness_status). 미집계면 rate/count는 null. */
export interface SupplierCompleteness {
  supplierId: string;
  requiredFieldCount: number | null;
  filledFieldCount: number | null;
  completionRate: number | null;
  missingFields: string[];
  lastUpdatedAt: string | null;
}
export const getSupplierCompleteness = (id: string) =>
  api.get<SupplierCompleteness>(`/suppliers/${id}/completeness`);

/** 환경성적서(탄소발자국, EU 배터리법 Art7) — 공장별 factory_carbon_declarations. STEP4 최종 검증 핵심. */
export interface CarbonDeclaration {
  declarationId: string;
  factoryId: string;
  factoryName: string | null;
  carbonIntensity: number | null;     // kg CO2e/kWh
  methodology: string | null;
  declaredAt: string | null;
  validFrom: string | null;
  validTo: string | null;
  source: "supplier_declared" | "third_party_verified" | "estimated" | null;
  isActive: boolean | null;
}
export const getSupplierCarbonDeclarations = (id: string) =>
  api.get<{ supplierId: string; declarations: CarbonDeclaration[] }>(`/suppliers/${id}/carbon-declarations`);

/** 공통 파일 메타. 환경성적서 첨부 등 context별 업로드 파일. */
export interface FileMeta {
  fileId: string;
  fileName: string;
  sizeBytes?: number | null;
  contentType?: string | null;
  context?: string | null;
  createdAt?: string | null;
}
/** context 태그로 업로드된 파일 목록(예: 'carbon-epd:<supplierId>'). */
export const listFilesByContext = (context: string) =>
  api.get<FileMeta[]>(`/files?context=${encodeURIComponent(context)}`);

/** 제3자 정보제공 동의서 = 데이터 계약(Data Contract). Catena-X 정렬. */
export type ConsentStatus = "requested" | "returned" | "agreed" | "rejected" | "revoked" | "expired";
export interface DataConsent {
  consentId: string;
  supplierId: string;
  dataScope: string[];
  purpose: string;
  thirdPartySharing: boolean;
  allowedRecipients?: string[] | null;
  validFrom?: string | null;
  validTo?: string | null;
  revocable: boolean;
  status: ConsentStatus;
  requestedAt?: string | null;
  returnedAt?: string | null;
  agreedAt?: string | null;
  revokedAt?: string | null;
  signerName?: string | null;
  signerTitle?: string | null;
  signerEmail?: string | null;
  signatureMethod?: string | null;
  formVersion?: string | null;
  formData?: Record<string, unknown> | null;
  agreementHash?: string | null;
  createdAt?: string | null;
}
export const getDataConsents = (supplierId: string) =>
  api.get<DataConsent[]>(`/data-consents?supplier_id=${supplierId}`);
/** 동의서 발송(계약 오퍼 생성). */
export const createDataConsent = (body: {
  supplierId: string; dataScope: string[]; purpose: string;
  thirdPartySharing?: boolean; allowedRecipients?: string[]; validFrom?: string; validTo?: string; formVersion?: string;
}) =>
  api.post<DataConsent>(`/data-consents`, {
    supplier_id: body.supplierId,
    data_scope: body.dataScope,
    purpose: body.purpose,
    third_party_sharing: body.thirdPartySharing ?? false,
    allowed_recipients: body.allowedRecipients,
    valid_from: body.validFrom,
    valid_to: body.validTo,
    form_version: body.formVersion,
  });
/** 회신·서명·철회 — 상태 전이 + 회신 양식 데이터 영속. */
export const updateDataConsent = (consentId: string, body: {
  status: ConsentStatus; signerName?: string; signerTitle?: string; signerEmail?: string;
  signatureMethod?: string; formData?: Record<string, unknown>; agreementHash?: string;
}) =>
  api.patch<DataConsent>(`/data-consents/${consentId}`, {
    status: body.status,
    signer_name: body.signerName,
    signer_title: body.signerTitle,
    signer_email: body.signerEmail,
    signature_method: body.signatureMethod,
    form_data: body.formData,
    agreement_hash: body.agreementHash,
  });

/** 파일 업로드(multipart POST /files). 환경성적서 PDF 등. JSON이 아니라 FormData라 별도 fetch. */
// s3Key: 버킷 내 영구 키(presigned url과 달리 만료 안 됨). *_doc_url 컬럼에 저장해두면
//   백엔드 파싱(data_gateway)이 그 키로 원본을 읽는다. url은 미리보기용 임시 URL.
export async function uploadFile(file: File, context: string): Promise<{ fileId: string; fileName: string; url: string; s3Key: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('context', context);
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    if (res.status === 401) clearToken();
    throw new ApiError(res.status, `HTTP ${res.status}`);
  }
  return snakeToCamel(await res.json());
}

/** 공급 품목(supply_chain_map→parts). */
export interface SuppliedItem {
  partId: string;
  partCode: string | null;
  partName: string | null;
  tierLevel: number | null;
  materialType: string | null;
  // 공급원 변경 자진신고(declareSourceChange) 실호출용 BOM 컨텍스트.
  bomVersionId: string | null;
  bomVersionNumber: string | null;
}
export const getSupplierSuppliedItems = (id: string) =>
  api.get<{ supplierId: string; items: SuppliedItem[] }>(`/suppliers/${id}/supplied-items`);

/** 자료 요청(데이터 제출 요청) 목록. 원청/관리자는 전체, 협력사는 자기 것만. (submission §) */
export type SubmissionStatusCode =
  | "submission_requested" | "submission_in_progress" | "submission_submitted"
  | "submission_review" | "submission_approved" | "submission_rework" | "submission_rejected";
export type ResponseStatusCode =
  | "response_pending" | "response_responded" | "response_overdue" | "response_escalated";
export interface ApiDataRequest {
  requestId: string;
  requesterUserId: string | null;
  targetSupplierId: string | null;
  requestedDataType: string | null;
  requestedAt: string | null;
  dueDate: string | null;
  responseStatus: ResponseStatusCode | null;
  submissionStatus: SubmissionStatusCode | null;
  missingCount: number | null;
}
export const getDataRequests = (params?: { supplierId?: string }) => {
  const q = params?.supplierId ? `?supplier_id=${params.supplierId}` : "";
  return api.get<ApiDataRequest[]>(`/data-requests${q}`);
};

/** GET /submissions — 원청 제출 검토 목록 (§4.1a) */
export interface SubmissionBrief {
  submissionId: string;
  supplierId: string | null;
  supplierName: string | null;
  type: string | null;
  status: string | null;
  dueDate: string | null;
  submittedAt: string | null;
  fileCount: number;
}
export const getSubmissions = () => api.get<SubmissionBrief[]>(`/submissions`);

/** HITL 협력사 승인 — 자료요청 AI 파싱 결과(입력+AI분석+신뢰도). */
export interface AiExtraction {
  requestId: string;
  supplierId: string | null;
  supplierName: string | null;
  requestedDataType: string | null;
  submissionStatus: string | null;
  parsedFields: Record<string, string | number>;
  confidenceMap: Record<string, number>;
  unparsedFields: string[];
  // 원본 문서(PDF 뷰어) — 임시 다운로드 URL + 파일명. 없으면 null(로컬 S3 미구성 등).
  documentUrl?: string | null;
  documentFileName?: string | null;
  // hitl_reviews 연결(있으면) — 승인/반려가 백엔드 HITL 큐도 갱신.
  batchId?: string | null;
  hitlReviewId?: string | null;
  hitlStatus?: string | null;
  hitlReason?: string | null;
}
export const getAiExtractions = () => api.get<AiExtraction[]>(`/data-requests/ai-extractions`);

/** AI 규제 검증 결과(compliance_results) — verdict + confidence + HITL 후보. */
export interface RegulationResult {
  resultId: string;
  material: string | null;
  supplierId: string | null;
  supplierName: string | null;
  regulation: string | null;
  verdict: string;            // passed / warning / violation / reject
  confidence: number | null;
  needsHumanReview: boolean;
  // HITL/에스컬레이션 사유(시급도 랭킹용). feoc_violation·geographical_risk는 신뢰도-저하(low_confidence)보다 위.
  hitlReason: 'feoc_violation' | 'geographical_risk' | 'low_confidence' | null;
  supplierRiskLevel: 'low' | 'medium' | 'high' | 'critical' | null;  // 협력사 상시 리스크 등급(시급도 신호)
  nearestDueDate: string | null;   // 가장 임박한 미이행 마감(ISO). D-day 배지용(마감은 위험과 별도 축)
  evidence: string[];
  citedClauses: string[];     // AI가 대조한 규제 조항(예: ["IRA FEOC"])
  reasoningText: string | null; // AI 판단 근거(근거 자료↔조항 대조 결과)
}
export const getRegulationResults = () => api.get<RegulationResult[]>(`/regulation/materials/regulation-results`);

export interface SupplyChainGapField {
  field_name: string;
  field_label: string;
  regulation_code: string;
}

export interface SupplyChainGapNode {
  supplier_id: string;
  company_name: string;
  provider_type: string;
  depth: number;
  missing_fields: SupplyChainGapField[];
  gap_count: number;
}

export interface SupplyChainGapsResult {
  product_id: string;
  nodes: SupplyChainGapNode[];
}

export interface SupplyChainAlternative {
  supplier_id: string;
  company_name: string;
  provider_type: string;
  hop_level: number;
  ratio_percentage: number | null;
}

export const getSupplyChainGaps = (productId: string) =>
  api.get<SupplyChainGapsResult>(`/supply-chain/gaps?product_id=${productId}`);

export const getSupplyChainAlternatives = (productId: string, partId: string) =>
  api.get<SupplyChainAlternative[]>(`/supply-chain/alternatives?product_id=${productId}&part_id=${partId}`);

/** HITL 리뷰 승인/반려(batch 단위) — hitl_reviews 갱신 + 파이프라인 재개/차단. */
export const approveHitl = (batchId: string, decisionText: string) =>
  api.post(`/hitl/${batchId}/approve`, { decision_text: decisionText });
export const rejectHitl = (batchId: string, decisionText: string) =>
  api.post(`/hitl/${batchId}/reject`, { decision_text: decisionText });

/** JWT sub(user_id) 디코드 — 승인 등 actor_id용. */
export function getTokenUserId(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const claims = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch { return null; }
}

/** 자료요청 승인(AI 파싱 검토 완료) — 자료 요청 완료로 전이. */
export const approveDataRequest = (requestId: string, reason?: string) =>
  api.post<ApiDataRequest>(`/data-requests/${requestId}/approve`, { actor_id: getTokenUserId(), reason });

/** 자료 요청 생성(POST). 요청자(requester)는 백엔드가 토큰에서 채운다. body는 snake_case 그대로. */
export const createDataRequest = (body: { targetSupplierId: string; requestedDataType: string; dueDate?: string }) =>
  api.post<ApiDataRequest>(`/data-requests`, {
    target_supplier_id: body.targetSupplierId,
    requested_data_type: body.requestedDataType,
    due_date: body.dueDate,
  });

/** STEP3 협력사 '확인'(verify) — supply_chain_map.verification_status 갱신(supplychain 도메인). body는 snake_case. */
export const verifySupplier = (body: { bomVersionId: string; supplierId: string; verified: boolean }) =>
  api.post<{ verificationStatus: string; updatedEdges: number }>(`/supply-chain/verify`, {
    bom_version_id: body.bomVersionId,
    supplier_id: body.supplierId,
    verified: body.verified,
  });

/**
 * 공급원 변경 자진신고(기획서 E-3) — POST /supply-chain/declarations/source-change.
 * 백엔드 declare_new_source 는 parent→new_child 링크를 BOM 버전·부품 단위로 생성하므로
 * new_child_supplier_id 는 **이미 등록된 협력사 UUID** 여야 한다(자유 텍스트 신규 회사 불가).
 * 따라서 SelfReportModal 은 '기존 등록 협력사 선택' 방식으로 이 값을 채운다.
 * 성공 시 상위 BOM 재검증 파이프라인이 트리거된다.
 */
export const declareSourceChange = (body: {
  bomVersionId: string;
  parentSupplierId: string;
  newChildSupplierId: string;
  partId: string;
  reason: string;
}) =>
  api.post<{ status: string; message: string; data: Record<string, unknown> }>(
    `/supply-chain/declarations/source-change`,
    {
      bom_version_id: body.bomVersionId,
      parent_supplier_id: body.parentSupplierId,
      new_child_supplier_id: body.newChildSupplierId,
      part_id: body.partId,
      reason: body.reason,
    },
  );

/** CTI 상세 (provider type별 detail 1종). 없으면 404. */
export const getSupplierDetail = (id: string) =>
  api.get<SupplierDetail>(`/suppliers/${id}/detail`);

// ───────────────────────────────────────────────────────────
// 협력사 회원가입(공개 온보딩) — 무토큰 공개 엔드포인트
//   초대 링크 ?supplierId= 키잉. 토큰이 있어도/없어도 동작(백엔드가 공개).
//   요청 래퍼는 camel→snake 변환을 안 하므로 body는 snake_case로 직접 조립한다.
// ───────────────────────────────────────────────────────────
export interface OnboardingPrefill {
  companyName: string;
  providerType: string;
  country: string | null;
}
/** 공개 prefill — 비민감 필드(회사명/유형/국가). 없으면 404. */
export const getOnboardingPrefill = (supplierId: string) =>
  api.get<OnboardingPrefill>(`/suppliers/${supplierId}/onboarding/prefill`);

export interface OnboardingSubmitInput {
  account: { email: string; password: string };
  company: {
    companyName: string;
    country: string;
    businessRegNo: string;
    dunsNumber: string;
    address: string;
    department: string;
  };
  /** 사업자등록증 업로드 결과(uploadFile 반환). 미보유(미확인 등록)면 null. */
  businessRegDoc: { s3Key: string; fileName: string } | null;
  unverified: boolean;
  contacts: Array<{
    name: string;
    email: string;
    phone: string;
    isPrimary: boolean;
    role?: string;
    department?: string;
  }>;
}
export interface OnboardingSubmitResult {
  supplierId: string;
  status: string;            // 'supplier_review'
  onboardingComplete: boolean;
}
/** 공개 submit — 회사정보+문서+PIC+동의+계정 생성을 한 번에. 재제출/이메일중복 409. */
export const submitSupplierOnboarding = (supplierId: string, input: OnboardingSubmitInput) =>
  api.post<OnboardingSubmitResult>(`/suppliers/${supplierId}/onboarding/submit`, {
    account: { email: input.account.email, password: input.account.password },
    company: {
      company_name: input.company.companyName,
      country: input.company.country,
      business_reg_no: input.company.businessRegNo,
      duns_number: input.company.dunsNumber,
      address: input.company.address,
      department: input.company.department,
    },
    business_reg_doc: input.businessRegDoc
      ? { s3_key: input.businessRegDoc.s3Key, file_name: input.businessRegDoc.fileName }
      : null,
    unverified: input.unverified,
    consent_agreed: true,
    contacts: input.contacts.map((c) => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      is_primary: c.isPrimary,
      role: c.role,
      department: c.department,
    })),
  });

/** 협력사 '자료 제출' 영속화(PATCH /detail). 협력사 본인(supplier_id=id)만 허용.
 *  body는 백엔드 snake_case 키 그대로(요청 래퍼가 camel→snake 변환을 하지 않음).
 *  수용 키: company_name·country·business_reg_no·duns_number·provider_type·smelter_type·
 *  core_minerals·carbon_intensity·energy_source·self_reported_risk_level (보낸 것만 갱신). */
export const updateSupplierDetail = (id: string, body: Record<string, unknown>) =>
  api.patch<SupplierDetail>(`/suppliers/${id}/detail`, body);

/** 협력사 마스터폼 제출(POST /master-form) — company/factories/contacts/manufacturing/self_reported_risk_level 를
 *  정규화 테이블에 일괄 영속화. factories 는 UPSERT(factory_id 있으면 UPDATE·없으면 INSERT·미포함은 DELETE
 *  — supply_ratio.factory_id FK 보존), contacts 는 REPLACE-ALL, company 는 authoritative-overwrite
 *  (생략 필드는 NULL). 따라서 호출부는 GET 으로 시드한 전체 현재 집합(공장은 factory_id 포함)을 round-trip 해서 보내야 한다.
 *  body 는 이미 snake_case 그대로(요청 래퍼가 camel→snake 변환을 하지 않음). */
export const submitMasterForm = (id: string, body: Record<string, unknown>) =>
  api.post<{ supplierId: string; status: string; sectionsSaved: string[] }>(`/suppliers/${id}/master-form`, body);

/** 리스크 프로필. 없으면 404. */
export const getSupplierRiskProfile = (id: string) =>
  api.get<SupplierRiskProfileResponse>(`/suppliers/${id}/risk-profile`);

/** 리스크 점수 갱신. 0~100 범위 밖 422, 없으면 404. (§4 note5 — form 금지) */
export const patchSupplierRiskScore = (id: string, score: number) =>
  api.patch<SupplierRiskProfileResponse>(`/suppliers/${id}/risk-score`, { score });

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
  // GET /products 는 Customer 테이블을 조인해 고객사 식별자·이름을 함께 내려준다(router §list).
  // 공급망 목록(제품×고객사×기간) 그룹핑·표시에 사용. 미조인 응답이면 undefined.
  customerId?: string | null;
  customerName?: string | null;
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
      functionPurpose: pick<string>(n, "functionPurpose", "function_purpose") ?? "", // BOM 트리 노드의 용도/기능
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
  partName?: string | null;  // §10.2a SELECT에 추가됨(맵 트리 부품명용)
  partCode?: string | null;
  supplierId: string;        // child_supplier_id
  factoryId: string | null;
  tierLevel: number | null;
  hopLevel?: number | null;  // §10.2a — 차수 SSOT(원청=0, 1차=1). 1차 판정·차수 표시용
  verificationStatus?: "verified" | "unverified" | null;  // §10.2a — STEP3 협력사 '확인' 상태(하이드레이션용)
  linkStatus: "supplychain_declared" | "supplychain_confirmed";
  // 납품(=생산 lot) 단위기간 + 생성 시각. §10.2a SELECT 에 추가됨(미배포 백엔드면 undefined).
  supplyPeriodFrom?: string | null;
  supplyPeriodTo?: string | null;
  createdAt?: string | null;
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
  providerType: ProviderType;
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

// ── 공급망 맵 헤더(맵 그 자체) — 목록/단건/상태 ──────────────────────────────
export interface SupplyChainMapHeader {
  mapId: string;
  bomVersionId: string;
  productId: string;
  productName: string;
  status: "building" | "completed";
  completedAt?: string | null;
  edgeCount: number;
}
/** 내 테넌트의 공급망 맵 목록(맵 1개 = map_id 1개). */
export const getSupplyChainMaps = () =>
  api.get<SupplyChainMapHeader[]>("/supply-chain/maps");
/** 공급망 맵 단건(map_id). */
export const getSupplyChainMapHeader = (mapId: string) =>
  api.get<SupplyChainMapHeader>(`/supply-chain/maps/${mapId}`);
/** 공급망 맵 완료/전송 상태 변경(building/completed). */
export const updateSupplyChainMapStatus = (mapId: string, status: "building" | "completed") =>
  api.patch<{ mapId: string; status: string; completedAt?: string | null }>(`/supply-chain/maps/${mapId}`, { status });

/** POST /audit-packages/{packageId}/export — 완료 증빙 다운로드 URL 발급 (§2.5d) */
export const exportAuditPackage = (packageId: string) =>
  api.post<{ exportUrl: string | null; error?: string | null }>(`/audit-packages/${packageId}/export`, {});

// ───────────────────────────────────────────────────────────
// 알림 (Notifications) — §notifications
// ───────────────────────────────────────────────────────────
export interface NotificationItem {
  notification_id: string;
  notification_type: 'sla_warning' | 'violation' | 'approval_needed' | 'info';
  subject: string;
  body: string;
  status: 'pending' | 'read';
  created_at: string;
  deep_link?: string;
}

/** GET /notifications — 로그인 사용자의 in-app 알림 목록 */
export const getNotifications = () =>
  api.get<NotificationItem[]>('/notifications', { raw: true });

/** PATCH /notifications/{id}/read — 알림 한 건 읽음 처리 */
export const markNotificationRead = (notificationId: string) =>
  api.patch<void>(`/notifications/${notificationId}/read`, undefined, { raw: true });

// ───────────────────────────────────────────────────────────
// 자가신고 — 현재 공급원 조회
// ───────────────────────────────────────────────────────────
export interface CurrentSupplySource {
  name: string;
  country: string;
  material: string;
  contact: string;
}

/** GET /supply-chain/current-supply-source — 자가신고 폼 '기존 공급사' 조회 */
export const getCurrentSupplySource = (
  bomVersionId: string,
  partId: string,
  parentSupplierId: string,
) =>
  api.get<CurrentSupplySource>(
    `/supply-chain/current-supply-source?bom_version_id=${bomVersionId}&part_id=${partId}&parent_supplier_id=${parentSupplierId}`,
  );
