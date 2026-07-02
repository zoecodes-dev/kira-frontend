'use client';

// 자료 업데이트 요청 팝업 — 최종 검증에서 '그 협력사가 미흡한 항목'만 골라 보완을 요청한다.
//   결손 축(최종 검증 3축): 환경성적서 검증 · 데이터 제공 동의 · 공급망 필수필드 입력.
//   MapManageModal이 협력사별로 결손 항목(gaps)을 계산해 넘기면 그 항목만 체크리스트로 뜬다.
import { useState } from 'react';
import clsx from 'clsx';
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import ModalShell from './ModalShell';
import { createDataRequest } from '@/lib/api';

// 요청 대상 결손 항목 1건. key는 중복 방지용 식별자, label은 표시/요청 문구.
export interface RequestGapItem { key: string; label: string }

// 결손 정보가 없을 때(다른 진입점 폴백) 쓰는 표준 3축 항목.
const FALLBACK_ITEMS: RequestGapItem[] = [
  { key: 'epd', label: '환경성적서(탄소발자국) 제출' },
  { key: 'consent', label: '데이터 제공 동의(제3자 정보제공)' },
  { key: 'supply', label: '공급망 필수필드 입력' },
];

export default function DataRequestModal({
  supplierLabel,
  supplierId,
  gaps,
  onClose,
  onBack,
}: {
  supplierLabel: string;
  supplierId?: string;
  // 최종 검증에서 계산된 그 협력사의 미흡 항목. 전달되면 이 항목만 요청 대상으로 뜬다.
  gaps?: RequestGapItem[];
  onClose: () => void;
  onBack?: () => void;
}) {
  // 결손 항목이 전달되면 그것만, 없으면(폴백) 표준 3축.
  const items = gaps ?? FALLBACK_ITEMS;
  const gapDriven = Boolean(gaps);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(items.map(i => i.key)));
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  function toggle(key: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

  async function send() {
    setSent(true);
    if (supplierId && isUuid(supplierId)) {
      const due = new Date(Date.now() + 7 * 86400000).toISOString();
      const label = items.filter(i => checked.has(i.key)).map(i => i.label).join(', ');
      await createDataRequest({
        targetSupplierId: supplierId,
        requestedDataType: label || '자료 업데이트 요청',
        dueDate: due,
      }).catch(() => {});
    }
    window.setTimeout(onClose, 1400);
  }

  return (
    <ModalShell
      title="자료 업데이트 요청"
      subtitle={`${supplierLabel} · 최종 검증에서 미흡한 항목만 골라 보완을 요청합니다.`}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-accent-700"
              >
                <ArrowLeft className="h-4 w-4" />
                검증으로
              </button>
            )}
            <span className="text-xs text-slate-500">{checked.size} / {items.length}개 항목 선택됨</span>
          </div>
          <button
            type="button"
            onClick={send}
            disabled={checked.size === 0 || sent}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sent ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                발송 완료
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                요청 발송
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-xs font-bold text-ink-500">
            {gapDriven ? '보완 필요 항목 (검증 미흡)' : '요청 항목'}
          </div>
          {items.length === 0 ? (
            <div className="rounded-md border border-ok-border bg-ok-bg px-3 py-4 text-sm font-semibold text-ok-text">
              이 협력사는 검증 미흡 항목이 없습니다.
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map(item => (
                <label
                  key={item.key}
                  className={clsx(
                    'flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition',
                    checked.has(item.key) ? 'border-brand bg-ok-bg' : 'border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked.has(item.key)}
                    onChange={() => toggle(item.key)}
                    className="h-3.5 w-3.5 accent-brand"
                  />
                  <span className="text-sm text-ink-300">{item.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 text-xs font-bold text-ink-500">추가 메모 (선택)</div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="협력사에게 전달할 추가 안내사항을 입력하세요."
            className="w-full rounded-md border border-slate-200 p-3 text-sm text-ink-300 outline-none placeholder:text-slate-400 focus:border-brand"
          />
        </div>
      </div>
    </ModalShell>
  );
}
