'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  FileText,
  AlertCircle,
  Trash2,
  Paperclip,
  Loader2,
  RotateCcw,
  AlertTriangle, 
} from 'lucide-react';
import Badge from '@/components/Badge';

// ─── 타입 ──────────────────────────────────────────────────────────────────────

interface RequestItem {
  label: string;
  due: string;
  status: string;
  tone: 'ok' | 'warn' | 'alert' | 'info' | 'neutral';
}

interface UploadedFile {
  id: string;
  file: File;
  /** 'uploading' | 'done' | 'error' */
  state: 'uploading' | 'done' | 'error';
  progress: number; // 0~100
}

interface SubmitWizardModalProps {
  /** 모달 오픈 여부 */
  open: boolean;
  /** 닫기 콜백 */
  onClose: () => void;
  /** 전달할 때 항목을 미리 선택하려면 사용 (보완 재제출용) */
  initialSelectedLabels?: string[];
  /** 재제출 모드: true면 Step 1 건너뛰고 Step 2로 시작 */
  reworkMode?: boolean;
  /** 재제출 모드일 때 Step 2 상단에 표시할 반려 사유 */
  reworkReason?: string;
  /** ⑤ 인증서 갱신 모드: Step 1 상단에 갱신 안내 배너 표시 */
  certRenewalMode?: boolean;
  /** 전체 요청 목록 */
  requestItems: RequestItem[];
  /** localStorage key 분리용 협력사 ID (기본값: 'supplier') */
  supplierId?: string;
}

// ─── 허용 확장자 / 용량 ─────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = ['pdf', 'xlsx', 'xls', 'csv', 'docx', 'doc', 'png', 'jpg', 'jpeg'];
const MAX_FILE_SIZE_MB = 50;

function getExtension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function validateFile(file: File): string | null {
  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `허용되지 않는 파일 형식입니다. (${ALLOWED_EXTENSIONS.join(', ')})`;
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `파일 크기가 ${MAX_FILE_SIZE_MB}MB를 초과합니다.`;
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

// ─── Step 진행 표시 바 ──────────────────────────────────────────────────────────

const STEPS = [
  { no: 1, label: 'PO · 항목 선택' },
  { no: 2, label: '파일 첨부' },
  { no: 3, label: '최종 확인 · 제출' },
];

function WizardStepBar({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0 px-8 py-4 border-b border-ink-700 bg-ink-800/40">
      {STEPS.map((step, idx) => {
        const done = step.no < current;
        const active = step.no === current;
        return (
          <div key={step.no} className="flex items-center">
            {/* 노드 */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`
                  flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors
                  ${done    ? 'border-accent-600 bg-accent-600 text-white'      : ''}
                  ${active  ? 'border-accent-700 bg-white text-accent-700 shadow-sm' : ''}
                  ${!done && !active ? 'border-ink-600 bg-white text-ink-500' : ''}
                `}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.no}
              </div>
              <span
                className={`text-[10px] font-semibold whitespace-nowrap
                  ${active ? 'text-accent-700' : done ? 'text-accent-600' : 'text-ink-500'}
                `}
              >
                {step.label}
              </span>
            </div>
            {/* 연결선 */}
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-2 mb-4 h-px w-16 transition-colors ${done ? 'bg-accent-500' : 'bg-ink-600'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: PO · 항목 선택 ────────────────────────────────────────────────────

function Step1({
  requestItems,
  selected,
  onToggle,
  certRenewalMode,
}: {
  requestItems: RequestItem[];
  selected: Set<string>;
  onToggle: (label: string) => void;
  /** ⑤ 인증서 갱신 진입 시 상단 안내 배너 표시 */
  certRenewalMode?: boolean;
}) {
  return (
    <div className="space-y-3">
      {/* 딥링크 진입 컨텍스트 배너 — 자동 체크 항목이 있을 때 표시 */}
      {!certRenewalMode && selected.size > 0 && (
        <div className="flex items-start gap-2.5 rounded-xs border border-ink-600 bg-ink-800 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
          <div>
            <div className="text-xs font-bold text-ink-200">항목이 자동 선택되었습니다</div>
            <div className="mt-0.5 text-[11px] text-ink-500">
              <span className="font-semibold text-ink-300">{Array.from(selected).join(', ')}</span> 항목이 선택된 상태로 진입했습니다. 추가 항목을 함께 제출하려면 아래에서 선택해 주세요.
            </div>
          </div>
        </div>
      )}

      {/* ⑤ 인증서 갱신 진입 안내 배너 */}
      {certRenewalMode && (
        <div className="flex items-start gap-2.5 rounded-xs border border-accent-200 bg-accent-50 px-4 py-3">
          <Upload className="mt-0.5 h-4 w-4 shrink-0 text-accent-700" />
          <div>
            <div className="text-xs font-bold text-accent-800">인증서 갱신 증빙 업로드</div>
            <div className="mt-0.5 text-[11px] text-accent-700">
              아래에서 갱신 제출 항목을 확인하고, 다음 단계에서 갱신된 인증서 파일을 첨부해 주세요.
            </div>
          </div>
        </div>
      )}
      <p className="text-xs text-ink-500 leading-5">
        이번에 제출할 요청 항목을 선택해 주세요. 복수 선택이 가능합니다.
      </p>
      <div className="space-y-2">
        {requestItems.map(item => {
          const checked = selected.has(item.label);
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onToggle(item.label)}
              className={`
                flex w-full items-center justify-between gap-3
                rounded-xs border px-4 py-3 text-left
                transition-colors duration-100
                ${checked
                  ? 'border-accent-500 bg-accent-50 shadow-sm'
                  : 'border-ink-700 bg-white hover:border-accent-200 hover:bg-ink-800/30'
                }
              `}
            >
              {/* 체크박스 */}
              <div
                className={`
                  flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border-2 transition-colors
                  ${checked ? 'border-accent-600 bg-accent-600' : 'border-ink-600 bg-white'}
                `}
              >
                {checked && (
                  <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold ${checked ? 'text-accent-800' : 'text-ink-100'}`}>
                  {item.label}
                </div>
                <div className="mt-0.5 text-[10px] text-ink-500">
                  제출 기한 <span className="num-mono font-semibold">{item.due}</span>
                </div>
              </div>

              {/* 상태 배지 */}
              <Badge tone={item.tone}>{item.status}</Badge>
            </button>
          );
        })}
      </div>

      {selected.size === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700 pt-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          항목을 1개 이상 선택해야 다음 단계로 이동할 수 있습니다.
        </p>
      )}
    </div>
  );
}

// ─── Step 2: 파일 첨부 ─────────────────────────────────────────────────────────

function Step2({
  files,
  onAddFiles,
  onRemoveFile,
  reworkLabel,
  reworkReason,
}: {
  files: UploadedFile[];
  onAddFiles: (fileList: FileList) => void;
  onRemoveFile: (id: string) => void;
  reworkLabel?: string;
  reworkReason?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  }

  function processFiles(fileList: FileList) {
    const errors: string[] = [];
    const validFiles: File[] = [];
    Array.from(fileList).forEach(f => {
      const err = validateFile(f);
      if (err) errors.push(`${f.name}: ${err}`);
      else validFiles.push(f);
    });
    setFileErrors(errors);
    if (validFiles.length > 0) {
      const dt = new DataTransfer();
      validFiles.forEach(f => dt.items.add(f));
      onAddFiles(dt.files);
    }
  }

  return (
    <div className="space-y-4">
      {/* 재제출 배너 */}
      {reworkLabel && (
        <div className="flex items-start gap-2 rounded-xs border border-amber-300 bg-amber-50 px-4 py-3">
          <RotateCcw className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-amber-800">보완 요청 재제출</div>
            <div className="mt-0.5 text-[10px] text-amber-700">
              원청사 요청 항목: <span className="font-semibold">{reworkLabel}</span>
            </div>
          </div>
        </div>
      )}

      {/* 반려 사유 박스 — EightStageStepper에서 전달된 원청사 반려 사유 */}
      {reworkReason && (
        <div className="rounded-xs border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <div className="text-[10px] font-bold text-red-600">원청사 반려 사유</div>
          </div>
          <p className="text-xs text-red-800 leading-5">{reworkReason}</p>
          <div className="mt-2 text-[10px] text-red-500">
            위 사유를 참고하여 수정된 파일을 첨부해 주세요.
          </div>
        </div>
      )}

      {/* 드롭존 */}
      <div
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-3
          rounded-sm border-2 border-dashed px-6 py-10
          cursor-pointer select-none
          transition-colors duration-150
          ${dragging
            ? 'border-accent-500 bg-accent-50/60'
            : 'border-ink-600 bg-ink-800/20 hover:border-accent-400 hover:bg-accent-50/30'
          }
        `}
      >
        <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${dragging ? 'border-accent-500 bg-accent-100' : 'border-ink-600 bg-white'}`}>
          <Upload className={`h-5 w-5 ${dragging ? 'text-accent-600' : 'text-ink-400'}`} />
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-ink-200">
            {dragging ? '파일을 놓아주세요' : '파일을 드래그하거나 클릭해서 첨부'}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {ALLOWED_EXTENSIONS.join(', ')} · 최대 {MAX_FILE_SIZE_MB}MB / 파일
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS.map(e => `.${e}`).join(',')}
          className="hidden"
          onChange={e => { if (e.target.files) processFiles(e.target.files); }}
        />
      </div>

      {/* 파일 에러 */}
      {fileErrors.length > 0 && (
        <div className="space-y-1.5">
          {fileErrors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xs border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {err}
            </div>
          ))}
        </div>
      )}

      {/* 첨부된 파일 목록 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-ink-400">첨부된 파일 ({files.length})</div>
          {files.map(uf => (
            <div key={uf.id} className="rounded-xs border border-ink-700 bg-white px-3 py-3">
              <div className="flex items-center gap-3">
                <Paperclip className="h-4 w-4 shrink-0 text-ink-500" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-ink-100">{uf.file.name}</span>
                    <span className="shrink-0 text-[10px] text-ink-500 num-mono">{formatBytes(uf.file.size)}</span>
                  </div>
                  {/* 진행 바 */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-ink-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        uf.state === 'done'  ? 'bg-signal-ok' :
                        uf.state === 'error' ? 'bg-red-500' :
                        'bg-accent-600'
                      }`}
                      style={{ width: `${uf.progress}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    {uf.state === 'uploading' && (
                      <span className="flex items-center gap-1 text-[10px] text-ink-500">
                        <Loader2 className="h-3 w-3 animate-spin" /> 업로드 중 {uf.progress}%
                      </span>
                    )}
                    {uf.state === 'done' && (
                      <span className="flex items-center gap-1 text-[10px] text-signal-ok">
                        <CheckCircle2 className="h-3 w-3" /> 업로드 완료
                      </span>
                    )}
                    {uf.state === 'error' && (
                      <span className="flex items-center gap-1 text-[10px] text-red-500">
                        <AlertCircle className="h-3 w-3" /> 업로드 실패
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFile(uf.id)}
                  className="shrink-0 rounded-xs p-1 text-ink-500 hover:bg-red-50 hover:text-red-500"
                  aria-label={`${uf.file.name} 삭제`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          파일을 1개 이상 첨부해야 다음 단계로 이동할 수 있습니다.
        </p>
      )}
    </div>
  );
}

// ─── Step 3: 최종 확인 ─────────────────────────────────────────────────────────

function Step3({
  selectedItems,
  files,
  requestItems,
  submitted,
}: {
  selectedItems: Set<string>;
  files: UploadedFile[];
  requestItems: RequestItem[];
  submitted: boolean;
}) {
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-signal-ok/10 border-2 border-signal-ok">
          <CheckCircle2 className="h-8 w-8 text-signal-ok" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-ink-100">제출이 완료되었습니다</p>
          <p className="mt-1 text-xs text-ink-500">
            원청사 검토 후 결과를 알림으로 안내드립니다.
          </p>
        </div>
        <div className="mt-2 rounded-xs border border-ink-700 bg-ink-800 px-6 py-3 text-center">
          <div className="text-[10px] text-ink-500">제출 항목</div>
          <div className="mt-1 text-xs font-bold text-ink-100">
            {Array.from(selectedItems).join(', ')}
          </div>
          <div className="mt-2 text-[10px] text-ink-500">첨부 파일 {files.length}건</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-ink-500 leading-5">
        아래 내용을 최종 확인한 뒤 제출해 주세요. 제출 후에는 수정이 불가합니다.
      </p>

      {/* 선택한 요청 항목 요약 */}
      <div>
        <div className="mb-2 text-xs font-bold text-ink-400">제출 항목</div>
        <div className="space-y-1.5">
          {requestItems
            .filter(item => selectedItems.has(item.label))
            .map(item => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-ink-800 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent-600 shrink-0" />
                  <span className="text-xs font-semibold text-ink-100">{item.label}</span>
                </div>
                <span className="text-[10px] text-ink-500 num-mono">기한 {item.due}</span>
              </div>
            ))}
        </div>
      </div>

      {/* 첨부 파일 요약 */}
      <div>
        <div className="mb-2 text-xs font-bold text-ink-400">첨부 파일 ({files.length}건)</div>
        <div className="space-y-1.5">
          {files.map(uf => (
            <div key={uf.id} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-white px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-3.5 w-3.5 text-ink-500 shrink-0" />
                <span className="truncate text-xs font-semibold text-ink-100">{uf.file.name}</span>
              </div>
              <span className="shrink-0 text-[10px] text-ink-500 num-mono">{formatBytes(uf.file.size)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 제출 전 체크리스트 */}
      <div className="rounded-xs border border-amber-200 bg-amber-50 px-4 py-3 space-y-1.5">
        <div className="text-xs font-bold text-amber-800 mb-2">제출 전 확인사항</div>
        {[
          '제출 항목과 첨부 파일이 일치하는지 확인했습니다.',
          '파일 내 서명 및 직인이 포함되어 있습니다.',
          '기간, 좌표, 산정 근거 등 필수 기재 항목을 모두 작성했습니다.',
        ].map(text => (
          <div key={text} className="flex items-start gap-2 text-xs text-amber-800">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
            {text}
          </div>
        ))}
      </div>

      {/* 이탈 확인 Dialog (기획서 C-3: "저장하지 않은 내용이 있습니다" 확인) */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="relative z-10 w-80 rounded-sm border border-ink-700 bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <div className="text-xs font-bold text-ink-100">저장하지 않은 내용이 있습니다</div>
            <p className="mt-2 text-xs leading-5 text-ink-500">
              선택한 항목 또는 첨부 파일이 초기화됩니다.<br />
              [임시 저장] 후 나가거나, 그냥 닫으시겠습니까?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-semibold text-ink-400 hover:border-ink-600"
              >
                계속 작성
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem(draftKey, JSON.stringify({
                      selectedLabels: Array.from(selected),
                      savedAt: new Date().toISOString(),
                    }));
                  } catch { /* 무시 */ }
                  setShowExitConfirm(false);
                  onClose();
                }}
                className="rounded-xs border border-ink-600 bg-ink-800 px-3 py-1.5 text-xs font-semibold text-ink-400 hover:bg-ink-700"
              >
                임시 저장 후 닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  onClose();
                }}
                className="rounded-xs bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
              >
                그냥 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 메인 모달 컴포넌트 ────────────────────────────────────────────────────────

export default function SubmitWizardModal({
  open,
  onClose,
  initialSelectedLabels = [],
  reworkMode = false,
  reworkReason,
  certRenewalMode = false,
  requestItems,
  supplierId = 'supplier',
}: SubmitWizardModalProps) {
  const initialStep = reworkMode ? 2 : 1;
  const [step, setStep] = useState<1 | 2 | 3>(initialStep as 1 | 2 | 3);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelectedLabels));
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 이탈 감지 Dialog 상태
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // localStorage draft key — 항목별로 분리 (기획서 C-3 스펙)
  // kira_draft_{supplier_id}_{첫번째_선택항목_슬러그}
  const draftKey = `kira_draft_${supplierId}_${
    initialSelectedLabels.length > 0
      ? initialSelectedLabels[0].replace(/[^a-zA-Z0-9가-힣]/g, '_').slice(0, 40)
      : 'new'
  }`;

  // 저장할 내용이 있는지 판단 (이탈 감지 기준)
  const hasDraft = selected.size > 0 || files.length > 0;

  // 직렬화된 라벨 목록 — 배열 참조가 매 렌더마다 바뀌어도
  // 내용이 동일하면 Effect를 재실행하지 않기 위해 문자열로 비교
  const serializedLabels = JSON.stringify(initialSelectedLabels);

  // 모달 열릴 때마다, 또는 initialSelectedLabels 내용이 바뀔 때 상태 초기화
  useEffect(() => {
    if (open) {
      setStep(initialStep as 1 | 2 | 3);
      setSelected(new Set(initialSelectedLabels));
      setFiles([]);
      setSubmitted(false);
      setSubmitting(false);
      setShowExitConfirm(false);

      // localStorage 초안 복원 확인 (기획서 C-3: 재진입 시 토스트 팝업)
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const draft = JSON.parse(saved) as { selectedLabels?: string[] };
          if (draft.selectedLabels && draft.selectedLabels.length > 0) {
            // 초안이 있으면 복원 여부를 사용자에게 confirm으로 확인
            const restore = window.confirm(
              `이전에 저장된 초안이 있습니다.
항목: ${draft.selectedLabels.join(', ')}

불러오시겠습니까?`
            );
            if (restore) {
              setSelected(new Set(draft.selectedLabels));
            }
          }
        }
      } catch {
        // localStorage 접근 실패 시 무시
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, serializedLabels, initialStep]);

  // ESC 닫기 — 미저장 내용 있으면 이탈 확인 Dialog 경유
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitted) {
        if (hasDraft) {
          setShowExitConfirm(true);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, submitted, hasDraft, onClose]);

  // 파일 추가 — Mock 진행 시뮬레이션
  const handleAddFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map(f => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file: f,
      state: 'uploading',
      progress: 0,
    }));
    setFiles(prev => [...prev, ...newFiles]);

    // 각 파일 업로드 진행 시뮬레이션 (Mock)
    newFiles.forEach(uf => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 20) + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setFiles(prev => prev.map(f => f.id === uf.id ? { ...f, progress: 100, state: 'done' } : f));
        } else {
          setFiles(prev => prev.map(f => f.id === uf.id ? { ...f, progress } : f));
        }
      }, 250);
    });
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  function handleToggleItem(label: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  function handleNext() {
    if (step === 1 && selected.size > 0) setStep(2);
    else if (step === 2 && files.length > 0 && files.every(f => f.state !== 'uploading')) setStep(3);
  }

  function handleBack() {
    if (step === 2) setStep(reworkMode ? 2 : 1);  // rework면 step1이 없으므로 유지
    if (step === 3) setStep(2);
  }

  async function handleSubmit() {
    setSubmitting(true);
    // Mock: 1.2초 후 완료
    await new Promise(res => setTimeout(res, 1200));
    setSubmitting(false);
    setSubmitted(true);
    // 제출 성공 시 localStorage 초안 삭제
    try { localStorage.removeItem(draftKey); } catch { /* 무시 */ }
  }

  const canNext =
    (step === 1 && selected.size > 0) ||
    (step === 2 && files.length > 0 && files.every(f => f.state !== 'uploading'));

  const uploadingCount = files.filter(f => f.state === 'uploading').length;

  if (!open) return null;

  return (
    /* 오버레이 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="자료 제출"
    >
      {/* 배경 딤 — 미저장 내용 있으면 이탈 확인 Dialog 경유 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => {
          if (submitted) return;
          if (hasDraft) {
            setShowExitConfirm(true);
          } else {
            onClose();
          }
        }}
        aria-hidden="true"
      />

      {/* 모달 패널 */}
      <div className="relative z-10 flex w-full max-w-xl flex-col rounded-sm border border-ink-700 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] max-h-[90vh]">

        {/* 모달 헤더 */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-ink-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xs border border-accent-100 bg-accent-50">
              <Upload className="h-4 w-4 text-accent-700" />
            </div>
            <div>
              <div className="text-xs font-bold text-ink-100">자료 제출</div>
              {reworkMode && (
                <div className="text-[10px] text-amber-600 font-semibold">보완 재제출 모드</div>
              )}
              {certRenewalMode && !reworkMode && (
                <div className="text-[10px] text-accent-600 font-semibold">인증서 갱신 업로드 모드</div>
              )}
            </div>
          </div>
          {!submitted && (
            <button
              type="button"
              onClick={() => {
                if (hasDraft) {
                  setShowExitConfirm(true);
                } else {
                  onClose();
                }
              }}
              aria-label="닫기"
              className="flex h-7 w-7 items-center justify-center rounded-xs border border-ink-700 text-ink-400 hover:border-ink-600 hover:text-ink-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Wizard Step 바 */}
        {!submitted && <WizardStepBar current={step} />}

        {/* 본문 (스크롤 가능) */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <Step1
              requestItems={requestItems}
              selected={selected}
              onToggle={handleToggleItem}
              certRenewalMode={certRenewalMode}
            />
          )}
          {step === 2 && (
            <Step2
              files={files}
              onAddFiles={handleAddFiles}
              onRemoveFile={handleRemoveFile}
              reworkLabel={reworkMode ? (Array.from(selected)[0] as string) : undefined}
              reworkReason={reworkMode ? reworkReason : undefined}
            />
          )}
          {step === 3 && (
            <Step3
              selectedItems={selected}
              files={files}
              requestItems={requestItems}
              submitted={submitted}
            />
          )}
        </div>

        {/* 모달 푸터: 버튼 영역 */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-ink-700 bg-ink-800/30 shrink-0">

          {/* 왼쪽: 뒤로 / 닫기 */}
          <div>
            {!submitted && step > 1 && !reworkMode && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-bold text-ink-400 hover:border-ink-600 hover:text-ink-200"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                이전
              </button>
            )}
            {submitted && (
              <span className="text-xs text-ink-500">검증 현황은 '제출/검토 현황' 탭에서 확인하세요.</span>
            )}
          </div>

          {/* 오른쪽: 임시저장 / 다음 / 제출 / 닫기 */}
          <div className="flex items-center gap-2">
            {!submitted && step < 3 && (
              /* 임시 저장 버튼 — localStorage에 선택 항목 저장 (기획서 C-3 스펙) */
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem(draftKey, JSON.stringify({
                      selectedLabels: Array.from(selected),
                      savedAt: new Date().toISOString(),
                    }));
                    // 토스트 대신 간단한 인라인 피드백 (실제 Toast 컴포넌트 연동 시 교체)
                    alert(`초안이 임시 저장되었습니다.
항목: ${Array.from(selected).join(', ') || '(선택 없음)'}`);
                  } catch {
                    alert('임시 저장에 실패했습니다. 저장 공간을 확인해 주세요.');
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-semibold text-ink-400 hover:border-ink-600"
              >
                임시 저장
              </button>
            )}

            {!submitted && step < 3 && (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canNext}
                className={`
                  inline-flex items-center gap-1.5 rounded-xs px-4 py-2
                  text-xs font-bold transition-colors
                  ${canNext
                    ? 'bg-accent-700 text-white hover:bg-accent-900 shadow-control'
                    : 'bg-ink-700 text-ink-500 cursor-not-allowed'
                  }
                `}
              >
                {uploadingCount > 0 ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 업로드 중 ({uploadingCount})</>
                ) : (
                  <>다음 <ChevronRight className="h-3.5 w-3.5" /></>
                )}
              </button>
            )}

            {!submitted && step === 3 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xs bg-accent-700 px-5 py-2 text-xs font-bold text-white hover:bg-accent-900 shadow-control disabled:opacity-60"
              >
                {submitting
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 제출 중...</>
                  : <><CheckCircle2 className="h-3.5 w-3.5" /> 최종 제출</>
                }
              </button>
            )}

            {submitted && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xs bg-accent-700 px-4 py-2 text-xs font-bold text-white hover:bg-accent-900"
              >
                닫기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
