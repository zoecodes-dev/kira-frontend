'use client';

// 협력사 홈/대시보드 (/partner) — '오늘의 알림' 단일 섹션.
//  ① 상단 종합 카운트 보드(프론트 집계)  ② calcDeadlineDDay(오늘 기준 D-Day/연체)
//  ③ 실 data_request(getDataRequests) 매핑 + 내 기업 정보 섹션 딥링크(?section=).
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { calcDeadlineDDay } from './partnerFormatters';
import { getDataRequests, type ApiDataRequest } from '@/lib/api';
import { usePartnerWorkspace } from './PartnerWorkspaceContext';

// 백엔드 requested_data_type(키) → 표시 라벨 + 내 기업 정보(company-info) 섹션 딥링크 키.
// 섹션 키는 SupplierGeneralReview.tsx의 sections[].key(id="section-키")와 1:1.
const REQUEST_META: Record<string, { label: string; section: string }> = {
  esg_saq:              { label: 'ESG 실사 자가진단 보고서(SAQ) 제출',        section: 'regulation' },
  pcf_energy:           { label: '제품 탄소발자국(PCF) 및 에너지 사용량 등록', section: 'regulation' },
  material_composition: { label: '제품 소재 구성 명세서 제출',                section: 'materials' },
  factory_info:         { label: '공장 정보 입력하기',                        section: 'factories' },
  general_info:         { label: '원청사 정보 입력 요청',                    section: 'company' },
};

// 카운트 보드 4분류(파생 상태)
type DerivedStatus = '연체' | '제출 필요' | '재요청' | '검토 대기';

// submission_status(+연체 여부) → 파생 상태. 연체(마감 초과)가 최우선.
function deriveStatus(submissionStatus: string | null, isOverdue: boolean): DerivedStatus {
  if (isOverdue) return '연체';
  if (submissionStatus === 'submission_rework') return '재요청';
  if (submissionStatus === 'submission_submitted' || submissionStatus === 'submission_review') return '검토 대기';
  return '제출 필요';
}

const STATUS_TONE_CLS: Record<DerivedStatus, string> = {
  '연체':      'border-alert-border bg-alert-bg text-alert-text',
  '제출 필요': 'border-warn-border bg-warn-bg text-warn-text',
  '재요청':    'border-alert-border bg-alert-bg text-alert-text',
  '검토 대기': 'border-ink-700 bg-ink-800 text-ink-400',
};

const COUNT_DEFS: { key: DerivedStatus; icon: string; cls: string }[] = [
  { key: '연체',      icon: '🚨', cls: 'text-alert-text' },
  { key: '제출 필요', icon: '📝', cls: 'text-warn-text' },
  { key: '재요청',    icon: '🔄', cls: 'text-alert-text' },
  { key: '검토 대기', icon: '⏳', cls: 'text-ink-300' },
];

interface Row {
  requestId: string;
  label: string;
  section: string;
  due: string;
  dday: ReturnType<typeof calcDeadlineDDay>;
  status: DerivedStatus;
}

export default function PartnerDashboard() {
  const router = useRouter();
  const { supplierUuid } = usePartnerWorkspace();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // 실 백엔드 data_request 로드 → 알려진 4개 타입만 매핑 → 마감 임박순 정렬.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const reqs = await getDataRequests({ supplierId: supplierUuid });
        const mapped: Row[] = (reqs ?? [])
          .filter((r: ApiDataRequest) => !!r.requestedDataType && !!REQUEST_META[r.requestedDataType])
          .map((r: ApiDataRequest): Row => {
            const meta = REQUEST_META[r.requestedDataType as string];
            const dday = r.dueDate
              ? calcDeadlineDDay(r.dueDate)
              : { label: '-', days: Number.POSITIVE_INFINITY, state: 'future' as const };
            return {
              requestId: r.requestId,
              label: meta.label,
              section: meta.section,
              due: r.dueDate ?? '',
              dday,
              status: deriveStatus(r.submissionStatus, dday.state === 'overdue'),
            };
          })
          .sort((a, b) => a.dday.days - b.dday.days); // 마감 임박(작은 days) 우선
        if (!cancelled) setRows(mapped);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supplierUuid]);

  // ① 프론트 집계 — 상태별 카운트(reduce)
  const counts = useMemo(
    () =>
      rows.reduce<Record<DerivedStatus, number>>(
        (acc, r) => { acc[r.status] += 1; return acc; },
        { '연체': 0, '제출 필요': 0, '재요청': 0, '검토 대기': 0 },
      ),
    [rows],
  );

  return (
    // ── 오늘의 알림 — 홈 화면 유일 섹션 ──
    <section className="w-full">
      <div className="w-full rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="border-b border-ink-700 px-6 py-4">
          <div className="text-base font-bold text-ink-100">오늘의 알림</div>
          <div className="mt-0.5 text-base text-ink-500">제출 기한이 가까운 원청 요청 · 우선순위 순</div>
        </div>

        {/* ── ① 종합 Status 카운트 보드 ── */}
        <div className="grid grid-cols-2 gap-3 border-b border-ink-700 bg-ink-800/40 px-6 py-4 sm:grid-cols-4">
          {COUNT_DEFS.map(def => (
            <div key={def.key} className="flex items-center justify-between rounded-xs border border-ink-700 bg-white px-4 py-3">
              <span className="text-base font-semibold text-ink-500">
                <span className="mr-1.5">{def.icon}</span>{def.key}
              </span>
              <span className={`num-mono text-lg font-bold ${def.cls}`}>{counts[def.key]}건</span>
            </div>
          ))}
        </div>

        {/* ── 개별 알림 리스트 ── */}
        <div className="divide-y divide-ink-800">
          {loading ? (
            <div className="px-6 py-10 text-center text-base text-ink-500">불러오는 중…</div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-10 text-center text-base text-ink-500">표시할 알림이 없습니다.</div>
          ) : (
            rows.map((r, idx) => {
              const overdue = r.dday.state === 'overdue';
              const isDday  = r.dday.state === 'dday';
              return (
                <button
                  key={r.requestId}
                  type="button"
                  onClick={() => router.push(`/partner/company-info?section=${r.section}`)}
                  className={`grid w-full grid-cols-[auto_2fr_1fr_auto_auto_auto] items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-ink-800/30 ${
                    overdue ? 'bg-alert-bg' : 'bg-white'
                  }`}
                >
                  {/* 순서 번호 */}
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                    overdue ? 'bg-alert-bg text-alert-text' : 'bg-ink-800 text-ink-400'
                  }`}>
                    {idx + 1}
                  </div>
                  {/* 항목명 */}
                  <div className={`min-w-0 truncate text-base font-bold ${overdue ? 'text-alert-text' : 'text-ink-100'}`}>
                    {r.label}
                  </div>
                  {/* 제출 기한 */}
                  <div className="min-w-0 text-base text-ink-500">
                    제출 기한 <span className="num-mono">{r.due ? r.due.slice(0, 10) : '-'}</span>
                  </div>
                  {/* D-Day — overdue/D-Day는 Red 강조 */}
                  <span className={`num-mono rounded-xs border px-2 py-0.5 text-base font-bold ${
                    overdue || isDday
                      ? 'border-alert-border bg-alert-bg text-alert-text'
                      : 'border-ok-border bg-ok-bg text-ok-text'
                  }`}>
                    {r.dday.label}
                  </span>
                  {/* 상태 — overdue면 deriveStatus가 '연체'로 강제 */}
                  <span className={`inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 text-base font-semibold whitespace-nowrap ${STATUS_TONE_CLS[r.status]}`}>
                    {r.status}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-600" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
