'use client';

// 단계6 — 1차 협력사에 정보 입력을 요청하는 표준 템플릿 메일 팝업 (발송은 mock)
//  · 시스템 제공 표준 템플릿 / 제3자 정보 확인 동의서 첨부 / 본인인증 담당자(PIC) 재확인
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Paperclip, Send, ShieldCheck, Users } from 'lucide-react';
import ModalShell from './ModalShell';
import type { SupplierBrief } from '@/lib/api';
import { CONSENT_ATTACHMENT, INVITE_MAIL_SUBJECT, buildInviteMailBody } from '@/lib/supply-chain-mail-template';

interface DraftState {
  email: string;
  picName: string;
  picEmail: string;
  picPhone: string;
  picConfirmed: boolean;
  subject: string;
  body: string;
  attachment: string;
  sent: boolean;
}

function initialDraft(s: SupplierBrief): DraftState {
  return {
    email: '',
    picName: '',
    picEmail: '',
    picPhone: '',
    picConfirmed: false,
    subject: INVITE_MAIL_SUBJECT,
    body: buildInviteMailBody(s.companyName),
    attachment: '',
    sent: false,
  };
}

export default function InviteMailModal({
  pool,
  onClose,
}: {
  pool: SupplierBrief[];
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(pool[0]?.supplierId ?? null);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() => {
    const map: Record<string, DraftState> = {};
    pool.forEach(s => {
      map[s.supplierId] = initialDraft(s);
    });
    return map;
  });

  const selected = pool.find(s => s.supplierId === selectedId) ?? null;
  const draft = selected ? drafts[selected.supplierId] : null;
  const sentCount = useMemo(() => Object.values(drafts).filter(d => d.sent).length, [drafts]);

  function patch(id: string, p: Partial<DraftState>) {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...p } }));
  }

  function send(id: string) {
    patch(id, { sent: true });
  }

  return (
    <ModalShell
      title="정보 입력 요청 (초대 메일)"
      subtitle="시스템 표준 템플릿으로 선택한 1차 협력사에 공급망 정보 입력을 요청합니다."
      onClose={onClose}
      maxWidth="max-w-4xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">{sentCount} / {pool.length}개사 발송 완료</span>
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
      {pool.length === 0 ? (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 rounded-md border border-dashed border-amber-200 bg-amber-50 p-6 text-center">
          <Users className="h-5 w-5 text-amber-600" />
          <div className="text-sm font-semibold text-amber-800">먼저 협력사 Pool을 구성하세요.</div>
          <div className="text-xs text-amber-700">STEP 2 "협력사 Pool 구성"에서 1차 협력사를 선택하면 발송 대상이 됩니다.</div>
        </div>
      ) : (
        <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-4">
          {/* 발송 대상 리스트 */}
          <div className="space-y-2">
            {pool.map(s => (
              <button
                key={s.supplierId}
                type="button"
                onClick={() => setSelectedId(s.supplierId)}
                className={clsx(
                  'w-full rounded-md border p-3 text-left transition',
                  selectedId === s.supplierId ? 'border-[#046949] bg-emerald-50/60' : 'border-slate-200 bg-white hover:bg-slate-50',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-ink-100">{s.companyName}</span>
                  {drafts[s.supplierId]?.sent && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500">{s.supplierId}</div>
              </button>
            ))}
          </div>

          {/* 메일 작성 */}
          {selected && draft && (
            <div className="space-y-3">
              {/* 본인인증 담당자(PIC) 재확인 */}
              <div className="rounded-md border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <ShieldCheck className="h-4 w-4" />
                  본인인증 담당자(PIC) 재확인
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input value={draft.picName} onChange={e => patch(selected.supplierId, { picName: e.target.value })} placeholder="담당자명" className="h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-[#046949]" />
                  <input value={draft.picEmail} onChange={e => patch(selected.supplierId, { picEmail: e.target.value })} placeholder="이메일" className="h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-[#046949]" />
                  <input value={draft.picPhone} onChange={e => patch(selected.supplierId, { picPhone: e.target.value })} placeholder="전화번호" className="h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-[#046949]" />
                </div>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-semibold text-emerald-800">
                  <input type="checkbox" checked={draft.picConfirmed} onChange={e => patch(selected.supplierId, { picConfirmed: e.target.checked })} className="h-3.5 w-3.5 accent-emerald-600" />
                  담당자 정보가 정확함을 확인했습니다.
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-slate-600">수신자</span>
                <input
                  value={draft.email}
                  onChange={e => patch(selected.supplierId, { email: e.target.value })}
                  disabled={draft.sent}
                  placeholder="협력사 수신 이메일"
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#046949] disabled:bg-slate-50"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-600">제목</span>
                <input
                  value={draft.subject}
                  onChange={e => patch(selected.supplierId, { subject: e.target.value })}
                  disabled={draft.sent}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#046949] disabled:bg-slate-50"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-600">메일 내용 (표준 템플릿)</span>
                <textarea
                  value={draft.body}
                  onChange={e => patch(selected.supplierId, { body: e.target.value })}
                  disabled={draft.sent}
                  className="mt-1 min-h-[200px] w-full rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-[#046949] disabled:bg-slate-50"
                />
              </label>

              {/* 첨부 — 제3자 동의서 고정 + 추가 첨부 */}
              <div>
                <span className="text-xs font-semibold text-slate-600">첨부파일</span>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-emerald-800">
                  <Paperclip className="h-3.5 w-3.5" />
                  {CONSENT_ATTACHMENT}
                  <span className="rounded-full border border-emerald-200 bg-white px-1.5 py-0.5 text-[10px]">필수 동의서</span>
                </div>
                <input
                  value={draft.attachment}
                  onChange={e => patch(selected.supplierId, { attachment: e.target.value })}
                  disabled={draft.sent}
                  placeholder="추가 첨부 (예: BOM_Request_Template.xlsx)"
                  className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#046949] disabled:bg-slate-50"
                />
              </div>

              <div className="flex justify-end pt-1">
                {draft.sent ? (
                  <span className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-500">
                    <CheckCircle2 className="h-4 w-4" />
                    발송 완료
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => send(selected.supplierId)}
                    disabled={!draft.picConfirmed || !draft.email.trim()}
                    title={!draft.picConfirmed ? '담당자(PIC) 재확인이 필요합니다.' : undefined}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-[#046949] px-4 text-sm font-semibold text-white hover:bg-[#03563c] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    발송하기
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}
