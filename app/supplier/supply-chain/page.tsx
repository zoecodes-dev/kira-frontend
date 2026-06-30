'use client';

// 협력사가 본인 공급망맵 정보를 입력하는 라우트입니다.
import { Suspense } from 'react';
import SupplyChainEntry from '@/components/supplier/supply-chain-entry/SupplyChainEntry';

export default function SupplierSupplyChainPage() {
  return (
    <Suspense>
      <SupplyChainEntry />
    </Suspense>
  );
}
