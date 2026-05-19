'use client';

import { useParams } from 'next/navigation';
import { suppliers } from '@/lib/data';
import { getRiskProfile, getTrainingRecords, getContacts } from '@/lib/supplier-detail-data';
import {
  AlertTriangle, CheckCircle2, Clock, AlertCircle,
  Shield, Users, HardHat, Heart,
} from 'lucide-react';
import clsx from 'clsx';

const issueTypeLabel: Record<string, string> = {
  forced_labor:          '강제노동',
  child_labor:           '아동노동',
  freedom_of_association:'결사의 자유',
  discrimination:        '차별',
  harassment:            '괴롭힘·성희롱',
  wages:                 '임금 체불',
  working_hours:         '초과 근무',
  other:                 '기타',
};

const severityMeta: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: '심각',  color: 'text-red-600',    bg: 'border-red-700/40 bg-red-500/8' },
  major:    { label: '중요',  color: 'text-red-500',    bg: 'border-red-700/30 bg-red-500/5' },
  minor:    { label: '경미',  color: 'text-amber-600',  bg: 'border-amber-700/30 bg-amber-500/5' },
};

const statusMeta: Record<string, { label: string; color: string }> = {
  open:           { label: '미해결',  color: 'text-red-500' },
  in_remediation: { label: '개선 중', color: 'text-amber-500' },
  resolved:       { label: '해결',    color: 'text-emerald-500' },
  monitoring:     { label: '모니터링', color: 'text-blue-500' },
};

const accidentTypeMeta: Record<string, { label: string; color: string }> = {
  fatality:       { label: '사망사고',   color: 'text-red-700' },
  serious_injury: { label: '중상사고',   color: 'text-red-500' },
  minor_injury:   { label: '경상사고',   color: 'text-amber-500' },
  near_miss:      { label: '아차사고',   color: 'text-blue-500' },
  environmental:  { label: '환경사고',   color: 'text-purple-500' },
};

export default function SupplierEsgPage() {
  const { id } = useParams<{ id: string }>();
  const risk = getRiskProfile(id);

  if (!risk) {
    return <div className="p-8 text-xs text-ink-500">리스크 데이터가 없습니다</div>;
  }

  const auditResultMeta: Record<string, { label: string; color: string; border: string }> = {
    pass:             { label: '통과',       color: 'text-emerald-600', border: 'border-emerald-700/30 bg-emerald-500/5' },
    conditional_pass: { label: '조건부 통과', color: 'text-amber-600',   border: 'border-amber-700/30 bg-amber-500/5' },
    fail:             { label: '불합격',     color: 'text-red-600',     border: 'border-red-700/30 bg-red-500/5' },
    pending:          { label: '대기',       color: 'text-ink-400',     border: 'border-ink-700 bg-ink-800' },
  };

  const auditTypeLabel: Record<string, string> = {
    on_site:         '현장 감사',
    remote:          '원격 감사',
    document_review: '서류 검토',
    third_party:     '제3자 감사',
  };

  const openIssues = risk.humanRightsIssues.filter(i => i.status !== 'resolved').length;
  const criticalIssues = risk.humanRightsIssues.filter(i => i.severity === 'critical').length;
  const fatalAccidents = risk.industrialAccidents.filter(a => a.accidentType === 'fatality').length;

  return (
    <div className="p-8 space-y-8 max-w-5xl">

      {/* ── 요약 KPI ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile
          icon={Shield} label="실사 이력" value={risk.auditRecords.length} unit="건"
          tone={risk.auditRecords.length > 0 ? 'ok' : 'neutral'}
        />
        <KpiTile
          icon={Heart} label="인권 이슈 (미해결)" value={openIssues} unit="건"
          tone={openIssues > 0 ? (criticalIssues > 0 ? 'critical' : 'warn') : 'ok'}
        />
        <KpiTile
          icon={HardHat} label="산업재해" value={risk.industrialAccidents.length} unit="건"
          tone={fatalAccidents > 0 ? 'critical' : risk.industrialAccidents.length > 0 ? 'warn' : 'ok'}
        />
        <KpiTile
          icon={AlertTriangle} label="종합 위험 점수" value={risk.overallRiskScore} unit="/100"
          tone={risk.overallRiskScore >= 70 ? 'critical' : risk.overallRiskScore >= 40 ? 'warn' : 'ok'}
        />
      </div>

      {/* ── 고위험 사유 ── */}
      {risk.highRiskReasons.length > 0 && (
        <Section title="고위험 플래그 사유" icon={AlertTriangle} iconColor="text-red-500">
          <div className="space-y-1.5">
            {risk.highRiskReasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-xs border border-red-700/30 bg-red-500/5 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {r}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── 실사 이력 ── */}
      <Section title="실사 이력" icon={Shield} iconColor="text-blue-500">
        {risk.auditRecords.length === 0 ? (
          <Empty label="실사 기록이 없습니다" />
        ) : (
          <div className="space-y-3">
            {risk.auditRecords.map(a => {
              const rm = auditResultMeta[a.result];
              return (
                <div key={a.auditId} className={clsx('p-4 rounded-xs border', rm.border)}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-semibold text-ink-100">{a.auditDate}</div>
                      <div className="text-xs text-ink-400 mt-0.5">
                        {a.auditor} · {auditTypeLabel[a.auditType]}
                      </div>
                      <div className="text-xs text-ink-500 mt-0.5">{a.auditScope}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={clsx('text-xs font-semibold px-2 py-1 rounded-xs border', rm.border, rm.color)}>
                        {rm.label}
                      </span>
                      <div className="text-[10px] text-ink-500 num-mono mt-1">
                        다음 감사: {a.nextAuditDue}
                      </div>
                    </div>
                  </div>

                  {a.findings.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1.5">주요 발견 사항</div>
                      <div className="space-y-1">
                        {a.findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-600">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {a.correctiveActions.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1.5">시정 조치</div>
                      <div className="space-y-1">
                        {a.correctiveActions.map((ca, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px] text-ink-300">
                            <CheckCircle2 className="w-3 h-3 text-ink-500 shrink-0 mt-0.5" />
                            {ca}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── 인권 이슈 ── */}
      <Section title="인권·노동 이슈" icon={Heart} iconColor="text-red-500">
        {risk.humanRightsIssues.length === 0 ? (
          <Empty label="등록된 인권 이슈가 없습니다" ok />
        ) : (
          <div className="space-y-3">
            {risk.humanRightsIssues.map(issue => {
              const sv = severityMeta[issue.severity];
              const st = statusMeta[issue.status];
              return (
                <div key={issue.issueId} className={clsx('p-4 rounded-xs border', sv.bg)}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx('text-[10px] font-bold uppercase tracking-wider', sv.color)}>
                        {sv.label}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-300">
                        {issueTypeLabel[issue.issueType] ?? issue.issueType}
                      </span>
                    </div>
                    <span className={clsx('text-[10px] font-medium shrink-0', st.color)}>{st.label}</span>
                  </div>
                  <p className="text-xs text-ink-200 leading-relaxed mb-2">{issue.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-ink-500 num-mono">
                    <span>발견: {issue.detectedAt.slice(0, 10)}</span>
                    <span>출처: {issue.source}</span>
                    {issue.resolvedAt && <span>해결: {issue.resolvedAt.slice(0, 10)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── 산업재해 ── */}
      <Section title="산업재해 이력" icon={HardHat} iconColor="text-orange-500">
        {risk.industrialAccidents.length === 0 ? (
          <Empty label="등록된 산업재해가 없습니다" ok />
        ) : (
          <div className="space-y-3">
            {risk.industrialAccidents.map(acc => {
              const atm = accidentTypeMeta[acc.accidentType];
              const isFatal = acc.accidentType === 'fatality';
              return (
                <div key={acc.accidentId} className={clsx(
                  'p-4 rounded-xs border',
                  isFatal ? 'border-red-700/40 bg-red-500/8' :
                  acc.accidentType === 'serious_injury' ? 'border-red-700/30 bg-red-500/5' :
                  'border-amber-700/30 bg-amber-500/5'
                )}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className={clsx('text-sm font-bold', atm.color)}>{atm.label}</div>
                      <div className="text-[11px] text-ink-400 num-mono">{acc.accidentDate}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-ink-400">사상자</div>
                      <div className={clsx('text-lg font-bold num-mono', isFatal ? 'text-red-600' : 'text-amber-600')}>
                        {acc.casualties}명
                      </div>
                      {acc.ltifr !== undefined && (
                        <div className="text-[10px] text-ink-500 num-mono">LTIFR {acc.ltifr}</div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-ink-200 leading-relaxed mb-2">{acc.description}</p>
                  {acc.correctiveAction && (
                    <div className="flex items-start gap-1.5 text-[11px] text-ink-400 pt-2 border-t border-ink-700/30">
                      <CheckCircle2 className="w-3 h-3 text-ink-500 shrink-0 mt-0.5" />
                      {acc.correctiveAction}
                    </div>
                  )}
                  <div className="text-[10px] text-ink-500 mt-1">
                    상태: {acc.status === 'reported' ? '보고됨' : acc.status === 'investigating' ? '조사 중' : '종결'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

    </div>
  );
}

function Section({ title, icon: Icon, iconColor, children }: {
  title: string; icon: any; iconColor: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={clsx('w-4 h-4', iconColor)} />
        <h2 className="text-sm font-semibold text-ink-100">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, unit, tone }: {
  icon: any; label: string; value: number; unit: string;
  tone: 'ok' | 'warn' | 'critical' | 'neutral';
}) {
  const colors = {
    ok:       { border: 'border-emerald-700/30', val: 'text-emerald-600' },
    warn:     { border: 'border-amber-700/30',   val: 'text-amber-600' },
    critical: { border: 'border-red-700/30',     val: 'text-red-600' },
    neutral:  { border: 'border-ink-700',        val: 'text-ink-300' },
  }[tone];
  return (
    <div className={clsx('rounded-xs border p-3 bg-ink-800/30', colors.border)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-ink-400">{label}</span>
        <Icon className="w-3.5 h-3.5 text-ink-500" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={clsx('text-2xl font-semibold num-mono', colors.val)}>{value}</span>
        <span className="text-xs text-ink-500">{unit}</span>
      </div>
    </div>
  );
}

function Empty({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className={clsx(
      'flex items-center justify-center gap-2 py-6 text-xs rounded-xs border border-dashed',
      ok ? 'border-emerald-700/30 text-emerald-600 bg-emerald-500/5' : 'border-ink-700/40 text-ink-500'
    )}>
      {ok && <CheckCircle2 className="w-4 h-4" />}
      {label}
    </div>
  );
}
