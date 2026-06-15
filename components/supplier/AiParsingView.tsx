'use client';

import { useState } from 'react';
import { FileText, ScanLine } from 'lucide-react';
import Badge from '@/components/Badge';
import ExtractionTable from './ExtractionTable'; // 👈 방금 만든 테이블을 불러옵니다!

// ─── Mock Data ──────────────────────────────────────────────────────────
const MOCK_PARSED_DOCS = [
  {
    docId: 'doc-001',
    fileName: '환경영향평가_보고서_최종.pdf',
    requestType: '탄소 배출 보고서',
    uploadedAt: '2026-05-19',
    extractionResult: {
      fields: [
        { key: 'scope1', label: 'Scope 1 배출량', aiValue: '1,240', confidence: 0.96, unit: 'tCO2e' },
        { key: 'scope2', label: 'Scope 2 배출량', aiValue: '4,20', confidence: 0.45, unit: 'tCO2e', warning: '숫자 형식이 불확실합니다.' },
        { key: 'carbon_intensity', label: '탄소 집약도', aiValue: '2.34', confidence: 0.82, unit: 'kgCO2e/kWh' },
        { key: 'agency', label: '평가 기관명', aiValue: '글로벌에코인증원', confidence: 0.92, unit: '' },
      ],
      unparsedFields: ['검증 완료일', '현장 실사 여부'],
    },
  },
];

export default function AiParsingView({
  supplierId,
  onConfirmComplete,
}: {
  supplierId: string;
  onConfirmComplete: () => void;
}) {
  const [activeDoc, setActiveDoc] = useState(MOCK_PARSED_DOCS[0]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-ink-800">
      {/* ── 1. 상단 문서 선택 헤더 ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-white px-6 py-3 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-accent-50">
            <ScanLine className="h-4 w-4 text-accent-700" />
          </div>
          <div>
            <div className="text-xs font-bold text-ink-100">{activeDoc.fileName}</div>
            <div className="mt-0.5 text-[10px] text-ink-500">{activeDoc.requestType} · {activeDoc.uploadedAt} 업로드</div>
          </div>
        </div>
        <Badge tone="ok">AI 파싱 완료</Badge>
      </div>

      {/* ── 2. 스플릿 뷰 컨테이너 ── */}
      <div className="flex min-h-0 flex-1 gap-1 p-1">
        
        {/* 좌측: PDF 뷰어 영역 (가벼운 컨테이너) */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-sm border border-ink-700 bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-ink-800/30 px-4 py-2.5">
            <span className="text-[11px] font-bold text-ink-500">원본 문서 뷰어</span>
            <div className="flex gap-2 text-[10px] text-ink-400">
              <button className="hover:text-ink-100">축소</button>
              <span>1 / 14</span>
              <button className="hover:text-ink-100">확대</button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center bg-[#E5E7EB]">
            <div className="text-center text-ink-400">
              <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
              <p className="text-xs">실제 PDF 렌더링 영역 (react-pdf 연동 예정)</p>
            </div>
          </div>
        </div>

        {/* ✨ 우측: 컴포넌트로 분리한 ExtractionTable 삽입! ✨ */}
        <ExtractionTable 
          doc={activeDoc} 
          onConfirmComplete={onConfirmComplete} 
        />

      </div>
    </div>
  );
}