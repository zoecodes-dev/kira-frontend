'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import { getSupplierName, parts } from '@/lib/supplier-detail-data';
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock3, FileWarning,
  Send, ShieldAlert,
} from 'lucide-react';
import clsx from 'clsx';

type ActionStatus = 'open' | 'sent' | 'review' | 'resolved' | 'blocked';

const riskActions: Array<{
  id: string;
  title: string;
  supplierId: string;
  partId: string;
  type: string;
  status: ActionStatus;
  severity: 'critical' | 'high' | 'medium';
  owner: string;
  due: string;
  source: string;
  blocker: string;
  nextAction: string;
  timeline: string[];
}> = [
  {
    id: 'RA-001',
    title: 'FEOC 직접 지분 41.2% 확인',
    supplierId: 'S-REF-002',
    partId: 'PRT-009',
    type: 'FEOC',
    status: 'blocked',
    severity: 'critical',
    owner: '컴플라이언스 이서윤',
    due: '2026-05-30',
    source: '제출 자료 검토 SUB-2026-0512-003',
    blocker: 'DPP 발행 보류',
    nextAction: '대체 코발트 공급망 검토',
    timeline: ['자동 검증 실패', '보완 요청 발송', '지분 공시 원본 검토 중', '대체 공급망 검토 필요'],
  },
  {
    id: 'RA-002',
    title: '아동노동 감사 보고서 미제출',
    supplierId: 'S-MINE-002',
    partId: 'PRT-009',
    type: '인권 실사',
    status: 'sent',
    severity: 'high',
    owner: '구매실사 최하린',
    due: '2026-06-10',
    source: '공급망 실사 DD-2026-001',
    blocker: '조건부 승인',
    nextAction: '감사 보고서 원본 재요청',
    timeline: ['기한 초과 감지', '리마인드 2회 발송', 'CAPA 생성', '협력사 제출 대기'],
  },
  {
    id: 'RA-003',
    title: 'Conflict Minerals 원산지 추가 확인',
    supplierId: 'S-CAM-001',
    partId: 'PRT-005',
    type: '원산지',
    status: 'review',
    severity: 'medium',
    owner: 'ESG팀 김민재',
    due: '2026-06-03',
    source: '물질 관리 PRT-005',
    blocker: 'HITL 필요 가능',
    nextAction: '코발트 원산지 증빙 비교',
    timeline: ['물질 자료 제출', 'OCR 값 일치', '원산지 증명서 비교 필요'],
  },
  {
    id: 'RA-004',
    title: '공정도 4단계 문서 최신화',
    supplierId: 'S-CAM-001',
    partId: 'PRT-005',
    type: '문서 보완',
    status: 'resolved',
    severity: 'medium',
    owner: 'POS 품질팀',
    due: '2026-05-15',
    source: '공급망 실사 DD-2026-003',
    blocker: '없음',
    nextAction: '완료 증빙 보관',
    timeline: ['제3자 감사 발견', '보완 요청', '최신 공정도 업로드', '원청사 승인'],
  },
  {
    id: 'RA-005',
    title: '광산 좌표 폴리곤 미제출',
    supplierId: 'S-MINE-001',
    partId: 'PRT-008',
    type: 'Geo/EUDR',
    status: 'open',
    severity: 'high',
    owner: '공급망 데이터팀',
    due: '2026-06-07',
    source: '공급망 맵 노드 상세',
    blocker: 'EUDR 검증 지연',
    nextAction: '광산 경계 좌표 업로드 요청',
    timeline: ['누락 항목 감지', '조치 항목 생성'],
  },
];

const columns: Array<{ key: ActionStatus; label: string; tone: 'neutral' | 'info' | 'warn' | 'ok' | 'alert' }> = [
  { key: 'open', label: '미조치', tone: 'neutral' },
  { key: 'sent', label: '요청 발송', tone: 'warn' },
  { key: 'review', label: '검토 중', tone: 'info' },
  { key: 'resolved', label: '해결', tone: 'ok' },
  { key: 'blocked', label: '차단', tone: 'alert' },
];

const severityTone = {
  critical: 'alert',
  high: 'alert',
  medium: 'warn',
} as const;

export default function RiskActionsPage() {
  const [selectedId, setSelectedId] = useState(riskActions[0].id);
  const selected = riskActions.find(action => action.id === selectedId) ?? riskActions[0];
  const selectedSupplier = getSupplierName(selected.supplierId);
  const selectedPart = parts.find(part => part.id === selected.partId);

  const stats = useMemo(() => ({
    total: riskActions.length,
    blocked: riskActions.filter(item => item.status === 'blocked').length,
    dueSoon: riskActions.filter(item => item.status !== 'resolved').length,
    resolved: riskActions.filter(item => item.status === 'resolved').length,
  }), []);

  return (
    <>
      <PageHeader
        title="리스크 조치 보드"
        description="고위험 협력사와 자재 리스크를 액션 단위로 추적하는 화면"
        badge="P0"
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric label="전체 조치" value={stats.total} unit="건" tone="neutral" />
          <Metric label="차단" value={stats.blocked} unit="건" tone="alert" />
          <Metric label="진행 필요" value={stats.dueSoon} unit="건" tone="warn" />
          <Metric label="해결" value={stats.resolved} unit="건" tone="ok" />
        </div>

        <Card title="리스크 조치 흐름" subtitle="발견된 문제를 담당자·기한·상태가 있는 action item으로 관리">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {columns.map(col => (
              <div key={col.key} className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-3">
                <div className="flex items-center justify-between">
                  <Badge tone={col.tone}>{col.label}</Badge>
                  <span className="text-xs num-mono text-ink-400">{riskActions.filter(item => item.status === col.key).length}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 2xl:grid-cols-[1.5fr_1fr] gap-6">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
            {columns.map(column => (
              <div key={column.key} className="rounded-sm border border-ink-700 bg-ink-800/30 min-h-[420px]">
                <div className="px-3 py-3 border-b border-ink-700 flex items-center justify-between">
                  <Badge tone={column.tone}>{column.label}</Badge>
                  <span className="text-[11px] text-ink-500 num-mono">{riskActions.filter(item => item.status === column.key).length}</span>
                </div>
                <div className="p-2 space-y-2">
                  {riskActions.filter(item => item.status === column.key).map(action => {
                    const supplier = getSupplierName(action.supplierId);
                    return (
                      <button
                        key={action.id}
                        onClick={() => setSelectedId(action.id)}
                        className={clsx(
                          'w-full rounded-xs border p-3 text-left transition-colors',
                          selectedId === action.id ? 'border-accent-500/70 bg-accent-500/8' : 'border-ink-700/60 bg-ink-900/40 hover:bg-ink-800/60',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[11px] text-ink-500 num-mono">{action.id}</div>
                          <Badge tone={severityTone[action.severity]}>{action.severity}</Badge>
                        </div>
                        <div className="text-xs font-semibold text-ink-100 mt-2 leading-5">{action.title}</div>
                        <div className="text-[11px] text-ink-500 mt-2 truncate">{supplier?.nameEn ?? action.supplierId}</div>
                        <div className="mt-3 flex items-center gap-1 text-[10px] text-ink-500">
                          <Clock3 className="w-3 h-3" />
                          {action.due}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <Card
              title={selected.title}
              subtitle={`${selected.id} · ${selected.type}`}
              action={<Badge tone={severityTone[selected.severity]}>{selected.severity}</Badge>}
            >
              <div className="space-y-3 mb-5">
                <InfoRow label="협력사" value={selectedSupplier?.nameEn ?? selected.supplierId} />
                <InfoRow label="영향 자재" value={`${selectedPart?.partName ?? selected.partId} · ${selectedPart?.partCode ?? ''}`} />
                <InfoRow label="담당자" value={selected.owner} />
                <InfoRow label="마감일" value={selected.due} />
                <InfoRow label="출처" value={selected.source} />
                <InfoRow label="DPP 영향" value={selected.blocker} alert={selected.status === 'blocked'} />
              </div>

              <div className="rounded-xs border border-amber-700/30 bg-amber-500/5 p-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-ink-100">다음 조치</div>
                    <div className="text-xs text-ink-300 mt-1 leading-5">{selected.nextAction}</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="앞단 추적" subtitle="이 리스크가 어디서 발생했고 어떤 조치로 이어졌는지">
              <div className="space-y-3">
                {selected.timeline.map((item, index) => (
                  <div key={item} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full border border-ink-700 bg-ink-900 flex items-center justify-center text-[11px] num-mono text-accent-500 shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 border-b border-ink-700/40 pb-3 last:border-b-0">
                      <div className="text-sm text-ink-100">{item}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="조치 실행" subtitle="실제 운영 액션으로 연결되는 버튼">
              <div className="grid grid-cols-2 gap-2">
                <Action icon={Send} label="보완 요청" tone="warn" />
                <Action icon={FileWarning} label="HITL 요청" tone="neutral" />
                <Action icon={AlertTriangle} label="대체 공급망" tone="alert" />
                <Action icon={CheckCircle2} label="해결 처리" tone="ok" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: 'neutral' | 'ok' | 'warn' | 'alert' }) {
  const color = { neutral: 'text-ink-200', ok: 'text-emerald-400', warn: 'text-amber-400', alert: 'text-red-400' }[tone];
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className={clsx('text-2xl font-bold num-mono mt-2', color)}>{value}<span className="text-sm text-ink-500 ml-1">{unit}</span></div>
    </div>
  );
}

function InfoRow({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xs border border-ink-700/60 bg-ink-900/30 px-3 py-2">
      <span className="text-[10px] uppercase tracking-wider text-ink-500 shrink-0">{label}</span>
      <span className={clsx('text-xs text-right', alert ? 'text-red-400 font-semibold' : 'text-ink-200')}>{value}</span>
    </div>
  );
}

function Action({ icon: Icon, label, tone }: { icon: any; label: string; tone: 'ok' | 'warn' | 'alert' | 'neutral' }) {
  const style = {
    ok: 'border-emerald-700/40 text-emerald-500 hover:bg-emerald-500/10',
    warn: 'border-amber-700/40 text-amber-400 hover:bg-amber-500/10',
    alert: 'border-red-700/40 text-red-400 hover:bg-red-500/10',
    neutral: 'border-ink-700 text-ink-300 hover:bg-ink-800',
  }[tone];
  return (
    <button className={clsx('inline-flex items-center justify-center gap-2 rounded-xs border px-3 py-2 text-xs font-semibold transition-colors', style)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
