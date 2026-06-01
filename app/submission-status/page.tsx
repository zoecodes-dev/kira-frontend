'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import TopStatCard from '@/components/TopStatCard';
import Link from 'next/link';
import { suppliers } from '@/lib/data';
import {
  getSupplierName, getContacts, getCompleteness, getRemindLogs,
  supplierCompleteness, remindLogs, purchaseOrders, parts, factories,
} from '@/lib/supplier-detail-data';
import {
  Search, CheckCircle2, Clock, AlertTriangle, Send, Bell,
  ChevronRight, Mail, Phone, BarChart2, RefreshCw, AlertCircle,
  XCircle, FileCheck, Factory,
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
function KpiTile({ label, value, unit, icon: Icon, tone, subLabel, onClick, active }: {
  label: string; value: number; unit?: string; icon: any;
  tone: 'ok' | 'warn' | 'critical' | 'neutral' | 'info'; subLabel?: string;
  onClick?: () => void; active?: boolean;
}) {
  return <TopStatCard label={label} value={value} unit={unit} tone={tone} active={active} onClick={onClick} />;
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

function getPortalSubmissionSummary(supplierId: string) {
  const submittedPOs = purchaseOrders.filter(po => po.supplierId === supplierId).slice(0, 3);
  const linkedFactoryIds = new Set(submittedPOs.map(po => po.factoryId));
  const submittedFactories = factories.filter(f => linkedFactoryIds.has(f.factoryId));

  return {
    submittedAt: '2026-05-14 13:42',
    submittedBy: getContacts(supplierId).find(c => c.isPrimary) ?? getContacts(supplierId)[0],
    submittedPOs,
    submittedFactories,
    materials: [
      { name: '리튬', amount: '12.4 kg', recycled: '7%' },
      { name: '코발트', amount: '8.2 kg', recycled: '18%' },
      { name: '니켈', amount: '23.6 kg', recycled: '8%' },
    ],
    files: [
      { name: 'invoice_240514_NCM811.pdf', type: '거래 인보이스', status: '유효' },
      { name: 'origin_certificate_Co.pdf', type: '원산지 증명서', status: '유효' },
      { name: 'carbon_emission_report.pdf', type: '탄소배출 보고서', status: '검증 중' },
    ],
  };
}

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
        <div className="text-xs font-semibold text-ink-100 truncate">{name?.nameEn ?? ''}</div>
        {name?.nameKo && <div className="text-[10px] text-ink-500">{name.nameKo}</div>}
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
  const portalSubmission = getPortalSubmissionSummary(supplierId);

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
          <div className="text-sm font-semibold text-ink-100">{name?.nameEn ?? ''}</div>
          {name?.nameKo && <div className="text-[11px] text-ink-400 mt-0.5">{name.nameKo}</div>}
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

      {/* 포털 제출 내용 */}
      <div className="p-5 border-b border-ink-700/60">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">포털 제출 내용</div>
          <div className="text-[10px] text-ink-500 num-mono">{portalSubmission.submittedAt}</div>
        </div>
        <div className="rounded-xs border border-accent-700/30 bg-accent-500/5 p-3 mb-3">
          <div className="flex items-center gap-2 text-[11px] text-ink-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            협력사 포털 입력값이 원청사 확인 뷰에 반영됨
          </div>
          {portalSubmission.submittedBy && (
            <div className="text-[10px] text-ink-500 mt-1">
              제출 담당자: {portalSubmission.submittedBy.name} · {portalSubmission.submittedBy.email}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-ink-500 font-semibold mb-1.5">선택 PO</div>
            <div className="space-y-1">
              {portalSubmission.submittedPOs.length === 0 ? (
                <div className="text-[11px] text-ink-500">제출된 PO가 없습니다</div>
              ) : portalSubmission.submittedPOs.map(po => {
                const part = parts.find(p => p.id === po.partId);
                return (
                  <div key={po.poId} className="flex items-center justify-between rounded-xs border border-ink-700/60 bg-ink-900/40 px-2.5 py-1.5">
                    <div>
                      <div className="text-[11px] font-semibold text-ink-100 num-mono">{po.poId}</div>
                      <div className="text-[10px] text-ink-500">{part?.partName ?? po.partId}</div>
                    </div>
                    <div className="text-right text-[10px] text-ink-400 num-mono">
                      {po.quantity.toLocaleString()} {po.unit}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-ink-500 font-semibold mb-1.5">원자재 입력값</div>
            <div className="grid grid-cols-3 gap-1.5">
              {portalSubmission.materials.map(m => (
                <div key={m.name} className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-2">
                  <div className="text-[10px] text-ink-400">{m.name}</div>
                  <div className="text-xs text-ink-100 font-semibold num-mono">{m.amount}</div>
                  <div className="text-[10px] text-emerald-500">재활용 {m.recycled}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-ink-500 font-semibold mb-1.5">공장별 제출 대상</div>
            <div className="space-y-1">
              {portalSubmission.submittedFactories.map(f => (
                <div key={f.factoryId} className="flex items-center gap-2 rounded-xs border border-ink-700/60 bg-ink-900/40 px-2.5 py-1.5">
                  <Factory className="w-3 h-3 text-ink-500" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-ink-100 truncate">{f.factoryName}</div>
                    <div className="text-[10px] text-ink-500 truncate">{f.destinationDetail ?? f.address}</div>
                  </div>
                  {f.supplyRatioPercent !== undefined && (
                    <span className="text-[10px] num-mono text-accent-500 font-semibold">{f.supplyRatioPercent}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-ink-500 font-semibold mb-1.5">첨부 서류</div>
            <div className="space-y-1">
              {portalSubmission.files.map(file => (
                <div key={file.name} className="flex items-center gap-2 rounded-xs border border-ink-700/60 bg-ink-900/40 px-2.5 py-1.5">
                  <FileCheck className="w-3 h-3 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-ink-100 truncate">{file.name}</div>
                    <div className="text-[10px] text-ink-500">{file.type}</div>
                  </div>
                  <span className="text-[10px] text-emerald-500">{file.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
          onClick={() => showToast(`${name?.nameEn ?? ''}에 데이터 요청 발송 완료`)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xs bg-accent-700 hover:bg-accent-600 text-white text-xs font-semibold transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          데이터 요청 발송
        </button>
        <button
          onClick={() => showToast(`${name?.nameEn ?? ''}에 리마인드 발송 완료`)}
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'in_progress' | 'partial' | 'none' | 'overdue'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allComps = supplierCompleteness;

  const filtered = useMemo(() => {
    let list = allComps;
    const overdueSupplierIds = new Set(
      remindLogs.filter(r => r.status === 'overdue').map(r => r.supplierId),
    );
    if (statusFilter === 'complete')     list = list.filter(c => c.completionRate >= 100);
    if (statusFilter === 'in_progress')  list = list.filter(c => c.completionRate >= 80 && c.completionRate < 100);
    if (statusFilter === 'partial')      list = list.filter(c => c.completionRate >= 50 && c.completionRate < 80);
    if (statusFilter === 'none')         list = list.filter(c => c.completionRate < 50);
    if (statusFilter === 'overdue')      list = list.filter(c => overdueSupplierIds.has(c.supplierId));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => {
        const name = getSupplierName(c.supplierId);
        return (name?.nameEn ?? '').toLowerCase().includes(q) || (name?.nameKo || '').includes(q);
      });
    }
    return [...list].sort((a, b) => a.completionRate - b.completionRate);
  }, [allComps, statusFilter, search]);

  const avgCompletion = Math.round(allComps.reduce((s, c) => s + c.completionRate, 0) / allComps.length);
  const completeCount    = allComps.filter(c => c.completionRate >= 100).length;
  const inProgressCount  = allComps.filter(c => c.completionRate >= 80 && c.completionRate < 100).length;
  const overdueRemindCount = remindLogs.filter(r => r.status === 'overdue').length;
  const totalMissing = allComps.reduce((s, c) => s + c.missingFields.length, 0);
  const portalSubmissionRows = ['S-CAM-001', 'S-CELL-001'].map(supplierId => {
    const name = getSupplierName(supplierId);
    const summary = getPortalSubmissionSummary(supplierId);
    return {
      supplierId,
      name: name?.nameEn ?? supplierId,
      nameKo: name?.nameKo,
      summary,
    };
  });

  return (
    <>
      <PageHeader
        title="입력 현황"
        description="협력사 데이터 제출 현황 · 리마인드 이력 · 원청사 확인 뷰"
        badge="원청사"
      />

      <div className={clsx('flex h-[calc(100vh-72px)] overflow-hidden', selectedId ? 'divide-x divide-ink-700/60' : '')}>
        {/* 좌측 메인 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="p-8 space-y-6 flex-1 overflow-auto">
            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiTile label="전체 평균 완성도" value={avgCompletion} unit="%" icon={BarChart2} tone="neutral" onClick={() => setStatusFilter('all')} active={statusFilter === 'all'} />
              <KpiTile label="제출 완료" value={completeCount} unit="개사" icon={CheckCircle2} tone="ok" onClick={() => setStatusFilter('complete')} active={statusFilter === 'complete'} />
              <KpiTile label="입력 진행 중" value={inProgressCount} unit="개사" icon={Clock} tone="info" onClick={() => setStatusFilter('in_progress')} active={statusFilter === 'in_progress'} />
              <KpiTile label="리마인드 기한 초과" value={overdueRemindCount} unit="건" icon={AlertTriangle} tone="critical" onClick={() => setStatusFilter('overdue')} active={statusFilter === 'overdue'} />
            </div>

            {/* 포털 제출 내용 */}
            <section className="rounded-xs border border-ink-700/60 bg-ink-900/30 overflow-x-auto">
              <div className="min-w-[960px]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700/60 bg-ink-900/50">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">포털 제출 내용</div>
                  <div className="text-xs text-ink-300 mt-0.5">협력사 포털에서 작성된 입력값을 원청사가 검토하는 영역</div>
                </div>
                <div className="text-[10px] text-ink-500 num-mono">최근 제출 {portalSubmissionRows.length}건</div>
              </div>

              <div className="divide-y divide-ink-700/40">
                {portalSubmissionRows.map(row => (
                  <button
                    key={row.supplierId}
                    onClick={() => setSelectedId(row.supplierId)}
                    className="w-full text-left grid grid-cols-[1.4fr_1fr_1.4fr_1fr_auto] gap-4 items-center px-4 py-3 hover:bg-ink-800/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink-100 truncate">{row.name}</div>
                      {row.nameKo && <div className="text-[10px] text-ink-500 truncate">{row.nameKo}</div>}
                    </div>
                    <div>
                      <div className="text-[10px] text-ink-500">제출 PO</div>
                      <div className="text-xs text-ink-200 num-mono">{row.summary.submittedPOs.map(po => po.poId).join(', ') || '—'}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-ink-500">공장</div>
                      <div className="text-xs text-ink-200 truncate">
                        {row.summary.submittedFactories.map(f => f.factoryName).join(' · ') || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-ink-500">첨부 서류</div>
                      <div className="flex items-center gap-1 text-xs text-emerald-500">
                        <FileCheck className="w-3 h-3" />
                        {row.summary.files.length}건
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[10px] text-ink-500 num-mono">{row.summary.submittedAt}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-ink-600" />
                    </div>
                  </button>
                ))}
              </div>
              </div>
            </section>

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
                  ['overdue', '기한 초과'],
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
                <table className="w-full min-w-[1120px]">
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
          <div className="w-[400px] shrink-0 overflow-y-auto">
            <DetailPanel supplierId={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </>
  );
}
