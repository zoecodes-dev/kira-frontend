'use client';

// 원청 공급망 맵 허브 상단의 흐름 액션 바 (5단계)
import { CheckCircle2, ClipboardCheck, FileSpreadsheet, PackageSearch, ShieldCheck, Users } from 'lucide-react';

interface HubStepBarProps {
  poolCount: number;
  hasProduct: boolean;
  completed: Set<number>; // 완료된 단계 번호 — 상단 버튼에 완료 색(초록+체크) 표시
  locked?: boolean;       // 완료 공급망 — '수정' 전까지 단계 버튼 잠금(읽기 전용)
  onOpenPool: () => void;
  onOpenSuppliers: () => void; // STEP 3 — 연결 협력사 확인·자료 요청(목록)
  onOpenVerify: () => void;    // STEP 4 — 최종 검증(만료·실데이터)
}

function StepButton({
  index,
  label,
  hint,
  Icon,
  onClick,
  disabled = false,
  done = false,
}: {
  index: number;
  label: string;
  hint?: string;
  Icon: typeof Users;
  onClick: () => void;
  disabled?: boolean;
  done?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex min-w-[150px] flex-1 items-center gap-3 rounded-md border px-3 py-2.5 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
        done
          ? 'border-ok-border bg-ok-bg ring-1 ring-ok-border'
          : 'border-slate-200 bg-white hover:border-ok-border hover:bg-ok-bg disabled:hover:border-slate-200 disabled:hover:bg-white'
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
          done ? 'bg-ok-text text-white' : 'bg-slate-100 text-ink-400 group-enabled:group-hover:bg-ok-bg group-enabled:group-hover:text-ok-text'
        }`}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </span>
      <span className="min-w-0">
        <span className={`block text-[11px] font-bold ${done ? 'text-ok-text' : 'text-slate-400'}`}>
          STEP {index}{done ? ' · 완료' : ''}
        </span>
        <span className="block truncate text-sm font-bold text-ink-100">{label}</span>
        {hint && <span className="block truncate text-[11px] font-medium text-slate-500">{hint}</span>}
      </span>
    </button>
  );
}

export default function HubStepBar({
  poolCount,
  hasProduct,
  completed,
  locked = false,
  onOpenPool,
  onOpenSuppliers,
  onOpenVerify,
}: HubStepBarProps) {
  const poolDone = poolCount > 0; // STEP 2 완료
  const step1Done = completed.has(1); // 제품 선택 완료
  return (
    <section className="border-b border-slate-200 bg-white px-6 pt-6">
      <div className="mt-4 flex flex-wrap gap-2 pb-4">
        {/* STEP 1 — 맵 생성·제품 선택 (제품 선택 시 완료) */}
        <div
          className={`flex min-w-[150px] flex-1 items-center gap-3 rounded-md border px-3 py-2.5 ${
            step1Done ? 'border-ok-border bg-ok-bg ring-1 ring-ok-border' : 'border-slate-200 bg-white'
          }`}
        >
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${step1Done ? 'bg-ok-text text-white' : 'bg-slate-100 text-ink-400'}`}>
            {step1Done ? <CheckCircle2 className="h-4 w-4" /> : <PackageSearch className="h-4 w-4" />}
          </span>
          <span className="min-w-0">
            <span className={`block text-[11px] font-bold ${step1Done ? 'text-ok-text' : 'text-slate-400'}`}>STEP 1{step1Done ? ' · 완료' : ''}</span>
            <span className="block truncate text-sm font-bold text-ink-100">맵 생성 · 대표 제품 선택</span>
            <span className={`block truncate text-[11px] font-medium ${step1Done ? 'text-ok-text' : 'text-slate-500'}`}>
              {step1Done ? '제품 선택됨' : '아래에서 제품을 선택하세요'}
            </span>
          </span>
        </div>

        <StepButton
          index={2}
          label="협력사 Pool 구성"
          hint={!hasProduct ? '제품을 먼저 선택' : poolDone ? `${poolCount}개사 선택됨` : '1차 협력사 선택'}
          Icon={Users}
          onClick={onOpenPool}
          disabled={!hasProduct || locked}
          done={completed.has(2)}
        />

        {/* STEP 3 — 연결 협력사 목록에서 확인 + 자료 요청(정보입력 요청 포함)을 한꺼번에 */}
        <StepButton
          index={3}
          label="협력사 확인 · 자료 요청"
          hint={!poolDone ? 'Pool 확정 후' : `연결 협력사 ${poolCount}개사 확인·요청`}
          Icon={ClipboardCheck}
          onClick={onOpenSuppliers}
          disabled={!poolDone || locked}
          done={completed.has(3)}
        />

        {/* STEP 4 — 만료 여부 등 실데이터 가져와 최종 검증 */}
        <StepButton
          index={4}
          label="최종 검증"
          hint={!poolDone ? 'Pool 확정 후' : '만료·실데이터 검증'}
          Icon={ShieldCheck}
          onClick={onOpenVerify}
          disabled={!poolDone || locked}
          done={completed.has(4)}
        />

        {/* STEP 5 — 고객사 데이터 다운로드 (아래 추적 테이블에서) */}
        <div className="flex min-w-[150px] flex-1 items-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-ink-400">
            <FileSpreadsheet className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold text-slate-400">STEP 5</span>
            <span className="block truncate text-sm font-bold text-ink-100">고객사 데이터 다운로드</span>
            <span className="block truncate text-[11px] font-medium text-slate-500">아래 추적 테이블에서 내보내기</span>
          </span>
        </div>
      </div>
    </section>
  );
}
