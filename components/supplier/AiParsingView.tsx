'use client';

import { useEffect, useState } from 'react';
import { getAiExtractions, type AiExtraction } from '@/lib/api';
import { CheckCircle2, FileText, ScanLine } from 'lucide-react';
import Badge from '@/components/Badge';
import ExtractionTable from './ExtractionTable';

// ─── HITL 규격 스키마 타입 (submission-review/page.tsx statusMeta와 동기화) ──
// submission-review: review | approved | rework | rejected
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
  requestType: string;
  uploadedAt: string;
  // submission-review의 statusMeta 상태값으로 전송될 초기값
  submissionStatus: 'review' | 'approved' | 'rework' | 'rejected';
  extractionResult: {
    fields: ExtractionField[];
    unparsedFields: string[];
  };
}

// ─── Mock Data — HITL/Queue 규격과 1:1 동기화 ──────────────────────────────
// 실제 API 연동 시 fetch 호출로 교체 (인터페이스는 그대로 유지)
const MOCK_PARSED_DOCS: ParsedDoc[] = [
  {
    docId: 'doc-001',
    fileName: '환경영향평가_보고서_최종.pdf',
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
    requestType: '원산지 증명서',
    uploadedAt: '2026-05-20',
    submissionStatus: 'review',
    extractionResult: {
      fields: [
        { fieldId: 'origin_country', label: '원산지 국가',     aiValue: '대한민국',  confidence: 0.98, requiresAttention: false, unit: '' },
        { fieldId: 'material_name',  label: '자재명',          aiValue: 'NORI-NCL-RAW', confidence: 0.95, requiresAttention: false, unit: '' },
        { fieldId: 'hs_code',        label: 'HS Code',         aiValue: '2604.00',  confidence: 0.76, requiresAttention: true,  unit: '' },
        { fieldId: 'issue_date',     label: '발급일',          aiValue: '2026-05-10', confidence: 0.91, requiresAttention: false, unit: '' },
        { fieldId: 'feoc_status',    label: 'FEOC 해당 여부',  aiValue: '해당 없음', confidence: 0.61, requiresAttention: true,  unit: '', warning: 'FEOC 판정 근거 서류를 추가로 확인해 주세요.' },
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
  return {
    docId: x.requestId,
    fileName: `${x.requestedDataType ?? '자료'}.pdf`,
    requestType: x.requestedDataType ?? '자료',
    uploadedAt: '',
    submissionStatus: STATUS_TO_REVIEW[x.submissionStatus ?? ''] ?? 'review',
    extractionResult: { fields, unparsedFields: x.unparsedFields },
  };
}

export default function AiParsingView({
  supplierId,
  onConfirmComplete,
}: {
  supplierId: string;
  onConfirmComplete: () => void;
}) {
  // 공통 모듈 — 실 AI 추출(getAiExtractions)을 이 협력사 기준으로 가져와 표시. 없으면 mock 폴백.
  // (원청 대시보드 HitlReviewCard와 동일 데이터 소스 = 협력사/원청 동일 데이터.)
  const [docs, setDocs] = useState<ParsedDoc[]>(MOCK_PARSED_DOCS);
  const [activeDocId, setActiveDocId] = useState(MOCK_PARSED_DOCS[0].docId);
  // 문서별 제출 완료 여부 — { [docId]: true }
  const [completedDocs, setCompletedDocs] = useState<CompletedMap>({});

  useEffect(() => {
    let cancelled = false;
    getAiExtractions()
      .then(list => {
        const mine = list.filter(x => !supplierId || x.supplierId === supplierId).map(extractionToDoc);
        if (!cancelled && mine.length) { setDocs(mine); setActiveDocId(mine[0].docId); }
      })
      .catch(() => { /* 실패 시 mock 유지 */ });
    return () => { cancelled = true; };
  }, [supplierId]);

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

      {/* ── 1. 상단 헤더 ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-white px-6 py-3 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-accent-50">
            <ScanLine className="h-4 w-4 text-accent-700" />
          </div>
          <div>
            <div className="text-xs font-bold text-ink-100">AI 파싱 확인 및 수정</div>
            <div className="mt-0.5 text-[10px] text-ink-500">
              AI가 추출한 데이터를 검토하고 수정한 뒤, 문서별로 제출해 주세요.
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

      {/* ── 3. 스플릿 뷰 컨테이너 ── */}
      <div className="flex min-h-0 flex-1 gap-1 p-1">

        {/* 좌측: PDF 뷰어 */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-sm border border-ink-700 bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-ink-800/30 px-4 py-2.5">
            <span className="text-[11px] font-bold text-ink-500">원본 문서 뷰어</span>
            <div className="flex gap-2 text-[10px] text-ink-400">
              <button className="hover:text-ink-100">축소</button>
              <span>1 / 14</span>
              <button className="hover:text-ink-100">확대</button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center bg-[#E5E7EB]">
            <div className="text-center text-ink-400">
              <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
              <p className="text-xs">{activeDoc.fileName}</p>
              <p className="mt-1 text-[11px] opacity-60">실제 PDF 렌더링 영역 (react-pdf 연동 예정)</p>
            </div>
          </div>
        </div>

        {/* 우측: ExtractionTable — key로 문서 전환 시 상태 초기화 */}
        <ExtractionTable
          key={activeDoc.docId}
          doc={activeDoc}
          supplierId={supplierId}
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
