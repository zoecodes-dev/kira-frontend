'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  FileCheck,
  GitBranch,
  GraduationCap,
  Info,
  Loader2,
  Package,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  ApiError,
  getSupplier,
  getSupplierReliability,
  type SupplierBrief,
  type SupplierReliabilityResponse,
  type SupplierType,
} from '@/lib/api';

const supplierTypeLabel: Record<SupplierType, string> = {
  manufacturer: '제조사',
  recycler: '재활용',
  trader: '트레이더',
  miner: '광산',
};

const subTabs = [
  { href: 'info', label: '협력사 요약', icon: Info, mode: 'summary' },
  { href: 'info?tab=general', label: '일반 정보', icon: Info, mode: 'general' },
  { href: 'esg', label: '인권·노동', icon: ShieldAlert },
  { href: 'feoc', label: 'FEOC·원산지', icon: FileCheck },
  { href: 'training', label: '교육 관리', icon: GraduationCap },
  { href: 'origin', label: '원산지·추적', icon: Package },
  { href: 'timeline', label: '제출 타임라인', icon: GitBranch },
  { href: 'ai-verify', label: '규제 이행 현황', icon: ShieldCheck },
];

const riskColors: Record<string, string> = {
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  high: 'border-red-200 bg-red-50 text-red-700',
  critical: 'border-red-300 bg-red-50 text-red-800 font-bold',
};

const riskLabels: Record<string, string> = {
  low: '저위험',
  medium: '중위험',
  high: '고위험',
  critical: '최고위험',
};

export default function SupplierDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<SupplierBrief | null>(null);
  const [reliability, setReliability] = useState<SupplierReliabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const infoMode = searchParams.get('tab') === 'general' ? 'general' : 'summary';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const brief = await getSupplier(supplierId);
        if (cancelled) return;
        setSupplier(brief);
        try {
          const rel = await getSupplierReliability(supplierId);
          if (!cancelled) setReliability(rel);
        } catch {
          if (!cancelled) setReliability(null);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) setNotFound(true);
          setSupplier(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supplierId]);

  // 헤더용 위험도: reliability 우선, 없으면 brief
  const riskLevel = reliability?.riskLevel ?? supplier?.riskLevel ?? null;
  const isHighRiskFlag = reliability?.isHighRiskFlag ?? false;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-xs text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        협력사 정보를 불러오는 중…
      </div>
    );
  }

  if (notFound || !supplier) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-ink-500">
        협력사를 찾을 수 없습니다: {supplierId}
      </div>
    );
  }

  return (
    <div className="supplier-detail-scope flex min-h-screen flex-col bg-ink-800">
      <div className="shrink-0 border-b border-ink-700 bg-white px-8 py-5">
        <div className="mb-3 flex items-center gap-2 text-[11px] text-ink-500">
          <Link href="/suppliers" className="flex items-center gap-1 transition-colors hover:text-ink-200">
            <ChevronLeft className="h-3 w-3" />
            협력사 목록
          </Link>
          <span>/</span>
          <span className="text-ink-300">{supplier.companyName}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-ink-700 bg-ink-800">
              <Building2 className="h-5 w-5 text-ink-400" />
            </div>
            <div>
              <div className="mb-0.5 flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold text-ink-100">
                  {supplier.companyName}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="num-mono text-ink-500">{supplier.supplierId}</span>
                <span className="text-ink-600">·</span>
                <span className="text-ink-400">{supplierTypeLabel[supplier.supplierType] ?? supplier.supplierType}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {riskLevel && (
              <span className={clsx('rounded-xs border px-2 py-1 text-[10px] font-medium', riskColors[riskLevel])}>
                {riskLabels[riskLevel] ?? riskLevel}
              </span>
            )}
            {isHighRiskFlag && (
              <span className="flex items-center gap-1 rounded-xs border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700">
                <AlertTriangle className="h-3 w-3" />
                고위험 플래그
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-b border-ink-700 bg-white px-8">
        <div className="flex items-center gap-1 overflow-x-auto">
          {subTabs.map(tab => {
            const href = `/suppliers/${supplierId}/${tab.href}`;
            const isInfoTab = pathname === `/suppliers/${supplierId}/info` && tab.mode === infoMode;
            const isActive = tab.mode ? isInfoTab : pathname === href || pathname.startsWith(href + '/');
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={href}
                className={clsx(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-[12px] font-medium transition-colors',
                  isActive
                    ? 'border-accent-500 text-accent-700'
                    : 'border-transparent text-ink-400 hover:border-ink-600 hover:text-ink-200',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
