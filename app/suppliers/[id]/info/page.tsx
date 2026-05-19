'use client';

import { useParams } from 'next/navigation';
import { suppliers } from '@/lib/data';
import {
  getSupplierName, getContacts, getFactories, getCertifications,
  getProcesses, getCompleteness, getRemindLogs, supplierExtended,
  regulationMeta, type Regulation,
} from '@/lib/supplier-detail-data';
import {
  Building2, Mail, Phone, Globe, Hash, Calendar,
  Factory, MapPin, Award, AlertCircle, Send, Users,
  Smartphone, Languages,
} from 'lucide-react';
import clsx from 'clsx';

const roleLabel: Record<string, string> = {
  headquarters: '본사',
  production: '생산 공장',
  processing: '가공·정제',
  mining: '광산',
  outsourcing: '외주',
};

const destLabel: Record<string, string> = {
  EU: 'EU 납품', US: 'US 납품', BOTH: 'EU + US', KR: '국내',
};
const destColor: Record<string, string> = {
  EU:   'border-blue-700/30 bg-blue-500/8 text-blue-600',
  US:   'border-amber-700/30 bg-amber-500/8 text-amber-600',
  BOTH: 'border-purple-700/30 bg-purple-500/8 text-purple-600',
  KR:   'border-emerald-700/30 bg-emerald-500/8 text-emerald-600',
};

export default function SupplierInfoPage() {
  const { id } = useParams<{ id: string }>();
  const supplier    = suppliers.find(s => s.id === id);
  const name        = getSupplierName(id);
  const ext         = supplierExtended.find(e => e.supplierId === id);
  const contacts    = getContacts(id);
  const factories   = getFactories(id);
  const certs       = getCertifications(id);
  const processes   = getProcesses(id);
  const completeness = getCompleteness(id);
  const reminds     = getRemindLogs(id);

  if (!supplier) return <div className="p-8 text-xs text-ink-500">협력사를 찾을 수 없습니다</div>;

  const hq          = factories.find(f => f.factoryRole === 'headquarters');
  const production  = factories.filter(f => f.factoryRole !== 'headquarters');

  return (
    <div className="p-8 space-y-8 max-w-5xl">

      {/* ── 섹션 1: 기업 기본정보 ── */}
      <Section title="기업 기본정보" subtitle="영문 공식 명칭 기준 관리">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 명칭 */}
          <div className="space-y-3">
            <InfoRow label="영문 정식명칭" value={name?.nameEn ?? supplier.name} mono={false} />
            <InfoRow label="한글 명칭"     value={name?.nameKo ?? '—'} />
            <InfoRow label="영문 약칭"     value={name?.shortNameEn ?? '—'} />
            <InfoRow label="한글 약칭"     value={name?.shortNameKo ?? '—'} />
          </div>
          {/* 등록 정보 */}
          <div className="space-y-3">
            {ext && (
              <>
                <InfoRow label="사업자 등록번호"  value={ext.businessRegNo} mono />
                <InfoRow label="법인 등록번호"    value={ext.corporateRegNo} mono />
                <InfoRow label="DUNS 번호"        value={ext.dunsNumber} mono />
                <InfoRow label="Tax Number"       value={ext.taxNumber} mono />
              </>
            )}
          </div>
        </div>

        {ext && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="설립연도" value={String(ext.establishedYear)} />
            <StatTile label="임직원 수" value={`${ext.employeeCount.toLocaleString()}명`} />
            <StatTile label="주요 역할" value={ext.providerType === 'manufacturer' ? '제조업체' : ext.providerType === 'miner' ? '광산' : ext.providerType} />
            <StatTile label="대표자" value={ext.ceoName} />
          </div>
        )}

        {ext?.website && (
          <a href={ext.website} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {ext.website}
          </a>
        )}
      </Section>

      {/* ── 섹션 2: 담당자 연락처 ── */}
      <Section title="담당자 연락처" subtitle={`${contacts.length}명 · 공장 담당자 포함`}>
        {contacts.length === 0 ? (
          <div className="text-xs text-ink-500 text-center py-6 border border-ink-700/40 border-dashed rounded-xs">
            등록된 담당자가 없습니다
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contacts.map(c => {
              const f = factories.find(ff => ff.factoryId === c.factoryId);
              return (
                <div key={c.contactId} className={clsx(
                  'p-4 rounded-xs border',
                  c.isPrimary ? 'border-accent-700/40 bg-accent-500/5' : 'border-ink-700/60 bg-ink-900/20',
                )}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-semibold text-ink-100">{c.name}</div>
                      <div className="text-xs text-ink-400 mt-0.5">{c.role}
                        {c.department ? <span className="text-ink-500"> · {c.department}</span> : ''}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {c.isPrimary && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-accent-700/20 border border-accent-700/30 text-accent-500">주담당</span>
                      )}
                      {c.language && (
                        <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-400">
                          <Languages className="w-2.5 h-2.5" />
                          {c.language}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-[11px] text-blue-500 hover:text-blue-400">
                      <Mail className="w-3 h-3 shrink-0" />
                      {c.email}
                    </a>
                    <div className="flex items-center gap-2 text-[11px] text-ink-300">
                      <Phone className="w-3 h-3 text-ink-500 shrink-0" />
                      {c.phone}
                    </div>
                    {c.mobile && (
                      <div className="flex items-center gap-2 text-[11px] text-ink-400">
                        <Smartphone className="w-3 h-3 text-ink-500 shrink-0" />
                        {c.mobile}
                        <span className="text-[10px] text-ink-500">모바일</span>
                      </div>
                    )}
                    {f && (
                      <div className="flex items-center gap-2 text-[10px] text-ink-500 pt-1 border-t border-ink-700/40">
                        <Factory className="w-3 h-3 shrink-0" />
                        {f.factoryName}
                        {f.factoryNameEn && f.factoryNameEn !== f.factoryName && (
                          <span className="text-ink-600">/ {f.factoryNameEn}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── 섹션 3: 공장·사업장 ── */}
      <Section title="공장·사업장" subtitle={`${factories.length}개소 · 납품처별 규제 차등`}>
        {hq && (
          <div className="mb-3 p-3 rounded-xs border border-blue-700/30 bg-blue-500/5">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
              <Building2 className="w-3.5 h-3.5" />
              본사 (Headquarters)
            </div>
            <div className="text-[11px] text-ink-300 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-ink-500 shrink-0" />
              {hq.address}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {production.map(f => (
            <div key={f.factoryId} className="p-4 rounded-xs border border-ink-700/60 bg-ink-900/20">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-semibold text-ink-100">{f.factoryName}</div>
                  {f.factoryNameEn && f.factoryNameEn !== f.factoryName && (
                    <div className="text-[11px] text-ink-400">{f.factoryNameEn}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-400">
                    {roleLabel[f.factoryRole] ?? f.factoryRole}
                  </span>
                  {f.destination && (
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-xs border', destColor[f.destination])}>
                      {destLabel[f.destination]}
                    </span>
                  )}
                  {!f.isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-xs border border-red-700/30 text-red-500">가동 중지</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
                <div className="flex items-start gap-1.5 text-ink-300">
                  <MapPin className="w-3 h-3 text-ink-500 shrink-0 mt-0.5" />
                  {f.address}
                </div>
                <div className="flex items-center gap-1.5 text-ink-400 num-mono">
                  <Calendar className="w-3 h-3 text-ink-500 shrink-0" />
                  {f.operatingPeriodFrom} ~ {f.operatingPeriodTo ?? '현재'}
                </div>
                {f.monthlyCapacity && (
                  <div className="text-ink-400 num-mono">월 처리량: {f.monthlyCapacity}</div>
                )}
                {f.supplyRatioPercent !== undefined && f.supplyQuantity && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-ink-700 rounded-xs overflow-hidden max-w-[80px]">
                      <div className="h-full bg-accent-600" style={{ width: `${f.supplyRatioPercent}%` }} />
                    </div>
                    <span className="text-accent-500 font-semibold">{f.supplyRatioPercent}%</span>
                    <span className="text-ink-500">({f.supplyQuantity})</span>
                  </div>
                )}
              </div>

              {/* 적용 규제 칩 */}
              {f.applicableRegulations && f.applicableRegulations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-ink-700/40">
                  <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-1.5">적용 규제</div>
                  <div className="flex flex-wrap gap-1">
                    {f.applicableRegulations.map(reg => {
                      const m = regulationMeta[reg as Regulation];
                      if (!m) return null;
                      return (
                        <span key={reg} className={clsx(
                          'text-[9px] px-1.5 py-0.5 rounded-xs border font-medium',
                          m.color === 'emerald' && 'border-emerald-700/30 text-emerald-600 bg-emerald-500/5',
                          m.color === 'teal'    && 'border-teal-700/30 text-teal-600 bg-teal-500/5',
                          m.color === 'amber'   && 'border-amber-700/30 text-amber-600 bg-amber-500/5',
                          m.color === 'orange'  && 'border-orange-700/30 text-orange-600 bg-orange-500/5',
                          m.color === 'blue'    && 'border-blue-700/30 text-blue-600 bg-blue-500/5',
                          m.color === 'cyan'    && 'border-cyan-700/30 text-cyan-600 bg-cyan-500/5',
                          m.color === 'purple'  && 'border-purple-700/30 text-purple-600 bg-purple-500/5',
                          m.color === 'red'     && 'border-red-700/30 text-red-600 bg-red-500/5',
                          m.color === 'violet'  && 'border-violet-700/30 text-violet-600 bg-violet-500/5',
                          m.color === 'slate'   && 'border-slate-700/30 text-slate-600 bg-slate-500/5',
                        )}>
                          {m.label}
                        </span>
                      );
                    })}
                  </div>
                  {f.hiddenRegulations && f.hiddenRegulations.length > 0 && (
                    <div className="mt-1 text-[9px] text-ink-500">
                      숨김: {f.hiddenRegulations.map(r => regulationMeta[r as Regulation]?.label).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── 섹션 4: 인증서 ── */}
      <Section title="인증서" subtitle={`${certs.length}건`}>
        {certs.length === 0 ? (
          <div className="text-xs text-ink-500 text-center py-6 border border-ink-700/40 border-dashed rounded-xs">
            등록된 인증서가 없습니다
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {certs.map(c => {
              const now     = new Date('2026-05-19');
              const exp     = new Date(c.expiresAt);
              const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
              return (
                <div key={c.certId} className={clsx(
                  'flex items-center justify-between px-3 py-2.5 rounded-xs border',
                  c.status === 'expired'       ? 'border-red-700/30 bg-red-500/5' :
                  c.status === 'expiring_soon' ? 'border-amber-700/30 bg-amber-500/5' :
                                                  'border-ink-700/60 bg-ink-900/20',
                )}>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-ink-200 truncate">{c.certName}</div>
                    <div className="text-[10px] text-ink-500 truncate">{c.issuingBody} · {c.certNumber}</div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className={clsx('text-[10px] font-semibold',
                      c.status === 'expired' ? 'text-red-500' :
                      c.status === 'expiring_soon' ? 'text-amber-500' : 'text-emerald-600'
                    )}>
                      {c.status === 'expired' ? '만료' :
                       c.status === 'expiring_soon' ? `${daysLeft}일 남음` : '유효'}
                    </div>
                    <div className="text-[9px] text-ink-500 num-mono">{c.expiresAt.slice(0, 10)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── 섹션 5: 데이터 완성도 ── */}
      {completeness && (
        <Section title="데이터 완성도" subtitle="필수 항목 충족률">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1 h-3 bg-ink-700 rounded-xs overflow-hidden">
              <div
                className="h-full rounded-xs"
                style={{
                  width: `${completeness.completionRate}%`,
                  backgroundColor: completeness.completionRate >= 90 ? '#10B981' :
                                    completeness.completionRate >= 70 ? '#F59E0B' : '#EF4444',
                }}
              />
            </div>
            <span className={clsx('text-xl font-semibold num-mono',
              completeness.completionRate >= 90 ? 'text-emerald-600' :
              completeness.completionRate >= 70 ? 'text-amber-600' : 'text-red-600',
            )}>
              {completeness.completionRate}%
            </span>
            <span className="text-xs text-ink-400 num-mono">
              {completeness.filledFieldCount}/{completeness.requiredFieldCount}
            </span>
          </div>
          {completeness.missingFields.length > 0 && (
            <div className="space-y-1">
              {completeness.missingFields.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-600">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

    </div>
  );
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────
function Section({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-sm font-semibold text-ink-100">{title}</h2>
        {subtitle && <span className="text-xs text-ink-500">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 w-32 shrink-0 pt-0.5">{label}</div>
      <div className={clsx('text-xs text-ink-200 flex-1', mono && 'font-mono')}>{value || '—'}</div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-3 text-center">
      <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-semibold text-ink-100">{value}</div>
    </div>
  );
}
