'use client';

// 공급망 목록(랜딩) — 지금까지 생성된 모든 공급망을 (제품 × BOM 버전=생산기간) 단위로 묶어 보여준다.
// 단위기간 범위로 필터하면 그 기간에 생산(=납품)된 적이 있는 공급망만 추려진다.
// 행을 누르면 해당 공급망의 맵 허브(/supply-chain/map?productId=…)로 진입한다.
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Database, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import {
  ApiError,
  getToken,
  getProductBomVersions,
  getProductSupplyChainMap,
  getProducts,
} from '@/lib/api';
import {
  apiProductsToDataset,
  buildSupplyChainList,
  chainOverlapsPeriod,
  chainRiskMeta,
  chainStatusMeta,
  emptyDataset,
  mergeSupplyChainMap,
  mockDataset,
  type BomVersion,
  type SupplyChainDataset,
  type SupplyChainSummary,
} from '@/lib/supply-chain-mock';

export default function SupplyChainListPage() {
  const router = useRouter();
  const [chains, setChains] = useState<SupplyChainSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  // 검색/필터 — 제품·고객사·단위기간. 'ALL'/빈 값이면 전체.
  const [filterProduct, setFilterProduct] = useState('ALL');
  const [filterCustomer, setFilterCustomer] = useState('ALL');
  // 단위기간(생산기간) 범위 필터 — 빈 값이면 전체. 겹치는(overlap) 공급망만 표시.
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  // 조회 상태 알림: 'auth'=토큰 없음/401·403, 'error'=그 외 실패, null=정상
  const [loadStatus, setLoadStatus] = useState<'auth' | 'error' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadStatus(null);
      if (!getToken()) {
        if (!cancelled) {
          setLoadStatus('auth');
          setLoading(false);
        }
        return;
      }
      try {
        const apiProducts = await getProducts();
        // 제품마다 모든 BOM 버전(생산 Lot)을 돌며 §10.2a 맵을 조회 → 맵이 있는 버전마다 공급망 1건.
        // (같은 제품의 기간별 Lot도 각각 별도 공급망으로 잡힌다 — 예: GLC 2024 / 2025.)
        const perProduct = await Promise.all(
          apiProducts.map(async p => {
            const versions = await getProductBomVersions(p.productId).catch(() => []);
            const versionMaps = await Promise.all(
              versions.map(async v => {
                try {
                  const map = await getProductSupplyChainMap(p.productId, { bomVersionId: v.bomVersionId });
                  return map.supplyChainMap.length > 0 ? { version: v, map } : null;
                } catch {
                  return null;
                }
              }),
            );
            return { productId: p.productId, versionMaps: versionMaps.filter(Boolean) };
          }),
        );

        let ds: SupplyChainDataset = { ...emptyDataset, products: apiProductsToDataset(apiProducts) };
        for (const { productId, versionMaps } of perProduct) {
          for (const vm of versionMaps) {
            if (!vm) continue;
            const { version, map } = vm;
            const bomVersion: BomVersion = {
              bom_version_id: version.bomVersionId,
              product_id: productId,
              version_number: version.versionNumber,
              effective_from: version.productionFrom ?? '',
              effective_to: version.productionTo,
              status: (version.status as BomVersion['status']) ?? 'active',
              source_system: version.sourceSystem ?? 'API',
            };
            ds = { ...ds, bom_versions: [...ds.bom_versions, bomVersion] };
            ds = mergeSupplyChainMap(ds, productId, version.bomVersionId, map);
          }
        }

        if (!cancelled) setChains(buildSupplyChainList(ds));
      } catch (e) {
        if (!cancelled) {
          setLoadStatus(e instanceof ApiError && (e.status === 401 || e.status === 403) ? 'auth' : 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 필터 드롭다운 옵션 — 현재 공급망에서 제품·고객사 고유값 추출.
  const productOptions = useMemo(() => {
    const seen = new Map<string, string>();
    chains.forEach(c => { if (!seen.has(c.product_id)) seen.set(c.product_id, c.product_name); });
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [chains]);
  const customerOptions = useMemo(
    () => Array.from(new Set(chains.map(c => c.customer_name).filter(Boolean))),
    [chains],
  );

  // 제품·고객사·단위기간 필터 적용(단위기간은 겹치는 공급망만).
  const visibleChains = useMemo(
    () =>
      chains.filter(
        c =>
          (filterProduct === 'ALL' || c.product_id === filterProduct) &&
          (filterCustomer === 'ALL' || c.customer_name === filterCustomer) &&
          chainOverlapsPeriod(c, filterFrom || undefined, filterTo || undefined),
      ),
    [chains, filterProduct, filterCustomer, filterFrom, filterTo],
  );

  const anyFilterActive = filterProduct !== 'ALL' || filterCustomer !== 'ALL' || Boolean(filterFrom) || Boolean(filterTo);
  function resetFilters() {
    setFilterProduct('ALL');
    setFilterCustomer('ALL');
    setFilterFrom('');
    setFilterTo('');
  }

  function loadDemo() {
    setIsDemo(true);
    setLoadStatus(null);
    setChains(buildSupplyChainList(mockDataset));
  }

  function openChain(chain: SupplyChainSummary) {
    const params = new URLSearchParams({ productId: chain.product_id });
    if (chain.bom_version_id) params.set('bomVersionId', chain.bom_version_id);
    if (chain.period_from) params.set('periodFrom', chain.period_from);
    if (chain.period_to) params.set('periodTo', chain.period_to);
    router.push(`/supply-chain/map?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-white text-ink-100">
      <PageHeader
        title="공급망 목록"
        badge="공급망 워크스페이스"
        description="지금까지 생성된 공급망을 제품·고객사·단위기간 단위로 모아 봅니다"
        tabs={[
          { label: '공급망 목록', href: '/supply-chain', active: true },
          { label: '공급망 맵', href: '/supply-chain/map' },
        ]}
        actions={
          <button
            type="button"
            onClick={loadDemo}
            disabled={isDemo}
            className="inline-flex items-center gap-1.5 rounded border-[0.5px] border-[#CBD5E1] px-2.5 py-1.5 text-[11px] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            <Database className="h-3.5 w-3.5" />
            {isDemo ? '데모 데이터 로드됨' : '데모 데이터'}
          </button>
        }
      />

      <div className="p-6">
        {loadStatus === 'auth' && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">로그인이 필요합니다</p>
              <p className="text-red-700/90">
                인증 토큰이 없거나 만료됐습니다(401/403). 다시 로그인한 뒤 새로고침하세요. 또는 데모 데이터로 확인하세요.
              </p>
            </div>
          </div>
        )}
        {loadStatus === 'error' && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">공급망 목록을 불러오지 못했습니다</p>
              <p className="text-amber-700/90">백엔드 응답 오류 또는 네트워크 문제입니다. 잠시 후 다시 시도하거나 데모 데이터로 확인하세요.</p>
            </div>
          </div>
        )}

        <section className="mb-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">제품</span>
            <select
              value={filterProduct}
              onChange={e => setFilterProduct(e.target.value)}
              className="h-10 min-w-[180px] rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-ink-400 shadow-sm outline-none focus:border-ok-border"
            >
              <option value="ALL">전체 제품</option>
              {productOptions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">고객사</span>
            <select
              value={filterCustomer}
              onChange={e => setFilterCustomer(e.target.value)}
              className="h-10 min-w-[160px] rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-ink-400 shadow-sm outline-none focus:border-ok-border"
            >
              <option value="ALL">전체 고객사</option>
              {customerOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">단위기간 (생산기간) 시작</span>
            <input
              type="date"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-ink-400 shadow-sm outline-none focus:border-ok-border"
              aria-label="단위기간 시작"
            />
          </label>
          <span className="pb-2.5 text-xs font-bold text-slate-400">~</span>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">단위기간 종료</span>
            <input
              type="date"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-ink-400 shadow-sm outline-none focus:border-ok-border"
              aria-label="단위기간 종료"
            />
          </label>
          {anyFilterActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-500 shadow-sm hover:bg-slate-50"
            >
              필터 초기화
            </button>
          )}
          <span className="pb-2.5 text-xs font-medium text-slate-400">
            이 기간에 생산(=납품)된 적이 있는 공급망만 표시합니다.
          </span>
        </section>

        <ChainListBody
          loading={loading}
          chains={visibleChains}
          totalCount={chains.length}
          onOpen={openChain}
        />
      </div>
    </div>
  );
}

function ChainListBody({
  loading,
  chains,
  totalCount,
  onOpen,
}: {
  loading: boolean;
  chains: SupplyChainSummary[];
  totalCount: number;
  onOpen: (chain: SupplyChainSummary) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-slate-300 bg-slate-50 px-6 py-20 text-sm font-semibold text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        공급망 목록 불러오는 중…
      </div>
    );
  }

  if (chains.length === 0) {
    // 전체는 있는데 현재 기간 필터에 안 걸린 경우 vs 애초에 생성된 공급망이 없는 경우 구분.
    const filtered = totalCount > 0;
    return (
      <div className="rounded-sm border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
        <div className="text-base font-bold text-ink-100">
          {filtered ? '이 기간에 해당하는 공급망이 없습니다' : '생성된 공급망이 없습니다'}
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {filtered
            ? '단위기간을 넓히거나 초기화해 보세요.'
            : '제품의 공급망 맵이 형성되면 여기에 표시됩니다. 시연하려면 우측 상단 “데모 데이터”를 사용하세요.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-sm font-bold text-ink-100">공급망</span>
        <span className="text-sm font-bold text-brand">{chains.length}건</span>
      </div>

      <section className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['제품', '고객사', '단위기간', '협력사 수', '상태', '리스크', '갱신일', ''].map(header => (
                  <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chains.map(chain => (
                <tr
                  key={chain.chain_id}
                  onClick={() => onOpen(chain)}
                  className="cursor-pointer transition hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-bold text-ink-100">{chain.product_name}</div>
                    <div className="mt-0.5 font-mono text-xs text-slate-500">{chain.product_code}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-400">{chain.customer_name || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-400">{formatPeriod(chain)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink-300">
                    {chain.completed_supplier_count}/{chain.supplier_count}개사
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={chain.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <RiskBadge level={chain.risk_level} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-400">{formatDate(chain.last_updated)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                      열기
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function RiskBadge({ level }: { level: SupplyChainSummary['risk_level'] }) {
  const meta = chainRiskMeta[level];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: SupplyChainSummary['status'] }) {
  const meta = chainStatusMeta[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function formatPeriod(chain: SupplyChainSummary) {
  if (!chain.period_from) return '-';
  return `${chain.period_from} ~ ${chain.period_to ?? '진행중'}`;
}

function formatDate(value: string) {
  if (!value) return '-';
  return value.slice(0, 10);
}
