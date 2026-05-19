'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import { suppliers } from '@/lib/data';
import {
  getSupplierName, getRiskProfile, supplierRiskProfiles,
  type SupplierRiskProfile,
} from '@/lib/supplier-detail-data';
import {
  AlertTriangle, ShieldAlert, TrendingUp, Users, ChevronRight,
  AlertCircle, Eye, Calendar, Building2, Flag,
} from 'lucide-react';
import clsx from 'clsx';

// ─── 위험도 메타 ──────────────────────────────────────────────
const riskMeta = {
  low:      { label: '저위험',   short: 'L', bg: 'bg-emerald-500/10', border: 'border-emerald-700/30', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  medium:   { label: '중위험',   short: 'M', bg: 'bg-amber-500/10',   border: 'border-amber-700/30',   text: 'text-amber-500',   dot: 'bg-amber-500' },
  high:     { label: '고위험',   short: 'H', bg: 'bg-red-500/10',     border: 'border-red-700/30',     text: 'text-red-500',     dot: 'bg-red-500' },
  critical: { label: '최고위험', short: 'C', bg: 'bg-red-600/15',     border: 'border-red-600/40',     text: 'text-red-400',     dot: 'bg-red-400' },
};

const feocMeta: Record<string, { label: string; color: string }> = {
  eligible:     { label: 'FEOC 적격',   color: 'text-emerald-500' },
  ineligible:   { label: 'FEOC 부적격', color: 'text-red-500' },
  under_review: { label: 'FEOC 검토중', color: 'text-amber-500' },
  unknown:      { label: 'FEOC 미파악', color: 'text-ink-400' },
};

const countryName: Record<string, string> = {
  KR: '한국', CN: '중국', JP: '일본', AU: '호주', CL: '칠레',
  PH: '필리핀', CD: '콩고', ID: '인도네시아',
};

// ─── 위험도 점수 → 매트릭스 셀 좌표 변환 (5x5) ──────────────
// X축: 발생 가능성 (0-4), Y축: 영향도 (0-4)
function scoreToCell(score: number): [number, number] {
  // 0-100 점수를 두 축으로 분리 (단순 매핑)
  const x = Math.min(4, Math.floor(score / 20));     // likelihood
  const y = Math.min(4, Math.floor((score % 20) / 4)); // impact
  return [x, y];
}

// 매트릭스 셀 위험도 색상
function cellColor(x: number, y: number): string {
  const combined = x + y;
  if (combined <= 1) return 'bg-emerald-500/15 border-emerald-700/20';
  if (combined <= 3) return 'bg-amber-500/15 border-amber-700/20';
  if (combined <= 5) return 'bg-orange-500/15 border-orange-700/20';
  return 'bg-red-500/20 border-red-700/30';
}

// ─── KPI 타일 ─────────────────────────────────────────────────
function KpiTile({ label, value, unit, icon: Icon, tone }: {
  label: string; value: number | string; unit?: string;
  icon: any; tone: 'ok' | 'warn' | 'critical' | 'neutral';
}) {
  const toneStyle = {
    ok:       'text-emerald-400',
    warn:     'text-amber-400',
    critical: 'text-red-400',
    neutral:  'text-ink-300',
  }[tone];
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={clsx('w-3.5 h-3.5', toneStyle)} />
        <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">{label}</span>
      </div>
      <div className={clsx('text-2xl font-bold num-mono', toneStyle)}>
        {value}<span className="text-sm text-ink-400 ml-1">{unit}</span>
      </div>
    </div>
  );
}

// ─── 협력사 리스트 행 ─────────────────────────────────────────
function SupplierRiskRow({ profile }: { profile: SupplierRiskProfile }) {
  const supplier = suppliers.find(s => s.id === profile.supplierId);
  const name = getSupplierName(profile.supplierId);
  if (!supplier) return null;

  const rm = riskMeta[profile.riskLevel];
  const fm = feocMeta[profile.feocStatus];
  const nextAudit = profile.auditRecords.at(-1)?.nextAuditDue;
  const openIssues = profile.humanRightsIssues.filter(i => i.status !== 'resolved').length;

  return (
    <Link href={`/suppliers/${profile.supplierId}/esg`}>
      <div className={clsx(
        'flex items-start gap-4 px-4 py-3.5 rounded-xs border transition-colors cursor-pointer group',
        profile.isHighRiskFlag
          ? 'border-red-700/40 bg-red-500/5 hover:bg-red-500/8'
          : 'border-ink-700/60 bg-ink-900/30 hover:bg-ink-800/30',
      )}>
        {/* 위험도 배지 */}
        <div className={clsx('shrink-0 w-10 h-10 rounded-xs flex items-center justify-center text-xs font-bold', rm.bg, rm.text)}>
          {profile.overallRiskScore}
        </div>

        {/* 협력사 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink-100 truncate">{name?.nameEn ?? ''}</span>
            {name?.nameKo && <span className="text-xs text-ink-400">{name.nameKo}</span>}
            {profile.isHighRiskFlag && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs border border-red-700/30 bg-red-500/10 text-[9px] text-red-500 font-semibold uppercase tracking-wider">
                <Flag className="w-2.5 h-2.5" /> 고위험
              </span>
            )}
          </div>
          <div className="text-[10px] text-ink-500 mt-0.5">
            {countryName[supplier.country] || supplier.country} · {supplier.role}
          </div>

          {/* 고위험 사유 */}
          {profile.highRiskReasons.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {profile.highRiskReasons.slice(0, 2).map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] text-red-400">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {r}
                </div>
              ))}
              {profile.highRiskReasons.length > 2 && (
                <div className="text-[10px] text-ink-500">+{profile.highRiskReasons.length - 2}건 더</div>
              )}
            </div>
          )}
        </div>

        {/* 우측 메타 */}
        <div className="shrink-0 text-right space-y-1">
          <div className={clsx('text-[11px] font-semibold', rm.text)}>{rm.label}</div>
          <div className={clsx('text-[10px]', fm.color)}>{fm.label}</div>
          {openIssues > 0 && (
            <div className="text-[10px] text-red-400">{openIssues}건 미해결 이슈</div>
          )}
          {nextAudit && (
            <div className="text-[10px] text-ink-500">다음 감사: {nextAudit}</div>
          )}
        </div>

        <ChevronRight className="w-3.5 h-3.5 text-ink-600 group-hover:text-ink-400 shrink-0 self-center transition-colors" />
      </div>
    </Link>
  );
}

// ─── 위험도 매트릭스 (5×5) ───────────────────────────────────
function RiskMatrix({ profiles }: { profiles: SupplierRiskProfile[] }) {
  const likelihood_labels = ['매우 낮음', '낮음', '보통', '높음', '매우 높음'];
  const impact_labels     = ['미미', '경미', '보통', '중대', '심각'];

  // 협력사 → 매트릭스 좌표 매핑
  const placements = profiles.map(p => {
    const [x, y] = scoreToCell(p.overallRiskScore);
    return { ...p, x, y };
  });

  return (
    <div className="overflow-auto">
      <div className="min-w-[520px]">
        {/* Y축 레이블 */}
        <div className="flex">
          <div className="w-16 shrink-0" />
          {likelihood_labels.map((l, i) => (
            <div key={i} className="flex-1 text-center text-[9px] text-ink-500 uppercase tracking-wider pb-1">{l}</div>
          ))}
        </div>

        {/* 매트릭스 행 (Y축 = 영향도, 높을수록 위) */}
        {[...impact_labels].reverse().map((il, rowRevIdx) => {
          const y = 4 - rowRevIdx;
          return (
            <div key={y} className="flex items-stretch">
              <div className="w-16 shrink-0 flex items-center justify-end pr-2">
                <span className="text-[9px] text-ink-500 uppercase tracking-wider">{il}</span>
              </div>
              {likelihood_labels.map((_, x) => {
                const cellSuppliers = placements.filter(p => p.x === x && p.y === y);
                return (
                  <div key={x} className={clsx(
                    'flex-1 h-16 border rounded-xs m-0.5 flex flex-wrap items-center justify-center gap-1 p-1',
                    cellColor(x, y),
                  )}>
                    {cellSuppliers.map(p => {
                      const rm = riskMeta[p.riskLevel];
                      const name = getSupplierName(p.supplierId);
                      return (
                        <Link key={p.supplierId} href={`/suppliers/${p.supplierId}/esg`}>
                          <div
                            title={name?.nameEn ?? ''}
                            className={clsx(
                              'w-6 h-6 rounded-xs flex items-center justify-center text-[9px] font-bold cursor-pointer border hover:scale-110 transition-transform',
                              rm.bg, rm.border, rm.text,
                            )}
                          >
                            {(name?.nameEn ?? '').slice(0, 2).toUpperCase()}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* X축 레이블 */}
        <div className="flex mt-1">
          <div className="w-16 shrink-0" />
          <div className="flex-1 text-center text-[9px] text-ink-400 pt-1">← 발생 가능성 →</div>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────
export default function HighRiskPage() {
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'feoc' | 'audit'>('score');

  const allProfiles = supplierRiskProfiles;

  const filtered = useMemo(() => {
    let list = [...allProfiles];
    if (filterLevel === 'high')     list = list.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical');
    if (filterLevel === 'critical') list = list.filter(p => p.riskLevel === 'critical');
    if (sortBy === 'score')  list.sort((a, b) => b.overallRiskScore - a.overallRiskScore);
    if (sortBy === 'feoc')   list.sort((a, b) => (a.feocStatus === 'ineligible' ? -1 : 1));
    if (sortBy === 'audit') {
      list.sort((a, b) => {
        const aDate = a.auditRecords.at(-1)?.nextAuditDue || '9999';
        const bDate = b.auditRecords.at(-1)?.nextAuditDue || '9999';
        return aDate.localeCompare(bDate);
      });
    }
    return list;
  }, [allProfiles, filterLevel, sortBy]);

  const highRiskCount    = allProfiles.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length;
  const flaggedCount     = allProfiles.filter(p => p.isHighRiskFlag).length;
  const feocIneligible   = allProfiles.filter(p => p.feocStatus === 'ineligible').length;
  const overdueAudit     = allProfiles.filter(p => {
    const d = p.auditRecords.at(-1)?.nextAuditDue;
    return d && new Date(d) < new Date('2026-05-19');
  }).length;

  return (
    <>
      <PageHeader
        title="고위험 협력사"
        description="위험도 매트릭스 · 실사 현황 · FEOC 부적격 추적"
        badge="리스크"
      />

      <div className="p-8 space-y-8">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTile label="고위험 이상" value={highRiskCount} unit="개사" icon={AlertTriangle} tone="critical" />
          <KpiTile label="고위험 플래그" value={flaggedCount} unit="개사" icon={Flag} tone="warn" />
          <KpiTile label="FEOC 부적격" value={feocIneligible} unit="개사" icon={ShieldAlert} tone="critical" />
          <KpiTile label="감사 기한 초과" value={overdueAudit} unit="개사" icon={Calendar} tone="warn" />
        </div>

        {/* 위험도 매트릭스 */}
        <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-ink-100">위험도 매트릭스</h3>
              <p className="text-[11px] text-ink-400 mt-0.5">발생 가능성 × 영향도 기준 협력사 분포</p>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              {Object.entries(riskMeta).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1">
                  <div className={clsx('w-2 h-2 rounded-full', v.dot)} />
                  <span className="text-ink-400">{v.label}</span>
                </div>
              ))}
            </div>
          </div>
          <RiskMatrix profiles={allProfiles} />
        </div>

        {/* 협력사 목록 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ink-100">
              전체 협력사 위험도 목록
              <span className="ml-2 text-xs text-ink-400 font-normal">{filtered.length}개사</span>
            </h3>
            <div className="flex items-center gap-2">
              {/* 필터 */}
              <div className="flex rounded-xs border border-ink-700/60 overflow-hidden">
                {(['all', 'high', 'critical'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterLevel(f)}
                    className={clsx(
                      'px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                      filterLevel === f
                        ? 'bg-ink-700 text-ink-100'
                        : 'text-ink-500 hover:text-ink-300',
                    )}
                  >
                    {f === 'all' ? '전체' : f === 'high' ? '고위험+' : '최고위험'}
                  </button>
                ))}
              </div>
              {/* 정렬 */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="text-[10px] bg-ink-800 border border-ink-700/60 rounded-xs px-2 py-1.5 text-ink-300"
              >
                <option value="score">위험 점수순</option>
                <option value="feoc">FEOC 우선</option>
                <option value="audit">감사 기한순</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map(p => (
              <SupplierRiskRow key={p.supplierId} profile={p} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
