'use client';

// ── 소재구성 문서 업로드 + AI 파싱 패널 ─────────────────────────────────────
// 업로드 흐름(기존 3종 문서와 동일 파이프라인 재사용, 새 엔드포인트 없음):
//   ① uploadFile(POST /files) → s3Key
//   ② PATCH /suppliers/{id}/detail { material_composition_doc_url: s3Key }
//      → 커밋 후 SupplierDocumentUploaded(doc_kind='material_composition') 발행 → 파싱 큐
//   ③ '파싱하기' 클릭 → GET /data-requests/ai-extractions 폴링, docS3Key === s3Key 매칭
//      (목록이 created_at DESC라 첫 매칭 = 최신 → 같은 파일 재업로드 시 최신 결과 선택)
//   ④ 매칭된 추출결과(AiExtraction)를 부모로 올려 광물 입력칸에 반영
import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  ApiError, getAiExtractions, updateSupplierDetail, uploadFile,
  type AiExtraction,
} from '@/lib/api';

const MATERIAL_DOC_ACCEPT = '.pdf,.png,.jpg,.jpeg';
const PARSE_POLL_TRIES = 10;      // 최대 재시도(총 ~25초)
const PARSE_POLL_INTERVAL = 2500; // ms — 이벤트 기반 비동기 파싱이라 2-3초 대기 후 조회

export default function MaterialDocParsePanel({ supplierId, initialUrl, editable, onParsed, onOpenViewer }: {
  supplierId: string;
  initialUrl?: string | null;
  editable?: boolean;
  onParsed: (extraction: AiExtraction) => void;
  // AI 파싱 확인 팝업(AiParsingView 모달) 열기 — 업로드 완료 직후 + '결과 보기' 클릭 시.
  onOpenViewer: () => void;
}) {
  const [docValue, setDocValue] = useState(initialUrl ?? '');
  const [displayName, setDisplayName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // 언마운트 후 setState 방지 — 폴링(수십 초)이 편집 취소보다 오래 살 수 있다.
  const cancelledRef = useRef(false);
  useEffect(() => () => { cancelledRef.current = true; }, []);
  useEffect(() => { setDocValue(initialUrl ?? ''); }, [initialUrl]);

  const uploaded = Boolean(docValue);
  const shownName = displayName || (docValue ? docValue.split('/').pop() : '');

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const ext = f.name.toLowerCase().split('.').pop() ?? '';
    if (!['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
      setError('PDF 또는 이미지(png/jpg/jpeg) 파일만 업로드할 수 있어요.');
      return;
    }
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const meta = await uploadFile(f, `material-doc:${supplierId}`);
      // PATCH → 컬럼 갱신 + 커밋 후 문서 이벤트 발행(파싱 파이프라인 트리거).
      await updateSupplierDetail(supplierId, { material_composition_doc_url: meta.s3Key });
      if (cancelledRef.current) return;
      setDocValue(meta.s3Key);
      setDisplayName(f.name);
      setNotice('업로드 완료 — 파싱하기를 누르면 광물 함량을 자동으로 채워요.');
      // 업로드 직후 AI 파싱 확인 화면을 팝업으로 노출(/partner/ai-parsing 과 동일 화면).
      onOpenViewer();
    } catch (err) {
      if (!cancelledRef.current) setError(err instanceof ApiError ? err.message : '업로드에 실패했습니다.');
    } finally {
      if (!cancelledRef.current) setUploading(false);
    }
  }

  async function handleParse() {
    if (!docValue || parsing) return;
    setParsing(true);
    setError('');
    setNotice('');
    try {
      for (let attempt = 0; attempt < PARSE_POLL_TRIES; attempt++) {
        // 이벤트 기반 비동기 처리 — submission_documents 행 생성·파싱 완료까지 대기 후 조회.
        await new Promise(r => setTimeout(r, PARSE_POLL_INTERVAL));
        if (cancelledRef.current) return;
        const list = await getAiExtractions().catch(() => null);
        if (cancelledRef.current) return;
        // created_at DESC 정렬 — 첫 매칭이 곧 최신(같은 파일 두 번 업로드해도 최신 선택).
        const hit = (list ?? []).find(e => e.docS3Key === docValue);
        if (hit) {
          onParsed(hit);
          setNotice('파싱 완료 — 추출된 함량이 입력칸에 채워졌어요. 값을 확인한 뒤 저장해주세요.');
          return;
        }
      }
      setError('파싱이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      if (!cancelledRef.current) setParsing(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-sm border border-ink-700 bg-white px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink-100">소재구성 문서 (핵심광물 함량 자동 추출)</div>
        <div className={`mt-0.5 truncate text-xs ${error ? 'text-alert-text' : notice ? 'text-ok-text' : uploaded ? 'text-ink-400' : 'text-ink-500'}`}>
          {error
            ? error
            : uploading
              ? '업로드 중…'
              : parsing
                ? 'AI 파싱 중… (최대 30초 정도 걸릴 수 있어요)'
                : notice
                  ? notice
                  : uploaded
                    ? `업로드됨 · ${shownName}`
                    : '미업로드 · PDF/이미지(png/jpg/jpeg)를 올리면 Li/Co/Ni/Mn/흑연 함량을 자동으로 채워요.'}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {uploaded && !uploading && !parsing && (
          <span className="rounded-full border border-ok-border bg-ok-bg px-2 py-0.5 text-[11px] font-bold text-ok-text">업로드됨</span>
        )}
        {editable && (
          <>
            <label className={`rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 ${uploading || parsing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-accent-100'}`}>
              {uploaded ? '파일 변경' : '자료 업로드'}
              <input
                type="file"
                accept={MATERIAL_DOC_ACCEPT}
                className="hidden"
                disabled={uploading || parsing}
                onChange={handleSelect}
              />
            </label>
            <button
              type="button"
              onClick={handleParse}
              disabled={!uploaded || uploading || parsing}
              className="inline-flex items-center gap-1 rounded-xs bg-accent-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {parsing ? '파싱 중…' : '파싱하기'}
            </button>
            {/* 결과 보기는 항상 활성 — 업로드/파싱이 실패·지연돼도 파싱 확인 팝업은 열 수 있어야 한다. */}
            <button
              type="button"
              onClick={onOpenViewer}
              className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-700"
            >
              결과 보기
            </button>
          </>
        )}
      </div>
      {/* persistForm(master-form authoritative-overwrite) round-trip 캐리어 —
          없으면 자료 제출 시 material_composition_doc_url 이 NULL 로 덮인다. */}
      <input type="hidden" data-field="materials.materialCompositionDocUrl" value={docValue} readOnly />
    </div>
  );
}
