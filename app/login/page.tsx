'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Factory,
  LockKeyhole,
  Mail,
  Network,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { login, setToken, ApiError, isSupplierRole } from '@/lib/api';

// API 모드 여부 — true면 실제 POST /auth/login, 아니면 데모 권한분기 흐름 유지
const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';

type LoginRole = 'oem' | 'supplier';

const demoAccounts: Record<LoginRole, { email: string; password: string; label: string; target: string }> = {
  oem: {
    email: 'oem@kira.demo',
    password: 'demo1234',
    label: '원청사 계정',
    target: '/dashboard',
  },
  supplier: {
    email: 'supplier@hanyang-cell.com',
    password: 'demo1234',
    label: '협력사 계정',
    target: '/supplier',
  },
};

function inferRole(email: string): LoginRole {
  const normalized = email.toLowerCase();
  if (normalized.includes('supplier') || normalized.includes('vendor') || normalized.includes('hanyang')) {
    return 'supplier';
  }
  return 'oem';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(demoAccounts.oem.email);
  const [password, setPassword] = useState(demoAccounts.oem.password);
  const [showPassword, setShowPassword] = useState(false);
  const role = useMemo(() => inferRole(email), [email]);
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
      // 백엔드 role 은 supplier_ceo/supplier_esg 등 세분화 값 → 접두사로 협력사 판별.
      router.push(isSupplierRole(res.role) ? '/supplier' : '/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
      );
      setSubmitting(false);
    }
  };

  const useDemo = (nextRole: LoginRole) => {
    setEmail(demoAccounts[nextRole].email);
    setPassword(demoAccounts[nextRole].password);
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
            <div className="mb-5 inline-flex items-center gap-2 rounded-xs border border-accent-100 bg-accent-50 px-2.5 py-1 text-[11px] font-bold text-accent-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              권한 기반 자동 접속
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-ink-100">
              하나의 로그인으로 원청사와 협력사 화면을 자동 분기합니다
            </h1>
            <p className="mt-4 text-sm leading-6 text-ink-500">
              원청사는 전체 관제 화면으로, 협력사는 자기 회사와 직접 연결된 공급망 관계 및 제출 요청 화면으로 이동합니다.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-sm border border-ink-700 bg-ink-800 p-4">
                <Building2 className="h-5 w-5 text-accent-700" strokeWidth={1.8} />
                <div className="mt-3 text-sm font-bold">원청사</div>
                <div className="mt-1 text-xs leading-5 text-ink-500">전체 협력사, 리스크, 규제 대응, 감사 추적을 유지합니다.</div>
              </div>
              <div className="rounded-sm border border-ink-700 bg-ink-800 p-4">
                <Factory className="h-5 w-5 text-info-text" strokeWidth={1.8} />
                <div className="mt-3 text-sm font-bold">협력사</div>
                <div className="mt-1 text-xs leading-5 text-ink-500">본인 기준 parent/child와 제출 상태만 보여줍니다.</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] text-ink-500">
            {['UFLPA', 'IRA/FEOC', 'EU Battery'].map(item => (
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
                {(['oem', 'supplier'] as LoginRole[]).map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => useDemo(item)}
                    className={clsx(
                      'rounded-xs border px-3 py-2 text-left transition-colors',
                      role === item
                        ? 'border-accent-600 bg-accent-50 text-accent-900'
                        : 'border-ink-700 bg-white text-ink-500 hover:border-ink-600 hover:text-ink-100'
                    )}
                  >
                    <div className="text-xs font-bold">{demoAccounts[item].label}</div>
                    <div className="mt-0.5 truncate text-[10px] num-mono">{demoAccounts[item].email}</div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-sm border border-ink-700 bg-white p-6 shadow-panel">
              <div className="mb-6">
                <div className="text-2xl font-bold tracking-tight">로그인</div>
                <div className="mt-2 text-sm text-ink-500">
                  입력한 계정 권한에 따라 <span className="font-bold text-ink-100">{account.label}</span>으로 접속합니다.
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
                      {role === 'oem' ? '원청사 전체 관제 대시보드' : '협력사 제한 포털'}
                    </div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xs border border-ink-700 bg-white">
                    {role === 'oem'
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
