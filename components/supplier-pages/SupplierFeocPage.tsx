'use client';

import { useParams } from 'next/navigation';
import { suppliers } from '@/lib/data';
import { getSupplierName, getRiskProfile, getOriginCertificates } from '@/lib/supplier-detail-data';
import { Clock, FileCheck } from 'lucide-react';
import clsx from 'clsx';
import { CheckRow } from './shared/CheckRow';
import { OriginCertCard } from './shared/OriginCertCard';
import { feocStatusMeta, originCertTypeMeta } from './utils/feocMeta';
import { SUPPLIER_NOW } from './utils/supplierNow';

function OwnershipTile({ label, value, threshold }: {
  label: string; value?: number; threshold: number;
}) {
  const isOver   = value !== undefined && value >= threshold;
  const barWidth = value !== undefined ? Math.min(value, 100) : 0;

  return (
    <div className={clsx(
      'rounded-xs border p-2.5',
      isOver ? 'border-red-700/30 bg-red-500/8' : 'border-ink-700/60 bg-ink-900/30'
    )}>
      <div className="text-[10px] text-ink-400 uppercase tracking-wider mb-1 text-center">{label}</div>
      <div className={clsx('text-xl font-bold num-mono text-center mb-2',
        value === undefined ? 'text-ink-500' :
        isOver ? 'text-red-500' : 'text-ink-100'
      )}>
        {value !== undefined ? `${value}%` : '—'}
      </div>

      {value !== undefined && (
        <div className="relative h-1.5 rounded-full bg-ink-700/60 overflow-visible">
          <div
            className={clsx('absolute left-0 top-0 h-full rounded-full transition-all',
              isOver ? 'bg-red-500' : 'bg-emerald-500'
            )}
            style={{ width: `${barWidth}%` }}
          />
          <div
            className="absolute top-[-3px] bottom-[-3px] w-px border-l border-dashed border-ink-400/70"
            style={{ left: `${threshold}%` }}
          />
        </div>
      )}

      {value !== undefined && (
        <div className="relative mt-1 h-3">
          <div
            className="absolute text-[8px] text-ink-500 -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${threshold}%` }}
          >
            IRA 기준 ({threshold}%)
          </div>
        </div>
      )}

      {isOver && (
        <div className="text-[9px] text-red-500 mt-1 text-center">기준 초과 ({threshold}%)</div>
      )}
    </div>
  );
}

export default function SupplierFeocPage() {
  const { id }    = useParams<{ id: string }>();
  const supplier  = suppliers.find(s => s.id === id);
  const name      = supplier ? getSupplierName(id) : null;
  const risk      = getRiskProfile(id);
  const certs     = getOriginCertificates(id);

  if (!risk) {
    return <div className="p-8 text-xs text-ink-500">리스크 데이터가 없습니다</div>;
  }

  const feocMeta   = feocStatusMeta[risk.feocStatus as keyof typeof feocStatusMeta] ?? feocStatusMeta.unknown;
  const StatusIcon = feocMeta.icon;

  const expiredCerts  = certs.filter(c => c.status === 'expired').length;
  const expiringSoon  = certs.filter(c => c.status === 'expiring_soon').length;
  const validCerts    = certs.filter(c => c.status === 'valid').length;

  const supplierDisplayName = name?.shortNameEn ?? supplier?.name ?? id;

  const checks = {
    판정완료: risk.feocStatus !== 'unknown',
    직접지분: risk.feocDirectOwnership !== undefined && risk.feocDirectOwnership < 25,
    간접지분: risk.feocIndirectOwnership !== undefined && risk.feocIndirectOwnership < 25,
    인증유효: risk.feocCertExpiry ? new Date(risk.feocCertExpiry) > SUPPLIER_NOW : false,
    최근평가: risk.feocLastAssessedAt
      ? (SUPPLIER_NOW.getTime() - new Date(risk.feocLastAssessedAt).getTime()) < 365 * 24 * 3600 * 1000
      : false,
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl">

      {/* ── FEOC 판정 카드 ── */}
      <div className={clsx('rounded-sm border p-6', feocMeta.border, feocMeta.bg)}>
        <div className="flex items-start gap-4">
          <StatusIcon className={clsx('w-8 h-8 shrink-0 mt-0.5', feocMeta.textColor)} />
          <div className="flex-1">
            <div className={clsx('text-lg font-bold mb-1', feocMeta.textColor)}>
              {feocMeta.label}
            </div>
            <p className="text-sm text-ink-300 mb-4">{feocMeta.sublabel}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <OwnershipTile label="직접 지분율" value={risk.feocDirectOwnership} threshold={25} />
              <OwnershipTile label="간접 지분율" value={risk.feocIndirectOwnership} threshold={25} />
              <div className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-2.5 text-center">
                <div className="text-[10px] text-ink-400 uppercase tracking-wider mb-1">최종 평가일</div>
                <div className="text-xs font-medium text-ink-200 num-mono">
                  {risk.feocLastAssessedAt?.slice(0, 10) ?? '—'}
                </div>
              </div>
              <div className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-2.5 text-center">
                <div className="text-[10px] text-ink-400 uppercase tracking-wider mb-1">인증 만료</div>
                <div className={clsx('text-xs font-medium num-mono',
                  risk.feocCertExpiry ? 'text-ink-200' : 'text-red-500'
                )}>
                  {risk.feocCertExpiry?.slice(0, 10) ?? '미발급'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── IRA FEOC 판단 기준 ── */}
      <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-4">
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-3">IRA FEOC 판단 기준</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-ink-400">
          {[
            '중국·러시아·북한·이란 소재 기업 직접 해당 시 자동 부적격',
            '해당 국가 기업의 직접·간접 지분 합산 25% 이상 시 부적격',
            '이사회 구성원 과반수 또는 경영 실질적 통제권 보유 시 부적격',
            '2025년 배터리 기준 적용, 2027년부터 배터리 소재·부품 확대 예정',
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <div className="w-1 h-1 rounded-full bg-ink-500 mt-1.5 shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* ── 지분 구조 검토 현황 ── */}
      <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-5 space-y-4">
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
          지분 구조 검토 현황
        </div>

        {risk.feocStatus === 'under_review' && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-amber-700/30 bg-amber-500/8 text-amber-500 text-[11px]">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            간접 지분 재귀 계산 대기 중 — 수동 검토 필요
          </div>
        )}

        <div className="space-y-2">
          <div className="text-[11px] text-ink-500 font-medium mb-1">직접 지분 경로</div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="px-2 py-1 rounded-xs bg-ink-800 border border-ink-700 text-ink-300 text-[11px]">우려국</span>
            <span className="text-ink-600">→</span>
            <span className="px-2 py-1 rounded-xs bg-ink-800 border border-ink-700 text-ink-200 text-[11px] font-medium">{supplierDisplayName}</span>
            {risk.feocDirectOwnership !== undefined && (
              <span className={clsx(
                'text-[10px] px-2 py-0.5 rounded-xs border',
                risk.feocDirectOwnership >= 25
                  ? 'border-red-700/30 bg-red-500/8 text-red-500'
                  : 'border-emerald-700/30 bg-emerald-500/8 text-emerald-500'
              )}>
                {risk.feocDirectOwnership}%
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] text-ink-500 font-medium mb-1">간접 지분 경로</div>
          <div className="flex items-center gap-2 flex-wrap text-[12px]">
            <span className="px-2 py-1 rounded-xs bg-ink-800 border border-ink-700 text-ink-300 text-[11px]">우려국</span>
            <span className="text-ink-600">→</span>
            <span className="px-2 py-1 rounded-xs bg-ink-800 border border-ink-700/60 text-ink-400 text-[11px] border-dashed">중간 법인</span>
            <span className="text-ink-600">→</span>
            <span className="px-2 py-1 rounded-xs bg-ink-800 border border-ink-700 text-ink-200 text-[11px] font-medium">{supplierDisplayName}</span>
            {risk.feocIndirectOwnership !== undefined && (
              <span className={clsx(
                'text-[10px] px-2 py-0.5 rounded-xs border',
                risk.feocIndirectOwnership >= 25
                  ? 'border-red-700/30 bg-red-500/8 text-red-500'
                  : 'border-emerald-700/30 bg-emerald-500/8 text-emerald-500'
              )}>
                {risk.feocIndirectOwnership}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── FEOC 이행 체크리스트 ── */}
      <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-5">
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-4">
          FEOC 이행 체크리스트
        </div>
        <div className="space-y-2">
          <CheckRow label="FEOC 판정 완료"           status={checks.판정완료 ? 'pass' : 'fail'} detail={risk.feocStatus === 'unknown' ? '지분 구조 파악 미완료' : undefined} />
          <CheckRow label="직접 지분 25% 미만"       status={risk.feocDirectOwnership === undefined ? 'fail' : checks.직접지분 ? 'pass' : 'fail'} detail={risk.feocDirectOwnership === undefined ? '직접 지분율 미파악' : !checks.직접지분 ? `현재 ${risk.feocDirectOwnership}% — IRA 기준 초과` : undefined} />
          <CheckRow label="간접 지분 25% 미만"       status={risk.feocIndirectOwnership === undefined ? 'fail' : checks.간접지분 ? 'pass' : 'fail'} detail={risk.feocIndirectOwnership === undefined ? '간접 지분율 미파악' : !checks.간접지분 ? `현재 ${risk.feocIndirectOwnership}% — IRA 기준 초과` : undefined} />
          <CheckRow label="FEOC 인증 유효"           status={risk.feocCertExpiry ? (checks.인증유효 ? 'pass' : 'fail') : 'fail'} detail={!risk.feocCertExpiry ? '인증서 미발급' : !checks.인증유효 ? `만료일: ${risk.feocCertExpiry.slice(0, 10)}` : undefined} />
          <CheckRow label="최근 평가일 12개월 이내"  status={risk.feocLastAssessedAt ? (checks.최근평가 ? 'pass' : 'fail') : 'fail'} detail={!risk.feocLastAssessedAt ? '평가 이력 없음' : !checks.최근평가 ? `마지막 평가: ${risk.feocLastAssessedAt.slice(0, 10)}` : undefined} />
          <CheckRow label="간접 지분 재귀 계산 완료" status="pending" detail="시스템 집계 대기" />
        </div>
      </div>

      {/* ── 원산지 증명서 ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-ink-100">원산지 증명서</h2>
            <span className="text-xs text-ink-500">{certs.length}건</span>
          </div>
          <div className="flex items-center gap-2">
            {validCerts > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-xs border border-emerald-700/30 bg-emerald-500/8 text-emerald-600">유효 {validCerts}</span>
            )}
            {expiringSoon > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-xs border border-amber-700/30 bg-amber-500/8 text-amber-600">만료임박 {expiringSoon}</span>
            )}
            {expiredCerts > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-xs border border-red-700/30 bg-red-500/8 text-red-600">만료 {expiredCerts}</span>
            )}
          </div>
        </div>

        {certs.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-ink-500 border border-ink-700/40 border-dashed rounded-xs">
            <FileCheck className="w-4 h-4" />
            등록된 원산지 증명서가 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {certs.map(cert => {
              const tm      = originCertTypeMeta[cert.certType];
              const cardClass =
                cert.status === 'expired'       ? 'border-red-700/30 bg-red-500/5' :
                cert.status === 'expiring_soon' ? 'border-amber-700/30 bg-amber-500/5' :
                cert.status === 'under_review'  ? 'border-blue-700/30 bg-blue-500/5' :
                                                  'border-ink-700/60 bg-ink-900/20';
              return (
                <OriginCertCard
                  key={cert.certId}
                  cert={cert}
                  label={tm?.label ?? cert.certType}
                  labelColor={tm?.color ?? 'text-ink-400'}
                  showOriginCountry
                  originCountryPrefix
                  originCountryBeforeDates
                  cardClass={cardClass}
                />
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
