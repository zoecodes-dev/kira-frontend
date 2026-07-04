'use client';

// 단계2 — 1차 협력사 Pool 구성 팝업.
// 후보는 "선택된 제품의 §10.2a 공급망 맵 tier-1 협력사"만 부모(SupplyChainHub)가 주입한다.
// 전역 /suppliers 목록을 직접 뿌리지 않는다(제품 무관 전체 노출 방지). 제품 미선택이면 빈 상태 안내.
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, PackageSearch, Plus, Search } from 'lucide-react';
import ModalShell from './ModalShell';
import SubSupplierInviteModal from './SubSupplierInviteModal';
import { type SupplierBrief, type ProviderType } from '@/lib/api';

// §4.2 — 요청 노드(KIRA=원청, tier0)는 Pool 후보에서 제외 (tier 필터로 대부분 걸러지나 안전망)
const REQUEST_NODE_ID = 'a0000000-0000-4000-8000-000000000000';

const providerTypeLabel: Record<ProviderType, string> = {
  manufacturer: '제조사',
  recycler: '재활용',
  trader: '트레이더',
  miner: '광산', smelter: '제련소',
};

export default function PoolModal({
  candidates,
  initialPool,
  onClose,
  onConfirm,
}: {
  // 선택된 제품의 1차(tier-1) 협력사 후보. 제품 미선택/맵 데이터 없음이면 빈 배열.
  candidates: SupplierBrief[];
  initialPool: SupplierBrief[];
  onClose: () => void;
  onConfirm: (selected: SupplierBrief[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(initialPool.map(s => s.supplierId)));
  const [showInvite, setShowInvite] = useState(false);

  const visible = useMemo(() => candidates.filter(s => s.supplierId !== REQUEST_NODE_ID), [candidates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter(s =>
      [s.companyName, s.supplierId, s.providerType].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [visible, search]);

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
   <>
    <ModalShell
      title="협력사 Pool 구성"
      subtitle="선택한 대표 제품의 1차 협력사 중 이번 공급망 맵 작업 대상을 고르세요. (1차 협력사는 이미 등록되어 있습니다)"
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
              className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
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
            className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
        {/* 신규(하위) 협력사 초대 — POST /suppliers(stub+초대메일+PIC). 원청 직접 등록이라 inviter=null. */}
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          title="하위 협력사 초대"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand"
        >
          <Plus className="h-4 w-4" />
          협력사 추가
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
          <PackageSearch className="h-5 w-5 text-slate-400" />
          <div className="text-sm font-semibold text-ink-100">표시할 1차 협력사가 없습니다</div>
          <p className="text-xs text-slate-500">
            STEP 1에서 대표 제품을 먼저 선택하세요. 선택한 제품의 공급망 맵(MBOM 기준) 1차 협력사만 여기에 표시됩니다.
          </p>
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
                  checked ? 'border-brand bg-ok-bg' : 'border-slate-200 bg-white hover:bg-slate-50',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(s.supplierId)}
                  className="h-4 w-4 accent-brand"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink-100">{s.companyName}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="num-mono">{s.supplierId}</span>
                    <span className="text-slate-300">·</span>
                    <span>{providerTypeLabel[s.providerType] ?? s.providerType}</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </ModalShell>
    {showInvite && (
      <SubSupplierInviteModal
        inviterSupplierId={null}
        onClose={() => setShowInvite(false)}
        onInvited={() => {
          setShowInvite(false);
          alert('초대 메일이 발송되었습니다. 목록은 새로고침 후 반영됩니다.');
        }}
      />
    )}
   </>
  );
}
