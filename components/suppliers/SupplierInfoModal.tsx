'use client';

// 협력사 입력현황/목록에서 협력사를 누르면 이 모달로 '단일 공유 폼'(SupplierGeneralReviewContent)을 띄운다.
// 별도 상세 페이지로 이탈하지 않으므로 닫으면 곧바로 협력사 목록으로 복귀한다.
// 협력사 포털과 동일한 단일 폼(mode='oem' = 원청 정보확인 + 자료요청).
import { Suspense } from 'react';
import { X } from 'lucide-react';
import { SupplierGeneralReviewContent } from '@/app/suppliers/check-info/SupplierGeneralReview';

export default function SupplierInfoModal({
  supplierId,
  supplierName,
  openRequest = false,
  onClose,
}: {
  supplierId: string;
  supplierName: string;
  openRequest?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex bg-black/50 p-4" onClick={onClose}>
      <div
        className="m-auto flex h-[92vh] w-[96vw] max-w-[1280px] flex-col overflow-hidden rounded-md bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-white px-4 py-2.5">
          <div className="text-sm font-bold text-ink-100">협력사 정보 · {supplierName}</div>
          <button type="button" onClick={onClose} className="rounded-sm p-1 text-ink-400 hover:bg-slate-100 hover:text-ink-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-50">
          <Suspense fallback={<div className="p-8 text-sm text-ink-500">불러오는 중…</div>}>
            <SupplierGeneralReviewContent
              supplierId={supplierId}
              supplierName={supplierName}
              mode="oem"
              openRequest={openRequest}
              embedded
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
