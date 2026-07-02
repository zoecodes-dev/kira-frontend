'use client';

// 원청 공급망 맵 허브 상단 — 흐름 순서 스텝 바.
// 맵생성 → Pool → 협력사확인·동의·요청 → 자료수집(반복) → 최종검증 → 다운로드.
// STEP 3~4는 여러 협력사·하위(n차)가 자료를 주고받는 '반복' 구간이라 완성도(%)로 진행을 표시하고,
// 최종검증은 데이터 완성도가 준비(readyForFinal)돼야 열린다.
import { CheckCircle2, ClipboardCheck, FileSpreadsheet, PackageSearch, RefreshCw, ShieldCheck, Users } from 'lucide-react';

interface HubStepBarProps {
  poolCount: number;
  hasProduct: boolean;
  completed: Set<number>;
  locked?: boolean;
  step3Done?: boolean;           // 협력사 전부 확인 → STEP4(자료 수집·보완) 개방
  step4Done?: boolean;           // 자료 검토 전체 확인 → STEP5(최종 검증) 개방
  readyForFinal?: boolean;       // 데이터 완성도 준비 완료 → 최종검증 개방
  completePct?: number | null;   // 자료수집 반복 구간 진행률(%)
  onOpenPool: () => void;
  onOpenSuppliers: () => void;   // 협력사 확인·동의·정보요청 메일(ConnectedSuppliersModal)
  onOpenDataReview: () => void;  // 자료 수집·보완 검토(DataReviewModal)
  onOpenVerify: () => void;      // 최종 검증(MapManageModal)
}

function StepTile({
  index, label, hint, Icon, onClick, disabled = false, done = false, current = false, badge,
}: {
  index: number | string;
  label: string;
  hint?: string;
  Icon: typeof Users;
  onClick?: () => void;
  disabled?: boolean;
  done?: boolean;
  current?: boolean;
  badge?: string;
}) {
  const cls = done
    ? 'border-ok-border bg-ok-bg ring-1 ring-ok-border'
    : current
      ? 'border-brand bg-white ring-1 ring-brand'
      : 'border-slate-200 bg-white';
  const interactive = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !interactive}
      className={`group flex min-w-[150px] flex-1 items-center gap-3 rounded-md border px-3 py-2.5 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${cls} ${interactive && !disabled ? 'hover:border-brand hover:bg-slate-50' : ''}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${done ? 'bg-ok-text text-white' : current ? 'bg-brand text-white' : 'bg-slate-100 text-ink-400'}`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </span>
      <span className="min-w-0">
        <span className={`block text-[11px] font-bold ${done ? 'text-ok-text' : current ? 'text-brand' : 'text-slate-400'}`}>
          STEP {index}{done ? ' · 완료' : current ? ' · 진행' : ''}{badge ? ` · ${badge}` : ''}
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
  step3Done = false,
  step4Done = false,
  readyForFinal = false,
  completePct = null,
  onOpenPool,
  onOpenSuppliers,
  onOpenDataReview,
  onOpenVerify,
}: HubStepBarProps) {
  const step1Done = completed.has(1);
  const poolDone = poolCount > 0;
  const collecting = poolDone && !readyForFinal;   // 자료수집 반복 진행중
  return (
    <section className="border-b border-slate-200 bg-white px-6 pt-6">
      <div className="mt-4 flex flex-wrap gap-2 pb-4">
        {/* 1 — 맵 생성·제품 선택 */}
        <StepTile
          index={1}
          label="맵 생성 · 대표 제품"
          hint={step1Done ? '고객·제품·BOM·기간 확정' : '아래에서 선택'}
          Icon={PackageSearch}
          done={step1Done}
          current={!step1Done}
        />
        {/* 2 — 협력사 Pool 구성 */}
        <StepTile
          index={2}
          label="협력사 Pool 구성"
          hint={!hasProduct ? '제품 먼저' : poolDone ? `${poolCount}개사 확정` : '1차 협력사 선택'}
          Icon={Users}
          onClick={onOpenPool}
          disabled={!hasProduct || locked}
          done={completed.has(2)}
          current={step1Done && !poolDone}
        />
        {/* 3 — 협력사 확인·동의·정보요청 메일 */}
        <StepTile
          index={3}
          label="확인 · 동의 · 정보요청"
          hint={!poolDone ? 'Pool 확정 후' : '일반정보 확인·제3자 동의·메일 발송'}
          Icon={ClipboardCheck}
          onClick={onOpenSuppliers}
          disabled={!poolDone || locked}
          done={completed.has(3)}
        />
        {/* 4 — 자료 수집·보완 (입력 누락·문서 문제 검토·요청). STEP3 후 개방, '전체 확인' 시 완료 */}
        <StepTile
          index={4}
          label="자료 수집 · 보완"
          hint={!step3Done ? '협력사 전부 확인 후' : step4Done ? '검토 완료' : '입력 누락·문서 문제 검토'}
          Icon={RefreshCw}
          onClick={onOpenDataReview}
          disabled={!step3Done || locked}
          done={step4Done}
          current={step3Done && !step4Done}
          badge={poolDone && completePct !== null ? `완성도 ${completePct}%` : undefined}
        />
        {/* 5 — 최종 검증 (완성도 준비 시 개방) */}
        <StepTile
          index={5}
          label="최종 검증"
          hint={!step4Done ? '자료 검토 전체 확인 후' : readyForFinal ? '요약·판정·엑셀' : '완성도 100% 후 개방'}
          Icon={ShieldCheck}
          onClick={onOpenVerify}
          disabled={!step4Done || locked}
          done={completed.has(4)}
        />
        {/* 6 — 고객사 데이터 다운로드 (아래 추적 테이블) */}
        <div className="flex min-w-[150px] flex-1 items-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-ink-400">
            <FileSpreadsheet className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold text-slate-400">STEP 6</span>
            <span className="block truncate text-sm font-bold text-ink-100">고객사 데이터 다운로드</span>
            <span className="block truncate text-[11px] font-medium text-slate-500">최종 검증 · 추적 테이블에서 엑셀</span>
          </span>
        </div>
      </div>
    </section>
  );
}
