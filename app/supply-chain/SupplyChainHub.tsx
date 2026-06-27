'use client';

// 원청 공급망 맵 허브 — 8단계 흐름과 팝업을 오케스트레이션하는 컨테이너
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowRight, Database, Loader2, Network } from 'lucide-react';
import type { SelectedNode, SupplyChainDataset } from '@/lib/supply-chain-mock';
import { apiProductsToDataset, emptyDataset, mergeBomVersions, mergeProductBom, mergeSupplyChainMap, mockDataset, supplierDetailIdMap } from '@/lib/supply-chain-mock';
import { ApiError, getToken, getProductBom, getProductBomVersions, getProductSupplyChainMap, getProducts, type SupplierBrief } from '@/lib/api';
import { SupplyChainMapPageContent } from './SupplyChainMapPageContent';
import PageHeader from '@/components/PageHeader';
import HubStepBar from '@/components/supply-chain/HubStepBar';
import PoolModal from '@/components/supply-chain/PoolModal';
import SupplierInfoModal from '@/components/supply-chain/SupplierInfoModal';
import DataRequestModal from '@/components/supply-chain/DataRequestModal';
import InviteMailModal from '@/components/supply-chain/InviteMailModal';
import MapManageModal from '@/components/supply-chain/MapManageModal';

export type HubModal = null | 'pool' | 'supplierInfo' | 'dataRequest' | 'invite' | 'mapManage';

export default function SupplyChainHub() {
  // 공급망 목록에서 특정 공급망을 누르고 들어오면 productId(+bomVersionId)로 해당 Lot을 선택해 연다.
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('productId') ?? undefined;
  const initialBomVersionId = searchParams.get('bomVersionId') ?? undefined;
  const [pool, setPool] = useState<SupplierBrief[]>([]);
  // STEP 2 Pool 후보 — 선택된 제품의 §10.2a 맵 tier-1 협력사만. 제품 미선택이면 빈 배열.
  const [tier1Pool, setTier1Pool] = useState<SupplierBrief[]>([]);
  // 순차 게이팅용 — STEP 1(제품 선택) 완료 여부. URL productId로 진입 시 초기값.
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(initialProductId);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [activeModal, setActiveModal] = useState<HubModal>(null);
  // 사용자가 수행한 액션 단계(4~7). STEP 1~3은 데이터 상태로 자동 판정.
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set());
  // 맵 관리에서 시작한 자료요청은 협력사명을 직접 지정 (없으면 선택 노드 기준)
  const [requestLabel, setRequestLabel] = useState<string | null>(null);

  // 트리에 주입할 데이터셋 — 기본 빈 상태. 제품은 API, 공급망은 형성으로 채운다.
  const [dataset, setDataset] = useState<SupplyChainDataset>(emptyDataset);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  // 조회 상태 알림: 'auth'=토큰 없음/401·403, 'error'=그 외 실패, null=정상
  const [loadStatus, setLoadStatus] = useState<'auth' | 'error' | null>(null);

  // 완료 단계 집합 — STEP1(제품선택)·2·3(Pool확정 자동맵핑)은 상태 기반, 4~7은 액션 수행 시.
  const completed = useMemo(() => {
    const s = new Set<number>(visitedSteps);
    if (selectedProductId) s.add(1);
    if (pool.length > 0) { s.add(2); s.add(3); }
    return s;
  }, [visitedSteps, selectedProductId, pool.length]);
  const markVisited = (n: number) => setVisitedSteps(prev => (prev.has(n) ? prev : new Set(prev).add(n)));

  // ④ 진입 게이트 — 첫 진입 시 빈 상태에서 '맵 생성하기'로 제품을 고르고 맵을 연다. URL 제품 진입·데모는 게이트 스킵.
  const [mapStarted, setMapStarted] = useState(Boolean(initialProductId));
  const [entryProductId, setEntryProductId] = useState(initialProductId ?? '');

  // 진입 시 제품 목록 조회. 토큰 없음/401·403은 알림으로 표면화(조용한 빈 화면 방지).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProductsLoading(true);
      setLoadStatus(null);
      if (!getToken()) {
        // 토큰 자체가 없음 — 로그인 필요
        if (!cancelled) {
          setLoadStatus('auth');
          setProductsLoading(false);
        }
        return;
      }
      try {
        const apiProducts = await getProducts();
        if (!cancelled) setDataset({ ...emptyDataset, products: apiProductsToDataset(apiProducts) });
      } catch (e) {
        if (!cancelled) {
          setLoadStatus(e instanceof ApiError && (e.status === 401 || e.status === 403) ? 'auth' : 'error');
        }
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 제품 선택 시: BOM(버전·트리) + §10.2a 공급망 맵을 조회해 데이터셋에 병합.
  // 각 호출은 graceful — 미구현/미배포 백엔드면 해당 부분만 건너뛴다(데모 모드면 mock 유지).
  async function handleProductChange(productId: string) {
    if (isDemo) return;

    // STEP 1 완료 표시. 제품이 바뀌면 이전 제품 기준 Pool 후보·확정 선택은 무효이므로 초기화.
    setSelectedProductId(productId);
    setTier1Pool([]);
    setPool([]);

    // 1) BOM 버전 목록(실 bomVersionId) — 없으면 트리 합성 버전으로 폴백
    let versions: Awaited<ReturnType<typeof getProductBomVersions>> = [];
    try {
      versions = await getProductBomVersions(productId);
    } catch {
      // 구버전 백엔드 — 합성 버전 사용
    }
    // 목록에서 특정 Lot으로 진입했으면(URL bomVersionId) 그 버전을 우선 사용 — 단, 이 제품의 버전일 때만.
    const preferredVersionId =
      initialBomVersionId && versions.some(v => v.bomVersionId === initialBomVersionId)
        ? initialBomVersionId
        : undefined;
    const activeVersionId =
      preferredVersionId ?? versions.find(v => v.isCurrent)?.bomVersionId ?? versions[0]?.bomVersionId;

    // 2) BOM 버전 목록(드롭다운)은 트리 조회 성공 여부와 무관하게 먼저 등록.
    //    백엔드 /bom 트리가 404("active BOM 없음")여도 /bom-versions는 버전을 주므로 BOM 정보는 떠야 한다.
    setDataset(ds => mergeBomVersions(ds, productId, versions));

    // 3) BOM 트리 → 평면(부품/항목). 트리가 없으면 버전만 유지.
    try {
      const bom = await getProductBom(productId, activeVersionId);
      setDataset(ds => mergeProductBom(ds, productId, bom, versions));
    } catch {
      // BOM 트리 없음/404 — 버전 목록은 위에서 이미 반영됨
    }

    // 4) §10.2a 공급망 맵(협력사·공장·비율). 미구현/빈 데이터면 건너뜀.
    if (activeVersionId) {
      try {
        const map = await getProductSupplyChainMap(productId, { bomVersionId: activeVersionId });
        setDataset(ds => mergeSupplyChainMap(ds, productId, activeVersionId, map));
        // STEP 2 Pool 후보 = 이 제품의 '1차 협력사'(OEM 바로 아래 단계) 협력사만 (전역 목록 금지).
        // 1차 정의: 차수 SSOT = supply_chain_map.hop_level(원청=0, 1차=1). 스키마 보장 축.
        //   hop_level 미배포(undefined) 백엔드면 tierLevel 최소 비-0으로 폴백.
        const hasHop = map.supplyChainMap.some(n => typeof n.hopLevel === 'number');
        let tier1Ids: Set<string>;
        if (hasHop) {
          tier1Ids = new Set(
            map.supplyChainMap.filter(n => n.hopLevel === 1).map(n => n.supplierId),
          );
        } else {
          const levels = map.supplyChainMap.map(n => n.tierLevel).filter((t): t is number => typeof t === 'number');
          const nonZero = levels.filter(t => t > 0);
          const firstTier = nonZero.length ? Math.min(...nonZero) : (levels.length ? Math.min(...levels) : null);
          tier1Ids = new Set(
            map.supplyChainMap.filter(n => n.tierLevel === firstTier).map(n => n.supplierId),
          );
        }
        setTier1Pool(
          map.suppliers
            .filter(s => tier1Ids.has(s.supplierId))
            .map(s => ({
              supplierId: s.supplierId,
              companyName: s.companyName,
              providerType: s.providerType,
              status: s.status as SupplierBrief['status'],
              riskLevel: s.riskLevel ?? 'low',
            })),
        );
      } catch {
        // 공급망 맵 없음 — 협력사 빈 상태 유지
      }
    }
  }

  function loadDemo() {
    setIsDemo(true);
    setMapStarted(true); // 데모는 진입 게이트 건너뛰고 바로 맵 표시
    setDataset(mockDataset);
    setSelectedProductId(mockDataset.products[0]?.product_id);
    // 데모도 동일 규칙 — tier-1 협력사만 Pool 후보로.
    setTier1Pool(
      mockDataset.suppliers
        .filter(s => s.tier === 1)
        .map(s => ({
          supplierId: s.supplier_id,
          companyName: s.company_name,
          providerType: s.provider_type,
          status: s.status as SupplierBrief['status'],
          riskLevel: s.risk_level,
        })),
    );
  }

  // 선택 노드의 mock supplier_id → 실 supplierId 브리지 (매핑 없으면 undefined)
  const activeMockSupplierId = selectedNode
    ? selectedNode.type === 'product'
      ? selectedNode.rows[0]?.supplier_id
      : selectedNode.row.supplier_id
    : undefined;
  // mock 브리지에 매핑이 있으면 그걸, 없으면(실데이터 UUID) supplier_id 자체를 사용 → STEP4가 실 협력사로 조회.
  const activeSupplierId = activeMockSupplierId
    ? supplierDetailIdMap[activeMockSupplierId] ?? activeMockSupplierId
    : undefined;
  const activeNodeLabel = selectedNode
    ? selectedNode.type === 'product'
      ? selectedNode.product.product_name
      : selectedNode.row.part_name
    : '선택 노드';

  // 원청(자기 자신=Tier 0/제품 루트)은 협력사가 아니므로 정보확인·자료요청 대상이 아니다(STEP4·5 비활성).
  const isOemNode = !!selectedNode && (
    selectedNode.type === 'product' || selectedNode.row.tier === 'Tier 0'
  );
  const requestableSelection = !!selectedNode && !isOemNode;

  const close = () => setActiveModal(null);

  return (
    <div className="min-h-screen bg-white text-ink-100">
      <PageHeader
        title="공급망 맵 허브"
        description="대표 제품을 고르고 MBOM 기준으로 1차 협력사를 자동 맵핑한 뒤, 협력사 정보 확인·자료 요청·초대·만료 관리까지 관리합니다.
      </p>"
        tabs={[
          { label: '공급망 목록', href: '/supply-chain' },
          { label: '공급망 맵', href: '/supply-chain/map', active: true },
        ]}
      >
        <HubStepBar
          poolCount={pool.length}
          hasSelection={requestableSelection}
          hasProduct={Boolean(selectedProductId)}
          completed={completed}
          onOpenPool={() => setActiveModal('pool')}
          onOpenSupplierInfo={() => { markVisited(4); setActiveModal('supplierInfo'); }}
          onOpenDataRequest={() => { markVisited(5); setActiveModal('dataRequest'); }}
          onOpenInvite={() => { markVisited(6); setActiveModal('invite'); }}
          onOpenMapManage={() => { markVisited(7); setActiveModal('mapManage'); }}
        />
      </PageHeader>

      {loadStatus === null && !productsLoading && dataset.products.length > 0 && mapStarted && (
        <FlowGuide
          hasProduct={Boolean(selectedProductId)}
          poolCount={pool.length}
          tier1Count={tier1Pool.length}
          hasSelection={Boolean(selectedNode)}
          onOpenPool={() => setActiveModal('pool')}
        />
      )}

      {loadStatus === 'auth' && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">로그인이 필요합니다</p>
            <p className="text-red-700/90">
              인증 토큰이 없거나 만료됐습니다(401/403). 다시 로그인한 뒤 새로고침하세요. 제품·BOM·협력사 데이터는 인증 후 표시됩니다.
            </p>
          </div>
        </div>
      )}
      {loadStatus === 'error' && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">제품을 불러오지 못했습니다</p>
            <p className="text-amber-700/90">백엔드 응답 오류 또는 네트워크 문제입니다. 잠시 후 다시 시도하거나 데모 데이터로 확인하세요.</p>
          </div>
        </div>
      )}
      {!productsLoading && loadStatus === null && !isDemo && dataset.products.length === 0 && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">표시할 제품이 없습니다</p>
            <p className="text-amber-700/90">
              로그인 계정의 테넌트에 연결된 제품이 없습니다(<code>products.tenant_id</code>). 백엔드 시드/테넌트 매핑을 확인하세요.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 px-6 pt-4">
        {productsLoading && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            제품 불러오는 중…
          </span>
        )}
        <button
          type="button"
          onClick={loadDemo}
          disabled={isDemo}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-brand hover:text-brand disabled:opacity-50"
        >
          <Database className="h-3.5 w-3.5" />
          {isDemo ? '데모 데이터 로드됨' : '데모 데이터 불러오기'}
        </button>
      </div>

      {/* ④ 진입 게이트: 첫 진입 시 빈 상태 → 제품 선택 + '맵 생성하기' */}
      {!mapStarted && loadStatus === null && !productsLoading && dataset.products.length > 0 && (
        <div className="mx-6 mt-6 rounded-md border border-slate-200 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-bg text-ok-text">
            <Network className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink-100">공급망 맵 생성</h2>
          <p className="mt-1 text-sm text-slate-500">
            대표 제품을 선택하고 맵을 생성하면, 해당 제품의 1차 협력사부터 자동 맵핑됩니다.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <select
              value={entryProductId || dataset.products[0]?.product_id || ''}
              onChange={e => setEntryProductId(e.target.value)}
              className="min-w-[260px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink-100 focus:border-brand focus:outline-none"
            >
              {dataset.products.map(prod => (
                <option key={prod.product_id} value={prod.product_id}>{prod.product_name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const chosen = entryProductId || dataset.products[0]?.product_id || '';
                setEntryProductId(chosen);
                setMapStarted(true);
                if (chosen) handleProductChange(chosen); // Hub 상태(STEP1 완료) + BOM/맵 로드 즉시 보장
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-hover"
            >
              <ArrowRight className="h-4 w-4" />
              맵 생성하기
            </button>
          </div>
        </div>
      )}

      {mapStarted && (
        <SupplyChainMapPageContent
          dataset={dataset}
          embedded
          initialProductId={initialProductId ?? entryProductId}
          initialBomVersionId={initialBomVersionId}
          highlightSupplierIds={new Set(pool.map(s => s.supplierId))}
          onNodeSelect={setSelectedNode}
          onConnectClick={() => setActiveModal('invite')}
          onProductChange={handleProductChange}
        />
      )}

      {activeModal === 'pool' && (
        <PoolModal
          candidates={tier1Pool}
          initialPool={pool}
          onClose={close}
          onConfirm={selected => {
            setPool(selected);
            close();
          }}
        />
      )}

      {activeModal === 'supplierInfo' && (
        <SupplierInfoModal
          supplierId={activeSupplierId}
          nodeLabel={activeNodeLabel}
          onClose={close}
          onRequestUpdate={() => {
            setRequestLabel(null);
            setActiveModal('dataRequest');
          }}
        />
      )}

      {activeModal === 'dataRequest' && (
        <DataRequestModal
          supplierLabel={requestLabel ?? (activeSupplierId ? `${activeNodeLabel} · ${activeSupplierId}` : activeNodeLabel)}
          onClose={() => {
            setRequestLabel(null);
            close();
          }}
          onBack={() => setActiveModal(requestLabel ? 'mapManage' : 'supplierInfo')}
        />
      )}

      {activeModal === 'invite' && (
        <InviteMailModal pool={pool} onClose={close} />
      )}

      {activeModal === 'mapManage' && (
        <MapManageModal
          pool={pool}
          onClose={close}
          onRequestUpdate={supplier => {
            setRequestLabel(supplier.companyName);
            setActiveModal('dataRequest');
          }}
        />
      )}
    </div>
  );
}

// 흐름 안내 배너 — 현재 단계와 '다음 할 일'을 상태 기반으로 명시(사용자가 다음 액션을 알 수 있게).
function FlowGuide({
  hasProduct, poolCount, tier1Count, hasSelection, onOpenPool,
}: {
  hasProduct: boolean; poolCount: number; tier1Count: number; hasSelection: boolean; onOpenPool: () => void;
}) {
  let step: string, title: string, desc: string, tone: 'info' | 'warn' | 'ok', cta = false;
  if (!hasProduct) {
    step = 'STEP 1'; tone = 'info';
    title = '대표 제품을 선택하세요';
    desc = '아래 표의 "제품" 드롭다운에서 대표 제품을 고르면 공급망 맵 구성이 시작됩니다.';
  } else if (poolCount === 0 && tier1Count === 0) {
    step = 'STEP 2'; tone = 'warn';
    title = '이 제품은 다음 단계로 진행할 수 없습니다';
    desc = '등록된 1차 협력사가 없어 협력사 Pool을 구성할 수 없습니다. 다른 제품을 선택하세요.';
  } else if (poolCount === 0) {
    step = 'STEP 2'; tone = 'info'; cta = true;
    title = '협력사 Pool을 구성하세요';
    desc = `상단 "STEP 2 협력사 Pool 구성"을 눌러 1차 협력사 ${tier1Count}개사 중 작업 대상을 선택·확정하면 STEP 3~7이 열립니다.`;
  } else {
    step = 'STEP 3 완료'; tone = 'ok';
    title = '자동 맵핑 완료 — 이제 협력사를 관리하세요';
    desc = hasSelection
      ? '상단 STEP 4(협력사 정보 확인)·STEP 5(자료 요청)로 진행하거나, 아래 맵에서 다른 협력사 노드를 클릭하세요.'
      : '아래 맵에서 협력사 노드를 클릭한 뒤 STEP 4·5로 정보 확인·자료 요청을 진행하세요.';
  }
  const toneCls =
    tone === 'ok' ? 'border-ok-border bg-ok-bg text-ok-text'
    : tone === 'warn' ? 'border-warn-border bg-warn-bg text-warn-text'
    : 'border-info-border bg-info-bg text-info-text';
  return (
    <div className={`mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 ${toneCls}`}>
      <div className="flex items-center gap-3">
        <span className="shrink-0 rounded-full border border-current/30 bg-white/60 px-2.5 py-1 text-[11px] font-bold">{step}</span>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-0.5 text-sm opacity-90">{desc}</p>
        </div>
      </div>
      {cta && (
        <button
          type="button"
          onClick={onOpenPool}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-bold text-white hover:bg-brand-hover"
        >
          협력사 Pool 구성
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
