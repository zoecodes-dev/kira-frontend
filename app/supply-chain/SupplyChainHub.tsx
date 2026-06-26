'use client';

// 원청 공급망 맵 허브 — 8단계 흐름과 팝업을 오케스트레이션하는 컨테이너
import { useEffect, useState } from 'react';
import { AlertTriangle, Database, Loader2 } from 'lucide-react';
import type { SelectedNode, SupplyChainDataset } from '@/lib/supply-chain-mock';
import { apiProductsToDataset, emptyDataset, mergeProductBom, mergeSupplyChainMap, mockDataset, supplierDetailIdMap } from '@/lib/supply-chain-mock';
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
  const [pool, setPool] = useState<SupplierBrief[]>([]);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [activeModal, setActiveModal] = useState<HubModal>(null);
  // 맵 관리에서 시작한 자료요청은 협력사명을 직접 지정 (없으면 선택 노드 기준)
  const [requestLabel, setRequestLabel] = useState<string | null>(null);

  // 트리에 주입할 데이터셋 — 기본 빈 상태. 제품은 API, 공급망은 형성으로 채운다.
  const [dataset, setDataset] = useState<SupplyChainDataset>(emptyDataset);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  // 조회 상태 알림: 'auth'=토큰 없음/401·403, 'error'=그 외 실패, null=정상
  const [loadStatus, setLoadStatus] = useState<'auth' | 'error' | null>(null);

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

    // 1) BOM 버전 목록(실 bomVersionId) — 없으면 트리 합성 버전으로 폴백
    let versions: Awaited<ReturnType<typeof getProductBomVersions>> = [];
    try {
      versions = await getProductBomVersions(productId);
    } catch {
      // 구버전 백엔드 — 합성 버전 사용
    }
    const activeVersionId =
      versions.find(v => v.isCurrent)?.bomVersionId ?? versions[0]?.bomVersionId;

    // 2) BOM 트리 → 평면. 실 bomVersionId가 있으면 그 키로 정합.
    try {
      const bom = await getProductBom(productId, activeVersionId);
      setDataset(ds => mergeProductBom(ds, productId, bom, versions));
    } catch {
      // BOM 없음 — 빈 상태 유지
    }

    // 3) §10.2a 공급망 맵(협력사·공장·비율). 미구현/빈 데이터면 건너뜀.
    if (activeVersionId) {
      try {
        const map = await getProductSupplyChainMap(productId, { bomVersionId: activeVersionId });
        setDataset(ds => mergeSupplyChainMap(ds, productId, activeVersionId, map));
      } catch {
        // 공급망 맵 없음 — 협력사 빈 상태 유지
      }
    }
  }

  function loadDemo() {
    setIsDemo(true);
    setDataset(mockDataset);
  }

  // 선택 노드의 mock supplier_id → 실 supplierId 브리지 (매핑 없으면 undefined)
  const activeMockSupplierId = selectedNode
    ? selectedNode.type === 'product'
      ? selectedNode.rows[0]?.supplier_id
      : selectedNode.row.supplier_id
    : undefined;
  const activeSupplierId = activeMockSupplierId ? supplierDetailIdMap[activeMockSupplierId] : undefined;
  const activeNodeLabel = selectedNode
    ? selectedNode.type === 'product'
      ? selectedNode.product.product_name
      : selectedNode.row.part_name
    : '선택 노드';

  const close = () => setActiveModal(null);

  return (
    <div className="min-h-screen bg-white text-ink-100">
      <PageHeader
        title="공급망 맵 허브"
        description="대표 제품을 고르고 MBOM 기준으로 1차 협력사를 자동 맵핑한 뒤, 협력사 정보 확인·자료 요청·초대·만료 관리까지 관리합니다.
      </p>"
      >
        <HubStepBar
          poolCount={pool.length}
          hasSelection={Boolean(selectedNode)}
          onOpenPool={() => setActiveModal('pool')}
          onOpenSupplierInfo={() => setActiveModal('supplierInfo')}
          onOpenDataRequest={() => setActiveModal('dataRequest')}
          onOpenInvite={() => setActiveModal('invite')}
          onOpenMapManage={() => setActiveModal('mapManage')}
        />
      </PageHeader>

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

      <SupplyChainMapPageContent
        dataset={dataset}
        embedded
        onNodeSelect={setSelectedNode}
        onConnectClick={() => setActiveModal('invite')}
        onProductChange={handleProductChange}
      />

      {activeModal === 'pool' && (
        <PoolModal
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
