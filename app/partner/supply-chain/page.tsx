'use client';

import { Suspense } from 'react';
import PartnerSupplyChain from '@/components/partner/PartnerSupplyChain';

export default function PartnerSupplyChainPage() {
  return (
    <Suspense>
      <PartnerSupplyChain />
    </Suspense>
  );
}
