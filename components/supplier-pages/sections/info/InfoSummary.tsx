import { Building2, Factory, Mail, Phone, CheckCircle2, ClipboardCheck } from 'lucide-react';
import clsx from 'clsx';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import type {
  getSupplierName, getContacts, getFactories,
  getCertifications, getCompleteness, getRiskProfile,
} from '@/lib/supplier-detail-data';
import type { suppliers } from '@/lib/data';

type Supplier = NonNullable<(typeof suppliers)[number]>;
type Name = ReturnType<typeof getSupplierName>;
type Contacts = ReturnType<typeof getContacts>;
type Factories = ReturnType<typeof getFactories>;
type Certs = ReturnType<typeof getCertifications>;
type Completeness = ReturnType<typeof getCompleteness>;
type Risk = ReturnType<typeof getRiskProfile>;

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

export function InfoSummary({
  supplier, name, contacts, factories, certs, completeness, risk,
}: {
  supplier: Supplier;
  name: Name;
  contacts: Contacts;
  factories: Factories;
  certs: Certs;
  completeness: Completeness;
  risk: Risk;
}) {
  const statusTone = supplier.status === 'verified' ? 'info' : supplier.status === 'violation' ? 'alert' : supplier.status === 'pending' ? 'neutral' : 'warn';
  const riskLabel  = supplier.risk === 'low' ? '저위험' : supplier.risk === 'medium' ? '중위험' : supplier.risk === 'high' ? '고위험' : '최고위험';
  const riskTone   = supplier.risk === 'low' ? 'ok' : supplier.risk === 'medium' ? 'warn' : 'alert';
  const rate       = completeness?.completionRate ?? 0;
  const inputTone  = rate >= 100 ? 'info' : rate >= 80 ? 'ok' : rate >= 50 ? 'warn' : 'alert';
  const inputLabel = rate >= 100 ? '제출 완료' : rate >= 80 ? '입력 중' : rate >= 50 ? '부분 제출' : '미제출';
  const feocLabel  = risk?.feocStatus === 'eligible' ? '적격' : risk?.feocStatus === 'ineligible' ? '부적격' : risk?.feocStatus === 'under_review' ? '검토 중' : '미파악';
  const feocTone   = risk?.feocStatus === 'eligible' ? 'info' : risk?.feocStatus === 'ineligible' ? 'alert' : risk?.feocStatus === 'under_review' ? 'warn' : 'neutral';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink-100">{name?.nameKo ?? name?.nameEn ?? supplier.name}</h2>
        <p className="mt-1 text-sm text-ink-500">{name?.nameEn ?? supplier.name} · 기업 정보와 규제 대응 현황</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="기업 기본 정보" subtitle="협력사 식별 정보와 승인 상태">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SummaryInfo label="협력사 ID"  value={supplier.id} />
            <SummaryInfo label="Tier 계층"  value={`Tier ${supplier.tier}`} />
            <SummaryInfo label="역할"       value={supplier.role} />
            <SummaryInfo label="국가"       value={`${supplier.country} ${supplier.region}`} />
            <SummaryInfo label="검증 상태"  value={<Badge tone={statusTone}>{statusMetaLabel(supplier.status)}</Badge>} />
            <SummaryInfo label="위험도 평가" value={<Badge tone={riskTone}>{riskLabel}</Badge>} />
            <SummaryInfo label="FEOC 자격"  value={<Badge tone={feocTone}>{feocLabel}</Badge>} />
            <SummaryInfo label="입력 현황"  value={<Badge tone={inputTone}>{inputLabel}</Badge>} />
          </div>
        </Card>

        <Card title="데이터 완성도 및 주요 인증" subtitle="필수 항목 입력률과 인증서 상태">
          <div className="rounded-sm border border-ink-700 bg-ink-800/50 p-4">
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-ink-100">정보 입력 완성도</span>
              <span className="num-mono text-lg font-bold text-ok-text">{rate}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-ink-700">
              <div
                className={clsx('h-full rounded-full', rate >= 90 ? 'bg-ok-solid' : rate >= 70 ? 'bg-warn-solid' : 'bg-alert-solid')}
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
                    {factory.factoryRole === 'headquarters'
                      ? <Building2 className="h-4 w-4 text-accent-700" />
                      : <Factory className="h-4 w-4 text-accent-700" />}
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
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-info-text hover:text-info-text">
                    <Mail className="h-3 w-3" />{contact.email}
                  </a>
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
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok-text" />
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
