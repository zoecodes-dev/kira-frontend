'use client';

// 온보딩 단계 공통 하단 네비게이션 (이전/다음)
export default function StepFooter({
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel = '다음',
  backLabel = '이전',
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  backLabel?: string;
}) {
  return (
    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="rounded-md bg-[#046949] px-4 py-2 text-sm font-semibold text-white hover:bg-[#03563c] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}
