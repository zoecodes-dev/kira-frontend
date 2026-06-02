'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import {
  getSupplierName, originCertificates, type OriginCertificate,
} from '@/lib/supplier-detail-data';
import {
  AlertCircle, ChevronDown, ChevronRight, FileCheck, Search, SlidersHorizontal, X,
} from 'lucide-react';
import clsx from 'clsx';

// ─── 상태 메타 ─────────────────────────────────────────────────
const statusMeta = {
  valid:         { label: '유효', dot: 'bg-emerald-500', badge: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  expiring_soon: { label: '만료 임박', dot: 'bg-amber-500', badge: 'border-amber-300 bg-amber-50 text-amber-800' },
  expired:       { label: '만료', dot: 'bg-red-500', badge: 'border-red-300 bg-red-50 text-red-800' },
  under_review:  { label: '검토 중', dot: 'bg-blue-500', badge: 'border-blue-300 bg-blue-50 text-blue-800' },
};
type CertificateStatus = keyof typeof statusMeta;

const certTypeMeta: Record<string, { label: string; color: string }> = {
  FTA:            { label: 'FTA 원산지',   color: 'text-blue-700' },
  IRA_ORIGIN:     { label: 'IRA 원산지',   color: 'text-emerald-700' },
  UFLPA_REBUTTAL: { label: 'UFLPA 반증',   color: 'text-orange-700' },
  CONFLICT_FREE:  { label: '분쟁광물 인증', color: 'text-violet-700' },
  CUSTOMS_ORIGIN: { label: '세관 원산지',   color: 'text-ink-300' },
};

const countryFlag: Record<string, string> = {
  KR: '🇰🇷', CN: '🇨🇳', JP: '🇯🇵', AU: '🇦🇺', CL: '🇨🇱',
  PH: '🇵🇭', CD: '🇨🇩', ID: '🇮🇩',
};

const countryName: Record<string, string> = {
  KR: '한국', CN: '중국', JP: '일본', AU: '호주', CL: '칠레',
  PH: '필리핀', CD: '콩고', ID: '인도네시아',
};

function daysUntilExpiry(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - new Date('2026-05-19').getTime()) / 86400000);
}

// ─── KPI 타일 ─────────────────────────────────────────────────
function KpiTile({ label, value, status, active, onClick }: {
  label: string; value: number; status: CertificateStatus; active: boolean; onClick: () => void;
}) {
  const style = {
    valid:         { card: 'border-emerald-300 bg-emerald-50/45 hover:bg-emerald-50', value: 'text-emerald-700' },
    expiring_soon: { card: 'border-amber-300 bg-amber-50/45 hover:bg-amber-50', value: 'text-amber-700' },
    expired:       { card: 'border-red-300 bg-red-50/45 hover:bg-red-50', value: 'text-red-700' },
    under_review:  { card: 'border-blue-300 bg-blue-50/45 hover:bg-blue-50', value: 'text-blue-700' },
  }[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full rounded-xs border px-4 py-3 text-left shadow-control transition-colors',
        style.card,
        active && 'ring-2 ring-offset-1',
        active && status === 'valid' && 'ring-emerald-400',
        active && status === 'expiring_soon' && 'ring-amber-400',
        active && status === 'expired' && 'ring-red-400',
        active && status === 'under_review' && 'ring-blue-400',
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-ink-100">{label}</span>
        <span className="flex items-baseline gap-1.5">
          <span className={clsx('text-xl font-bold num-mono', style.value)}>{value}</span>
          <span className="text-sm font-semibold text-ink-500">건</span>
        </span>
      </div>
    </button>
  );
}

// ─── 상태 정렬 순서 ────────────────────────────────────────────
const statusOrder: Record<CertificateStatus, number> = {
  expired: 0,
  expiring_soon: 1,
  valid: 2,
  under_review: 3,
};

// ─── 툴바 Select ──────────────────────────────────────────────
function Select({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2 shadow-control">
      <span className="text-[11px] font-semibold text-ink-500">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="num-mono bg-transparent text-[11px] font-semibold text-ink-200 outline-none"
      >
        {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </label>
  );
}

// ─── 테이블 헤더 필터 ─────────────────────────────────────────
function HeaderFilter({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  const selected = options.find(o => o.v === value)?.label ?? '전체';
  return (
    <label className="relative inline-flex max-w-full cursor-pointer items-center gap-1.5 text-[11px] font-bold text-ink-500">
      {label && <span className="truncate">{label}</span>}
      <span className={clsx(
        'inline-flex max-w-[96px] items-center gap-1 rounded-xs px-1 py-0.5 text-[11px] font-bold',
        value === 'all' ? 'text-ink-400' : 'bg-accent-50 text-accent-800',
      )}>
        {value !== 'all' && <span className="truncate">{selected}</span>}
        <ChevronDown className="h-3 w-3 shrink-0" />
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
      >
        {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </label>
  );
}

// ─── 테이블 행 ────────────────────────────────────────────────
function CertRow({ cert }: { cert: OriginCertificate }) {
  const name = getSupplierName(cert.supplierId);
  const sm = statusMeta[cert.status];
  const ctm = certTypeMeta[cert.certType] ?? { label: cert.certType, color: 'text-ink-300' };
  const days = daysUntilExpiry(cert.expiresAt);
  const flag = countryFlag[cert.originCountry] ?? '🌐';
  const country = countryName[cert.originCountry] ?? cert.originCountry;

  const totalDays = Math.ceil(
    (new Date(cert.expiresAt).getTime() - new Date(cert.issuedAt).getTime()) / 86400000
  );
  const issuedDays = Math.ceil(
    (new Date('2026-05-19').getTime() - new Date(cert.issuedAt).getTime()) / 86400000
  );
  const progressPct = Math.min(100, Math.max(0, (issuedDays / totalDays) * 100));
  const barColor =
    cert.status === 'expired'       ? 'bg-red-500' :
    cert.status === 'expiring_soon' ? 'bg-amber-500' :
    cert.status === 'under_review'  ? 'bg-blue-500' :
    'bg-emerald-500';

  return (
    <tr className="group border-b border-ink-700 bg-white transition-colors hover:bg-ink-800">
      {/* 협력사 */}
      <td className="px-5 py-4 align-top">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-base">{flag}</span>
          <div className="min-w-0">
            <Link
              href={`/suppliers/${cert.supplierId}/origin`}
              className="block truncate text-sm font-bold text-ink-100 transition-colors group-hover:text-accent-700"
            >
              {name?.nameEn ?? cert.supplierId}
            </Link>
            {name?.nameKo && (
              <div className="mt-0.5 truncate text-xs text-ink-500">{name.nameKo}</div>
            )}
            <div className="mt-0.5 text-[11px] text-ink-500 num-mono">{cert.supplierId}</div>
          </div>
        </div>
      </td>

      {/* 증명서 번호 */}
      <td className="px-5 py-4 align-top">
        <div className="text-xs font-semibold text-ink-200 num-mono">{cert.certNumber}</div>
        <div className="mt-0.5 text-[11px] text-ink-500 truncate">{cert.issuingAuthority}</div>
      </td>

      {/* 유형 */}
      <td className="px-5 py-4 align-top">
        <span className={clsx('text-xs font-semibold', ctm.color)}>{ctm.label}</span>
        <div className="mt-0.5 text-[11px] text-ink-500">{country}</div>
      </td>

      {/* 상태 */}
      <td className="px-5 py-4 align-top">
        <div className={clsx(
          'inline-flex items-center gap-1.5 rounded-xs border px-2 py-0.5 text-xs font-bold',
          sm.badge,
        )}>
          <span className={clsx('h-1.5 w-1.5 rounded-full', sm.dot)} />
          {sm.label}
        </div>
        {(cert.status === 'expired' || cert.status === 'expiring_soon') && (
          <div className={clsx(
            'mt-1 flex items-center gap-1 text-[11px] font-semibold',
            cert.status === 'expired' ? 'text-red-700' : 'text-amber-700',
          )}>
            <AlertCircle className="h-3 w-3 shrink-0" />
            {days < 0 ? `${Math.abs(days)}일 초과` : `${days}일 남음`}
          </div>
        )}
      </td>

      {/* 만료일 + 진행 바 */}
      <td className="px-5 py-4 align-top">
        <div className="min-w-[140px]">
          <div className="flex justify-between text-[11px] text-ink-500 mb-1">
            <span>{cert.issuedAt}</span>
            <span className={days < 0 ? 'text-red-500' : days < 60 ? 'text-amber-500' : 'text-ink-400'}>
              {cert.expiresAt}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
            <div className={clsx('h-full transition-all', barColor)} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </td>

      {/* 광물 */}
      <td className="px-5 py-4 align-top">
        {cert.coveredMinerals && cert.coveredMinerals.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {cert.coveredMinerals.map(m => (
              <span key={m} className="rounded-full border border-ink-700 bg-white px-2 py-0.5 text-[11px] text-ink-400">
                {m}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-ink-600">—</span>
        )}
      </td>

      {/* 액션 */}
      <td className="px-5 py-4 align-top text-right">
        <Link
          href={`/suppliers/${cert.supplierId}/origin`}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-xs border border-ink-700 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-400 transition-colors hover:border-accent-600 hover:text-accent-700"
        >
          상세
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  );
}

// ─── 모달 ─────────────────────────────────────────────────────
function CertificateModal({ status, certs, onClose }: {
  status: CertificateStatus;
  certs: OriginCertificate[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-6" role="presentation" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${statusMeta[status].label} 인증서 목록`}
        className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-sm border border-ink-700 bg-white shadow-panel"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-ink-100">{statusMeta[status].label} 인증서</h2>
            <p className="mt-1 text-sm text-ink-500">협력사명 또는 인증서 번호를 클릭하면 세부 페이지로 이동합니다.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xs border border-ink-700 p-1.5 text-ink-500 hover:bg-ink-800 hover:text-ink-100" aria-label="팝업 닫기">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="divide-y divide-ink-700 rounded-sm border border-ink-700">
            {certs.map(cert => {
              const name = getSupplierName(cert.supplierId);
              const ctm = certTypeMeta[cert.certType] ?? { label: cert.certType, color: 'text-ink-300' };
              return (
                <div key={cert.certId} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-ink-800">
                  <div className="min-w-0">
                    <Link href={`/suppliers/${cert.supplierId}/info`} className="text-sm font-bold text-ink-100 hover:text-accent-700">
                      {countryFlag[cert.originCountry] ?? '🌐'} {name?.nameEn ?? cert.supplierId}
                    </Link>
                    <div className="mt-1 text-xs text-ink-500">{name?.nameKo} · {cert.issuingAuthority}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Link href={`/suppliers/${cert.supplierId}/origin`} className="text-xs font-semibold num-mono text-accent-700 hover:underline">
                      {cert.certNumber}
                    </Link>
                    <div className={clsx('mt-1 text-xs font-semibold', ctm.color)}>{ctm.label}</div>
                  </div>
                </div>
              );
            })}
            {certs.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-ink-500">해당 상태의 인증서가 없습니다.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────
export default function OriginCertsPage() {
  const [modalStatus, setModalStatus] = useState<CertificateStatus | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CertificateStatus>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [mineralFilter, setMineralFilter] = useState('all');

  const allCerts = originCertificates;

  const countByStatus = useMemo(() => ({
    valid:         allCerts.filter(c => c.status === 'valid').length,
    expiring_soon: allCerts.filter(c => c.status === 'expiring_soon').length,
    expired:       allCerts.filter(c => c.status === 'expired').length,
    under_review:  allCerts.filter(c => c.status === 'under_review').length,
  }), [allCerts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCerts
      .filter(cert => {
        if (statusFilter !== 'all' && cert.status !== statusFilter) return false;
        if (typeFilter !== 'all' && cert.certType !== typeFilter) return false;
        if (countryFilter !== 'all' && cert.originCountry !== countryFilter) return false;
        if (mineralFilter !== 'all' && !(cert.coveredMinerals ?? []).includes(mineralFilter)) return false;
        if (!q) return true;
        const name = getSupplierName(cert.supplierId);
        return (
          (name?.nameEn ?? '').toLowerCase().includes(q) ||
          (name?.nameKo ?? '').toLowerCase().includes(q) ||
          cert.certNumber.toLowerCase().includes(q) ||
          cert.issuingAuthority.toLowerCase().includes(q) ||
          cert.supplierId.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [allCerts, search, statusFilter, typeFilter, countryFilter, mineralFilter]);

  const certTypes = [...new Set(allCerts.map(cert => cert.certType))];
  const certCountries = [...new Set(allCerts.map(cert => cert.originCountry))];
  const certMinerals = [...new Set(allCerts.flatMap(cert => cert.coveredMinerals ?? []))];
  const modalCerts = modalStatus ? allCerts.filter(cert => cert.status === modalStatus) : [];

  return (
    <>
      <PageHeader
        title="원산지 증명서 만료 관리"
        description="FTA · IRA · UFLPA 반증 · 분쟁광물 인증서 만료일 통합 추적"
        badge="리스크"
      />

      <div className="space-y-6 p-8">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTile label="유효" value={countByStatus.valid} status="valid" active={statusFilter === 'valid'} onClick={() => setStatusFilter(s => s === 'valid' ? 'all' : 'valid')} />
          <KpiTile label="만료 임박" value={countByStatus.expiring_soon} status="expiring_soon" active={statusFilter === 'expiring_soon'} onClick={() => setStatusFilter(s => s === 'expiring_soon' ? 'all' : 'expiring_soon')} />
          <KpiTile label="만료" value={countByStatus.expired} status="expired" active={statusFilter === 'expired'} onClick={() => setStatusFilter(s => s === 'expired' ? 'all' : 'expired')} />
          <KpiTile label="검토 중" value={countByStatus.under_review} status="under_review" active={statusFilter === 'under_review'} onClick={() => setStatusFilter(s => s === 'under_review' ? 'all' : 'under_review')} />
        </div>

        {/* 테이블 */}
        <section className="rounded-sm border border-ink-700 bg-white shadow-control">
          {/* 검색·필터 툴바 */}
          <div className="border-b border-ink-700 bg-ink-800 px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[280px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  type="text"
                  placeholder="협력사명 · 증명서 번호 · 발급기관 검색"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xs border border-ink-700 bg-white py-2.5 pl-9 pr-4 text-sm text-ink-100 placeholder-ink-500 shadow-control outline-none transition-colors focus:border-accent-600 focus:ring-2 focus:ring-accent-500/20"
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                <SlidersHorizontal className="h-4 w-4" />
                필터
              </div>
              <Select
                label="상태"
                value={statusFilter}
                onChange={v => setStatusFilter(v as 'all' | CertificateStatus)}
                options={[
                  { v: 'all', label: '전체' },
                  { v: 'expired', label: '만료' },
                  { v: 'expiring_soon', label: '만료 임박' },
                  { v: 'valid', label: '유효' },
                  { v: 'under_review', label: '검토 중' },
                ]}
              />
              <Select
                label="유형"
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { v: 'all', label: '전체' },
                  ...certTypes.map(t => ({ v: t, label: certTypeMeta[t]?.label ?? t })),
                ]}
              />
              <Select
                label="원산지"
                value={countryFilter}
                onChange={setCountryFilter}
                options={[
                  { v: 'all', label: '전체' },
                  ...certCountries.map(c => ({ v: c, label: `${countryFlag[c] ?? ''} ${countryName[c] ?? c}` })),
                ]}
              />
            </div>
          </div>

          {/* 결과 수 */}
          <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3">
            <div className="flex items-center gap-2 text-xs text-ink-500">
              <FileCheck className="h-4 w-4 text-ink-400" />
              <span>
                전체 인증서 <strong className="num-mono text-ink-100">{filtered.length}</strong> / {allCerts.length}건 표시
              </span>
              {statusFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="ml-1 rounded-xs border border-ink-700 bg-white px-2 py-1 text-[11px] font-semibold text-ink-400 hover:border-accent-600 hover:text-accent-700"
                >
                  전체 보기
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-ink-500">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />만료</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />만료 임박</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />검토 중</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />유효</span>
            </div>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[72px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-ink-700 bg-white">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">
                    <HeaderFilter
                      label="협력사"
                      value={statusFilter}
                      onChange={v => setStatusFilter(v as 'all' | CertificateStatus)}
                      options={[
                        { v: 'all', label: '전체' },
                        { v: 'valid', label: '유효' },
                        { v: 'expiring_soon', label: '만료 임박' },
                        { v: 'expired', label: '만료' },
                        { v: 'under_review', label: '검토 중' },
                      ]}
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">증명서 번호</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">
                    <HeaderFilter
                      label="유형"
                      value={typeFilter}
                      onChange={setTypeFilter}
                      options={[
                        { v: 'all', label: '전체' },
                        ...certTypes.map(t => ({ v: t, label: certTypeMeta[t]?.label ?? t })),
                      ]}
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">
                    <HeaderFilter
                      label="상태"
                      value={statusFilter}
                      onChange={v => setStatusFilter(v as 'all' | CertificateStatus)}
                      options={[
                        { v: 'all', label: '전체' },
                        { v: 'expired', label: '만료' },
                        { v: 'expiring_soon', label: '만료 임박' },
                        { v: 'valid', label: '유효' },
                        { v: 'under_review', label: '검토 중' },
                      ]}
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">발급 / 만료일</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-normal text-ink-500">
                    <HeaderFilter
                      label="광물"
                      value={mineralFilter}
                      onChange={setMineralFilter}
                      options={[
                        { v: 'all', label: '전체' },
                        ...certMinerals.map(m => ({ v: m, label: m })),
                      ]}
                    />
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(cert => <CertRow key={cert.certId} cert={cert} />)}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-sm text-ink-500">
                      표시할 인증서가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalStatus && (
        <CertificateModal
          status={modalStatus}
          certs={modalCerts}
          onClose={() => setModalStatus(null)}
        />
      )}
    </>
  );
}
