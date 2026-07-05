'use client';

import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import NavLink from '@/components/NavLink';
import PrimeNotificationBell from '@/components/prime/PrimeNotificationBell';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/' || pathname === '/login' || pathname === '/partner' || pathname.startsWith('/partner/')) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-white/10 bg-brand text-white flex flex-col shadow-control">
        <div className="p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-sm bg-white flex items-center justify-center shadow-control shrink-0">
                <ShieldCheck className="w-4 h-4 text-brand" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white tracking-tight truncate">KIRA Battery</div>
                <div className="text-[11px] text-white/55 truncate">공급망 관리</div>
              </div>
            </div>
            {/* 원청 GNB 알림 벨 — 데모 알림 스토어(prime) 구독 */}
            <PrimeNotificationBell />
          </div>
        </div>

        {/* 그룹 구분은 가로 구분선(border-t)만 사용 — 그룹 헤더 라벨은 렌더링하지 않음.
            구분선은 그룹 컨테이너(좌우 패딩 없음)에, 좌우 패딩은 NavLink 항목 내부(px-3)에만. */}
        <nav className="flex-1 overflow-y-auto py-1">
          {/* 공급망 워크스페이스 — 메인 엔트리 포인트(최상단). 기본 진입은 공급망 목록. */}
          <div className="py-2.5">
            <div className="space-y-0.5">
              {/* 목록·맵 구분은 사이드바 드롭다운 대신 각 페이지 상단 헤더 탭으로만 한다. */}
              <NavLink
                href="/supply-chain"
                iconName="network"
                label="공급망 워크스페이스"
                subtitle="목록·맵·요청·실사"
              />
            </div>
          </div>

          {/* 대시보드 · My Task */}
          <div className="border-t border-white/10 py-2.5">
            <div className="space-y-0.5">
              <NavLink href="/dashboard" iconName="activity" label="대시보드" subtitle="전체 결과 요약" />
              <NavLink href="/my-task" iconName="clipboard-check" label="My Task" subtitle="담당자 업무" />
            </div>
          </div>

          {/* 협력사 관리 */}
          <div className="border-t border-white/10 py-2.5">
            <div className="space-y-0.5">
              {/* 입력 현황은 My Task 탭으로 이관 — 드롭다운 없이 단일 링크(목록 진입). */}
              <NavLink
                href="/suppliers"
                iconName="building2"
                label="협력사 관리"
                subtitle="목록·세부 정보"
              />
            </div>
          </div>

          {/* 보고·결재 */}
          <div className="border-t border-white/10 py-2.5">
            <div className="space-y-0.5">
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

          {/* 감사·추적 */}
          <div className="border-t border-white/10 py-2.5">
            <div className="space-y-0.5">
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
        </div>
      </aside>

      {/* 모든 페이지 풀폭 통일 — 대시보드 기준(최대폭 제한 없음) */}
      <main className="flex-1 min-w-0 overflow-x-auto">
        {children}
      </main>
    </div>
  );
}
