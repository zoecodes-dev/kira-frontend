import './globals.css';
import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import NavLink from '@/components/NavLink';

export const metadata: Metadata = {
  title: 'Battery DPP — 규제 대응 관제 시스템',
  description: '배터리 디지털 제품 여권 발행 및 공급망 규제 검증 시스템',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <div className="flex min-h-screen">

          {/* ── 사이드바 ── */}
          <aside className="w-64 shrink-0 border-r border-ink-700 bg-ink-900/80 backdrop-blur flex flex-col">
            {/* 로고 */}
            <div className="p-6 border-b border-ink-700 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-accent-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-ink-100 tracking-tight">Battery DPP</div>
                  <div className="text-[10px] text-ink-400 uppercase tracking-wider">규제 대응 관제</div>
                </div>
              </div>
            </div>

            {/* 내비게이션 */}
            <nav className="p-3 space-y-4 flex-1 overflow-y-auto">

              {/* 관제 · 모니터링 */}
              <div>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
                  관제 · 모니터링
                </div>
                <div className="space-y-0.5 mt-1">
                  <NavLink href="/"             iconName="activity"    label="대시보드"     subtitle="전체 현황" />
                  <NavLink href="/queue"         iconName="list-checks" label="검증 대기열" subtitle="LangGraph 진행 상황" />
                </div>
              </div>

              {/* 공급망 */}
              <div>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
                  공급망
                </div>
                <div className="space-y-0.5 mt-1">
                  <NavLink
                    href="/supply-chain/product-map"
                    iconName="network"
                    label="제품별 공급망 맵"
                    subtitle="제품 → 협력사 추적"
                  />
                  <NavLink
                    href="/supply-chain/request-map"
                    iconName="send"
                    label="입력 요청 맵"
                    subtitle="데이터 제출 현황"
                  />
                </div>
              </div>

              {/* 협력사 관리 */}
              <div>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
                  협력사 관리
                </div>
                <div className="space-y-0.5 mt-1">
                  <NavLink
                    href="/suppliers"
                    iconName="building2"
                    label="협력사 목록"
                    subtitle="일반정보 · 담당자"
                    subItems={[
                      { href: '/suppliers',         label: '전체 목록' },
                      { href: '/risk/high-risk',    label: '고위험 협력사' },
                      { href: '/risk/origin-certs', label: '원산지 증명서' },
                    ]}
                  />
                  <NavLink
                    href="/submission-status"
                    iconName="bar-chart"
                    label="입력 현황"
                    subtitle="원청사 확인 뷰"
                  />
                </div>
              </div>

              {/* 규제 · 리스크 */}
              <div>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
                  규제 · 리스크
                </div>
                <div className="space-y-0.5 mt-1">
                  <NavLink
                    href="/risk/high-risk"
                    iconName="alert-triangle"
                    label="고위험 협력사"
                    subtitle="위험도 매트릭스"
                  />
                  <NavLink
                    href="/risk/origin-certs"
                    iconName="package"
                    label="원산지 증명서"
                    subtitle="만료일 추적"
                  />
                </div>
              </div>

              {/* 의사결정 · 발행 */}
              <div>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
                  의사결정 · 발행
                </div>
                <div className="space-y-0.5 mt-1">
                  <NavLink href="/hitl" iconName="user-check" label="HITL 검토"        subtitle="승인 / 반려" />
                  <NavLink href="/dpp"  iconName="file-badge" label="DPP 발행 이력"    subtitle="여권 관리" />
                </div>
              </div>

              {/* 감사 · 외부 */}
              <div>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
                  감사 · 외부
                </div>
                <div className="space-y-0.5 mt-1">
                  <NavLink href="/audit"  iconName="shield-check" label="감사 추적"    subtitle="Provenance 조회" />
                  <NavLink href="/portal" iconName="upload"       label="협력사 포털" subtitle="외부 사용자 화면" />
                </div>
              </div>

            </nav>

            {/* 푸터 */}
            <div className="p-4 border-t border-ink-700 bg-ink-900/80 shrink-0">
              <div className="text-[10px] text-ink-400 uppercase tracking-wider mb-1">시스템 상태</div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-signal-ok pulse-soft" />
                <div className="text-xs text-ink-200">정상 운영 중</div>
              </div>
              <div className="text-[10px] text-ink-400 mt-2 num-mono">v0.5.0 · 2026.05.19</div>
            </div>
          </aside>

          {/* 메인 콘텐츠 */}
          <main className="flex-1 overflow-x-auto min-w-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
