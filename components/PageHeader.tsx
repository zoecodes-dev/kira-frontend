'use client';

// 모든 페이지 상단을 통일하는 공통 헤더.
// 고정 구조: ① 제목줄(제목·배지·설명 + 우측 actions + 로그아웃 고정)
//            ② tabs 슬롯  ③ children 서브 슬롯(STEP·필터바 등)
// 로그아웃은 이 컴포넌트 안에 항상 고정 — 페이지에서 따로 렌더하지 않는다.
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import clsx from 'clsx';

export interface PageTab {
  label: string;
  href?: string;           // 있으면 Link, 없으면 onClick 버튼
  active?: boolean;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  badge?: string;
  description?: string;
  actions?: React.ReactNode;        // 우측 커스텀 액션 (날짜·필터·알림 등)
  tabs?: PageTab[];                 // 탭 슬롯
  children?: React.ReactNode;       // 탭 아래 서브 슬롯 (STEP 스텝퍼·필터바 등)
}

export default function PageHeader({ title, badge, description, actions, tabs, children }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white">
      {/* ① 제목줄 */}
      <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="shrink-0 text-[17px] font-semibold tracking-tight text-[#0F172A]">{title}</h1>
          {badge && (
            <span className="shrink-0 rounded border border-[#E2E8F0] bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-semibold text-[#475569]">
              {badge}
            </span>
          )}
          {description && (
            <p className="truncate text-[12px] text-[#64748B]">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded border-[0.5px] border-[#CBD5E1] px-2.5 py-1.5 text-[11px] text-[#475569] hover:bg-[#F8FAFC]"
          >
            <LogOut className="h-3.5 w-3.5" />
            로그아웃
          </Link>
        </div>
      </div>

      {/* ② 탭 슬롯 */}
      {tabs && tabs.length > 0 && (
        <div className="flex gap-[22px] border-b border-[#E2E8F0] px-4">
          {tabs.map(t => {
            const cls = clsx(
              '-mb-px border-b-2 py-2.5 text-[14px] transition-colors',
              t.active
                ? 'border-[#11352A] font-semibold text-[#11352A]'
                : 'border-transparent font-medium text-[#64748B] hover:text-[#11352A]',
            );
            return t.href ? (
              <Link key={t.label} href={t.href} className={cls}>{t.label}</Link>
            ) : (
              <button key={t.label} type="button" onClick={t.onClick} className={cls}>{t.label}</button>
            );
          })}
        </div>
      )}

      {/* ③ children 서브 슬롯 */}
      {children && (
        <div className="border-b border-[#E2E8F0] bg-[#FAFBFC] px-4 py-[11px]">{children}</div>
      )}
    </header>
  );
}
