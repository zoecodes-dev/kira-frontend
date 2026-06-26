'use client';

// 페이지 상단 구획 탭 — 칸을 세로 구분선으로 나누고 활성 칸은 브랜드 채움.
import clsx from 'clsx';

export default function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: readonly { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  className?: string;
}) {
  return (
    <div className={clsx('inline-flex flex-wrap overflow-hidden rounded-xs border border-ink-700 bg-white shadow-control', className)}>
      {tabs.map((t, i) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={clsx(
            'px-4 py-2 text-xs font-bold transition-colors',
            i > 0 && 'border-l border-ink-700',
            value === t.key ? 'bg-brand text-white' : 'text-ink-500 hover:bg-slate-50 hover:text-ink-200',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
