'use client';

// 페이지 상단 구획 탭 — 밑줄형. 활성 탭만 브랜드 색 + 하단 바, 컨테이너 하단선에 겹침.
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
    <div className={clsx('flex gap-6 border-b border-[#E2E8F0]', className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={clsx(
            '-mb-px border-b-2 pb-3 text-[15px] transition-colors',
            value === t.key
              ? 'border-[#11352A] font-semibold text-[#11352A]'
              : 'border-transparent font-medium text-[#64748B] hover:text-[#11352A]',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
