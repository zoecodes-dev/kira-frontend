'use client';

// 단계6 — 1차 협력사에 정보 입력을 요청하는 표준 템플릿 메일 팝업
//  · 시스템 제공 표준 템플릿 / 제3자 정보 확인 동의서 첨부
//  · 발송 = 제3자 동의서(데이터 계약) 생성 + (실 UUID 협력사) 자료요청 생성
//    → 백엔드가 협력사 담당자에게 in-app 알림 + 이메일(SES) 실발송
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, FileSignature, Loader2, Paperclip, Send, Users } from 'lucide-react';
import ModalShell from './ModalShell';
import { createDataConsent, createDataRequest, getSupplierContacts, type SupplierBrief } from '@/lib/api';
import { CONSENT_ATTACHMENT, INVITE_MAIL_SUBJECT, buildInviteMailBody } from '@/lib/supply-chain-mail-template';
import { buildConsentDocument, SCOPE_LABEL, SCOPE_ORDER } from '@/lib/consent-clauses';

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

// 메일에 첨부하는 제3자 정보제공 동의서 = 데이터 계약(Data Contract) 조건. 라벨은 consent-clauses가 SSOT.
const SCOPE_OPTIONS = SCOPE_ORDER.map(key => ({ key, label: SCOPE_LABEL[key] }));

interface DraftState {
  email: string;
  subject: string;
  body: string;
  sent: boolean;
}

function initialDraft(s: SupplierBrief): DraftState {
  return {
    email: '',
    subject: INVITE_MAIL_SUBJECT,
    body: buildInviteMailBody(s.companyName),
    sent: false,
  };
}

export default function InviteMailModal({
  pool,
  initialSupplierId,
  onClose,
}: {
  pool: SupplierBrief[];
  // STEP3에서 특정 협력사 '메일'로 진입 시 그 협력사를 초기 선택(없으면 첫 번째).
  initialSupplierId?: string;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    (initialSupplierId && pool.some(s => s.supplierId === initialSupplierId) ? initialSupplierId : pool[0]?.supplierId) ?? null,
  );
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

  // 메일에 첨부할 동의서(데이터 계약) 조건 — 표준 양식이라 발송 대상 공통.
  const [scope, setScope] = useState<Set<string>>(new Set(['company', 'contacts', 'factories', 'carbon_epd', 'origin']));
  // 목적·재공유 편집 UI 제거 — 표준값으로 고정(범위만 위 칩에서 선택)
  const purpose = 'EU_BATTERY';
  const thirdParty = true;
  const recipients = '';
  const [sendingId, setSendingId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const recipientList = recipients.split(',').map(s => s.trim()).filter(Boolean);

  // 선택 조건으로 동의서 본문을 조립 — 이 결과가 메일에 담겨 나가고, 협력사도 시스템에서 동일 문서를 본다.
  const consentDoc = useMemo(() => {
    if (!selected) return '';
    return buildConsentDocument({
      providerCompany: selected.companyName,
      purpose,
      dataScope: Array.from(scope),
      thirdPartySharing: thirdParty,
      allowedRecipients: recipientList,
      validFrom: today,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, purpose, scope, thirdParty, recipients]);

  function patch(id: string, p: Partial<DraftState>) {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...p } }));
  }

  // 수신자 이메일 자동 프리필 — 상위 협력사가 가입 시 등록한 하위 협력사 PIC(supplier_contacts)의
  //   대표(is_primary) 담당자 이메일을 채운다. 사용자가 이미 입력한 값·발송 건은 보존.
  //   실 UUID 협력사만 조회(mock/데모 제외), 404(권한 없음 등)는 빈칸으로 폴백.
  const [fetchedPics, setFetchedPics] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!selected) return;
    const id = selected.supplierId;
    if (fetchedPics.has(id) || !isUuid(id)) return;
    let cancelled = false;
    getSupplierContacts(id)
      .then(res => {
        if (cancelled) return;
        setFetchedPics(prev => new Set(prev).add(id));
        const list = res.contacts ?? [];
        const primary = list.find(c => c.isPrimary) ?? list[0];
        if (!primary?.email) return;
        setDrafts(prev => {
          const d = prev[id];
          if (!d || d.sent || d.email) return prev;
          return { ...prev, [id]: { ...d, email: primary.email } };
        });
      })
      .catch(() => { if (!cancelled) setFetchedPics(prev => new Set(prev).add(id)); });
    return () => { cancelled = true; };
  }, [selected, fetchedPics]);

  // 발송 = 제3자 동의서(데이터 계약 'requested') 생성 + 자료요청 생성.
  //   자료요청은 백엔드에서 협력사 담당자에게 in-app 알림 + 이메일(SES)을 실발송한다.
  async function send(id: string) {
    setSendingId(id);
    try {
      await createDataConsent({
        supplierId: id,
        dataScope: Array.from(scope),
        purpose,
        thirdPartySharing: thirdParty,
        allowedRecipients: thirdParty ? recipientList : undefined,
        validFrom: today,
        formVersion: 'v1.0',
      }).catch(() => {});
      // 실 UUID 협력사만 자료요청 생성(→ 실 알림·이메일). mock S-ID는 데모로 통과.
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id)) {
        await createDataRequest({ targetSupplierId: id, requestedDataType: 'general_info' }).catch(() => {});
      }
      patch(id, { sent: true });
    } finally {
      setSendingId(null);
    }
  }

  return (
    <ModalShell
      title="정보 입력 요청 (초대 메일)"
      subtitle="시스템 표준 템플릿으로 선택한 협력사에 공급망 정보 입력을 요청합니다."
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
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 rounded-md border border-dashed border-warn-border bg-warn-bg p-6 text-center">
          <Users className="h-5 w-5 text-warn-text" />
          <div className="text-sm font-semibold text-warn-text">먼저 협력사 Pool을 구성하세요.</div>
          <div className="text-xs text-warn-text">STEP 2 "협력사 Pool 구성"에서 1차 협력사를 선택하면 발송 대상이 됩니다.</div>
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
                  selectedId === s.supplierId ? 'border-brand bg-ok-bg' : 'border-slate-200 bg-white hover:bg-slate-50',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-ink-100">{s.companyName}</span>
                  {drafts[s.supplierId]?.sent && <CheckCircle2 className="h-4 w-4 shrink-0 text-ok-text" />}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500">{s.supplierId}</div>
              </button>
            ))}
          </div>

          {/* 메일 작성 */}
          {selected && draft && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">수신자</span>
                <input
                  value={draft.email}
                  onChange={e => patch(selected.supplierId, { email: e.target.value })}
                  disabled={draft.sent}
                  placeholder="협력사 수신 이메일"
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand disabled:bg-slate-50"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-600">제목</span>
                <input
                  value={draft.subject}
                  onChange={e => patch(selected.supplierId, { subject: e.target.value })}
                  disabled={draft.sent}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand disabled:bg-slate-50"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-600">메일 내용 (표준 템플릿)</span>
                <textarea
                  value={draft.body}
                  onChange={e => patch(selected.supplierId, { body: e.target.value })}
                  disabled={draft.sent}
                  className="mt-1 min-h-[200px] w-full rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-brand disabled:bg-slate-50"
                />
              </label>

              {/* 첨부 — 제3자 동의서 고정 + 추가 첨부 */}
              <div>
                <span className="text-xs font-semibold text-slate-600">첨부파일</span>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-ok-border bg-ok-bg px-3 py-2 text-xs font-semibold text-ok-text">
                  <Paperclip className="h-3.5 w-3.5" />
                  {CONSENT_ATTACHMENT}
                  <span className="rounded-full border border-ok-border bg-white px-1.5 py-0.5 text-[10px]">필수 동의서</span>
                </div>
              </div>

              {/* 첨부 동의서 = 데이터 계약(Data Contract) 조건. 발송 시 이 조건으로 동의가 생성된다. */}
              <div className="rounded-md border border-brand/30 bg-accent-50/40 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-brand">
                  <FileSignature className="h-4 w-4" />
                  제3자 정보제공 동의서 (데이터 계약) · 발송 시 함께 요청
                </div>
                <div className="text-[11px] font-semibold text-slate-500">동의 데이터 범위</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {SCOPE_OPTIONS.map(o => (
                    <button key={o.key} type="button" disabled={draft.sent}
                      onClick={() => setScope(prev => { const n = new Set(prev); n.has(o.key) ? n.delete(o.key) : n.add(o.key); return n; })}
                      className={clsx('rounded-sm border px-2 py-1 text-xs font-semibold disabled:opacity-60',
                        scope.has(o.key) ? 'border-ok-border bg-ok-bg text-ok-text' : 'border-slate-200 bg-white text-ink-400')}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 동의서 미리보기 — 발송 시 PDF로 첨부될 문서(메일 본문에는 인라인하지 않음) */}
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink-300">
                  <FileSignature className="h-4 w-4 text-brand" />
                  동의서 미리보기 · 발송 시 PDF로 첨부 예정
                  <span className="ml-auto font-normal text-slate-400">선택 조건이 바뀌면 즉시 갱신됩니다</span>
                </div>
                <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-sm border border-slate-200 bg-white p-3 text-[11px] leading-5 text-ink-200">
                  {consentDoc}
                </pre>
              </div>

              <div className="flex justify-end pt-1">
                {draft.sent ? (
                  <span className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-500">
                    <CheckCircle2 className="h-4 w-4" />
                    발송 완료 · 동의 요청됨
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => send(selected.supplierId)}
                    disabled={!draft.email.trim() || scope.size === 0 || sendingId === selected.supplierId}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sendingId === selected.supplierId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    메일·동의서 발송
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
