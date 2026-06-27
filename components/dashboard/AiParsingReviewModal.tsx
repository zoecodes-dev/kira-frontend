'use client';

// 검토가 필요한 항목(데이터 추출·규제 검증) → 이 모달로 AI 파싱 뷰(AiParsingView)를 띄운다.
// 협력사가 보던 파싱 확인 화면과 동일 컴포넌트(공통 모듈) = 원청/협력사 같은 데이터.
import { X } from 'lucide-react';
import AiParsingView from '@/components/supplier/AiParsingView';

export default function AiParsingReviewModal({
  supplierId,
  supplierName,
  onClose,
}: {
  supplierId: string;
  supplierName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex bg-black/50 p-4" onClick={onClose}>
      <div
        className="m-auto flex h-[92vh] w-[96vw] max-w-[1440px] flex-col overflow-hidden rounded-md bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-white px-4 py-2.5">
          <div className="text-sm font-bold text-ink-100">AI 파싱 검토 · {supplierName}</div>
          <button type="button" onClick={onClose} className="rounded-sm p-1 text-ink-400 hover:bg-slate-100 hover:text-ink-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          {/* 모든 문서 검토 완료(제출) 시 모달 닫기. realOnly — 실 추출만(무관한 mock 금지). */}
          <AiParsingView supplierId={supplierId} onConfirmComplete={onClose} realOnly />
        </div>
      </div>
    </div>
  );
}
