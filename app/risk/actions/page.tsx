'use client';

// 원청 담당자가 수행한 조치 이력을 조회하는 운영 화면
import { useMemo, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import TopStatCard from '@/components/TopStatCard';
import { ArrowUpRight, Search } from 'lucide-react';
import clsx from 'clsx';

type ActionType = '보완 요청' | '리마인드' | 'HITL 요청' | '실사 요청' | '승인' | '반려' | 'DPP 발행';
type ResultStatus = '진행 중' | '완료' | 'HITL 대기' | '발행 완료' | '승인 완료' | '반려 완료';
type KpiFilter = 'all' | 'today' | 'progress' | 'done' | 'hitl';
type PeriodFilter = '7d' | '30d' | '90d' | 'custom';

interface ActionHistoryItem {
  id: string;
  occurredAt: string;
  type: ActionType;
  target: string;
  product: string;
  supplier: string;
  actor: string;
  status: ResultStatus;
  relatedPage: string;
  href: string;
  reason: string;
  document: string;
  previousStatus: string;
  currentStatus: string;
}

const actionHistories: ActionHistoryItem[] = [
  {
    id: 'ACT-20260613-001',
    occurredAt: '2026-06-13 09:12',
    type: '보완 요청',
    target: '원산지 증빙 누락',
    product: 'BMW iX3 Battery Pack',
    supplier: 'Katanga Cobalt',
    actor: '김정민',
    status: '진행 중',
    relatedPage: 'Request Board',
    href: '/supply-chain/request-map',
    reason: '원산지 증명서의 광산명과 제출된 자재 로트 정보가 불일치했습니다.',
    document: 'origin_certificate_katanga_2026.pdf',
    previousStatus: '검토 대기',
    currentStatus: '보완 요청',
  },
  {
    id: 'ACT-20260613-002',
    occurredAt: '2026-06-13 10:04',
    type: 'HITL 요청',
    target: 'FEOC 검토',
    product: 'BMW i4 Module',
    supplier: 'Ganzhou Rare',
    actor: '김정민',
    status: 'HITL 대기',
    relatedPage: 'HITL',
    href: '/hitl',
    reason: 'FEOC 지분율 자동 판정 신뢰도가 기준값 아래로 내려갔습니다.',
    document: 'ownership_structure_scan.pdf',
    previousStatus: 'AI 검증 중',
    currentStatus: 'HITL 대기',
  },
  {
    id: 'ACT-20260613-003',
    occurredAt: '2026-06-13 11:28',
    type: 'DPP 발행',
    target: 'Premium NCM811 100Ah',
    product: 'Premium NCM811 100Ah',
    supplier: 'Hanyang Cell',
    actor: '박서연',
    status: '발행 완료',
    relatedPage: 'DPP History',
    href: '/dpp',
    reason: '필수 데이터, 규제 검증, 협력사 신뢰성 조건이 모두 충족되었습니다.',
    document: 'DPP-2026-04982',
    previousStatus: '발행 가능',
    currentStatus: '발행 완료',
  },
  {
    id: 'ACT-20260612-004',
    occurredAt: '2026-06-12 15:36',
    type: '리마인드',
    target: '아동노동 감사 보고서 미제출',
    product: 'Mercedes EQS NCM 118Ah',
    supplier: 'Global Mining',
    actor: '최하린',
    status: '진행 중',
    relatedPage: 'Check Info',
    href: '/suppliers/check-info',
    reason: '제출 기한이 지난 감사 보고서가 아직 등록되지 않았습니다.',
    document: 'audit_report_request_log',
    previousStatus: '자료 요청',
    currentStatus: '리마인드 발송',
  },
  {
    id: 'ACT-20260612-005',
    occurredAt: '2026-06-12 16:20',
    type: '승인',
    target: '코발트 원산지 증빙 승인',
    product: 'Pouch Cell NMC 811 100Ah',
    supplier: 'POS Cathode',
    actor: '김민재',
    status: '승인 완료',
    relatedPage: 'Readiness',
    href: '/dpp/readiness',
    reason: '보완 제출된 원산지 증빙이 로트 및 공급망 정보와 일치했습니다.',
    document: 'origin_cert_pos_cathode_final.pdf',
    previousStatus: '확인 필요',
    currentStatus: '승인 완료',
  },
  {
    id: 'ACT-20260611-006',
    occurredAt: '2026-06-11 13:44',
    type: '반려',
    target: 'FEOC 지분 공시 반려',
    product: 'BMW i4 Module',
    supplier: 'Ganzhou Rare',
    actor: '이서윤',
    status: '반려 완료',
    relatedPage: 'Dashboard',
    href: '/dashboard?tab=violation-cases',
    reason: '제출 자료에서 직접 지분율 41.2%가 확인되어 발행 조건을 충족하지 못했습니다.',
    document: 'feoc_disclosure_ganzhou.xlsx',
    previousStatus: '검토 중',
    currentStatus: '반려 완료',
  },
  {
    id: 'ACT-20260610-007',
    occurredAt: '2026-06-10 09:50',
    type: '실사 요청',
    target: '광산 좌표 현장 확인',
    product: 'BMW iX3 Battery Pack',
    supplier: 'Katanga Cobalt',
    actor: '정유진',
    status: '진행 중',
    relatedPage: 'Due Diligence',
    href: '/due-diligence',
    reason: '광산 좌표와 신고된 채굴권 경계가 일부 겹치지 않았습니다.',
    document: 'mine_boundary_geojson.zip',
    previousStatus: '자동 검증 실패',
    currentStatus: '실사 요청',
  },
  {
    id: 'ACT-20260609-008',
    occurredAt: '2026-06-09 17:05',
    type: 'HITL 요청',
    target: 'OCR 판독 불일치',
    product: 'Pouch Cell NMC 811 100Ah',
    supplier: 'Quzhou Precursor',
    actor: '김정민',
    status: '완료',
    relatedPage: 'HITL',
    href: '/hitl',
    reason: 'AI 판독값과 원본 문서의 수치가 달라 사람 검토가 필요했습니다.',
    document: 'precursor_origin_scan.pdf',
    previousStatus: 'HITL 대기',
    currentStatus: '완료',
  },
];

const statusFilters: Array<'전체' | ActionType> = ['전체', '보완 요청', '리마인드', 'HITL 요청', '실사 요청', '승인', '반려', 'DPP 발행'];
const periodFilters: Array<{ key: PeriodFilter; label: string }> = [
  { key: '7d', label: '최근 7일' },
  { key: '30d', label: '최근 30일' },
  { key: '90d', label: '최근 90일' },
  { key: 'custom', label: '직접 설정' },
];

const statusTone: Record<ResultStatus, 'ok' | 'warn' | 'alert' | 'info'> = {
  '진행 중': 'warn',
  완료: 'ok',
  'HITL 대기': 'info',
  '발행 완료': 'ok',
  '승인 완료': 'ok',
  '반려 완료': 'alert',
};

export default function RiskActionsPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'전체' | ActionType>('전체');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>('all');
  const [selectedId, setSelectedId] = useState(actionHistories[0].id);

  const stats = useMemo(() => ({
    all: actionHistories.length,
    today: actionHistories.filter(item => item.occurredAt.startsWith('2026-06-13')).length,
    progress: actionHistories.filter(item => item.status === '진행 중').length,
    done: actionHistories.filter(item => ['완료', '발행 완료', '승인 완료', '반려 완료'].includes(item.status)).length,
    hitl: actionHistories.filter(item => item.type === 'HITL 요청' || item.status === 'HITL 대기').length,
  }), []);

  const filteredHistories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const now = new Date('2026-06-17T00:00:00');
    const periodDays = periodFilter === '7d' ? 7 : periodFilter === '30d' ? 30 : periodFilter === '90d' ? 90 : null;

    return actionHistories.filter(item => {
      const itemDate = new Date(item.occurredAt.replace(' ', 'T'));
      const matchesQuery = !normalizedQuery
        || item.product.toLowerCase().includes(normalizedQuery)
        || item.supplier.toLowerCase().includes(normalizedQuery)
        || item.id.toLowerCase().includes(normalizedQuery)
        || item.actor.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === '전체' || item.type === statusFilter;
      const matchesKpi = kpiFilter === 'all'
        || (kpiFilter === 'today' && item.occurredAt.startsWith('2026-06-13'))
        || (kpiFilter === 'progress' && item.status === '진행 중')
        || (kpiFilter === 'done' && ['완료', '발행 완료', '승인 완료', '반려 완료'].includes(item.status))
        || (kpiFilter === 'hitl' && (item.type === 'HITL 요청' || item.status === 'HITL 대기'));
      const matchesPeriod = !periodDays || ((now.getTime() - itemDate.getTime()) / 86400000) <= periodDays;

      return matchesQuery && matchesStatus && matchesKpi && matchesPeriod;
    });
  }, [kpiFilter, periodFilter, query, statusFilter]);

  const selected = actionHistories.find(item => item.id === selectedId) ?? filteredHistories[0] ?? actionHistories[0];

  return (
    <>
      <PageHeader
        title="조치 이력"
        description="Dashboard, Request Board, Check Info, HITL, Readiness에서 발생한 원청 담당자 조치 이력을 조회합니다."
        badge="Audit Ops"
      />

      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <KpiButton active={kpiFilter === 'all'} label="전체 조치" value={stats.all} tone="neutral" onClick={() => setKpiFilter('all')} />
          <KpiButton active={kpiFilter === 'today'} label="오늘 처리" value={stats.today} tone="ok" onClick={() => setKpiFilter('today')} />
          <KpiButton active={kpiFilter === 'progress'} label="진행 중" value={stats.progress} tone="warn" onClick={() => setKpiFilter('progress')} />
          <KpiButton active={kpiFilter === 'done'} label="완료" value={stats.done} tone="ok" onClick={() => setKpiFilter('done')} />
          <KpiButton active={kpiFilter === 'hitl'} label="HITL 전환" value={stats.hitl} tone="info" onClick={() => setKpiFilter('hitl')} />
        </div>

        <section className="rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="grid gap-3 border-b border-ink-700 bg-slate-50 px-4 py-3 xl:grid-cols-[minmax(260px,1fr)_auto_auto]">
            <label className="flex items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-ink-500" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="제품명, 협력사명, 요청번호, 담당자 검색"
                className="w-full bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-500"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {statusFilters.map(filter => (
                <FilterButton key={filter} active={statusFilter === filter} onClick={() => setStatusFilter(filter)}>
                  {filter}
                </FilterButton>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {periodFilters.map(filter => (
                <FilterButton key={filter.key} active={periodFilter === filter.key} onClick={() => setPeriodFilter(filter.key)}>
                  {filter.label}
                </FilterButton>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[1120px]">
                <thead className="sticky top-0 z-10 border-b border-ink-700 bg-white">
                  <tr>
                    <TableHead>일시</TableHead>
                    <TableHead>조치 유형</TableHead>
                    <TableHead>대상</TableHead>
                    <TableHead>제품</TableHead>
                    <TableHead>협력사</TableHead>
                    <TableHead>수행자</TableHead>
                    <TableHead>결과 상태</TableHead>
                    <TableHead>관련 페이지</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700/60">
                  {filteredHistories.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={clsx(
                        'cursor-pointer transition-colors hover:bg-slate-50',
                        selected.id === item.id && 'border-l-2 border-l-accent-600 bg-accent-50/50'
                      )}
                    >
                      <td className="px-3 py-3 text-xs font-semibold text-ink-500 num-mono">{item.occurredAt}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-ink-100">{item.type}</td>
                      <td className="px-3 py-3 text-sm text-ink-300">{item.target}</td>
                      <td className="max-w-[220px] px-3 py-3 text-sm text-ink-100"><div className="truncate">{item.product}</div></td>
                      <td className="px-3 py-3 text-sm text-ink-500">{item.supplier}</td>
                      <td className="px-3 py-3 text-sm text-ink-500">{item.actor}</td>
                      <td className="px-3 py-3"><Badge tone={statusTone[item.status]}>{item.status}</Badge></td>
                      <td className="px-3 py-3 text-sm font-semibold text-accent-700">{item.relatedPage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="border-t border-ink-700 bg-slate-50 xl:border-l xl:border-t-0">
              <div className="border-b border-ink-700 px-4 py-3">
                <div className="text-sm font-semibold text-ink-100">선택 조치 상세</div>
                <div className="mt-1 text-xs text-ink-500 num-mono">{selected.id}</div>
              </div>
              <div className="space-y-3 p-4">
                <DetailRow label="조치 내용" value={selected.target} />
                <DetailRow label="조치 사유" value={selected.reason} />
                <DetailRow label="관련 문서" value={selected.document} mono />
                <DetailRow label="수행자" value={selected.actor} />
                <DetailRow label="처리 일시" value={selected.occurredAt} mono />
                <DetailRow label="이전 상태" value={selected.previousStatus} />
                <DetailRow label="현재 상태" value={selected.currentStatus} emphasis />
                <Link
                  href={selected.href}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xs border border-accent-600 bg-white px-3 py-2 text-sm font-semibold text-accent-700 hover:bg-accent-50"
                >
                  관련 페이지 이동
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </>
  );
}

function KpiButton({ active, label, value, tone, onClick }: { active: boolean; label: string; value: number; tone: 'neutral' | 'ok' | 'warn' | 'info'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx('text-left rounded-sm transition-shadow', active && 'ring-2 ring-accent-600 ring-offset-2 ring-offset-white')}
    >
      <TopStatCard label={label} value={value} unit="건" tone={tone} />
    </button>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-xs border px-2.5 py-1.5 text-xs font-semibold transition-colors',
        active ? 'border-accent-600 bg-accent-50 text-accent-700' : 'border-ink-700 bg-white text-ink-500 hover:text-ink-100'
      )}
    >
      {children}
    </button>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-xs font-semibold text-ink-500">{children}</th>;
}

function DetailRow({ label, value, mono, emphasis }: { label: string; value: string; mono?: boolean; emphasis?: boolean }) {
  return (
    <div className="border-b border-ink-700/70 pb-2 last:border-b-0">
      <div className="text-[11px] font-semibold text-ink-500">{label}</div>
      <div className={clsx('mt-1 text-sm leading-5', mono && 'num-mono', emphasis ? 'font-semibold text-accent-700' : 'text-ink-100')}>{value}</div>
    </div>
  );
}
