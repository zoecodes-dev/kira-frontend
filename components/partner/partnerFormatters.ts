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

export const certStatusLabel: Record<string, string> = {
  active: '유효',
  expiring_soon: '만료 임박',
  expired: '만료',
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

// ESG API는 인증서 status를 주지 않음 → 만료일 기준으로 파생 (기준일 REFERENCE_DATE)
export function deriveCertStatusPortal(expiresAt: string): 'active' | 'expiring_soon' | 'expired' {
  const exp = new Date(expiresAt + 'T00:00:00').getTime();
  if (Number.isNaN(exp)) return 'active';
  const days = Math.ceil((exp - REFERENCE_DATE.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'expired';
  if (days <= 60) return 'expiring_soon';
  return 'active';
}

// 잔여일 기준 배지 스타일 결정
// · 만료됨(days<0) or 7일 이하 → 최고 긴급 (진한 빨강)
// · 8~30일             → 긴급     (중간 빨강)
// · 31~60일            → 주의     (주황)
export function certDDayStyle(days: number): {
  wrapperCls: string;
  badgeCls: string;
} {
  if (days <= 7) {
    return {
      wrapperCls: 'border-alert-border bg-alert-bg',
      badgeCls:   'bg-alert-solid text-white',
    };
  }
  if (days <= 30) {
    return {
      wrapperCls: 'border-alert-border bg-alert-bg',
      badgeCls:   'bg-alert-solid text-white',
    };
  }
  return {
    wrapperCls: 'border-warn-border bg-warn-bg',
    badgeCls:   'bg-warn-solid text-white',
  };
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
  'company-info':     '내 기업 정보',
  'submit-documents': '내 기업 정보',
  'ai-parsing':       'AI 파싱 확인',
  'supply-chain':     '공급망 연결',
};
