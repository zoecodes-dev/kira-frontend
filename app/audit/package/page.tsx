'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import TopStatCard from '@/components/TopStatCard';
import { auditTrail } from '@/lib/data';
import { CheckCircle2, Download, FileArchive, FileText, LockKeyhole, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

const packages = [
  { id: 'AP-2026-001', target: 'LOT-NCM-240514-A', type: '배치 처리 감사', status: 'ready', evidence: 18, gaps: 0, owner: '감사팀 정유진' },
  { id: 'AP-2026-002', target: 'SN-2026-A1-082451', type: 'FEOC 보류 감사', status: 'gap', evidence: 11, gaps: 3, owner: '컴플라이언스 이서윤' },
  { id: 'AP-2026-003', target: 'S-MINE-002', type: '인권 실사 감사', status: 'collecting', evidence: 9, gaps: 2, owner: '구매실사 최하린' },
];

const checklist = [
  { label: '제출 원본 파일', done: true },
  { label: '자동 검증 로그', done: true },
  { label: 'HITL 판단 사유', done: false },
  { label: '리스크 조치 이력', done: true },
  { label: '판정 결과 스냅샷', done: true },
  { label: '해시 체인 검증', done: true },
];

export default function AuditPackagePage() {
  const [selectedId, setSelectedId] = useState(packages[0].id);
  const selected = packages.find(item => item.id === selectedId) ?? packages[0];

  return (
    <>
      <PageHeader
        title="감사 패키지"
        description="외부 감사 대응을 위해 제출 자료, 판정, 조치, 발행 근거를 묶는 화면"
        badge="P2"
        actions={<button className="inline-flex items-center gap-2 rounded-xs border border-accent-700/40 px-3 py-2 text-xs font-semibold text-accent-500 hover:bg-accent-500/10"><Download className="w-3.5 h-3.5" />패키지 Export</button>}
      />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric label="패키지" value={packages.length} tone="neutral" />
          <Metric label="Export 가능" value={packages.filter(p => p.status === 'ready').length} tone="ok" />
          <Metric label="근거 누락" value={packages.reduce((s, p) => s + p.gaps, 0)} tone="warn" />
          <Metric label="감사 로그" value={auditTrail.length} tone="info" />
        </div>

        <div className="space-y-[14px]">
          <Card title="감사 패키지 목록" subtitle="제품, 배치, 협력사 기준 증거 묶음">
            <div className="space-y-2">
              {packages.map(pkg => (
                <button key={pkg.id} onClick={() => setSelectedId(pkg.id)} className={clsx('w-full rounded-xs border p-3 text-left transition-colors', selectedId === pkg.id ? 'border-accent-500/70 bg-accent-500/8' : 'border-ink-700/60 bg-ink-900/30 hover:bg-ink-800/40')}>
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="text-xs text-ink-500 num-mono">{pkg.id}</div><div className="text-sm font-semibold text-ink-100 mt-1">{pkg.type}</div><div className="text-[11px] text-ink-500">{pkg.target}</div></div>
                    <Badge tone={pkg.status === 'ready' ? 'ok' : pkg.status === 'gap' ? 'alert' : 'warn'}>{pkg.status}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2"><Mini label="증거" value={`${pkg.evidence}건`} /><Mini label="누락" value={`${pkg.gaps}건`} /><Mini label="담당" value={pkg.owner} /></div>
                </button>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card title={selected.type} subtitle={`${selected.id} · ${selected.target}`} action={<Badge tone={selected.gaps === 0 ? 'ok' : 'warn'}>{selected.gaps === 0 ? '완성' : '보완 필요'}</Badge>}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                <Mini label="대상" value={selected.target} />
                <Mini label="담당자" value={selected.owner} />
                <Mini label="증거 수" value={`${selected.evidence}건`} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {checklist.map(item => (
                  <div key={item.label} className="flex items-center justify-between rounded-xs border border-ink-700/60 bg-ink-900/30 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-ink-200">{item.done ? <CheckCircle2 className="w-3.5 h-3.5 text-ok-text" /> : <FileText className="w-3.5 h-3.5 text-warn-text" />}{item.label}</div>
                    <Badge tone={item.done ? 'ok' : 'warn'}>{item.done ? '포함' : '누락'}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="감사 해시 체인" subtitle="Provenance 로그 일부">
              <div className="space-y-2">
                {auditTrail.slice(0, 4).map(entry => (
                  <div key={entry.step} className="flex items-center gap-3 rounded-xs border border-ink-700/60 bg-ink-900/30 px-3 py-2">
                    <div className="w-7 h-7 rounded-full border border-ink-700 flex items-center justify-center text-[11px] text-accent-500 num-mono">{entry.step}</div>
                    <div className="min-w-0 flex-1"><div className="text-xs font-semibold text-ink-100">{entry.nodeName}</div><div className="text-[10px] text-ink-500 truncate">{entry.inputHash} → {entry.outputHash}</div></div>
                    <ShieldCheck className="w-3.5 h-3.5 text-ok-text" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'ok' | 'warn' | 'info' }) {
  return <TopStatCard label={label} value={value} unit="건" tone={tone} />;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-2"><div className="text-[10px] text-ink-500">{label}</div><div className="text-xs font-semibold text-ink-100 mt-1 truncate">{value}</div></div>;
}
