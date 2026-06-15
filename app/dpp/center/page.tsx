'use client';

// DPP 발행 현황을 한눈에 보는 관제센터 페이지.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import clsx from 'clsx';
import {
  ChevronRight,
  FileBadge,
  FileSearch,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';

type ProductStatus = 'ready' | 'hold' | 'hitl' | 'issued';
type BlockerKey = 'feoc' | 'origin' | 'hitl' | 'audit';
type ModalKey = ProductStatus | 'blockers' | `blocker:${BlockerKey}`;

interface CenterProduct {
  id: string;
  name: string;
  customer: string;
  model: string;
  readiness: number;
  status: ProductStatus;
  blocker?: string;
  blockerKey?: BlockerKey;
  issue?: string;
  confidence?: number;
  dppId?: string;
  issuedAt?: string;
  supplier: string;
  targetHref: string;
}

const products: CenterProduct[] = [
  {
    id: 'BMW-IX3-NCM811-108',
    name: 'BMW iX3 Cylindrical NCM811 108Ah',
    customer: 'BMW',
    model: 'iX3 50',
    readiness: 100,
    status: 'issued',
    dppId: 'DPP-IX3-20260610',
    issuedAt: '2026-06-10 09:30',
    supplier: 'Hanyang Cell Mfg',
    targetHref: '/dpp',
  },
  {
    id: 'BMW-I4-NCM-81',
    name: 'BMW i4 Prismatic NCM 81Ah',
    customer: 'BMW',
    model: 'i4',
    readiness: 70,
    status: 'hitl',
    blocker: 'HITL 검토 대기',
    blockerKey: 'hitl',
    issue: '전구체 미확인, AI 신뢰도 임계치 미달',
    confidence: 70,
    supplier: 'Daesung Precision',
    targetHref: '/hitl',
  },
  {
    id: 'MB-GLC-NCM-94',
    name: 'Mercedes GLC EV Prismatic NCM 94Ah',
    customer: 'Mercedes',
    model: 'GLC EV',
    readiness: 58,
    status: 'hold',
    blocker: 'FEOC 문서 누락',
    blockerKey: 'feoc',
    issue: 'Global Mining 신장 리스크 및 외국 지분 25% 이상',
    confidence: 91,
    supplier: 'Global Mining Corp',
    targetHref: '/dpp/readiness',
  },
  {
    id: 'MB-EQS-NCM-118',
    name: 'Mercedes EQS Prismatic NCM 118Ah',
    customer: 'Mercedes',
    model: 'EQS',
    readiness: 96,
    status: 'ready',
    supplier: 'Woojin Battery',
    targetHref: '/dpp/readiness',
  },
];

const extraHeldProducts: CenterProduct[] = [
  {
    id: 'SUPPLIER-AUDIT-001',
    name: 'High-Nickel Cell Audit Package',
    customer: 'Internal',
    model: 'Audit pack',
    readiness: 82,
    status: 'hold',
    blocker: '실사 결과 미제출',
    blockerKey: 'audit',
    issue: '현장 실사 결과 보고서가 아직 제출되지 않음',
    supplier: 'Xinjiang Nickel Refinery',
    targetHref: '/dpp/readiness',
  },
  {
    id: 'ORIGIN-CHECK-001',
    name: 'Cathode Material Origin Set',
    customer: 'BMW',
    model: 'CAM set',
    readiness: 76,
    status: 'hold',
    blocker: '원산지 검증 미완료',
    blockerKey: 'origin',
    issue: '광산 원산지 증빙과 BOM 경로 대조 필요',
    supplier: 'Unverified Precursor Trading',
    targetHref: '/dpp/readiness',
  },
];

const centerProducts = [...products, ...extraHeldProducts];

const blockerMeta: Record<BlockerKey, { label: string; tone: string; icon: typeof FileSearch }> = {
  feoc: { label: 'FEOC 문서 누락', tone: 'text-red-700', icon: FileSearch },
  origin: { label: '원산지 검증 미완료', tone: 'text-orange-700', icon: ShieldAlert },
  hitl: { label: 'HITL 검토 대기', tone: 'text-indigo-700', icon: UserCheck },
  audit: { label: '실사 결과 미제출', tone: 'text-amber-700', icon: FileBadge },
};

const kpiMeta: Array<{
  key: ModalKey;
  label: string;
  tone: 'green' | 'orange' | 'indigo' | 'red' | 'blue';
  getProducts: () => CenterProduct[];
}> = [
  { key: 'ready', label: '발행 가능', tone: 'green', getProducts: () => centerProducts.filter(product => product.status === 'ready') },
  { key: 'hold', label: '발행 보류', tone: 'orange', getProducts: () => centerProducts.filter(product => product.status === 'hold') },
  { key: 'hitl', label: 'HITL 검토 필요', tone: 'indigo', getProducts: () => centerProducts.filter(product => product.status === 'hitl') },
  { key: 'blockers', label: '남은 Blocker', tone: 'red', getProducts: () => centerProducts.filter(product => product.blocker) },
  { key: 'issued', label: '최근 발행', tone: 'blue', getProducts: () => centerProducts.filter(product => product.status === 'issued') },
];

export default function DppCenterPage() {
  const [modalKey, setModalKey] = useState<ModalKey | null>(null);
  const [recentDays, setRecentDays] = useState('7');
  const [lastUpdated, setLastUpdated] = useState('2026-06-11 14:57');

  const heldProducts = centerProducts.filter(product => product.status === 'hold');
  const hitlProducts = centerProducts.filter(product => product.status === 'hitl');
  const issuedProducts = centerProducts.filter(product => product.status === 'issued');

  const blockerRows = useMemo(() => {
    return (Object.keys(blockerMeta) as BlockerKey[]).map(key => ({
      key,
      products: centerProducts.filter(product => product.blockerKey === key),
      ...blockerMeta[key],
    }));
  }, []);

  const modalProducts = modalKey
    ? modalKey.startsWith('blocker:')
      ? centerProducts.filter(product => product.blockerKey === modalKey.replace('blocker:', ''))
      : kpiMeta.find(kpi => kpi.key === modalKey)?.getProducts() ?? []
    : [];

  const modalTitle = modalKey
    ? modalKey.startsWith('blocker:')
      ? blockerMeta[modalKey.replace('blocker:', '') as BlockerKey].label
      : kpiMeta.find(kpi => kpi.key === modalKey)?.label ?? '제품 목록'
    : '제품 목록';

  return (
    <>
      <PageHeader
        title="DPP Center"
        description="DPP 발행 현황을 한눈에 확인하고 문제 제품의 상세 분석 화면으로 이동합니다."
        badge="Control Center"
      />

      <div className="p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-medium text-ink-500">
            최종 업데이트 <span className="num-mono text-ink-200">{lastUpdated}</span>
          </p>
          <button
            onClick={() => setLastUpdated('방금 전')}
            data-testid="dpp-center-refresh"
            className="inline-flex items-center gap-2 rounded-sm border border-ink-700 bg-white px-4 py-2 text-sm font-semibold text-ink-300 hover:border-accent-600 hover:text-accent-700"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {kpiMeta.map(kpi => (
            <KpiButton
              key={kpi.key}
              label={kpi.label}
              count={kpi.getProducts().length}
              tone={kpi.tone}
              onClick={() => setModalKey(kpi.key)}
            />
          ))}
        </section>

        <div className="rounded-sm border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
          KPI 카드와 Blocker 항목을 클릭하면 해당 제품 목록을 팝업으로 확인할 수 있습니다.
        </div>

        <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Panel
            title="발행 보류 제품"
            count={`${heldProducts.length}건`}
            description="Readiness가 낮거나 핵심 증빙이 막힌 제품입니다."
            action={<ActionButton testId="dpp-center-hold-all" onClick={() => setModalKey('hold')}>전체 보기</ActionButton>}
          >
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-ink-700 bg-ink-900/30">
                  {['제품명', 'Readiness', 'Blocker'].map(head => (
                    <th key={head} className="px-5 py-3 text-left text-sm font-bold text-ink-500">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heldProducts.map(product => (
                  <tr key={product.id} className="border-b border-ink-700/60 hover:bg-ink-900/30">
                    <td className="px-5 py-4">
                      <Link href="/dpp/readiness" className="font-semibold text-ink-100 hover:text-accent-700">
                        {product.name}
                      </Link>
                      <div className="mt-1 text-sm text-ink-500">{product.customer} · {product.model}</div>
                    </td>
                    <td className="px-5 py-4">
                      <ReadinessBar value={product.readiness} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-700">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        {product.blocker}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel
            title="발행 지연 원인"
            count={`${centerProducts.filter(product => product.blocker).length}건`}
            description="그래프 대신 원인별 제품 수를 리스트로 보여줍니다."
            action={<button onClick={() => setModalKey('blockers')} className="text-sm font-semibold text-accent-800">전체 보기</button>}
          >
            <div className="divide-y divide-ink-700">
              {blockerRows.map(row => {
                const Icon = row.icon;
                return (
                  <button
                    key={row.key}
                    onClick={() => setModalKey(`blocker:${row.key}`)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-ink-900/30"
                  >
                    <Icon className={clsx('h-6 w-6 shrink-0', row.tone)} />
                    <span className="flex-1 text-sm font-medium text-ink-100">{row.label}</span>
                    <span className={clsx('num-mono text-sm font-semibold', row.products.length > 0 ? row.tone : 'text-ink-500')}>
                      {row.products.length}건
                    </span>
                    <ChevronRight className="h-5 w-5 text-ink-500" />
                  </button>
                );
              })}
            </div>
          </Panel>
        </section>

        <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1fr_1.05fr]">
          <Panel
            title="HITL 검토 대기"
            count={`${hitlProducts.length}건`}
            description="AI 신뢰도가 낮아 사람 검토가 필요한 항목입니다."
            action={<ActionButton testId="dpp-center-hitl-all" onClick={() => setModalKey('hitl')}>전체 HITL 보기</ActionButton>}
          >
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-ink-700 bg-ink-900/30">
                  {['제품명', '검토 이슈', 'AI 신뢰도'].map(head => (
                    <th key={head} className="px-5 py-3 text-left text-sm font-bold text-ink-500">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hitlProducts.map(product => (
                  <tr key={product.id} className="border-b border-ink-700/60 hover:bg-ink-900/30">
                    <td className="px-5 py-4">
                      <Link href="/hitl" className="font-semibold text-ink-100 hover:text-accent-700">
                        {product.name}
                      </Link>
                      <div className="mt-1 text-sm text-ink-500">{product.supplier}</div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-ink-300">{product.issue}</td>
                    <td className="px-5 py-4">
                      <ReadinessBar value={product.confidence ?? 0} warn />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel
            title="최근 발행 이력"
            count={`${issuedProducts.length}건`}
            description={`최근 ${recentDays}일간 발행된 DPP를 빠르게 열람합니다.`}
            action={
              <select
                value={recentDays}
                onChange={(event) => setRecentDays(event.target.value)}
                data-testid="dpp-center-recent-days"
                className="rounded-sm border border-ink-700 bg-white px-3 py-2 text-sm font-semibold text-ink-300 outline-none hover:border-accent-600 focus:border-accent-600"
                aria-label="최근 발행 기간"
              >
                <option value="7">7일</option>
                <option value="14">14일</option>
                <option value="30">30일</option>
              </select>
            }
          >
            <div className="divide-y divide-ink-700">
              {issuedProducts.map(product => (
                <Link
                  key={product.id}
                  href="/dpp"
                  className="flex items-center gap-4 px-5 py-4 hover:bg-ink-900/30"
                >
                  <FileBadge className="h-6 w-6 shrink-0 text-emerald-700" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num-mono text-sm font-semibold text-ink-100">{product.dppId}</span>
                      <Badge tone="ok">발행 완료</Badge>
                    </div>
                    <div className="mt-1 text-sm font-medium text-ink-300">{product.name}</div>
                  </div>
                  <div className="hidden text-right text-sm text-ink-500 md:block">
                    <div>{product.supplier}</div>
                    <div className="num-mono">{product.issuedAt}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-ink-500" />
                </Link>
              ))}
            </div>
            <div className="border-t border-ink-700 p-4">
              <Link
                href="/dpp"
                data-testid="dpp-center-history-all"
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-ink-700 bg-white px-4 py-3 text-sm font-semibold text-ink-300 hover:border-accent-600 hover:text-accent-700"
              >
                전체 발행 이력 보기
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </Panel>
        </section>
      </div>

      {modalKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-100/45 p-6">
          <div className="w-full max-w-3xl overflow-hidden rounded-sm border border-ink-700 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-ink-100">{modalTitle}</h2>
                <p className="mt-1 text-sm font-medium text-ink-500">{modalProducts.length}개 제품이 해당 조건에 포함됩니다.</p>
              </div>
              <button onClick={() => setModalKey(null)} data-testid="dpp-center-modal-close" className="rounded-sm p-2 text-ink-500 hover:bg-ink-800 hover:text-ink-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {modalProducts.length > 0 ? (
                modalProducts.map(product => (
                  <Link
                    key={product.id}
                    href={product.targetHref}
                    className="flex items-center gap-4 border-b border-ink-700 px-6 py-4 hover:bg-ink-900/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink-100">{product.name}</div>
                      <div className="mt-1 text-sm text-ink-500">{product.customer} · {product.model} · {product.supplier}</div>
                    </div>
                    <ReadinessPill value={product.readiness} />
                    <ChevronRight className="h-5 w-5 text-ink-500" />
                  </Link>
                ))
              ) : (
                <div className="px-6 py-10 text-center text-base font-medium text-ink-500">
                  해당 조건의 제품이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function KpiButton({
  label,
  count,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  tone: 'green' | 'orange' | 'indigo' | 'red' | 'blue';
  onClick: () => void;
}) {
  const toneClass = {
    green: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    orange: 'border-orange-300 bg-orange-50 text-orange-900',
    indigo: 'border-indigo-300 bg-indigo-50 text-indigo-900',
    red: 'border-red-300 bg-red-50 text-red-900',
    blue: 'border-sky-300 bg-sky-50 text-sky-900',
  }[tone];
  const valueClass = {
    green: 'text-emerald-700',
    orange: 'text-orange-700',
    indigo: 'text-indigo-700',
    red: 'text-red-700',
    blue: 'text-blue-700',
  }[tone];

  return (
    <button
      onClick={onClick}
      className={clsx('flex min-h-[56px] items-center justify-between rounded-sm border px-4 py-3 text-left shadow-control transition-colors hover:bg-white', toneClass)}
    >
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={clsx('num-mono text-xl font-semibold', valueClass)}>{count}</span>
        <span className="text-sm font-medium text-ink-500">건</span>
      </div>
    </button>
  );
}

function Panel({ title, count, description, action, children }: {
  title: string;
  count: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
      <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-ink-100">{title}</h2>
            <span className="rounded-full bg-accent-50 px-2.5 py-1 text-sm font-semibold text-accent-800">{count}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-ink-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function ActionButton({ children, onClick, testId }: { children: React.ReactNode; onClick: () => void; testId: string }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="inline-flex items-center gap-1.5 rounded-sm border border-ink-700 bg-white px-3 py-2 text-sm font-semibold text-ink-300 hover:border-accent-600 hover:text-accent-700"
    >
      {children}
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}

function ReadinessBar({ value, warn = false }: { value: number; warn?: boolean }) {
  const color = warn || value < 75 ? 'bg-orange-500' : value < 90 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex min-w-[150px] items-center gap-3">
      <span className="num-mono w-12 text-sm font-semibold text-ink-100">{value}%</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-700">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ReadinessPill({ value }: { value: number }) {
  return (
    <span className="rounded-full border border-ink-700 px-3 py-1 text-sm font-semibold text-ink-200">
      {value}% ready
    </span>
  );
}
