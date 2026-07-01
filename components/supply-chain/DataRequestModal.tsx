'use client';

// 단계5 — 데이터 검증 후 협력사에 자료 업데이트를 요청하는 팝업
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import ModalShell from './ModalShell';
import { createDataRequest } from '@/lib/api';

// 공급망 맵 문서 표준 요청 카테고리 (협력사가 입력/갱신해야 하는 항목)
const REQUEST_CATEGORIES: { key: string; title: string; items: string[] }[] = [
  { key: 'material', title: '자재 / 조성', items: ['자재 spec (핵심광물 함량)', '유해물질 정보', '재활용 함량 시험성적서'] },
  { key: 'cert', title: '인증서', items: ['ISO 14001 갱신본', 'Bettercoal 인증서', '인증서 만료일 갱신'] },
  { key: 'origin', title: '원산지', items: ['원산지증명서(C/O)', '광산 운영 허가증 / 채굴권 증서'] },
  { key: 'reg', title: '규제 증빙', items: ['PCF / 탄소발자국 보고서', '실사 감사 보고서'] },
];

export default function DataRequestModal({
  supplierLabel,
  supplierId,
  onClose,
  onBack,
}: {
  supplierLabel: string;
  supplierId?: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    const all = new Set<string>();
    REQUEST_CATEGORIES.forEach(cat => cat.items.forEach(item => all.add(`${cat.key}:${item}`)));
    return all;
  });
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  const total = useMemo(() => REQUEST_CATEGORIES.reduce((n, c) => n + c.items.length, 0), []);

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
      const items = Array.from(checked).map(k => k.split(':')[1]).join(', ');
      await createDataRequest({
        targetSupplierId: supplierId,
        requestedDataType: items || '자료 업데이트 요청',
        dueDate: due,
      }).catch(() => {});
    }
    window.setTimeout(onClose, 1400);
  }

  return (
    <ModalShell
      title="자료 업데이트 요청"
      subtitle={`${supplierLabel} · 검증 결과 보완이 필요한 항목을 선택해 요청합니다.`}
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
                정보 확인으로
              </button>
            )}
            <span className="text-xs text-slate-500">{checked.size} / {total}개 항목 선택됨</span>
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
        {REQUEST_CATEGORIES.map(cat => (
          <div key={cat.key}>
            <div className="mb-2 text-xs font-bold text-ink-500">{cat.title}</div>
            <div className="space-y-1.5">
              {cat.items.map(item => {
                const key = `${cat.key}:${item}`;
                return (
                  <label
                    key={key}
                    className={clsx(
                      'flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition',
                      checked.has(key) ? 'border-brand bg-ok-bg' : 'border-slate-200 hover:bg-slate-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(key)}
                      onChange={() => toggle(key)}
                      className="h-3.5 w-3.5 accent-brand"
                    />
                    <span className="text-sm text-ink-300">{item}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

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
