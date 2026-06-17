'use client';

// 하위 협력사에게 공급망 정보 입력 요청을 준비하는 Invitation 화면
import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import PageHeader from '@/components/PageHeader';
import { getContacts } from '@/lib/supplier-detail-data';

type InvitationStatus = 'ready' | 'draft' | 'sent';

interface InvitationItem {
  id: string;
  itemName: string;
  supplierName: string;
  email: string;
  status: InvitationStatus;
  subject: string;
  body: string;
  attachment: string;
}

const statusLabel: Record<InvitationStatus, string> = {
  ready: '발송 대기',
  draft: '임시 저장',
  sent: '발송 완료',
};

const candidateSuppliers = [
  { supplierName: 'Quzhou Precursor Co.', email: 'j.zhao@qz-precursor.cn', itemName: 'NCM 전구체' },
  { supplierName: 'Pilbara International Works', email: 'emma.w@piw-refining.au', itemName: 'Lithium Hydroxide' },
];

function getStatusClass(status: InvitationStatus) {
  if (status === 'sent') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'draft') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-blue-200 bg-blue-50 text-blue-700';
}

function SupplierInvitationsContent() {
  const searchParams = useSearchParams();
  const contextItem = searchParams.get('item') || '선택 노드';
  const contextSupplier = searchParams.get('supplier') || '선택 협력사';
  const contextNode = searchParams.get('node') || contextItem;
  const contextSupplierId = searchParams.get('supplierId') ?? '';
  const contactEmail = (() => {
    if (!contextSupplierId) return 'supplychain.request@partner.example';
    const contacts = getContacts(contextSupplierId);
    const primary = contacts.find(c => c.isPrimary) ?? contacts[0];
    return primary?.email ?? 'supplychain.request@partner.example';
  })();
  const [selectedId, setSelectedId] = useState<string | null>(contextSupplierId ? 'from-map' : null);
  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [inviteItems, setInviteItems] = useState<InvitationItem[]>([
    {
      id: 'from-map',
      itemName: contextItem,
      supplierName: contextSupplier,
      email: contactEmail,
      status: 'ready',
      subject: 'KIRA ESG 관리 시스템 가입 요청',
      body: '',
      attachment: '',
    },
    {
      id: 'draft-qz',
      itemName: 'Cobalt Sulfate',
      supplierName: 'Zhejiang Cobalt Co., Ltd.',
      email: 'hong.chen@ganzhou-rare.cn',
      status: 'draft',
      subject: 'KIRA ESG 관리 시스템 가입 요청',
      body: '하위 공급망 정보 입력을 위한 Invitation 발송 전 검토 부탁드립니다.',
      attachment: 'Cobalt_Sulfate_BOM.xlsx',
    },
    {
      id: 'sent-drc',
      itemName: 'Cobalt Ore',
      supplierName: 'DRC Mining Co.',
      email: 'jp.mwamba@kat-cobalt.cd',
      status: 'sent',
      subject: 'KIRA ESG 관리 시스템 가입 요청',
      body: '공급망 정보 입력 요청이 발송되었습니다.',
      attachment: 'Cobalt_Ore_Request.pdf',
    },
  ]);

  const selectedItem = inviteItems.find(item => item.id === selectedId) ?? null;

  const filteredCandidates = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return candidateSuppliers.filter(candidate => {
      const alreadyInvited = inviteItems.some(item =>
        item.email === candidate.email || item.supplierName === candidate.supplierName,
      );
      const matchesKeyword = !keyword
        || candidate.supplierName.toLowerCase().includes(keyword)
        || candidate.email.toLowerCase().includes(keyword)
        || candidate.itemName.toLowerCase().includes(keyword);
      return !alreadyInvited && matchesKeyword;
    });
  }, [inviteItems, query]);

  function updateItem(id: string, patch: Partial<InvitationItem>) {
    setInviteItems(items => items.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }

  function markDraft(item: InvitationItem) {
    updateItem(item.id, { status: 'draft' });
    setSelectedId(item.id);
  }

  function markSent(item: InvitationItem) {
    updateItem(item.id, { status: 'sent' });
    setSelectedId(item.id);
  }

  function addCandidate(candidate: typeof candidateSuppliers[number]) {
    const nextItem: InvitationItem = {
      id: `candidate-${Date.now()}`,
      itemName: candidate.itemName,
      supplierName: candidate.supplierName,
      email: candidate.email,
      status: 'ready',
      subject: 'KIRA ESG 관리 시스템 가입 요청',
      body: '',
      attachment: '',
    };
    setInviteItems(items => [nextItem, ...items]);
    setSelectedId(nextItem.id);
    setIsSearchOpen(false);
    setQuery('');
  }

  return (
    <>
      <PageHeader
        title="하위 공급망 정보 요청"
        description="선택한 협력사에게 하위 공급망 정보 입력을 요청합니다."
        actions={
          <>
            <div className="rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs">
              <span className="font-semibold text-ink-400">선택 노드</span>
              <span className="mx-1.5 text-ink-600">·</span>
              <span className="font-bold text-ink-100">{contextNode}</span>
              <span className="ml-1.5 text-ink-400">{contextSupplier}</span>
            </div>
            <Link
              href="/supply-chain/map"
              className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              공급망 맵
            </Link>
            <Link
              href="/risk/actions"
              className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
            >
              조치 이력
            </Link>
          </>
        }
      />

      <div className="p-8">
      <main className="grid h-[calc(100vh-13rem)] min-h-[640px] grid-cols-[minmax(440px,0.9fr)_minmax(520px,1.1fr)] overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
        <section className="flex min-h-0 flex-col border-r border-slate-200">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink-100">Invitation 보낸 협력사 목록</h2>
                <p className="mt-1 text-xs text-slate-500">상태 버튼을 누르면 우측 메일 발송 준비 화면이 열립니다.</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {inviteItems.map(item => {
                const selected = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    data-testid={`invitation-card-${item.id}`}
                    className={clsx(
                      'w-full rounded-md border p-3 text-left transition-colors',
                      selected ? 'border-[#046949] bg-emerald-50/60' : 'border-slate-200 bg-white hover:bg-slate-50',
                    )}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink-100">{item.supplierName}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{item.itemName}</div>
                      </div>
                      <span className={clsx('shrink-0 rounded-full border px-2 py-1 text-xs font-semibold', getStatusClass(item.status))}>
                        {statusLabel[item.status]}
                      </span>
                    </div>
                    <div className="truncate text-xs text-slate-500">{item.email}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-t border-slate-200 bg-white p-4">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              data-testid="open-supplier-invite-search"
              className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-[#046949] px-3 text-sm font-semibold text-white hover:bg-[#03563c]"
            >
              <Plus className="h-4 w-4" />
              협력사 초대하기
            </button>
          </div>
        </section>

        <section className="flex min-h-0 flex-col bg-white">
          {!selectedItem ? (
            <div className="flex flex-1 items-center justify-center p-10">
              <div className="text-center">
                <Mail className="mx-auto h-10 w-10 text-slate-300" />
                <div className="mt-4 text-lg font-semibold text-ink-100">협력사를 선택하세요</div>
                <p className="mt-2 text-sm text-slate-500">좌측 목록에서 협력사를 선택하면 메일 발송 준비 화면이 열립니다.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-500">메일 발송 준비</div>
                    <h2 className="mt-1 text-xl font-bold text-ink-100">{selectedItem.supplierName}</h2>
                    <p className="mt-1 text-sm text-slate-500">{selectedItem.itemName} 하위 공급망 정보 입력 요청</p>
                  </div>
                  <span className={clsx('rounded-full border px-3 py-1.5 text-xs font-semibold', getStatusClass(selectedItem.status))}>
                    {statusLabel[selectedItem.status]}
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-600">수신자</span>
                  <input value={selectedItem.email} readOnly className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 outline-none" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-600">제목</span>
                  <input
                    value={selectedItem.subject}
                    onChange={event => updateItem(selectedItem.id, { subject: event.target.value })}
                    disabled={selectedItem.status === 'sent'}
                    className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-ink-100 outline-none focus:border-[#046949] disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-600">메일 내용</span>
                  <textarea
                    value={selectedItem.body}
                    onChange={event => updateItem(selectedItem.id, { body: event.target.value })}
                    disabled={selectedItem.status === 'sent'}
                    className="mt-2 min-h-[240px] w-full rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-ink-100 outline-none focus:border-[#046949] disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="하위 공급망 정보 입력 요청 메일 내용을 작성하세요."
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-600">첨부파일</span>
                  <input
                    value={selectedItem.attachment}
                    onChange={event => updateItem(selectedItem.id, { attachment: event.target.value })}
                    disabled={selectedItem.status === 'sent'}
                    className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-ink-100 outline-none focus:border-[#046949] disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="예: BOM_Request_Template.xlsx"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
                {selectedItem.status === 'sent' ? (
                  <button type="button" disabled className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-500">
                    <CheckCircle2 className="h-4 w-4" />
                    발송 완료
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => markDraft(selectedItem)} className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">임시 저장</button>
                    <button type="button" onClick={() => markSent(selectedItem)} data-testid="send-selected-invitation" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#046949] px-4 text-sm font-semibold text-white hover:bg-[#03563c]">
                      <Send className="h-4 w-4" />
                      발송하기
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </main>
      </div>

      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4">
          <div className="w-full max-w-[520px] rounded-lg border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h2 className="text-base font-bold text-ink-100">협력사 초대하기</h2>
                <p className="mt-1 text-xs text-slate-500">협력사 이름, 이메일, 품목명으로 검색할 수 있습니다.</p>
              </div>
              <button type="button" onClick={() => setIsSearchOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600" aria-label="닫기">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  className="h-11 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#046949]"
                  placeholder="협력사 이름으로 검색"
                />
              </div>
              <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto">
                {filteredCandidates.map(candidate => (
                  <button
                    key={`${candidate.supplierName}-${candidate.email}`}
                    type="button"
                    onClick={() => addCandidate(candidate)}
                    className="w-full rounded-md border border-slate-200 bg-white p-3 text-left hover:border-[#046949] hover:bg-emerald-50/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-ink-100">{candidate.supplierName}</div>
                        <div className="mt-1 text-xs text-slate-500">{candidate.itemName}</div>
                      </div>
                      <span className="text-xs font-medium text-slate-500">{candidate.email}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SupplierInvitationsPage() {
  return (
    <Suspense>
      <SupplierInvitationsContent />
    </Suspense>
  );
}
