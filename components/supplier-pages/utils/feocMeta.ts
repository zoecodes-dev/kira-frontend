import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export type FeocStatus = 'eligible' | 'ineligible' | 'under_review' | 'unknown';

export const feocStatusMeta: Record<FeocStatus, {
  label: string; sublabel: string;
  bg: string; border: string; textColor: string; icon: LucideIcon;
}> = {
  eligible: {
    label: 'FEOC 적격',
    sublabel: 'IRA 세액공제 대상 — 중국·러시아·북한·이란 우려 기업 해당 없음',
    bg: 'bg-emerald-500/8', border: 'border-emerald-700/30', textColor: 'text-emerald-600',
    icon: CheckCircle2,
  },
  ineligible: {
    label: 'FEOC 부적격',
    sublabel: 'IRA 세액공제 제외 — FEOC 지분 25% 이상 또는 직접 통제 관계 확인',
    bg: 'bg-red-500/8', border: 'border-red-700/40', textColor: 'text-red-600',
    icon: XCircle,
  },
  under_review: {
    label: 'FEOC 검토 중',
    sublabel: '지분 구조 검토 진행 중 — 판정 전까지 IRA 세액공제 보류 권고',
    bg: 'bg-amber-500/8', border: 'border-amber-700/30', textColor: 'text-amber-600',
    icon: Clock,
  },
  unknown: {
    label: 'FEOC 미파악',
    sublabel: '지분 구조 파악 필요 — 즉시 확인 요청 권고',
    bg: 'bg-ink-800', border: 'border-ink-700', textColor: 'text-ink-400',
    icon: AlertCircle,
  },
};

export const originCertTypeMeta: Record<string, { label: string; color: string }> = {
  FTA:            { label: 'FTA 원산지',      color: 'text-blue-500' },
  GSP:            { label: 'GSP',             color: 'text-purple-500' },
  UFLPA_REBUTTAL: { label: 'UFLPA 반증',      color: 'text-amber-500' },
  IRA_ORIGIN:     { label: 'IRA 원산지',      color: 'text-emerald-500' },
  CONFLICT_FREE:  { label: '분쟁광물 무분쟁', color: 'text-teal-500' },
  GENERAL:        { label: '일반 원산지',      color: 'text-ink-400' },
};
