'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { getAiExtractions, type AiExtraction } from '@/lib/api';
import { CheckCircle2, FileText, ScanLine } from 'lucide-react';
import Badge from '@/components/Badge';
import ExtractionTable from './ExtractionTable';

// PDF 뷰어는 pdfjs(브라우저 전용)에 의존 → SSR 금지. 클라이언트에서만 로드한다.
const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-xs text-ink-400">뷰어 로딩 중…</div>,
});

// ─── HITL 규격 스키마 타입 ──
interface ExtractionField {
  fieldId: string;
  label: string;
  aiValue: string;
  confidence: number;
  requiresAttention: boolean;
  unit?: string;
  warning?: string;
}

interface ParsedDoc {
  docId: string;
  fileName: string;
  fileUrl: string | null;
  requestType: string;
  uploadedAt: string;
  submissionStatus: 'review' | 'approved' | 'rework' | 'rejected';
  extractionResult: {
    fields: ExtractionField[];
    unparsedFields: string[];
  };
}

interface InitialDoc {
  docId: string;
  fileName: string;
  fileUrl: string | null;
  requestType: string;
  docS3Key?: string | null;
}

// 필드 ID → 한국어 레이블 매핑
const FIELD_LABEL_KO: Record<string, string> = {
  // 핵심광물 함량
  li_content:                   'Li (리튬) 함량',
  co_content:                   'Co (코발트) 함량',
  ni_content:                   'Ni (니켈) 함량',
  mn_content:                   'Mn (망간) 함량',
  natural_graphite_content:     '천연흑연 함량',
  artificial_graphite_content:  '인조흑연 함량',
  synthetic_graphite_content:   '인조흑연 함량',
  // 탄소·에너지
  carbon_intensity:             '탄소 집약도',
  energy_source:                '에너지원',
  scope1_emission:              'Scope 1 배출량',
  scope2_emission:              'Scope 2 배출량',
  // 원산지·인증
  origin_country:               '원산지 국가',
  material_name:                '자재명',
  hs_code:                      'HS Code',
  issue_date:                   '발급일',
  recycled_content:             '재활용 원료 함량',
  certifying_agency:            '평가 기관명',
};

const MOCK_PARSED_DOCS: ParsedDoc[] = [
  {
    docId: 'doc-001',
    fileName: '환경영향평가_보고서_최종.pdf',
    fileUrl: null,
    requestType: '탄소 배출 보고서',
    uploadedAt: '2026-05-19',
    submissionStatus: 'review',
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
        { fieldId: 'origin_country',   label: '원산지 국가',     aiValue: '대한민국',     confidence: 0.98, requiresAttention: false, unit: '' },
        { fieldId: 'material_name',    label: '자재명',          aiValue: 'NORI-NCL-RAW', confidence: 0.95, requiresAttention: false, unit: '' },
        { fieldId: 'hs_code',          label: 'HS Code',         aiValue: '2604.00',      confidence: 0.76, requiresAttention: true,  unit: '' },
        { fieldId: 'issue_date',       label: '발급일',          aiValue: '2026-05-10',   confidence: 0.91, requiresAttention: false, unit: '' },
        { fieldId: 'recycled_content', label: '재활용 원료 함량', aiValue: '16',           confidence: 0.63, requiresAttention: true,  unit: '%', warning: '재활용 함량 증빙 근거를 추가로 확인해 주세요.' },
      ],
      unparsedFields: ['광산 GPS 폴리곤 좌표'],
    },
  },
];

type CompletedMap = Record<string, boolean>;

const STATUS_TO_REVIEW: Record<string, ParsedDoc['submissionStatus']> = {
  submission_approved: 'approved', submission_rework: 'rework', submission_rejected: 'rejected',
};

function extractionToDoc(x: AiExtraction, initialDoc?: InitialDoc | null): ParsedDoc {
  const fields: ExtractionField[] = Object.keys(x.parsedFields).map(k => {
    const confidence = x.confidenceMap[k] ?? 0;
    return {
      fieldId: k,
      label: FIELD_LABEL_KO[k] ?? k,   // 한국어 레이블, 없으면 원본 키
      aiValue: String(x.parsedFields[k]),
      confidence,
      requiresAttention: confidence < 0.8,
      unit: '',
    };
  });
  const sameInitialDoc = initialDoc && x.docS3Key && x.docS3Key === initialDoc.docS3Key;
  return {
    docId: x.requestId,
    fileName: x.documentFileName ?? (sameInitialDoc ? initialDoc.fileName : `${x.requestedDataType ?? '자료'}.pdf`),
    fileUrl: x.documentUrl ?? (sameInitialDoc ? initialDoc.fileUrl : null),
    requestType: x.requestedDataType ?? '자료',
    uploadedAt: '',
    submissionStatus: STATUS_TO_REVIEW[x.submissionStatus ?? ''] ?? 'review',
    extractionResult: { fields, unparsedFields: x.unparsedFields },
  };
}

function initialDocToParsedDoc(doc: InitialDoc): ParsedDoc {
  return {
    docId: doc.docId,
    fileName: doc.fileName,
    fileUrl: doc.fileUrl,
    requestType: doc.requestType,
    uploadedAt: '',
    submissionStatus: 'review',
    extractionResult: {
      fields: [
        { fieldId: 'Li',                label: 'Li (리튬) 함량(%)',     aiValue: '', confidence: 0, requiresAttention: true, unit: '%' },
        { fieldId: 'Co',                label: 'Co (코발트) 함량(%)',   aiValue: '', confidence: 0, requiresAttention: true, unit: '%' },
        { fieldId: 'Ni',                label: 'Ni (니켈) 함량(%)',     aiValue: '', confidence: 0, requiresAttention: true, unit: '%' },
        { fieldId: 'Mn',                label: 'Mn (망간) 함량(%)',     aiValue: '', confidence: 0, requiresAttention: true, unit: '%' },
        { fieldId: 'natural_graphite',  label: '천연흑연 함량(%)',       aiValue: '', confidence: 0, requiresAttention: true, unit: '%' },
        { fieldId: 'synthetic_graphite',label: '인조흑연 함량(%)',       aiValue: '', confidence: 0, requiresAttention: true, unit: '%' },
      ],
      unparsedFields: [],
    },
  };
}

// ─── 소재구성 문서 미리보기 — 파싱된 값을 문서 내 셀에 직접 하이라이트 ──────
// 문서 위 배지가 아니라, 실제 테이블 셀 위치에 노란색 하이라이트를 적용한다.
const MINERAL_DOC_ROWS: { label: string; subLabel?: string; ids: string[] }[] = [
  { label: 'Li (리튬)',                              ids: ['Li', 'li_content'] },
  { label: 'Co (코발트)',                            ids: ['Co', 'co_content'] },
  { label: 'Ni (니켈)',                              ids: ['Ni', 'ni_content'] },
  { label: 'Mn (망간)',                              ids: ['Mn', 'mn_content'] },
  { label: '천연흑연 (Natural Graphite)',            ids: ['natural_graphite', 'natural_graphite_content'] },
  { label: '인조흑연 (Artificial Graphite)',         ids: ['synthetic_graphite', 'artificial_graphite_content', 'synthetic_graphite_content'] },
];

// 필드 ID 목록 중 첫 번째 매칭되는 파싱 필드 반환
function getFieldMatch(
  fields: ExtractionField[],
  ids: string[],
): ExtractionField | null {
  for (const id of ids) {
    const f = fields.find(f => f.fieldId === id);
    if (f && f.aiValue !== '') return f;
  }
  return null;
}

// hover 전: 무조건 회색 하이라이트
// hover 시: 신뢰도별 색상 (초록/주황/빨강)
function getHighlightColor(confidence: number, isActive: boolean): string {
  if (!isActive) {
    // 기본 상태: 회색
    return 'bg-gray-200 text-gray-700';
  }
  // hover 강조: 신뢰도별 색상
  if (confidence >= 0.9) return 'bg-green-200 text-green-900 ring-2 ring-green-400';
  if (confidence >= 0.7) return 'bg-orange-200 text-orange-900 ring-2 ring-orange-400';
  return 'bg-red-200 text-red-900 ring-2 ring-red-400';
}

function MaterialDocumentPreview({
  doc,
  hoveredFieldId,   // 우측 패널에서 hover 중인 fieldId → 문서 셀 강조
  onFieldHover,     // 문서 셀 hover → 우측 패널 강조
}: {
  doc: ParsedDoc;
  hoveredFieldId: string | null;
  onFieldHover: (fieldId: string | null) => void;
}) {
  const fields = doc.extractionResult.fields;

  return (
    <div className="h-full overflow-y-auto bg-white">
      {/* 문서 본문 */}
      <div className="mx-auto max-w-2xl px-10 py-10 font-[pretendard,_sans-serif] text-gray-800">

        {/* 제목 */}
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-gray-900">
            소재 구성 명세서 (Material Composition Sheet)
          </h1>
          <p className="mt-2 text-[13px] text-blue-600">
            본 문서는 배터리 셀 양극재/음극재 소재 구성 비율을 명시한 자료입니다.
          </p>
        </div>

        {/* 1. 회사 정보 */}
        <div className="mb-8">
          <h2 className="mb-3 text-[15px] font-bold text-gray-900">1. 회사 정보</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-48 border border-gray-300 bg-[#1a4731] px-4 py-2.5 text-left text-[13px] font-semibold text-white">
                  항목
                </th>
                <th className="border border-gray-300 bg-[#1a4731] px-4 py-2.5 text-left text-[13px] font-semibold text-white">
                  값
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2.5 text-[13px]">회사명 (company_name)</td>
                <td className="border border-gray-300 px-4 py-2.5 text-[13px]">—</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2.5 text-[13px]">영문 회사명 (company_name_en)</td>
                <td className="border border-gray-300 px-4 py-2.5 text-[13px]">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. 핵심광물 함량 */}
        <div className="mb-8">
          <h2 className="mb-3 text-[15px] font-bold text-gray-900">2. 핵심광물 함량</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-56 border border-gray-300 bg-[#1a4731] px-4 py-2.5 text-left text-[13px] font-semibold text-white">
                  광물
                </th>
                <th className="border border-gray-300 bg-[#1a4731] px-4 py-2.5 text-left text-[13px] font-semibold text-white">
                  함량(%)
                </th>
              </tr>
            </thead>
            <tbody>
              {MINERAL_DOC_ROWS.map((row, idx) => {
                const matched = getFieldMatch(fields, row.ids);
                const fieldId = matched?.fieldId ?? null;
                // 우측 패널 hover 중인 필드와 일치하는지
                const isActiveFromTable = fieldId !== null && hoveredFieldId === fieldId;
                const hasParsedValue = matched !== null;

                return (
                  <tr
                    key={row.label}
                    className={`border-b border-gray-200 transition-colors duration-150 ${
                      hasParsedValue ? 'cursor-pointer' : ''
                    }`}
                    onMouseEnter={() => fieldId && onFieldHover(fieldId)}
                    onMouseLeave={() => onFieldHover(null)}
                  >
                    <td
                      className={`border border-gray-300 px-4 py-2.5 text-[13px] transition-colors duration-150 ${
                        isActiveFromTable
                          ? matched && matched.confidence >= 0.9
                            ? 'bg-green-50'
                            : matched && matched.confidence >= 0.7
                            ? 'bg-orange-50'
                            : 'bg-red-50'
                          : 'bg-white'
                      }`}
                    >
                      {row.label}
                    </td>
                    <td
                      className={`border border-gray-300 px-4 py-2.5 text-[13px] font-semibold transition-colors duration-150 ${
                        isActiveFromTable
                          ? matched && matched.confidence >= 0.9
                            ? 'bg-green-50'
                            : matched && matched.confidence >= 0.7
                            ? 'bg-orange-50'
                            : 'bg-red-50'
                          : 'bg-white'
                      }`}
                    >
                      {hasParsedValue && matched ? (
                        // 파싱된 값 → 노란 하이라이트 span
                        <span
                          className={`inline-block rounded px-2 py-0.5 transition-all duration-150 ${
                            getHighlightColor(matched.confidence, isActiveFromTable)
                          }`}
                        >
                          {matched.aiValue}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 3. 비고 */}
        <div>
          <h2 className="mb-3 text-[15px] font-bold text-gray-900">3. 비고</h2>
          <p className="text-[13px] leading-relaxed text-gray-500">
            인조흑연 함량은 현재 자료 수집 중이며, 추후 갱신 예정입니다. 본 명세서는 NCM811 양극재 기준으로 작성되었습니다.
          </p>
        </div>

      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────
export default function AiParsingView({
  supplierId,
  onConfirmComplete,
  realOnly = false,
  mode = 'supplier',
  docCategoryFilter,
  docS3KeyFilter,
  initialDoc,
  initialExtraction,
  onParsed,
  saveOnlyMode = false,
}: {
  supplierId: string;
  onConfirmComplete: () => void;
  realOnly?: boolean;
  mode?: 'supplier' | 'prime';
  docCategoryFilter?: string;
  docS3KeyFilter?: string | null;
  initialDoc?: InitialDoc | null;
  initialExtraction?: AiExtraction | null;
  onParsed?: (extraction: AiExtraction) => void;
  saveOnlyMode?: boolean;
}) {
  const prime = mode === 'prime';
  const initialDocs = initialExtraction
    ? [extractionToDoc(initialExtraction, initialDoc)]
    : initialDoc ? [initialDocToParsedDoc(initialDoc)] : (realOnly ? [] : MOCK_PARSED_DOCS);
  const [docs, setDocs] = useState<ParsedDoc[]>(initialDocs);
  const [activeDocId, setActiveDocId] = useState(initialDocs[0]?.docId ?? '');
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [completedDocs, setCompletedDocs] = useState<CompletedMap>({});
  const notifiedExtractionRef = useRef<string | null>(null);

  // ── 좌↔우 하이라이트 연동 상태 ──────────────────────────────────────────
  // docFieldHover: 좌측 문서에서 hover 중인 fieldId → 우측 패널 강조
  const [docFieldHover, setDocFieldHover] = useState<string | null>(null);
  // tableFieldHover: 우측 ExtractionTable에서 hover 중인 fieldId → 좌측 문서 강조
  const [tableFieldHover, setTableFieldHover] = useState<string | null>(null);

  // 소재구성 문서 전용 HTML 미리보기 사용 여부
  const isMaterialDoc = docCategoryFilter === 'material_composition';

  useEffect(() => {
    let cancelled = false;
    getAiExtractions()
      .then(list => {
        const mine = list
          .filter(x => !supplierId || x.supplierId === supplierId)
          .filter(x => !docCategoryFilter || x.docCategory === docCategoryFilter || x.requestedDataType === '소재구성 문서')
          .filter(x => !docS3KeyFilter || x.docS3Key === docS3KeyFilter)
          .map(x => extractionToDoc(x, initialDoc));
        if (cancelled) return;
        if (mine.length) { setDocs(mine); setActiveDocId(mine[0].docId); }
        else if (initialExtraction) {
          const localDoc = extractionToDoc(initialExtraction, initialDoc);
          setDocs([localDoc]);
          setActiveDocId(localDoc.docId);
        }
        else if (initialDoc) { setDocs([initialDocToParsedDoc(initialDoc)]); setActiveDocId(initialDoc.docId); }
        else if (realOnly) { setDocs([]); setActiveDocId(''); }
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [supplierId, realOnly, docCategoryFilter, docS3KeyFilter, initialDoc, initialExtraction]);

  useEffect(() => {
    if (!initialDoc) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    const maxAttempts = 16;
    const matchesFilter = (x: AiExtraction) =>
      (!supplierId || x.supplierId === supplierId) &&
      (!docCategoryFilter || x.docCategory === docCategoryFilter || x.requestedDataType === '소재구성 문서') &&
      (!docS3KeyFilter || x.docS3Key === docS3KeyFilter);

    const poll = () => {
      attempt += 1;
      getAiExtractions()
        .then(list => {
          if (cancelled) return;
          const matchedExtraction = list.find(matchesFilter);
          if (!matchedExtraction) {
            if (attempt < maxAttempts) timeoutId = setTimeout(poll, 2500);
            return;
          }
          const parsedDoc = extractionToDoc(matchedExtraction, initialDoc);
          setDocs([parsedDoc]);
          setActiveDocId(parsedDoc.docId);
          if (notifiedExtractionRef.current !== matchedExtraction.requestId) {
            notifiedExtractionRef.current = matchedExtraction.requestId;
            onParsed?.(matchedExtraction);
          }
        })
        .catch(() => {
          if (!cancelled && attempt < maxAttempts) timeoutId = setTimeout(poll, 2500);
        });
    };

    poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [supplierId, docCategoryFilter, docS3KeyFilter, initialDoc, onParsed]);

  if (docs.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink-800 text-center text-ink-400">
        <div>
          <ScanLine className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm font-semibold">
            {!loaded ? 'AI 추출 결과 불러오는 중…' : loadError ? 'AI 추출 결과를 불러오지 못했습니다.' : '이 협력사의 추출된 근거 자료가 없습니다.'}
          </p>
          {loaded && (
            <p className="mt-1 text-[11px] opacity-70">
              {loadError ? '잠시 후 다시 시도해 주세요.' : '협력사가 자료를 제출하면 AI 파싱 결과가 여기에 표시됩니다.'}
            </p>
          )}
        </div>
      </div>
    );
  }

  const activeDoc = docs.find(d => d.docId === activeDocId) ?? docs[0];
  const allCompleted = docs.every(d => completedDocs[d.docId]);

  function handleDocComplete() {
    const updated: CompletedMap = { ...completedDocs, [activeDocId]: true };
    setCompletedDocs(updated);
    const next = docs.find(d => !updated[d.docId]);
    if (next) {
      setActiveDocId(next.docId);
    } else {
      onConfirmComplete();
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-ink-800">

      {/* 실데이터 로드 실패 배너 */}
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
            <div className="text-xs font-bold text-ink-100">{prime ? 'AI 파싱 검토' : 'AI 파싱 확인 및 수정'}</div>
            <div className="mt-0.5 text-[10px] text-ink-500">
              {prime
                ? '협력사 제출 자료의 AI 추출 결과입니다. 항목별로 검토·확인하세요.'
                : 'AI가 추출한 데이터를 확인하고 수정한 뒤 저장하세요. 좌측 문서에서 값을 확인할 수 있습니다.'}
            </div>
          </div>
        </div>
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
              <span className="max-w-[140px] truncate">{doc.fileName}</span>
              <span className="text-[10px] text-ink-500">{doc.requestType}</span>
              {isDone && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-signal-ok" />}
            </button>
          );
        })}
      </div>

      {/* ── 3. 스플릿 뷰 ── */}
      <div className="flex min-h-0 flex-1 gap-1 p-1">

        {/* 좌측: 소재구성 → HTML 문서 미리보기 / 그 외 → PDF iframe */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-sm border border-ink-700 bg-white">
          {isMaterialDoc ? (
            // 소재구성 전용 HTML 렌더링 + 노란 하이라이트
            <MaterialDocumentPreview
              doc={activeDoc}
              hoveredFieldId={tableFieldHover ?? docFieldHover}   // 우측 패널 OR 문서 자체 hover 모두 반영
              onFieldHover={setDocFieldHover}     // 문서 셀 hover → 우측 강조
            />
          ) : activeDoc.fileUrl ? (
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

        {/* 우측: ExtractionTable */}
        <ExtractionTable
          key={activeDoc.docId}
          doc={activeDoc}
          supplierId={supplierId}
          mode={mode}
          onConfirmComplete={handleDocComplete}
          isLastDoc={
            docs.filter(d => !completedDocs[d.docId]).length === 1 &&
            !completedDocs[activeDoc.docId]
          }
          hoveredFieldId={docFieldHover}       // 좌측 문서 hover → 우측 강조
          onFieldHover={setTableFieldHover}    // 우측 hover → 좌측 문서 강조
          saveOnlyMode={saveOnlyMode}
        />

      </div>
    </div>
  );
}
