'use client';

import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import { dppRecords } from '@/lib/data';
import { FileBadge, Download, Eye, QrCode } from 'lucide-react';

export default function DppPage() {
  return (
    <>
      <PageHeader 
        title="DPP 발행 이력"
        description="배터리 디지털 제품 여권(Digital Product Passport) 발행 기록"
      />

      <div className="p-8 space-y-6">
        {/* 통계 */}
        <div className="grid grid-cols-4 gap-4">
          <SimpleStat label="이번 달 발행" value="142" unit="건" />
          <SimpleStat label="평균 탄소발자국" value="81.4" unit="kgCO₂eq" />
          <SimpleStat label="평균 재활용 함량" value="14.8" unit="%" />
          <SimpleStat label="EU 수출분" value="89" unit="건" tone="info" />
        </div>

        {/* 발행 이력 카드 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dppRecords.map(dpp => (
            <DppCard key={dpp.id} dpp={dpp} />
          ))}
        </div>
      </div>
    </>
  );
}

function SimpleStat({ label, value, unit, tone }: any) {
  return (
    <div className="rounded-sm border border-ink-700 bg-ink-800/40 p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-3xl font-semibold num-mono ${tone === 'info' ? 'text-blue-400' : 'text-ink-50'}`}>
          {value}
        </span>
        <span className="text-xs text-ink-400">{unit}</span>
      </div>
    </div>
  );
}

function DppCard({ dpp }: { dpp: any }) {
  return (
    <div className="rounded-sm border border-ink-700 bg-ink-800/40 overflow-hidden card-hover">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-ink-700 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileBadge className="w-4 h-4 text-accent-400" />
            <span className="text-sm font-semibold text-ink-50 num-mono">{dpp.id}</span>
            <Badge tone="ok" dot>발행 완료</Badge>
          </div>
          <p className="text-xs text-ink-300">{dpp.modelName}</p>
          <p className="text-[11px] text-ink-500 mt-0.5 num-mono">{dpp.productId}</p>
        </div>
        <Badge tone="neutral">→ {dpp.destination}</Badge>
      </div>

      {/* 본문 - 핵심 수치 */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="제조사" value={dpp.manufacturer} />
          <Field label="용량" value={dpp.capacity} mono />
        </div>

        {/* 탄소발자국 */}
        <div className="rounded-xs bg-ink-900/40 border border-ink-700/60 p-3">
          <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-1.5">탄소발자국</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold num-mono text-emerald-400">{dpp.carbonFootprint}</span>
            <span className="text-xs text-ink-400">kgCO₂eq / kWh</span>
          </div>
        </div>

        {/* 재활용 함량 */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">재활용 광물 함량</div>
          <div className="space-y-1.5">
            <RecycledBar metal="Co" label="코발트" value={dpp.recycledContent.Co} target={16} />
            <RecycledBar metal="Ni" label="니켈" value={dpp.recycledContent.Ni} target={6} />
            <RecycledBar metal="Li" label="리튬" value={dpp.recycledContent.Li} target={6} />
          </div>
        </div>

        {/* 푸터 */}
        <div className="pt-3 border-t border-ink-700/60 flex items-center justify-between">
          <div className="text-[11px] text-ink-400">
            <span className="num-mono">{dpp.issuedAt}</span>
            <span className="divider-dot" />
            <span>{dpp.approvedBy}</span>
          </div>
          <div className="flex items-center gap-1">
            <IconBtn icon={QrCode} />
            <IconBtn icon={Eye} />
            <IconBtn icon={Download} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: any) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-0.5">{label}</div>
      <div className={`text-xs text-ink-100 ${mono ? 'num-mono' : ''}`}>{value}</div>
    </div>
  );
}

function RecycledBar({ metal, label, value, target }: any) {
  const meetsTarget = value >= target;
  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className="w-7 num-mono text-ink-300 shrink-0">{metal}</span>
      <span className="w-12 text-ink-400 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-ink-700 rounded-xs overflow-hidden">
        <div 
          className={`h-full ${meetsTarget ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${Math.min(100, (value / target) * 100)}%` }}
        />
      </div>
      <span className={`num-mono w-16 text-right shrink-0 ${meetsTarget ? 'text-emerald-400' : 'text-amber-400'}`}>
        {value}% <span className="text-ink-500">/ {target}%</span>
      </span>
    </div>
  );
}

function IconBtn({ icon: Icon }: any) {
  return (
    <button className="w-7 h-7 rounded-xs hover:bg-ink-700 flex items-center justify-center transition-colors">
      <Icon className="w-3.5 h-3.5 text-ink-400" />
    </button>
  );
}
