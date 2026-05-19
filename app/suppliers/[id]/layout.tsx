'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { suppliers } from '@/lib/data';
import { getSupplierName, getRiskProfile } from '@/lib/supplier-detail-data';
import {
  ChevronLeft, Building2, AlertTriangle,
  Info, ShieldAlert, FileCheck, GraduationCap, Factory,
} from 'lucide-react';
import clsx from 'clsx';

const subTabs = [
  { href: 'info',     label: '일반정보',    icon: Info,           subtitle: '기업·담당자·공장' },
  { href: 'esg',      label: '인권·노동',   icon: ShieldAlert,    subtitle: '실사·인권·산재' },
  { href: 'feoc',     label: 'FEOC·원산지', icon: FileCheck,      subtitle: '적격 판정·증명서' },
  { href: 'training', label: '교육 관리',   icon: GraduationCap,  subtitle: '이수 현황·자료' },
];

const riskColors: Record<string, string> = {
  low:      'border-emerald-700/30 bg-emerald-500/8 text-emerald-600',
  medium:   'border-amber-700/30 bg-amber-500/8 text-amber-600',
  high:     'border-red-700/30 bg-red-500/8 text-red-600',
  critical: 'border-red-700/40 bg-red-500/12 text-red-700 font-bold',
};

export default function SupplierDetailLayout({ children }: { children: React.ReactNode }) {
  const params  = useParams();
  const pathname = usePathname();
  const supplierId = params.id as string;

  const supplier = suppliers.find(s => s.id === supplierId);
  const name     = supplier ? getSupplierName(supplierId) : null;
  const risk     = supplier ? getRiskProfile(supplierId) : null;

  if (!supplier) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-ink-500">
        협력사를 찾을 수 없습니다: {supplierId}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── 브레드크럼 + 협력사 헤더 ── */}
      <div className="border-b border-ink-700 bg-ink-900/30 px-8 py-5 shrink-0">
        {/* 브레드크럼 */}
        <div className="flex items-center gap-2 text-[11px] text-ink-500 mb-3">
          <Link href="/suppliers" className="flex items-center gap-1 hover:text-ink-300 transition-colors">
            <ChevronLeft className="w-3 h-3" />
            협력사 목록
          </Link>
          <span>/</span>
          <span className="text-ink-300">{name?.shortNameEn ?? supplier.name}</span>
        </div>

        {/* 협력사 정보 헤더 */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-sm bg-ink-700 border border-ink-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-ink-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h1 className="text-base font-semibold text-ink-100">
                  {name?.nameEn ?? supplier.name}
                </h1>
                {name?.nameKo && (
                  <span className="text-sm text-ink-400">/ {name.nameKo}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] flex-wrap">
                <span className="num-mono text-ink-500">{supplier.id}</span>
                <span className="text-ink-600">·</span>
                <span className="text-ink-400">{supplier.role}</span>
                <span className="text-ink-600">·</span>
                <span className="text-ink-400">{supplier.country} {supplier.region}</span>
              </div>
            </div>
          </div>

          {/* 우측 배지들 */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <span className="text-[10px] num-mono font-bold text-accent-500 bg-accent-500/10 border border-accent-700/30 px-2 py-1 rounded-xs">
              T{supplier.tier}
            </span>
            {risk && (
              <span className={clsx('text-[10px] font-medium px-2 py-1 rounded-xs border', riskColors[risk.riskLevel])}>
                {risk.riskLevel === 'low' ? '저위험' : risk.riskLevel === 'medium' ? '중위험' : risk.riskLevel === 'high' ? '고위험' : '최고위험'}
              </span>
            )}
            {risk?.isHighRiskFlag && (
              <span className="flex items-center gap-1 text-[10px] text-red-500 border border-red-700/30 bg-red-500/8 px-2 py-1 rounded-xs">
                <AlertTriangle className="w-3 h-3" />
                고위험 플래그
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 하위 탭 네비게이션 ── */}
      <div className="border-b border-ink-700 bg-ink-900/20 px-8 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {subTabs.map(tab => {
            const href     = `/suppliers/${supplierId}/${tab.href}`;
            const isActive = pathname === href || pathname.startsWith(href + '/');
            const Icon     = tab.icon;
            return (
              <Link
                key={tab.href}
                href={href}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-[12px] font-medium',
                  isActive
                    ? 'border-accent-500 text-accent-500'
                    : 'border-transparent text-ink-400 hover:text-ink-200 hover:border-ink-600',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 콘텐츠 ── */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
