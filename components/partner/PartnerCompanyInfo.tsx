'use client';

// 내 기업 정보 (/partner/company-info) — app/supplier/page.tsx의 activeView==='company-info' 분기를 이관.
import { SupplierGeneralReviewContent } from '@/app/suppliers/check-info/SupplierGeneralReview';
import { usePartnerWorkspace } from './PartnerWorkspaceContext';

export default function PartnerCompanyInfo() {
  const { supplierUuid } = usePartnerWorkspace();
  return <SupplierGeneralReviewContent supplierId={supplierUuid} mode="supplier" embedded />;
}
