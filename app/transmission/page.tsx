'use client';

import { useState } from 'react';
import clsx from 'clsx';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Globe,
  Landmark,
  Plus,
  Send,
  XCircle,
} from 'lucide-react';
import Badge from '@/components/Badge';
import PageHeader from '@/components/PageHeader';
import TopStatCard from '@/components/TopStatCard';

type Channel = 'customer' | 'authority' | 'supplier';
type TxStatus = 'pending' | 'sent' | 'confirmed' | 'failed';

interface Transmission {
  id: string;
  channel: Channel;
  recipient: string;
  recipientType: string;
  subject: string;
  type: string;
  status: TxStatus;
  sentAt: string | null;
  confirmedAt: string | null;
  relatedId: string;
  content: string;
}

const transmissions: Transmission[] = [
  {
    id: 'TX-2026-011',
    channel: 'customer',
    recipient: 'BMW AG',
    recipientType: 'OEM',
    subject: 'BMW iX3 DPP 발행 완료 통보',
    type: 'DPP 발행',
    status: 'confirmed',
    sentAt: '2026-06-10 10:05',
    confirmedAt: '2026-06-10 14:23',
    relatedId: 'DPP-IX3-20260610',
    content: 'BMW iX3 Cylindrical NCM811 108Ah 배터리 DPP가 발행되었습니다. QR코드와 적합성 요약을 첨부합니다.',
  },
  {
    id: 'TX-2026-012',
    channel: 'customer',
    recipient: 'Mercedes-Benz AG',
    recipientType: 'OEM',
    subject: 'GLC EV DPP 발행 보류 안내',
    type: 'DPP 보류',
    status: 'sent',
    sentAt: '2026-06-11 09:30',
    confirmedAt: null,
    relatedId: 'BATCH-2026-042',
    content: 'FEOC 문서 검토 지연으로 DPP 발행이 보류되었습니다. 해결 예상 일정은 2026-06-20입니다.',
  },
  {
    id: 'TX-2026-013',
    channel: 'customer',
    recipient: 'BMW AG',
    recipientType: 'OEM',
    subject: 'i4 HITL 검토 결과 안내',
    type: 'HITL 결과',
    status: 'confirmed',
    sentAt: '2026-06-08 14:15',
    confirmedAt: '2026-06-09 08:40',
    relatedId: 'HITL-2026-031',
    content: 'BMW i4 배터리 HITL 검토가 완료되었습니다. 전구체 원산지 추가 확인 후 DPP 발행 예정입니다.',
  },
  {
    id: 'TX-2026-021',
    channel: 'authority',
    recipient: 'US CBP (관세국경보호청)',
    recipientType: '규제당국',
    subject: 'UFLPA 규정 준수 증빙 제출 — Batch 042',
    type: 'UFLPA 제출',
    status: 'sent',
    sentAt: '2026-06-11 11:00',
    confirmedAt: null,
    relatedId: 'BATCH-2026-042',
    content: 'UFLPA 적용 배치(BATCH-2026-042)에 대한 공급망 추적 증빙 및 실사 기록을 제출합니다.',
  },
  {
    id: 'TX-2026-022',
    channel: 'authority',
    recipient: 'EU Battery Regulation 보고기관',
    recipientType: '규제당국',
    subject: 'EU 배터리법 Art.47 Due Diligence 보고',
    type: 'EU 규정 제출',
    status: 'confirmed',
    sentAt: '2026-05-30 09:00',
    confirmedAt: '2026-06-02 16:00',
    relatedId: 'DD-2026-001',
    content: 'EU 배터리법 제47조에 따른 공급망 실사 보고서 및 CAPA 진행 현황을 제출합니다.',
  },
  {
    id: 'TX-2026-023',
    channel: 'authority',
    recipient: 'IRS (미국 국세청)',
    recipientType: '규제당국',
    subject: 'IRA AMPC 크레딧 신청 서류 제출',
    type: 'IRA 세액공제',
    status: 'failed',
    sentAt: '2026-06-05 10:30',
    confirmedAt: null,
    relatedId: 'DPP-IX3-20260610',
    content: 'IRA §45X AMPC 세액공제 신청을 위한 배터리 제조 증빙 서류를 제출합니다.',
  },
  {
    id: 'TX-2026-031',
    channel: 'supplier',
    recipient: 'Ganzhou Rare Metals',
    recipientType: 'T2 정련소',
    subject: 'FEOC 지분 구조 보완 요청',
    type: '보완 요청',
    status: 'sent',
    sentAt: '2026-06-10 15:00',
    confirmedAt: null,
    relatedId: 'RA-001',
    content: 'FEOC 직접 지분 41.2% 관련 원본 증빙 및 지분 구조 관계도 제출을 2026-06-13까지 요청합니다.',
  },
  {
    id: 'TX-2026-032',
    channel: 'supplier',
    recipient: 'Katanga Cobalt Mines',
    recipientType: 'T3 광산',
    subject: 'CAPA 이행 리마인더 (2차)',
    type: '리마인더',
    status: 'confirmed',
    sentAt: '2026-06-01 09:00',
    confirmedAt: '2026-06-01 11:32',
    relatedId: 'DD-2026-001',
    content: '아동노동 감사 원본 제출 기한(2026-06-10)이 다가오고 있습니다. 미제출 시 조달 중단 검토를 진행합니다.',
  },
  {
    id: 'TX-2026-033',
    channel: 'supplier',
    recipient: 'PT Vale Indonesia',
    recipientType: 'T2 제련소',
    subject: '정기 공급망 데이터 제출 요청',
    type: '정기 요청',
    status: 'pending',
    sentAt: null,
    confirmedAt: null,
    relatedId: 'BATCH-2026-044',
    content: '2026년 2분기 니켈 공급량 및 원산지 증빙 데이터 제출을 요청합니다.',
  },
];

const channels: Array<{ key: Channel; label: string; icon: typeof Globe }> = [
  { key: 'customer', label: '고객사', icon: Building2 },
  { key: 'authority', label: '규제당국', icon: Landmark },
  { key: 'supplier', label: '협력사', icon: Globe },
];

const statusMeta: Record<TxStatus, { label: string; tone: 'ok' | 'warn' | 'alert' | 'neutral'; icon: typeof CheckCircle2 }> = {
  pending: { label: '발송 대기', tone: 'neutral', icon: Clock },
  sent: { label: '발송됨', tone: 'warn', icon: Send },
  confirmed: { label: '확인됨', tone: 'ok', icon: CheckCircle2 },
  failed: { label: '실패', tone: 'alert', icon: XCircle },
};

export default function TransmissionPage() {
  const [activeChannel, setActiveChannel] = useState<Channel>('customer');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = transmissions.filter(t => t.channel === activeChannel);

  const stats = {
    total: transmissions.length,
    pending: transmissions.filter(t => t.status === 'pending').length,
    sent: transmissions.filter(t => t.status === 'sent').length,
    confirmed: transmissions.filter(t => t.status === 'confirmed').length,
    failed: transmissions.filter(t => t.status === 'failed').length,
  };

  return (
    <>
      <PageHeader
        title="대외 전송"
        description="고객사·규제당국·협력사에 발신한 DPP 결과·규정 증빙·보완 요청을 추적합니다."
        badge="전송"
        actions={
          <button
            type="button"
            onClick={() => window.alert('전송 작성 기능은 준비 중입니다.')}
            className="inline-flex items-center gap-2 rounded-xs border border-accent-700/40 bg-accent-50 px-3 py-2 text-xs font-bold text-accent-700 hover:border-accent-600 hover:bg-accent-100"
          >
            <Plus className="h-3.5 w-3.5" />
            신규 전송
          </button>
        }
      />

      <main className="space-y-5 p-6">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <TopStatCard label="전체 전송" value={stats.total} unit="건" tone="neutral" />
          <TopStatCard label="발송 대기" value={stats.pending} unit="건" tone="neutral" />
          <TopStatCard label="발송됨 (미확인)" value={stats.sent} unit="건" tone="warn" />
          <TopStatCard label="확인 완료" value={stats.confirmed} unit="건" tone="ok" />
        </section>

        {stats.failed > 0 && (
          <div className="flex items-center gap-3 rounded-xs border border-red-200 bg-red-50 px-4 py-3">
            <XCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span className="text-sm font-semibold text-red-800">발송 실패 {stats.failed}건이 있습니다. 재시도가 필요합니다.</span>
          </div>
        )}

        <section className="rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="flex border-b border-ink-700">
            {channels.map(ch => {
              const Icon = ch.icon;
              const count = transmissions.filter(t => t.channel === ch.key).length;
              return (
                <button
                  key={ch.key}
                  type="button"
                  onClick={() => setActiveChannel(ch.key)}
                  className={clsx(
                    'flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors',
                    activeChannel === ch.key
                      ? 'border-accent-600 text-accent-700 bg-accent-50/40'
                      : 'border-transparent text-ink-400 hover:text-ink-100 hover:bg-slate-50',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {ch.label}
                  <span className={clsx(
                    'rounded-full px-1.5 py-0.5 text-xs num-mono',
                    activeChannel === ch.key ? 'bg-accent-100 text-accent-700' : 'bg-ink-800 text-ink-400',
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-700/40 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-bold text-ink-500">수신자</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-500">제목</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-500">유형</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-500">상태</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-500">발송일시</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-500">관련 ID</th>
                <th className="w-8 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/30">
              {filtered.map(tx => {
                const meta = statusMeta[tx.status];
                const Icon = meta.icon;
                const isExpanded = expandedId === tx.id;
                return (
                  <>
                    <tr
                      key={tx.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                    >
                      <td className="px-5 py-3">
                        <div className="text-[15px] font-semibold text-ink-100">{tx.recipient}</div>
                        <div className="text-xs text-ink-500">{tx.recipientType}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-200">{tx.subject}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-xs border border-ink-700 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-ink-400">
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <Icon className={clsx('h-3.5 w-3.5', {
                            'text-emerald-600': tx.status === 'confirmed',
                            'text-amber-500': tx.status === 'sent',
                            'text-red-600': tx.status === 'failed',
                            'text-ink-400': tx.status === 'pending',
                          })} />
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-400 num-mono">
                        {tx.sentAt ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-400 num-mono">{tx.relatedId}</td>
                      <td className="px-2 py-3">
                        <ChevronDown className={clsx('h-4 w-4 text-ink-500 transition-transform', isExpanded && 'rotate-180')} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${tx.id}-detail`} className="bg-slate-50/60">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs font-bold text-ink-500 mb-1">전송 내용</div>
                              <p className="text-sm text-ink-200 leading-6 rounded-xs border border-ink-700 bg-white px-3 py-2">
                                {tx.content}
                              </p>
                            </div>
                            <div className="flex items-center gap-6 text-sm text-ink-400">
                              {tx.sentAt && <span>발송: <span className="num-mono">{tx.sentAt}</span></span>}
                              {tx.confirmedAt && <span>확인: <span className="num-mono text-emerald-600">{tx.confirmedAt}</span></span>}
                            </div>
                            <div className="flex gap-2">
                              {tx.status === 'failed' && (
                                <button
                                  type="button"
                                  onClick={() => window.alert('재발송 요청이 접수되었습니다.')}
                                  className="inline-flex items-center gap-2 rounded-xs bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  재발송
                                </button>
                              )}
                              {tx.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => window.alert('발송 처리되었습니다.')}
                                  className="inline-flex items-center gap-2 rounded-xs bg-accent-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-600"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  즉시 발송
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => window.alert('전송 내역을 다운로드합니다.')}
                                className="inline-flex items-center gap-2 rounded-xs border border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-400 hover:border-accent-600 hover:text-accent-700"
                              >
                                <Download className="h-3.5 w-3.5" />
                                내역 저장
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
