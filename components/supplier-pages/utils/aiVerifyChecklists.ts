import type {
  EsgAuditRecord,
  EsgHumanRightsIssue,
  SupplierFactory,
  SupplierFeocStatus,
} from '@/lib/api';
import { SUPPLIER_NOW } from './supplierNow';

export type RegKey =
  | 'UFLPA' | 'IRA' | 'EU_BATTERY' | 'CSDDD' | 'EUDR'
  | 'CBAM' | 'CONFLICT_MINERALS' | 'CRMA' | 'EU_BATTERY_ART7'
  | 'EU_BATTERY_ART47';

export const REG_META: Record<RegKey, { label: string; sub: string; color: string; accent: string }> = {
  UFLPA:             { label: 'UFLPA',             sub: '미국 강제노동방지법',    color: 'border-amber-700/40 bg-amber-500/8',    accent: 'text-amber-500' },
  IRA:               { label: 'IRA / FEOC',        sub: '미국 인플레이션감축법',  color: 'border-orange-700/40 bg-orange-500/8',  accent: 'text-orange-500' },
  EU_BATTERY:        { label: 'EU 배터리법',        sub: '재활용 함량',           color: 'border-blue-700/40 bg-blue-500/8',      accent: 'text-blue-400' },
  CSDDD:             { label: 'CSDDD',             sub: '공급망 실사',            color: 'border-teal-700/40 bg-teal-500/8',      accent: 'text-teal-400' },
  EUDR:              { label: 'EUDR',              sub: 'EU 산림파괴방지법',      color: 'border-emerald-700/40 bg-emerald-500/8',accent: 'text-emerald-500' },
  CBAM:              { label: 'CBAM',              sub: 'EU 탄소국경조정',        color: 'border-purple-700/40 bg-purple-500/8',  accent: 'text-purple-400' },
  CONFLICT_MINERALS: { label: 'Conflict Minerals', sub: 'EU 분쟁광물 규정',       color: 'border-red-700/40 bg-red-500/8',        accent: 'text-red-400' },
  CRMA:              { label: 'CRMA',              sub: 'EU 핵심원자재법',        color: 'border-violet-700/40 bg-violet-500/8',  accent: 'text-violet-400' },
  EU_BATTERY_ART7:   { label: 'EU 배터리 Art.7',   sub: '탄소발자국',             color: 'border-cyan-700/40 bg-cyan-500/8',      accent: 'text-cyan-400' },
  EU_BATTERY_ART47:  { label: 'EU 배터리 Art.47',  sub: '공급망 실사 (DDP)',      color: 'border-sky-700/40 bg-sky-500/8',        accent: 'text-sky-400' },
};

export type CheckStatus = 'pass' | 'fail' | 'pending';
export interface CheckItem { label: string; status: CheckStatus; detail?: string }

/**
 * 체크리스트 입력 — API에서 모은 데이터.
 * 지분율·원산지증명서·완성도 누락항목·DPP 재활용함량·탄소집약도는 API 미제공 →
 * 해당 검사는 fail/pending으로 처리(백엔드 추가 시 채워짐).
 */
export interface ChecklistInputs {
  feocStatus?: SupplierFeocStatus;
  auditRecords: EsgAuditRecord[];
  humanRightsIssues: EsgHumanRightsIssue[];
  factories: SupplierFactory[];
}

export function buildChecklists(inputs: ChecklistInputs): Record<RegKey, CheckItem[]> {
  const { feocStatus, auditRecords, humanRightsIssues, factories } = inputs;

  const latestAudit  = auditRecords[auditRecords.length - 1];
  const openHR       = humanRightsIssues.filter(i => i.status === 'open');
  const nextAuditDue = latestAudit?.nextAuditDue;
  const ddayNext     = nextAuditDue
    ? Math.ceil((new Date(nextAuditDue).getTime() - SUPPLIER_NOW.getTime()) / 86400000)
    : null;

  const hasFactoryCoords = factories.some(f => f.latitude != null && f.longitude != null);

  return {
    UFLPA: [
      { label: 'UFLPA 반증 서류 제출',  status: 'fail', detail: '반증 서류 API 미연동' },
      { label: '반증 서류 유효 기간',    status: 'fail', detail: '반증 서류 API 미연동' },
      { label: '광물 추적 시스템 등록',  status: 'pending', detail: '백엔드 연동 예정' },
      { label: 'N차 공급망 추적성 검증', status: 'pending', detail: '백엔드 연동 예정' },
      { label: '반증 서류 진위 확인',    status: 'pending', detail: 'AI 검증 대기' },
    ],

    IRA: [
      { label: 'FEOC 판정 완료',       status: feocStatus && feocStatus !== 'unknown' ? 'pass' : 'fail', detail: !feocStatus || feocStatus === 'unknown' ? 'FEOC 지분 파악 미완료' : undefined },
      { label: '직접 지분율 25% 미만', status: 'fail', detail: '지분율 API 미연동' },
      { label: '간접 지분율 25% 미만', status: 'fail', detail: '지분율 API 미연동' },
      { label: 'FEOC 인증 만료일 유효', status: 'fail', detail: '인증 만료일 API 미연동' },
      { label: '간접 지분 재귀 계산',  status: 'pending', detail: '시스템 집계 대기' },
      { label: '이사회 통제권 분석',   status: 'pending', detail: 'AI 검증 대기' },
    ],

    EU_BATTERY: [
      { label: '재활용 함량 데이터 제출', status: 'fail', detail: 'DPP 재활용 함량 API 미연동' },
      { label: '코발트 재활용 함량 ≥ 4%', status: 'fail', detail: 'DPP 재활용 함량 API 미연동' },
      { label: '니켈 재활용 함량 ≥ 4%',   status: 'fail', detail: 'DPP 재활용 함량 API 미연동' },
      { label: '리튬 재활용 함량 ≥ 4%',   status: 'fail', detail: 'DPP 재활용 함량 API 미연동' },
      { label: '제3자 검증서 업로드',      status: 'fail', detail: '제3자 검증 보고서 API 미연동' },
      { label: 'Mass Balance 계산 완료',   status: 'pending', detail: '시스템 집계 대기' },
    ],

    CSDDD: [
      { label: '실사 이력 존재',          status: auditRecords.length > 0 ? 'pass' : 'fail', detail: !auditRecords.length ? '감사 이력 없음' : undefined },
      { label: '최근 실사 통과',          status: latestAudit?.result === 'pass' || latestAudit?.result === 'conditional_pass' ? 'pass' : 'fail', detail: latestAudit ? `결과: ${latestAudit.result}` : '감사 이력 없음' },
      { label: '미해결 인권 이슈 없음',   status: openHR.length === 0 ? 'pass' : 'fail', detail: openHR.length > 0 ? `미해결 ${openHR.length}건` : undefined },
      { label: '개선 조치 이행 중',       status: 'pending', detail: '시정 조치 API 미연동' },
      { label: '다음 감사 일정 등록',     status: nextAuditDue ? 'pass' : 'fail', detail: nextAuditDue ? `D-${ddayNext !== null && ddayNext > 0 ? ddayNext : '기한 초과'}` : '다음 감사 일정 미등록' },
      { label: '실사 정책서(DDP) 업로드', status: 'fail', detail: '실사 정책서 API 미연동' },
      { label: '실시간 위험 신호 탐지',   status: 'pending', detail: 'AI 모니터링 대기' },
      { label: '고충처리 채널 운영 확인', status: 'pending', detail: '시스템 검증 대기' },
    ],

    EUDR: [
      { label: 'GPS 좌표 제출',       status: hasFactoryCoords ? 'pass' : 'fail', detail: !hasFactoryCoords ? '공장 좌표 없음' : undefined },
      { label: 'FSC 인증 보유',       status: 'fail', detail: 'FSC 인증 API 미연동' },
      { label: '폴리곤 좌표 제출',    status: 'fail', detail: '광산 폴리곤 좌표 미제출' },
      { label: '위성 이미지 산림 검증', status: 'pending', detail: 'AI 검증 대기' },
    ],

    CBAM: [
      { label: 'CBAM stub 판정',            status: 'pass', detail: 'stub_passed_judge: compliance_passed' },
      { label: '탄소 함량 신고 데이터 접수', status: 'pass', detail: '시연용 stub 데이터' },
      { label: 'EU CBAM 등록부 전송',       status: 'pending', detail: '외부 API 연동 대기' },
    ],

    CONFLICT_MINERALS: [
      { label: 'Conflict Minerals stub 판정', status: 'pass', detail: 'stub_passed_judge: compliance_passed' },
      { label: 'CMRT 제출 여부', status: 'pending', detail: '증빙 접수 대기' },
      { label: 'RMI DB 대조',   status: 'pending', detail: '백엔드 검증 대기' },
    ],

    CRMA: [
      { label: 'CRMA stub 판정',       status: 'pass', detail: 'stub_passed_judge: compliance_passed' },
      { label: '공급처 국가 정보 접수', status: factories.some(f => f.country) ? 'pass' : 'pending', detail: factories.some(f => f.country) ? '공장 국가 데이터 연결됨' : '공장 국가 데이터 대기' },
      { label: '국가 의존도 집계',      status: 'pending', detail: '백엔드 집계 대기' },
    ],

    EU_BATTERY_ART7: [
      { label: '탄소발자국 데이터 제출', status: 'fail', detail: '탄소 집약도 API 미연동' },
      { label: '제3자 검증 기관 등록',  status: 'fail', detail: '제3자 검증 기관 API 미연동' },
      { label: '탄소발자국 산정 계산',  status: 'pending', detail: 'LCA 엔진 연동 예정' },
      { label: '검증 완료 인증서',      status: 'pending', detail: '시스템 검증 대기' },
    ],

    EU_BATTERY_ART47: [
      { label: 'DDP 정책서 업로드',    status: 'fail', detail: '실사 정책서 API 미연동' },
      { label: '실사 이행 기록 존재',  status: auditRecords.length > 0 ? 'pass' : 'fail', detail: !auditRecords.length ? '감사 이력 없음' : undefined },
      { label: 'Notified Body 검증',   status: 'pending', detail: '시스템 검증 대기' },
      { label: 'CSDDD 위험과 정책 연계', status: 'pending', detail: 'AI 분석 대기' },
    ],
  };
}

export function calcRate(items: CheckItem[]): number {
  const passed = items.filter(i => i.status === 'pass').length;
  return items.length === 0 ? 0 : Math.round((passed / items.length) * 100);
}
