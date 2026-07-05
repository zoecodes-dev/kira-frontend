'use client';

import { useRef, useState } from 'react';
import { uploadFile, ingestSelfUpload, getExtractionResult, type ExtractionResult } from '@/lib/api';
import OriginCertReviewModal, { pickOriginPrefill } from './OriginCertReviewModal';

export interface OriginPrefillValues { factoryName: string; country: string; region: string; address: string; }
// 행에 붙여 나중에 재열람할 서류 참조.
export interface CertRef { fileUrl: string | null; fileName: string; result: ExtractionResult; }

/**
 * 원산지 증명서 업로드 → AI 파싱 → 확인 모달 → 공장정보 자동 채움.
 * 편집모드와 무관하게 '공장 정보' 섹션에 상시 노출된다.
 * 뷰 모드에서 업로드하면 onNeedEdit()로 편집모드로 전환한 뒤 진행한다.
 */
export default function OriginCertUpload({
  supplierId, editing, onNeedEdit, onPrefill,
}: {
  supplierId?: string;
  editing: boolean;
  onNeedEdit: () => void;
  onPrefill: (values: OriginPrefillValues, certRef: CertRef) => void;
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
    if (!editing) onNeedEdit();          // 뷰 모드면 편집모드로 자동 전환(그래야 채워진 공장 행이 보임)
    setBusy(true); setResult(null); setFileUrl(null); setFileName(file.name); setOpen(true);
    try {
      const up = await uploadFile(file, `origin-cert:${supplierId}`);
      setFileUrl(up.url); setFileName(up.fileName || file.name);
      const { documentId } = await ingestSelfUpload({ supplier_id: supplierId, s3_key: up.s3Key, file_name: up.fileName || file.name, doc_kind: 'origin_certificate' });
      let r: ExtractionResult | null = null;
      for (let i = 0; i < 16 && !r; i++) { await new Promise(res => setTimeout(res, 2500)); r = await getExtractionResult(documentId); }
      if (r) setResult(r);
      else { setOpen(false); alert('문서 파싱이 지연되고 있어요. 잠시 후 다시 시도해 주세요.'); }
    } catch {
      setOpen(false);
      alert('원산지 증명서 업로드/파싱에 실패했습니다. 로그인 상태와 파일 형식(PDF/이미지)을 확인해 주세요.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';   // 같은 파일 재선택 허용
    }
  };

  const handleSave = () => {
    if (!result) return;
    onPrefill(pickOriginPrefill(result), { fileUrl, fileName, result });   // 서류 참조를 행에 부착(행별 재열람용)
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xs border border-accent-100 bg-accent-50 px-3 py-2">
      <span className="text-xs font-semibold text-accent-700">원산지 증명서로 자동 입력</span>
      <span className="text-[11px] text-ink-500">PDF/이미지를 올리면 AI가 원산지를 추출·판정해 공장 행을 채웁니다.</span>
      <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="ml-auto rounded-xs border border-accent-700 bg-white px-3 py-1.5 text-xs font-bold text-accent-700 hover:bg-accent-100 disabled:opacity-50"
      >
        {busy ? '업로드/파싱 중…' : '＋ 원산지 증명서 업로드'}
      </button>
      {open && (
        <OriginCertReviewModal fileUrl={fileUrl} fileName={fileName} result={result} onSave={handleSave} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
