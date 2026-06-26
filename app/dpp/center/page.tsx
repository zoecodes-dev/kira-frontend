'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import clsx from 'clsx';
import {
  ChevronRight, FileBadge, FileSearch,
  ShieldAlert, UserCheck, X, BookOpen,
} from 'lucide-react';
import { dppRecords, type DPP } from '@/lib/data';

// ── Types ────────────────────────────────────────────────────────────
type BlockerKey = 'feoc' | 'origin' | 'hitl' | 'audit';
type DppTab = 'status' | 'reg' | 'hitl' | 'history';

interface HeldProduct {
  id: string; name: string; customer: string; model: string;
  readiness: number; blockerKey: BlockerKey; updatedAt: string;
}
interface HitlProduct {
  id: string; name: string; supplier: string; issue: string;
  confidence: number; requestedAt: string;
}
interface IssuedRecord { id: string; name: string; stage: string; issuedAt: string; }

// ── Static data ──────────────────────────────────────────────────────
const blockerMeta: Record<BlockerKey, {
  label: string; sub: string; color: string; barColor: string; icon: typeof FileSearch;
}> = {
  feoc:   { label: 'FEOC 조사 누락',    sub: 'EU 배터리 규정 2031 기준 미충족',     color: 'text-alert-text',    barColor: 'bg-alert-solid',    icon: FileSearch },
  origin: { label: '원산지 정보 미완료', sub: '공급 원산지 및 레퍼런스 정보 누락',   color: 'text-warn-text', barColor: 'bg-warn-solid', icon: ShieldAlert },
  hitl:   { label: 'HITL 검토 대기',    sub: 'AI 신뢰도 부족으로 사람 검토 필요',   color: 'text-info-text', barColor: 'bg-info-solid', icon: UserCheck },
  audit:  { label: '실사 평가 미제출',   sub: '공급망 실사 평가 미제출 또는 미통과',  color: 'text-warn-text',  barColor: 'bg-warn-solid',  icon: FileBadge },
};

const blockerCounts: Record<BlockerKey, number> = { feoc: 13, origin: 9, hitl: 7, audit: 6 };
const maxBlockerCount = Math.max(...Object.values(blockerCounts));
const totalBlockers   = Object.values(blockerCounts).reduce((a, b) => a + b, 0);

const heldProducts: HeldProduct[] = [
  { id: 'MB-GLC-94',      name: 'Mercedes GLC EV Prismatic NCM 94Ah', customer: 'Mercedes', model: 'GCE V',        readiness: 58, blockerKey: 'feoc',   updatedAt: '2026-06-10' },
  { id: 'HN-AUDIT',       name: 'High-Nickel Cell Audit Package',      customer: 'Internal', model: 'Audit pack',   readiness: 82, blockerKey: 'audit',  updatedAt: '2026-06-10' },
  { id: 'CAM-ORIGIN',     name: 'Cathode Material Origin Set',          customer: 'BMW',      model: 'CAM set',     readiness: 76, blockerKey: 'origin', updatedAt: '2026-06-09' },
  { id: 'POUCH-NMC-811',  name: 'Pouch Cell NMC 811 100Ah',            customer: 'BMW',      model: 'Cell',        readiness: 64, blockerKey: 'hitl',   updatedAt: '2026-06-09' },
  { id: 'AL-FOIL',        name: 'Aluminum Foil Supplier Pack',          customer: 'Supplier', model: 'Raw material', readiness: 45, blockerKey: 'feoc',   updatedAt: '2026-06-08' },
];

const hitlProducts: HitlProduct[] = [
  { id: 'BMW-I4',   name: 'BMW i4 Prismatic NCM 81Ah',  supplier: 'Dalsung Precision', issue: '전구체 데이터, AI 신뢰도 임계치 미달', confidence: 78, requestedAt: '2026-06-10' },
  { id: 'MB-EQS',  name: 'Mercedes EQS NCM 118Ah',      supplier: 'Global Mining',     issue: 'CoO 원산지 증빙 AI 판독 오류',        confidence: 62, requestedAt: '2026-06-09' },
];

const recentIssued: IssuedRecord[] = [
  { id: 'DPP-TX3-20260611', name: 'BMW iX3 Cylindrical NCM811 108Ah', stage: 'Cell Mfg', issuedAt: '2026-06-11 09:30' },
  { id: 'DPP-TX3-20260610', name: 'BMW X5 Prismatic NCM811 94Ah',     stage: 'Cell Mfg', issuedAt: '2026-06-10 16:45' },
  { id: 'DPP-TX3-20260610', name: 'Standard NCA 80Ah',                 stage: 'Cell Mfg', issuedAt: '2026-06-10 11:20' },
  { id: 'DPP-TX3-20260609', name: 'Mercedes EQS Prismatic NCM 118Ah', stage: 'Cell Mfg', issuedAt: '2026-06-09 14:10' },
  { id: 'DPP-TX3-20260609', name: 'LFP Power 120Ah Export Pack',       stage: 'Pack Mfg', issuedAt: '2026-06-09 10:05' },
];

const cfTrend = {
  labels: ['06-05', '06-06', '06-07', '06-08', '06-09', '06-10', '06-11'],
  series: [
    { name: 'Standard NCA 80Ah', color: '#ef4444', data: [88.2, 92.1, 85.7, 91.4, 87.3, 90.8, 91.7] },
    { name: 'LFP Power 120Ah',   color: '#10b981', data: [69.4, 65.2, 71.8, 66.9, 73.1, 68.4, 67.2] },
  ],
};

// ── Page ─────────────────────────────────────────────────────────────
export default function DppCenterPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<DppTab>('status');

  const cfValues    = dppRecords.map(r => r.carbonFootprint);
  const cfAvg       = +(cfValues.reduce((a, b) => a + b, 0) / cfValues.length).toFixed(1);
  const cfMax       = Math.max(...cfValues);
  const cfMin       = Math.min(...cfValues);
  const ncmDpps     = dppRecords.filter(r => r.recycledContent.Co > 0);
  const coAvg       = +(ncmDpps.reduce((s, r) => s + r.recycledContent.Co, 0) / ncmDpps.length).toFixed(1);
  const niAvg       = +(ncmDpps.reduce((s, r) => s + r.recycledContent.Ni, 0) / ncmDpps.length).toFixed(1);
  const liAvg       = +(dppRecords.reduce((s, r) => s + r.recycledContent.Li, 0) / dppRecords.length).toFixed(1);
  const borderlineCo = ncmDpps.filter(r => r.recycledContent.Co <= 16);

  return (
    <>
      <PageHeader
        title="DPP Center"
        description="DPP 발행 현황을 한눈에 확인하고 문제 제품의 상세 분석 화면으로 이동합니다."
        badge="Control Center"
        tabs={[
          { label: '발행 현황', active: tab === 'status', onClick: () => setTab('status') },
          { label: '규제 지표', active: tab === 'reg', onClick: () => setTab('reg') },
          { label: 'HITL', active: tab === 'hitl', onClick: () => setTab('hitl') },
          { label: '발행 이력', active: tab === 'history', onClick: () => setTab('history') },
        ]}
      />

      <div className="p-8 space-y-6">
        {/* 발행 현황 — 발행 보류 제품 · 발행 지연 원인 (세로 스택) */}
        {tab === 'status' && (
        <section className="space-y-[14px]">
          {/* 발행 보류 제품 */}
          <div className="min-w-0 overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <PanelHeader title="발행 보류 제품" count="23건" sub="Readiness가 낮거나 핵심 증빙이 누락된 제품입니다.">
              <ActionBtn onClick={() => setModalOpen(true)}>전체 보기</ActionBtn>
            </PanelHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead>
                  <tr className="border-b border-ink-700 bg-ink-900/30">
                    {['제품명', 'Readiness', '주요 Blocker', '최근 업데이트'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[13px] font-bold text-ink-500">{h}</th>
                    ))}
                    <th className="w-8 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {heldProducts.map(p => {
                    const m = blockerMeta[p.blockerKey];
                    return (
                      <tr key={p.id} className="border-b border-ink-700/60 cursor-pointer hover:bg-ink-900/20" onClick={() => window.location.href = '/dpp/readiness'}>
                        <td className="px-5 py-3.5">
                          <div className="text-[13px] font-semibold text-ink-100">{p.name}</div>
                          <div className="text-[12px] text-ink-500 mt-0.5">{p.customer} · {p.model}</div>
                        </td>
                        <td className="px-5 py-3.5"><ReadinessBar value={p.readiness} /></td>
                        <td className="px-5 py-3.5">
                          <span className={clsx('text-[13px] font-semibold', m.color)}>{m.label}</span>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] num-mono text-ink-500">{p.updatedAt}</td>
                        <td className="px-2 py-3.5"><ChevronRight className="h-4 w-4 text-ink-500" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-ink-700/40 px-5 py-3">
              <button className="text-[13px] font-semibold text-accent-700 hover:underline">+ 18건 더보기</button>
            </div>
          </div>

          {/* 발행 지연 원인 */}
          <div className="min-w-0 overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <PanelHeader title="발행 지연 원인" count="4건" sub="발행 지연의 주요 원인과 영향을 확인할 수 있습니다.">
              <ActionBtn onClick={() => setModalOpen(true)}>전체 보기</ActionBtn>
            </PanelHeader>
            <div className="divide-y divide-ink-700/40">
              {(Object.keys(blockerMeta) as BlockerKey[]).map(key => {
                const m = blockerMeta[key];
                const Icon = m.icon;
                const cnt = blockerCounts[key];
                const pct = Math.round((cnt / totalBlockers) * 100);
                return (
                  <button key={key} onClick={() => setModalOpen(true)} className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-ink-900/20">
                    <Icon className={clsx('h-5 w-5 shrink-0 mt-0.5', m.color)} />
                    <div className="min-w-0 flex-1">
                      <div className={clsx('text-[13px] font-semibold', m.color)}>{m.label}</div>
                      <div className="text-[11px] text-ink-500 mt-0.5">{m.sub}</div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-700/20">
                        <div className={clsx('h-full rounded-full', m.barColor)} style={{ width: `${(cnt / maxBlockerCount) * 100}%` }} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={clsx('text-[13px] font-semibold num-mono', m.color)}>{cnt}건</div>
                      <div className="text-[11px] text-ink-500 num-mono">{pct}%</div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-500 mt-0.5" />
                  </button>
                );
              })}
            </div>
            <div className="border-t border-ink-700/40 p-4">
              <button className="flex w-full items-center justify-center gap-2 rounded-sm border border-accent-600/30 bg-accent-50 px-4 py-2.5 text-[13px] font-semibold text-accent-700 hover:bg-accent-100">
                <BookOpen className="h-4 w-4" />
                모든 Blocker 해결 가이드 보기
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
        )}

        {/* 규제 지표 — 탄소발자국 · 재활용 함량 (세로 스택) */}
        {tab === 'reg' && (
        <section className="space-y-[14px]">
          {/* 탄소발자국 */}
          <div className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between gap-4 border-b border-ink-700 px-5 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-ink-100">탄소발자국 현황</h2>
                <span className="text-[12px] text-ink-500">Unit: kgCO₂e / kWh</span>
              </div>
              <button className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent-700 hover:underline">
                상세 분석 <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <CfStat label="평균" value={cfAvg} tone="neutral" />
                <CfStat label="최고" value={cfMax} tone="alert" />
                <CfStat label="최저" value={cfMin} tone="ok" />
              </div>
              <div className="mb-2 flex items-center gap-4">
                {cfTrend.series.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[11px] text-ink-500">{s.name}</span>
                  </div>
                ))}
              </div>
              <LineChart labels={cfTrend.labels} series={cfTrend.series} />
            </div>
          </div>

          {/* 재활용 함량 */}
          <div className="overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between gap-4 border-b border-ink-700 px-5 py-4">
              <div>
                <h2 className="text-[16px] font-semibold text-ink-100">재활용 함량 현황</h2>
                <p className="mt-1 text-[13px] font-medium text-ink-500">EU 배터리 규정 2031년 기준 대비 · NCM/NCA 기준</p>
              </div>
              <button className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent-700 hover:underline whitespace-nowrap">
                상세 분석 <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <RecycledBar metal="Co" label="코발트" avg={coAvg} threshold={16} maxScale={28} />
              <RecycledBar metal="Ni" label="니켈"   avg={niAvg} threshold={6}  maxScale={14} />
              <RecycledBar metal="Li" label="리튬"   avg={liAvg} threshold={6}  maxScale={14} />
              {borderlineCo.length > 0 && (
                <div className="rounded-xs border border-warn-border bg-warn-bg px-3 py-2 text-[13px] text-warn-text">
                  ⚠ {borderlineCo.map(r => r.modelName).join(', ')} – Co 함량이 EU 2031 기준(16%)에 근접
                </div>
              )}
              <p className="text-[11px] text-ink-500">* LFP 전지는 Co·Ni 미사용으로 함량 산정에서 제외</p>
            </div>
          </div>
        </section>
        )}

        {/* HITL 검토 대기 */}
        {tab === 'hitl' && (
        <section className="min-w-0">
          <div className="min-w-0 overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <PanelHeader title="HITL 검토 대기" count="7건" sub="AI 신뢰도가 낮아 사람 검토가 필요한 항목입니다.">
              <Link href="/hitl" className="inline-flex items-center gap-1.5 rounded-sm border border-ink-700 bg-white px-3 py-2 text-[13px] font-semibold text-ink-300 hover:border-accent-600 hover:text-accent-700 whitespace-nowrap">
                전체 HITL 보기 <ChevronRight className="h-4 w-4" />
              </Link>
            </PanelHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-ink-700 bg-ink-900/30">
                    {['제품명', '검토 이슈', 'AI 신뢰도', '요청일'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[13px] font-bold text-ink-500">{h}</th>
                    ))}
                    <th className="w-8 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {hitlProducts.map(p => (
                    <tr key={p.id} className="border-b border-ink-700/60 cursor-pointer hover:bg-ink-900/20" onClick={() => window.location.href = '/hitl'}>
                      <td className="px-5 py-3.5">
                        <div className="text-[13px] font-semibold text-ink-100">{p.name}</div>
                        <div className="text-[12px] text-ink-500 mt-0.5">{p.supplier}</div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-ink-400">{p.issue}</td>
                      <td className="px-5 py-3.5"><ReadinessBar value={p.confidence} warn /></td>
                      <td className="px-5 py-3.5 text-[13px] num-mono text-ink-500">{p.requestedAt}</td>
                      <td className="px-2 py-3.5"><ChevronRight className="h-4 w-4 text-ink-500" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        )}

        {/* 발행 이력 — 최근 발행된 DPP */}
        {tab === 'history' && (
        <section className="min-w-0">
          <div className="min-w-0 overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
            <PanelHeader title="최근 발행 이력" count="8건" sub="최근 7일간 발행된 DPP를 빠르게 열람합니다.">
              <select className="rounded-sm border border-ink-700 bg-white px-3 py-2 text-[13px] font-semibold text-ink-300 outline-none hover:border-accent-600" defaultValue="7">
                <option value="7">7일</option>
                <option value="14">14일</option>
                <option value="30">30일</option>
              </select>
            </PanelHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-ink-700 bg-ink-900/30">
                    {['DPP ID', '공급망 단계', '발행일', '상태'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[13px] font-bold text-ink-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentIssued.map((r, i) => (
                    <tr key={i} className="border-b border-ink-700/60 cursor-pointer hover:bg-ink-900/20" onClick={() => window.location.href = '/dpp'}>
                      <td className="px-5 py-3.5">
                        <div className="text-[13px] font-semibold text-accent-700 num-mono">{r.id}</div>
                        <div className="text-[12px] text-ink-500 mt-0.5">{r.name}</div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-ink-400">{r.stage}</td>
                      <td className="px-5 py-3.5 text-[13px] num-mono text-ink-500">{r.issuedAt}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-[13px] font-semibold text-ok-text">발행 완료</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-ink-700/40 p-4">
              <Link href="/dpp" className="flex w-full items-center justify-center gap-2 rounded-sm border border-ink-700 bg-white px-4 py-3 text-[13px] font-semibold text-ink-300 hover:border-accent-600 hover:text-accent-700">
                전체 발행 이력 보기 <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-100/45 p-6">
          <div className="w-full max-w-sm overflow-hidden rounded-sm border border-ink-700 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
              <h2 className="text-[16px] font-semibold text-ink-100">제품 목록</h2>
              <button onClick={() => setModalOpen(false)} className="rounded-sm p-1.5 text-ink-500 hover:bg-ink-800 hover:text-ink-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 text-[13px] text-ink-500">선택한 조건의 전체 제품 목록을 표시합니다.</div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Helper components ─────────────────────────────────────────────────
function PanelHeader({ title, count, sub, children }: {
  title: string; count: string; sub: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-semibold text-ink-100">{title}</h2>
          <span className="rounded-full bg-accent-50 px-2.5 py-1 text-[13px] font-semibold text-accent-800">{count}</span>
        </div>
        <p className="mt-1 text-[13px] font-medium text-ink-500">{sub}</p>
      </div>
      {children}
    </div>
  );
}

function ActionBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-sm border border-ink-700 bg-white px-3 py-2 text-[13px] font-semibold text-ink-300 hover:border-accent-600 hover:text-accent-700 whitespace-nowrap">
      {children} <ChevronRight className="h-4 w-4" />
    </button>
  );
}

function ReadinessBar({ value, warn = false }: { value: number; warn?: boolean }) {
  const color = warn
    ? value < 70 ? 'bg-alert-solid' : 'bg-warn-solid'
    : value < 75 ? 'bg-warn-solid' : value < 90 ? 'bg-warn-solid' : 'bg-ok-solid';
  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <span className="num-mono w-10 shrink-0 text-[13px] font-semibold text-ink-100">{value}%</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-700/20">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function CfStat({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'alert' | 'ok' }) {
  const vCls = { neutral: 'text-ink-100', alert: 'text-alert-text', ok: 'text-ok-text' }[tone];
  const bg   = { neutral: 'border-slate-200 bg-slate-50', alert: 'border-alert-border bg-alert-bg', ok: 'border-ok-border bg-ok-bg' }[tone];
  return (
    <div className={clsx('rounded-xs border p-3 text-center', bg)}>
      <div className="text-[11px] font-semibold text-ink-500">{label}</div>
      <div className={clsx('mt-1 text-[20px] font-bold num-mono', vCls)}>{value}</div>
      <div className="text-[10px] text-ink-500">kgCO₂e</div>
    </div>
  );
}

function LineChart({ labels, series }: {
  labels: string[];
  series: Array<{ name: string; color: string; data: number[] }>;
}) {
  const W = 480, H = 130, padL = 32, padR = 16, padT = 8, padB = 28;
  const cW = W - padL - padR, cH = H - padT - padB;
  const yMin = 40, yMax = 120;
  const toX = (i: number) => padL + (i / (labels.length - 1)) * cW;
  const toY = (v: number) => padT + cH - ((v - yMin) / (yMax - yMin)) * cH;
  const gridYs = [60, 80, 100, 120];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {gridYs.map(y => (
        <g key={y}>
          <line x1={padL} x2={W - padR} y1={toY(y)} y2={toY(y)} stroke="#e5e7eb" strokeWidth="1" />
          <text x={padL - 4} y={toY(y) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{y}</text>
        </g>
      ))}
      {labels.map((lbl, i) => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{lbl}</text>
      ))}
      {series.map(s => (
        <g key={s.name}>
          <polyline points={s.data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="1.5" strokeDasharray="5 3" />
          {s.data.map((v, i) => <circle key={i} cx={toX(i)} cy={toY(v)} r="3" fill={s.color} />)}
        </g>
      ))}
    </svg>
  );
}

function RecycledBar({ metal, label, avg, threshold, maxScale }: {
  metal: string; label: string; avg: number; threshold: number; maxScale: number;
}) {
  const avgPct       = Math.min(100, (avg / maxScale) * 100);
  const thresholdPct = (threshold / maxScale) * 100;
  const ok  = avg >= threshold;
  const diff = +(avg - threshold).toFixed(1);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 text-[12px] font-bold text-ink-300 num-mono">{metal}</span>
          <span className="text-[12px] text-ink-500">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx('text-[13px] font-bold num-mono', ok ? 'text-ok-text' : 'text-alert-text')}>{avg}%</span>
          <span className={clsx('text-[11px] font-semibold', ok ? 'text-ok-text' : 'text-alert-text')}>
            {diff >= 0 ? `+${diff}p` : `${diff}p`}
          </span>
        </div>
      </div>
      <div className="relative h-2.5 rounded-full bg-ink-700/15">
        <div className={clsx('h-full rounded-full', ok ? 'bg-ok-solid' : 'bg-alert-solid')} style={{ width: `${avgPct}%` }} />
        <div className="absolute top-[-3px] h-[20px] w-[2px] rounded-full bg-warn-solid" style={{ left: `${thresholdPct}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-ink-500" style={{ marginLeft: `calc(${thresholdPct}% - 10px)` }}>기준 {threshold}%</div>
    </div>
  );
}
