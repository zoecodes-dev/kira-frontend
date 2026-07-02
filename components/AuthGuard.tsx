'use client';

// 전역 인증 만료 처리 — API가 401을 받으면(lib/api의 notifyAuthExpired) 어느 페이지에서든
// 이 오버레이가 떠서 재로그인을 유도한다. 개별 페이지가 401을 따로 처리할 필요 없음.
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { AUTH_EXPIRED_EVENT } from '@/lib/api';

// 로그인/회원가입/온보딩 흐름에선 오버레이를 띄우지 않는다(로그인 자체를 방해하지 않도록).
const AUTH_FLOW_PREFIXES = ['/login', '/signup', '/onboarding'];

export default function AuthGuard() {
  const [expired, setExpired] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onExpired = () => {
      if (AUTH_FLOW_PREFIXES.some(p => pathname?.startsWith(p))) return;
      setExpired(true);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [pathname]);

  // 로그인 페이지로 이동하면 오버레이는 닫는다.
  useEffect(() => {
    if (AUTH_FLOW_PREFIXES.some(p => pathname?.startsWith(p))) setExpired(false);
  }, [pathname]);

  if (!expired) return null;

  const goLogin = () => {
    const returnTo =
      typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
    setExpired(false);
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-alert-bg text-alert-text">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-bold text-ink-100">로그인이 필요합니다</h2>
        <p className="mt-1 text-sm text-slate-500">
          인증 토큰이 없거나 만료됐습니다(401). 다시 로그인한 뒤 계속 진행하세요.
        </p>
        <button
          type="button"
          onClick={goLogin}
          className="mt-5 h-10 w-full rounded-md bg-brand text-sm font-bold text-white hover:bg-brand-hover"
        >
          로그인하러 가기
        </button>
      </div>
    </div>
  );
}
