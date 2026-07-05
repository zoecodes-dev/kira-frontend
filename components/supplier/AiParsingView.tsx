'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { getAiExtractions, checkOrigin, type AiExtraction, type OriginCheckResult } from '@/lib/api';
import { CheckCircle2, FileText, ScanLine } from 'lucide-react';
import Badge from '@/components/Badge';
import ExtractionTable from './ExtractionTable';
import OriginRiskBanner from './OriginRiskBanner';

// PDF 뷰어는 pdfjs(브라우저 전용)에 의존 → SSR 금지. 클라이언트에서만 로드한다.
const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-xs text-ink-400">뷰어 로딩 중…</div>,
});

// ─── HITL 규격 스키마 타입 ──
// 제출 상태값: review | approved | rework | rejected
// 협력사 AI 파싱 → review(검토 중)로 전송 → 원청사가 approved/rework/rejected 판정
interface ExtractionField {
  fieldId: string;     // 원청사 Queue JSON key와 동일
  label: string;       // 화면 표시명
  aiValue: string;     // AI 추출값
  confidence: number;  // 0.0~1.0
  requiresAttention: boolean; // confidence < 0.80
  unit?: string;
  warning?: string;
}

interface ParsedDoc {
  docId: string;
  fileName: string;
  fileUrl: string | null;   // 원본 문서 PDF presigned URL (없으면 placeholder)
  requestType: string;
  uploadedAt: string;
  // 원청사 검토 상태값으로 전송될 초기값
  submissionStatus: 'review' | 'approved' | 'rework' | 'rejected';
  extractionResult: {
    fields: ExtractionField[];
    unparsedFields: string[];
  };
  // 원산지 증명서(origin_certificate)일 때만 세팅 — 파싱된 원산지로 UFLPA 실시간 판정을 건다.
  originQuery?: { country?: string; region?: string; address?: string } | null;
}

// ─── Mock Data — HITL/Queue 규격과 1:1 동기화 ──────────────────────────────
// 실제 API 연동 시 fetch 호출로 교체 (인터페이스는 그대로 유지)
const MOCK_PARSED_DOCS: ParsedDoc[] = [
  {
    docId: 'doc-001',
    fileName: '환경영향평가_보고서_최종.pdf',
    fileUrl: null,
    requestType: '탄소 배출 보고서',
    uploadedAt: '2026-05-19',
    submissionStatus: 'review',  // 원청사 Queue로 전송될 초기 상태
    extractionResult: {
      fields: [
        { fieldId: 'scope1_emission',   label: 'Scope 1 배출량', aiValue: '1,240', confidence: 0.96, requiresAttention: false, unit: 'tCO2e' },
        { fieldId: 'scope2_emission',   label: 'Scope 2 배출량', aiValue: '4,20',  confidence: 0.45, requiresAttention: true,  unit: 'tCO2e', warning: '숫자 형식이 불확실합니다.' },
        { fieldId: 'carbon_intensity',  label: '탄소 집약도',    aiValue: '2.34',  confidence: 0.82, requiresAttention: true,  unit: 'kgCO2e/kWh' },
        { fieldId: 'certifying_agency', label: '평가 기관명',    aiValue: '글로벌에코인증원', confidence: 0.92, requiresAttention: false, unit: '' },
      ],
      unparsedFields: ['검증 완료일', '현장 실사 여부'],
    },
  },
  {
    docId: 'doc-002',
    fileName: '원산지_증명서_NORI-NCL-RAW.pdf',
    fileUrl: null,
    requestType: '원산지 증명서',
    uploadedAt: '2026-05-20',
    submissionStatus: 'review',
    extractionResult: {
      fields: [
        { fieldId: 'origin_country', label: '원산지 국가',     aiValue: '대한민국',  confidence: 0.98, requiresAttention: false, unit: '' },
        { fieldId: 'material_name',  label: '자재명',          aiValue: 'NORI-NCL-RAW', confidence: 0.95, requiresAttention: false, unit: '' },
        { fieldId: 'hs_code',        label: 'HS Code',         aiValue: '2604.00',  confidence: 0.76, requiresAttention: true,  unit: '' },
        { fieldId: 'issue_date',     label: '발급일',          aiValue: '2026-05-10', confidence: 0.91, requiresAttention: false, unit: '' },
        { fieldId: 'recycled_content', label: '재활용 원료 함량', aiValue: '16',     confidence: 0.63, requiresAttention: true,  unit: '%', warning: '재활용 함량 증빙 근거를 추가로 확인해 주세요.' },
      ],
      unparsedFields: ['광산 GPS 폴리곤 좌표'],
    },
  },
];

// 문서별 완료 여부를 추적하기 위한 타입
type CompletedMap = Record<string, boolean>;

// 실 AI 추출(GET /data-requests/ai-extractions) → AiParsingView 문서 형태. 협력사/원청 동일 데이터.
const STATUS_TO_REVIEW: Record<string, ParsedDoc['submissionStatus']> = {
  submission_approved: 'approved', submission_rework: 'rework', submission_rejected: 'rejected',
};
function extractionToDoc(x: AiExtraction): ParsedDoc {
  const fields: ExtractionField[] = Object.keys(x.parsedFields).map(k => {
    const confidence = x.confidenceMap[k] ?? 0;
    return { fieldId: k, label: k, aiValue: String(x.parsedFields[k]), confidence, requiresAttention: confidence < 0.8, unit: '' };
  });
  // 원산지 증명서면 파싱된 국가/지역을 UFLPA 판정 입력으로 뽑는다(값 없으면 판정 스킵).
  //   주의: api 래퍼(snakeToCamel)가 parsedFields 내부 키까지 camelCase로 바꾼다(origin_country → originCountry).
  const pf = x.parsedFields;
  const str = (v: unknown) => (v != null && String(v).trim() ? String(v).trim() : undefined);
  const originQuery =
    x.docCategory === 'origin_certificate'
      ? { country: str(pf.originCountry), region: str(pf.originRegion), address: str(pf.originAddress) }
      : null;
  return {
    docId: x.requestId,
    fileName: x.documentFileName ?? `${x.requestedDataType ?? '자료'}.pdf`,
    fileUrl: x.documentUrl ?? null,
    requestType: x.requestedDataType ?? '자료',
    uploadedAt: '',
    submissionStatus: STATUS_TO_REVIEW[x.submissionStatus ?? ''] ?? 'review',
    extractionResult: { fields, unparsedFields: x.unparsedFields },
    originQuery,
  };
}

export default function AiParsingView({
  supplierId,
  onConfirmComplete,
  realOnly = false,
  mode = 'supplier',
}: {
  supplierId: string;
  onConfirmComplete: () => void;
  // realOnly: 실 AI 추출만 표시(없으면 빈 상태). 원청 검토 모달용 — 무관한 mock 금지.
  // false(기본)면 협력사 데모처럼 실데이터 없을 때 mock 폴백.
  realOnly?: boolean;
  // mode: 'supplier'(협력사 제출 화면) | 'oem'(원청 검토 화면). 같은 페이지 공용 — 문구만 분리.
  mode?: 'supplier' | 'oem';
}) {
  const oem = mode === 'oem';
  // 공통 모듈 — 실 AI 추출(getAiExtractions)을 이 협력사 기준으로 가져와 표시.
  // (원청 대시보드 HitlReviewCard와 동일 데이터 소스 = 협력사/원청 동일 데이터.)
  const [docs, setDocs] = useState<ParsedDoc[]>(realOnly ? [] : MOCK_PARSED_DOCS);
  const [activeDocId, setActiveDocId] = useState(realOnly ? '' : MOCK_PARSED_DOCS[0].docId);
  const [loaded, setLoaded] = useState(false);
  // 실 AI 추출 로드 실패 여부 — 실패를 조용히 mock으로 가리지 않기 위함(#5).
  const [loadError, setLoadError] = useState(false);
  // 문서별 제출 완료 여부 — { [docId]: true }
  const [completedDocs, setCompletedDocs] = useState<CompletedMap>({});
  // 원산지 증명서 UFLPA 판정 결과 — { [docId]: 결과 | 'loading' }. 자문(advisory)이라 실패는 조용히 무시.
  const [originRisk, setOriginRisk] = useState<Record<string, OriginCheckResult | 'loading'>>({});

  useEffect(() => {
    let cancelled = false;
    getAiExtractions()
      .then(list => {
        const mine = list.filter(x => !supplierId || x.supplierId === supplierId).map(extractionToDoc);
        if (cancelled) return;
        if (mine.length) { setDocs(mine); setActiveDocId(mine[0].docId); }
        else if (realOnly) { setDocs([]); setActiveDocId(''); } // 실데이터 없음 → 빈 상태(mock 금지)
      })
      .catch(() => { if (!cancelled) setLoadError(true); /* 실데이터 로드 실패 — 빈/배너로 표시 */ })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [supplierId, realOnly]);

  // 활성 문서가 원산지 증명서면 파싱된 국가/지역으로 UFLPA 실시간 판정을 건다.
  //   (SupplierGeneralReview의 checkOrigin 흐름 재사용 — 파싱 완료 → 즉시 판정 배너)
  useEffect(() => {
    const doc = docs.find(d => d.docId === activeDocId);
    const q = doc?.originQuery;
    if (!q || (!q.country && !q.region)) return;   // 원산지 증명서 아님/값 없음 → 스킵
    if (originRisk[activeDocId]) return;            // 이미 판정함(중복 호출 방지)
    let cancelled = false;
    setOriginRisk(s => ({ ...s, [activeDocId]: 'loading' }));
    checkOrigin({ country: q.country, region: q.region, address: q.address })
      .then(res => { if (!cancelled) setOriginRisk(s => ({ ...s, [activeDocId]: res })); })
      .catch(() => {
        // 판정 실패는 조용히 무시(자문 기능이라 흐름 방해 금지) — 'loading' 제거
        if (!cancelled) setOriginRisk(s => { const n = { ...s }; delete n[activeDocId]; return n; });
      });
    return () => { cancelled = true; };
    // originRisk는 가드용으로만 읽고 deps에서 제외(재호출 루프 방지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocId, docs]);

  // realOnly이고 추출 자료가 없으면 무관한 mock 대신 빈/로딩 상태 표시.
  if (docs.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink-800 text-center text-ink-400">
        <div>
          <ScanLine className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm font-semibold">{!loaded ? 'AI 추출 결과 불러오는 중…' : loadError ? 'AI 추출 결과를 불러오지 못했습니다.' : '이 협력사의 추출된 근거 자료가 없습니다.'}</p>
          {loaded && <p className="mt-1 text-[11px] opacity-70">{loadError ? '잠시 후 다시 시도해 주세요.' : '협력사가 자료를 제출하면 AI 파싱 결과가 여기에 표시됩니다.'}</p>}
        </div>
      </div>
    );
  }

  const activeDoc = docs.find(d => d.docId === activeDocId) ?? docs[0];
  const allCompleted = docs.every(d => completedDocs[d.docId]);

  // ExtractionTable에서 "저장 및 다음으로" 클릭 시 호출
  // → 현재 문서를 완료 처리하고, 다음 미완료 탭으로 자동 이동
  function handleDocComplete() {
    const updated: CompletedMap = { ...completedDocs, [activeDocId]: true };
    setCompletedDocs(updated);

    // 다음 미완료 문서로 자동 이동
    const next = docs.find(d => !updated[d.docId]);
    if (next) {
      setActiveDocId(next.docId);
    } else {
      // 모든 문서 완료 → 부모에게 알림
      onConfirmComplete();
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-ink-800">

      {/* 실데이터 로드 실패 — 데모(mock)가 표시될 수 있으므로 명시(조용한 마스킹 방지, #5) */}
      {loadError && (
        <div className="shrink-0 border-b border-alert-border bg-alert-bg px-6 py-2 text-[11px] font-semibold text-alert-text">
          실 AI 추출 데이터를 불러오지 못했습니다 — 아래 항목은 데모 예시일 수 있습니다.
        </div>
      )}

      {/* ── 1. 상단 헤더 ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-white px-6 py-3 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-accent-50">
            <ScanLine className="h-4 w-4 text-accent-700" />
          </div>
          <div>
            <div className="text-xs font-bold text-ink-100">{oem ? 'AI 파싱 검토' : 'AI 파싱 확인 및 수정'}</div>
            <div className="mt-0.5 text-[10px] text-ink-500">
              {oem
                ? '협력사 제출 자료의 AI 추출 결과입니다. 항목별로 검토·확인하세요.'
                : 'AI가 추출한 데이터를 검토하고 수정한 뒤, 문서별로 제출해 주세요.'}
            </div>
          </div>
        </div>
        {/* 전체 완료 여부 배지 */}
        <Badge tone={allCompleted ? 'ok' : 'neutral'}>
          {Object.keys(completedDocs).length} / {docs.length} 완료
        </Badge>
      </div>

      {/* ── 2. 문서 탭 ── */}
      <div className="flex shrink-0 items-end gap-0.5 border-b border-ink-700 bg-white px-4 pt-2">
        {docs.map(doc => {
          const isActive = doc.docId === activeDocId;
          const isDone = !!completedDocs[doc.docId];
          return (
            <button
              key={doc.docId}
              type="button"
              onClick={() => setActiveDocId(doc.docId)}
              className={`flex items-center gap-2 rounded-t-xs border-x border-t px-4 py-2.5 text-[11px] font-semibold transition-colors ${
                isActive
                  ? 'border-ink-600 bg-white text-ink-100 shadow-[0_1px_0_white]'
                  : 'border-transparent bg-ink-800 text-ink-400 hover:bg-white hover:text-ink-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              {/* 파일명이 길면 말줄임 */}
              <span className="max-w-[140px] truncate">{doc.fileName}</span>
              <span className={`text-[10px] ${isActive ? 'text-ink-500' : 'text-ink-500'}`}>
                {doc.requestType}
              </span>
              {/* 완료 문서에 체크 아이콘 */}
              {isDone && (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-signal-ok" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── 2-1. 원산지 증명서 UFLPA 판정 배너 (원산지 증명서 탭에서만) ── */}
      {(() => {
        const r = originRisk[activeDoc.docId];
        const visible =
          r === 'loading' || (!!r && typeof r !== 'string' && (r.isViolated || r.severity === 'warning'));
        if (!visible) return null;
        return (
          <div className="shrink-0 border-b border-ink-700 bg-white px-6 py-2">
            <OriginRiskBanner result={r} />
          </div>
        );
      })()}

      {/* ── 3. 스플릿 뷰 컨테이너 ── */}
      <div className="flex min-h-0 flex-1 gap-1 p-1">

        {/* 좌측: PDF 뷰어 — 원본 문서 URL이 있으면 react-pdf로 렌더, 없으면 안내 */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-sm border border-ink-700 bg-white">
          {activeDoc.fileUrl ? (
            <PdfViewer fileUrl={activeDoc.fileUrl} fileName={activeDoc.fileName} />
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-ink-800/30 px-4 py-2.5">
                <span className="text-[11px] font-bold text-ink-500">원본 문서 뷰어</span>
              </div>
              <div className="flex flex-1 items-center justify-center bg-[#E5E7EB]">
                <div className="text-center text-ink-400">
                  <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
                  <p className="text-xs">{activeDoc.fileName}</p>
                  <p className="mt-1 text-[11px] opacity-60">원본 문서 URL이 없습니다 (S3 미구성 또는 미업로드)</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 우측: ExtractionTable — key로 문서 전환 시 상태 초기화 */}
        <ExtractionTable
          key={activeDoc.docId}
          doc={activeDoc}
          supplierId={supplierId}
          mode={mode}
          onConfirmComplete={handleDocComplete}
          isLastDoc={
            // 현재 탭이 마지막 미완료 문서인지 판단
            // → 마지막 문서일 때 버튼 텍스트를 "원청사로 제출"로 변경
            docs.filter(d => !completedDocs[d.docId]).length === 1 &&
            !completedDocs[activeDoc.docId]
          }
        />

      </div>
    </div>
  );
}
