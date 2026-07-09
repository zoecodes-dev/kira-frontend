'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { getAiExtractions, type AiExtraction } from '@/lib/api';
import { CheckCircle2, FileText, ScanLine, X, Loader2 } from 'lucide-react';
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
  // [목표2] PDF 원문 역추적 좌표 (PyMuPDF 산출, __locations__에서 부착)
  location?: { page: number; bbox: number[]; page_width?: number; page_height?: number } | null;
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

const CARBON_FIELD_LABELS: Record<string, string> = {
  carbon_intensity: '탄소집약도 (kgCO2eq/kg)',
  energy_source: '에너지원',
};

// 소재구성/탄소발자국 문서의 "뽑아야 할 필드" 카탈로그 — 못 찾아도(신뢰도 0) 항상 행을 만들어
// 수정 필요로 표시한다. 문서에 있는 무관한 필드(회사명 등)는 이 카탈로그 밖이라 노출하지 않는다.
// ids: 같은 개념의 대체 필드명(예 인조흑연 = artificial_graphite_content|synthetic_graphite_content).
type DocCatalogRow = { label: string; unit: string; ids: string[] };
const MATERIAL_DOC_CATALOG: DocCatalogRow[] = [
  { label: 'Li (리튬) 함량(%)', unit: '%', ids: ['li_content'] },
  { label: 'Co (코발트) 함량(%)', unit: '%', ids: ['co_content'] },
  { label: 'Ni (니켈) 함량(%)', unit: '%', ids: ['ni_content'] },
  { label: 'Mn (망간) 함량(%)', unit: '%', ids: ['mn_content'] },
  { label: '천연흑연 함량(%)', unit: '%', ids: ['natural_graphite_content'] },
  { label: '인조흑연 함량(%)', unit: '%', ids: ['artificial_graphite_content', 'synthetic_graphite_content'] },
];
const CARBON_DOC_CATALOG: DocCatalogRow[] = [
  { label: '탄소집약도 (kgCO2eq/kg)', unit: 'kgCO2eq/kg', ids: ['carbon_intensity'] },
  { label: '에너지원', unit: '', ids: ['energy_source'] },
];
// SAQ(실사 자가진단, dd_audit_report) 카탈로그 — 백엔드 masterform_prefill 'saq' 섹션과 1:1.
// 소재구성/탄소 필드가 아니라 인권·안전 실사 항목만 노출한다.
// 메인 화면(3-2)의 상단 콤팩트 폼(등급·점수·평가일·유효기간) + 하단 체크리스트와 동기화.
const SAQ_DOC_CATALOG: DocCatalogRow[] = [
  { label: '종합 리스크 등급 (low/medium/high)', unit: '', ids: ['saq_risk_level'] },
  { label: '종합 평가 점수', unit: '점', ids: ['saq_score'] },
  { label: '평가 일자 (YYYY-MM-DD)', unit: '', ids: ['saq_assessed_at'] },
  { label: '유효 기간 (YYYY-MM-DD)', unit: '', ids: ['saq_valid_until'] },
  { label: '고충처리 메커니즘 운영 여부', unit: '', ids: ['grievance_mechanism'] },
  { label: '아동노동 금지 정책/징후', unit: '', ids: ['child_labor_risk'] },
  { label: '강제노동 금지 정책/징후', unit: '', ids: ['forced_labor_risk'] },
  { label: '안전보건경영시스템 인증 (ISO 45001 등)', unit: '', ids: ['iso_45001_certified'] },
  { label: '환경경영시스템 인증 (ISO 14001 등)', unit: '', ids: ['iso_14001_certified'] },
];

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

function pickEvidenceNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const value = Number(match[1].replace(',', '.'));
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function extractMaterialFieldsFromEvidence(summary?: string | null): Record<string, number> {
  if (!summary) return {};
  const specs: Array<[string, RegExp[]]> = [
    ['li_content', [/(?:Li|리튬)[^0-9]{0,50}(\d+(?:[.,]\d+)?)\s*%/i]],
    ['co_content', [/(?:Co|코발트)[^0-9]{0,50}(\d+(?:[.,]\d+)?)\s*%/i]],
    ['ni_content', [/(?:Ni|니켈)[^0-9]{0,50}(\d+(?:[.,]\d+)?)\s*%/i]],
    ['mn_content', [/(?:Mn|망간)[^0-9]{0,50}(\d+(?:[.,]\d+)?)\s*%/i]],
    ['natural_graphite_content', [/(?:natural graphite|천연흑연)[^0-9]{0,80}(\d+(?:[.,]\d+)?)\s*%/i]],
    ['artificial_graphite_content', [/(?:artificial graphite|synthetic graphite|인조흑연)[^0-9]{0,80}(\d+(?:[.,]\d+)?)\s*%/i]],
  ];
  const parsed: Record<string, number> = {};
  for (const [key, patterns] of specs) {
    const value = pickEvidenceNumber(summary, patterns);
    if (value != null) parsed[key] = value;
  }
  return parsed;
}

function extractionToDoc(x: AiExtraction, initialDoc?: InitialDoc | null): ParsedDoc {
  const isMaterialExtraction =
    x.docCategory === 'material_composition' ||
    x.requestedDataType === '소재구성 문서' ||
    x.requestId?.startsWith('local-material-');
  const isCarbonExtraction =
    x.docCategory === 'carbon_footprint_declaration' ||
    x.requestedDataType === '탄소발자국 문서' ||
    x.requestedDataType?.includes('carbon') ||
    x.requestedDataType?.includes('환경성적') ||
    x.requestId?.startsWith('local-carbon-');
  const isSaqExtraction =
    x.docCategory === 'dd_audit_report' ||
    Boolean(x.requestedDataType?.includes('실사')) ||
    Boolean(x.requestedDataType?.includes('자가진단')) ||
    Boolean(x.requestedDataType?.toUpperCase().includes('SAQ'));
  const evidenceMaterialFields = isMaterialExtraction ? extractMaterialFieldsFromEvidence(x.evidenceSummary) : {};
  const parsedFields = isMaterialExtraction ? { ...evidenceMaterialFields, ...x.parsedFields } : x.parsedFields;

  let fields: ExtractionField[];
  let unparsedFields: string[];
  if (isMaterialExtraction || isCarbonExtraction || isSaqExtraction) {
    // 카탈로그 기반 — 뽑아야 할 필드만, 못 찾아도 신뢰도 0의 "수정 필요" 행으로 항상 노출.
    // 카탈로그 밖 필드(회사명 등 문서에 같이 적힌 무관한 정보)는 이 화면에서 아예 보여주지 않는다.
    const catalog = isMaterialExtraction ? MATERIAL_DOC_CATALOG : isSaqExtraction ? SAQ_DOC_CATALOG : CARBON_DOC_CATALOG;
    const fieldLocations = ((parsedFields as Record<string, unknown>)['__locations__'] ?? {}) as Record<string, ExtractionField['location']>;
    fields = catalog.map(row => {
      const matchedId = row.ids.find(id => parsedFields[id] != null && parsedFields[id] !== '');
      const confidence = matchedId ? (x.confidenceMap[matchedId] ?? (evidenceMaterialFields[matchedId] != null ? 0.75 : 0)) : 0;
      return {
        fieldId: matchedId ?? row.ids[0],
        label: row.label,
        aiValue: matchedId ? String(parsedFields[matchedId]) : '',
        confidence,
        requiresAttention: confidence < 0.8,
        unit: row.unit,
        location: matchedId ? fieldLocations[matchedId] : undefined,
      };
    });
    unparsedFields = [];
  } else {
    const fieldLocations = ((parsedFields as Record<string, unknown>)['__locations__'] ?? {}) as Record<string, ExtractionField['location']>;
    fields = Object.keys(parsedFields).filter(k => !k.startsWith('__')).map(k => {
      const confidence = x.confidenceMap[k] ?? 0;
      return {
        fieldId: k,
        label: FIELD_LABEL_KO[k] ?? k,
        aiValue: String(parsedFields[k]),
        confidence,
        requiresAttention: confidence < 0.8,
        unit: '',
        location: fieldLocations[k],
      };
    });
    unparsedFields = x.unparsedFields;
  }

  const sameInitialDoc = initialDoc && x.docS3Key && x.docS3Key === initialDoc.docS3Key;
  return {
    docId: x.requestId,
    fileName: x.documentFileName ?? (sameInitialDoc ? initialDoc.fileName : `${x.requestedDataType ?? '자료'}.pdf`),
    fileUrl: x.documentUrl ?? (sameInitialDoc ? initialDoc.fileUrl : null),
    requestType: x.requestedDataType ?? '자료',
    uploadedAt: '',
    submissionStatus: STATUS_TO_REVIEW[x.submissionStatus ?? ''] ?? 'review',
    extractionResult: { fields, unparsedFields },
  };
}

function initialDocToParsedDoc(doc: InitialDoc): ParsedDoc {
  const isCarbonDoc = doc.requestType.includes('탄소') || doc.requestType.toLowerCase().includes('carbon');
  const isSaqDoc = doc.requestType.includes('실사') || doc.requestType.includes('자가진단') || doc.requestType.toUpperCase().includes('SAQ');
  const fields = isSaqDoc
    ? // SAQ 문서 — 인권·안전 실사 항목만(소재구성 필드 오표시 방지)
      SAQ_DOC_CATALOG.map(row => ({
        fieldId: row.ids[0], label: row.label, aiValue: '', confidence: 0, requiresAttention: true, unit: row.unit,
      }))
    : isCarbonDoc
    ? [
        { fieldId: 'carbon_intensity', label: CARBON_FIELD_LABELS.carbon_intensity, aiValue: '', confidence: 0, requiresAttention: true, unit: 'kgCO2eq/kg' },
        { fieldId: 'energy_source', label: CARBON_FIELD_LABELS.energy_source, aiValue: '', confidence: 0, requiresAttention: true, unit: '' },
      ]
    : [
        { fieldId: 'Li',                label: 'Li (리튬) 함량(%)',     aiValue: '', confidence: 0, requiresAttention: true, unit: '%' },
        { fieldId: 'Co',                label: 'Co (코발트) 함량(%)',   aiValue: '', confidence: 0, requiresAttention: true, unit: '%' },
        { fieldId: 'Ni',                label: 'Ni (니켈) 함량(%)',     aiValue: '', confidence: 0, requiresAttention: true, unit: '%' },
        { fieldId: 'Mn',                label: 'Mn (망간) 함량(%)',     aiValue: '', confidence: 0, requiresAttention: true, unit: '%' },
        { fieldId: 'natural_graphite',  label: '천연흑연 함량(%)',       aiValue: '', confidence: 0, requiresAttention: true, unit: '%' },
        { fieldId: 'synthetic_graphite',label: '인조흑연 함량(%)',       aiValue: '', confidence: 0, requiresAttention: true, unit: '%' },
      ];
  return {
    docId: doc.docId,
    fileName: doc.fileName,
    fileUrl: doc.fileUrl,
    requestType: doc.requestType,
    uploadedAt: '',
    submissionStatus: 'review',
    extractionResult: {
      fields,
      unparsedFields: [],
    },
  };
}

function isImageFile(doc: ParsedDoc): boolean {
  const source = `${doc.fileUrl ?? doc.fileName}`.toLowerCase();
  return source.startsWith('data:image/') || /\.(png|jpe?g|webp|gif)(?:[?#].*)?$/.test(source);
}

function OriginalDocumentPreview({ doc }: { doc: ParsedDoc }) {
  if (doc.fileUrl && isImageFile(doc)) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-[#E5E7EB]">
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-ink-800/30 px-4 py-2.5">
          <span className="truncate text-[11px] font-bold text-ink-500">{doc.fileName}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <img src={doc.fileUrl} alt={doc.fileName} className="mx-auto max-h-full max-w-full object-contain shadow-sm" />
        </div>
      </div>
    );
  }

  if (doc.fileUrl) {
    return <PdfViewer fileUrl={doc.fileUrl} fileName={doc.fileName} />;
  }

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-ink-800/30 px-4 py-2.5">
        <span className="text-[11px] font-bold text-ink-500">원본 문서 뷰어</span>
      </div>
      <div className="flex flex-1 items-center justify-center bg-[#E5E7EB]">
        <div className="text-center text-ink-400">
          <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
          <p className="text-xs">{doc.fileName}</p>
          <p className="mt-1 text-[11px] opacity-60">원본 문서 URL이 없습니다.</p>
        </div>
      </div>
    </>
  );
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
function CarbonDocumentPreview({
  doc,
  hoveredFieldId,
  onFieldHover,
}: {
  doc: ParsedDoc;
  hoveredFieldId: string | null;
  onFieldHover: (fieldId: string | null) => void;
}) {
  const fields = doc.extractionResult.fields;
  const rows = [
    { label: '탄소집약도 (kgCO2eq/kg)', ids: ['carbon_intensity'] },
    { label: '에너지원', ids: ['energy_source'] },
  ];

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="mx-auto max-w-2xl px-10 py-10 font-[pretendard,_sans-serif] text-gray-800">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-gray-900">탄소발자국 명세서 (Carbon Footprint Sheet)</h1>
          <p className="mt-2 text-[13px] text-blue-600">
            본 문서는 제품 탄소집약도와 에너지원 정보를 확인하기 위한 자료입니다.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-[15px] font-bold text-gray-900">1. 탄소발자국 정보</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-64 border border-gray-300 bg-[#1a4731] px-4 py-2.5 text-left text-[13px] font-semibold text-white">항목</th>
                <th className="border border-gray-300 bg-[#1a4731] px-4 py-2.5 text-left text-[13px] font-semibold text-white">값</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const matched = getFieldMatch(fields, row.ids);
                const fieldId = matched?.fieldId ?? null;
                const isActive = fieldId !== null && hoveredFieldId === fieldId;

                return (
                  <tr
                    key={row.label}
                    className={`border-b border-gray-200 transition-colors duration-150 ${matched ? 'cursor-pointer' : ''}`}
                    onMouseEnter={() => fieldId && onFieldHover(fieldId)}
                    onMouseLeave={() => onFieldHover(null)}
                  >
                    <td className={`border border-gray-300 px-4 py-2.5 text-[13px] transition-colors duration-150 ${isActive ? 'bg-green-50' : 'bg-white'}`}>
                      {row.label}
                    </td>
                    <td className={`border border-gray-300 px-4 py-2.5 text-[13px] font-semibold transition-colors duration-150 ${isActive ? 'bg-green-50' : 'bg-white'}`}>
                      {matched ? (
                        <span className={`inline-block rounded px-2 py-0.5 transition-all duration-150 ${getHighlightColor(matched.confidence, isActive)}`}>
                          {matched.aiValue}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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
  onSaved,
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
  /** '저장' 확정 시 사용자 검토·수정이 반영된 최종 추출값을 부모로 전달(폼 자동 채움 + RAG 트리거). */
  onSaved?: (extraction: AiExtraction) => void;
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
  // 파싱 진행 상태 — initialDoc(방금 업로드)에 대한 추출 폴링 동안 true. 우측 폼 로딩UI 게이트.
  const [isParsing, setIsParsing] = useState(false);
  // [목표2] 우측 폼에서 클릭한 필드 → 좌측 원본에서 고정 하이라이트(역추적).
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const notifiedExtractionRef = useRef<string | null>(null);

  // ── 좌↔우 하이라이트 연동 상태 ──────────────────────────────────────────
  // docFieldHover: 좌측 문서에서 hover 중인 fieldId → 우측 패널 강조
  const [docFieldHover, setDocFieldHover] = useState<string | null>(null);
  // tableFieldHover: 우측 ExtractionTable에서 hover 중인 fieldId → 좌측 문서 강조
  const [tableFieldHover, setTableFieldHover] = useState<string | null>(null);

  // 소재구성 문서 전용 HTML 미리보기 사용 여부
  const isMaterialDoc = docCategoryFilter === 'material_composition';
  const isCarbonDoc = docCategoryFilter === 'carbon_footprint_declaration';
  const matchesDocumentFilter = (x: AiExtraction) => {
    if (!docS3KeyFilter) return true;
    if (x.docS3Key === docS3KeyFilter) return true;
    if (initialDoc?.fileName && x.documentFileName === initialDoc.fileName) return true;
    if (initialDoc?.fileName && x.documentUrl?.includes(encodeURIComponent(initialDoc.fileName))) return true;
    if (initialDoc?.fileName && x.documentUrl?.includes(initialDoc.fileName)) return true;
    return false;
  };
  const matchesCategoryFilter = (x: AiExtraction) => {
    if (!docCategoryFilter) return true;
    if (x.docCategory === docCategoryFilter) return true;
    if (docCategoryFilter === 'material_composition') return x.requestedDataType === '소재구성 문서';
    if (docCategoryFilter === 'carbon_footprint_declaration') {
      return Boolean(
        x.requestedDataType?.includes('탄소') ||
        x.requestedDataType?.includes('carbon') ||
        x.requestedDataType?.includes('환경성적') ||
        x.requestedDataType?.includes('self_upload:carbon')
      );
    }
    if (docCategoryFilter === 'dd_audit_report') {
      return Boolean(
        x.requestedDataType?.includes('실사') ||
        x.requestedDataType?.includes('자가진단') ||
        x.requestedDataType?.toUpperCase().includes('SAQ') ||
        x.requestedDataType?.includes('self_upload:self_assessment')
      );
    }
    return false;
  };

  useEffect(() => {
    let cancelled = false;
    getAiExtractions()
      .then(list => {
        const mine = list
          .filter(x => !supplierId || x.supplierId === supplierId)
          .filter(matchesCategoryFilter)
          .filter(matchesDocumentFilter)
          .map(x => extractionToDoc(x, initialDoc))
          .filter(doc => !docCategoryFilter || doc.extractionResult.fields.length > 0);
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
    setIsParsing(true);  // 방금 업로드한 문서 → 추출 완료까지 파싱 로딩 표시
    const matchesFilter = (x: AiExtraction) =>
      (!supplierId || x.supplierId === supplierId) &&
      matchesCategoryFilter(x) &&
      matchesDocumentFilter(x);

    const poll = () => {
      attempt += 1;
      getAiExtractions()
        .then(list => {
          if (cancelled) return;
          const matchedExtraction = list.find(matchesFilter);
          if (!matchedExtraction) {
            if (attempt < maxAttempts) timeoutId = setTimeout(poll, 2500);
            else setIsParsing(false);
            return;
          }
          const parsedDoc = extractionToDoc(matchedExtraction, initialDoc);
          if (docCategoryFilter && parsedDoc.extractionResult.fields.length === 0) {
            if (attempt < maxAttempts) timeoutId = setTimeout(poll, 2500);
            else setIsParsing(false);
            return;
          }
          setDocs([parsedDoc]);
          setActiveDocId(parsedDoc.docId);
          setIsParsing(false);  // 추출 완료 → 로딩 해제, 폼 표시
          if (notifiedExtractionRef.current !== matchedExtraction.requestId) {
            notifiedExtractionRef.current = matchedExtraction.requestId;
            onParsed?.(matchedExtraction);
          }
        })
        .catch(() => {
          if (!cancelled && attempt < maxAttempts) timeoutId = setTimeout(poll, 2500);
          else if (!cancelled) setIsParsing(false);
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
              {loadError ? '잠시 후 다시 시도해 주세요.' : '협력사가 자료를 제출하면 AI 처리 결과가 여기에 표시됩니다.'}
            </p>
          )}
        </div>
      </div>
    );
  }

  const activeDoc = docs.find(d => d.docId === activeDocId) ?? docs[0];
  const allCompleted = docs.every(d => completedDocs[d.docId]);

  // 탭 닫기 — 활성 탭이면 첫 남은 탭으로 포커스 이동, 마지막 탭이면 모달 닫기.
  function closeDoc(docId: string) {
    const remaining = docs.filter(d => d.docId !== docId);
    if (remaining.length === 0) { onConfirmComplete(); return; }
    setDocs(remaining);
    setCompletedDocs(prev => { const n = { ...prev }; delete n[docId]; return n; });
    if (activeDocId === docId) setActiveDocId(remaining[0].docId);
  }

  // 파싱 중 우측 폼 로딩 표시 — isParsing이면서 활성 문서가 아직 미추출(fields 비었을 때).
  const showParsingLoader = isParsing && (!activeDoc || activeDoc.extractionResult.fields.length === 0);
  // 실제 업로드된 원본 문서가 있으면 항상 그걸 보여준다 — AI 처리 성공 여부와 무관하게
  // 사용자가 올린 파일을 임의의 양식 템플릿으로 대체해 보여주면 안 된다.
  // 원본 URL이 없는 경우(mock 데모 데이터 등)에만 소재구성/탄소발자국 전용 HTML 템플릿으로 대체.
  const showOriginalMaterialPreview = (isMaterialDoc || isCarbonDoc) && Boolean(activeDoc.fileUrl);

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
            <div className="text-xs font-bold text-ink-100">{prime ? 'AI 처리 검토' : 'AI 처리 확인 및 수정'}</div>
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
            <div
              key={doc.docId}
              className={`flex items-center gap-1.5 rounded-t-xs border-x border-t py-2.5 pl-4 pr-2 text-[11px] font-semibold transition-colors ${
                isActive
                  ? 'border-ink-600 bg-white text-ink-100 shadow-[0_1px_0_white]'
                  : 'border-transparent bg-ink-800 text-ink-400 hover:bg-white hover:text-ink-200'
              }`}
            >
              <button type="button" onClick={() => setActiveDocId(doc.docId)} className="flex min-w-0 items-center gap-2">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[140px] truncate">{doc.fileName}</span>
                <span className="text-[10px] text-ink-500">{doc.requestType}</span>
                {isDone && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-signal-ok" />}
              </button>
              <button
                type="button"
                onClick={() => closeDoc(doc.docId)}
                aria-label={`${doc.fileName} 탭 닫기`}
                title="탭 닫기"
                className="ml-0.5 shrink-0 rounded-sm p-0.5 text-ink-500 transition-colors hover:bg-alert-bg hover:text-alert-text"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── 3. 스플릿 뷰 ── */}
      <div className="flex min-h-0 flex-1 gap-1 p-1">

        {/* 좌측: 소재구성 → HTML 문서 미리보기 / 그 외 → PDF iframe */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-sm border border-ink-700 bg-white">
          {showOriginalMaterialPreview ? (
            <OriginalDocumentPreview doc={activeDoc} />
          ) : isCarbonDoc ? (
            <CarbonDocumentPreview
              doc={activeDoc}
              hoveredFieldId={activeFieldId ?? tableFieldHover ?? docFieldHover}
              onFieldHover={setDocFieldHover}
            />
          ) : isMaterialDoc ? (
            // 소재구성 전용 HTML 렌더링 + 노란 하이라이트
            <MaterialDocumentPreview
              doc={activeDoc}
              hoveredFieldId={activeFieldId ?? tableFieldHover ?? docFieldHover}   // 우측 패널 OR 문서 자체 hover 모두 반영
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

        {/* 우측: 추출폼(+파싱 로딩) + [목표3] AI 규제 분석 보고서 */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-y-auto">
          {showParsingLoader ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 rounded-sm border border-ink-700 bg-white px-6">
              <Loader2 className="h-11 w-11 animate-spin text-accent-700" />
              <div className="text-center">
                <div className="text-sm font-bold text-ink-100">🤖 AI가 문서를 분석하고 데이터를 추출하고 있습니다...</div>
                <div className="mt-1.5 text-xs text-ink-500">잠시만 기다려주세요.</div>
              </div>
              {/* 스켈레톤 (추출 폼 자리) */}
              <div className="w-full max-w-sm space-y-2.5" aria-hidden>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="h-10 animate-pulse rounded-xs bg-ink-800" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex min-h-0 flex-1">
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
                  hoveredFieldId={activeFieldId ?? docFieldHover}   // 좌측 문서 hover/선택 → 우측 강조
                  onFieldHover={setTableFieldHover}    // 우측 hover → 좌측 문서 강조
                  onFieldSelect={setActiveFieldId}     // [목표2] 우측 필드 클릭 → 좌측 원본 고정 하이라이트
                  saveOnlyMode={saveOnlyMode}
                  // '저장' 확정값(사용자 수정 반영) → AiExtraction 합성해 부모 폼으로 전달.
                  // 사용자가 직접 검토·확정한 값이므로 신뢰도 1.0 (부모의 '검토 권장' 플래그 방지).
                  onSaveValues={onSaved ? (finalValues) => {
                    const parsedFields: Record<string, string | number> = {};
                    const confidenceMap: Record<string, number> = {};
                    for (const [fieldId, v] of Object.entries(finalValues)) {
                      parsedFields[fieldId] = v;
                      confidenceMap[fieldId] = 1;
                    }
                    onSaved({
                      requestId: activeDoc.docId,
                      supplierId,
                      supplierName: null,
                      requestedDataType: activeDoc.requestType,
                      submissionStatus: null,
                      parsedFields,
                      confidenceMap,
                      unparsedFields: [],
                      docCategory: docCategoryFilter ?? null,
                    });
                  } : undefined}
                />
              </div>
              {/* AI 규제 분석 보고서는 모달에서 렌더하지 않는다 — 모달은 추출 데이터 검토/[저장] 전용.
                  보고서는 저장 후 메인 화면(3-1/3-2 섹션 하단)에서만 노출 (흐름 통일). */}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
