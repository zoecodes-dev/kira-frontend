'use client';

import { useState } from 'react';
import { AlertTriangle, Edit2, ChevronRight } from 'lucide-react';
import Badge from '@/components/Badge';

// 신뢰도에 따른 색상/톤 반환 함수
function getConfidenceStyle(confidence: number) {
  if (confidence >= 0.9) return { tone: 'ok' as const, bg: 'bg-white', border: 'border-ink-700 focus:border-signal-ok' };
  if (confidence >= 0.7) return { tone: 'warn' as const, bg: 'bg-amber-50/30', border: 'border-amber-300 focus:border-amber-500' };
  return { tone: 'alert' as const, bg: 'bg-red-50', border: 'border-red-300 focus:border-red-500 text-red-900' };
}

// 부모로부터 받을 데이터의 타입 정의
interface ExtractionTableProps {
  doc: any; // MOCK_PARSED_DOCS의 단일 문서 객체
  onConfirmComplete: () => void;
}

export default function ExtractionTable({ doc, onConfirmComplete }: ExtractionTableProps) {
  // 상태 관리 (이 컴포넌트 안에서만 타이핑이 일어나므로 안전합니다!)
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [unparsedInputs, setUnparsedInputs] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);

  const handleEdit = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const handleUnparsedInput = (key: string, value: string) => {
    setUnparsedInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setConfirming(true);
    // Mock API 호출 대기 시간
    await new Promise(res => setTimeout(res, 800));
    setConfirming(false);
    onConfirmComplete(); // 부모(AiParsingView)에게 완료를 알림
  };

  return (
    <div className="flex h-full w-[420px] shrink-0 flex-col overflow-hidden rounded-sm border border-ink-700 bg-white">
      {/* 헤더 */}
      <div className="shrink-0 border-b border-ink-700 bg-ink-800/30 px-5 py-3">
        <div className="text-xs font-bold text-ink-100">추출 데이터 검토 및 보완</div>
        <p className="mt-1 text-[10px] text-ink-500 leading-4">
          AI가 추출한 데이터를 확인하고 필요한 경우 직접 수정해 주세요. 신뢰도가 낮은 항목은 붉은색으로 표시됩니다.
        </p>
      </div>

      {/* 스크롤 가능한 폼 영역 */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <div className="space-y-4">
          {doc.extractionResult.fields.map((field: any) => {
            const style = getConfidenceStyle(field.confidence);
            const currentValue = editedValues[field.key] !== undefined ? editedValues[field.key] : field.aiValue;
            
            return (
              <div key={field.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-ink-400">{field.label}</label>
                  <Badge tone={style.tone}>신뢰도 {Math.round(field.confidence * 100)}%</Badge>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={currentValue}
                    onChange={(e) => handleEdit(field.key, e.target.value)}
                    className={`w-full rounded-xs border px-3 py-2 text-xs font-bold outline-none transition-all pr-12 ${style.bg} ${style.border}`}
                  />
                  {field.unit && (
                    <span className="absolute right-3 text-[10px] text-ink-400 pointer-events-none">{field.unit}</span>
                  )}
                </div>
                {field.warning && (
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600 font-semibold">
                    <AlertTriangle className="h-3 w-3" /> {field.warning}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* 미파싱 필드 (수동 입력) */}
        {doc.extractionResult.unparsedFields.length > 0 && (
          <div className="border-t border-ink-700 pt-5 space-y-4">
            <div className="flex items-center gap-1.5">
              <Edit2 className="h-3.5 w-3.5 text-accent-700" />
              <span className="text-[11px] font-bold text-accent-800">추가 정보 직접 입력 (AI 추출 실패)</span>
            </div>
            {doc.extractionResult.unparsedFields.map((label: string) => (
              <div key={label}>
                <label className="text-[11px] font-bold text-ink-400 mb-1.5 block">{label}</label>
                <input
                  type="text"
                  placeholder="직접 입력해 주세요"
                  value={unparsedInputs[label] || ''}
                  onChange={(e) => handleUnparsedInput(label, e.target.value)}
                  className="w-full rounded-xs border border-ink-600 bg-white px-3 py-2 text-xs font-semibold outline-none transition-colors focus:border-accent-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 액션 버튼 */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-ink-700 bg-white px-5 py-4 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <button className="rounded-xs border border-ink-700 bg-white px-4 py-2 text-xs font-bold text-ink-400 hover:border-ink-600 hover:text-ink-200 transition-colors">
          임시 저장
        </button>
        <button
          onClick={handleSubmit}
          disabled={confirming}
          className="inline-flex items-center gap-1.5 rounded-xs bg-accent-700 px-5 py-2 text-xs font-bold text-white shadow-control hover:bg-accent-900 transition-colors disabled:opacity-70"
        >
          {confirming ? (
            '처리 중...'
          ) : (
            <>저장 및 다음으로 <ChevronRight className="h-3.5 w-3.5" /></>
          )}
        </button>
      </div>
    </div>
  );
}