'use client';

// 협력사 정보 확인 · 자료요청 표준 양식 페이지 — 본문은 SupplierGeneralReview로 추출(공급망 워크스페이스 드로어와 공유).
import { Suspense } from 'react';
import { SupplierGeneralReviewContent } from './SupplierGeneralReview';

export default function SupplierGeneralReviewPage() {
  return (
    <Suspense>
      <SupplierGeneralReviewContent />
    </Suspense>
  );
}
