'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import {
  parts, purchaseOrders, getSupplierName, getFactories,
} from '@/lib/supplier-detail-data';
import { ArrowRight, Atom, FileText, FlaskConical, Upload } from 'lucide-react';
import clsx from 'clsx';

const materialProfiles = [
  {
    partId: 'PRT-005',
    status: 'compliant',
    source: 'manual + OCR',
    components: [
      { name: 'Nickel', ratio: 80, origin: 'PH/KR', recycled: 7 },
      { name: 'Manganese', ratio: 10, origin: 'KR', recycled: 4 },
      { name: 'Cobalt', ratio: 10, origin: 'CD/CN', recycled: 3 },
    ],
    evidence: ['MSDS_NCM811_2026.pdf', 'CoA_POS_260415.pdf', 'Recycled_content_report.pdf'],
    regulations: [
      { code: 'EU_BATTERY', result: 'pass', reason: '재활용 함량 증빙 제출' },
      { code: 'IRA', result: 'pass', reason: 'FEOC 직접 지분 없음' },
      { code: 'CONFLICT_MINERALS', result: 'review', reason: '코발트 원산지 추가 확인 필요' },
    ],
  },
  {
    partId: 'PRT-007',
    status: 'needs_review',
    source: 'supplier manual',
    components: [
      { name: 'Nickel sulfate', ratio: 55, origin: 'CN', recycled: 0 },
      { name: 'Cobalt sulfate', ratio: 21, origin: 'CD/CN', recycled: 0 },
      { name: 'Manganese sulfate', ratio: 24, origin: 'CN', recycled: 0 },
    ],
    evidence: ['Precursor_composition_QZ.xlsx'],
    regulations: [
      { code: 'IRA', result: 'review', reason: 'FEOC 지분 구조 검토 필요' },
      { code: 'UFLPA', result: 'review', reason: '원료 추적 보고서 미제출' },
      { code: 'CRMA', result: 'warning', reason: '중국 공급 의존도 높음' },
    ],
  },
  {
    partId: 'PRT-008',
    status: 'compliant',
    source: 'manual + external',
    components: [
      { name: 'Nickel ore', ratio: 96, origin: 'PH', recycled: 0 },
      { name: 'Moisture/impurity', ratio: 4, origin: 'PH', recycled: 0 },
    ],
    evidence: ['Nickel_mine_origin_PH.pdf', 'Mine_boundary_coordinates.geojson'],
    regulations: [
      { code: 'EU_BATTERY', result: 'pass', reason: '광산 좌표 제출' },
      { code: 'EUDR', result: 'pass', reason: '산림 훼손 고위험 좌표 아님' },
    ],
  },
  {
    partId: 'PRT-009',
    status: 'violation_risk',
    source: 'OCR',
    components: [
      { name: 'Cobalt ore', ratio: 92, origin: 'CD', recycled: 0 },
      { name: 'Copper/Nickel trace', ratio: 8, origin: 'CD', recycled: 0 },
    ],
    evidence: ['Cobalt_origin_certificate_scan.pdf'],
    regulations: [
      { code: 'CONFLICT_MINERALS', result: 'warning', reason: '분쟁광물 증빙 보완 필요' },
      { code: 'CSDDD', result: 'review', reason: '아동노동 감사 보고서 미제출' },
      { code: 'EU_BATTERY', result: 'review', reason: '공급망 실사 문서 부족' },
    ],
  },
  {
    partId: 'PRT-010',
    status: 'compliant',
    source: 'system',
    components: [
      { name: 'Lithium hydroxide', ratio: 98, origin: 'AU', recycled: 2 },
      { name: 'Moisture/impurity', ratio: 2, origin: 'AU', recycled: 0 },
    ],
    evidence: ['LiOH_CoA_Pilbara.pdf', 'LCA_scope3_report.pdf'],
    regulations: [
      { code: 'EU_BATTERY', result: 'pass', reason: '탄소·원산지 증빙 제출' },
      { code: 'CRMA', result: 'pass', reason: '호주 원산지 확인' },
    ],
  },
];

const statusMeta = {
  compliant: { label: '적합', tone: 'ok' as const },
  needs_review: { label: '검토 필요', tone: 'warn' as const },
  violation_risk: { label: '위반 의심', tone: 'alert' as const },
};

const resultTone = {
  pass: 'ok',
  warning: 'warn',
  review: 'info',
  violation: 'alert',
} as const;

export default function MaterialsPage() {
  const [selectedPartId, setSelectedPartId] = useState(materialProfiles[0].partId);
  const selected = materialProfiles.find(item => item.partId === selectedPartId) ?? materialProfiles[0];
  const selectedPart = parts.find(part => part.id === selected.partId);
  const relatedPOs = purchaseOrders.filter(po => po.partId === selected.partId);

  const stats = useMemo(() => ({
    total: materialProfiles.length,
    compliant: materialProfiles.filter(item => item.status === 'compliant').length,
    review: materialProfiles.filter(item => item.status === 'needs_review').length,
    risk: materialProfiles.filter(item => item.status === 'violation_risk').length,
  }), []);

  return (
    <>
      <PageHeader
        title="물질 관리"
        description="납품 자재의 물질 조성, 인증 평가, 원산지, 규제 적합성을 관리하는 화면"
        badge="P0"
      />

      <div className="p-8 space-y-7">
        <div className="rounded-sm border border-ink-700 bg-white shadow-control px-5 py-4">
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-sm font-semibold text-ink-100">자재 규제 데이터 운영 현황</div>
              <div className="text-xs text-ink-500 mt-1">자재 목록에서 항목을 선택하면 조성, 규제 판정, 증빙과 관련 PO를 한 화면에서 확인합니다</div>
            </div>
            <div className="grid grid-cols-4 gap-6 shrink-0">
              <Metric label="관리 자재" value={stats.total} unit="개" tone="neutral" />
              <Metric label="적합" value={stats.compliant} unit="개" tone="ok" />
              <Metric label="검토 필요" value={stats.review} unit="개" tone="warn" />
              <Metric label="위반 의심" value={stats.risk} unit="개" tone="alert" />
            </div>
          </div>
        </div>

        <section className="rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="flex items-center justify-between gap-4 border-b border-ink-700 px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold text-ink-100">선택 자재 규제 요약</h2>
              <p className="text-xs text-ink-500 mt-0.5">적용 여부와 검토 사유를 가벼운 상태 라인으로 표시합니다</p>
            </div>
            <Badge tone={statusMeta[selected.status].tone}>{statusMeta[selected.status].label}</Badge>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-ink-700">
            {['EU_BATTERY', 'IRA', 'UFLPA', 'CONFLICT_MINERALS', 'CRMA'].map(code => {
              const related = selected.regulations.find(item => item.code === code);
              return (
                <div key={code} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-semibold text-ink-300 num-mono">{code}</div>
                    <Badge tone={related ? resultTone[related.result as keyof typeof resultTone] : 'neutral'}>
                      {related ? related.result : 'not applied'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-ink-500 mt-2 leading-5">{related?.reason ?? '현재 자재에는 직접 적용되지 않음'}</div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
          <section className="rounded-sm border border-ink-700 bg-white shadow-control overflow-hidden">
            <div className="px-5 py-4 border-b border-ink-700">
              <h2 className="text-sm font-semibold text-ink-100">자재 목록</h2>
              <p className="text-xs text-ink-500 mt-1">제품/BOM/부품 기준 관리</p>
            </div>
            <div className="divide-y divide-ink-700">
              {materialProfiles.map(profile => {
                const part = parts.find(item => item.id === profile.partId);
                const poCount = purchaseOrders.filter(po => po.partId === profile.partId).length;
                const active = selectedPartId === profile.partId;
                return (
                  <button
                    key={profile.partId}
                    onClick={() => setSelectedPartId(profile.partId)}
                    className={clsx(
                      'w-full px-5 py-4 text-left transition-colors',
                      active ? 'bg-accent-50' : 'bg-white hover:bg-ink-800',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={clsx('h-2 w-2 rounded-full shrink-0',
                            profile.status === 'compliant' ? 'bg-signal-ok' :
                            profile.status === 'needs_review' ? 'bg-signal-warn' : 'bg-signal-alert',
                          )} />
                          <div className="text-sm font-semibold text-ink-100 truncate">{part?.partName ?? profile.partId}</div>
                        </div>
                        <div className="mt-1 text-[11px] text-ink-500 truncate">{part?.partCode} · HS {part?.hsCode}</div>
                      </div>
                      <ArrowRight className={clsx('w-4 h-4 mt-0.5 shrink-0', active ? 'text-accent-700' : 'text-ink-600')} />
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-500">
                      <span>{profile.source}</span>
                      <span className="divider-dot">{profile.evidence.length} 증빙</span>
                      <span className="divider-dot">{poCount} PO</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-sm border border-ink-700 bg-white shadow-panel">
              <div className="px-6 py-5 border-b border-ink-700">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-ink-500 num-mono">
                      <FlaskConical className="w-3.5 h-3.5" />
                      {selectedPart?.partCode ?? selected.partId}
                    </div>
                    <h2 className="text-xl font-semibold text-ink-100 mt-2">{selectedPart?.partName ?? selected.partId}</h2>
                    <p className="text-xs text-ink-500 mt-1">{selectedPart?.materialType ?? '자재'} · 데이터 원천 {selected.source}</p>
                  </div>
                  <Badge tone={statusMeta[selected.status].tone} size="md">{statusMeta[selected.status].label}</Badge>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-6 border-t border-ink-700 pt-4">
                  <InlineMeta label="HS Code" value={selectedPart?.hsCode ?? '-'} />
                  <InlineMeta label="구매 단위" value={selectedPart?.purchaseUnit ?? '-'} />
                  <InlineMeta label="관련 PO" value={`${relatedPOs.length}건`} />
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-ink-100">물질 조성</h3>
                  <span className="text-xs text-ink-500">{selected.components.length}개 구성 성분</span>
                </div>
                <div className="space-y-4">
                  {selected.components.map(component => (
                    <div key={component.name}>
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Atom className="w-3.5 h-3.5 text-accent-700 shrink-0" />
                          <div className="text-sm font-semibold text-ink-100 truncate">{component.name}</div>
                          <div className="text-[11px] text-ink-500">원산지 {component.origin}</div>
                        </div>
                        <div className="text-sm font-bold text-ink-100 num-mono">{component.ratio}%</div>
                      </div>
                      <div className="h-2 rounded-full bg-ink-800 overflow-hidden">
                        <div className="h-full bg-accent-600 rounded-full" style={{ width: `${component.ratio}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] text-ink-500">재활용 함량 {component.recycled}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SupportPanel title="업로드 증빙" subtitle="물질 조성·MSDS·CoA·시험성적서">
                <div className="divide-y divide-ink-700">
                  {selected.evidence.map(file => (
                    <div key={file} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-accent-700 shrink-0" />
                        <span className="text-xs text-ink-200 truncate">{file}</span>
                      </div>
                      <Badge tone="ok">검토 가능</Badge>
                    </div>
                  ))}
                </div>
                <button className="mt-3 inline-flex items-center gap-1.5 rounded-xs border border-dashed border-ink-600 px-3 py-2 text-xs font-semibold text-ink-400 hover:text-ink-100 hover:bg-ink-800 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  증빙 추가 업로드
                </button>
              </SupportPanel>

              <SupportPanel title="관련 PO·협력사" subtitle="승인 결과가 반영될 납품 관계">
                <div className="divide-y divide-ink-700">
                  {relatedPOs.map(po => {
                    const supplier = getSupplierName(po.supplierId);
                    const factory = getFactories(po.supplierId).find(f => f.factoryId === po.factoryId);
                    return (
                      <div key={po.poId} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-semibold text-ink-100 num-mono">{po.poId}</div>
                          <Badge tone={po.status === 'verified' ? 'ok' : po.status === 'pending' ? 'warn' : 'info'}>{po.status}</Badge>
                        </div>
                        <div className="text-[11px] text-ink-400 mt-1 truncate">{supplier?.nameEn ?? po.supplierId}</div>
                        <div className="text-[10px] text-ink-500 mt-1 truncate">{factory?.factoryName ?? po.factoryId} · {po.quantity.toLocaleString()} {po.unit}</div>
                      </div>
                    );
                  })}
                </div>
              </SupportPanel>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: 'neutral' | 'ok' | 'warn' | 'alert' }) {
  const color = {
    neutral: 'text-ink-200',
    ok: 'text-emerald-400',
    warn: 'text-amber-400',
    alert: 'text-red-400',
  }[tone];
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className={clsx('text-xl font-bold num-mono mt-1', color)}>{value}<span className="text-xs text-ink-500 ml-1">{unit}</span></div>
    </div>
  );
}

function InlineMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className="text-sm font-semibold text-ink-100 mt-1 truncate">{value}</div>
    </div>
  );
}

function SupportPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-ink-700 bg-white shadow-control px-5 py-4">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-ink-100">{title}</h3>
        <p className="text-xs text-ink-500 mt-1">{subtitle}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}
