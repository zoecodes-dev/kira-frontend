'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import { suppliers } from '@/lib/data';
import {
  getSupplierName, originCertificates, type OriginCertificate,
} from '@/lib/supplier-detail-data';
import {
  Package, AlertTriangle, CheckCircle2, Clock, Search,
  ChevronRight, Calendar, Building2, FileText, AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

// ─── 상태 메타 ─────────────────────────────────────────────────
const statusMeta = {
  valid:         { label: '유효',   dot: 'bg-emerald-500', badge: 'border-emerald-700/30 bg-emerald-500/8 text-emerald-500' },
  expiring_soon: { label: '만료 임박', dot: 'bg-amber-500',  badge: 'border-amber-700/30 bg-amber-500/8 text-amber-500' },
  expired:       { label: '만료',   dot: 'bg-red-500',     badge: 'border-red-700/30 bg-red-500/8 text-red-500' },
  under_review:  { label: '검토 중', dot: 'bg-blue-500',    badge: 'border-blue-700/30 bg-blue-500/8 text-blue-500' },
};

const certTypeMeta: Record<string, { label: string; color: string }> = {
  FTA:            { label: 'FTA 원산지',   color: 'text-blue-400' },
  IRA_ORIGIN:     { label: 'IRA 원산지',   color: 'text-emerald-400' },
  UFLPA_REBUTTAL: { label: 'UFLPA 반증',   color: 'text-orange-400' },
  CONFLICT_FREE:  { label: '분쟁광물 인증', color: 'text-purple-400' },
  CUSTOMS_ORIGIN: { label: '세관 원산지',   color: 'text-ink-300' },
};

const countryFlag: Record<string, string> = {
  KR: '🇰🇷', CN: '🇨🇳', JP: '🇯🇵', AU: '🇦🇺', CL: '🇨🇱',
  PH: '🇵🇭', CD: '🇨🇩', ID: '🇮🇩',
};

// ─── 만료까지 남은 일수 계산 ──────────────────────────────────
function daysUntilExpiry(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - new Date('2026-05-19').getTime()) / 86400000);
}

// ─── KPI 타일 ─────────────────────────────────────────────────
function KpiTile({ label, value, unit, icon: Icon, tone }: {
  label: string; value: number; unit: string; icon: any;
  tone: 'ok' | 'warn' | 'critical' | 'neutral';
}) {
  const toneColor = { ok: 'text-emerald-400', warn: 'text-amber-400', critical: 'text-red-400', neutral: 'text-ink-300' }[tone];
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={clsx('w-3.5 h-3.5', toneColor)} />
        <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">{label}</span>
      </div>
      <div className={clsx('text-2xl font-bold num-mono', toneColor)}>
        {value}<span className="text-sm text-ink-400 ml-1">{unit}</span>
      </div>
    </div>
  );
}

// ─── 만료 타임라인 바 ─────────────────────────────────────────
function ExpiryBar({ cert }: { cert: OriginCertificate }) {
  const days = daysUntilExpiry(cert.expiresAt);
  const issuedDays = Math.ceil(
    (new Date('2026-05-19').getTime() - new Date(cert.issuedAt).getTime()) / 86400000
  );
  const totalDays = Math.ceil(
    (new Date(cert.expiresAt).getTime() - new Date(cert.issuedAt).getTime()) / 86400000
  );
  const progressPct = Math.min(100, Math.max(0, (issuedDays / totalDays) * 100));

  const barColor =
    cert.status === 'expired'       ? 'bg-red-500' :
    cert.status === 'expiring_soon' ? 'bg-amber-500' :
    cert.status === 'under_review'  ? 'bg-blue-500' :
    'bg-emerald-500';

  return (
    <div>
      <div className="h-1 bg-ink-700 rounded-full overflow-hidden">
        <div className={clsx('h-full transition-all', barColor)} style={{ width: `${progressPct}%` }} />
      </div>
      <div className="flex justify-between mt-0.5 text-[9px] text-ink-500">
        <span>{cert.issuedAt}</span>
        <span className={days < 0 ? 'text-red-400' : days < 60 ? 'text-amber-400' : 'text-ink-500'}>
          {days < 0 ? `${Math.abs(days)}일 초과` : `${days}일 남음`}
        </span>
        <span>{cert.expiresAt}</span>
      </div>
    </div>
  );
}

// ─── 증명서 카드 ──────────────────────────────────────────────
function CertCard({ cert }: { cert: OriginCertificate }) {
  const supplier = suppliers.find(s => s.id === cert.supplierId);
  const name = getSupplierName(cert.supplierId);
  const sm = statusMeta[cert.status];
  const ctm = certTypeMeta[cert.certType] || { label: cert.certType, color: 'text-ink-300' };
  const days = daysUntilExpiry(cert.expiresAt);

  return (
    <Link href={`/suppliers/${cert.supplierId}/feoc`}>
      <div className={clsx(
        'p-4 rounded-xs border transition-colors cursor-pointer group',
        cert.status === 'expired'       ? 'border-red-700/40 bg-red-500/5 hover:bg-red-500/8' :
        cert.status === 'expiring_soon' ? 'border-amber-700/40 bg-amber-500/5 hover:bg-amber-500/8' :
        'border-ink-700/60 bg-ink-900/30 hover:bg-ink-800/30',
      )}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {/* 협력사 */}
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm">{countryFlag[cert.originCountry] || '🌐'}</span>
              <span className="text-xs font-semibold text-ink-100 truncate">{name.en}</span>
              {name.ko && <span className="text-[10px] text-ink-500">{name.ko}</span>}
            </div>
            {/* 증명서 번호 */}
            <div className="text-[10px] text-ink-500 num-mono">{cert.certNumber}</div>
            <div className="text-[10px] text-ink-500">{cert.issuingAuthority}</div>
          </div>
          <div className="shrink-0 text-right space-y-1">
            <div className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-xs border text-[10px] font-semibold', sm.badge)}>
              <div className={clsx('w-1.5 h-1.5 rounded-full', sm.dot)} />
              {sm.label}
            </div>
            <div className={clsx('text-[10px] font-medium', ctm.color)}>{ctm.label}</div>
          </div>
        </div>

        {/* 광물 태그 */}
        {cert.coveredMinerals && cert.coveredMinerals.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {cert.coveredMinerals.map(m => (
              <span key={m} className="px-1.5 py-0.5 rounded-full border border-ink-600/60 text-[9px] text-ink-400">{m}</span>
            ))}
          </div>
        )}

        {/* 만료 타임라인 */}
        <ExpiryBar cert={cert} />

        {/* 초과 경고 */}
        {cert.status === 'expired' && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-400">
            <AlertCircle className="w-3 h-3" />
            갱신 즉시 필요
          </div>
        )}
        {cert.status === 'expiring_soon' && days >= 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400">
            <Clock className="w-3 h-3" />
            {days}일 이내 갱신 권장
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────
export default function OriginCertsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'expiring_soon' | 'expired'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const allCerts = originCertificates;

  const filtered = useMemo(() => {
    let list = allCerts;
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (typeFilter !== 'all')   list = list.filter(c => c.certType === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => {
        const name = getSupplierName(c.supplierId);
        return (
          name.en.toLowerCase().includes(q) ||
          (name.ko || '').includes(q) ||
          c.certNumber.toLowerCase().includes(q) ||
          c.issuingAuthority.toLowerCase().includes(q)
        );
      });
    }
    // 만료 임박 순 정렬
    return [...list].sort((a, b) => {
      const priority = (s: string) => s === 'expired' ? 0 : s === 'expiring_soon' ? 1 : s === 'under_review' ? 2 : 3;
      return priority(a.status) - priority(b.status);
    });
  }, [allCerts, statusFilter, typeFilter, search]);

  const countByStatus = useMemo(() => ({
    valid:         allCerts.filter(c => c.status === 'valid').length,
    expiring_soon: allCerts.filter(c => c.status === 'expiring_soon').length,
    expired:       allCerts.filter(c => c.status === 'expired').length,
    under_review:  allCerts.filter(c => c.status === 'under_review').length,
  }), [allCerts]);

  const certTypes = [...new Set(allCerts.map(c => c.certType))];

  return (
    <>
      <PageHeader
        title="원산지 증명서"
        description="FTA · IRA · UFLPA 반증 · 분쟁광물 인증서 만료일 통합 추적"
        badge="리스크"
      />

      <div className="p-8 space-y-8">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTile label="유효" value={countByStatus.valid} unit="건" icon={CheckCircle2} tone="ok" />
          <KpiTile label="만료 임박" value={countByStatus.expiring_soon} unit="건" icon={Clock} tone="warn" />
          <KpiTile label="만료" value={countByStatus.expired} unit="건" icon={AlertTriangle} tone="critical" />
          <KpiTile label="검토 중" value={countByStatus.under_review} unit="건" icon={FileText} tone="neutral" />
        </div>

        {/* 필터 & 검색 */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 검색 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-500" />
            <input
              type="text"
              placeholder="협력사명 · 증명서 번호 · 발급기관 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-xs bg-ink-900 border border-ink-700/60 rounded-xs text-ink-100 placeholder-ink-500 focus:outline-none focus:border-accent-500"
            />
          </div>

          {/* 상태 필터 */}
          <div className="flex rounded-xs border border-ink-700/60 overflow-hidden">
            {(['all', 'valid', 'expiring_soon', 'expired'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                  statusFilter === s ? 'bg-ink-700 text-ink-100' : 'text-ink-500 hover:text-ink-300',
                )}
              >
                {s === 'all' ? '전체' : statusMeta[s]?.label}
              </button>
            ))}
          </div>

          {/* 유형 필터 */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-[10px] bg-ink-800 border border-ink-700/60 rounded-xs px-2 py-2 text-ink-300"
          >
            <option value="all">유형 전체</option>
            {certTypes.map(t => (
              <option key={t} value={t}>{certTypeMeta[t]?.label || t}</option>
            ))}
          </select>
        </div>

        {/* 결과 카운트 */}
        <div className="text-[11px] text-ink-400">
          {filtered.length}건 표시 중 (전체 {allCerts.length}건)
          {statusFilter !== 'all' && (
            <span className="ml-2 text-amber-400">
              · {statusFilter === 'expired' ? '⚠ 만료된 증명서는 즉시 갱신이 필요합니다' : statusFilter === 'expiring_soon' ? '만료 임박 우선 표시' : ''}
            </span>
          )}
        </div>

        {/* 증명서 카드 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(cert => (
            <CertCard key={cert.certId} cert={cert} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-12 text-ink-500 text-sm border border-dashed border-ink-700/40 rounded-xs">
              검색 결과가 없습니다
            </div>
          )}
        </div>
      </div>
    </>
  );
}
