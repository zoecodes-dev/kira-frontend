'use client';

// 협력사 홈/대시보드 (/partner) — app/supplier/page.tsx의 activeView==='dashboard' 분기를 이관.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  Network,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import Badge from '@/components/Badge';
import EightStageStepper from '@/components/supplier/EightStageStepper';
import ViolationReportModal from '@/components/supplier/ViolationReportModal';
import NotificationFeed from '@/components/notifications/NotificationFeed';
import { usePartnerWorkspace } from './PartnerWorkspaceContext';
import { calculateDDay, certDDayStyle, riskLabel, PARTNER_DEEP_LINK_ROUTE } from './partnerFormatters';

// 대시보드 카드용 목 데이터 — 화면 전용(다른 화면과 공유하지 않음).
const requestItems = [
  { label: '광산 폴리곤 좌표 등록',    due: '2026-06-16', status: '제출 필요', tone: 'warn'    as const },
  { label: '환경영향평가 갱신본 업로드', due: '2026-06-20', status: '재요청',   tone: 'alert'   as const },
  { label: '커뮤니티 합의서 제출',      due: '2026-06-25', status: '대기',     tone: 'neutral' as const },
  { label: '광권 갱신 증빙',            due: '2026-07-05', status: '대기',     tone: 'neutral' as const },
];
// 현재 UI에서 참조되지 않는 안내 목록 — app/supplier/page.tsx에도 선언만 되어 있고 렌더링에는
// 쓰이지 않던 기존 코드를 그대로 이관(삭제하지 않음).
const guideItems = [
  { title: '광산 좌표 제출 가이드', detail: 'EUDR 검증용 폴리곤 좌표 형식' },
  { title: '원산지 증빙 작성법', detail: '원산지 증명서 제출 기준' },
  { title: '탄소 배출 보고서 기준', detail: 'Scope 1/2/3 산정 근거 예시' },
];
const reviewResults = [
  { label: '원산지 증명서', result: '승인', reason: 'NORI-NCL-RAW 원산지 증빙 확인', tone: 'ok' as const },
  { label: '탄소 배출 보고서', result: '재요청', reason: 'Scope 3 산정 근거 보완 필요', tone: 'warn' as const },
  { label: '광산 폴리곤 좌표', result: '미제출', reason: 'EUDR 검증 필수 좌표 누락', tone: 'alert' as const },
];
const reviewTimeline = [
  { label: '원산지 증명서', step: '승인 완료', date: '2026-05-16', tone: 'ok' as const },
  { label: '탄소 배출 보고서', step: '재요청 확인 필요', date: '2026-05-19', tone: 'warn' as const },
  { label: '광산 폴리곤 좌표', step: '자료 미제출', date: '2026-05-31', tone: 'alert' as const },
  { label: '환경영향평가 보고서', step: '검토 대기', date: '2026-06-03', tone: 'info' as const },
];

export default function PartnerDashboard() {
  const router = useRouter();
  const { completeness, risk, certifications, submissions, upstream, downstream } = usePartnerWorkspace();

  // ── 시정 조치 모달 상태 — 이 화면에서만 쓰이는 UI 상태 ──────────────────────
  const [violationModalOpen, setViolationModalOpen] = useState(false);
  const [violationId, setViolationId] = useState<string | null>(null);

  const missing = completeness?.missingFields ?? [];
  const certRisk = certifications.filter(cert => cert.status !== 'active').length;
  const pendingRequests = missing.length + certRisk;

  return (
    <>
      {/* [P4] 제출 진행 현황 — 제출→AI파싱→협력사확인→원청접수/검토→최종승인 (실 submissions) */}
      {submissions.length > 0 && (
        <section>
          <EightStageStepper
            submissions={submissions}
            onResubmit={() => router.push('/partner/company-info')}
          />
        </section>
      )}
      {/* ── 영역 B: 진행 현황 KPI (상단 가로 4개) ── */}
      <section className="grid grid-cols-4 gap-4">
        <div
          onClick={() => router.push('/partner/company-info')}
          className="cursor-pointer rounded-sm border border-ink-700 bg-white p-5 shadow-control transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold text-ink-500">제출 완성도</span>
            <CheckCircle2 className="h-4 w-4 text-signal-ok" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="num-mono text-3xl font-bold text-ink-100">
              {completeness?.completionRate ?? 0}
            </span>
            <span className="text-sm font-bold text-ink-400">%</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (completeness?.completionRate ?? 0) >= 90 ? 'bg-signal-ok' :
                (completeness?.completionRate ?? 0) >= 70 ? 'bg-accent-700' : 'bg-alert-solid'
              }`}
              style={{ width: `${completeness?.completionRate ?? 0}%` }}
            />
          </div>
          <div className="mt-1.5 text-[10px] text-ink-500">
            {completeness?.filledFieldCount ?? 0}/{completeness?.requiredFieldCount ?? 0} 항목
          </div>
        </div>

        <div className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold text-ink-500">보완 요청</span>
            <AlertCircle className={`h-4 w-4 ${pendingRequests > 0 ? 'text-warn-text' : 'text-signal-ok'}`} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`num-mono text-3xl font-bold ${pendingRequests > 0 ? 'text-warn-text' : 'text-ink-100'}`}>
              {pendingRequests}
            </span>
            <span className="text-sm font-bold text-ink-400">건</span>
          </div>
          <div className="mt-3 text-[10px] text-ink-500">누락 항목 + 인증서</div>
          {pendingRequests > 0 && (
            <div className="mt-1.5 text-[10px] font-bold text-warn-text">즉시 확인 필요</div>
          )}
        </div>

        <div className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold text-ink-500">현재 리스크</span>
            <ShieldCheck className={`h-4 w-4 ${
              risk?.riskLevel === 'low' ? 'text-signal-ok' :
              risk?.riskLevel === 'medium' ? 'text-warn-text' : 'text-alert-text'
            }`} />
          </div>
          <div className={`text-2xl font-bold ${
            risk?.riskLevel === 'low' ? 'text-signal-ok' :
            risk?.riskLevel === 'medium' ? 'text-warn-text' : 'text-alert-text'
          }`}>
            {risk ? riskLabel[risk.riskLevel] : '미확인'}
          </div>
          <div className="mt-3 text-[10px] text-ink-500">
            {risk?.isHighRiskFlag ? '고위험 플래그 검토 필요' : '추가 조치 없음'}
          </div>
        </div>

        <div
          onClick={() => router.push('/partner/supply-chain')}
          className="cursor-pointer rounded-sm border border-ink-700 bg-white p-5 shadow-control transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold text-ink-500">직접 연결</span>
            <Network className="h-4 w-4 text-accent-700" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="num-mono text-3xl font-bold text-ink-100">
              {upstream.length + downstream.length}
            </span>
            <span className="text-sm font-bold text-ink-400">개사</span>
          </div>
          <div className="mt-3 text-[10px] text-ink-500">
            상위 {upstream.length} · 하위 {downstream.length}
          </div>
        </div>
      </section>

      {/* ── 메인 2단: 영역 A (오늘의 할 일) + 영역 C-preview (이슈) ── */}
      <section className="grid grid-cols-[1.1fr_0.9fr] gap-4">

        {/* 영역 A: 오늘의 할 일 — 확장 테이블 */}
        <div className="rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
            <div>
              <div className="text-sm font-bold text-ink-100">오늘의 할 일</div>
              <div className="mt-0.5 text-[10px] text-ink-500">제출 기한이 가까운 원청 요청 · 우선순위 순</div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/partner/notifications')}
              className="text-[10px] font-semibold text-accent-700 hover:underline"
            >
              전체 보기 →
            </button>
          </div>
          <div className="divide-y divide-ink-800">
            {requestItems.map((item, idx) => {
              const { label: ddayLabel, days } = calculateDDay(item.due);
              const isUrgent = days <= 3;
              const isWarn   = days > 3 && days <= 7;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => router.push('/partner/company-info')}
                  className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ink-800/30 ${
                    isUrgent ? 'bg-alert-bg' : 'bg-white'
                  }`}
                >
                  {/* 순서 번호 */}
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isUrgent ? 'bg-alert-bg text-alert-text' :
                    isWarn   ? 'bg-warn-bg text-warn-text' :
                               'bg-ink-800 text-ink-400'
                  }`}>
                    {idx + 1}
                  </div>
                  {/* 항목명 + 기한 */}
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-bold ${isUrgent ? 'text-alert-text' : 'text-ink-100'}`}>
                      {item.label}
                    </div>
                    <div className="mt-0.5 text-[10px] text-ink-500">
                      제출 기한 <span className="num-mono">{item.due}</span>
                    </div>
                  </div>
                  {/* D-day + 상태 */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`num-mono rounded-xs border px-2 py-0.5 text-[10px] font-bold ${
                      isUrgent ? 'border-alert-border bg-alert-bg text-alert-text' :
                      isWarn   ? 'border-warn-border bg-warn-bg text-warn-text' :
                                 'border-ok-border bg-ok-bg text-ok-text'
                    }`}>
                      {ddayLabel}
                    </span>
                    <Badge tone={item.tone}>{item.status}</Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-ink-600" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 우측 영역 */}
        <div className="flex flex-col gap-4">

          {/* 원청사 알림 — 대시보드에서 바로 확인 */}
          <NotificationFeed
            audience="partner"
            deepLinkMap={PARTNER_DEEP_LINK_ROUTE}
            fallbackRoute="/partner"
            allRoute="/partner/notifications"
            limit={4}
          />

          {/* 검토 결과 요약 */}
          <div className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
              <div>
                <div className="text-sm font-bold text-ink-100">검토 결과</div>
                <div className="mt-0.5 text-[10px] text-ink-500">원청사 검토 결과 · 내 자료 기준</div>
              </div>
            </div>
            <div className="divide-y divide-ink-800">
              {reviewResults.map(item => (
                <div key={item.label} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-ink-100">{item.label}</div>
                    <div className="mt-0.5 text-[10px] text-ink-500">{item.reason}</div>
                  </div>
                  <Badge tone={item.tone}>{item.result}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* 최근 변경사항 타임라인 */}
          <div className="rounded-sm border border-ink-700 bg-white shadow-control">
            <div className="border-b border-ink-700 px-5 py-4">
              <div className="text-sm font-bold text-ink-100">최근 변경사항</div>
              <div className="mt-0.5 text-[10px] text-ink-500">제출·검토·승인 이력</div>
            </div>
            <div className="divide-y divide-ink-800">
              {reviewTimeline.map(item => (
                <div key={item.label} className="flex items-center gap-3 px-5 py-3">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${
                    item.tone === 'ok' ? 'bg-signal-ok' :
                    item.tone === 'warn' ? 'bg-warn-solid' :
                    item.tone === 'alert' ? 'bg-alert-solid' : 'bg-accent-500'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-ink-100">{item.label}</div>
                    <div className="mt-0.5 text-[10px] text-ink-500">{item.step}</div>
                  </div>
                  <span className="num-mono shrink-0 text-[10px] text-ink-500">{item.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 영역 C: 알림 및 이슈 (하단) ── */}
      <section className="grid grid-cols-[1fr_1fr] gap-4">

        {/* 만료 인증서 + 누락 항목 */}
        <div className="rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
            <div>
              <div className="text-sm font-bold text-ink-100">리스크 · 보완 필요 항목</div>
              <div className="mt-0.5 text-[10px] text-ink-500">만료 인증서 · 누락 항목</div>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {missing.slice(0, 3).map(item => (
              <div key={item} className="flex items-center gap-2 rounded-xs border border-warn-border bg-warn-bg px-3 py-2.5 text-xs text-warn-text">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warn-text" />
                <span className="font-semibold">{item}</span>
              </div>
            ))}
            {certifications.filter(cert => cert.status !== 'active').slice(0, 2).map(cert => {
              const { label: ddayLabel, days } = calculateDDay(cert.expiresAt);
              const { wrapperCls, badgeCls } = certDDayStyle(days);
              return (
                <div
                  key={cert.certId}
                  className={`flex items-center justify-between gap-3 rounded-xs border px-3 py-2.5 text-xs ${wrapperCls}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileCheck className="h-3.5 w-3.5 shrink-0 text-alert-text" />
                    <span className="truncate font-semibold text-alert-text">{cert.certName}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[10px] text-alert-text">{cert.status === 'expired' ? '만료' : '만료 임박'}</span>
                    <span className={`rounded-xs px-2 py-0.5 text-[11px] font-bold tabular-nums ${badgeCls}`}>
                      {ddayLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 위반 항목 + 시정 조치 */}
        <div className="rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
            <div>
              <div className="text-sm font-bold text-ink-100">위반 · 시정 조치</div>
              <div className="mt-0.5 text-[10px] text-ink-500">규제 위반 및 대응 필요 항목</div>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {reviewResults.filter(r => r.tone === 'alert' || r.tone === 'warn').map(item => (
              <div key={item.label} className={`flex items-start gap-2 rounded-xs border px-3 py-2.5 text-xs ${
                item.tone === 'alert' ? 'border-alert-border bg-alert-bg' : 'border-warn-border bg-warn-bg'
              }`}>
                <ShieldAlert className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${item.tone === 'alert' ? 'text-alert-text' : 'text-warn-text'}`} />
                <div>
                  <div className={`font-bold ${item.tone === 'alert' ? 'text-alert-text' : 'text-warn-text'}`}>
                    {item.label}
                  </div>
                  <div className={`mt-0.5 ${item.tone === 'alert' ? 'text-alert-text' : 'text-warn-text'}`}>
                    {item.reason}
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setViolationId('VIO-2026-0042');
                setViolationModalOpen(true);
              }}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xs border border-alert-border bg-alert-bg px-3 py-2.5 text-xs font-bold text-alert-text transition-colors hover:bg-alert-solid hover:text-white hover:border-alert-border shadow-control"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              시정 조치 계획 제출하기
            </button>
          </div>
        </div>
      </section>

      {/* ── 시정 조치 계획 모달 — violationId로 특정 위반 건 바인딩 ─────── */}
      <ViolationReportModal
        open={violationModalOpen}
        onClose={() => {
          setViolationModalOpen(false);
          setViolationId(null);
        }}
        {...(violationId !== null && { violationId })}
      />
    </>
  );
}
