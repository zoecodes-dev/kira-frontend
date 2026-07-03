'use client';

// 공급망 맵 목록/상태 패널 — 맵 그 자체(supply_chain_maps, map_id)를 1급 엔티티로 표시.
// GET /supply-chain/maps 로 목록(제품·엣지수·완료여부)을, PATCH 로 완료/작성중 토글한다.
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Network, RefreshCw } from 'lucide-react';
import {
  getSupplyChainMaps,
  updateSupplyChainMapStatus,
  type SupplyChainMapHeader,
} from '@/lib/api';

export default function SupplyChainMapsPanel() {
  const [maps, setMaps] = useState<SupplyChainMapHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setMaps(await getSupplyChainMaps());
    } catch {
      setMaps([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function toggle(m: SupplyChainMapHeader) {
    const next = m.status === 'completed' ? 'building' : 'completed';
    setBusyId(m.mapId);
    try {
      await updateSupplyChainMapStatus(m.mapId, next);
      setMaps(prev => prev.map(x => x.mapId === m.mapId ? { ...x, status: next } : x));
    } catch {
      /* 실패해도 목록 유지 */
    } finally {
      setBusyId(null);
    }
  }

  const completed = maps.filter(m => m.status === 'completed').length;

  return (
    <section className="rounded-sm border border-ink-700 bg-white shadow-control">
      <div className="flex items-center justify-between gap-3 border-b border-ink-700 px-5 py-3">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-accent-700" />
          <h2 className="text-sm font-bold text-ink-100">공급망 맵 목록</h2>
          <span className="rounded-full border border-ink-700 bg-ink-800 px-2 py-0.5 text-[11px] font-semibold text-ink-400">
            완료 {completed} / {maps.length}
          </span>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-400 hover:border-accent-600 hover:text-accent-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      </div>

      {loading ? (
        <div className="px-5 py-8 text-center text-sm text-ink-500">불러오는 중…</div>
      ) : maps.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-ink-500">등록된 공급망 맵이 없습니다.</div>
      ) : (
        <div className="divide-y divide-ink-800">
          {maps.map(m => {
            const done = m.status === 'completed';
            return (
              <div key={m.mapId} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink-100">{m.productName}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-500">
                    <span className="num-mono">map {m.mapId.slice(0, 8)}</span>
                    <span className="h-3 w-px bg-ink-700" />
                    <span>{m.edgeCount}개 연결(엣지)</span>
                    {m.completedAt && (
                      <>
                        <span className="h-3 w-px bg-ink-700" />
                        <span className="num-mono">{String(m.completedAt).slice(0, 10)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                    done ? 'border-ok-border bg-ok-bg text-ok-text' : 'border-warn-border bg-warn-bg text-warn-text'
                  }`}>
                    {done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {done ? '완료' : '작성 중'}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(m)}
                    disabled={busyId === m.mapId}
                    className="rounded-xs border border-ink-700 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-400 hover:border-accent-600 hover:text-accent-700 disabled:opacity-50"
                  >
                    {busyId === m.mapId ? '…' : done ? '작성 중으로' : '완료 처리'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
