'use client';

// 원청 공급망 맵 허브 상단의 8단계 흐름 액션 바
import { ClipboardCheck, FileSpreadsheet, FileText, Layers, Mail, Network, PackageSearch, RefreshCw, Users } from 'lucide-react';

interface HubStepBarProps {
  poolCount: number;
  hasSelection: boolean;
  hasProduct: boolean;
  onOpenPool: () => void;
  onOpenSupplierInfo: () => void;
  onOpenDataRequest: () => void;
  onOpenInvite: () => void;
  onOpenMapManage: () => void;
}

function StepButton({
  index,
  label,
  hint,
  Icon,
  onClick,
  disabled = false,
}: {
  index: number;
  label: string;
  hint?: string;
  Icon: typeof Users;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex min-w-[150px] flex-1 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-ok-border hover:bg-ok-bg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-ink-400 group-enabled:group-hover:bg-ok-bg group-enabled:group-hover:text-ok-text">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold text-slate-400">STEP {index}</span>
        <span className="block truncate text-sm font-bold text-ink-100">{label}</span>
        {hint && <span className="block truncate text-[11px] font-medium text-slate-500">{hint}</span>}
      </span>
    </button>
  );
}

export default function HubStepBar({
  poolCount,
  hasSelection,
  hasProduct,
  onOpenPool,
  onOpenSupplierInfo,
  onOpenDataRequest,
  onOpenInvite,
  onOpenMapManage,
}: HubStepBarProps) {
  // 순차 게이팅 — 앞 단계 미완료면 다음 단계 완전 비활성.
  const poolDone = poolCount > 0; // STEP 2 완료
  return (
    <section className="border-b border-slate-200 bg-white px-6 pt-6">
      <div className="mt-4 flex flex-wrap gap-2 pb-4">
        <div className="flex min-w-[150px] flex-1 items-center gap-3 rounded-md border border-ok-border bg-ok-bg px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ok-bg text-ok-text">
            <PackageSearch className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold text-ok-text">STEP 1</span>
            <span className="block truncate text-sm font-bold text-ink-100">맵 생성 · 대표 제품 선택</span>
            <span className="block truncate text-[11px] font-medium text-ok-text">아래에서 제품을 선택하세요</span>
          </span>
        </div>
        <StepButton
          index={2}
          label="협력사 Pool 구성"
          hint={!hasProduct ? '제품을 먼저 선택' : poolDone ? `${poolCount}개사 선택됨` : '1차 협력사 선택'}
          Icon={Users}
          onClick={onOpenPool}
          disabled={!hasProduct}
        />
        {/* STEP 3 — Pool 확정 시 활성화. 공급망 맵(§10.2a)은 제품 선택 시 이미 자동 구성되므로,
            여기서는 확정된 Pool 기준으로 맵핑이 적용됐음을 상태로 표면화한다. */}
        {poolCount > 0 ? (
          <div className="flex min-w-[150px] flex-1 items-center gap-3 rounded-md border border-ok-border bg-ok-bg px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ok-bg text-ok-text">
              <Network className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold text-ok-text">STEP 3</span>
              <span className="block truncate text-sm font-bold text-ink-100">자재·협력사 자동 맵핑</span>
              <span className="block truncate text-[11px] font-medium text-ok-text">{poolCount}개사 기준 자동 구성됨 · 아래 맵 확인</span>
            </span>
          </div>
        ) : (
          <div className="flex min-w-[150px] flex-1 items-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-ink-400">
              <Network className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold text-slate-400">STEP 3</span>
              <span className="block truncate text-sm font-bold text-ink-100">자재·협력사 자동 맵핑</span>
              <span className="block truncate text-[11px] font-medium text-slate-500">STEP 2 Pool 확정 후 자동 구성</span>
            </span>
          </div>
        )}
        <StepButton
          index={4}
          label="협력사 정보 확인"
          hint={!poolDone ? 'Pool 확정 후' : hasSelection ? '선택 노드 기준' : '노드를 먼저 선택'}
          Icon={ClipboardCheck}
          onClick={onOpenSupplierInfo}
          disabled={!poolDone || !hasSelection}
        />
        <StepButton
          index={5}
          label="자료 업데이트 요청"
          hint={!poolDone ? 'Pool 확정 후' : hasSelection ? '검증 후 보완 요청' : '노드를 먼저 선택'}
          Icon={RefreshCw}
          onClick={onOpenDataRequest}
          disabled={!poolDone || !hasSelection}
        />
        <StepButton
          index={6}
          label="정보 입력 요청"
          hint={!poolDone ? 'Pool 확정 후' : '표준 템플릿 메일'}
          Icon={Mail}
          onClick={onOpenInvite}
          disabled={!poolDone}
        />
        <StepButton
          index={7}
          label="맵 관리·만료 확인"
          hint={!poolDone ? 'Pool 확정 후' : '인증서/원산지 만료'}
          Icon={FileText}
          onClick={onOpenMapManage}
          disabled={!poolDone}
        />
        <div className="flex min-w-[150px] flex-1 items-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-ink-400">
            <FileSpreadsheet className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold text-slate-400">STEP 8</span>
            <span className="block truncate text-sm font-bold text-ink-100">고객사 데이터 다운로드</span>
            <span className="block truncate text-[11px] font-medium text-slate-500">아래 추적 테이블에서 내보내기</span>
          </span>
        </div>
      </div>
    </section>
  );
}
