'use client';

// 단계2 — 1차 협력사 Pool 구성 팝업 (getSuppliers 실 API). 1차 협력사는 항상 등록되어 있다는 전제.
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Loader2, Plus, Search, ShieldAlert } from 'lucide-react';
import ModalShell from './ModalShell';
import {
  ApiError,
  getSuppliers,
  type SupplierBrief,
  type SupplierType,
} from '@/lib/api';

// §4.2 — 요청 노드(KIRA, OEM/tier0)는 Pool 후보에서 제외
const REQUEST_NODE_ID = 'a0000000-0000-4000-8000-000000000000';

const supplierTypeLabel: Record<SupplierType, string> = {
  manufacturer: '제조사',
  recycler: '재활용',
  trader: '트레이더',
  miner: '광산',
};

export default function PoolModal({
  initialPool,
  onClose,
  onConfirm,
}: {
  initialPool: SupplierBrief[];
  onClose: () => void;
  onConfirm: (selected: SupplierBrief[]) => void;
}) {
  const [candidates, setCandidates] = useState<SupplierBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(initialPool.map(s => s.supplierId)));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const briefs = await getSuppliers();
        const visible = briefs.filter(s => s.supplierId !== REQUEST_NODE_ID);
        if (!cancelled) setCandidates(visible);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : '협력사 목록을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(s =>
      [s.companyName, s.supplierId, s.supplierType].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [candidates, search]);

  function toggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    const selected = candidates.filter(s => selectedIds.has(s.supplierId));
    onConfirm(selected);
  }

  return (
    <ModalShell
      title="협력사 Pool 구성"
      subtitle="이번 공급망 맵 작업 대상이 될 1차 협력사를 선택하세요. (1차 협력사는 이미 등록되어 있습니다)"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">{selectedIds.size}개사 선택됨</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="inline-flex items-center gap-2 rounded-md bg-[#046949] px-4 py-2 text-sm font-semibold text-white hover:bg-[#03563c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Pool 확정
            </button>
          </div>
        </div>
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="협력사명, ID, 유형 검색"
            className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#046949]"
          />
        </div>
        {/* 신규 협력사 등록(n차 회원가입)은 추후 별도 구현 — 훅 지점 stub */}
        <button
          type="button"
          disabled
          title="추후 지원 예정"
          className="inline-flex h-10 shrink-0 cursor-not-allowed items-center gap-1.5 rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-400"
        >
          <Plus className="h-4 w-4" />
          협력사 추가
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-2 py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div className="text-sm font-semibold">협력사 목록을 불러오는 중…</div>
        </div>
      ) : error ? (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 rounded-md border border-dashed border-red-200 bg-red-50 p-6 text-center">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          <div className="text-sm font-semibold text-red-800">{error}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">조건에 맞는 협력사가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const checked = selectedIds.has(s.supplierId);
            return (
              <label
                key={s.supplierId}
                className={clsx(
                  'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition',
                  checked ? 'border-[#046949] bg-emerald-50/60' : 'border-slate-200 bg-white hover:bg-slate-50',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(s.supplierId)}
                  className="h-4 w-4 accent-emerald-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink-100">{s.companyName}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="num-mono">{s.supplierId}</span>
                    <span className="text-slate-300">·</span>
                    <span>{supplierTypeLabel[s.supplierType] ?? s.supplierType}</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
}
