'use client';

// ── 탄소발자국 문서 업로드 + AI 처리 패널 ─────────────────────────────────────
// MaterialDocParsePanel과 동일 파이프라인(신규 엔드포인트 없음), 대상 컬럼만 다르다:
//   ① uploadFile(POST /files) → s3Key
//   ② PATCH /suppliers/{id}/detail { carbon_footprint_doc_url: s3Key }
//      → 커밋 후 SupplierDocumentUploaded(doc_kind='carbon_footprint') 발행 → 파싱 큐
//   ③ 업로드 직후 자동 파싱 폴링 → GET /data-requests/ai-extractions, docS3Key === s3Key 매칭
//   ④ 매칭된 추출결과(AiExtraction)를 부모로 올려 탄소집약도/에너지원 입력칸에 반영
//   ※ 파싱 중에는 onBusyChange(true)로 부모에 알려 입력칸 오버레이/잠금을 유도한다.
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  ApiError, getAiExtractions, getSupplierDocumentUrl, updateSupplierDetail, uploadFile,
  type AiExtraction,
} from '@/lib/api';

const CARBON_DOC_ACCEPT = '.pdf,.png,.jpg,.jpeg';
const PARSE_POLL_TRIES = 12;      // 최대 재시도(총 ~30초)
const PARSE_POLL_INTERVAL = 2500; // ms — 이벤트 기반 비동기 파싱이라 2-3초 대기 후 조회

export default function CarbonFootprintDocPanel({ supplierId, initialUrl, editable, onParsed, onOpenViewer, onBusyChange, onUploaded }: {
  supplierId: string;
  initialUrl?: string | null;
  editable?: boolean;
  onParsed: (extraction: AiExtraction) => void;
  // AI 처리 확인 팝업(AiParsingView 모달) 열기 — 업로드 완료 직후 + '결과 보기' 클릭 시.
  onOpenViewer: () => void;
  // 업로드/파싱 진행 상태를 부모로 알림 → 부모가 입력칸 오버레이/잠금 적용.
  onBusyChange?: (busy: boolean) => void;
  // 방금 업로드한 문서 정보 → 부모가 파싱 확인 모달에 넘겨 '파싱 중' 표시/폴링 활성화.
  onUploaded?: (info: { docS3Key: string; fileName: string }) => void;
}) {
  const [docValue, setDocValue] = useState(initialUrl ?? '');
  const [displayName, setDisplayName] = useState('');
  // [흐름 통일] 뱃지·파일명·버튼 상태는 전부 "이번 세션에서 실제 업로드" 기준.
  //   초기 진입(새로고침 포함)에는 항상 미업로드 상태로 시작 — [파일 업로드]만 활성.
  //   hidden 캐리어(docValue)만 DB 저장값(initialUrl)을 유지해 저장 시 NULL 덮어쓰기를 막는다.
  const [sessionUploaded, setSessionUploaded] = useState(false);
  // 파싱 성공 후에는 메인 [파싱하기] 재비활성 — 파싱은 업로드 직후 모달 흐름에서 이미 수행됨.
  //   (업로드됐지만 파싱이 지연/실패한 재시도 구간에서만 활성)
  const [parseDone, setParseDone] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [viewingOriginal, setViewingOriginal] = useState(false);
  // 언마운트 후 setState 방지 — 폴링(수십 초)이 편집 취소보다 오래 살 수 있다.
  const cancelledRef = useRef(false);
  useEffect(() => {
    cancelledRef.current = false;
    return () => { cancelledRef.current = true; };
  }, []);
  useEffect(() => { setDocValue(initialUrl ?? ''); }, [initialUrl]);

  // 진행 상태를 부모로 브로드캐스트 (오버레이/잠금 트리거).
  const busy = uploading || parsing;
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);

  const shownName = displayName || (docValue ? docValue.split('/').pop() : '');

  // 업로드된 문서의 파싱 결과를 폴링. keyArg로 방금 올린 s3Key를 직접 받아
  // (setState 비동기로 docValue가 아직 안 바뀐 상태에서도) 즉시 파싱을 시작할 수 있게 한다.
  async function runParse(keyArg?: string) {
    const key = keyArg ?? docValue;
    if (!key) return;
    setParsing(true);
    setError('');
    setNotice('');
    try {
      for (let attempt = 0; attempt < PARSE_POLL_TRIES; attempt++) {
        await new Promise(r => setTimeout(r, PARSE_POLL_INTERVAL));
        if (cancelledRef.current) return;
        const list = await getAiExtractions().catch(() => null);
        if (cancelledRef.current) return;
        // created_at DESC 정렬 — 첫 매칭이 곧 최신(같은 파일 두 번 업로드해도 최신 선택).
        const hit = (list ?? []).find(e => e.docS3Key === key);
        if (hit) {
          onParsed(hit);
          setParseDone(true);
          setNotice('');
          return;
        }
      }
      setError('파싱이 지연되고 있습니다. 잠시 후 "파싱하기"로 다시 시도해주세요.');
    } finally {
      if (!cancelledRef.current) setParsing(false);
    }
  }

  // 이미 저장된(DB persisted) 원본 문서 보기 — 세션 업로드 여부와 무관하게 docValue만 있으면 된다.
  //   업로드 시점에 곧바로 PATCH로 컬럼이 갱신되므로(위 handleSelect) docValue는 항상 DB 최신값과 일치.
  async function handleViewOriginal() {
    if (!docValue) return;
    setError('');
    setViewingOriginal(true);
    try {
      const { url } = await getSupplierDocumentUrl(supplierId, 'carbon_footprint');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '문서를 여는 데 실패했습니다.');
    } finally {
      setViewingOriginal(false);
    }
  }

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
      const meta = await uploadFile(f, `carbon-footprint-doc:${supplierId}`);
      // PATCH → 컬럼 갱신 + 커밋 후 문서 이벤트 발행(파싱 파이프라인 트리거).
      await updateSupplierDetail(supplierId, { carbon_footprint_doc_url: meta.s3Key });
      if (cancelledRef.current) return;
      setDocValue(meta.s3Key);
      setDisplayName(f.name);
      setSessionUploaded(true);
      setParseDone(false);  // 새 파일 = 새 파싱 사이클
      setNotice(`업로드 완료 · ${f.name} — AI가 분석을 시작했어요`);
      // 부모에 업로드 문서 전달(모달 파싱 표시용) → 파싱 확인 팝업 + 자동 파싱 폴링.
      onUploaded?.({ docS3Key: meta.s3Key, fileName: f.name });
      onOpenViewer();
      void runParse(meta.s3Key);
    } catch (err) {
      if (!cancelledRef.current) setError(err instanceof ApiError ? err.message : '업로드에 실패했습니다.');
    } finally {
      if (!cancelledRef.current) setUploading(false);
    }
  }

  const statusText = error
    ? error
    : uploading
      ? '업로드 중…'
      : parsing
        ? 'AI 처리 중… (최대 30초 정도 걸릴 수 있습니다)'
        : notice
          ? notice
          : sessionUploaded
            ? `업로드됨 · ${shownName}`
            : '';

  return (
    <div className="relative overflow-hidden rounded-sm border border-ink-700 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink-100">탄소발자국 문서</div>
          <div className={`mt-0.5 flex items-center gap-1.5 truncate text-xs ${error ? 'text-alert-text' : notice ? 'text-ok-text' : sessionUploaded ? 'text-ink-400' : 'text-ink-500'}`}>
            {busy && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-700" />}
            <span className="truncate">{statusText}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {sessionUploaded && !busy && (
            <span className="rounded-full border border-ok-border bg-ok-bg px-2 py-0.5 text-[11px] font-bold text-ok-text">업로드됨</span>
          )}
          {/* 원본 보기 — 이번 세션 업로드 여부와 무관하게 DB에 저장된 문서가 있으면 언제나 활성. */}
          {docValue && (
            <button
              type="button"
              onClick={handleViewOriginal}
              disabled={viewingOriginal}
              className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {viewingOriginal ? '여는 중…' : '원본 보기'}
            </button>
          )}
          {editable && (
            <>
              <label className={`rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 ${busy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-accent-100'}`}>
                {sessionUploaded ? '파일 변경' : '파일 업로드'}
                <input
                  type="file"
                  accept={CARBON_DOC_ACCEPT}
                  className="hidden"
                  disabled={busy}
                  onChange={handleSelect}
                />
              </label>
              <button
                type="button"
                onClick={() => runParse()}
                disabled={!sessionUploaded || busy || parseDone}
                className="inline-flex items-center gap-1 rounded-xs bg-accent-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {parsing ? '파싱 중…' : '파싱하기'}
              </button>
              {/* 결과 보기 — DB에 저장된 문서(docValue)만 있으면 활성. 이전 세션/시드로 이미
                  저장된 문서도 열 수 있어야 한다(파싱 결과가 없으면 모달이 빈 상태로 뜬다). */}
              <button
                type="button"
                onClick={onOpenViewer}
                disabled={!docValue}
                className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink-700 disabled:hover:text-ink-500"
              >
                결과 보기
              </button>
            </>
          )}
        </div>
        {/* persistForm(master-form authoritative-overwrite) round-trip 캐리어 —
            없으면 자료 제출 시 carbon_footprint_doc_url 이 NULL 로 덮인다. */}
        <input type="hidden" data-field="regulation.carbonFootprintDocUrl" value={docValue} readOnly />
      </div>
      {/* 진행 중 하단 인디터미네이트 프로그레스 바 (Tailwind 내장 pulse) */}
      {busy && <div className="h-0.5 w-full animate-pulse bg-accent-600" />}
    </div>
  );
}
