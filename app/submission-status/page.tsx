'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import { suppliers } from '@/lib/data';
import {
  getSupplierName, getContacts, getCompleteness, getRemindLogs,
  supplierCompleteness, remindLogs,
} from '@/lib/supplier-detail-data';
import {
  Search, CheckCircle2, Clock, AlertTriangle, Send, Bell,
  ChevronRight, Mail, Phone, BarChart2, RefreshCw, AlertCircle,
  XCircle,
} from 'lucide-react';
import clsx from 'clsx';

// ─── 완성도 → 상태 분류 ──────────────────────────────────────
function getSubmissionStatus(rate: number, missingCount: number): {
  label: string; color: string; bg: string; border: string; icon: any;
} {
  if (rate >= 100) return { label: '제출 완료', color: 'text-emerald-500', bg: 'bg-emerald-500/8', border: 'border-emerald-700/30', icon: CheckCircle2 };
  if (rate >= 80)  return { label: '입력 중',   color: 'text-blue-400',    bg: 'bg-blue-500/8',    border: 'border-blue-700/30',    icon: Clock };
  if (rate >= 50)  return { label: '부분 제출', color: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-700/30',   icon: AlertCircle };
  return             { label: '미제출',    color: 'text-red-400',     bg: 'bg-red-500/8',     border: 'border-red-700/30',     icon: XCircle };
}

// ─── KPI 타일 ─────────────────────────────────────────────────
function KpiTile({ label, value, unit, icon: Icon, tone, subLabel }: {
  label: string; value: number; unit?: string; icon: any;
  tone: 'ok' | 'warn' | 'critical' | 'neutral' | 'info'; subLabel?: string;
}) {
  const toneColor = {
    ok:       'text-emerald-400',
    warn:     'text-amber-400',
    critical: 'text-red-400',
    neutral:  'text-ink-300',
    info:     'text-blue-400',
  }[tone];
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={clsx('w-3.5 h-3.5', toneColor)} />
        <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">{label}</span>
      </div>
      <div className={clsx('text-2xl font-bold num-mono', toneColor)}>
        {value}<span className="text-sm text-ink-400 ml-1">{unit}</span>
      </div>
      {subLabel && <div className="text-[10px] text-ink-500 mt-0.5">{subLabel}</div>}
    </div>
  );
}

// ─── 리마인드 타입 메타 ───────────────────────────────────────
const remindTypeMeta: Record<string, { label: string; color: string }> = {
  initial:  { label: '최초 요청',   color: 'text-blue-400' },
  remind_1: { label: '1차 리마인드', color: 'text-amber-400' },
  remind_2: { label: '2차 리마인드', color: 'text-orange-400' },
  final:    { label: '최종 통보',   color: 'text-red-400' },
  response: { label: '응답 수신',   color: 'text-emerald-400' },
};

const remindStatusMeta: Record<string, { label: string; color: string }> = {
  sent:        { label: '발송됨',   color: 'text-ink-400' },
  opened:      { label: '열람됨',   color: 'text-blue-400' },
  in_progress: { label: '진행 중',  color: 'text-amber-400' },
  completed:   { label: '완료',     color: 'text-emerald-400' },
  overdue:     { label: '기한 초과', color: 'text-red-400' },
};

// ─── 협력사 행 ─────────────────────────────────────────────────
function SupplierSubmissionRow({
  supplierId, onSelect, isSelected,
}: { supplierId: string; onSelect: (id: string) => void; isSelected: boolean }) {
  const supplier = suppliers.find(s => s.id === supplierId);
  const name = getSupplierName(supplierId);
  const completeness = getCompleteness(supplierId);
  const contacts = getContacts(supplierId);
  const logs = getRemindLogs(supplierId);
  const primary = contacts.find(c => c.isPrimary) ?? contacts[0];
  if (!supplier || !completeness) return null;

  const st = getSubmissionStatus(completeness.completionRate, completeness.missingFields.length);
  const StatusIcon = st.icon;
  const lastLog = logs.at(-1);
  const overdueCount = logs.filter(l => l.status === 'overdue').length;

  return (
    <tr
      onClick={() => onSelect(supplierId)}
      className={clsx(
        'border-b border-ink-700/40 cursor-pointer transition-colors',
        isSelected
          ? 'bg-accent-500/8 border-l-2 border-l-accent-500'
          : 'hover:bg-ink-800/30',
      )}
    >
      {/* 협력사 */}
      <td className="px-4 py-3.5 min-w-[200px]">
        <div className="text-xs font-semibold text-ink-100 truncate">{name.en}</div>
        {name.ko && <div className="text-[10px] text-ink-500">{name.ko}</div>}
        <div className="text-[10px] text-ink-500">{supplier.role}</div>
      </td>

      {/* 완성도 */}
      <td className="px-4 py-3.5 min-w-[180px]">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1.5 bg-ink-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${completeness.completionRate}%`,
                backgroundColor:
                  completeness.completionRate >= 90 ? '#10B981' :
                  completeness.completionRate >= 70 ? '#F59E0B' : '#EF4444',
              }}
            />
          </div>
          <span className="text-[11px] font-semibold num-mono text-ink-200 w-9 text-right">
            {completeness.completionRate}%
          </span>
        </div>
        <div className="text-[10px] text-ink-500 num-mono">
          {completeness.filledFieldCount}/{completeness.requiredFieldCount} 필드
        </div>
      </td>

      {/* 상태 */}
      <td className="px-4 py-3.5">
        <div className={clsx(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-xs border text-[10px] font-semibold',
          st.bg, st.border, st.color,
        )}>
          <StatusIcon className="w-3 h-3" />
          {st.label}
        </div>
      </td>

      {/* 누락 항목 */}
      <td className="px-4 py-3.5">
        {completeness.missingFields.length > 0 ? (
          <div className="space-y-0.5">
            {completeness.missingFields.slice(0, 2).map((f, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] text-amber-400">
                <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                {f}
              </div>
            ))}
            {completeness.missingFields.length > 2 && (
              <div className="text-[10px] text-ink-500">+{completeness.missingFields.length - 2}건 더</div>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-emerald-500">모든 항목 완료</span>
        )}
      </td>

      {/* 담당자 */}
      <td className="px-4 py-3.5">
        {primary ? (
          <div>
            <div className="text-[11px] text-ink-200 font-medium">{primary.name}</div>
            <a href={`mailto:${primary.email}`} className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 truncate max-w-[140px]">
              <Mail className="w-2.5 h-2.5 shrink-0" />
              {primary.email}
            </a>
          </div>
        ) : <span className="text-[10px] text-ink-500">—</span>}
      </td>

      {/* 마지막 요청 */}
      <td className="px-4 py-3.5">
        {lastLog ? (
          <div>
            <div className={clsx('text-[10px] font-semibold', remindTypeMeta[lastLog.requestType]?.color)}>
              {remindTypeMeta[lastLog.requestType]?.label}
            </div>
            <div className="text-[10px] text-ink-500 num-mono">{lastLog.sentAt.slice(0, 10)}</div>
            {overdueCount > 0 && (
              <div className="text-[10px] text-red-400">{overdueCount}건 기한 초과</div>
            )}
          </div>
        ) : <span className="text-[10px] text-ink-500">요청 없음</span>}
      </td>

      {/* 마지막 갱신 */}
      <td className="px-4 py-3.5 text-[10px] text-ink-500 num-mono">
        {completeness.lastUpdatedAt}
      </td>

      <td className="px-4 py-3.5">
        <ChevronRight className="w-3.5 h-3.5 text-ink-600" />
      </td>
    </tr>
  );
}

// ─── 우측 상세 패널 ───────────────────────────────────────────
function DetailPanel({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const name = getSupplierName(supplierId);
  const completeness = getCompleteness(supplierId);
  const contacts = getContacts(supplierId);
  const logs = getRemindLogs(supplierId);
  const primary = contacts.find(c => c.isPrimary) ?? contacts[0];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  if (!completeness) return null;
  const st = getSubmissionStatus(completeness.completionRate, completeness.missingFields.length);

  return (
    <div className="flex flex-col h-full">
      {/* 패널 헤더 */}
      <div className="flex items-start justify-between p-5 border-b border-ink-700/60">
        <div>
          <div className="text-sm font-semibold text-ink-100">{name.en}</div>
          {name.ko && <div className="text-[11px] text-ink-400 mt-0.5">{name.ko}</div>}
          <div className={clsx(
            'inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-xs border text-[10px] font-semibold',
            st.bg, st.border, st.color,
          )}>
            {st.label}
          </div>
        </div>
        <button onClick={onClose} className="text-ink-500 hover:text-ink-300 transition-colors">
          <XCircle className="w-4 h-4" />
        </button>
      </div>

      {/* 완성도 */}
      <div className="p-5 border-b border-ink-700/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-ink-400 uppercase tracking-wider font-semibold">데이터 완성도</span>
          <span className={clsx(
            'text-xl font-bold num-mono',
            completeness.completionRate >= 90 ? 'text-emerald-400' :
            completeness.completionRate >= 70 ? 'text-amber-400' : 'text-red-400',
          )}>
            {completeness.completionRate}%
          </span>
        </div>
        <div className="h-2 bg-ink-700 rounded-xs overflow-hidden mb-1">
          <div
            className="h-full rounded-xs transition-all"
            style={{
              width: `${completeness.completionRate}%`,
              backgroundColor:
                completeness.completionRate >= 90 ? '#10B981' :
                completeness.completionRate >= 70 ? '#F59E0B' : '#EF4444',
            }}
          />
        </div>
        <div className="text-[10px] text-ink-500 num-mono">
          {completeness.filledFieldCount}/{completeness.requiredFieldCount} 필드 완료 · 마지막 갱신 {completeness.lastUpdatedAt}
        </div>

        {/* 누락 항목 */}
        {completeness.missingFields.length > 0 && (
          <div className="mt-3 rounded-xs border border-amber-700/30 bg-amber-500/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-amber-500 font-semibold mb-2">
              누락 항목 ({completeness.missingFields.length}개)
            </div>
            <div className="space-y-1">
              {completeness.missingFields.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-300">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 담당자 */}
      {primary && (
        <div className="p-5 border-b border-ink-700/60">
          <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-2">주 담당자</div>
          <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-3">
            <div className="text-xs font-semibold text-ink-100">{primary.name}</div>
            <div className="text-[10px] text-ink-500 mb-1.5">{primary.role} · {primary.department}</div>
            <a href={`mailto:${primary.email}`} className="flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300 mb-1">
              <Mail className="w-3 h-3" /> {primary.email}
            </a>
            <div className="flex items-center gap-1.5 text-[10px] text-ink-400">
              <Phone className="w-3 h-3" /> {primary.phone}
            </div>
          </div>
        </div>
      )}

      {/* 리마인드 이력 */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-3">
          요청·리마인드 이력 ({logs.length}건)
        </div>
        {logs.length === 0 ? (
          <div className="text-[11px] text-ink-500 text-center py-6 border border-dashed border-ink-700/40 rounded-xs">
            요청 이력이 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => {
              const tm = remindTypeMeta[log.requestType];
              const sm = remindStatusMeta[log.status];
              return (
                <div key={log.logId} className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={clsx('text-[10px] font-semibold', tm?.color)}>{tm?.label}</span>
                    <span className={clsx('text-[10px] font-medium', sm?.color)}>{sm?.label}</span>
                  </div>
                  <div className="text-[11px] text-ink-200 mb-0.5">{log.requestedField}</div>
                  <div className="text-[10px] text-ink-500 num-mono">
                    발송: {log.sentAt} · 마감: {log.dueDate}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="p-4 border-t border-ink-700/60 space-y-2">
        <button
          onClick={() => showToast(`${name.en}에 데이터 요청 발송 완료`)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xs bg-accent-700 hover:bg-accent-600 text-white text-xs font-semibold transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          데이터 요청 발송
        </button>
        <button
          onClick={() => showToast(`${name.en}에 리마인드 발송 완료`)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xs border border-ink-600 hover:border-ink-500 text-ink-200 text-xs font-medium transition-colors"
        >
          <Bell className="w-3.5 h-3.5" />
          리마인드 발송
        </button>
        <Link href={`/suppliers/${supplierId}`}>
          <button className="w-full flex items-center justify-center gap-2 py-2 rounded-xs border border-ink-700/40 hover:border-ink-600 text-ink-400 text-xs transition-colors mt-2">
            협력사 상세 페이지 보기
            <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
      </div>

      {/* 토스트 */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-ink-100 text-ink-900 text-xs font-semibold px-4 py-2.5 rounded-xs shadow-xl z-50">
          ✓ {toastMsg}
        </div>
      )}
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────
export default function SubmissionStatusPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'in_progress' | 'partial' | 'none'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allComps = supplierCompleteness;

  const filtered = useMemo(() => {
    let list = allComps;
    if (statusFilter === 'complete')     list = list.filter(c => c.completionRate >= 100);
    if (statusFilter === 'in_progress')  list = list.filter(c => c.completionRate >= 80 && c.completionRate < 100);
    if (statusFilter === 'partial')      list = list.filter(c => c.completionRate >= 50 && c.completionRate < 80);
    if (statusFilter === 'none')         list = list.filter(c => c.completionRate < 50);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => {
        const name = getSupplierName(c.supplierId);
        return name.en.toLowerCase().includes(q) || (name.ko || '').includes(q);
      });
    }
    return [...list].sort((a, b) => a.completionRate - b.completionRate);
  }, [allComps, statusFilter, search]);

  const avgCompletion = Math.round(allComps.reduce((s, c) => s + c.completionRate, 0) / allComps.length);
  const completeCount    = allComps.filter(c => c.completionRate >= 100).length;
  const inProgressCount  = allComps.filter(c => c.completionRate >= 80 && c.completionRate < 100).length;
  const overdueRemindCount = remindLogs.filter(r => r.status === 'overdue').length;
  const totalMissing = allComps.reduce((s, c) => s + c.missingFields.length, 0);

  return (
    <>
      <PageHeader
        title="입력 현황"
        description="협력사 데이터 제출 현황 · 리마인드 이력 · 원청사 확인 뷰"
        badge="원청사"
      />

      <div className={clsx('flex h-[calc(100vh-72px)]', selectedId ? 'divide-x divide-ink-700/60' : '')}>
        {/* 좌측 메인 */}
        <div className={clsx('flex flex-col', selectedId ? 'w-[60%]' : 'w-full')}>
          <div className="p-8 space-y-6 flex-1 overflow-y-auto">
            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiTile label="전체 평균 완성도" value={avgCompletion} unit="%" icon={BarChart2} tone="neutral" />
              <KpiTile label="제출 완료" value={completeCount} unit="개사" icon={CheckCircle2} tone="ok" />
              <KpiTile label="입력 진행 중" value={inProgressCount} unit="개사" icon={Clock} tone="info" />
              <KpiTile label="리마인드 기한 초과" value={overdueRemindCount} unit="건" icon={AlertTriangle} tone="critical" />
            </div>

            {/* 필터 & 검색 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-500" />
                <input
                  type="text"
                  placeholder="협력사명 검색"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 text-xs bg-ink-900 border border-ink-700/60 rounded-xs text-ink-100 placeholder-ink-500 focus:outline-none focus:border-accent-500"
                />
              </div>
              <div className="flex rounded-xs border border-ink-700/60 overflow-hidden">
                {([
                  ['all', '전체'],
                  ['complete', '완료'],
                  ['in_progress', '진행 중'],
                  ['partial', '부분'],
                  ['none', '미제출'],
                ] as const).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setStatusFilter(v)}
                    className={clsx(
                      'px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                      statusFilter === v ? 'bg-ink-700 text-ink-100' : 'text-ink-500 hover:text-ink-300',
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* 테이블 */}
            <div className="rounded-xs border border-ink-700/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ink-700/60 bg-ink-900/60">
                      {['협력사', '완성도', '상태', '누락 항목', '담당자', '마지막 요청', '갱신일', ''].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-ink-500 font-semibold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (
                      <SupplierSubmissionRow
                        key={c.supplierId}
                        supplierId={c.supplierId}
                        onSelect={id => setSelectedId(prev => prev === id ? null : id)}
                        isSelected={selectedId === c.supplierId}
                      />
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-ink-500">
                          검색 결과가 없습니다
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-[10px] text-ink-500">
              전체 {allComps.length}개사 · 누락 항목 합계 {totalMissing}건
            </div>
          </div>
        </div>

        {/* 우측 상세 패널 */}
        {selectedId && (
          <div className="w-[40%] shrink-0 overflow-y-auto">
            <DetailPanel supplierId={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </>
  );
}
