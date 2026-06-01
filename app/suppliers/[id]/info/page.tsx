'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { suppliers } from '@/lib/data';
import {
  getSupplierName, getContacts, getFactories, getCertifications,
  getProcesses, getCompleteness, getRemindLogs, getRiskProfile, supplierExtended,
  regulationMeta, getCtiDetails, type Regulation,
} from '@/lib/supplier-detail-data';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import {
  Building2, Mail, Phone, Globe, Hash, Calendar,
  Factory, MapPin, Award, AlertCircle, Send, Users,
  Smartphone, Languages, CheckCircle2, ClipboardCheck,
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
  const searchParams = useSearchParams();
  const activeInfoTab = searchParams.get('tab') === 'general' ? 'general' : 'summary';
  const supplier    = suppliers.find(s => s.id === id);
  const name        = getSupplierName(id);
  const ext         = supplierExtended.find(e => e.supplierId === id);
  const contacts    = getContacts(id);
  const factories   = getFactories(id);
  const certs       = getCertifications(id);
  const processes   = getProcesses(id);
  const completeness = getCompleteness(id);
  const reminds     = getRemindLogs(id);
  const risk         = getRiskProfile(id);
  const ctiDetails  = getCtiDetails(id);

  if (!supplier) return <div className="p-8 text-xs text-ink-500">협력사를 찾을 수 없습니다</div>;

  const hq          = factories.find(f => f.factoryRole === 'headquarters');
  const production  = factories.filter(f => f.factoryRole !== 'headquarters');

  return (
    <div className="w-full space-y-8 p-8">
      {activeInfoTab === 'summary' ? (
        <SupplierSummary
          supplier={supplier}
          name={name}
          contacts={contacts}
          factories={factories}
          certs={certs}
          completeness={completeness}
          risk={risk}
        />
      ) : (
        <>

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

      {ext && (
        <Section title="업종별 CTI 상세" subtitle="supplier_type별 필수 상세 필드">
          <ProviderTypeDetails
            providerType={ext.providerType}
            details={ctiDetails}
          />
        </Section>
      )}

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
        </>
      )}

    </div>
  );
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────
function SupplierSummary({
  supplier,
  name,
  contacts,
  factories,
  certs,
  completeness,
  risk,
}: {
  supplier: NonNullable<(typeof suppliers)[number]>;
  name: ReturnType<typeof getSupplierName>;
  contacts: ReturnType<typeof getContacts>;
  factories: ReturnType<typeof getFactories>;
  certs: ReturnType<typeof getCertifications>;
  completeness: ReturnType<typeof getCompleteness>;
  risk: ReturnType<typeof getRiskProfile>;
}) {
  const statusTone = supplier.status === 'verified' ? 'info' : supplier.status === 'violation' ? 'alert' : supplier.status === 'pending' ? 'neutral' : 'warn';
  const riskLabel = supplier.risk === 'low' ? '저위험' : supplier.risk === 'medium' ? '중위험' : supplier.risk === 'high' ? '고위험' : '최고위험';
  const riskTone = supplier.risk === 'low' ? 'ok' : supplier.risk === 'medium' ? 'warn' : 'alert';
  const rate = completeness?.completionRate ?? 0;
  const inputTone = rate >= 100 ? 'info' : rate >= 80 ? 'ok' : rate >= 50 ? 'warn' : 'alert';
  const inputLabel = rate >= 100 ? '제출 완료' : rate >= 80 ? '입력 중' : rate >= 50 ? '부분 제출' : '미제출';
  const feocLabel = risk?.feocStatus === 'eligible' ? '적격' : risk?.feocStatus === 'ineligible' ? '부적격' : risk?.feocStatus === 'under_review' ? '검토 중' : '미파악';
  const feocTone = risk?.feocStatus === 'eligible' ? 'info' : risk?.feocStatus === 'ineligible' ? 'alert' : risk?.feocStatus === 'under_review' ? 'warn' : 'neutral';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink-100">{name?.nameKo ?? name?.nameEn ?? supplier.name}</h2>
        <p className="mt-1 text-sm text-ink-500">{name?.nameEn ?? supplier.name} · 기업 정보와 규제 대응 현황</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="기업 기본 정보" subtitle="협력사 식별 정보와 승인 상태">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SummaryInfo label="협력사 ID" value={supplier.id} />
            <SummaryInfo label="Tier 계층" value={`Tier ${supplier.tier}`} />
            <SummaryInfo label="역할" value={supplier.role} />
            <SummaryInfo label="국가" value={`${supplier.country} ${supplier.region}`} />
            <SummaryInfo label="검증 상태" value={<Badge tone={statusTone}>{statusMetaLabel(supplier.status)}</Badge>} />
            <SummaryInfo label="위험도 평가" value={<Badge tone={riskTone}>{riskLabel}</Badge>} />
            <SummaryInfo label="FEOC 자격" value={<Badge tone={feocTone}>{feocLabel}</Badge>} />
            <SummaryInfo label="입력 현황" value={<Badge tone={inputTone}>{inputLabel}</Badge>} />
          </div>
        </Card>

        <Card title="데이터 완성도 및 주요 인증" subtitle="필수 항목 입력률과 인증서 상태">
          <div className="rounded-sm border border-ink-700 bg-ink-800/50 p-4">
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-ink-100">정보 입력 완성도</span>
              <span className="num-mono text-lg font-bold text-emerald-700">{rate}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-ink-700">
              <div
                className={clsx('h-full rounded-full', rate >= 90 ? 'bg-emerald-600' : rate >= 70 ? 'bg-amber-500' : 'bg-red-600')}
                style={{ width: `${Math.min(rate, 100)}%` }}
              />
            </div>
            <div className="mt-2 text-right text-[11px] text-ink-500">
              {completeness?.filledFieldCount ?? 0} / {completeness?.requiredFieldCount ?? 0} 항목 입력
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-ink-700 text-left text-[11px] font-bold text-ink-500">
                  <th className="pb-2">인증서 명칭</th>
                  <th className="pb-2">인증 기관</th>
                  <th className="pb-2">유효 기간</th>
                  <th className="pb-2 text-right">상태</th>
                </tr>
              </thead>
              <tbody>
                {certs.slice(0, 4).map(cert => (
                  <tr key={cert.certId} className="border-b border-ink-700/70 text-xs text-ink-300 last:border-0">
                    <td className="py-3 font-semibold text-ink-100">{cert.certName}</td>
                    <td className="py-3">{cert.issuingBody}</td>
                    <td className="num-mono py-3">{cert.expiresAt}</td>
                    <td className="py-3 text-right"><Badge tone={cert.status === 'active' ? 'ok' : 'warn'}>{cert.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {certs.length === 0 && <div className="py-6 text-center text-xs text-ink-500">등록된 인증서가 없습니다.</div>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="공장·사업장 현황" subtitle={`${factories.length}개소 · 납품처별 적용 규제`}>
          <div className="divide-y divide-ink-700">
            {factories.map(factory => (
              <div key={factory.factoryId} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-ink-700 bg-ink-800">
                    {factory.factoryRole === 'headquarters' ? <Building2 className="h-4 w-4 text-accent-700" /> : <Factory className="h-4 w-4 text-accent-700" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-ink-100">{factory.factoryName}</div>
                    <div className="mt-1 text-xs text-ink-500">{factory.address}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {factory.applicableRegulations?.slice(0, 4).map(reg => <Badge key={reg} tone="neutral">{reg}</Badge>)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="담당자 연락처" subtitle={`${contacts.length}명 · 본사/공장 담당자`}>
          <div className="divide-y divide-ink-700">
            {contacts.map(contact => (
              <div key={contact.contactId} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-ink-100">{contact.name}</div>
                  {contact.isPrimary && <Badge tone="ok">primary</Badge>}
                </div>
                <div className="mt-1 text-xs text-ink-500">{contact.department ? `${contact.department} · ` : ''}{contact.role}</div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-400">
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900"><Mail className="h-3 w-3" />{contact.email}</a>
                  <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{contact.phone}</span>
                </div>
              </div>
            ))}
            {contacts.length === 0 && <div className="text-xs text-ink-500">등록된 담당자가 없습니다.</div>}
          </div>
        </Card>
      </div>

      <Card title="기본 인증서" subtitle="일반정보 승인에 필요한 기본 증빙">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {certs.slice(0, 6).map(cert => (
            <div key={cert.certId} className="rounded-sm border border-ink-700 bg-ink-800/40 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <div>
                    <div className="text-sm font-bold text-ink-100">{cert.certName}</div>
                    <div className="mt-1 text-[11px] text-ink-500">{cert.issuingBody}</div>
                  </div>
                </div>
                <Badge tone={cert.status === 'active' ? 'ok' : 'warn'}>{cert.status}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-500">
                <ClipboardCheck className="h-3 w-3" />
                <span className="num-mono">{cert.certNumber}</span>
              </div>
              <div className="mt-1 text-[11px] text-ink-500">유효 기간 <span className="num-mono text-ink-300">~ {cert.expiresAt}</span></div>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}

function statusMetaLabel(status: string) {
  return status === 'verified' ? '검증 완료' : status === 'pending' ? '검토 대기' : status === 'review' ? '추가 확인' : status === 'violation' ? '규제 위반' : status;
}

function SummaryInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-h-[54px] items-center justify-between gap-4 rounded-xs border border-ink-700 bg-ink-800/50 px-3 py-2.5">
      <div className="text-xs font-semibold text-ink-500">{label}</div>
      <div className="text-right text-sm font-bold text-ink-100">{value}</div>
    </div>
  );
}

function Section({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-base font-bold text-ink-100">{title}</h2>
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

function ProviderTypeDetails({
  providerType,
  details,
}: {
  providerType: 'manufacturer' | 'recycler' | 'trader' | 'miner';
  details: ReturnType<typeof getCtiDetails>;
}) {
  if (!details) {
    return (
      <div className="text-xs text-ink-500 border border-ink-700/40 border-dashed rounded-xs p-4">
        {providerType} 상세 데이터가 아직 연결되지 않았습니다.
      </div>
    );
  }

  if (details.providerType === 'trader') {
    const isLowDisclosure = details.disclosureCompleteness < 75;
    return (
      <div className={clsx(
        'rounded-xs border p-4',
        isLowDisclosure ? 'border-amber-700/40 bg-amber-500/5' : 'border-ink-700/60 bg-ink-900/20',
      )}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow label="상위 공급망 공개율" value={`${details.disclosureCompleteness}%`} mono />
          <InfoRow label="공개 업체 수" value={`${details.disclosedUpstreamCount}개`} mono />
          <InfoRow label="신고 물질 범위" value={details.declaredMaterialScope} />
          <InfoRow label="Readiness 입력값" value={details.readinessInput} />
        </div>
        {isLowDisclosure && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-600">
            <AlertCircle className="w-3 h-3 shrink-0" />
            공개율 75% 미만입니다. FEOC gray-zone 및 DPP readiness 보완 항목으로 표시됩니다.
          </div>
        )}
      </div>
    );
  }

  if (details.providerType === 'miner') {
    return (
      <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow label="광권 ID" value={details.concessionId} mono />
          <InfoRow
            label="광산 좌표"
            value={details.mineCoordinates ? `${details.mineCoordinates[0]}, ${details.mineCoordinates[1]}` : '미제출'}
            mono
          />
          <InfoRow label="채굴 광물" value={details.extractedMinerals.join(', ')} />
          <InfoRow label="Geo 검증" value={details.geoVerificationStatus} />
        </div>
        <div className="mt-3 text-[11px] text-ink-500">
          위성 이미지·광권 대조 판정은 백엔드 검증 결과를 기다리며, 화면에서 직접 판단하지 않습니다.
        </div>
      </div>
    );
  }

  if (details.providerType === 'recycler') {
    return (
      <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoRow label="재활용 방식" value={details.recyclingMethod} />
        <InfoRow label="연 회수량" value={details.annualRecoveredMaterial} mono />
        <InfoRow label="폐기물 허가번호" value={details.wastePermitId} mono />
        <InfoRow label="회수율" value={`${details.recoveryRate}%`} mono />
      </div>
    );
  }

  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <InfoRow label="생산 라인" value={details.productionLine} />
      <InfoRow label="연간 생산능력" value={details.annualCapacity} mono />
      <InfoRow label="품질 시스템" value={details.qualitySystem} />
      <InfoRow label="공정 추적성" value={details.processTraceability} />
    </div>
  );
}
