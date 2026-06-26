'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import { dppRecords } from '@/lib/data';
import ReadinessView from '@/components/dpp-center/ReadinessView';
import HitlView from '@/components/dpp-center/HitlView';
import HistoryView from '@/components/dpp-center/HistoryView';

// ── Types ────────────────────────────────────────────────────────────
type DppTab = 'status' | 'reg' | 'hitl' | 'history';
const DPP_TABS: DppTab[] = ['status', 'reg', 'hitl', 'history'];

// ── Static data (규제 지표 탭) ────────────────────────────────────────
const cfTrend = {
  labels: ['06-05', '06-06', '06-07', '06-08', '06-09', '06-10', '06-11'],
  series: [
    { name: 'Standard NCA 80Ah', color: '#ef4444', data: [88.2, 92.1, 85.7, 91.4, 87.3, 90.8, 91.7] },
    { name: 'LFP Power 120Ah',   color: '#10b981', data: [69.4, 65.2, 71.8, 66.9, 73.1, 68.4, 67.2] },
  ],
};

// ── Page ─────────────────────────────────────────────────────────────
export default function DppCenterPage() {
  const [tab, setTab] = useState<DppTab>('status');

  // URL ?tab 동기화 — 외부 링크(/dpp/center?tab=hitl 등)로 직접 진입 가능
  useEffect(() => {
    const sync = () => {
      const t = new URLSearchParams(window.location.search).get('tab') as DppTab | null;
      setTab(t && DPP_TABS.includes(t) ? t : 'status');
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const changeTab = (t: DppTab) => {
    setTab(t);
    if (typeof window === 'undefined') return;
    const url = t === 'status' ? '/dpp/center' : `/dpp/center?tab=${t}`;
    if (window.location.pathname + window.location.search !== url) {
      window.history.pushState({ tab: t }, '', url);
    }
  };

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
        description="DPP 발행 준비도·규제 지표·HITL·발행 이력을 한 화면에서 확인합니다."
        badge="Control Center"
        tabs={[
          { label: '발행 현황', active: tab === 'status', onClick: () => changeTab('status') },
          { label: '규제 지표', active: tab === 'reg', onClick: () => changeTab('reg') },
          { label: 'HITL', active: tab === 'hitl', onClick: () => changeTab('hitl') },
          { label: '발행 이력', active: tab === 'history', onClick: () => changeTab('history') },
        ]}
      />

      {/* 발행 현황 — DPP Readiness 흡수 */}
      {tab === 'status' && <ReadinessView />}

      {/* 규제 지표 — 탄소발자국 · 재활용 함량 */}
      {tab === 'reg' && (
      <div className="p-8 space-y-6">
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
      </div>
      )}

      {/* HITL — HITL 검토 흡수 */}
      {tab === 'hitl' && <HitlView />}

      {/* 발행 이력 — DPP 발행 이력 흡수 */}
      {tab === 'history' && <HistoryView />}
    </>
  );
}

// ── Helper components (규제 지표 탭) ──────────────────────────────────
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
