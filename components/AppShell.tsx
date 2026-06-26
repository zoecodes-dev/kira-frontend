'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, ShieldCheck } from 'lucide-react';
import NavLink from '@/components/NavLink';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/' || pathname === '/login' || pathname === '/supplier' || pathname.startsWith('/supplier/')) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-white/10 bg-brand text-white flex flex-col shadow-control">
        <div className="p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-sm bg-white flex items-center justify-center shadow-control">
              <ShieldCheck className="w-4 h-4 text-brand" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight">Battery DPP</div>
              <div className="text-[11px] text-white/55">규제 대응 관제</div>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-5 flex-1 overflow-y-auto">
          <div>
            <div className="space-y-0.5 mt-1">
              <NavLink href="/dashboard" iconName="activity" label="대시보드" subtitle="전체 결과 요약" />
              <NavLink href="/my-task" iconName="clipboard-check" label="My Task" subtitle="담당자 업무" />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-white/50 font-bold">
              공급망 워크스페이스
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink
                href="/supply-chain/map"
                iconName="network"
                label="공급망 워크스페이스"
                subtitle="맵·요청·실사"
                subItems={[
                  { href: '/supply-chain/map', label: '공급망 맵 허브' },
                ]}
              />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-white/50 font-bold">
              DPP 센터
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink
                href="/dpp/center"
                iconName="layers"
                label="DPP 센터"
                subtitle="대시보드·준비도·이력"
                subItems={[
                  { href: '/dpp/center', label: 'DPP 대시보드' },
                  { href: '/dpp/readiness', label: 'Readiness' },
                  { href: '/hitl', label: 'HITL' },
                  { href: '/dpp', label: 'History', exact: true },
                ]}
              />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-white/50 font-bold">
              협력사 관리
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink
                href="/suppliers"
                iconName="building2"
                label="협력사 관리"
                subtitle="목록·세부 정보·입력 현황"
                subItems={[
                  {
                    href: '/suppliers',
                    label: '협력사 목록',
                    exact: true,
                    children: [
                      {
                        href: '/suppliers/detail-context',
                        label: '협력사 세부 정보',
                        matchPattern: '^/suppliers/(?!invitations(?:/|$)|check-info(?:/|$))[^/]+',
                        disabled: true,
                      },
                    ],
                  },
                  { href: '/suppliers/check-info', label: '협력사 입력 현황' },
                ]}
              />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-white/50 font-bold">
              물질·자재 관리
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink href="/materials/regulation-results" iconName="flask" label="규제 검증 결과" subtitle="자재 규제 판정" />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-white/50 font-bold">
              보고·결재
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink
                href="/report"
                iconName="file-text"
                label="보고 관리"
                subtitle="보고서 작성·결재 추적"
                subItems={[
                  { href: '/report', label: '보고서 목록', exact: true },
                  { href: '/report/inbox', label: '결재함' },
                ]}
              />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-white/50 font-bold">
              감사·추적
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink
                href="/audit"
                iconName="shield-check"
                label="증적 관리"
                subtitle="추적·증거 묶음"
                subItems={[
                  { href: '/audit', label: '감사 추적' },
                  { href: '/audit/package', label: '감사 패키지' },
                ]}
              />
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10 bg-black/15 shrink-0">
          <div className="text-[11px] text-white/50 font-semibold mb-1">시스템 상태</div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-ok-solid pulse-soft" />
            <div className="text-xs text-white/80">정상 운영 중</div>
          </div>
          <div className="text-[10px] text-white/40 mt-2 num-mono">v0.6.0 · 2026.05.21</div>
          <Link
            href="/"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xs border border-white/20 bg-transparent px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            로그아웃
          </Link>
          <div className="mt-2.5 text-[10px] text-white/40 num-mono">
            마지막 업데이트 2026-06-17 14:57
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-auto">
        {pathname === '/dashboard' ? (
          children
        ) : (
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
