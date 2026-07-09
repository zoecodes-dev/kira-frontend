'use client';

// 협력사 업무공간(/partner) 공통 레이아웃 — 사이드바 + 공통 헤더 + 공유 데이터 Provider.
// app/supplier/layout.tsx(인증 가드)와 app/supplier/page.tsx 안에 있던 <SupplierSidebar>+<PageHeader>
// 래퍼를 이 파일로 옮겨, 하위 route(page.tsx)들은 화면 본문만 신경 쓰면 되도록 한다.
//
//  · /partner/onboarding 은 공개(토큰 없이 진입) — 초대 링크로만 들어오는 회원가입 경로.
//    사이드바/헤더 없이 children만 그대로 렌더링(기존 app/supplier/onboarding/page.tsx와 동일한 풀스크린 레이아웃 유지).
//  · 데모 모드(NEXT_PUBLIC_USE_API!=='true')는 토큰 없이 포털을 보여주므로 가드 미적용.
//  · 토큰이 localStorage 라 Next.js middleware(엣지)로는 못 읽음 → 클라 가드로 처리.
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { getToken } from '@/lib/api';
import SelfReportModal from '@/components/supplier/SelfReportModal';
import SupplierNotificationBell from '@/components/supplier/SupplierNotificationBell';
import PartnerSidebar from '@/components/partner/PartnerSidebar';
import NotificationToaster from '@/components/notifications/NotificationToaster';
import { PartnerWorkspaceProvider, usePartnerWorkspace } from '@/components/partner/PartnerWorkspaceContext';
import { PARTNER_DEEP_LINK_ROUTE } from '@/components/partner/partnerFormatters';
import { getSupplierName } from '@/lib/supplier-detail-data';

const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';

function PartnerHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { notifications, markNotifRead, markAllNotifsRead } = usePartnerWorkspace();

  // [작업2 / 요구사항2] 특정 페이지만 설명을 목적에 맞게 오버라이드(제목/배지는 공용 유지).
  //   헤더는 이 공용 레이아웃이 렌더하므로 각 페이지 컴포넌트가 아니라 여기서 경로별로 분기한다.
  const DESC_BY_PATH: Record<string, string> = {
    '/partner/company-info': '회사 기본정보·필요서류를 입력하고 원청에 제출합니다.',
    '/partner/settings': '계정 보안 정보와 주 담당자의 연락처 및 역할을 관리합니다.',
  };
  const description = DESC_BY_PATH[pathname ?? ''] ?? '내 회사 정보, 원청 요청 자료, 직접 연결된 공급망만 확인합니다.';

  return (
    <PageHeader
      title="협력사 업무공간"
      badge="내 회사 기준"
      description={description}
      notification={
        <SupplierNotificationBell
          notifications={notifications}
          onMarkRead={markNotifRead}
          onMarkAllRead={markAllNotifsRead}
          onNavigate={(view) => router.push(PARTNER_DEEP_LINK_ROUTE[view] ?? '/partner')}
        />
      }
    />
  );
}

function PartnerWorkspaceChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { supplierId, supplier } = usePartnerWorkspace();
  const name = getSupplierName(supplierId);
  // 자진 신고 모달 — 기획서 E-3. 현재 코드 전체에서 이 모달을 여는 트리거가 없어(항상 닫힌 상태) 동작은
  // app/supplier/page.tsx와 동일하게 유지한다. parentSupplierId=로그인 협력사 본인.
  const [selfReportOpen, setSelfReportOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#F4F7F9] text-ink-100">
      {/* 협력사 새 알림 토스트 팝업 (partner audience) */}
      <NotificationToaster audience="partner" deepLinkMap={PARTNER_DEEP_LINK_ROUTE} fallbackRoute="/partner" />
      <div className="flex min-h-screen">
        <PartnerSidebar supplierName={name?.shortNameKo ?? name?.shortNameEn ?? supplier?.name ?? supplierId} />
        <div className="min-w-0 flex-1">
          <PartnerHeader />
          {/* ✨ ai-parsing 뷰일 때는 꽉 찬 높이(h-calc), 아닐 때는 기존 패딩 적용 ✨ */}
          <div className={pathname === '/partner/ai-parsing' ? 'h-[calc(100vh-82px)]' : 'space-y-6 p-8'}>
            {children}
            {/* 푸터 — ai-parsing 전체화면 모드일 때 숨김 (작업 몰입도 확보) */}
            {pathname !== '/partner/ai-parsing' && (
              <div className="rounded-sm border border-ink-700 bg-white p-4 text-xs leading-5 text-ink-500 shadow-control">
                이 협력사 화면은 전체 공급망 구조, 다른 협력사의 상세 연락처, PO 단가 비교, 내부 HITL 판단 로그, 감사 추적 로그, 경쟁 협력사 비교 지표를 표시하지 않습니다.
              </div>
            )}
          </div>
        </div>
      </div>
      <SelfReportModal
        open={selfReportOpen}
        onClose={() => setSelfReportOpen(false)}
        parentSupplierId={supplierId}
      />
    </main>
  );
}

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const isPublic = pathname?.startsWith('/partner/onboarding');

  useEffect(() => {
    if (isPublic || !USE_API) {
      setReady(true);
      return;
    }
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [isPublic, router]);

  if (!ready) return null;
  if (isPublic) return <>{children}</>;

  return (
    <PartnerWorkspaceProvider>
      <PartnerWorkspaceChrome>{children}</PartnerWorkspaceChrome>
    </PartnerWorkspaceProvider>
  );
}
