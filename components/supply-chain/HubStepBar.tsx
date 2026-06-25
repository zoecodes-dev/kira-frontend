'use client';

// 원청 공급망 맵 허브 상단의 8단계 흐름 액션 바
import { ClipboardCheck, FileSpreadsheet, FileText, Layers, Mail, Network, PackageSearch, RefreshCw, Users } from 'lucide-react';

interface HubStepBarProps {
  poolCount: number;
  hasSelection: boolean;
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
      className="group flex min-w-[150px] flex-1 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-ink-400 group-enabled:group-hover:bg-emerald-100 group-enabled:group-hover:text-emerald-700">
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
  onOpenPool,
  onOpenSupplierInfo,
  onOpenDataRequest,
  onOpenInvite,
  onOpenMapManage,
}: HubStepBarProps) {
  return (
    <section className="border-b border-slate-200 bg-white px-6 pt-6">
      <div className="mb-1 flex items-center gap-2">
        <Layers className="h-5 w-5 text-emerald-600" />
        <h1 className="text-2xl font-black tracking-tight text-ink-100">공급망 맵 허브</h1>
      </div>
      <p className="text-sm font-medium text-ink-500">
        대표 제품을 고르고 MBOM 기준으로 1차 협력사를 자동 맵핑한 뒤, 협력사 정보 확인·자료 요청·초대·만료 관리까지 한 화면에서 진행합니다.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 pb-4">
        <div className="flex min-w-[150px] flex-1 items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
            <PackageSearch className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold text-emerald-600">STEP 1</span>
            <span className="block truncate text-sm font-bold text-ink-100">맵 생성 · 대표 제품 선택</span>
            <span className="block truncate text-[11px] font-medium text-emerald-700">아래에서 제품을 선택하세요</span>
          </span>
        </div>
        <StepButton index={2} label="협력사 Pool 구성" hint={poolCount > 0 ? `${poolCount}개사 선택됨` : '1차 협력사 선택'} Icon={Users} onClick={onOpenPool} />
        <div className="flex min-w-[150px] flex-1 items-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-ink-400">
            <Network className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold text-slate-400">STEP 3</span>
            <span className="block truncate text-sm font-bold text-ink-100">자재·협력사 자동 맵핑</span>
            <span className="block truncate text-[11px] font-medium text-slate-500">MBOM 기준 자동 구성</span>
          </span>
        </div>
        <StepButton index={4} label="협력사 정보 확인" hint={hasSelection ? '선택 노드 기준' : '노드를 먼저 선택'} Icon={ClipboardCheck} onClick={onOpenSupplierInfo} disabled={!hasSelection} />
        <StepButton index={5} label="자료 업데이트 요청" hint="검증 후 보완 요청" Icon={RefreshCw} onClick={onOpenDataRequest} disabled={!hasSelection} />
        <StepButton index={6} label="정보 입력 요청" hint="표준 템플릿 메일" Icon={Mail} onClick={onOpenInvite} />
        <StepButton index={7} label="맵 관리·만료 확인" hint="인증서/원산지 만료" Icon={FileText} onClick={onOpenMapManage} />
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
