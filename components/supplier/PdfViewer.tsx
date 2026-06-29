'use client';

// 원본 문서 PDF 뷰어 — react-pdf(pdfjs) 기반.
// ⚠️ SSR 금지: pdfjs는 DOMMatrix 등 브라우저 API에 의존해 서버 렌더 시 크래시한다.
//    따라서 AiParsingView에서 next/dynamic(ssr:false)로만 로드한다.
// 워커는 번들된 pdfjs 버전과 정확히 일치하는 CDN(.mjs)으로 지정(웹팩 설정 불필요).
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({ fileUrl, fileName }: { fileUrl: string; fileName?: string }) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [failed, setFailed] = useState(false);

  // 로드 실패(주로 S3 CORS 미설정/만료/자격증명) → 네이티브 뷰어 링크로 폴백.
  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#E5E7EB] text-center text-ink-400">
        <FileText className="h-10 w-10 opacity-30" />
        <p className="text-xs">{fileName ?? '문서'}를 뷰어에서 열 수 없습니다.</p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xs border border-ink-600 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-200 hover:border-accent-600"
        >
          <ExternalLink className="h-3.5 w-3.5" /> 새 탭에서 열기
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* 툴바 — 페이지 이동 + 확대/축소 */}
      <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-ink-800/30 px-4 py-2.5">
        <span className="truncate text-[11px] font-bold text-ink-500">{fileName ?? '원본 문서'}</span>
        <div className="flex items-center gap-3 text-[10px] text-ink-400">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setScale(s => Math.max(0.5, +(s - 0.15).toFixed(2)))} className="hover:text-ink-100" aria-label="축소">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="num-mono w-9 text-center">{Math.round(scale * 100)}%</span>
            <button type="button" onClick={() => setScale(s => Math.min(3, +(s + 0.15).toFixed(2)))} className="hover:text-ink-100" aria-label="확대">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="hover:text-ink-100 disabled:opacity-30" aria-label="이전 페이지">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="num-mono">{page} / {numPages || '—'}</span>
            <button type="button" disabled={page >= numPages} onClick={() => setPage(p => Math.min(numPages, p + 1))} className="hover:text-ink-100 disabled:opacity-30" aria-label="다음 페이지">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 페이지 렌더 영역 */}
      <div className="flex flex-1 justify-center overflow-auto bg-[#E5E7EB] p-3">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPage(p => Math.min(p, n)); }}
          onLoadError={() => setFailed(true)}
          loading={<div className="flex h-full items-center justify-center text-xs text-ink-400">문서 불러오는 중…</div>}
          error={<div className="flex h-full items-center justify-center text-xs text-ink-400">문서를 불러오지 못했습니다.</div>}
        >
          <Page
            pageNumber={page}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-md"
          />
        </Document>
      </div>
    </div>
  );
}
