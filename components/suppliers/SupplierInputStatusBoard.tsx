'use client';

// 협력사 입력 현황 개요 보드 — 협력사별 입력률·누락·상태를 한눈에 본다.
// 실 백엔드(getSuppliers + getSupplierCompleteness)로만 채운다. 실패 시 mock 없이 에러 상태 표시.
// (과거 mock 폴백은 가짜 ID/가짜 100%로 공통 모달을 깨뜨려 제거함.)
// /suppliers/check-info(인덱스)와 My Task 탭에서 공용 사용. embedded=true면 페이지 래퍼 생략.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ChevronRight, Send } from 'lucide-react';
import { getSuppliers, getSupplierCompleteness, type ProviderType } from '@/lib/api';
import SupplierInfoModal from './SupplierInfoModal';

const providerTypeLabel: Record<ProviderType, string> = {
  manufacturer: '제조사', recycler: '재활용', trader: '트레이더', miner: '광산', smelter: '제련소',
};

interface BoardRow {
  supplierId: string;
  name: string;
  sub: string;          // 보조 라벨(유형 또는 한글명)
  typeLabel: string;
  hasData: boolean;     // 완성도 집계 행 존재 여부
  completionRate: number;
  missingFields: string[];
  status: { label: string; className: string };
  lastUpdated: string;
}

const NOT_AGGREGATED = { label: '미집계', className: 'border-slate-200 bg-slate-100 text-slate-500' };

function statusMeta(rate: number, missingCount: number) {
  if (missingCount === 0) return { label: '완료', className: 'border-ok-border bg-ok-bg text-ok-text' };
  if (rate < 50) return { label: '보완 지연', className: 'border-alert-border bg-alert-bg text-alert-text' };
  if (rate >= 80) return { label: '검토 대기', className: 'border-warn-border bg-warn-bg text-warn-text' };
  return { label: '작성중', className: 'border-info-border bg-info-bg text-info-text' };
}

function fmt(ts: string | null | undefined) {
  return ts ? ts.slice(0, 16).replace('T', ' ') : '-';
}

export default function SupplierInputStatusBoard({ embedded = false }: { embedded?: boolean }) {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [error, setError] = useState(false);
  // 협력사 클릭 → 단일 공유 폼을 인라인 모달로(상세 페이지 이탈 X, 닫으면 목록 복귀).
  const [active, setActive] = useState<{ supplierId: string; supplierName: string; openRequest: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sups = await getSuppliers();
        const comps = await Promise.all(
          sups.map(s => getSupplierCompleteness(s.supplierId).catch(() => null)),
        );
        if (cancelled) return;
        const real: BoardRow[] = sups.map((s, i) => {
          const c = comps[i];
          const hasData = c != null && c.completionRate != null;
          const rate = hasData ? (c!.completionRate as number) : 0;
          const missing = c?.missingFields ?? [];
          return {
            supplierId: s.supplierId,
            name: s.companyName,
            sub: providerTypeLabel[s.providerType] ?? s.providerType,
            typeLabel: providerTypeLabel[s.providerType] ?? s.providerType,
            hasData,
            completionRate: rate,
            missingFields: missing,
            status: hasData ? statusMeta(rate, missing.length) : NOT_AGGREGATED,
            lastUpdated: fmt(c?.lastUpdatedAt),
          };
        }).sort((a, b) =>
          (Number(b.hasData) - Number(a.hasData)) ||
          (b.missingFields.length - a.missingFields.length) ||
          (a.completionRate - b.completionRate));
        setRows(real);
      } catch {
        if (!cancelled) { setRows([]); setError(true); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const data = rows ?? [];
  const pendingCount = data.filter(r => r.missingFields.length > 0).length;
  const reviewCount = data.filter(r => r.status.label === '검토 대기').length;
  const delayedCount = data.filter(r => r.status.label === '보완 지연').length;
  const withData = data.filter(r => r.hasData);
  const avgRate = withData.length > 0 ? Math.round(withData.reduce((s, r) => s + r.completionRate, 0) / withData.length) : 0;

  const body = (
    <>
      {!embedded && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink-100">협력사 입력 현황</h1>
            <p className="mt-1 text-xs text-ink-500">작성중이거나 검토가 필요한 협력사를 선택해 상세 수집 현황을 확인합니다.</p>
          </div>
          <Link
            href="/supply-chain/map"
            className="inline-flex h-8 items-center gap-2 rounded-sm border border-ink-700 bg-white px-3 text-xs font-semibold text-ink-500 shadow-control hover:border-accent-200 hover:text-accent-700"
          >
            <Send className="h-4 w-4" />
            공급망 맵에서 요청
          </Link>
        </div>
      )}

      <section className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          { label: '전체 협력사', value: data.length, tone: 'text-ink-100' },
          { label: '작성중/누락', value: pendingCount, tone: 'text-info-text' },
          { label: '검토 대기', value: reviewCount, tone: 'text-warn-text' },
          { label: '보완 지연', value: delayedCount, tone: 'text-alert-text' },
        ].map(item => (
          <div key={item.label} className="rounded-sm border border-ink-700 bg-white px-4 py-3 shadow-control">
            <div className="text-[11px] font-semibold text-ink-500">{item.label}</div>
            <div className={clsx('mt-1 text-xl font-bold num-mono', item.tone)}>{item.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 bg-slate-50 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink-100">작성중인 협력사</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              평균 입력률 {avgRate}% · 누락 항목이 많은 순으로 정렬
            </p>
          </div>
          <div className="text-xs font-medium text-ink-500">협력사명 또는 버튼을 누르면 정보 창이 열립니다.</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="border-b border-ink-700 bg-white">
              <tr>
                {['협력사', '유형', '입력률', '상태', '누락 항목', '최근 업데이트', '작업'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/60">
              {rows === null && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-xs text-ink-500">불러오는 중…</td></tr>
              )}
              {rows !== null && data.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-xs text-ink-500">
                  {error ? '협력사 정보를 불러오지 못했습니다. 로그인/백엔드 연결을 확인해주세요.' : '표시할 협력사가 없습니다.'}
                </td></tr>
              )}
              {data.map(row => {
                const visibleMissing = row.missingFields.slice(0, 2);
                const hiddenCount = Math.max(row.missingFields.length - visibleMissing.length, 0);
                const tone = row.completionRate >= 90 ? 'bg-ok-solid' : row.completionRate >= 60 ? 'bg-warn-solid' : 'bg-alert-solid';
                const open = (openRequest: boolean) => setActive({ supplierId: row.supplierId, supplierName: row.name, openRequest });
                return (
                  <tr key={row.supplierId} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 align-middle">
                      <button type="button" onClick={() => open(false)} className="group inline-block max-w-[280px] text-left">
                        <div className="truncate text-[13px] font-semibold text-ink-100 group-hover:text-accent-700 group-hover:underline">{row.name}</div>
                        <div className="mt-0.5 truncate text-xs text-ink-500 group-hover:text-accent-600">{row.sub}</div>
                      </button>
                    </td>
                    <td className="px-4 py-2.5 align-middle text-xs text-ink-500">{row.typeLabel}</td>
                    <td className="px-4 py-2.5 align-middle">
                      {row.hasData ? (
                        <div className="flex min-w-36 items-center gap-3">
                          <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                            <div className={clsx('h-full rounded-full', tone)} style={{ width: `${row.completionRate}%` }} />
                          </div>
                          <span className="w-10 text-right text-xs font-bold text-ink-100 num-mono">{row.completionRate}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      <span className={clsx('inline-flex rounded-xs border px-2 py-0.5 text-[11px] font-semibold', row.status.className)}>{row.status.label}</span>
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      {row.missingFields.length === 0 ? (
                        <span className="text-xs text-ink-500">없음</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {visibleMissing.map(f => (
                            <span key={f} className="rounded-xs border border-ink-700 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-ink-300">{f}</span>
                          ))}
                          {hiddenCount > 0 && (
                            <span className="rounded-xs border border-ink-700 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-ink-500">외 {hiddenCount}건</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 align-middle text-xs text-ink-500 num-mono">{row.lastUpdated}</td>
                    <td className="px-4 py-2.5 align-middle">
                      {row.missingFields.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => open(false)}
                          className="inline-flex items-center gap-1.5 rounded-xs border border-accent-100 bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700 hover:border-accent-600"
                        >
                          <Send className="h-3.5 w-3.5" /> 자료 요청
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => open(false)}
                          className="inline-flex items-center gap-1 rounded-xs border border-ink-700 bg-white px-2.5 py-1 text-xs font-semibold text-ink-500 hover:border-accent-600 hover:text-accent-700"
                        >
                          검토 <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {active && (
        <SupplierInfoModal
          supplierId={active.supplierId}
          supplierName={active.supplierName}
          openRequest={active.openRequest}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );

  if (embedded) return body;
  return <main className="min-h-screen bg-slate-50 px-7 py-5">{body}</main>;
}
