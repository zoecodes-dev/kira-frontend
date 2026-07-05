'use client';

import { useRef, useState } from 'react';
import { uploadFile, ingestSelfUpload, getExtractionResult, type ExtractionResult } from '@/lib/api';
import CarbonCertReviewModal, { pickCarbonPrefill } from './CarbonCertReviewModal';

export interface CarbonPrefillValues { carbonIntensity: string; energySource: string; }

/**
 * 환경성적서/탄소선언서 업로드 → AI 파싱(탄소집약도·에너지원) → 확인 모달 → 4.규제 항목 자동 채움.
 * 편집모드와 무관하게 '규제' 섹션에 상시 노출. 뷰 모드 업로드 시 onNeedEdit로 편집모드 전환.
 */
export default function CarbonCertUpload({
  supplierId, editing, onNeedEdit, onPrefill,
}: {
  supplierId?: string;
  editing: boolean;
  onNeedEdit: () => void;
  onPrefill: (values: CarbonPrefillValues) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ExtractionResult | null>(null);   // null = 파싱 중

  if (!supplierId) return null;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!editing) onNeedEdit();          // 뷰 모드면 편집모드로 전환(그래야 규제 입력칸이 렌더돼 prefill 가능)
    setBusy(true); setResult(null); setFileUrl(null); setFileName(file.name); setOpen(true);
    try {
      const up = await uploadFile(file, `carbon-doc:${supplierId}`);
      setFileUrl(up.url); setFileName(up.fileName || file.name);
      const { documentId } = await ingestSelfUpload({ supplier_id: supplierId, s3_key: up.s3Key, file_name: up.fileName || file.name, doc_kind: 'carbon' });
      let r: ExtractionResult | null = null;
      for (let i = 0; i < 16 && !r; i++) { await new Promise(res => setTimeout(res, 2500)); r = await getExtractionResult(documentId); }
      if (r) setResult(r);
      else { setOpen(false); alert('문서 파싱이 지연되고 있어요. 잠시 후 다시 시도해 주세요.'); }
    } catch {
      setOpen(false);
      alert('환경성적서 업로드/파싱에 실패했습니다. 로그인 상태와 파일 형식(PDF/이미지)을 확인해 주세요.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!result) return;
    onPrefill(pickCarbonPrefill(result));
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xs border border-accent-100 bg-accent-50 px-3 py-2">
      <span className="text-xs font-semibold text-accent-700">환경성적서로 자동 입력</span>
      <span className="text-[11px] text-ink-500">PDF/이미지를 올리면 AI가 탄소집약도를 추출·판정해 규제 항목을 채웁니다.</span>
      <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="ml-auto rounded-xs border border-accent-700 bg-white px-3 py-1.5 text-xs font-bold text-accent-700 hover:bg-accent-100 disabled:opacity-50"
      >
        {busy ? '업로드/파싱 중…' : '＋ 환경성적서 업로드'}
      </button>
      {open && (
        <CarbonCertReviewModal fileUrl={fileUrl} fileName={fileName} result={result} onSave={handleSave} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
