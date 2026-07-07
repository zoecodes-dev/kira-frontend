'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Factory,
  KeyRound,
  LayoutDashboard,
  Network,
  ScanLine,
} from 'lucide-react';

const menu = [
  { href: '/partner',              label: '홈',           subtitle: '요약 · 우선 조치',              icon: LayoutDashboard, exact: true },
  { href: '/partner/company-info', label: '내 기업 정보',  subtitle: '정보 확인 · 자료 제출(입력)',    icon: Building2 },
  { href: '/partner/ai-parsing',   label: 'AI 파싱 확인',  subtitle: '추출 결과 검토 · 수정',          icon: ScanLine },
  { href: '/partner/supply-chain', label: '공급망 연결',   subtitle: '직접 연결 업체',                icon: Network },
  { href: '/partner/settings',     label: '계정 설정',     subtitle: '비밀번호 · 담당자 정보',          icon: KeyRound },
] as const;

// 협력사 업무공간(/partner) 사이드바 — app/supplier/page.tsx의 SupplierSidebar를 이관.
// setActiveView 탭 전환 대신 Next.js Link 내비게이션으로 전환, 활성 표시는 pathname 기준.
export default function PartnerSidebar({ supplierName }: { supplierName: string }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-brand text-white shadow-control">
      <div className="border-b border-white/10 p-5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-white shadow-control">
            <Factory className="h-4 w-4 text-brand" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight text-white">협력사 업무공간</div>
            <div className="truncate text-[11px] text-white/55">{supplierName}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-1">
        <div className="py-2.5">
          <div className="space-y-0.5">
            {menu.map(item => {
              const Icon = item.icon;
              const active = 'exact' in item && item.exact ? pathname === item.href : pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? 'flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-left font-semibold bg-white text-[#11352A] transition-colors'
                      : 'flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-left font-medium bg-transparent text-white/90 transition-colors hover:bg-white/8'
                  }
                >
                  <div className={
                    active
                      ? 'flex h-8 w-8 shrink-0 items-center justify-center text-[#11352A]'
                      : 'flex h-8 w-8 shrink-0 items-center justify-center text-white/75'
                  }>
                    <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px]">{item.label}</div>
                    <div className={`truncate text-[10px] ${active ? 'text-[#11352A]/60' : 'text-white/50'}`}>{item.subtitle}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="border-t border-white/10 bg-black/15 p-4 shrink-0">
        <div className="text-[11px] font-semibold text-white/50">접속 권한</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-ok-solid pulse-soft" />
          <span className="text-xs font-semibold text-white/80">내 회사 기준 보기</span>
        </div>
      </div>
    </aside>
  );
}
