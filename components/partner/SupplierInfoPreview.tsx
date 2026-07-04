'use client';

import { Calendar, MapPin, Send, Upload } from 'lucide-react';
import Badge from '@/components/Badge';
import { suppliers } from '@/lib/data';
import {
  getCertifications,
  getContacts,
  getFactories,
  getSupplierName,
  regulationMeta,
} from '@/lib/supplier-detail-data';
import type { MockContact, MockFactory, MockSupplier } from './partnerTypes';
import { calculateDDay, certDDayStyle, certStatusLabel, supplierStatusMeta } from './partnerFormatters';

// 협력사 업무공간(/partner) 공용 카드 — 내 회사(self) 또는 직접 연결된 협력사(공급망 노드) 정보를 보여준다.
// app/supplier/page.tsx의 SupplierInfoPreview를 그대로 이관.
export default function SupplierInfoPreview({
  supplierId,
  self = false,
  relation,
  completeness,
  onCertRenew,
  onRequestForm,
}: {
  supplierId: string;
  self?: boolean;
  /** 로그인 기업 기준 관계 방향 — self=true이면 불필요 */
  relation?: 'parent' | 'child';
  /** ③ 완성도 데이터 — self=true일 때 프로그레스바 표시용 */
  completeness?: { completionRate: number; filledFieldCount: number; requiredFieldCount: number; missingFields: string[] } | null;
  /** ⑤ 인증서 갱신 딥링크 콜백 — 인증서명을 인자로 받아 모달 진입 */
  onCertRenew?: (certName: string) => void;
  /** 하위 협력사(child)에게 표준 양식 요청 발송 — 공급망 연결 화면 퀵액션 */
  onRequestForm?: () => void;
}) {
  const supplier = suppliers.find(item => item.id === supplierId) as unknown as MockSupplier | undefined;
  const name = getSupplierName(supplierId);
  const contacts = getContacts(supplierId) as unknown as MockContact[];
  const factories = getFactories(supplierId) as unknown as MockFactory[];
  const production = factories.filter(factory => factory.factoryRole !== 'headquarters');
  const primary = contacts.find(contact => contact.isPrimary) ?? contacts[0];
  const certs = getCertifications(supplierId);

  // 관계 라벨 — Tier 숫자 대신 가시성 기반 표시
  const relationLabel = relation === 'parent' ? '직속 상위 (Parent)' : relation === 'child' ? '직속 하위 (Child)' : null;
  const relationBadgeCls = relation === 'parent'
    ? 'bg-info-bg text-info-text border-info-border'
    : 'bg-teal-50 text-teal-700 border-teal-200';

  if (!supplier) {
    return <div className="rounded-xs border border-ink-700 bg-white p-4 text-xs text-ink-500">협력사를 찾을 수 없습니다.</div>;
  }

  // ⑥ 상태값 메타 — 존재하지 않는 키는 원문 표시
  const statusMeta = supplierStatusMeta[supplier.status] ?? { label: supplier.status, tone: 'neutral' as const };

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
        {/* ① self 모드: Tier 배지 없이 좌측 텍스트만 / 연결사 모드: 관계 라벨 + 퀵액션 우측 배치 */}
        <div className={`flex gap-4 ${self ? '' : 'items-start justify-between'}`}>
          <div className="min-w-0">
            <div className="text-xs font-bold text-ink-500">{self ? '내 기업 기본정보' : '직접 연결 업체 정보'}</div>
            <div className="mt-2 text-base font-bold text-ink-100">{name?.nameEn ?? supplier.name}</div>
            <div className="mt-1 text-xs text-ink-500">{name?.nameKo ?? supplier.role} · {supplier.region}</div>
          </div>
          {!self && (
            <div className="flex shrink-0 items-center gap-2">
              {/* 하위 협력사(child)에게만 표준 양식 요청 발송 버튼 표시 */}
              {relation === 'child' && onRequestForm && (
                <button
                  type="button"
                  onClick={onRequestForm}
                  className="inline-flex items-center gap-1.5 rounded-xs border border-accent-600 bg-accent-50 px-3 py-1.5 text-[11px] font-bold text-accent-700 hover:bg-accent-700 hover:text-white transition-colors shadow-control"
                >
                  <Send className="h-3.5 w-3.5" />
                  표준 양식 요청 발송
                </button>
              )}
              {relationLabel && (
                <span className={`rounded-xs border px-2.5 py-1.5 text-[11px] font-bold ${relationBadgeCls}`}>
                  {relationLabel}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
            <div className="text-[11px] font-semibold text-ink-500">역할</div>
            <div className="mt-1 text-xs font-bold text-ink-100">{supplier.role}</div>
          </div>
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
            <div className="text-[11px] font-semibold text-ink-500">국가/지역</div>
            <div className="mt-1 text-xs font-bold text-ink-100">{supplier.country} · {supplier.region}</div>
          </div>
          {/* ⑥ 상태값 → 한글 Badge 변환 */}
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
            <div className="text-[11px] font-semibold text-ink-500">상태</div>
            <div className="mt-1.5">
              <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            </div>
          </div>
        </div>
      </div>

      {primary && (
        <div className="rounded-sm border border-ink-700 bg-white shadow-control">
          {/* 카드 헤더 — 수정 요청 버튼 포함 */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink-700">
            <div>
              <div className="text-xs font-bold text-ink-100">{self ? '담당자 정보' : '공개 담당 창구'}</div>
              <div className="mt-0.5 text-[11px] text-ink-500">{self ? '내 계정 기준 담당자' : '직접 연결 업무에 필요한 범위만 표시'}</div>
            </div>
            {/* ④ 수정 요청 버튼 — self 모드에서만 노출 */}
            {self && (
              <button
                type="button"
                onClick={() => alert('원청사에 변경 승인 요청이 전송되었습니다. (검토 대기)')}
                className="inline-flex items-center gap-1.5 rounded-xs border border-ink-600 bg-ink-800 px-3 py-1.5 text-[11px] font-semibold text-ink-400 transition-colors hover:border-accent-600 hover:bg-accent-50 hover:text-accent-700"
              >
                수정 요청
              </button>
            )}
          </div>
          <div className="p-5">
            <div className="rounded-xs border border-ink-700 bg-ink-800 p-4">
              <div className="text-xs font-bold text-ink-100">{primary.name}</div>
              <div className="mt-1 text-xs text-ink-500">{primary.role}{primary.department ? ` · ${primary.department}` : ''}</div>
              <div className="mt-3 text-xs font-semibold text-accent-700">{primary.email}</div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink-700">
          <div>
            <div className="text-xs font-bold text-ink-100">{self ? '내 사업장 정보' : '사업장 정보'}</div>
            <div className="mt-0.5 text-[11px] text-ink-500">{production.length}개소 · 납품처별 규제 차등</div>
          </div>
          {self && (
            <button
              type="button"
              onClick={() => alert('원청사에 변경 승인 요청이 전송되었습니다. (검토 대기)')}
              className="inline-flex items-center gap-1.5 rounded-xs border border-ink-600 bg-ink-800 px-3 py-1.5 text-[11px] font-semibold text-ink-400 transition-colors hover:border-accent-600 hover:bg-accent-50 hover:text-accent-700"
            >
              수정 요청
            </button>
          )}
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {production.map(factory => (
              <div key={factory.factoryId} className="rounded-xs border border-ink-700 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-ink-100">{factory.factoryName}</div>
                    {factory.factoryNameEn && factory.factoryNameEn !== factory.factoryName && (
                      <div className="mt-0.5 text-[11px] text-ink-500">{factory.factoryNameEn}</div>
                    )}
                  </div>
                  <Badge tone={factory.destination === 'US' ? 'warn' : factory.destination === 'EU' ? 'ok' : 'info'}>
                    {factory.destination === 'BOTH' ? 'EU + US' : factory.destination ?? 'KR'}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-ink-500">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{factory.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 num-mono">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span>{factory.operatingPeriodFrom} ~ {factory.operatingPeriodTo ?? '현재'}</span>
                  </div>
                  {factory.monthlyCapacity && <div>월 처리량: {factory.monthlyCapacity}</div>}
                  {factory.destinationDetail && <div>납품 흐름: {factory.destinationDetail}</div>}
                </div>
                {factory.applicableRegulations && factory.applicableRegulations.length > 0 && (
                  <div className="mt-3 border-t border-ink-700 pt-3">
                    <div className="mb-1.5 text-[10px] font-bold text-ink-500">적용 규제</div>
                    <div className="flex flex-wrap gap-1.5">
                      {factory.applicableRegulations.map(reg => (
                        <span key={reg} className="rounded-xs border border-accent-100 bg-accent-50 px-2 py-1 text-[10px] font-bold text-accent-900">
                          {regulationMeta[reg]?.label ?? reg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>{/* /사업장 카드 */}

      {/* 인증서 카드 */}
      <div className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink-700">
          <div>
            <div className="text-xs font-bold text-ink-100">인증서</div>
            <div className="mt-0.5 text-[11px] text-ink-500">{certs.length}건 · 제출/검토 기준</div>
          </div>
          {self && (
            <button
              type="button"
              onClick={() => alert('원청사에 변경 승인 요청이 전송되었습니다. (검토 대기)')}
              className="inline-flex items-center gap-1.5 rounded-xs border border-ink-600 bg-ink-800 px-3 py-1.5 text-[11px] font-semibold text-ink-400 transition-colors hover:border-accent-600 hover:bg-accent-50 hover:text-accent-700"
            >
              수정 요청
            </button>
          )}
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-2">
            {certs.map(cert => {
              const isInactive = cert.status !== 'active';
              const { label: ddayLabel, days } = calculateDDay(cert.expiresAt);
              const { badgeCls } = certDDayStyle(days);
              return (
                <div
                  key={cert.certId}
                  className={`flex items-start justify-between gap-3 rounded-xs border px-3 py-2.5 ${
                    isInactive ? 'border-alert-border bg-alert-bg' : 'border-ink-700 bg-ink-800'
                  }`}
                >
                  {/* 인증서명 + 발급기관 */}
                  <div className="min-w-0">
                    <div className={`truncate text-xs font-semibold ${isInactive ? 'text-alert-text' : 'text-ink-100'}`}>
                      {cert.certName}
                    </div>
                    <div className="truncate text-[10px] text-ink-500">{cert.issuingBody}</div>
                  </div>
                  {/* ② D-N 배지 + ⑤ 갱신 버튼 */}
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {isInactive ? (
                      <>
                        <span className={`rounded-xs px-2 py-0.5 text-[11px] font-bold tabular-nums ${badgeCls}`}>
                          {ddayLabel}
                        </span>
                        <span className="text-[10px] text-alert-text font-medium">
                          {certStatusLabel[cert.status]}
                        </span>
                        {/* ⑤ 갱신 증빙 업로드 버튼 — self 모드 + 콜백 있을 때만 */}
                        {self && onCertRenew && (
                          <button
                            type="button"
                            onClick={() => onCertRenew(cert.certName)}
                            className="mt-0.5 inline-flex items-center gap-1 rounded-xs border border-accent-500 bg-accent-50 px-2 py-1 text-[10px] font-bold text-accent-700 transition-colors hover:bg-accent-700 hover:text-white"
                          >
                            <Upload className="h-2.5 w-2.5" />
                            갱신 증빙 업로드
                          </button>
                        )}
                      </>
                    ) : (
                      <Badge tone="ok">유효</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>{/* /인증서 카드 */}
    </div>
  );
}
