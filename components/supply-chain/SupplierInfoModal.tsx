'use client';

// 단계4 — 선택 노드의 1차 협력사 정보 확인 팝업 (getSupplierDetail/Reliability/Factories/Esg 실 API)
import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { AlertTriangle, ClipboardCheck, ExternalLink, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import ModalShell from './ModalShell';
import {
  ApiError,
  getSupplierDetail,
  getSupplierEsg,
  getSupplierFactories,
  getSupplierReliability,
  type EsgCertification,
  type SupplierDetail,
  type SupplierEsgResponse,
  type SupplierFactoriesResponse,
  type SupplierFeocStatus,
  type SupplierReliabilityResponse,
  type SupplierRiskLevel,
  type SupplierStatusCode,
  type SupplierType,
} from '@/lib/api';

const typeLabel: Record<SupplierType, string> = {
  manufacturer: '제조사',
  recycler: '재활용',
  trader: '트레이더',
  miner: '광산',
};
const statusLabel: Record<SupplierStatusCode, string> = {
  supplier_pending: '검토 대기',
  supplier_requested: '요청됨',
  supplier_in_progress: '진행 중',
  supplier_review: '추가 확인',
  supplier_verified: '검증 완료',
  supplier_violation: '규제 위반',
  supplier_suspended: '거래 중지',
};
const riskLabel: Record<SupplierRiskLevel, string> = {
  low: '저위험',
  medium: '중위험',
  high: '고위험',
  critical: '최고위험',
};
const feocLabel: Record<SupplierFeocStatus, string> = {
  eligible: 'FEOC 적격',
  ineligible: 'FEOC 부적격',
  under_review: 'FEOC 검토중',
  unknown: 'FEOC 미파악',
};

interface InfoData {
  detail: SupplierDetail;
  reliability: SupplierReliabilityResponse | null;
  factories: SupplierFactoriesResponse | null;
  esg: SupplierEsgResponse | null;
}

/** 만료일 판정: 경과=expired, 90일 이내=soon, 그 외=valid */
function certExpiry(expiresAt: string): 'expired' | 'soon' | 'valid' {
  const due = new Date(expiresAt).getTime();
  if (Number.isNaN(due)) return 'valid';
  const now = Date.now();
  if (due < now) return 'expired';
  if (due < now + 90 * 24 * 60 * 60 * 1000) return 'soon';
  return 'valid';
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-b-0">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="text-right font-semibold text-ink-100">{value ?? '-'}</span>
    </div>
  );
}

export default function SupplierInfoModal({
  supplierId,
  nodeLabel,
  onClose,
  onRequestUpdate,
}: {
  supplierId: string | undefined;
  nodeLabel: string;
  onClose: () => void;
  onRequestUpdate: () => void;
}) {
  const [data, setData] = useState<InfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supplierId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [detail, reliability, factories, esg] = await Promise.all([
          getSupplierDetail(supplierId),
          getSupplierReliability(supplierId).catch(() => null),
          getSupplierFactories(supplierId).catch(() => null),
          getSupplierEsg(supplierId).catch(() => null),
        ]);
        if (!cancelled) setData({ detail, reliability, factories, esg });
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : '협력사 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  const subtitle = supplierId ? `${nodeLabel} · ${supplierId}` : nodeLabel;
  const completeness = data?.reliability?.completenessScore ?? null;
  const certs: EsgCertification[] = data?.esg?.certifications ?? [];
  const expiringCerts = certs.filter(c => certExpiry(c.expiresAt) !== 'valid');

  return (
    <ModalShell
      title="협력사 정보 확인"
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          {supplierId ? (
            <Link
              href={`/suppliers/${supplierId}/info`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-accent-700"
            >
              협력사 상세 페이지로 이동
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={onRequestUpdate}
              disabled={!supplierId}
              className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              자료 업데이트 요청
            </button>
          </div>
        </div>
      }
    >
      {!supplierId ? (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 rounded-md border border-dashed border-warn-border bg-warn-bg p-6 text-center">
          <AlertTriangle className="h-5 w-5 text-warn-text" />
          <div className="text-sm font-semibold text-warn-text">선택한 노드에 연결된 협력사 상세 정보가 없습니다.</div>
          <div className="text-xs text-warn-text">먼저 트리에서 협력사가 매핑된 자재 노드를 선택하세요.</div>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center gap-2 py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div className="text-sm font-semibold">협력사 정보를 불러오는 중…</div>
        </div>
      ) : error ? (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 rounded-md border border-dashed border-alert-border bg-alert-bg p-6 text-center">
          <ShieldAlert className="h-5 w-5 text-alert-text" />
          <div className="text-sm font-semibold text-alert-text">{error}</div>
        </div>
      ) : data ? (
        <div className="space-y-5">
          {/* 일반 정보 */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-100">
              <ClipboardCheck className="h-4 w-4 text-ok-text" />
              일반 정보
            </div>
            <div className="rounded-md border border-slate-200 px-3">
              <Field label="협력사명" value={data.detail.companyName} />
              <Field label="유형" value={typeLabel[data.detail.supplierType] ?? data.detail.supplierType} />
              <Field label="상태" value={statusLabel[data.detail.status] ?? data.detail.status} />
              <Field label="위험도" value={riskLabel[data.detail.riskLevel] ?? data.detail.riskLevel} />
              <Field label="FEOC" value={feocLabel[data.detail.feocStatus] ?? data.detail.feocStatus} />
            </div>
          </section>

          {/* 신뢰도 */}
          {data.reliability && (
            <section>
              <div className="mb-2 text-sm font-bold text-ink-100">데이터 신뢰도</div>
              {completeness !== null && (
                <div className="mb-2 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-ok-solid" style={{ width: `${Math.min(completeness, 100)}%` }} />
                  </div>
                  <span className="num-mono w-12 text-right text-sm font-bold text-ink-100">{completeness}%</span>
                </div>
              )}
              <div className="rounded-md border border-slate-200 px-3">
                <Field label="동의 상태" value={data.reliability.consentStatus ?? '-'} />
                <Field label="약관 동의" value={data.reliability.agreementStatus ?? '-'} />
                <Field label="SLA 기한" value={data.reliability.slaDueDate ?? '-'} />
                <Field label="리마인드" value={data.reliability.reminderCount != null ? `${data.reliability.reminderCount}회` : '-'} />
                <Field label="최근 감사" value={data.reliability.lastAuditResult ?? '-'} />
              </div>
            </section>
          )}

          {/* 인증서 만료 */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-100">
              인증서 / 원산지 만료
              {expiringCerts.length > 0 && (
                <span className="rounded-full border border-warn-border bg-warn-bg px-2 py-0.5 text-[11px] font-bold text-warn-text">
                  {expiringCerts.length}건 확인 필요
                </span>
              )}
            </div>
            {certs.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                등록된 인증서가 없습니다.
              </div>
            ) : (
              <div className="space-y-1.5">
                {certs.map(cert => {
                  const exp = certExpiry(cert.expiresAt);
                  return (
                    <div key={cert.certId} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink-100">{cert.certificationType}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">{cert.issuingBody} · 만료 {cert.expiresAt}</div>
                      </div>
                      <span
                        className={clsx(
                          'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold',
                          exp === 'expired'
                            ? 'border-alert-border bg-alert-bg text-alert-text'
                            : exp === 'soon'
                              ? 'border-warn-border bg-warn-bg text-warn-text'
                              : 'border-ok-border bg-ok-bg text-ok-text',
                        )}
                      >
                        {exp === 'expired' ? '만료' : exp === 'soon' ? '만료 임박' : '유효'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 공장 */}
          {data.factories && data.factories.factories.length > 0 && (
            <section>
              <div className="mb-2 text-sm font-bold text-ink-100">공장 / 원산지</div>
              <div className="space-y-1.5">
                {data.factories.factories.map(f => (
                  <div key={f.factoryId} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink-100">{f.factoryName}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">{f.country} · {f.region} · {f.factoryRole}</div>
                    </div>
                    {f.supplyRatioPercent != null && (
                      <span className="num-mono shrink-0 text-sm font-bold text-ink-100">{f.supplyRatioPercent}%</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : null}
    </ModalShell>
  );
}
