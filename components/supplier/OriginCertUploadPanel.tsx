'use client';

// ── 원산지 증명서 업로드(공장정보 섹션 최상단) ──────────────────────────────
//   이 섹션이 열리면 먼저 "업로드" 또는 "업로드할 자료가 없습니다" 둘 중 하나를 선택해야
//   아래 공장 정보 입력이 열린다(onResolved로 부모에 알림, 부모가 나머지를 가림/해제).
//   업로드한 파일명이 사업자등록증·환경성적서로 보이면(파일명 간이 판정) onDetected로 알려
//   5번(필요 문서) 섹션에 자동 연결 — 같은 파일을 두 번 올릴 필요 없게.
import { useState } from 'react';
import clsx from 'clsx';
import { ApiError, uploadFile } from '@/lib/api';

function detectDocKind(fileName: string): 'businessReg' | 'environmental' | null {
  const n = fileName.toLowerCase();
  if (/사업자\s*등록증|business.?reg/i.test(n)) return 'businessReg';
  if (/환경\s*성적서|environmental/i.test(n)) return 'environmental';
  return null;
}

export default function OriginCertUploadPanel({ supplierId, onResolved, onDetected }: {
  supplierId: string;
  onResolved: () => void;
  onDetected: (kind: 'businessReg' | 'environmental', s3Key: string, fileName: string) => void;
}) {
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [noDocs, setNoDocs] = useState(false);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    setError('');
    try {
      const meta = await uploadFile(f, `origin-cert:${supplierId}`);
      const shownName = meta.fileName || f.name;
      setFileName(shownName);
      setNoDocs(false);
      onResolved();
      const kind = detectDocKind(f.name);
      if (kind) onDetected(kind, meta.s3Key, shownName);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  function handleNoDocs() {
    setNoDocs(true);
    onResolved();
  }

  return (
    <div className="space-y-2 rounded-sm border border-ink-700 bg-white px-4 py-3">
      <div className="text-sm font-semibold text-ink-100">업로드할 자료가 있으신 경우 먼저 업로드해주시기 바랍니다 (원산지 증명서 등)</div>
      <div className="flex items-center justify-between gap-3">
        <div className={`min-w-0 truncate text-xs ${error ? 'text-alert-text' : 'text-ink-500'}`}>
          {error || (uploading
            ? '업로드 중…'
            : fileName
              ? `첨부됨 · ${fileName} (검토 참고용)`
              : noDocs
                ? '업로드할 자료 없음으로 확인됐습니다.'
                : '업로드하거나 "업로드할 자료가 없습니다"를 눌러야 아래 공장정보 입력이 열립니다.')}
        </div>
        <div className="flex shrink-0 gap-2">
          <label className={`rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 ${uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-accent-100'}`}>
            {fileName ? '파일 변경' : '자료 업로드'}
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" disabled={uploading} onChange={handleSelect} />
          </label>
          <button
            type="button"
            onClick={handleNoDocs}
            disabled={uploading}
            className={clsx(
              'rounded-xs border px-3 py-1.5 text-xs font-semibold',
              noDocs ? 'border-ok-border bg-ok-bg text-ok-text' : 'border-ink-700 bg-white text-ink-500 hover:border-accent-500 hover:text-accent-700',
            )}
          >
            업로드할 자료가 없습니다
          </button>
        </div>
      </div>
    </div>
  );
}
