'use client';

// 하위(n차) 협력사 초대 모달 — 회사명 + 담당자(PIC 3명) 입력 → POST /suppliers.
// 백엔드가 stub 생성 + 초대 메일(SES) 발송 + discovered_via 기록 + PIC(supplier_contacts) 저장.
// inviterSupplierId: 상위 협력사가 하위를 초대하면 본인 supplier_id, 원청 직접 등록이면 null.
import { useState } from 'react';
import { CheckCircle2, Loader2, Send, UserPlus } from 'lucide-react';
import ModalShell from './ModalShell';
import { ApiError, createDataConsent, createDataRequest, createSupplier, type ProviderType } from '@/lib/api';
import { buildInviteMailBody } from '@/lib/supply-chain-mail-template';

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
  initial,
}: {
  inviterSupplierId?: string | null;
  onClose: () => void;
  onInvited?: (supplierId: string) => void;
  // [M1] 기 입력된 하위 협력사 정보 재확인용 prefill(회사명/유형/PIC). 미가입 하위 재초대 시 사용.
  initial?: { companyName?: string; providerType?: ProviderType; pics?: { name?: string; email?: string; phone?: string }[] };
}) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? '');
  const [providerType, setProviderType] = useState<ProviderType>(initial?.providerType ?? 'manufacturer');
  const [pics, setPics] = useState<Pic[]>(() => {
    if (!initial?.pics?.length) return EMPTY_PICS;
    const seeded = initial.pics.slice(0, 3).map(p => ({ name: p.name ?? '', email: p.email ?? '', phone: p.phone ?? '' }));
    while (seeded.length < 3) seeded.push({ name: '', email: '', phone: '' });
    return seeded;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 생성 완료 후 화면 — 초대 링크를 바로 확인할 수 있게(발송 전엔 메일함 밖에서 확인 불가).
  const [invited, setInvited] = useState<{ supplierId: string; companyName: string } | null>(null);
  const [consentSent, setConsentSent] = useState(false);
  const [sendingConsent, setSendingConsent] = useState(false);
  const [copied, setCopied] = useState(false);

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
      // [FIX] 초대 성공 후 바로 닫으면 초대 링크를 다시 확인할 방법이 없었다(실메일 미발송
      // 로컬 환경 등). 링크를 보여주는 화면으로 전환 — onClose는 사용자가 '닫기'를 눌러야 호출.
      setInvited({ supplierId: res.supplierId, companyName: companyName.trim() });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '초대에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  // 동의서 요청 발송 — STEP3 InviteMailModal.send()와 동일 계약(표준 범위 전체 요청).
  //   이게 있어야 온보딩 링크의 '정보 입력 시작' 버튼이 열린다(대기중 동의서 필요).
  async function sendConsent() {
    if (!invited) return;
    setSendingConsent(true);
    try {
      await createDataConsent({
        supplierId: invited.supplierId,
        dataScope: ['company', 'contacts', 'factories', 'carbon_epd', 'origin'],
        purpose: 'EU_BATTERY',
        thirdPartySharing: true,
        validFrom: new Date().toISOString().slice(0, 10),
        formVersion: 'v1.0',
      }).catch(() => {});
      await createDataRequest({ targetSupplierId: invited.supplierId, requestedDataType: 'general_info' }).catch(() => {});
      setConsentSent(true);
    } finally {
      setSendingConsent(false);
    }
  }

  async function copyLink() {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/partner/onboarding?supplierId=${invited?.supplierId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 미지원 브라우저 — 텍스트 박스에서 직접 선택 복사 가능 */
    }
  }

  const reconfirm = Boolean(initial);

  // 초대 성공 후 화면 — 링크 확인 + 동의서 요청 발송.
  if (invited) {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/partner/onboarding?supplierId=${invited.supplierId}`;
    return (
      <ModalShell
        title="하위 협력사 초대 완료"
        subtitle={`${invited.companyName}이(가) 공급망에 편입되었습니다. 아래 링크로 정보 입력을 안내하세요.`}
        onClose={onClose}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              닫기
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">공급망 정보 입력 링크</span>
            <div className="flex gap-2">
              <input
                readOnly
                value={link}
                onFocus={e => e.currentTarget.select()}
                className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-ink-300 outline-none"
              />
              <button
                type="button"
                onClick={copyLink}
                className="h-10 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
            <span className="mt-1 block text-[11px] text-slate-500">
              실제 메일 발송이 안 되는 환경(로컬 등)에서는 이 링크를 직접 복사해 협력사에게 전달하세요.
            </span>
          </label>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-xs font-bold text-ink-300">메일 미리보기(표준 템플릿)</div>
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap text-[11px] leading-5 text-ink-200">
              {buildInviteMailBody(invited.companyName, invited.supplierId)}
            </pre>
          </div>

          <div className="flex justify-end">
            {consentSent ? (
              <span className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-500">
                <CheckCircle2 className="h-4 w-4" />
                동의서 요청 발송됨 — 링크 접속 시 바로 입력 가능
              </span>
            ) : (
              <button
                type="button"
                onClick={sendConsent}
                disabled={sendingConsent}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendingConsent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                제3자 동의서 요청 발송
              </button>
            )}
          </div>
          <div className="text-[11px] text-slate-500">
            동의서 요청을 발송해야 위 링크에서 '정보 입력 시작' 버튼이 활성화됩니다(대기중 동의서 필요).
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title={reconfirm ? '하위 협력사 초대 재확인' : '하위 협력사 초대'}
      subtitle={reconfirm
        ? '기 입력된 하위 협력사 정보를 확인하고, 아직 미가입이면 가입 요청 메일을 재발송합니다. (동일 일자 중복 발송은 자동 방지)'
        : '회사명과 담당자(PIC)를 입력하면 가입 요청 메일이 발송되고 공급망에 편입됩니다.'}
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
              {reconfirm ? '가입 요청 재발송' : '초대하기'}
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
