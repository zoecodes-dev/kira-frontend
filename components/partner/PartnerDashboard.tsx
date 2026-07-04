'use client';

// 협력사 홈/대시보드 (/partner) — app/supplier/page.tsx의 activeView==='dashboard'(어제 리워크본)을 이관.
// 홈 화면은 '오늘의 알림' 단일 섹션만 노출한다.
//  · 제거: 8단계 진행 스테퍼 · 상단 KPI 4카드 · 검토 결과 · 최근 변경사항 · 리스크/보완 · 위반/시정 조치.
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { calculateDDay } from './partnerFormatters';

// 대시보드 카드용 목 데이터 — 화면 전용(다른 화면과 공유하지 않음).
const requestItems = [
  { label: '광산 폴리곤 좌표 등록',    due: '2026-06-16', status: '제출 필요', tone: 'warn'    as const },
  { label: '환경영향평가 갱신본 업로드', due: '2026-06-20', status: '재요청',   tone: 'alert'   as const },
  { label: '커뮤니티 합의서 제출',      due: '2026-06-25', status: '대기',     tone: 'neutral' as const },
  { label: '광권 갱신 증빙',            due: '2026-07-05', status: '대기',     tone: 'neutral' as const },
];

// 상태 배지 톤별 스타일 (components/Badge.tsx toneStyles와 동일 배색 유지).
const STATUS_TONE_CLS: Record<'warn' | 'alert' | 'neutral', string> = {
  alert:   'border-alert-border bg-alert-bg text-alert-text',
  warn:    'border-warn-border bg-warn-bg text-warn-text',
  neutral: 'border-ink-700 bg-ink-800 text-ink-400',
};

export default function PartnerDashboard() {
  const router = useRouter();

  return (
    // ── 오늘의 알림 — 홈 화면 유일 섹션. 전체 폭 활용 + 확대된 텍스트(text-base 이상) ──
    <section className="w-full">
      <div className="w-full rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="border-b border-ink-700 px-6 py-4">
          <div className="text-base font-bold text-ink-100">오늘의 알림</div>
          <div className="mt-0.5 text-base text-ink-500">제출 기한이 가까운 원청 요청 · 우선순위 순</div>
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
                className={`grid w-full grid-cols-[auto_2fr_1fr_auto_auto_auto] items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-ink-800/30 ${
                  isUrgent ? 'bg-alert-bg' : 'bg-white'
                }`}
              >
                {/* 순서 번호 */}
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                  isUrgent ? 'bg-alert-bg text-alert-text' :
                  isWarn   ? 'bg-warn-bg text-warn-text' :
                             'bg-ink-800 text-ink-400'
                }`}>
                  {idx + 1}
                </div>
                {/* 항목명 */}
                <div className={`min-w-0 truncate text-base font-bold ${isUrgent ? 'text-alert-text' : 'text-ink-100'}`}>
                  {item.label}
                </div>
                {/* 제출 기한 */}
                <div className="min-w-0 text-base text-ink-500">
                  제출 기한 <span className="num-mono">{item.due}</span>
                </div>
                {/* D-day */}
                <span className={`num-mono rounded-xs border px-2 py-0.5 text-base font-bold ${
                  isUrgent ? 'border-alert-border bg-alert-bg text-alert-text' :
                  isWarn   ? 'border-warn-border bg-warn-bg text-warn-text' :
                             'border-ok-border bg-ok-bg text-ok-text'
                }`}>
                  {ddayLabel}
                </span>
                {/* 상태 */}
                <span className={`inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 text-base font-semibold whitespace-nowrap ${STATUS_TONE_CLS[item.tone]}`}>
                  {item.status}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-600" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
