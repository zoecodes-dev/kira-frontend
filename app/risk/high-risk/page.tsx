'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ShieldAlert,
  X,
} from 'lucide-react';
import Badge from '@/components/Badge';
import PageHeader from '@/components/PageHeader';
import TopStatCard from '@/components/TopStatCard';
import { suppliers } from '@/lib/data';
import {
  getSupplierName,
  supplierRiskProfiles,
  type SupplierRiskProfile,
} from '@/lib/supplier-detail-data';

type RiskFilter = 'all' | 'high' | 'feoc';
type SortBy = 'score' | 'feoc' | 'audit';
type ModalType = 'critical' | 'feoc' | 'overdue' | 'monitoring';

const TODAY = '2026-06-01';

const riskMeta = {
  low: { label: '저위험', tone: 'ok' as const, text: 'text-emerald-700', marker: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  medium: { label: '중위험', tone: 'warn' as const, text: 'text-amber-700', marker: 'border-amber-300 bg-amber-50 text-amber-800' },
  high: { label: '고위험', tone: 'alert' as const, text: 'text-red-700', marker: 'border-red-300 bg-red-50 text-red-800' },
  critical: { label: '최고위험', tone: 'alert' as const, text: 'text-red-800', marker: 'border-red-400 bg-red-100 text-red-900' },
};

const feocMeta: Record<string, { label: string; tone: 'ok' | 'warn' | 'alert' | 'neutral' }> = {
  eligible: { label: 'FEOC 적격', tone: 'ok' },
  ineligible: { label: 'FEOC 부적격', tone: 'alert' },
  under_review: { label: 'FEOC 검토 중', tone: 'warn' },
  unknown: { label: 'FEOC 미파악', tone: 'neutral' },
};

function latestAuditDue(profile: SupplierRiskProfile) {
  return profile.auditRecords.at(-1)?.nextAuditDue;
}

function isAuditOverdue(profile: SupplierRiskProfile) {
  const due = latestAuditDue(profile);
  return Boolean(due && due < TODAY);
}

function matrixPosition(score: number): { x: number; y: number } {
  const x = Math.min(4, Math.floor(score / 20));
  const y = Math.min(4, Math.max(0, Math.floor((score + 14) / 20)));
  return { x, y };
}

function matrixCellTone(x: number, y: number) {
  const score = x + y;
  if (score <= 3) return 'border-emerald-200 bg-emerald-50';
  if (score <= 5) return 'border-amber-200 bg-amber-50';
  return 'border-red-200 bg-red-50';
}

export default function HighRiskPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RiskFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('score');
  const [modal, setModal] = useState<ModalType | null>(null);

  const profiles = supplierRiskProfiles;
  const selected = profiles.find(profile => profile.supplierId === selectedId) ?? null;

  const criticalProfiles = profiles.filter(profile => profile.riskLevel === 'critical');
  const feocConcernProfiles = profiles.filter(profile => profile.feocStatus === 'ineligible' || profile.feocStatus === 'under_review');
  const overdueProfiles = profiles.filter(isAuditOverdue);
  const monitoringProfiles = profiles.filter(profile => profile.riskLevel === 'low' && !profile.isHighRiskFlag);

  const filteredProfiles = useMemo(() => {
    const result = profiles.filter(profile => {
      if (filter === 'high') return profile.riskLevel === 'high' || profile.riskLevel === 'critical';
      if (filter === 'feoc') return profile.feocStatus === 'ineligible';
      return true;
    });
    return [...result].sort((a, b) => {
      if (sortBy === 'score') return b.overallRiskScore - a.overallRiskScore;
      if (sortBy === 'feoc') return Number(b.feocStatus === 'ineligible') - Number(a.feocStatus === 'ineligible');
      return (latestAuditDue(a) ?? '9999').localeCompare(latestAuditDue(b) ?? '9999');
    });
  }, [filter, profiles, sortBy]);

  const modalProfiles = modal === 'critical'
    ? criticalProfiles
    : modal === 'feoc'
      ? feocConcernProfiles
      : modal === 'overdue'
        ? overdueProfiles
        : monitoringProfiles;

  const modalTitle = modal === 'critical'
    ? '최고 위험 협력사'
    : modal === 'feoc'
      ? 'FEOC 규제 우려·부적격'
      : modal === 'overdue'
        ? '실사 감사 기한 초과'
        : '정상 모니터링 중';

  return (
    <>
      <PageHeader
        title="고위험 협력사"
        description="위험도 매트릭스에서 공급망 위험 위치를 확인하고 규제 위반 사유를 추적합니다"
        badge="리스크"
        sticky={false}
      />

      <div className="space-y-6 p-8">
        {/* 상단 통계 카드 */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <TopStatCard label="최고 위험 협력사" value={criticalProfiles.length} unit="개사" tone="critical" onClick={() => setModal('critical')} />
          <TopStatCard label="FEOC 규제 우려·부적격" value={feocConcernProfiles.length} unit="개사" tone="warn" onClick={() => setModal('feoc')} />
          <TopStatCard label="실사 감사 기한 초과" value={overdueProfiles.length} unit="개사" tone="alert" onClick={() => setModal('overdue')} />
          <TopStatCard label="정상 모니터링 중" value={monitoringProfiles.length} unit="개사" tone="ok" onClick={() => setModal('monitoring')} />
        </div>

        {/* ─── 💡 지혜의 원픽: 부드러운 스크롤 추적(Sticky) 레이아웃 ─── */}
        {/* items-start가 필수입니다. 이게 있어야 왼쪽 카드가 늘어나지 않고 제 높이를 유지하며 스크롤을 탑니다. */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[560px_minmax(0,1fr)]">
          
          {/* 👈 왼쪽 컬럼: 오른쪽 카드 스크롤에 맞춰 부드럽게 고정되어 따라오는 구역 */}
          {/* top-6를 주어 화면 상단에 부드럽게 안착시킵니다. */}
          <div className="sticky top-6 min-w-0 w-full rounded-sm border border-ink-700 bg-white p-5 shadow-sm h-fit">
            <div className="pb-4">
              <h2 className="text-sm font-bold text-ink-100">리스크 위치 매트릭스</h2>
              <p className="text-[11px] text-ink-500 mt-0.5">발생 가능성 × 비즈니스 영향도 기준 5 × 5 Grid</p>
            </div>
            <div className="mt-2">
              <RiskMatrix profiles={profiles} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </div>

          {/* 👉 오른쪽 컬럼: 콘텐츠 길이에 맞춰 자연스럽게 스크롤을 내리는 카드 구역 */}
          <div className="min-w-0 flex flex-col rounded-sm border border-ink-700 bg-white shadow-sm">
            <div className="px-5 py-4 border-b border-ink-700 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-sm font-bold text-ink-100">
                  {selected ? '선택된 협력사 실시간 분석' : '위험 추적 대상 협력사 프로필'}
                </h2>
                <p className="text-[11px] text-ink-500 mt-0.5">
                  {selected ? '규제 위반과 조치 필요 사유를 확인합니다' : '협력사를 선택하면 상세 위반 분석으로 전환됩니다'}
                </p>
              </div>
              
              {selected && (
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="flex items-center gap-1 rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  목록 보기
                </button>
              )}
            </div>

            {/* 자연스럽게 아래로 길어지도록 패딩과 여백만 정돈합니다. */}
            <div className="p-5 space-y-4 bg-white">
              {selected ? (
                <SupplierRiskDetail profile={selected} />
              ) : (
                <SupplierRiskList
                  profiles={filteredProfiles}
                  filter={filter}
                  sortBy={sortBy}
                  onFilter={setFilter}
                  onSort={setSortBy}
                  onSelect={setSelectedId}
                />
              )}
            </div>
          </div>

        </div>
      </div>

      {modal && (
        <SupplierModal title={modalTitle} profiles={modalProfiles} onClose={() => setModal(null)} onSelect={profile => {
          setSelectedId(profile.supplierId);
          setModal(null);
        }} />
      )}
    </>
  );
}

// 이하는 데이터 바인딩 컴포넌트로 기존과 완전히 동일합니다.
function RiskMatrix({ profiles, selectedId, onSelect }: { profiles: SupplierRiskProfile[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const likelihood = ['매우 낮음', '낮음', '보통', '높음', '매우 높음'];
  const impact = ['미미', '경미', '보통', '중대', '심각'];
  const positioned = profiles.map(profile => ({ ...profile, ...matrixPosition(profile.overallRiskScore) }));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[460px]">
        <div className="flex">
          <div className="w-16 shrink-0" />
          {likelihood.map(label => <div key={label} className="flex-1 pb-2 text-center text-[10px] font-semibold text-ink-500">{label}</div>)}
        </div>
        {[...impact].reverse().map((label, row) => {
          const y = 4 - row;
          return (
            <div key={label} className="flex items-stretch">
              <div className="flex w-16 shrink-0 items-center justify-end pr-2 text-[10px] font-semibold text-ink-500">{label}</div>
              {likelihood.map((_, x) => (
                <div key={x} className={clsx('m-0.5 flex h-14 flex-1 flex-wrap items-center justify-center gap-1 rounded-xs border p-1', matrixCellTone(x, y))}>
                  {positioned.filter(profile => profile.x === x && profile.y === y).map(profile => {
                    const name = getSupplierName(profile.supplierId);
                    return (
                      <button
                        key={profile.supplierId}
                        type="button"
                        title={name?.nameEn ?? profile.supplierId}
                        onClick={() => onSelect(profile.supplierId)}
                        className={clsx(
                          'flex h-7 w-7 items-center justify-center rounded-xs border text-[9px] font-bold shadow-control transition-transform hover:scale-110',
                          riskMeta[profile.riskLevel].marker,
                          selectedId === profile.supplierId && 'ring-2 ring-accent-500',
                        )}
                      >
                        {(name?.shortNameEn ?? name?.nameEn ?? profile.supplierId).slice(0, 2).toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
        <div className="mt-2 pl-16 text-center text-[11px] font-semibold text-ink-500">사고 발생 가능성 →</div>
        <div className="mt-5 flex flex-wrap justify-center gap-4 text-[11px] text-ink-500">
          <Legend color="bg-emerald-200" label="저위험" />
          <Legend color="bg-amber-200" label="중위험" />
          <Legend color="bg-red-200" label="고위험" />
        </div>
      </div>
    </div>
  );
}

function SupplierRiskList({ profiles, filter, sortBy, onFilter, onSort, onSelect }: {
  profiles: SupplierRiskProfile[];
  filter: RiskFilter;
  sortBy: SortBy;
  onFilter: (filter: RiskFilter) => void;
  onSort: (sort: SortBy) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex overflow-hidden rounded-xs border border-ink-700">
          {([['all', '전체 목록'], ['high', '고위험+'], ['feoc', 'FEOC 부적격']] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => onFilter(value)} className={clsx('px-3 py-2 text-[11px] font-semibold', filter === value ? 'bg-accent-50 text-accent-800' : 'bg-white text-ink-500 hover:bg-ink-800')}>
              {label}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={event => onSort(event.target.value as SortBy)} className="rounded-xs border border-ink-700 bg-white px-3 py-2 text-[11px] font-semibold text-ink-400">
          <option value="score">위험 종합 점수 높은순</option>
          <option value="feoc">FEOC 부적격 우선</option>
          <option value="audit">감사 기한 우선</option>
        </select>
      </div>
      <div className="space-y-2">
        {profiles.map(profile => <SupplierRiskListItem key={profile.supplierId} profile={profile} onClick={() => onSelect(profile.supplierId)} />)}
      </div>
    </div>
  );
}

function SupplierRiskListItem({ profile, onClick }: { profile: SupplierRiskProfile; onClick: () => void }) {
  const name = getSupplierName(profile.supplierId);
  const meta = riskMeta[profile.riskLevel];
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-4 rounded-xs border border-ink-700 bg-white p-4 text-left transition-colors hover:border-accent-300 hover:bg-accent-50/30">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-bold text-ink-100">{name?.nameEn ?? profile.supplierId}</span>
          <span className="num-mono text-[11px] text-ink-500">{profile.supplierId}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {profile.feocStatus !== 'eligible' && <Badge tone={feocMeta[profile.feocStatus].tone}>{feocMeta[profile.feocStatus].label}</Badge>}
          {isAuditOverdue(profile) && <Badge tone="alert">감사 기한 초과</Badge>}
          {profile.highRiskReasons.slice(0, 1).map(reason => <Badge key={reason} tone={meta.tone}>{reason}</Badge>)}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={clsx('num-mono text-xl font-bold', meta.text)}>{profile.overallRiskScore}</div>
        <div className="text-[11px] font-semibold text-ink-500">{meta.label}</div>
      </div>
    </button>
  );
}

function SupplierRiskDetail({ profile }: { profile: SupplierRiskProfile }) {
  const name = getSupplierName(profile.supplierId);
  const supplier = suppliers.find(item => item.id === profile.supplierId);
  const meta = riskMeta[profile.riskLevel];
  const reasons = profile.highRiskReasons.length > 0 ? profile.highRiskReasons : ['현재 열린 고위험 사유가 없습니다.'];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-sm border border-ink-700 bg-ink-800/50 p-5">
        <div>
          <h3 className="text-lg font-bold text-ink-100">{name?.nameEn ?? profile.supplierId}</h3>
          <p className="mt-1 text-xs text-ink-500">{profile.supplierId} · {supplier?.role ?? '-'} · {supplier?.country ?? '-'}</p>
        </div>
        <div className="text-right">
          <div className={clsx('num-mono text-3xl font-bold', meta.text)}>{profile.overallRiskScore}</div>
          <div className="text-[11px] text-ink-500">종합 위험 지수</div>
        </div>
      </div>
      <div className={clsx('rounded-sm border p-5', profile.riskLevel === 'low' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50')}>
        <div className="flex items-center gap-2 text-sm font-bold text-ink-100">
          {profile.riskLevel === 'low' ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <ShieldAlert className="h-4 w-4 text-red-700" />}
          {profile.riskLevel === 'low' ? '컴플라이언스 준수 안정 상태' : '핵심 규제 위반 및 탐지 리스크 사항'}
        </div>
        <div className="mt-4 space-y-2">
          {reasons.map(reason => (
            <div key={reason} className={clsx('rounded-xs border-l-4 bg-white p-3', profile.riskLevel === 'low' ? 'border-emerald-500' : 'border-red-500')}>
              <div className="text-xs font-semibold text-ink-200">{reason}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DetailStat label="FEOC 상태" value={feocMeta[profile.feocStatus].label} />
        <DetailStat label="다음 감사" value={latestAuditDue(profile) ?? '-'} />
        <DetailStat label="미해결 인권 이슈" value={`${profile.humanRightsIssues.filter(issue => issue.status !== 'resolved').length}건`} />
      </div>
    </div>
  );
}

function SupplierModal({ title, profiles, onClose, onSelect }: { title: string; profiles: SupplierRiskProfile[]; onClose: () => void; onSelect: (profile: SupplierRiskProfile) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-2xl rounded-sm border border-ink-700 bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-ink-100">{title}</h2>
            <p className="mt-1 text-xs text-ink-500">{profiles.length}개사</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-xs p-2 text-ink-500 hover:bg-ink-800 hover:text-ink-200"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[65vh] space-y-2 overflow-y-auto p-5">
          {profiles.map(profile => <SupplierRiskListItem key={profile.supplierId} profile={profile} onClick={() => onSelect(profile)} />)}
          {profiles.length === 0 && <div className="py-10 text-center text-sm text-ink-500">해당 협력사가 없습니다.</div>}
        </div>
      </div>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xs border border-ink-700 bg-white p-3"><div className="text-[11px] text-ink-500">{label}</div><div className="mt-1 text-sm font-bold text-ink-100">{value}</div></div>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={clsx('h-3 w-3 rounded-xs', color)} />{label}</span>;
}