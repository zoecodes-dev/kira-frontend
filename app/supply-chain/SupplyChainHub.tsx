'use client';

// 원청 공급망 맵 허브 — 8단계 흐름과 팝업을 오케스트레이션하는 컨테이너
import { useEffect, useState } from 'react';
import { Database, Loader2 } from 'lucide-react';
import type { SelectedNode, SupplyChainDataset } from '@/lib/supply-chain-mock';
import { apiProductsToDataset, emptyDataset, mergeProductBom, mockDataset, supplierDetailIdMap } from '@/lib/supply-chain-mock';
import { getProductBom, getProducts, type SupplierBrief } from '@/lib/api';
import { SupplyChainMapPageContent } from './SupplyChainMapPageContent';
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

  // 진입 시 제품 목록 조회 (백엔드/토큰 없으면 빈 상태로 graceful)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProductsLoading(true);
      try {
        const apiProducts = await getProducts();
        if (!cancelled) setDataset({ ...emptyDataset, products: apiProductsToDataset(apiProducts) });
      } catch {
        // 빈 상태 유지
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 제품 선택 시 해당 제품 BOM 조회 → 데이터셋 병합 (데모 모드면 mock BOM 유지)
  async function handleProductChange(productId: string) {
    if (isDemo) return;
    try {
      const bom = await getProductBom(productId);
      setDataset(ds => mergeProductBom(ds, productId, bom));
    } catch {
      // BOM 없음 — 빈 상태 유지
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
      <HubStepBar
        poolCount={pool.length}
        hasSelection={Boolean(selectedNode)}
        onOpenPool={() => setActiveModal('pool')}
        onOpenSupplierInfo={() => setActiveModal('supplierInfo')}
        onOpenDataRequest={() => setActiveModal('dataRequest')}
        onOpenInvite={() => setActiveModal('invite')}
        onOpenMapManage={() => setActiveModal('mapManage')}
      />

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
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-[#046949] hover:text-[#046949] disabled:opacity-50"
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
