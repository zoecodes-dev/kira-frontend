'use client';

// 원본 문서 미리보기 — 브라우저 기본 PDF/이미지 뷰어를 사용한다.
import { useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';

export default function PdfViewer({ fileUrl, fileName }: { fileUrl: string; fileName?: string }) {
  const [failed, setFailed] = useState(false);

  // 로드 실패(주로 S3 CORS 미설정/만료/자격증명) → 새 탭 링크로 폴백.
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
      <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-ink-800/30 px-4 py-2.5">
        <span className="truncate text-[11px] font-bold text-ink-500">{fileName ?? '원본 문서'}</span>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-400 hover:text-accent-700"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          새 탭
        </a>
      </div>

      <div className="min-h-0 flex-1 bg-[#E5E7EB]">
        <iframe
          src={fileUrl}
          title={fileName ?? '원본 문서'}
          className="h-full w-full border-0 bg-white"
          onError={() => setFailed(true)}
        />
      </div>
    </div>
  );
}
