'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import TopStatCard from '@/components/TopStatCard';
import {
  getSupplierName, getFactories, supplierRiskProfiles,
} from '@/lib/supplier-detail-data';
import {
  AlertTriangle, CalendarClock, CheckCircle2, ClipboardList,
  FileText, HardHat, Plus, Upload,
} from 'lucide-react';
import clsx from 'clsx';

const audits = [
  {
    id: 'DD-2026-001',
    supplierId: 'S-MINE-002',
    factoryId: 'F-017',
    type: '현장 실사',
    scope: ['인권', '아동노동', '광산 안전'],
    status: 'capa',
    result: '조건부 통과',
    score: 54,
    plannedAt: '2026-05-28',
    completedAt: '2026-05-09',
    auditor: 'Bettercoal 현장 심사팀',
    report: 'katanga_site_audit_2026.pdf',
    findings: ['아동노동 감사 보고서 보완 필요', '커뮤니티 합의서 갱신 지연', '광산 안전 교육 기록 일부 누락'],
    capa: [
      { task: '아동노동 감사 원본 제출', owner: '협력사 CSR 담당자', due: '2026-06-10', status: '요청 발송' },
      { task: '커뮤니티 합의서 갱신본 제출', owner: '협력사 법무', due: '2026-06-18', status: '진행 중' },
    ],
  },
  {
    id: 'DD-2026-002',
    supplierId: 'S-REF-002',
    factoryId: 'F-013',
    type: '문서 실사',
    scope: ['FEOC', '환경', '공급망 추적'],
    status: 'blocked',
    result: '부적합',
    score: 32,
    plannedAt: '2026-05-20',
    completedAt: '2026-05-15',
    auditor: '원청사 ESG팀',
    report: 'ganzhou_feoc_review.pdf',
    findings: ['FEOC 직접 지분 41.2%', 'ISO 14001 만료', '광물 추적 시스템 미구축'],
    capa: [
      { task: 'FEOC 지분 구조 원본 재제출', owner: '협력사 재무', due: '2026-05-30', status: '검토 중' },
      { task: '대체 공급망 검토', owner: '구매 전략팀', due: '2026-06-05', status: '미조치' },
    ],
  },
  {
    id: 'DD-2026-003',
    supplierId: 'S-CAM-001',
    factoryId: 'F-005',
    type: '제3자 감사',
    scope: ['환경', '공정 문서', '재활용 함량'],
    status: 'closed',
    result: '통과',
    score: 88,
    plannedAt: '2026-04-20',
    completedAt: '2026-04-23',
    auditor: 'Bureau Veritas Korea',
    report: 'pos_cathode_audit_2026.pdf',
    findings: ['공정도 4단계 문서 최신화 필요'],
    capa: [
      { task: '공정도 PDF 업데이트', owner: 'POS 품질팀', due: '2026-05-15', status: '완료' },
    ],
  },
  {
    id: 'DD-2026-004',
    supplierId: 'S-CAM-002',
    factoryId: 'F-008',
    type: '원격 실사',
    scope: ['근로시간', 'FEOC', '원산지'],
    status: 'scheduled',
    result: '예정',
    score: 0,
    plannedAt: '2026-06-04',
    completedAt: '',
    auditor: 'KPMG China',
    report: '',
    findings: ['초과근무 개선조치 확인 예정', '국영기업 간접 지분 확인 예정'],
    capa: [],
  },
];

const statusMeta = {
  scheduled: { label: '예정', tone: 'info' as const },
  capa: { label: '조치 진행 중', tone: 'warn' as const },
  blocked: { label: '차단 후보', tone: 'alert' as const },
  closed: { label: '해결', tone: 'ok' as const },
};

export default function DueDiligencePage() {
  const [selectedId, setSelectedId] = useState(audits[0].id);
  const selected = audits.find(audit => audit.id === selectedId) ?? audits[0];
  const supplier = getSupplierName(selected.supplierId);
  const factory = getFactories(selected.supplierId).find(item => item.factoryId === selected.factoryId);
  const risk = supplierRiskProfiles.find(item => item.supplierId === selected.supplierId);

  const stats = useMemo(() => ({
    total: audits.length,
    capa: audits.filter(item => item.status === 'capa').length,
    blocked: audits.filter(item => item.status === 'blocked').length,
    closed: audits.filter(item => item.status === 'closed').length,
  }), []);

  return (
    <>
      <PageHeader
        title="공급망 실사 관리"
        description="실사 계획부터 보고서 등록, 개선조치, 재실사까지 관리하는 화면"
        badge="P0"
        actions={<button className="inline-flex items-center gap-2 rounded-xs border border-accent-700/40 px-3 py-2 text-xs font-semibold text-accent-500 hover:bg-accent-500/10"><Plus className="w-3.5 h-3.5" />실사 계획 생성</button>}
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric label="전체 실사" value={stats.total} unit="건" tone="neutral" />
          <Metric label="조치 진행" value={stats.capa} unit="건" tone="warn" />
          <Metric label="차단 후보" value={stats.blocked} unit="건" tone="alert" />
          <Metric label="해결" value={stats.closed} unit="건" tone="ok" />
        </div>

        <Card title="실사 운영 프로세스" subtitle="보고서가 결과로만 남지 않고 개선조치 완료까지 이어지도록 관리">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {['대상 선정', '자료 요청', '보고서 등록', 'CAPA 배정', '완료 승인'].map((step, index) => (
              <div key={step} className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-3">
                <div className="w-7 h-7 rounded-full bg-accent-500/10 text-accent-500 border border-accent-700/30 flex items-center justify-center text-xs num-mono mb-3">
                  {index + 1}
                </div>
                <div className="text-sm font-semibold text-ink-100">{step}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.45fr] gap-6">
          <Card title="실사 목록" subtitle="협력사·공장·실사 유형별 관리">
            <div className="space-y-2">
              {audits.map(audit => {
                const name = getSupplierName(audit.supplierId);
                return (
                  <button
                    key={audit.id}
                    onClick={() => setSelectedId(audit.id)}
                    className={clsx(
                      'w-full rounded-xs border p-3 text-left transition-colors',
                      selectedId === audit.id ? 'border-accent-500/70 bg-accent-500/8' : 'border-ink-700/60 bg-ink-900/30 hover:bg-ink-800/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink-100 num-mono">{audit.id}</div>
                        <div className="text-sm text-ink-100 mt-1 truncate">{name?.nameEn ?? audit.supplierId}</div>
                        <div className="text-[11px] text-ink-500">{audit.type} · {audit.plannedAt}</div>
                      </div>
                      <Badge tone={statusMeta[audit.status as keyof typeof statusMeta].tone}>{statusMeta[audit.status as keyof typeof statusMeta].label}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Mini label="결과" value={audit.result} />
                      <Mini label="점수" value={audit.score ? `${audit.score}/100` : '-'} />
                      <Mini label="CAPA" value={`${audit.capa.length}건`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            <Card
              title={supplier?.nameEn ?? selected.supplierId}
              subtitle={`${selected.type} · ${factory?.factoryName ?? selected.factoryId}`}
              action={<Badge tone={statusMeta[selected.status as keyof typeof statusMeta].tone}>{statusMeta[selected.status as keyof typeof statusMeta].label}</Badge>}
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
                <Mini label="실사기관" value={selected.auditor} />
                <Mini label="계획일" value={selected.plannedAt} />
                <Mini label="완료일" value={selected.completedAt || '-'} />
                <Mini label="시스템 위험" value={risk?.riskLevel ?? '-'} />
              </div>

              <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-4 mb-5">
                <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">실사 범위</div>
                <div className="flex flex-wrap gap-2">
                  {selected.scope.map(scope => <Badge key={scope} tone="neutral">{scope}</Badge>)}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">주요 발견사항</div>
                  <div className="space-y-2">
                    {selected.findings.map(finding => (
                      <div key={finding} className="flex items-start gap-2 rounded-xs border border-amber-700/30 bg-amber-500/5 p-3">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-ink-300 leading-5">{finding}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">보고서</div>
                  {selected.report ? (
                    <div className="flex items-center justify-between rounded-xs border border-ink-700/60 bg-ink-900/30 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-accent-500 shrink-0" />
                        <span className="text-xs text-ink-200 truncate">{selected.report}</span>
                      </div>
                      <Badge tone="ok">등록됨</Badge>
                    </div>
                  ) : (
                    <button className="w-full rounded-xs border border-dashed border-ink-700 px-3 py-3 text-xs text-ink-400 hover:bg-ink-800/40">
                      <Upload className="inline w-3.5 h-3.5 mr-1" />
                      보고서 업로드
                    </button>
                  )}
                </div>
              </div>
            </Card>

            <Card title="개선조치 CAPA" subtitle="담당자와 마감일이 있는 실행 항목">
              <div className="space-y-2">
                {selected.capa.length > 0 ? selected.capa.map(item => (
                  <div key={item.task} className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-ink-100">{item.task}</div>
                        <div className="text-[11px] text-ink-500 mt-1">{item.owner} · {item.due}</div>
                      </div>
                      <Badge tone={item.status === '완료' ? 'ok' : item.status === '미조치' ? 'alert' : 'warn'}>{item.status}</Badge>
                    </div>
                  </div>
                )) : (
                  <div className="flex items-center gap-2 rounded-xs border border-emerald-700/30 bg-emerald-500/5 p-3 text-xs text-ink-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    등록된 개선조치가 없습니다.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: 'neutral' | 'ok' | 'warn' | 'alert' }) {
  return <TopStatCard label={label} value={value} unit={unit} tone={tone} />;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-2">
      <div className="text-[10px] text-ink-500">{label}</div>
      <div className="text-xs font-semibold text-ink-100 mt-1 truncate">{value}</div>
    </div>
  );
}
