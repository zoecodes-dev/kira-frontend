import { SUPPLIER_NOW } from './supplierNow';

export function calcDday(nextAuditDue: string): number {
  const due = new Date(nextAuditDue);
  return Math.ceil((due.getTime() - SUPPLIER_NOW.getTime()) / 86400000);
}

export function getAuditStep(
  auditRecords: { result: string; correctiveActions: string[] }[],
): 1 | 2 | 3 | 4 {
  if (auditRecords.length === 0) return 1;
  const latest = auditRecords[auditRecords.length - 1];
  if (latest.result === 'pending') return 2;
  if (latest.result === 'pass' || latest.result === 'conditional_pass') {
    return latest.correctiveActions.length > 0 ? 4 : 3;
  }
  return 2;
}

export const issueTypeLabel: Record<string, string> = {
  forced_labor:           '강제노동',
  child_labor:            '아동노동',
  freedom_of_association: '결사의 자유',
  discrimination:         '차별',
  harassment:             '괴롭힘·성희롱',
  wages:                  '임금 체불',
  working_hours:          '초과 근무',
  other:                  '기타',
};

export const severityMeta: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: '심각', color: 'text-red-600',   bg: 'border-red-700/40 bg-red-500/8' },
  major:    { label: '중요', color: 'text-red-500',   bg: 'border-red-700/30 bg-red-500/5' },
  minor:    { label: '경미', color: 'text-amber-600', bg: 'border-amber-700/30 bg-amber-500/5' },
};

export const issueStatusMeta: Record<string, { label: string; color: string }> = {
  open:           { label: '미해결',   color: 'text-red-500' },
  in_remediation: { label: '개선 중',  color: 'text-amber-500' },
  resolved:       { label: '해결',     color: 'text-emerald-500' },
  monitoring:     { label: '모니터링', color: 'text-blue-500' },
};

export const accidentTypeMeta: Record<string, { label: string; color: string }> = {
  fatality:       { label: '사망사고', color: 'text-red-700' },
  serious_injury: { label: '중상사고', color: 'text-red-500' },
  minor_injury:   { label: '경상사고', color: 'text-amber-500' },
  near_miss:      { label: '아차사고', color: 'text-blue-500' },
  environmental:  { label: '환경사고', color: 'text-purple-500' },
};

export const auditResultMeta: Record<string, { label: string; color: string; border: string }> = {
  pass:             { label: '통과',        color: 'text-emerald-600', border: 'border-emerald-700/30 bg-emerald-500/5' },
  conditional_pass: { label: '조건부 통과', color: 'text-amber-600',   border: 'border-amber-700/30 bg-amber-500/5' },
  fail:             { label: '불합격',      color: 'text-red-600',     border: 'border-red-700/30 bg-red-500/5' },
  pending:          { label: '대기',        color: 'text-ink-400',     border: 'border-ink-700 bg-ink-800' },
};

export const auditTypeLabel: Record<string, string> = {
  on_site:         '현장 감사',
  remote:          '원격 감사',
  document_review: '서류 검토',
  third_party:     '제3자 감사',
};
