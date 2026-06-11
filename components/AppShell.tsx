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
      <aside className="w-64 shrink-0 border-r border-ink-700 bg-white flex flex-col shadow-control">
        <div className="p-5 border-b border-ink-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-sm bg-accent-700 flex items-center justify-center shadow-control">
              <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-bold text-ink-100 tracking-tight">Battery DPP</div>
              <div className="text-[11px] text-ink-500">규제 대응 관제</div>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-5 flex-1 overflow-y-auto">
          <div>
            <div className="px-3 py-1.5 text-[11px] text-ink-500 font-bold">
              관제
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink href="/dashboard" iconName="activity" label="대시보드" subtitle="전체 결과 요약" />
              <NavLink href="/queue" iconName="list-checks" label="검증 대기열" subtitle="LangGraph 진행" />
              <NavLink href="/my-task" iconName="clipboard-check" label="My Task" subtitle="담당자 업무" />
              <NavLink
                href="/supply-chain/map"
                iconName="network"
                label="공급망 워크스페이스"
                subtitle="맵·요청·실사"
                subItems={[
                  { href: '/supply-chain/map', label: '공급망맵' },
                  { href: '/supply-chain/product-map', label: '제품별 DPP 공급망 점검' },
                  { href: '/supply-chain/request-map', label: '자료 요청 업무 보드' },
                  { href: '/due-diligence', label: '공급망 실사 관리' },
                  { href: '/risk/actions', label: '리스크 조치 보드' },
                ]}
              />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-ink-500 font-bold">
              협력사 관리
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink
                href="/suppliers"
                iconName="building2"
                label="협력사 목록"
                subtitle="전체 협력사"
                subItems={[
                  {
                    href: '/suppliers',
                    label: '전체 목록',
                    children: [
                      { href: '/suppliers/S-CELL-001/info', label: '협력사 세부 정보', matchPattern: '^/suppliers/[^/]+/', disabled: true },
                    ],
                  },
                  { href: '/suppliers/reliability', label: '협력사 신뢰성 평가' },
                  { href: '/risk/high-risk', label: '고위험 협력사' },
                ]}
              />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-ink-500 font-bold">
              물질·자재 관리
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink
                href="/materials"
                iconName="flask"
                label="자재·규제 데이터"
                subtitle="조성·인증·규제"
                subItems={[
                  { href: '/materials', label: '물질 관리', exact: true },
                  { href: '/risk/origin-certs', label: '원산지 증명서 만료 관리' },
                  { href: '/materials/regulation-results', label: '규제 검증 결과' },
                ]}
              />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-ink-500 font-bold">
              입력 데이터
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink
                href="/submission-status"
                iconName="bar-chart"
                label="제출 데이터 관리"
                subtitle="제출·검토·포털"
                subItems={[
                  { href: '/submission-status', label: '입력 현황' },
                  { href: '/submission-review', label: '제출 자료 검토' },
                  { href: '/portal', label: '제출 포털 미리보기' },
                ]}
              />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-ink-500 font-bold">
              DPP 발행
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink
                href="/dpp/readiness"
                iconName="layers"
                label="발행 준비"
                subtitle="준비도·검토·이력"
                subItems={[
                  { href: '/dpp/center', label: 'DPP Center' },
                  { href: '/dpp/readiness', label: 'DPP Readiness' },
                  { href: '/hitl', label: 'HITL 검토' },
                  { href: '/dpp', label: 'DPP 발행 이력' },
                ]}
              />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-ink-500 font-bold">
              지식·정책
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink href="/knowledge" iconName="book-open" label="지표·규제 사전" subtitle="용어·판정 기준" />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-ink-500 font-bold">
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

        <div className="p-4 border-t border-ink-700 bg-ink-800 shrink-0">
          <div className="text-[11px] text-ink-500 font-semibold mb-1">시스템 상태</div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-signal-ok pulse-soft" />
            <div className="text-xs text-ink-200">정상 운영 중</div>
          </div>
          <div className="text-[10px] text-ink-400 mt-2 num-mono">v0.6.0 · 2026.05.21</div>
          <Link
            href="/"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            로그아웃
          </Link>
        </div>
      </aside>

      <main className={`flex-1 min-w-0 ${pathname === '/risk/high-risk' ? 'overflow-x-clip' : 'overflow-x-auto'}`}>
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
