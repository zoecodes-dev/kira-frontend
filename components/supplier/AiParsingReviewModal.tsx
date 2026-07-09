'use client';

// AI 파싱 확인 팝업 — /partner/ai-parsing 페이지와 동일 화면(AiParsingView 공통 모듈)을
//   거의 풀스크린 모달로 띄운다. 닫거나 전체 제출 완료 시 close.
//   하단 버튼은 '저장' 단일 — 저장 시 확정값을 onSaved로 부모 폼에 반영하고 모달을 닫는다.
import { X } from 'lucide-react';
import AiParsingView from '@/components/supplier/AiParsingView';
import type { AiExtraction } from '@/lib/api';

export default function AiParsingReviewModal({
  supplierId,
  open,
  onClose,
  docCategoryFilter = 'material_composition',
  docS3KeyFilter,
  initialDoc,
  title = 'AI 파싱 확인 및 수정 · 소재구성 문서',
  onSaved,
}: {
  supplierId: string;
  open: boolean;
  onClose: () => void;
  docCategoryFilter?: string;
  docS3KeyFilter?: string | null;
  initialDoc?: { docId: string; fileName: string; fileUrl: string | null; requestType: string; docS3Key?: string | null } | null;
  title?: string;
  /** '저장' 확정 시 최종 추출값(사용자 수정 반영) 수신 — 부모 폼 자동 채움 + RAG 트리거. */
  onSaved?: (extraction: AiExtraction) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex bg-black/50 p-4" onClick={onClose}>
      <div
        className="m-auto flex h-[92vh] w-[96vw] max-w-[1440px] flex-col overflow-hidden rounded-md bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-white px-4 py-2.5">
          <div className="text-sm font-bold text-ink-100">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-ink-400 hover:bg-slate-100 hover:text-ink-100"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <AiParsingView
            supplierId={supplierId}
            onConfirmComplete={onClose}
            realOnly
            saveOnlyMode
            docCategoryFilter={docCategoryFilter}
            docS3KeyFilter={docS3KeyFilter}
            initialDoc={initialDoc}
            onSaved={onSaved}
          />
        </div>
      </div>
    </div>
  );
}
