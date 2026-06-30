'use client';

// 협력사가 메일 URL로 진입하는 온보딩 라우트입니다.
import { Suspense } from 'react';
import SupplierOnboarding from '@/components/supplier/onboarding/SupplierOnboarding';

export default function SupplierOnboardingPage() {
  return (
    <Suspense>
      <SupplierOnboarding />
    </Suspense>
  );
}
