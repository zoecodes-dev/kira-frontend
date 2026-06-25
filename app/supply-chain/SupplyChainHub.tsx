'use client';

// 원청 공급망 맵 허브 — 8단계 흐름과 팝업을 오케스트레이션하는 컨테이너
import { useState } from 'react';
import type { SelectedNode } from '@/lib/supply-chain-mock';
import { supplierDetailIdMap } from '@/lib/supply-chain-mock';
import type { SupplierBrief } from '@/lib/api';
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

      <SupplyChainMapPageContent
        onNodeSelect={setSelectedNode}
        onConnectClick={() => setActiveModal('invite')}
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
