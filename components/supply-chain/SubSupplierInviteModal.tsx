'use client';

// 하위(n차) 협력사 초대 모달 — 회사명 + 담당자(PIC 3명) 입력 → POST /suppliers.
// 백엔드가 stub 생성 + 초대 메일(SES) 발송 + discovered_via 기록 + PIC(supplier_contacts) 저장.
// inviterSupplierId: 상위 협력사가 하위를 초대하면 본인 supplier_id, 원청 직접 등록이면 null.
import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import ModalShell from './ModalShell';
import { ApiError, createSupplier, type ProviderType } from '@/lib/api';

const PROVIDER_OPTS: { value: ProviderType; label: string }[] = [
  { value: 'manufacturer', label: '제조사' },
  { value: 'recycler', label: '재활용' },
  { value: 'trader', label: '트레이더' },
  { value: 'miner', label: '광산' },
];

interface Pic { name: string; email: string; phone: string; }
const EMPTY_PICS: Pic[] = [
  { name: '', email: '', phone: '' },
  { name: '', email: '', phone: '' },
  { name: '', email: '', phone: '' },
];

export default function SubSupplierInviteModal({
  inviterSupplierId,
  onClose,
  onInvited,
}: {
  inviterSupplierId?: string | null;
  onClose: () => void;
  onInvited?: (supplierId: string) => void;
}) {
  const [companyName, setCompanyName] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('manufacturer');
  const [pics, setPics] = useState<Pic[]>(EMPTY_PICS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryEmail = pics[0]?.email.trim() ?? '';
  const canSubmit = companyName.trim() !== '' && primaryEmail !== '' && !submitting;

  function setPic(i: number, k: keyof Pic, v: string) {
    setPics(prev => prev.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)));
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await createSupplier({
        companyName: companyName.trim(),
        providerType,
        email: primaryEmail,   // 초대 메일 수신 = 대표 PIC 이메일
        inviterSupplierId: inviterSupplierId ?? null,
        contacts: pics.map((p, i) => ({
          name: p.name.trim() || undefined,
          email: p.email.trim() || undefined,
          phone: p.phone.trim() || undefined,
          isPrimary: i === 0,
        })),
      });
      onInvited?.(res.supplierId);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '초대에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title="하위 협력사 초대"
      subtitle="회사명과 담당자(PIC)를 입력하면 가입 요청 메일이 발송되고 공급망에 편입됩니다."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-alert-text">{error}</div>
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
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              초대하기
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">회사명 *</span>
            <input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="하위 협력사 회사명"
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">공급자 유형</span>
            <select
              value={providerType}
              onChange={e => setProviderType(e.target.value as ProviderType)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand"
            >
              {PROVIDER_OPTS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold text-slate-600">담당자(PIC) — 대표 1명 필수(이메일이 초대 수신처)</div>
          <div className="space-y-2">
            {pics.map((p, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <input
                  value={p.name}
                  onChange={e => setPic(i, 'name', e.target.value)}
                  placeholder={i === 0 ? '이름 (대표)' : '이름'}
                  className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm outline-none focus:border-brand"
                />
                <input
                  value={p.email}
                  onChange={e => setPic(i, 'email', e.target.value)}
                  placeholder={i === 0 ? '이메일 *' : '이메일'}
                  className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm outline-none focus:border-brand"
                />
                <input
                  value={p.phone}
                  onChange={e => setPic(i, 'phone', e.target.value)}
                  placeholder="전화번호"
                  className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm outline-none focus:border-brand"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
