'use client';

// 협력사 포털 진입 가드 — 토큰 없으면 /login 으로. (회원가입 게이팅: 결정 #9)
//  · /supplier/onboarding 은 공개(토큰 없이 진입) — 초대 링크로만 들어오는 회원가입 경로.
//  · 데모 모드(NEXT_PUBLIC_USE_API!=='true')는 토큰 없이 포털을 보여주므로 가드 미적용.
//  · 토큰이 localStorage 라 Next.js middleware(엣지)로는 못 읽음 → 클라 가드로 처리.
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';

const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const isPublic = pathname?.startsWith('/supplier/onboarding');

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
  return <>{children}</>;
}
