'use client';

// 공급망 목록(랜딩) — 지금까지 생성된 모든 공급망을 (제품 × 고객사 × 단위기간)으로 묶어 보여준다.
// 행을 누르면 해당 공급망의 맵 허브(/supply-chain/map?productId=…)로 진입한다.
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Database, Loader2, Network } from 'lucide-react';
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
  chainRiskMeta,
  emptyDataset,
  isSentinelPeriod,
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
        // 제품별로 현재 BOM 버전 + §10.2a 공급망 맵을 모아 하나의 데이터셋으로 접는다.
        const perProduct = await Promise.all(
          apiProducts.map(async p => {
            const versions = await getProductBomVersions(p.productId).catch(() => []);
            const current = versions.find(v => v.isCurrent) ?? versions[0];
            if (!current) return null;
            try {
              const map = await getProductSupplyChainMap(p.productId, { bomVersionId: current.bomVersionId });
              return { productId: p.productId, current, map };
            } catch {
              // 맵 미형성/미배포 — 목록에서 제외
              return null;
            }
          }),
        );

        let ds: SupplyChainDataset = { ...emptyDataset, products: apiProductsToDataset(apiProducts) };
        for (const entry of perProduct) {
          if (!entry || entry.map.supplyChainMap.length === 0) continue;
          const { productId, current, map } = entry;
          const bomVersion: BomVersion = {
            bom_version_id: current.bomVersionId,
            product_id: productId,
            version_number: current.versionNumber,
            effective_from: current.productionFrom ?? '',
            effective_to: current.productionTo,
            status: (current.status as BomVersion['status']) ?? 'active',
            source_system: current.sourceSystem ?? 'API',
          };
          ds = { ...ds, bom_versions: [...ds.bom_versions, bomVersion] };
          ds = mergeSupplyChainMap(ds, productId, current.bomVersionId, map);
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

  function loadDemo() {
    setIsDemo(true);
    setLoadStatus(null);
    setChains(buildSupplyChainList(mockDataset));
  }

  function openChain(chain: SupplyChainSummary) {
    const params = new URLSearchParams({ productId: chain.product_id });
    if (chain.bom_version_id) params.set('bomVersionId', chain.bom_version_id);
    if (!isSentinelPeriod(chain.period_from, chain.period_to)) {
      params.set('periodFrom', chain.period_from);
      params.set('periodTo', chain.period_to);
    }
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

        <ChainListBody loading={loading} chains={chains} onOpen={openChain} />
      </div>
    </div>
  );
}

function ChainListBody({
  loading,
  chains,
  onOpen,
}: {
  loading: boolean;
  chains: SupplyChainSummary[];
  onOpen: (chain: SupplyChainSummary) => void;
}) {
  const summary = useMemo(() => {
    const high = chains.filter(c => c.risk_level === 'high').length;
    const medium = chains.filter(c => c.risk_level === 'medium').length;
    return { total: chains.length, high, medium };
  }, [chains]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-20 text-sm font-semibold text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        공급망 목록 불러오는 중…
      </div>
    );
  }

  if (chains.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
        <div className="text-base font-bold text-ink-100">생성된 공급망이 없습니다</div>
        <p className="mt-2 text-sm text-slate-500">
          제품의 공급망 맵이 형성되면 여기에 표시됩니다. 시연하려면 우측 상단 “데모 데이터”를 사용하세요.
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="mb-4 grid grid-cols-3 gap-4">
        <SummaryCard label="전체 공급망" value={summary.total} hint="건" />
        <SummaryCard label="고위험" value={summary.high} hint="건" tone="high" />
        <SummaryCard label="중위험" value={summary.medium} hint="건" tone="medium" />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['제품', '고객사', '단위기간', '협력사 수', '리스크', '갱신일', ''].map(header => (
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
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink-300">{chain.supplier_count}개사</td>
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

function SummaryCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: number;
  hint: string;
  tone?: 'default' | 'high' | 'medium';
}) {
  const color = tone === 'high' ? 'text-red-600' : tone === 'medium' ? 'text-amber-600' : 'text-ink-100';
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <Network className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`mt-2 text-3xl font-black ${color}`}>
        {value}
        <span className="ml-1 text-sm font-bold text-slate-400">{hint}</span>
      </div>
    </div>
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

function formatPeriod(chain: SupplyChainSummary) {
  if (isSentinelPeriod(chain.period_from, chain.period_to)) return '전체';
  return `${chain.period_from} ~ ${chain.period_to}`;
}

function formatDate(value: string) {
  if (!value) return '-';
  return value.slice(0, 10);
}
