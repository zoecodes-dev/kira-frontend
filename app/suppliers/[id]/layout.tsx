'use client';

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
  Package,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { suppliers } from '@/lib/data';
import { getRiskProfile, getSupplierName } from '@/lib/supplier-detail-data';

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

  const supplier = suppliers.find(s => s.id === supplierId);
  const name = supplier ? getSupplierName(supplierId) : null;
  const risk = supplier ? getRiskProfile(supplierId) : null;
  const infoMode = searchParams.get('tab') === 'general' ? 'general' : 'summary';

  if (!supplier) {
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
          <span className="text-ink-300">{name?.shortNameEn ?? supplier.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-ink-700 bg-ink-800">
              <Building2 className="h-5 w-5 text-ink-400" />
            </div>
            <div>
              <div className="mb-0.5 flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold text-ink-100">
                  {name?.nameEn ?? supplier.name}
                </h1>
                {name?.nameKo && <span className="text-sm text-ink-400">/ {name.nameKo}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="num-mono text-ink-500">{supplier.id}</span>
                <span className="text-ink-600">·</span>
                <span className="text-ink-400">{supplier.role}</span>
                <span className="text-ink-600">·</span>
                <span className="text-ink-400">{supplier.country} {supplier.region}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <span className="num-mono rounded-xs border border-accent-100 bg-accent-50 px-2 py-1 text-[10px] font-bold text-accent-700">
              T{supplier.tier}
            </span>
            {risk && (
              <span className={clsx('rounded-xs border px-2 py-1 text-[10px] font-medium', riskColors[risk.riskLevel])}>
                {riskLabels[risk.riskLevel] ?? risk.riskLevel}
              </span>
            )}
            {risk?.isHighRiskFlag && (
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
