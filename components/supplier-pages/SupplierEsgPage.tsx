'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ApiError,
  getSupplierEsg,
  getSupplierRiskProfile,
  type SupplierEsgResponse,
  type SupplierRiskProfileResponse,
} from '@/lib/api';
import {
  AlertTriangle, CheckCircle2, AlertCircle,
  Shield, HardHat, Heart, MessageSquare, RefreshCw, Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { KpiTile } from './shared/KpiTile';
import { Empty } from './shared/Empty';
import { AuditRecordCard } from './sections/esg/AuditRecordCard';
import { IndustrialAccidentCard } from './sections/esg/IndustrialAccidentCard';
import {
  getAuditStep,
  issueTypeLabel, severityMeta, issueStatusMeta,
} from './utils/esgUtils';

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

export default function SupplierEsgPage() {
  const { id } = useParams<{ id: string }>();

  const [esg, setEsg] = useState<SupplierEsgResponse | null>(null);
  const [riskProfile, setRiskProfile] = useState<SupplierRiskProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [esgRes, profile] = await Promise.all([
          getSupplierEsg(id),
          // 종합 점수는 risk-profile에서 — 실패해도 ESG 본문은 표시
          getSupplierRiskProfile(id).catch(() => null),
        ]);
        if (cancelled) return;
        setEsg(esgRes);
        setRiskProfile(profile);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError && err.status === 404
              ? '협력사를 찾을 수 없습니다'
              : 'ESG 데이터를 불러오지 못했습니다',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-xs text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        ESG 데이터를 불러오는 중…
      </div>
    );
  }

  if (error || !esg) {
    return <div className="p-8 text-xs text-ink-500">{error ?? 'ESG 데이터가 없습니다'}</div>;
  }

  // API는 risk-profile/esg로 분리 — 화면 모델로 합성. highRiskReasons는 API 미제공 → []
  const risk = {
    auditRecords: esg.auditRecords,
    humanRightsIssues: esg.humanRightsIssues,
    industrialAccidents: esg.industrialAccidents,
    overallRiskScore: riskProfile?.overallRiskScore ?? 0,
    highRiskReasons: [] as string[],
  };

  const openIssues     = risk.humanRightsIssues.filter(i => i.status !== 'resolved').length;
  const criticalIssues = risk.humanRightsIssues.filter(i => i.severity === 'critical').length;
  const fatalAccidents = risk.industrialAccidents.filter(a => a.accidentType === 'fatality').length;

  const currentStep = getAuditStep(risk.auditRecords.map(a => ({ result: a.result, correctiveActions: [] })));

  const steps: { label: string; desc: string }[] = [
    { label: '수립', desc: '실사 정책 수립' },
    { label: '이행', desc: '실사 진행 중' },
    { label: '평가', desc: '결과 검토' },
    { label: '개선', desc: '시정 조치 이행' },
  ];

  return (
    <div className="p-8 space-y-8 max-w-5xl">

      {/* ── 요약 KPI ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile
          icon={Shield}        label="실사 이력"         value={risk.auditRecords.length}        unit="건"
          tone={risk.auditRecords.length > 0 ? 'ok' : 'neutral'}
        />
        <KpiTile
          icon={Heart}         label="인권 이슈 (미해결)" value={openIssues}                     unit="건"
          tone={openIssues > 0 ? (criticalIssues > 0 ? 'critical' : 'warn') : 'ok'}
        />
        <KpiTile
          icon={HardHat}       label="산업재해"          value={risk.industrialAccidents.length} unit="건"
          tone={fatalAccidents > 0 ? 'critical' : risk.industrialAccidents.length > 0 ? 'warn' : 'ok'}
        />
        <KpiTile
          icon={AlertTriangle} label="종합 위험 점수"    value={risk.overallRiskScore}           unit="/100"
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

      {/* ── CSDDD · LkSG 실사 이행 단계 스텝 바 ── */}
      <Section title="CSDDD · LkSG 실사 이행 단계" icon={Shield} iconColor="text-teal-500">
        <div className="relative flex items-start gap-0">
          {steps.map((step, idx) => {
            const stepNo    = idx + 1;
            const isDone    = stepNo < currentStep;
            const isActive  = stepNo === currentStep;

            return (
              <div key={step.label} className="flex-1 flex flex-col items-center relative">
                {idx > 0 && (
                  <div className={clsx(
                    'absolute top-[14px] right-1/2 w-full h-px -translate-y-1/2',
                    isDone ? 'bg-emerald-600' : isActive ? 'bg-accent-600' : 'bg-ink-700'
                  )} />
                )}
                <div className={clsx(
                  'relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors',
                  isDone   ? 'bg-emerald-600/20 border-emerald-600 text-emerald-500' :
                  isActive ? 'bg-accent-700/20 border-accent-500 text-accent-400' :
                             'bg-ink-800 border-ink-700 text-ink-500'
                )}>
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : stepNo}
                </div>
                <div className="mt-2 text-center">
                  <div className={clsx('text-[12px] font-medium',
                    isDone   ? 'text-emerald-500' :
                    isActive ? 'text-accent-400' : 'text-ink-600'
                  )}>
                    {step.label}
                  </div>
                  <div className="text-[10px] text-ink-500 mt-0.5">{step.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={clsx(
          'mt-5 px-3 py-2.5 rounded-xs border text-[11px]',
          currentStep === 1 ? 'border-ink-700/60 bg-ink-800/40 text-ink-400' :
          currentStep === 2 ? 'border-blue-700/30 bg-blue-500/8 text-blue-400' :
          currentStep === 3 ? 'border-emerald-700/30 bg-emerald-500/8 text-emerald-500' :
                              'border-accent-700/30 bg-accent-500/8 text-accent-400'
        )}>
          {currentStep === 1 && '실사 정책 수립 단계 — 감사 이력이 없습니다. 첫 실사 일정을 등록하세요.'}
          {currentStep === 2 && '실사 이행 단계 — 감사가 진행 중입니다.'}
          {currentStep === 3 && '평가 완료 단계 — 최근 실사가 통과되었습니다.'}
          {currentStep === 4 && '개선 단계 — 시정 조치 이행 중입니다. D-day를 확인하세요.'}
        </div>
      </Section>

      {/* ── 실사 이력 ── */}
      <Section title="실사 이력" icon={Shield} iconColor="text-blue-500">
        {risk.auditRecords.length === 0 ? (
          <Empty label="실사 기록이 없습니다" />
        ) : (
          <div className="space-y-3">
            {risk.auditRecords.map(a => (
              <AuditRecordCard key={a.auditRecordId} audit={a} />
            ))}
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
              const st = issueStatusMeta[issue.status];
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
            {risk.industrialAccidents.map(acc => (
              <IndustrialAccidentCard key={acc.accidentId} accident={acc} />
            ))}
          </div>
        )}
      </Section>

      {/* ── 고충처리 채널 ── */}
      <Section title="고충처리 채널" icon={MessageSquare} iconColor="text-ink-400">
        <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink-300">
              <span className="text-base leading-none">🔄</span>
              고충처리 채널 등록 여부
            </div>
            <span className="flex items-center gap-1 text-[10px] text-ink-500 border border-ink-700/60 bg-ink-800 px-2 py-0.5 rounded-xs">
              <RefreshCw className="w-2.5 h-2.5" />
              시스템 검증 대기
            </span>
          </div>
          <div className="pt-2 border-t border-ink-700/30 text-[11px] text-ink-500 leading-relaxed">
            CSDDD Art.9 요건 — 이해관계자가 접근 가능한 고충처리 절차 운영 필요
          </div>
        </div>
      </Section>

    </div>
  );
}
