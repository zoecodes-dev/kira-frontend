'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import {
  supplierRiskProfiles, supplierCompleteness, getSupplierName, getContacts,
  getCertifications,
} from '@/lib/supplier-detail-data';
import { AlertTriangle, CheckCircle2, FileCheck, ShieldCheck, Upload, XCircle } from 'lucide-react';
import clsx from 'clsx';

const selfAssessments = [
  { supplierId: 'S-CELL-001', selfRisk: 'low', score: 91, status: 'approved', submittedAt: '2026-05-10', owner: 'ESG팀 김민재' },
  { supplierId: 'S-CAM-001', selfRisk: 'low', score: 88, status: 'approved', submittedAt: '2026-05-12', owner: 'ESG팀 김민재' },
  { supplierId: 'S-CAM-002', selfRisk: 'medium', score: 62, status: 'review', submittedAt: '2026-05-14', owner: '컴플라이언스 이서윤' },
  { supplierId: 'S-REF-002', selfRisk: 'medium', score: 44, status: 'rework', submittedAt: '2026-05-08', owner: 'ESG팀 박지훈' },
  { supplierId: 'S-MINE-002', selfRisk: 'high', score: 38, status: 'review', submittedAt: '2026-05-03', owner: '구매실사 최하린' },
];

const evidenceItems = [
  { label: '사업자등록증', required: true },
  { label: '행동강령 서약서', required: true },
  { label: '인권 정책', required: true },
  { label: '환경 협력 평가', required: true },
  { label: '안전 정책', required: false },
  { label: '공급망 자가 평가', required: true },
];

const toneByRisk = {
  low: 'ok',
  medium: 'warn',
  high: 'alert',
  critical: 'alert',
} as const;

const statusMeta = {
  approved: { label: '승인', tone: 'ok' as const },
  review: { label: '검토 중', tone: 'info' as const },
  rework: { label: '보완 요청', tone: 'warn' as const },
  blocked: { label: '차단 후보', tone: 'alert' as const },
};

export default function SupplierReliabilityPage() {
  const [selectedId, setSelectedId] = useState(selfAssessments[0].supplierId);
  const selectedAssessment = selfAssessments.find(item => item.supplierId === selectedId) ?? selfAssessments[0];
  const selectedRisk = supplierRiskProfiles.find(item => item.supplierId === selectedId) ?? supplierRiskProfiles[0];
  const selectedName = getSupplierName(selectedId);
  const primaryContact = getContacts(selectedId).find(c => c.isPrimary) ?? getContacts(selectedId)[0];
  const completeness = supplierCompleteness.find(c => c.supplierId === selectedId);
  const certs = getCertifications(selectedId);

  const stats = useMemo(() => {
    const reviewCount = selfAssessments.filter(item => item.status === 'review').length;
    const reworkCount = selfAssessments.filter(item => item.status === 'rework').length;
    const highCount = supplierRiskProfiles.filter(item => item.riskLevel === 'high' || item.riskLevel === 'critical').length;
    const mismatchCount = selfAssessments.filter(item => {
      const profile = supplierRiskProfiles.find(r => r.supplierId === item.supplierId);
      return profile && item.selfRisk !== profile.riskLevel;
    }).length;
    return { reviewCount, reworkCount, highCount, mismatchCount };
  }, []);

  return (
    <>
      <PageHeader
        title="협력사 신뢰성 평가"
        description="자가 평가, 행동강령, 인권·환경 증빙, 위험도 자체 평가를 검토하고 승인하는 화면"
        badge="P0"
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric label="검토 대기" value={stats.reviewCount} unit="건" tone="info" />
          <Metric label="보완 요청" value={stats.reworkCount} unit="건" tone="warn" />
          <Metric label="고위험 협력사" value={stats.highCount} unit="개사" tone="alert" />
          <Metric label="자가/시스템 불일치" value={stats.mismatchCount} unit="건" tone="warn" />
        </div>

        <Card title="규제·신뢰성 요약" subtitle="협력사별 적격성 판단에 필요한 핵심 신호">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Signal title="행동강령·인권" desc="서약서, 인권 정책, 자가 평가 답변을 검토해 고위험 응답을 표시" />
            <Signal title="환경·안전" desc="환경 협력 평가, 안전 정책, 산재 이력을 통합해 조건부 승인 여부 판단" />
            <Signal title="FEOC·실사" desc="시스템 리스크 점수와 자체 위험도 평가가 다르면 검토 필요로 표시" />
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6">
          <Card title="평가 대상 협력사" subtitle="클릭하면 오른쪽 검토 패널이 바뀝니다">
            <div className="space-y-2">
              {selfAssessments.map(item => {
                const name = getSupplierName(item.supplierId);
                const risk = supplierRiskProfiles.find(r => r.supplierId === item.supplierId);
                return (
                  <button
                    key={item.supplierId}
                    onClick={() => setSelectedId(item.supplierId)}
                    className={clsx(
                      'w-full rounded-xs border p-3 text-left transition-colors',
                      selectedId === item.supplierId
                        ? 'border-accent-500/70 bg-accent-500/8'
                        : 'border-ink-700/60 bg-ink-900/30 hover:bg-ink-800/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink-100 truncate">{name?.nameEn ?? item.supplierId}</div>
                        <div className="text-[11px] text-ink-500 truncate">{name?.nameKo ?? '협력사'}</div>
                      </div>
                      <Badge tone={statusMeta[item.status as keyof typeof statusMeta].tone}>{statusMeta[item.status as keyof typeof statusMeta].label}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <Mini label="자가 위험" value={item.selfRisk.toUpperCase()} />
                      <Mini label="시스템 위험" value={(risk?.riskLevel ?? 'unknown').toUpperCase()} />
                      <Mini label="자가 점수" value={`${item.score}/100`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            <Card
              title={selectedName?.nameEn ?? selectedId}
              subtitle="원청사 ESG 담당자 검토 패널"
              action={<Badge tone={toneByRisk[selectedRisk.riskLevel]}>{selectedRisk.riskLevel}</Badge>}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                <Mini label="자가 평가" value={`${selectedAssessment.score}/100`} />
                <Mini label="데이터 완성도" value={`${completeness?.completionRate ?? 0}%`} />
                <Mini label="FEOC" value={selectedRisk.feocStatus.replace('_', ' ')} />
              </div>

              <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-4 mb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-ink-100">검토 담당자</div>
                    <div className="text-[11px] text-ink-500 mt-1">{selectedAssessment.owner}</div>
                    {primaryContact && (
                      <div className="text-[11px] text-ink-400 mt-1">협력사 담당자: {primaryContact.name} · {primaryContact.email}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-ink-500">submitted</div>
                    <div className="text-xs text-ink-200 num-mono">{selectedAssessment.submittedAt}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {evidenceItems.map((item, index) => {
                  const done = selectedAssessment.score - index * 7 > 45;
                  return (
                    <div key={item.label} className="flex items-center justify-between rounded-xs border border-ink-700/60 bg-ink-900/30 px-3 py-2">
                      <div className="flex items-center gap-2">
                        {done ? <FileCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Upload className="w-3.5 h-3.5 text-amber-400" />}
                        <div>
                          <div className="text-xs text-ink-200">{item.label}</div>
                          <div className="text-[10px] text-ink-500">{item.required ? '필수 증빙' : '선택 증빙'}</div>
                        </div>
                      </div>
                      <Badge tone={done ? 'ok' : 'warn'}>{done ? '제출됨' : '보완'}</Badge>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="검토 결과와 조치" subtitle="결과가 협력사 목록·공급망·DPP 판단에 반영됩니다">
              <div className="space-y-3">
                {selectedRisk.highRiskReasons.length > 0 ? (
                  selectedRisk.highRiskReasons.slice(0, 4).map(reason => (
                    <div key={reason} className="flex items-start gap-2 rounded-xs border border-red-700/30 bg-red-500/5 p-3">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-ink-300 leading-5">{reason}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 rounded-xs border border-emerald-700/30 bg-emerald-500/5 p-3 text-xs text-ink-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    현재 열린 고위험 사유가 없습니다.
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton tone="ok" label="승인" />
                <ActionButton tone="warn" label="보완 요청" />
                <ActionButton tone="alert" label="고위험 지정" />
                <ActionButton tone="neutral" label="실사 요청" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: 'info' | 'warn' | 'alert' }) {
  const color = tone === 'info' ? 'text-blue-400' : tone === 'warn' ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className={clsx('text-2xl font-bold num-mono mt-2', color)}>{value}<span className="text-sm text-ink-500 ml-1">{unit}</span></div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-2">
      <div className="text-[10px] text-ink-500">{label}</div>
      <div className="text-xs font-semibold text-ink-100 mt-1 truncate">{value}</div>
    </div>
  );
}

function Signal({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-100">
        <ShieldCheck className="w-3.5 h-3.5 text-accent-500" />
        {title}
      </div>
      <p className="text-[11px] text-ink-500 mt-2 leading-5">{desc}</p>
    </div>
  );
}

function ActionButton({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'alert' | 'neutral' }) {
  const style = {
    ok: 'border-emerald-700/40 text-emerald-500 hover:bg-emerald-500/10',
    warn: 'border-amber-700/40 text-amber-400 hover:bg-amber-500/10',
    alert: 'border-red-700/40 text-red-400 hover:bg-red-500/10',
    neutral: 'border-ink-700 text-ink-300 hover:bg-ink-800',
  }[tone];
  return <button className={clsx('rounded-xs border px-3 py-2 text-xs font-semibold transition-colors', style)}>{label}</button>;
}
