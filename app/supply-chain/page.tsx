'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import SupplyChainMap from '@/components/SupplyChainMap';
import { suppliers, supplyEdges, Supplier } from '@/lib/data';
import { MapPin, Award, AlertCircle, TrendingUp, Layers, FileSearch } from 'lucide-react';

export default function SupplyChainPage() {
  const [selected, setSelected] = useState<Supplier | null>(null);

  // 통계
  const verifiedCount = suppliers.filter(s => s.status === 'verified').length;
  const violationCount = suppliers.filter(s => s.status === 'violation').length;
  const reviewCount = suppliers.filter(s => s.status === 'review').length;
  const pendingCount = suppliers.filter(s => s.status === 'pending').length;

  return (
    <>
      <PageHeader 
        title="공급망 맵"
        description="N차 협력사 추적 · 시연 데이터 10개사 (전체 운영: 187개사)"
        badge="시연용 샘플"
      />

      <div className="p-8 space-y-6">
        {/* 상단 통계 */}
        <div className="grid grid-cols-4 gap-4">
          <StatTile label="검증 완료" count={verifiedCount} total={suppliers.length} tone="ok" />
          <StatTile label="검토 대기" count={pendingCount} total={suppliers.length} tone="info" />
          <StatTile label="추가 확인 필요" count={reviewCount} total={suppliers.length} tone="warn" />
          <StatTile label="규제 위반" count={violationCount} total={suppliers.length} tone="alert" />
        </div>

        {/* 메인: 공급망 맵 + 상세 패널 */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <Card 
            className="xl:col-span-3" 
            title="공급망 추적도"
            subtitle="좌측(Tier 3 원자재) → 우측(Tier 1 셀 제조) 흐름"
            action={
              <div className="text-[11px] text-ink-400 num-mono">
                노드 {suppliers.length}개 · 연결 {supplyEdges.length}개
              </div>
            }
          >
            <SupplyChainMap onSelectNode={setSelected} selectedId={selected?.id} />
          </Card>

          {/* 우측 상세 패널 */}
          <Card 
            title={selected ? '협력사 상세' : '노드를 선택하세요'}
            subtitle={selected ? selected.id : '맵에서 협력사를 클릭하면 정보가 표시됩니다'}
            className="xl:col-span-1"
          >
            {selected ? <SupplierDetail supplier={selected} /> : <EmptyDetailState />}
          </Card>
        </div>

        {/* 하단: 협력사 테이블 */}
        <Card 
          title="협력사 목록"
          subtitle="시연용 10개사 전체"
        >
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink-400 border-b border-ink-700">
                  <th className="text-left font-medium px-5 py-3">협력사</th>
                  <th className="text-left font-medium px-3 py-3">Tier</th>
                  <th className="text-left font-medium px-3 py-3">역할</th>
                  <th className="text-left font-medium px-3 py-3">소재지</th>
                  <th className="text-right font-medium px-3 py-3">탄소집약도</th>
                  <th className="text-right font-medium px-3 py-3">FEOC 지분</th>
                  <th className="text-left font-medium px-3 py-3">상태</th>
                  <th className="text-right font-medium px-5 py-3">최근 검증</th>
                </tr>
              </thead>
              <tbody>
                {suppliers
                  .sort((a, b) => a.tier - b.tier)
                  .map(s => (
                  <tr 
                    key={s.id} 
                    className="border-b border-ink-700/40 hover:bg-ink-800/40 cursor-pointer"
                    onClick={() => setSelected(s)}
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-ink-100">{s.name}</div>
                      <div className="text-[10px] text-ink-500 num-mono">{s.id}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs num-mono px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-200">
                        T{s.tier}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-200">{s.role}</td>
                    <td className="px-3 py-3 text-xs text-ink-300">{s.country} · {s.region}</td>
                    <td className="px-3 py-3 text-right text-xs num-mono text-ink-200">
                      {s.carbonIntensity}
                      <span className="text-ink-500 ml-0.5">kg</span>
                    </td>
                    <td className="px-3 py-3 text-right text-xs num-mono">
                      {s.feocOwnership !== undefined 
                        ? <span className={s.feocOwnership > 25 ? 'text-red-400' : 'text-amber-400'}>{s.feocOwnership}%</span>
                        : <span className="text-ink-500">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-3 text-right text-[11px] num-mono text-ink-400">
                      {s.lastVerified}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

// === 통계 타일 ===
function StatTile({ label, count, total, tone }: any) {
  const toneStyles: any = {
    ok:    { border: 'border-emerald-700/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', bar: 'bg-emerald-500' },
    info:  { border: 'border-blue-700/30', bg: 'bg-blue-500/5', text: 'text-blue-400', bar: 'bg-blue-500' },
    warn:  { border: 'border-amber-700/30', bg: 'bg-amber-500/5', text: 'text-amber-400', bar: 'bg-amber-500' },
    alert: { border: 'border-red-700/30', bg: 'bg-red-500/5', text: 'text-red-400', bar: 'bg-red-500' },
  };
  const t = toneStyles[tone];
  const pct = (count / total) * 100;

  return (
    <div className={`rounded-sm border ${t.border} ${t.bg} p-4`}>
      <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">{label}</div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-3xl font-semibold num-mono ${t.text}`}>{count}</span>
        <span className="text-xs text-ink-400">/ {total}개사</span>
      </div>
      <div className="h-1 bg-ink-700 rounded-xs overflow-hidden">
        <div className={`h-full ${t.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// === 상태 배지 ===
function StatusBadge({ status }: { status: any }) {
  const map: any = {
    verified:  { tone: 'ok', label: '검증 완료' },
    pending:   { tone: 'info', label: '검토 대기' },
    review:    { tone: 'warn', label: '추가 확인' },
    violation: { tone: 'alert', label: '규제 위반' },
  };
  const m = map[status];
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}

// === 협력사 상세 패널 ===
function SupplierDetail({ supplier }: { supplier: Supplier }) {
  // 이 노드와 연결된 엣지
  const incoming = supplyEdges.filter(e => e.to === supplier.id);
  const outgoing = supplyEdges.filter(e => e.from === supplier.id);
  
  return (
    <div className="space-y-4">
      {/* 기본 정보 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <StatusBadge status={supplier.status} />
          <Badge tone="neutral">{`T${supplier.tier}`}</Badge>
        </div>
        <h3 className="text-base font-semibold text-ink-50 mb-0.5">{supplier.name}</h3>
        <p className="text-xs text-ink-400">{supplier.role}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <DetailField icon={MapPin} label="소재지" value={`${supplier.country} · ${supplier.region}`} />
        <DetailField icon={Layers} label="취급 광물" value={supplier.material.join(', ')} />
        <DetailField icon={TrendingUp} label="탄소집약도" value={`${supplier.carbonIntensity} kgCO₂eq/kg`} />
        {supplier.feocOwnership !== undefined && (
          <DetailField 
            icon={AlertCircle} 
            label="FEOC 지분" 
            value={`${supplier.feocOwnership}%`}
            alert={supplier.feocOwnership > 25}
          />
        )}
      </div>

      {/* 좌표 */}
      <div className="rounded-xs border border-ink-700 bg-ink-900/40 p-3">
        <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-1.5 flex items-center gap-1.5">
          <MapPin className="w-3 h-3" /> 좌표 (PostGIS 검증 대상)
        </div>
        <div className="num-mono text-xs text-ink-200">
          {supplier.coordinates[1].toFixed(4)}°N, {supplier.coordinates[0].toFixed(4)}°E
        </div>
        {supplier.status === 'violation' && (
          <div className="mt-2 text-[11px] text-red-400 flex items-start gap-1.5">
            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>UFLPA 제재 지역 폴리곤 내부 좌표 — Geo-Analysis 에이전트가 위반으로 판정</span>
          </div>
        )}
      </div>

      {/* 인증 */}
      {supplier.certifications.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2 flex items-center gap-1.5">
            <Award className="w-3 h-3" /> 보유 인증
          </div>
          <div className="flex flex-wrap gap-1">
            {supplier.certifications.map(c => (
              <span key={c} className="text-[10px] px-2 py-0.5 rounded-xs bg-accent-700/15 text-accent-300 border border-accent-700/30">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 공급 관계 */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <div className="pt-3 border-t border-ink-700">
          <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">공급 관계</div>
          {incoming.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] text-ink-500 mb-1">받는 광물 ({incoming.length})</div>
              {incoming.map((e, i) => {
                const src = suppliers.find(s => s.id === e.from);
                return (
                  <div key={i} className="text-[11px] text-ink-300 flex items-center justify-between py-0.5">
                    <span>← {src?.name}</span>
                    <span className="num-mono text-ink-500">{e.volume}t</span>
                  </div>
                );
              })}
            </div>
          )}
          {outgoing.length > 0 && (
            <div>
              <div className="text-[10px] text-ink-500 mb-1">공급 ({outgoing.length})</div>
              {outgoing.map((e, i) => {
                const dst = suppliers.find(s => s.id === e.to);
                return (
                  <div key={i} className="text-[11px] text-ink-300 flex items-center justify-between py-0.5">
                    <span>→ {dst?.name}</span>
                    <span className="num-mono text-ink-500">{e.volume}t</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailField({ icon: Icon, label, value, alert }: any) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-0.5 flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className={`text-xs ${alert ? 'text-red-400' : 'text-ink-100'}`}>{value}</div>
    </div>
  );
}

function EmptyDetailState() {
  return (
    <div className="py-12 text-center">
      <FileSearch className="w-10 h-10 text-ink-600 mx-auto mb-3" strokeWidth={1.5} />
      <p className="text-xs text-ink-400">
        좌측 맵에서 협력사 노드를 클릭하면<br/>
        해당 협력사의 상세 정보가 표시됩니다
      </p>
    </div>
  );
}
