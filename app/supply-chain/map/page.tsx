'use client';

// 원청 공급망 맵 허브 라우트입니다.
// 허브가 useSearchParams(productId)를 사용하므로 Suspense 경계로 감싼다(Next App Router 요구).
import { Suspense } from 'react';
import SupplyChainHub from '../SupplyChainHub';

export default function SupplyChainMapPage() {
  return (
    <Suspense fallback={null}>
      <SupplyChainHub />
    </Suspense>
  );
}
