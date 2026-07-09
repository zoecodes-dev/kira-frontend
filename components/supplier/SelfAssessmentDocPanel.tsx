'use client';

// ── [작업1] 실사 자가진단(SAQ) 문서 업로드 + AI 파싱 패널 ───────────────────────
// CarbonFootprintDocPanel과 동일 파이프라인(신규 엔드포인트 없음), 대상 컬럼만 다르다:
//   ① uploadFile(POST /files) → s3Key
//   ② PATCH /suppliers/{id}/detail { self_assessment_doc_url: s3Key }
//      → 커밋 후 SupplierDocumentUploaded(doc_kind='self_assessment') 발행 → 파싱 큐
//   ③ 업로드 직후 자동 파싱 폴링 → GET /data-requests/ai-extractions, docS3Key === s3Key 매칭
//   ④ 매칭된 추출결과(AiExtraction)를 부모로 올려 SAQ 항목(고충처리·강제노동 등) 입력칸에 반영
//   ※ 파싱 중에는 onBusyChange(true)로 부모에 알려 입력칸 오버레이/잠금을 유도한다.
import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import {
  ApiError, getAiExtractions, updateSupplierDetail, uploadFile,
  type AiExtraction,
} from '@/lib/api';

const SAQ_DOC_ACCEPT = '.pdf,.png,.jpg,.jpeg';
const PARSE_POLL_TRIES = 12;      // 최대 재시도(총 ~30초)
const PARSE_POLL_INTERVAL = 2500; // ms — 이벤트 기반 비동기 파싱이라 2-3초 대기 후 조회

export default function SelfAssessmentDocPanel({ supplierId, initialUrl, editable, onParsed, onOpenViewer, onBusyChange, onUploaded }: {
  supplierId: string;
  initialUrl?: string | null;
  editable?: boolean;
  onParsed: (extraction: AiExtraction) => void;
  onOpenViewer: () => void;
  onBusyChange?: (busy: boolean) => void;
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
  const cancelledRef = useRef(false);
  useEffect(() => {
    cancelledRef.current = false;
    return () => { cancelledRef.current = true; };
  }, []);
  useEffect(() => { setDocValue(initialUrl ?? ''); }, [initialUrl]);

  const busy = uploading || parsing;
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);

  const shownName = displayName || (docValue ? docValue.split('/').pop() : '');

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
        const hit = (list ?? []).find(e => e.docS3Key === key);
        if (hit) {
          onParsed(hit);
          setParseDone(true);
          setNotice('파싱 완료 — 추출된 SAQ 항목이 입력칸에 채워졌어요. CSDDD 준수 분석 결과를 확인해주세요.');
          return;
        }
      }
      setError('파싱이 지연되고 있습니다. 잠시 후 "파싱하기"로 다시 시도해주세요.');
    } finally {
      if (!cancelledRef.current) setParsing(false);
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
      const meta = await uploadFile(f, `self-assessment-doc:${supplierId}`);
      await updateSupplierDetail(supplierId, { self_assessment_doc_url: meta.s3Key });
      if (cancelledRef.current) return;
      setDocValue(meta.s3Key);
      setDisplayName(f.name);
      setSessionUploaded(true);
      setParseDone(false);  // 새 파일 = 새 파싱 사이클
      setNotice(`업로드 완료 · ${f.name} — AI가 CSDDD 실사 분석을 시작했어요`);
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
        ? 'AI 파싱 중… (최대 30초 정도 걸릴 수 있어요)'
        : notice
          ? notice
          : sessionUploaded
            ? `업로드됨 · ${shownName}`
            : '미업로드 · SAQ 보고서(PDF/이미지)를 올리면 고충처리·강제노동 등 항목을 자동으로 채워요.';

  return (
    <div className="relative overflow-hidden rounded-sm border border-ink-700 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink-100">실사 자가진단(SAQ) 보고서 (인권·안전 항목 자동 추출)</div>
          <div className={`mt-0.5 flex items-center gap-1.5 truncate text-xs ${error ? 'text-alert-text' : notice ? 'text-ok-text' : sessionUploaded ? 'text-ink-400' : 'text-ink-500'}`}>
            {busy && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-700" />}
            <span className="truncate">{statusText}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {sessionUploaded && !busy && (
            <span className="rounded-full border border-ok-border bg-ok-bg px-2 py-0.5 text-[11px] font-bold text-ok-text">업로드됨</span>
          )}
          {editable && (
            <>
              <label className={`rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 ${busy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-accent-100'}`}>
                {sessionUploaded ? '파일 변경' : '파일 업로드'}
                <input
                  type="file"
                  accept={SAQ_DOC_ACCEPT}
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
                {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {parsing ? '파싱 중…' : '파싱하기'}
              </button>
              {/* 결과 보기도 세션 업로드 전에는 비활성 — 업로드 없이 열면 빈 파싱 팝업만 떠서
                  [업로드→모달 확인→저장→분석] 흐름을 벗어난다. (파싱 지연 중 재열기는 허용) */}
              <button
                type="button"
                onClick={onOpenViewer}
                disabled={!sessionUploaded}
                className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink-700 disabled:hover:text-ink-500"
              >
                결과 보기
              </button>
            </>
          )}
        </div>
        {/* persistForm round-trip 캐리어 — 없으면 자료 제출 시 self_assessment_doc_url 이 NULL 로 덮인다. */}
        <input type="hidden" data-field="regulation.selfAssessmentDocUrl" value={docValue} readOnly />
      </div>
      {busy && <div className="h-0.5 w-full animate-pulse bg-accent-600" />}
    </div>
  );
}
