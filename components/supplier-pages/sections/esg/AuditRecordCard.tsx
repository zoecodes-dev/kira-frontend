import type { EsgAuditRecord } from '@/lib/api';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { calcDday, auditResultMeta, auditTypeLabel } from '../../utils/esgUtils';

// API EsgAuditRecord에는 scope/findings/correctiveActions가 없다(백엔드 미제공).
// 추후 제공 대비해 옵셔널로 받아 있으면 표시.
interface Props {
  audit: EsgAuditRecord & {
    auditScope?: string;
    findings?: string[];
    correctiveActions?: string[];
  };
}

export function AuditRecordCard({ audit: a }: Props) {
  const rm        = auditResultMeta[a.result] ?? auditResultMeta.pending;
  const dday      = calcDday(a.nextAuditDue);
  const isOverdue = dday <= 0;
  const findings          = a.findings ?? [];
  const correctiveActions = a.correctiveActions ?? [];

  return (
    <div className={clsx('p-4 rounded-xs border', rm.border)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-semibold text-ink-100">{a.auditDate}</div>
          <div className="text-xs text-ink-400 mt-0.5">
            {a.auditor} · {auditTypeLabel[a.auditType]}
          </div>
          {a.auditScope && <div className="text-xs text-ink-500 mt-0.5">{a.auditScope}</div>}
        </div>
        <div className="text-right shrink-0">
          <span className={clsx('text-xs font-semibold px-2 py-1 rounded-xs border', rm.border, rm.color)}>
            {rm.label}
          </span>
          <div className="text-[10px] text-ink-500 num-mono mt-1">
            다음 감사: {a.nextAuditDue}
          </div>
          <div className={clsx(
            'text-[10px] num-mono font-bold mt-1',
            isOverdue ? 'text-red-500' : dday <= 30 ? 'text-amber-500' : 'text-ink-400'
          )}>
            {isOverdue ? '기한 초과' : `다음 감사 D-${dday}`}
          </div>
        </div>
      </div>

      {findings.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1.5">주요 발견 사항</div>
          <div className="space-y-1">
            {findings.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-600">
                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                {f}
              </div>
            ))}
          </div>
        </div>
      )}

      {correctiveActions.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1.5">시정 조치</div>
          <div className="space-y-1.5">
            {correctiveActions.map((ca, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-1.5 text-[11px] text-ink-300">
                  <CheckCircle2 className="w-3 h-3 text-ink-500 shrink-0 mt-0.5" />
                  {ca}
                </div>
                <span className={clsx(
                  'shrink-0 text-[10px] num-mono font-semibold px-1.5 py-0.5 rounded-xs border',
                  isOverdue
                    ? 'border-red-700/30 bg-red-500/8 text-red-500'
                    : dday <= 30
                      ? 'border-amber-700/30 bg-amber-500/8 text-amber-500'
                      : 'border-ink-700/60 bg-ink-800 text-ink-400'
                )}>
                  {isOverdue ? '기한 초과' : `이행 기한 D-${dday}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
