'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import { suppliers } from '@/lib/data';
import { getCertifications, getContacts, getFactories, getSupplierName, supplierCompleteness } from '@/lib/supplier-detail-data';
import { Building2, CheckCircle2, Factory, Mail, MapPin, Phone } from 'lucide-react';
import clsx from 'clsx';

export default function SupplierGeneralPage() {
  const supplierIds = suppliers.slice(0, 8).map(s => s.id);
  const [selectedId, setSelectedId] = useState(supplierIds[0]);
  const selected = suppliers.find(s => s.id === selectedId);
  const name = getSupplierName(selectedId);
  const contacts = getContacts(selectedId);
  const factories = getFactories(selectedId);
  const certs = getCertifications(selectedId);
  const completeness = supplierCompleteness.find(c => c.supplierId === selectedId);

  return (
    <>
      <PageHeader title="협력사 일반정보" description="사업자 정보, 담당자, 공장, 기본 인증서를 관리하는 협력사 기준 정보 화면" badge="P0" />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric label="관리 협력사" value={supplierIds.length} unit="개사" tone="neutral" />
          <Metric label="담당자" value={contacts.length} unit="명" tone="info" />
          <Metric label="공장" value={factories.length} unit="개소" tone="ok" />
          <Metric label="인증서" value={certs.length} unit="건" tone="warn" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-6">
          <Card title="협력사 목록" subtitle="일반정보를 검토할 협력사를 선택">
            <div className="space-y-2">
              {supplierIds.map(id => {
                const supplier = suppliers.find(s => s.id === id);
                const supplierName = getSupplierName(id);
                const comp = supplierCompleteness.find(c => c.supplierId === id);
                return (
                  <button key={id} onClick={() => setSelectedId(id)} className={clsx('w-full rounded-xs border p-3 text-left transition-colors', selectedId === id ? 'border-accent-500/70 bg-accent-500/8' : 'border-ink-700/60 bg-ink-900/30 hover:bg-ink-800/40')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><div className="text-sm font-semibold text-ink-100 truncate">{supplierName?.nameEn ?? supplier?.name}</div><div className="text-[11px] text-ink-500 truncate">{supplierName?.nameKo ?? supplier?.role}</div></div>
                      <Badge tone={supplier?.status === 'verified' ? 'ok' : supplier?.status === 'violation' ? 'alert' : 'warn'}>{supplier?.status}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-3"><div className="flex-1 h-1.5 rounded-full bg-ink-700 overflow-hidden"><div className="h-full bg-accent-500" style={{ width: `${comp?.completionRate ?? 0}%` }} /></div><span className="text-xs text-ink-400 num-mono">{comp?.completionRate ?? 0}%</span></div>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            <Card title={name?.nameEn ?? selected?.name ?? selectedId} subtitle="기업 기본정보와 승인 상태" action={<Badge tone={selected?.status === 'verified' ? 'ok' : 'warn'}>{selected?.status}</Badge>}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                <Info label="협력사 ID" value={selectedId} />
                <Info label="Tier" value={`Tier ${selected?.tier ?? '-'}`} />
                <Info label="역할" value={selected?.role ?? '-'} />
                <Info label="국가" value={selected?.country ?? '-'} />
                <Info label="완성도" value={`${completeness?.completionRate ?? 0}%`} />
                <Info label="사업자 상태" value="원청사 확인 필요" />
              </div>
              <div className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-4">
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-accent-500 shrink-0 mt-0.5" />
                  <div><div className="text-sm font-semibold text-ink-100">일반정보 관리 경계</div><p className="text-xs text-ink-500 mt-1 leading-5">ERP/구매 시스템에서 받은 기본 거래 정보와 협력사가 제출한 사업자·담당자·공장 증빙을 이 화면에서 원청사가 검토하고 승인합니다.</p></div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="담당자 연락처" subtitle={`${contacts.length}명 · 본사/공장 담당자`}>
                <div className="space-y-2">
                  {contacts.map(contact => (
                    <div key={contact.contactId} className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
                      <div className="flex items-center justify-between"><div className="text-sm font-semibold text-ink-100">{contact.name}</div>{contact.isPrimary && <Badge tone="ok">primary</Badge>}</div>
                      <div className="mt-2 space-y-1 text-[11px] text-ink-500"><div className="flex items-center gap-2"><Mail className="w-3 h-3" />{contact.email}</div><div className="flex items-center gap-2"><Phone className="w-3 h-3" />{contact.phone}</div></div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="공장·사업장" subtitle={`${factories.length}개소 · 납품처별 규제 차등`}>
                <div className="space-y-2">
                  {factories.map(factory => (
                    <div key={factory.factoryId} className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
                      <div className="flex items-start gap-2"><Factory className="w-3.5 h-3.5 text-accent-500 mt-0.5" /><div className="min-w-0"><div className="text-sm font-semibold text-ink-100 truncate">{factory.factoryName}</div><div className="text-[11px] text-ink-500 truncate">{factory.address}</div></div></div>
                      <div className="mt-2 flex flex-wrap gap-1">{factory.applicableRegulations?.slice(0, 3).map(reg => <Badge key={reg} tone="neutral">{reg}</Badge>)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card title="기본 인증서" subtitle="일반정보 승인에 필요한 기본 증빙">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {certs.slice(0, 6).map(cert => (
                  <div key={cert.certId} className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
                    <div className="flex items-start justify-between gap-2"><div className="text-xs font-semibold text-ink-100">{cert.certName}</div><Badge tone={cert.status === 'active' ? 'ok' : 'warn'}>{cert.status}</Badge></div>
                    <div className="text-[11px] text-ink-500 mt-2">{cert.issuingBody}</div>
                    <div className="text-[10px] text-ink-500 mt-1 num-mono">~ {cert.expiresAt}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: 'neutral' | 'info' | 'ok' | 'warn' }) {
  const color = { neutral: 'text-ink-200', info: 'text-blue-400', ok: 'text-emerald-400', warn: 'text-amber-400' }[tone];
  return <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-4"><div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div><div className={`text-2xl font-bold num-mono mt-2 ${color}`}>{value}<span className="text-sm text-ink-500 ml-1">{unit}</span></div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-3"><div className="text-[10px] text-ink-500">{label}</div><div className="text-sm font-semibold text-ink-100 mt-1 truncate">{value}</div></div>;
}
