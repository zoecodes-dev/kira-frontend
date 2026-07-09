'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Factory,
  LockKeyhole,
  Mail,
  Network,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { login, setToken, setRefreshToken, setSessionUser, ApiError, isSupplierRole } from '@/lib/api';

// API 모드 여부 — true면 실제 POST /auth/login, 아니면 데모 권한분기 흐름 유지
const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';

type LoginRole = 'prime' | 'supplier';

const demoAccounts: Record<LoginRole, { label: string; target: string }> = {
  prime: {
    label: '원청사 계정',
    target: '/dashboard',
  },
  supplier: {
    label: '협력사 계정',
    target: '/partner',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // 특정 계정 이메일로 역할을 추측하지 않는다 — 좌측 토글로 직접 선택해야 여러 협력사 계정이
  // 각자 자기 이메일로 로그인할 수 있다(과거엔 이메일에 'hanyang' 등이 포함돼야 협력사로 인식했음).
  const [role, setRole] = useState<LoginRole>('prime');
  const account = demoAccounts[role];
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // 데모 모드(API 미연결): 기존 권한 분기 흐름만 확인
    if (!USE_API) {
      router.push(account.target);
      return;
    }

    // 실제 인증: POST /auth/login → 토큰 저장 → 응답 role로 분기
    setSubmitting(true);
    try {
      const res = await login(email, password);
      setToken(res.token);
      if (res.refreshToken) setRefreshToken(res.refreshToken);
      setSessionUser({ displayName: res.displayName, role: res.role, userId: res.userId });
      // 백엔드 role 은 supplier_ceo/supplier_esg 등 세분화 값 → 접두사로 협력사 판별.
      // 온보딩 미완료(onboardingComplete===false)면 회원가입 경로로(전방호환; Phase1은 항상 완료).
      if (isSupplierRole(res.role)) {
        router.push(res.onboardingComplete === false ? '/partner/onboarding' : '/partner');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
      );
      setSubmitting(false);
    }
  };

  // 회원가입 진입 — 현재 URL의 쿼리스트링(?supplierId=... 등)을 그대로 온보딩으로 전달.
  // useSearchParams 훅 대신 클릭 시점 window.location 사용 → Suspense/빌드 이슈 회피.
  const goSignup = () => {
    const qs = typeof window !== 'undefined' ? window.location.search : '';
    router.push(`/partner/onboarding${qs}`);
  };

  return (
    <main className="min-h-screen bg-[#F4F7F9] text-ink-100">
      <div className="grid min-h-screen grid-cols-[1.05fr_0.95fr]">
        <section className="flex min-h-screen flex-col justify-between border-r border-ink-700 bg-white px-12 py-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-accent-700 text-white shadow-control">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">KIRA Battery</div>
              <div className="text-[11px] font-semibold text-ink-500">규제 대응 관제 시스템</div>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-ink-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-400">
              Compliance Intelligence Platform
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-ink-100">
              배터리 공급망 규제 대응 통합 관제 시스템
            </h1>
            <p className="mt-4 text-sm leading-6 text-ink-500">
              UFLPA·CSDDD·EU 배터리법 등 공급망 실사 규제 대응을 위한 사내 전용 시스템입니다.
            </p>
            <div className="mt-6 flex items-start gap-3 rounded-sm border border-ink-700 bg-ink-800 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-ink-700 bg-white">
                <ShieldCheck className="h-4 w-4 text-accent-700" />
              </div>
              <p className="text-xs leading-5 text-ink-500">
                본 시스템은 인가된 사용자만 접근할 수 있습니다. 모든 접속 및 사용 내역은 보안 정책에 따라
                기록·모니터링되며, 무단 접근 시도는 관련 법령에 따라 조치될 수 있습니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] text-ink-500">
            {['UFLPA', 'CSDDD', 'EU Battery'].map(item => (
              <div key={item} className="rounded-xs border border-ink-700 bg-white px-3 py-2 font-semibold">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-10 py-10">
          <div className="w-full max-w-md">
            <div className="mb-5 rounded-sm border border-ink-700 bg-white p-3 shadow-control">
              <div className="grid grid-cols-2 gap-2">
                {(['prime', 'supplier'] as LoginRole[]).map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRole(item)}
                    className={clsx(
                      'rounded-xs border px-3 py-2 text-left transition-colors',
                      role === item
                        ? 'border-accent-600 bg-accent-50 text-accent-900'
                        : 'border-ink-700 bg-white text-ink-500 hover:border-ink-600 hover:text-ink-100'
                    )}
                  >
                    <div className="text-xs font-bold">{demoAccounts[item].label}</div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-sm border border-ink-700 bg-white p-6 shadow-panel">
              <div className="mb-6">
                <div className="text-2xl font-bold tracking-tight">로그인</div>
                <div className="mt-2 text-sm text-ink-500">
                  선택한 계정 유형에 따라 <span className="font-bold text-ink-100">{account.label}</span>으로 접속합니다.
                </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-bold text-ink-500">아이디</span>
                  <div className="mt-1.5 flex items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2.5 focus-within:border-accent-600 focus-within:ring-2 focus-within:ring-accent-500/20">
                    <Mail className="h-4 w-4 text-ink-500" />
                    <input
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-100 outline-none placeholder:text-ink-500"
                      placeholder="name@company.com"
                      autoComplete="username"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-ink-500">비밀번호</span>
                  <div className="mt-1.5 flex items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2.5 focus-within:border-accent-600 focus-within:ring-2 focus-within:ring-accent-500/20">
                    <LockKeyhole className="h-4 w-4 text-ink-500" />
                    <input
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-100 outline-none placeholder:text-ink-500"
                      placeholder="password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(value => !value)}
                      className="rounded-xs p-1 text-ink-500 hover:bg-ink-800 hover:text-ink-100"
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
              </div>

              <div className="mt-5 rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-ink-100">접속 대상</div>
                    <div className="mt-0.5 text-[11px] text-ink-500">
                      {role === 'prime' ? '원청사 전체 관제 대시보드' : '협력사 제한 포털'}
                    </div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xs border border-ink-700 bg-white">
                    {role === 'prime'
                      ? <Network className="h-4 w-4 text-accent-700" />
                      : <Factory className="h-4 w-4 text-info-text" />
                    }
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-5 flex items-start gap-2 rounded-xs border border-alert-border bg-alert-bg px-3 py-2.5 text-xs font-semibold text-alert-text">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xs bg-accent-700 px-4 py-3 text-sm font-bold text-white shadow-control transition-colors hover:bg-accent-900 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? '접속 중…' : '접속하기'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <button
              type="button"
              onClick={goSignup}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xs border border-ink-700 bg-white px-4 py-3 text-sm font-bold text-ink-100 transition-colors hover:border-accent-600 hover:text-accent-700"
            >
              회원가입 (초대받은 협력사)
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="mt-4 text-center text-[11px] text-ink-500">
              {USE_API
                ? '입력한 계정으로 실제 인증 후 권한에 맞는 화면으로 접속합니다.'
                : '데모 모드 — 인증 없이 권한 분기 흐름만 확인합니다.'}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
