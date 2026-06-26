'use client';

// 협력사 입력 현황 개요 보드 — 협력사별 입력률·누락·검토 상태를 한눈에 본다.
// /suppliers/check-info(인덱스)와 My Task 탭에서 공용으로 사용.
//   embedded=false → 자체 페이지 래퍼(제목·배경 포함)
//   embedded=true  → My Task 탭 등에 끼워 넣는 본문만(요약카드 + 표)
import Link from 'next/link';
import clsx from 'clsx';
import { ChevronRight, Send } from 'lucide-react';
import { suppliers } from '@/lib/data';
import { getRemindLogs, getSupplierName, supplierCompleteness } from '@/lib/supplier-detail-data';

function inputStatusMeta(rate: number, missingCount: number, reminderCount: number) {
  if (missingCount === 0) {
    return { label: '완료', className: 'border-ok-border bg-ok-bg text-ok-text' };
  }
  if (reminderCount >= 2) {
    return { label: '보완 지연', className: 'border-alert-border bg-alert-bg text-alert-text' };
  }
  if (rate >= 80) {
    return { label: '검토 대기', className: 'border-warn-border bg-warn-bg text-warn-text' };
  }
  return { label: '작성중', className: 'border-info-border bg-info-bg text-info-text' };
}

export default function SupplierInputStatusBoard({ embedded = false }: { embedded?: boolean }) {
  const rows = supplierCompleteness
    .map(item => {
      const supplier = suppliers.find(entry => entry.id === item.supplierId);
      const name = getSupplierName(item.supplierId);
      const reminders = getRemindLogs(item.supplierId);
      const status = inputStatusMeta(item.completionRate, item.missingFields.length, reminders.length);
      return { ...item, supplier, name, status };
    })
    .sort((a, b) => {
      if (a.missingFields.length !== b.missingFields.length) return b.missingFields.length - a.missingFields.length;
      return a.completionRate - b.completionRate;
    });

  const pendingCount = rows.filter(row => row.missingFields.length > 0).length;
  const reviewCount = rows.filter(row => row.status.label === '검토 대기').length;
  const delayedCount = rows.filter(row => row.status.label === '보완 지연').length;
  const avgRate = rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.completionRate, 0) / rows.length) : 0;

  const body = (
    <>
      {!embedded && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-100">협력사 입력 현황</h1>
            <p className="mt-2 text-sm text-ink-500">작성중이거나 검토가 필요한 협력사를 선택해 상세 수집 현황을 확인합니다.</p>
          </div>
          <Link
            href="/supply-chain/map"
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-ink-700 bg-white px-3 text-sm font-semibold text-ink-500 shadow-control hover:border-accent-200 hover:text-accent-700"
          >
            <Send className="h-4 w-4" />
            공급망 맵에서 요청
          </Link>
        </div>
      )}

      <section className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          { label: '전체 협력사', value: rows.length, tone: 'text-ink-100' },
          { label: '작성중/누락', value: pendingCount, tone: 'text-info-text' },
          { label: '검토 대기', value: reviewCount, tone: 'text-warn-text' },
          { label: '보완 지연', value: delayedCount, tone: 'text-alert-text' },
        ].map(item => (
          <div key={item.label} className="rounded-sm border border-ink-700 bg-white px-4 py-3 shadow-control">
            <div className="text-xs font-semibold text-ink-500">{item.label}</div>
            <div className={clsx('mt-2 text-2xl font-bold num-mono', item.tone)}>{item.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 bg-slate-50 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink-100">작성중인 협력사</h2>
            <p className="mt-1 text-sm text-ink-500">평균 입력률 {avgRate}% · 누락 항목이 많은 순으로 정렬</p>
          </div>
          <div className="text-sm font-medium text-ink-500">협력사명 또는 검토 버튼을 누르면 상세 화면으로 이동합니다.</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px]">
            <thead className="border-b border-ink-700 bg-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">협력사</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">Tier</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">국가</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">입력률</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">상태</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">누락 항목</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">최근 업데이트</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ink-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/60">
              {rows.map(row => {
                const supplierLabel = row.name?.nameEn ?? row.supplier?.name ?? row.supplierId;
                const visibleMissing = row.missingFields.slice(0, 2);
                const hiddenCount = Math.max(row.missingFields.length - visibleMissing.length, 0);
                const progressTone =
                  row.completionRate >= 90 ? 'bg-ok-solid' :
                  row.completionRate >= 75 ? 'bg-warn-solid' :
                  row.completionRate >= 60 ? 'bg-warn-solid' :
                  'bg-alert-solid';

                return (
                  <tr key={row.supplierId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 align-middle">
                      <Link
                        href={`/suppliers/check-info?supplierId=${row.supplierId}&supplier=${encodeURIComponent(supplierLabel)}`}
                        className="group inline-block max-w-[280px]"
                      >
                        <div className="truncate font-semibold text-ink-100 group-hover:text-accent-700 group-hover:underline">
                          {supplierLabel}
                        </div>
                        <div className="mt-1 truncate text-sm text-ink-500 group-hover:text-accent-600">
                          {row.name?.nameKo ?? row.supplierId}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle text-sm font-semibold text-ink-300 num-mono">
                      T{row.supplier?.tier ?? '-'}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-ink-500">{row.supplier?.country ?? '-'}</td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex min-w-36 items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-slate-100">
                          <div className={clsx('h-full rounded-full', progressTone)} style={{ width: `${row.completionRate}%` }} />
                        </div>
                        <span className="w-12 text-right text-sm font-bold text-ink-100 num-mono">{row.completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={clsx('inline-flex rounded-xs border px-2.5 py-1 text-xs font-semibold', row.status.className)}>
                        {row.status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {row.missingFields.length === 0 ? (
                        <span className="text-sm text-ink-500">없음</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {visibleMissing.map(field => (
                            <span key={field} className="rounded-xs border border-ink-700 bg-slate-50 px-2 py-1 text-xs font-medium text-ink-300">
                              {field}
                            </span>
                          ))}
                          {hiddenCount > 0 && (
                            <span className="rounded-xs border border-ink-700 bg-white px-2 py-1 text-xs font-semibold text-ink-500">
                              외 {hiddenCount}건
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-ink-500 num-mono">{row.lastUpdatedAt}</td>
                    <td className="px-4 py-3 align-middle">
                      <Link
                        href={`/suppliers/check-info?supplierId=${row.supplierId}&supplier=${encodeURIComponent(supplierLabel)}`}
                        className="inline-flex items-center gap-1 rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-sm font-semibold text-accent-700 hover:border-accent-600"
                      >
                        검토 <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  if (embedded) return body;
  return <main className="min-h-screen bg-slate-50 px-7 py-5">{body}</main>;
}
