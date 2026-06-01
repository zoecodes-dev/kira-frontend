// [작업 6 — 규제 이행 현황 탭 구현 (11개 규제 체크리스트)]
// 변경 사항:
// 1. 상단: 11개 규제별 이행률 요약 카드 행
// 2. 하단: 규제 선택 시 해당 규제의 상세 체크리스트 표시 (useState)
// 3. ✅ 프론트 판단 / ❌ 미충족 / 🔄 백엔드 대기 구분
// 4. 이행률 = ✅ 수 / 전체 항목 수 (🔄 포함 분모, 분자 제외)

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { suppliers, dppRecords } from '@/lib/data';
import {
  getRiskProfile, getCompleteness, getOriginCertificates,
  getCertifications, getFactories,
} from '@/lib/supplier-detail-data';
import { RefreshCw } from 'lucide-react';
import clsx from 'clsx';

const NOW = new Date('2026-05-19');

// ── 규제 메타 ────────────────────────────────────────────────────
type RegKey =
  | 'UFLPA' | 'IRA' | 'EU_BATTERY' | 'CSDDD' | 'EUDR'
  | 'CBAM' | 'CONFLICT_MINERALS' | 'CRMA' | 'EU_BATTERY_ART7'
  | 'EU_BATTERY_ART47';

const REG_META: Record<RegKey, { label: string; sub: string; color: string; accent: string }> = {
  UFLPA:            { label: 'UFLPA',              sub: '미국 강제노동방지법',      color: 'border-amber-700/40 bg-amber-500/8',    accent: 'text-amber-500' },
  IRA:              { label: 'IRA / FEOC',         sub: '미국 인플레이션감축법',    color: 'border-orange-700/40 bg-orange-500/8',  accent: 'text-orange-500' },
  EU_BATTERY:       { label: 'EU 배터리법',         sub: '재활용 함량',             color: 'border-blue-700/40 bg-blue-500/8',      accent: 'text-blue-400' },
  CSDDD:            { label: 'CSDDD',              sub: '공급망 실사',              color: 'border-teal-700/40 bg-teal-500/8',      accent: 'text-teal-400' },
  EUDR:             { label: 'EUDR',               sub: 'EU 산림파괴방지법',        color: 'border-emerald-700/40 bg-emerald-500/8',accent: 'text-emerald-500' },
  CBAM:             { label: 'CBAM',               sub: 'EU 탄소국경조정',          color: 'border-purple-700/40 bg-purple-500/8',  accent: 'text-purple-400' },
  CONFLICT_MINERALS:{ label: 'Conflict Minerals',  sub: 'EU 분쟁광물 규정',         color: 'border-red-700/40 bg-red-500/8',        accent: 'text-red-400' },
  CRMA:             { label: 'CRMA',               sub: 'EU 핵심원자재법',          color: 'border-violet-700/40 bg-violet-500/8',  accent: 'text-violet-400' },
  EU_BATTERY_ART7:  { label: 'EU 배터리 Art.7',    sub: '탄소발자국',              color: 'border-cyan-700/40 bg-cyan-500/8',      accent: 'text-cyan-400' },
  EU_BATTERY_ART47: { label: 'EU 배터리 Art.47',   sub: '공급망 실사 (DDP)',        color: 'border-sky-700/40 bg-sky-500/8',        accent: 'text-sky-400' },
};

type CheckStatus = 'pass' | 'fail' | 'pending';
interface CheckItem { label: string; status: CheckStatus; detail?: string }

function buildChecklists(id: string): Record<RegKey, CheckItem[]> {
  const risk         = getRiskProfile(id);
  const completeness = getCompleteness(id);
  const certs        = getOriginCertificates(id);
  const certis       = getCertifications(id);
  const factories    = getFactories(id);
  const missing      = completeness?.missingFields ?? [];
  const supplier     = suppliers.find(s => s.id === id);
  const supplierDpp  = dppRecords.find(d => supplier && d.manufacturer.includes(supplier.name.split(' ')[0]));

  const hasMissing   = (keyword: string) => missing.some(m => m.includes(keyword));

  const latestAudit  = risk?.auditRecords[risk.auditRecords.length - 1];
  const openHR       = risk?.humanRightsIssues.filter(i => i.status === 'open') ?? [];
  const nextAuditDue = latestAudit?.nextAuditDue;
  const ddayNext     = nextAuditDue
    ? Math.ceil((new Date(nextAuditDue).getTime() - NOW.getTime()) / 86400000)
    : null;

  const eudrFactories = factories.filter(f => f.applicableRegulations?.includes('EUDR'));
  const hasFscCert    = certis.some(c => c.certName.includes('FSC') || c.certName.includes('EUDR'));

  const countryRatio: Record<string, number> = {};
  factories.forEach(f => {
    if (f.supplyRatioPercent) {
      countryRatio[f.country] = (countryRatio[f.country] ?? 0) + f.supplyRatioPercent;
    }
  });
  const maxCountryRatio = Math.max(0, ...Object.values(countryRatio));

  return {
    UFLPA: [
      { label: 'UFLPA 반증 서류 제출',   status: certs.some(c => c.certType === 'UFLPA_REBUTTAL') ? 'pass' : 'fail', detail: certs.some(c => c.certType === 'UFLPA_REBUTTAL') ? undefined : '반증 서류 미제출' },
      { label: '반증 서류 유효 기간',     status: certs.some(c => c.certType === 'UFLPA_REBUTTAL' && c.status === 'valid') ? 'pass' : 'fail', detail: certs.some(c => c.certType === 'UFLPA_REBUTTAL' && c.status !== 'valid') ? '반증 서류 만료 또는 만료 임박' : undefined },
      { label: '광물 추적 시스템 등록',   status: !hasMissing('광물 추적 시스템') ? 'pass' : 'fail', detail: hasMissing('광물 추적 시스템') ? '광물 추적 시스템 미구축' : undefined },
      { label: 'N차 공급망 추적성 검증',  status: 'pending', detail: '백엔드 연동 예정' },
      { label: '반증 서류 진위 확인',     status: 'pending', detail: 'AI 검증 대기' },
    ],

    IRA: [
      { label: 'FEOC 판정 완료',          status: risk?.feocStatus !== 'unknown' ? 'pass' : 'fail', detail: risk?.feocStatus === 'unknown' ? 'FEOC 지분 파악 미완료' : undefined },
      { label: '직접 지분율 25% 미만',    status: risk?.feocDirectOwnership === undefined ? 'fail' : risk.feocDirectOwnership < 25 ? 'pass' : 'fail', detail: risk?.feocDirectOwnership === undefined ? '지분율 미파악' : risk.feocDirectOwnership >= 25 ? `현재 ${risk.feocDirectOwnership}% (기준 초과)` : undefined },
      { label: '간접 지분율 25% 미만',    status: risk?.feocIndirectOwnership === undefined ? 'fail' : risk.feocIndirectOwnership < 25 ? 'pass' : 'fail', detail: risk?.feocIndirectOwnership === undefined ? '지분율 미파악' : risk.feocIndirectOwnership >= 25 ? `현재 ${risk.feocIndirectOwnership}% (기준 초과)` : undefined },
      { label: 'FEOC 인증 만료일 유효',   status: risk?.feocCertExpiry ? (new Date(risk.feocCertExpiry) > NOW ? 'pass' : 'fail') : 'fail', detail: !risk?.feocCertExpiry ? '인증서 미발급' : new Date(risk.feocCertExpiry!) <= NOW ? `만료: ${risk.feocCertExpiry!.slice(0, 10)}` : undefined },
      { label: '간접 지분 재귀 계산',     status: 'pending', detail: '시스템 집계 대기' },
      { label: '이사회 통제권 분석',      status: 'pending', detail: 'AI 검증 대기' },
    ],

    EU_BATTERY: [
      { label: '재활용 함량 데이터 제출',  status: supplierDpp?.recycledContent ? 'pass' : 'fail', detail: !supplierDpp?.recycledContent ? 'DPP 내 재활용 함량 데이터 없음' : undefined },
      { label: '코발트 재활용 함량 ≥ 4%', status: supplierDpp?.recycledContent ? (supplierDpp.recycledContent.Co >= 4 ? 'pass' : 'fail') : 'fail', detail: supplierDpp?.recycledContent && supplierDpp.recycledContent.Co < 4 ? `현재 ${supplierDpp.recycledContent.Co}%` : undefined },
      { label: '니켈 재활용 함량 ≥ 4%',   status: supplierDpp?.recycledContent ? (supplierDpp.recycledContent.Ni >= 4 ? 'pass' : 'fail') : 'fail', detail: supplierDpp?.recycledContent && supplierDpp.recycledContent.Ni < 4 ? `현재 ${supplierDpp.recycledContent.Ni}%` : undefined },
      { label: '리튬 재활용 함량 ≥ 4%',   status: supplierDpp?.recycledContent ? (supplierDpp.recycledContent.Li >= 4 ? 'pass' : 'fail') : 'fail', detail: supplierDpp?.recycledContent && supplierDpp.recycledContent.Li < 4 ? `현재 ${supplierDpp.recycledContent.Li}%` : undefined },
      { label: '제3자 검증서 업로드',      status: !hasMissing('제3자 검증 보고서') ? 'pass' : 'fail', detail: hasMissing('제3자 검증 보고서') ? '제3자 검증 보고서 미제출' : undefined },
      { label: 'Mass Balance 계산 완료',   status: 'pending', detail: '시스템 집계 대기' },
    ],

    CSDDD: [
      { label: '실사 이력 존재',           status: (risk?.auditRecords.length ?? 0) > 0 ? 'pass' : 'fail', detail: !risk?.auditRecords.length ? '감사 이력 없음' : undefined },
      { label: '최근 실사 통과',           status: latestAudit?.result === 'pass' || latestAudit?.result === 'conditional_pass' ? 'pass' : 'fail', detail: latestAudit ? `결과: ${latestAudit.result}` : '감사 이력 없음' },
      { label: '미해결 인권 이슈 없음',    status: openHR.length === 0 ? 'pass' : 'fail', detail: openHR.length > 0 ? `미해결 ${openHR.length}건` : undefined },
      { label: '개선 조치 이행 중',        status: (latestAudit?.correctiveActions.length ?? 0) > 0 ? 'pass' : 'fail', detail: !(latestAudit?.correctiveActions.length) ? '시정 조치 없음' : undefined },
      { label: '다음 감사 일정 등록',      status: nextAuditDue ? 'pass' : 'fail', detail: nextAuditDue ? `D-${ddayNext !== null && ddayNext > 0 ? ddayNext : '기한 초과'}` : '다음 감사 일정 미등록' },
      { label: '실사 정책서(DDP) 업로드',  status: !hasMissing('실사 정책서') ? 'pass' : 'fail', detail: hasMissing('실사 정책서') ? '실사 정책서 미제출' : undefined },
      { label: '실시간 위험 신호 탐지',    status: 'pending', detail: 'AI 모니터링 대기' },
      { label: '고충처리 채널 운영 확인',  status: 'pending', detail: '시스템 검증 대기' },
    ],

    EUDR: [
      { label: 'GPS 좌표 제출',            status: eudrFactories.some(f => f.coordinates) ? 'pass' : 'fail', detail: !eudrFactories.some(f => f.coordinates) ? 'EUDR 적용 공장 좌표 없음' : undefined },
      { label: 'FSC 인증 보유',            status: hasFscCert ? 'pass' : 'fail', detail: !hasFscCert ? 'FSC / EUDR 인증 미보유' : undefined },
      { label: '폴리곤 좌표 제출',         status: !hasMissing('광산 폴리곤 좌표') ? 'pass' : 'fail', detail: hasMissing('광산 폴리곤 좌표') ? '광산 폴리곤 좌표 미제출' : undefined },
      { label: '위성 이미지 산림 검증',    status: 'pending', detail: 'AI 검증 대기' },
    ],

    // MOCK: CBAM/CONFLICT_MINERALS/CRMA는 현재 백엔드 stub_passed_judge 결과를 표시한다.
    // 실제 규제 판정과 점수 계산은 백엔드 응답으로 대체되어야 한다.
    CBAM: [
      { label: 'CBAM stub 판정',           status: 'pass', detail: 'stub_passed_judge: compliance_passed' },
      { label: '탄소 함량 신고 데이터 접수', status: 'pass', detail: '시연용 stub 데이터' },
      { label: 'EU CBAM 등록부 전송',      status: 'pending', detail: '외부 API 연동 대기' },
    ],

    CONFLICT_MINERALS: [
      { label: 'Conflict Minerals stub 판정', status: 'pass', detail: 'stub_passed_judge: compliance_passed' },
      { label: 'CMRT 제출 여부',          status: certs.some(c => c.certType === 'CONFLICT_FREE') ? 'pass' : 'pending', detail: certs.some(c => c.certType === 'CONFLICT_FREE') ? '원산지 증명서와 연결됨' : '증빙 접수 대기' },
      { label: 'RMI DB 대조',             status: 'pending', detail: '백엔드 검증 대기' },
    ],

    CRMA: [
      { label: 'CRMA stub 판정',           status: 'pass', detail: 'stub_passed_judge: compliance_passed' },
      { label: '공급처 국가 정보 접수',    status: factories.some(f => f.country) ? 'pass' : 'pending', detail: factories.some(f => f.country) ? '공장 국가 데이터 연결됨' : '공장 국가 데이터 대기' },
      { label: '국가 의존도 집계',         status: 'pending', detail: '백엔드 집계 대기' },
    ],

    EU_BATTERY_ART7: [
      { label: '탄소발자국 데이터 제출',  status: (supplier?.carbonIntensity ?? 0) > 0 ? 'pass' : 'fail', detail: !(supplier?.carbonIntensity) ? '탄소 집약도 데이터 없음' : undefined },
      { label: '제3자 검증 기관 등록',    status: !hasMissing('제3자 검증') ? 'pass' : 'fail', detail: hasMissing('제3자 검증') ? '제3자 검증 기관 미등록' : undefined },
      { label: '탄소발자국 산정 계산',    status: 'pending', detail: 'LCA 엔진 연동 예정' },
      { label: '검증 완료 인증서',        status: 'pending', detail: '시스템 검증 대기' },
    ],

    EU_BATTERY_ART47: [
      { label: 'DDP 정책서 업로드',       status: !hasMissing('실사 정책서') ? 'pass' : 'fail', detail: hasMissing('실사 정책서') ? '실사 정책서(DDP) 미제출' : undefined },
      { label: '실사 이행 기록 존재',     status: (risk?.auditRecords.length ?? 0) > 0 ? 'pass' : 'fail', detail: !risk?.auditRecords.length ? '감사 이력 없음' : undefined },
      { label: 'Notified Body 검증',      status: 'pending', detail: '시스템 검증 대기' },
      { label: 'CSDDD 위험과 정책 연계',  status: 'pending', detail: 'AI 분석 대기' },
    ],
  };
}

function calcRate(items: CheckItem[]): number {
  const passed = items.filter(i => i.status === 'pass').length;
  return items.length === 0 ? 0 : Math.round((passed / items.length) * 100);
}

export default function SupplierAiVerifyPage() {
  const { id } = useParams<{ id: string }>();
  const [selected, setSelected] = useState<RegKey>('UFLPA');

  const checklists  = buildChecklists(id);
  const regKeys     = Object.keys(REG_META) as RegKey[];
  const activeItems = checklists[selected];
  const activeMeta  = REG_META[selected];

  return (
    <div className="p-8 space-y-6 max-w-5xl">

      {/* ── 상단: 규제별 이행률 요약 카드 ── */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-3">
          규제별 이행률 요약
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {regKeys.map(key => {
            const meta   = REG_META[key];
            const items  = checklists[key];
            const rate   = calcRate(items);
            const passed = items.filter(i => i.status === 'pass').length;
            const isActive = selected === key;

            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={clsx(
                  'text-left p-3 rounded-xs border transition-all',
                  isActive
                    ? `${meta.color} ring-1 ring-inset ring-white/10`
                    : 'border-ink-700/60 bg-ink-900/20 hover:border-ink-600 hover:bg-ink-800/40'
                )}
              >
                <div className={clsx('text-[11px] font-bold mb-0.5', isActive ? meta.accent : 'text-ink-200')}>
                  {meta.label}
                </div>
                <div className="text-[9px] text-ink-500 mb-2 truncate">{meta.sub}</div>
                <div className="h-1 rounded-full bg-ink-700/60 mb-1">
                  <div
                    className={clsx('h-full rounded-full transition-all',
                      rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    )}
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={clsx('text-[11px] font-bold num-mono',
                    rate >= 80 ? 'text-emerald-500' : rate >= 50 ? 'text-amber-500' : 'text-red-500'
                  )}>
                    {rate}%
                  </span>
                  <span className="text-[9px] text-ink-500 num-mono">{passed}/{items.length}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 하단: 선택된 규제 체크리스트 ── */}
      <div className={clsx('rounded-xs border p-5', activeMeta.color)}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className={clsx('text-sm font-bold', activeMeta.accent)}>{activeMeta.label}</div>
            <div className="text-[11px] text-ink-400 mt-0.5">{activeMeta.sub}</div>
          </div>
          <div className="text-right">
            <div className={clsx('text-2xl font-bold num-mono',
              calcRate(activeItems) >= 80 ? 'text-emerald-500' :
              calcRate(activeItems) >= 50 ? 'text-amber-500' : 'text-red-500'
            )}>
              {calcRate(activeItems)}%
            </div>
            <div className="text-[10px] text-ink-500 num-mono">
              {activeItems.filter(i => i.status === 'pass').length} / {activeItems.length} 항목
            </div>
          </div>
        </div>

        {selected === 'EU_BATTERY' && (
          <div className="mb-4 px-3 py-2 rounded-xs border border-blue-700/30 bg-blue-500/5 text-[10px] text-blue-400">
            2030년: Co/Ni/Li 4% 이상 ｜ 2035년: Co 12%, Ni 4%, Li 4% 이상
          </div>
        )}

        <div className="space-y-1.5">
          {activeItems.map((item, i) => (
            <CheckRow key={i} item={item} />
          ))}
        </div>
      </div>

      {/* ── 범례 ── */}
      <div className="flex items-center gap-4 text-[10px] text-ink-500">
        <span>✅ 이행 완료</span>
        <span>❌ 미충족</span>
        <span>🔄 백엔드 연동 대기</span>
      </div>
    </div>
  );
}

function CheckRow({ item }: { item: CheckItem }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-ink-700/20 last:border-0">
      <span className="shrink-0 text-sm leading-none">
        {item.status === 'pass' ? '✅' : item.status === 'fail' ? '❌' : '🔄'}
      </span>
      <div className="flex-1 min-w-0">
        <div className={clsx('text-[12px]',
          item.status === 'pass' ? 'text-ink-200' :
          item.status === 'fail' ? 'text-ink-300' : 'text-ink-400'
        )}>
          {item.label}
        </div>
        {item.detail && (
          <div className={clsx('text-[10px] mt-0.5',
            item.status === 'fail'    ? 'text-red-400/80' :
            item.status === 'pending' ? 'text-ink-500' : 'text-ink-400'
          )}>
            {item.detail}
          </div>
        )}
      </div>
      {item.status === 'pending' && (
        <span className="shrink-0 flex items-center gap-1 text-[9px] text-ink-500 border border-ink-700/60 bg-ink-800/60 px-1.5 py-0.5 rounded-xs">
          <RefreshCw className="w-2.5 h-2.5" />
          대기
        </span>
      )}
    </div>
  );
}
