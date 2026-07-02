import './globals.css';
import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';
import AuthGuard from '@/components/AuthGuard';

export const metadata: Metadata = {
  title: 'KIRA SupplyChainMap',
  description: '배터리 공급망 규제 검증 시스템',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <AppShell>{children}</AppShell>
        {/* 전역 인증 만료(401) 오버레이 — 어느 페이지에서든 재로그인 유도 */}
        <AuthGuard />
      </body>
    </html>
  );
}
