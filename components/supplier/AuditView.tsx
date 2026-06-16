'use client';

/**
 * AuditView.tsx — 실사 관리 화면
 * v3 Ⓔ: 1.실사(기록 입력) / 2.교육(교육 내용 기재·이력 관리)
 * 멘토링 6항 필수 필드: 단위 기간 · 실사 방식 · 실사 기록 내용 · 담당자 승인 이력
 */

import { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Filter,
  MapPin,
  MessageSquare,
  Users,
} from 'lucide-react';
import Badge from '@/components/Badge';
import AuditRegisterModal, { AuditFormData } from './AuditRegisterModal';
import clsx from 'clsx';

// ─── 타입 ──────────────────────────────────────────────────────────────────────

type AuditMethod = 'visit' | 'survey' | 'education' | 'remote';
type ApprovalStatus = 'approved' | 'pending' | 'none';

interface ApprovalStep {
  name: string;
  role: string;
  status: 'done' | 'pending' | 'waiting';
  date?: string;
  comment?: string;
}

interface AuditRecord {
  id: string;
  period: string;
  dateFrom: string;
  dateTo?: string;
  method: AuditMethod;
  targetCompany: string;
  accompanied: boolean;
  auditContent: string;
  educationContent?: string;
  recordedBy: string;
  recordedAt: string;
  approvalStatus: ApprovalStatus;
  approvalSteps: ApprovalStep[];
}

// ─── Mock Data ──────────────────────────────────────────────────────────────────

const MOCK_AUDITS: AuditRecord[] = [
  {
    id: 'audit-001',
    period: '2026 Q1',
    dateFrom: '2026-01-15',
    dateTo: '2026-01-17',
    method: 'visit',
    targetCompany: 'Quzhou Precursor Co., Ltd.',
    accompanied: true,
    auditContent: 'EUDR 대응 현장 실사 진행. 공장 내 원자재 입고 추적 시스템(lot tracking) 점검 완료. 산림 파괴 위험 구역 GPS 좌표 데이터 수집 및 검증. 현장 책임자 면담을 통해 공급원 변경 여부 확인. 특이사항 없음.',
    educationContent: 'EUDR §3 산림 파괴 방지 의무 교육 (60분). 참석자: 현장 담당자 8명. 교육 자료: EUDR_Compliance_Guide_2026.pdf 배포. 이수 확인서 수령 완료.',
    recordedBy: '김ESG',
    recordedAt: '2026-01-20',
    approvalStatus: 'approved',
    approvalSteps: [
      { name: '김ESG', role: 'ESG팀 담당', status: 'done', date: '2026-01-20', comment: '기록 작성 완료' },
      { name: '이팀장', role: 'ESG팀 팀장', status: 'done', date: '2026-01-22', comment: '내용 검토 후 승인' },
      { name: '박본부장', role: 'ESG본부장', status: 'done', date: '2026-01-24' },
    ],
  },
  {
    id: 'audit-002',
    period: '2026 Q1',
    dateFrom: '2026-02-08',
    method: 'survey',
    targetCompany: 'Sulawesi Mining Corp.',
    accompanied: false,
    auditContent: '인권 실사 설문 배포 및 회수. CSDDD §4 체크리스트 기준 점수 82/100. 미흡 항목: 강제노동 방지 정책 문서화(3점), 고충 처리 절차 공개(5점). 개선 요청 공문 발송 예정.',
    recordedBy: '이컴플라이언스',
    recordedAt: '2026-02-10',
    approvalStatus: 'pending',
    approvalSteps: [
      { name: '이컴플라이언스', role: 'ESG팀 담당', status: 'done', date: '2026-02-10', comment: '기록 작성 완료' },
      { name: '이팀장', role: 'ESG팀 팀장', status: 'pending' },
      { name: '박본부장', role: 'ESG본부장', status: 'waiting' },
    ],
  },
  {
    id: 'audit-003',
    period: '2025 Q4',
    dateFrom: '2025-11-20',
    dateTo: '2025-11-21',
    method: 'education',
    targetCompany: 'Ganzhou Rare Metals Co., Ltd.',
    accompanied: true,
    auditContent: 'IRA FEOC 대응 현장 점검 완료. 지분 구조 및 경영진 정보 확인. 신장 지역 광물 조달 여부 재확인 — 해당 없음 확인됨.',
    educationContent: 'IRA FEOC 대응 교육 및 원산지 증빙 제출 가이드라인 전달. 참석자: 현장 담당자 12명. 교육 시간: 90분.',
    recordedBy: '박실사',
    recordedAt: '2025-11-25',
    approvalStatus: 'approved',
    approvalSteps: [
      { name: '박실사', role: 'ESG팀 담당', status: 'done', date: '2025-11-25' },
      { name: '이팀장', role: 'ESG팀 팀장', status: 'done', date: '2025-11-27' },
      { name: '박본부장', role: 'ESG본부장', status: 'done', date: '2025-11-28' },
    ],
  },
];

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const METHOD_LABEL: Record<AuditMethod, string> = {
  visit:     '현장 방문',
  survey:    '설문 조사',
  education: '현장 교육',
  remote:    '화상 점검',
};

const METHOD_TONE: Record<AuditMethod, 'info' | 'ok' | 'warn' | 'neutral'> = {
  visit:     'info',
  survey:    'ok',
  education: 'warn',
  remote:    'neutral',
};

// ─── 서브: 승인 이력 타임라인 ─────────────────────────────────────────────────

function ApprovalTimeline({ steps }: { steps: ApprovalStep[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, idx) => (
        <div key={idx} className="flex gap-3">
          {/* 타임라인 선 + 점 */}
          <div className="flex flex-col items-center">
            <div className={clsx(
              'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
              step.status === 'done'    ? 'border-signal-ok bg-signal-ok/10' :
              step.status === 'pending' ? 'border-amber-400 bg-amber-50' :
                                          'border-ink-600 bg-white'
            )}>
              {step.status === 'done' ? (
                <CheckCircle2 className="h-3 w-3 text-signal-ok" strokeWidth={2.5} />
              ) : step.status === 'pending' ? (
                <Clock className="h-3 w-3 text-amber-500" strokeWidth={2.5} />
              ) : (
                <div className="h-2 w-2 rounded-full bg-ink-600" />
              )}
            </div>
            {idx < steps.length - 1 && (
              <div className={clsx('w-px flex-1 my-0.5', step.status === 'done' ? 'bg-signal-ok/30' : 'bg-ink-700')} style={{ minHeight: 16 }} />
            )}
          </div>
          {/* 내용 */}
          <div className="pb-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink-100">{step.name}</span>
              <span className="text-[10px] text-ink-500">{step.role}</span>
              {step.date && <span className="num-mono text-[10px] text-ink-500 ml-auto">{step.date}</span>}
            </div>
            {step.comment && (
              <div className="mt-0.5 text-[11px] text-ink-400">{step.comment}</div>
            )}
            {step.status === 'pending' && (
              <span className="mt-1 inline-block rounded-xs border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">승인 대기 중</span>
            )}
            {step.status === 'waiting' && (
              <span className="mt-1 inline-block rounded-xs border border-ink-700 bg-ink-800 px-1.5 py-0.5 text-[9px] font-bold text-ink-500">이전 단계 승인 후 진행</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 서브: 상세 패널 ──────────────────────────────────────────────────────────

function AuditDetailPanel({ record }: { record: AuditRecord }) {
  return (
    <div className="sticky top-4 flex flex-col overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
      {/* 패널 헤더 */}
      <div className="shrink-0 border-b border-ink-700 bg-accent-700 px-5 py-4">
        <div className="text-xs font-bold text-white">{record.targetCompany}</div>
        <div className="mt-0.5 text-[10px] text-accent-200">
          {record.period} · {METHOD_LABEL[record.method]}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 기본 정보 */}
        <div className="border-b border-ink-700 px-5 py-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ink-500">기본 정보</div>
          <div className="space-y-1.5">
            {[
              ['단위 기간', record.period],
              ['실사 일정', record.dateTo ? `${record.dateFrom} ~ ${record.dateTo}` : record.dateFrom],
              ['실사 방식', METHOD_LABEL[record.method]],
              ['원청사 동행', record.accompanied ? '동행' : '단독'],
              ['기록 담당', `${record.recordedBy} · ${record.recordedAt}`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start gap-2 text-[11px]">
                <span className="w-16 shrink-0 font-bold text-ink-500">{k}</span>
                <span className="text-ink-200">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 실사 기록 내용 */}
        <div className="border-b border-ink-700 px-5 py-4">
          <div className="mb-2 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-ink-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">실사 기록 내용</span>
          </div>
          <p className="rounded-xs border border-ink-700 bg-ink-800 px-3 py-2.5 text-[11px] leading-5 text-ink-300">
            {record.auditContent}
          </p>
        </div>

        {/* 교육 내용 */}
        {record.educationContent && (
          <div className="border-b border-ink-700 px-5 py-4">
            <div className="mb-2 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-ink-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">교육 내용</span>
              <span className="text-[9px] text-ink-600">v3 Ⓔ 2항</span>
            </div>
            <p className="rounded-xs border border-ink-700 bg-ink-800 px-3 py-2.5 text-[11px] leading-5 text-ink-300">
              {record.educationContent}
            </p>
          </div>
        )}

        {/* 담당자 승인 이력 — 멘토링 6항 필수 */}
        <div className="px-5 py-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-ink-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">담당자 승인 이력</span>
          </div>
          <ApprovalTimeline steps={record.approvalSteps} />
        </div>
      </div>

      {/* 하단 액션 */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-ink-700 bg-white px-5 py-3">
        <button
          type="button"
          onClick={() => alert('PDF 내보내기 (API 연동 예정)')}
          className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-[11px] font-semibold text-ink-400 hover:border-ink-500 hover:text-ink-200 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          PDF 내보내기
        </button>
        {record.approvalStatus === 'pending' && (
          <button
            type="button"
            onClick={() => alert('승인 요청 재발송 (API 연동 예정)')}
            className="inline-flex items-center gap-1.5 rounded-xs bg-accent-700 px-3 py-2 text-[11px] font-bold text-white shadow-control hover:bg-accent-900 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            승인 요청
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function AuditView({ supplierId }: { supplierId: string }) {
  const [records, setRecords]           = useState<AuditRecord[]>(MOCK_AUDITS);
  const [selectedId, setSelectedId]     = useState<string>(MOCK_AUDITS[0].id);
  const [filterMethod, setFilterMethod] = useState<AuditMethod | 'all'>('all');
  const [filterApproval, setFilterApproval] = useState<ApprovalStatus | 'all'>('all');
  const [modalOpen, setModalOpen]       = useState(false);

  // 필터 적용
  const filtered = records.filter(r => {
    if (filterMethod !== 'all' && r.method !== filterMethod) return false;
    if (filterApproval !== 'all' && r.approvalStatus !== filterApproval) return false;
    return true;
  });

  const selected = records.find(r => r.id === selectedId) ?? records[0];

  // 신규 등록 처리
  function handleRegister(data: AuditFormData) {
    const newRecord: AuditRecord = {
      id: `audit-${Date.now()}`,
      period: data.period,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo || undefined,
      method: data.method,
      targetCompany: data.targetCompany,
      accompanied: data.accompanied,
      auditContent: data.auditContent,
      educationContent: data.educationContent || undefined,
      recordedBy: '내 담당자',
      recordedAt: new Date().toISOString().split('T')[0],
      approvalStatus: 'pending',
      approvalSteps: [
        { name: '내 담당자', role: 'ESG팀 담당', status: 'done', date: new Date().toISOString().split('T')[0], comment: '기록 작성 완료' },
        { name: '이팀장', role: 'ESG팀 팀장', status: 'pending' },
        { name: '박본부장', role: 'ESG본부장', status: 'waiting' },
      ],
    };
    setRecords(prev => [newRecord, ...prev]);
    setSelectedId(newRecord.id);
  }

  return (
    <>
      <div className="space-y-4">

        {/* ── 헤더 ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-ink-100">실사 관리</h2>
            <p className="mt-1 text-xs text-ink-500">현장 실사 이력 조회 및 담당자 승인 · v3 Ⓔ 실사·교육</p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xs bg-accent-700 px-4 py-2 text-xs font-bold text-white shadow-control hover:bg-accent-900 transition-colors"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            신규 실사 등록
          </button>
        </div>

        {/* ── 필터 바 ── */}
        <div className="flex flex-wrap items-center gap-2 rounded-xs border border-ink-700 bg-white px-4 py-3">
          <Filter className="h-3.5 w-3.5 shrink-0 text-ink-500" />
          <span className="text-[10px] font-bold text-ink-500">실사 방식</span>
          {(['all', 'visit', 'survey', 'education', 'remote'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setFilterMethod(m)}
              className={clsx(
                'rounded-full border px-3 py-1 text-[10px] font-semibold transition-colors',
                filterMethod === m
                  ? 'border-accent-600 bg-accent-50 text-accent-700'
                  : 'border-ink-700 bg-white text-ink-400 hover:border-accent-400'
              )}
            >
              {m === 'all' ? '전체' : METHOD_LABEL[m]}
            </button>
          ))}
          <div className="h-4 w-px bg-ink-700" />
          <span className="text-[10px] font-bold text-ink-500">승인</span>
          {(['all', 'approved', 'pending'] as const).map(a => (
            <button
              key={a}
              type="button"
              onClick={() => setFilterApproval(a)}
              className={clsx(
                'rounded-full border px-3 py-1 text-[10px] font-semibold transition-colors',
                filterApproval === a
                  ? 'border-accent-600 bg-accent-50 text-accent-700'
                  : 'border-ink-700 bg-white text-ink-400 hover:border-accent-400'
              )}
            >
              {a === 'all' ? '전체' : a === 'approved' ? '승인 완료' : '승인 대기'}
            </button>
          ))}
        </div>

        {/* ── 메인 레이아웃: 목록 + 상세 패널 ── */}
        <div className="grid grid-cols-[1fr_360px] items-start gap-4">

          {/* 좌: 실사 이력 목록 */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-ink-700 bg-white py-12 text-center">
                <AlertCircle className="h-8 w-8 text-ink-600" strokeWidth={1.5} />
                <div className="text-xs font-semibold text-ink-500">해당하는 실사 이력이 없습니다.</div>
              </div>
            ) : (
              filtered.map(record => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedId(record.id)}
                  className={clsx(
                    'w-full rounded-sm border bg-white p-4 text-left transition-all',
                    selectedId === record.id
                      ? 'border-accent-500 shadow-[0_0_0_2px_theme(colors.accent.200)]'
                      : 'border-ink-700 hover:border-accent-300 hover:shadow-control'
                  )}
                >
                  {/* 카드 상단 */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="text-xs font-bold text-ink-100">
                        {record.period} · {record.dateFrom}{record.dateTo ? ` ~ ${record.dateTo}` : ''}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-500">
                        <MapPin className="h-3 w-3" />
                        {record.targetCompany}
                        {record.accompanied && <span className="rounded-xs border border-ink-600 bg-ink-800 px-1.5 py-0.5 text-[9px] font-semibold text-ink-400">원청 동행</span>}
                      </div>
                    </div>
                    <Badge tone={METHOD_TONE[record.method]}>{METHOD_LABEL[record.method]}</Badge>
                  </div>

                  {/* 내용 요약 */}
                  <p className="line-clamp-2 text-[11px] leading-5 text-ink-400 mb-2">
                    {record.auditContent}
                  </p>

                  {/* 하단 */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-ink-500">
                      담당: {record.recordedBy} · {record.recordedAt} 기록
                    </span>
                    <Badge tone={record.approvalStatus === 'approved' ? 'ok' : record.approvalStatus === 'pending' ? 'warn' : 'neutral'}>
                      {record.approvalStatus === 'approved' ? '승인 완료' : record.approvalStatus === 'pending' ? '승인 대기' : '미제출'}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* 우: 상세 패널 */}
          {selected && <AuditDetailPanel record={selected} />}
        </div>
      </div>

      {/* 신규 실사 등록 모달 */}
      <AuditRegisterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(data) => {
          handleRegister(data);
          setModalOpen(false);
        }}
      />
    </>
  );
}
