// 협력사 업무공간(/partner) 전역 포맷터/라벨 맵 — app/supplier/page.tsx에서 그대로 이관.

export type BadgeTone = 'ok' | 'warn' | 'alert' | 'info' | 'neutral';

export const riskLabel: Record<string, string> = {
  low: '저위험',
  medium: '중위험',
  high: '고위험',
  critical: '최고위험',
};

// ⑥ 협력사 상태값 → 한글 라벨 + Badge tone 매핑
export const supplierStatusMeta: Record<string, { label: string; tone: BadgeTone }> = {
  pending:          { label: '검토 대기',  tone: 'neutral' },
  review:           { label: '검토 중',    tone: 'info'    },
  supplier_verified:{ label: '승인 완료',  tone: 'ok'      },
  verified:         { label: '승인 완료',  tone: 'ok'      },
  suspended:        { label: '거래 중지',  tone: 'alert'   },
  rejected:         { label: '반려',       tone: 'alert'   },
};

// ─── D-Day 계산 유틸 ──────────────────────────────────────────────────────────
// 기준일: 2026-06-13 (시스템 날짜)
// 반환값: { label: 'D-12' | 'D-Day' | '만료됨', days: number }
export const REFERENCE_DATE = new Date('2026-06-13T00:00:00');

export function calculateDDay(expiresAt: string): { label: string; days: number } {
  const expiry = new Date(expiresAt + 'T00:00:00');
  const diffMs = expiry.getTime() - REFERENCE_DATE.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: '만료됨', days };
  if (days === 0) return { label: 'D-Day', days };
  return { label: `D-${days}`, days };
}

// [오늘의 알림] 로그인 시점(클라이언트 현재 날짜) 기준 마감일 D-Day 동적 산출.
// ⚠️ calculateDDay(REFERENCE_DATE 고정)와 별개 함수 — 기존 인증서 화면 로직 보호.
//   · days > 0   → 'D-N'   (기한 여유)       · state: 'future'
//   · days === 0 → 'D-Day' (당일 마감)       · state: 'dday'   (호출부에서 Red 강조)
//   · days < 0   → 'D+N'   (기한 초과=연체)  · state: 'overdue'(호출부에서 상태 '연체' 강제)
export function calcDeadlineDDay(
  dueDate: string,
  now: Date = new Date(),
): { label: string; days: number; state: 'future' | 'dday' | 'overdue' } {
  const due = new Date(dueDate);
  // 시·분·초 무시하고 '날짜' 단위로만 차이 계산
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((dueMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
  if (days > 0) return { label: `D-${days}`, days, state: 'future' };
  if (days === 0) return { label: 'D-Day', days, state: 'dday' };
  return { label: `D+${Math.abs(days)}`, days, state: 'overdue' };
}

// ESG API는 인증서 status를 주지 않음 → 만료일 기준으로 파생 (기준일 REFERENCE_DATE)
export function deriveCertStatusPortal(expiresAt: string): 'active' | 'expiring_soon' | 'expired' {
  const exp = new Date(expiresAt + 'T00:00:00').getTime();
  if (Number.isNaN(exp)) return 'active';
  const days = Math.ceil((exp - REFERENCE_DATE.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'expired';
  if (days <= 60) return 'expiring_soon';
  return 'active';
}

// Action Center 제출 기한 D-day → Badge tone 매핑
// · 기한 초과(days<0) or D-7 이하 → alert (빨강): 즉시 조치 필요
// · D-8 ~ D-14                   → warn  (주황): 이번 주 내 처리
// · D-15 이상                     → info  (파랑): 여유 있음
export function dueDateTone(days: number): BadgeTone {
  if (days <= 7)  return 'alert';
  if (days <= 14) return 'warn';
  return 'info';
}

// ─── 개인정보 마스킹 (계정 설정 표시 전용) ──────────────────────────────────────
// 원본 데이터는 변형하지 않고 화면 표시 문자열만 가린다. 편집 모드에서는 원문을 그대로 노출.

/**
 * 이메일 마스킹 — 로컬부 앞 2글자·도메인명 앞 1글자만 남기고 가림. TLD(.co.kr 등)는 유지.
 * 예: jisu.kim@hanyang-cell.co.kr → ji******@h*******.co.kr
 */
export function maskEmail(email?: string | null): string {
  if (!email) return '—';
  const at = email.indexOf('@');
  if (at < 1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.indexOf('.');
  const domainName = dot === -1 ? domain : domain.slice(0, dot);
  const tld = dot === -1 ? '' : domain.slice(dot); // '.co.kr' / '.com' 등 나머지 그대로
  return `${local.slice(0, 2)}******@${domainName.slice(0, 1)}*******${tld}`;
}

/**
 * 연락처 마스킹 — 마지막 두 숫자 그룹의 끝 2자리를 '**'로 가림. 구분자(-)는 원본 유지.
 * 예: +82-2-3456-7890 → +82-2-34**-79**
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return '—';
  const groups = phone.split('-');
  if (groups.length < 2) return phone;
  const maskTail = (g: string) => (g.length <= 2 ? g : g.slice(0, g.length - 2) + '**');
  const n = groups.length;
  groups[n - 1] = maskTail(groups[n - 1]);
  groups[n - 2] = maskTail(groups[n - 2]);
  return groups.join('-');
}

// ─── 담당자명 한/영 분리 (편집 모드 2필드) ──────────────────────────────────────
// 'name'에 병기된 '김지수 (Kim Jisu)'를 괄호 기준으로 한글/영문으로 나눈다.
export function splitContactName(name?: string | null): { ko: string; en: string } {
  if (!name) return { ko: '', en: '' };
  const m = name.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (m) return { ko: m[1].trim(), en: m[2].trim() };
  // 괄호 없음: 한글 포함 여부로 한/영 판단
  return /[가-힣]/.test(name) ? { ko: name.trim(), en: '' } : { ko: '', en: name.trim() };
}

// ─── 부서 드롭다운 ──────────────────────────────────────────────────────────────
export const DEPARTMENT_OPTIONS = [
  'ESG·지속가능경영팀',
  '환경안전보건팀 (EHS)',
  '준법지원·컴플라이언스팀',
  '구매·공급망관리팀',
  '품질보증팀 (QA)',
  '경영기획·지원팀',
  '기타',
] as const;

// 저장된 부서 문자열을 옵션과 매칭(공백 차이 무시). 매칭 실패 시 '기타'.
export function matchDepartment(dept?: string | null): string {
  if (!dept) return DEPARTMENT_OPTIONS[0];
  const norm = (s: string) => s.replace(/\s+/g, '');
  const target = norm(dept);
  return DEPARTMENT_OPTIONS.find(o => norm(o) === target) ?? '기타';
}

// ─── 연락처 국가코드 · 실시간 포맷 ──────────────────────────────────────────────
export const PHONE_COUNTRY_CODES = [
  { code: '+82', label: '대한민국' },
  { code: '+1',  label: '미국' },
  { code: '+81', label: '일본' },
  { code: '+86', label: '중국' },
] as const;

export function digitsOnly(str: string): string {
  return str.replace(/\D/g, '');
}

// 저장 형식('+82-2-3456-7890')에서 국가코드와 국내번호(숫자)를 분리.
export function parsePhone(phone?: string | null): { country: string; national: string } {
  if (!phone) return { country: '+82', national: '' };
  const trimmed = phone.trim();
  const matched = PHONE_COUNTRY_CODES
    .map(c => c.code)
    .sort((a, b) => b.length - a.length)
    .find(c => trimmed.startsWith(c));
  if (matched) return { country: matched, national: digitsOnly(trimmed.slice(matched.length)) };
  return { country: '+82', national: digitsOnly(trimmed) };
}

// +82: 한국 번호 규칙(02 지역번호 / 그 외 3자리 국번·휴대폰) — 실시간 하이픈.
function formatKoreanPhone(raw: string): string {
  const d = raw.slice(0, 11);
  if (d.startsWith('02')) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, d.length - 4)}-${d.slice(d.length - 4)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(d.length - 4)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

// 그 외 국가: 단순 4자리 그룹 하이픈.
function formatSimpleGroups(raw: string): string {
  return raw.slice(0, 15).replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

// 입력값을 국가별 규칙으로 실시간 포맷(숫자 외 자동 제거).
export function formatPhoneInput(raw: string, country: string): string {
  const d = digitsOnly(raw);
  return country === '+82' ? formatKoreanPhone(d) : formatSimpleGroups(d);
}

// 저장값 → 편집 폼 초기값. +82는 국내표기를 위해 앞자리 0 복원 후 포맷.
export function phoneToDomesticFormatted(phone?: string | null): { country: string; formatted: string } {
  const { country, national } = parsePhone(phone);
  const digits = country === '+82' ? '0' + national : national;
  return { country, formatted: formatPhoneInput(digits, country) };
}

// 알림/사이드바 딥링크 키 → 실제 /partner 하위 라우트 매핑.
// 'submit-documents'는 구 activeView 체계의 잔존 값 — company-info로 합류시켜 하위호환.
export const PARTNER_DEEP_LINK_ROUTE: Record<string, string> = {
  dashboard:          '/partner',
  'company-info':     '/partner/company-info',
  'submit-documents': '/partner/company-info',
  'ai-parsing':       '/partner/ai-parsing',
  'supply-chain':     '/partner/supply-chain',
  notifications:      '/partner/notifications',
  'edit-info':        '/partner/settings',
};

export const PARTNER_DEEP_LINK_LABEL: Record<string, string> = {
  'company-info':     '자료제출',
  'submit-documents': '자료제출',
  'ai-parsing':       'AI 파싱 확인',
  'supply-chain':     '공급망 연결',
};

// ─── 페이지별 전역 헤더 메타 (/partner 레이아웃 헤더) ─────────────────────────────
// 모든 협력사 페이지가 동일 헤더를 쓰던 것을 경로별로 분기. meta는 헤더 우측 소형 메타데이터.
export interface PartnerHeaderMeta {
  title: string;
  badge: string;
  description: string;
  meta?: string;
}

const PARTNER_HEADER_DEFAULT: PartnerHeaderMeta = {
  title: '협력사 업무공간',
  badge: '내 회사 기준',
  description: '내 회사 정보, 원청 요청 자료, 직접 연결된 공급망만 확인합니다.',
};

// 경로 → 헤더. '/partner'는 exact, 하위 경로는 startsWith로 매칭.
const PARTNER_HEADER_ENTRIES: { path: string; exact?: boolean; header: PartnerHeaderMeta }[] = [
  {
    path: '/partner',
    exact: true,
    header: {
      title: '협력사 업무공간',
      badge: '내 회사 기준',
      description: '내 회사 정보, 원청 요청 자료, 직접 연결된 공급망 현황을 한눈에 확인합니다.',
    },
  },
  {
    path: '/partner/supply-chain',
    header: {
      title: '공급망 연결 현황',
      badge: '공급망 워크스페이스',
      description: '우리 회사와 연결된 전후방 협력사 목록 및 원청사와의 공급망 연결 지도를 관리합니다.',
    },
  },
  {
    path: '/partner/settings',
    header: {
      title: '계정 및 보안 관리',
      badge: '보안 관리',
      description: '로그인 계정 보안 인증 정보와 시스템 알림을 수신할 주 담당자 연락처를 관리합니다.',
      meta: '계정 활성 · 마지막 접속 2026.07.02',
    },
  },
];

export function resolvePartnerHeader(pathname: string | null): PartnerHeaderMeta {
  if (!pathname) return PARTNER_HEADER_DEFAULT;
  // 더 구체적인(긴) 경로가 우선하도록 정렬 후 매칭.
  const found = [...PARTNER_HEADER_ENTRIES]
    .sort((a, b) => b.path.length - a.path.length)
    .find(entry =>
      entry.exact ? pathname === entry.path : pathname === entry.path || pathname.startsWith(entry.path + '/')
    );
  return found?.header ?? PARTNER_HEADER_DEFAULT;
}
