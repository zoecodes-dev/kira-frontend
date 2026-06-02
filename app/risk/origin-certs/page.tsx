'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import {
  getSupplierName, originCertificates, type OriginCertificate,
} from '@/lib/supplier-detail-data';
import {
  AlertCircle, Search, X,
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

// ─── 만료까지 남은 일수 계산 ──────────────────────────────────
function daysUntilExpiry(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - new Date('2026-05-19').getTime()) / 86400000);
}

// ─── KPI 타일 ─────────────────────────────────────────────────
function KpiTile({ label, value, status, onClick }: {
  label: string; value: number; status: CertificateStatus; onClick: () => void;
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
      className={clsx('w-full rounded-xs border px-4 py-3 text-left shadow-control transition-colors', style.card)}
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
      <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
        <div className={clsx('h-full transition-all', barColor)} style={{ width: `${progressPct}%` }} />
      </div>
      <div className="flex justify-between mt-2 text-[13px] text-ink-500">
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
  const name = getSupplierName(cert.supplierId);
  const sm = statusMeta[cert.status];
  const ctm = certTypeMeta[cert.certType] || { label: cert.certType, color: 'text-ink-300' };
  const days = daysUntilExpiry(cert.expiresAt);

  return (
    <Link href={`/suppliers/${cert.supplierId}/origin`} className="block h-full">
      <div className={clsx(
        'flex h-full flex-col p-5 rounded-sm border shadow-control transition-all cursor-pointer group hover:shadow-panel',
        cert.status === 'expired'       ? 'border-red-300 bg-red-50/55 hover:border-red-400' :
        cert.status === 'expiring_soon' ? 'border-amber-300 bg-amber-50/55 hover:border-amber-400' :
        'border-ink-700 bg-white hover:border-ink-600',
      )}>
        <div className="flex items-start justify-between gap-5 mb-4">
          <div className="flex-1 min-w-0">
            {/* 협력사 */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{countryFlag[cert.originCountry] || '🌐'}</span>
              <span className="text-base font-bold text-ink-100 truncate">{name?.nameEn ?? ''}</span>
              {name?.nameKo && <span className="text-sm text-ink-500 truncate">{name.nameKo}</span>}
            </div>
            {/* 증명서 번호 */}
            <div className="text-sm text-ink-400 num-mono">{cert.certNumber}</div>
            <div className="mt-1 text-sm text-ink-500">{cert.issuingAuthority}</div>
          </div>
          <div className="shrink-0 text-right space-y-1.5">
            <div className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs border text-sm font-bold', sm.badge)}>
              <div className={clsx('w-1.5 h-1.5 rounded-full', sm.dot)} />
              {sm.label}
            </div>
            <div className={clsx('text-sm font-semibold', ctm.color)}>{ctm.label}</div>
          </div>
        </div>

        {/* 만료 타임라인 */}
        <ExpiryBar cert={cert} />

        <div className="mt-3 flex min-h-8 items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {cert.coveredMinerals?.map(m => (
              <span key={m} className="px-2.5 py-1 rounded-full border border-ink-700 bg-white text-xs text-ink-400">{m}</span>
            ))}
          </div>
          {cert.status === 'expired' && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-xs bg-red-100/70 px-3 py-2 text-sm font-semibold text-red-700">
              <AlertCircle className="w-3.5 h-3.5" />
              갱신 즉시 필요
            </div>
          )}
          {cert.status === 'expiring_soon' && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-xs bg-amber-100/70 px-3 py-2 text-sm font-semibold text-amber-700">
              <AlertCircle className="w-3.5 h-3.5" />
              {days >= 0 ? `${days}일 이내 갱신 권장` : '갱신 일정 확인 필요'}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

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
        onClick={event => event.stopPropagation()}
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
              const ctm = certTypeMeta[cert.certType] || { label: cert.certType, color: 'text-ink-300' };
              return (
                <div key={cert.certId} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-ink-800">
                  <div className="min-w-0">
                    <Link href={`/suppliers/${cert.supplierId}/info`} className="text-base font-bold text-ink-100 hover:text-accent-700">
                      {countryFlag[cert.originCountry] || '🌐'} {name?.nameEn ?? cert.supplierId}
                    </Link>
                    <div className="mt-1 text-sm text-ink-500">{name?.nameKo} · {cert.issuingAuthority}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Link href={`/suppliers/${cert.supplierId}/origin`} className="text-sm font-semibold num-mono text-accent-700 hover:underline">
                      {cert.certNumber}
                    </Link>
                    <div className={clsx('mt-1 text-sm font-semibold', ctm.color)}>{ctm.label}</div>
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'expired' | 'expiring_soon'>('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const allCerts = originCertificates;

  const countByStatus = useMemo(() => ({
    valid:         allCerts.filter(c => c.status === 'valid').length,
    expiring_soon: allCerts.filter(c => c.status === 'expiring_soon').length,
    expired:       allCerts.filter(c => c.status === 'expired').length,
    under_review:  allCerts.filter(c => c.status === 'under_review').length,
  }), [allCerts]);
  const matchesSearch = (cert: OriginCertificate) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = getSupplierName(cert.supplierId);
    return (
      (name?.nameEn ?? '').toLowerCase().includes(q) ||
      (name?.nameKo ?? '').toLowerCase().includes(q) ||
      cert.certNumber.toLowerCase().includes(q) ||
      cert.issuingAuthority.toLowerCase().includes(q)
    );
  };
  const matchesType = (cert: OriginCertificate) => typeFilter === 'all' || cert.certType === typeFilter;
  const matchesStatus = (cert: OriginCertificate) => statusFilter === 'all' || cert.status === statusFilter;
  const expiredCerts = allCerts.filter(cert => cert.status === 'expired' && matchesSearch(cert) && matchesType(cert) && matchesStatus(cert));
  const expiringSoonCerts = allCerts.filter(cert => cert.status === 'expiring_soon' && matchesSearch(cert) && matchesType(cert) && matchesStatus(cert));
  const modalCerts = modalStatus ? allCerts.filter(cert => cert.status === modalStatus) : [];
  const certTypes = [...new Set(allCerts.map(cert => cert.certType))];

  return (
    <>
      <PageHeader
        title="원산지 증명서 만료 관리"
        description="FTA · IRA · UFLPA 반증 · 분쟁광물 인증서 만료일 통합 추적"
        badge="리스크"
      />

      <div className="p-8 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTile label="유효" value={countByStatus.valid} status="valid" onClick={() => setModalStatus('valid')} />
          <KpiTile label="만료 임박" value={countByStatus.expiring_soon} status="expiring_soon" onClick={() => setModalStatus('expiring_soon')} />
          <KpiTile label="만료" value={countByStatus.expired} status="expired" onClick={() => setModalStatus('expired')} />
          <KpiTile label="검토 중" value={countByStatus.under_review} status="under_review" onClick={() => setModalStatus('under_review')} />
        </div>

        <div className="rounded-sm border border-ink-700 bg-white p-4 shadow-control">
          <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              placeholder="협력사명 · 증명서 번호 · 발급기관 검색"
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="w-full rounded-xs border border-ink-700 bg-white py-2.5 pl-9 pr-4 text-sm text-ink-100 placeholder-ink-500 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/10"
            />
          </div>
          <div className="flex overflow-hidden rounded-xs border border-ink-700 bg-white">
            {([
              { value: 'all', label: '전체' },
              { value: 'expired', label: '만료' },
              { value: 'expiring_soon', label: '만료 임박' },
            ] as const).map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={clsx(
                  'px-3 py-2.5 text-sm font-semibold transition-colors',
                  statusFilter === option.value ? 'bg-accent-50 text-accent-700' : 'text-ink-500 hover:bg-ink-800 hover:text-ink-300',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <select
            value={typeFilter}
            onChange={event => setTypeFilter(event.target.value)}
            className="rounded-xs border border-ink-700 bg-white px-3 py-2.5 text-sm text-ink-300"
          >
            <option value="all">유형 전체</option>
            {certTypes.map(type => (
              <option key={type} value={type}>{certTypeMeta[type]?.label || type}</option>
            ))}
          </select>
          </div>
        </div>

        {/* 만료 상태별 증명서 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CertificateColumn title="만료" description="즉시 갱신이 필요한 인증서" tone="expired" certs={expiredCerts} />
          <CertificateColumn title="만료 임박" description="갱신 일정을 우선 확인할 인증서" tone="expiring_soon" certs={expiringSoonCerts} />
        </div>
      </div>
      {modalStatus && <CertificateModal status={modalStatus} certs={modalCerts} onClose={() => setModalStatus(null)} />}
    </>
  );
}

function CertificateColumn({ title, description, tone, certs }: {
  title: string;
  description: string;
  tone: 'expired' | 'expiring_soon';
  certs: OriginCertificate[];
}) {
  return (
    <section className="rounded-sm border border-ink-700 bg-white shadow-control overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-ink-100">{title}</h2>
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        </div>
        <span className={clsx(
          'rounded-xs border px-2.5 py-1 text-sm font-bold num-mono',
          tone === 'expired' ? 'border-red-300 bg-red-50 text-red-700' : 'border-amber-300 bg-amber-50 text-amber-700',
        )}>
          {certs.length}건
        </span>
      </div>
      <div className="grid auto-rows-fr gap-3 p-4">
        {certs.map(cert => <CertCard key={cert.certId} cert={cert} />)}
        {certs.length === 0 && (
          <div className="rounded-sm border border-dashed border-ink-700 px-4 py-10 text-center text-sm text-ink-500">
            표시할 인증서가 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}
