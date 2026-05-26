'use client';

import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
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
                  { href: '/suppliers', label: '전체 목록' },
                  { href: '/suppliers/general', label: '협력사 일반정보' },
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
              <NavLink href="/materials" iconName="flask" label="물질 관리" subtitle="조성·인증·규제" />
              <NavLink href="/risk/origin-certs" iconName="file-search" label="원산지 증명서" subtitle="FTA·IRA·UFLPA" />
              <NavLink href="/materials/regulation-results" iconName="shield-check" label="규제 검증 결과" subtitle="자재별 판정" />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-ink-500 font-bold">
              공급망 관리
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink href="/supply-chain/product-map" iconName="network" label="제품별 공급망 맵" subtitle="조회 전용 탐색" />
              <NavLink href="/supply-chain/request-map" iconName="send" label="입력 요청 맵" subtitle="자료 요청 지정" />
              <NavLink href="/due-diligence" iconName="clipboard-list" label="공급망 실사 관리" subtitle="보고서·개선조치" />
              <NavLink href="/risk/actions" iconName="kanban" label="리스크 조치 보드" subtitle="조치 상태 추적" />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-ink-500 font-bold">
              입력 데이터
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink href="/submission-status" iconName="bar-chart" label="입력 현황" subtitle="제출률·기한 초과" />
              <NavLink href="/submission-review" iconName="clipboard-check" label="제출 자료 검토" subtitle="승인·반려·재요청" />
              <NavLink href="/portal" iconName="upload" label="협력사 포털" subtitle="업로드·자가평가" />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 text-[11px] text-ink-500 font-bold">
              DPP 발행
            </div>
            <div className="space-y-0.5 mt-1">
              <NavLink href="/dpp/readiness" iconName="layers" label="DPP Readiness" subtitle="발행 조건·blocker" />
              <NavLink href="/hitl" iconName="user-check" label="HITL 검토" subtitle="회색지대 판단" />
              <NavLink href="/dpp" iconName="file-badge" label="DPP 발행 이력" subtitle="여권 관리" />
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
              <NavLink href="/audit" iconName="shield-check" label="감사 추적" subtitle="Provenance 조회" />
              <NavLink href="/audit/package" iconName="package" label="감사 패키지" subtitle="증거 묶음" />
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
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
