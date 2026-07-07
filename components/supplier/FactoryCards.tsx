'use client';

// 공장 정보 편집 카드 — 공장(사이트)마다 카드 하나. 각 카드에 그 공장 필드 + 그 공장 담당자
//   (+ 광산이면 소재구성)를 모두 담는다(탭 전환이 아니라 세로로 쌓는 카드 폼). "위치 먼저" 흐름:
//   (1) 신규 카드는 "공장정보 추가" 버튼 → 통합검색(FactoryLocationPicker)으로 위치부터 확정 →
//       그 결과값(좌표·국가·지역·주소)이 채워진 카드가 생성된다(빈 카드를 먼저 만들지 않는다).
//   (2) 편집 시작 시 이미 저장돼 있던 기존 카드(factoryId 있음)는 이번 세션에 아직 위치 재확인을
//       받지 않았으므로, active(=원산지 증명서 게이트 통과) 상태가 되면 카드별로 순서대로 통합검색을
//       강제로 다시 띄워 재확인시킨다 — 다 끝나기 전엔 나머지 입력을 가린다.
//   isSmelter면 "+ 광산 추가" 전용 버튼 노출 — 역할을 고르게 하지 않고 factoryRole='mining'으로
//   바로 고정해 카드를 만든다(직상위가 원산지 광산 위치를 놓치지 않고 넣게 하는 지점).
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Lock, MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { AiExtraction } from '@/lib/api';
import type { FactoryLocationResult } from '@/components/supplier/FactoryLocationPicker';
import MaterialDocParsePanel from '@/components/supplier/MaterialDocParsePanel';
import AiParsingReviewModal from '@/components/supplier/AiParsingReviewModal';
import {
  type ContactDraft,
  type FactoryDraft,
  emptyContactDraft,
  emptyFactoryDraft,
  FACTORY_ROLE_OPTS,
  MINERAL_CONFIDENCE_THRESHOLD,
  MINERAL_EDIT_KEYS,
  MINERAL_LABELS,
  mineralParseStateOf,
} from '@/components/supplier/factory-draft';

// leaflet은 모듈 로드 시점에 window를 참조하므로 정적 import 시 SSR 프리렌더가 깨진다(ReferenceError: window is not defined).
const FactoryLocationPicker = dynamic(() => import('@/components/supplier/FactoryLocationPicker'), { ssr: false });

const editCellCls = 'w-full min-w-24 rounded-xs border border-ink-700 bg-white px-2 py-1 text-sm text-ink-100 outline-none placeholder:text-ink-500 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20';
const factoryRoleSelectCls = 'w-full min-w-20 rounded-xs border border-ink-700 bg-white px-2 py-1 text-sm text-ink-100 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20';

// 라벨+입력칸 한 칸 — 카드 안 필드 그리드 공용 셀.
function FieldCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-ink-500">{label}</span>
      {children}
    </label>
  );
}

// 담당자 한 명 — 편집 행(카드 안 "담당자" 서브섹션 공용, 공장별/공통 카드가 함께 쓴다).
function ContactRow({ c, onUpdate, onSetPrimary, onRemove }: {
  c: ContactDraft;
  onUpdate: (patch: Partial<ContactDraft>) => void;
  onSetPrimary: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xs border border-ink-700 bg-white p-1.5">
      <input value={c.name} onChange={e => onUpdate({ name: e.target.value })} placeholder="이름" className={clsx(editCellCls, 'w-28')} />
      <input value={c.role} onChange={e => onUpdate({ role: e.target.value })} placeholder="직책" className={clsx(editCellCls, 'w-24')} />
      <input value={c.email} onChange={e => onUpdate({ email: e.target.value })} placeholder="이메일" className={clsx(editCellCls, 'w-36')} />
      <input value={c.mobile} onChange={e => onUpdate({ mobile: e.target.value })} placeholder="연락처" className={clsx(editCellCls, 'w-28')} />
      <label className="flex items-center gap-1 text-xs text-ink-400">
        <input type="radio" name="contact-primary" checked={c.isPrimary} onChange={onSetPrimary} className="h-3.5 w-3.5 accent-brand" />대표
      </label>
      <button type="button" onClick={onRemove} className="ml-auto rounded-xs border border-ink-700 bg-white px-2 py-1 text-xs font-semibold text-ink-500 hover:border-alert-border hover:text-alert-text">삭제</button>
    </div>
  );
}

// 담당자 서브섹션 — factoryIndex(null=회사 공통)에 속한 담당자만 골라 렌더링. 카드마다 재사용.
function ContactsSubsection({ factoryIndex, contacts, onContactsChange }: {
  factoryIndex: number | null;
  contacts: ContactDraft[];
  onContactsChange: (rows: ContactDraft[]) => void;
}) {
  const items = contacts.map((c, i) => ({ c, i })).filter(({ c }) => c.factoryIndex === factoryIndex);
  const update = (i: number, patch: Partial<ContactDraft>) =>
    onContactsChange(contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const setPrimary = (i: number) => onContactsChange(contacts.map((c, idx) => ({ ...c, isPrimary: idx === i })));
  const remove = (i: number) => onContactsChange(contacts.filter((_, idx) => idx !== i));
  const add = () => onContactsChange([...contacts, emptyContactDraft(factoryIndex)]);
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-bold text-ink-500">담당자</div>
      {items.length === 0 && <div className="text-xs text-ink-500">등록된 담당자가 없습니다.</div>}
      {items.map(({ c, i }) => (
        <ContactRow key={i} c={c} onUpdate={patch => update(i, patch)} onSetPrimary={() => setPrimary(i)} onRemove={() => remove(i)} />
      ))}
      <button type="button" onClick={add} className="rounded-xs border border-accent-100 bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700 hover:bg-accent-100">담당자 추가</button>
    </div>
  );
}

// 공장 카드 안 소재구성 — 문서 업로드 + AI 파싱 포함. 카드(공장)마다 독립된 파싱 상태를 가진다
//   (컨트롤드 입력이라 파싱 결과는 CompanyGrid의 defaultValue 트릭 없이 곧장 coreMinerals에 반영).
function FactoryMineralPanel({ supplierId, coreMinerals, onUpdateMineral }: {
  supplierId: string;
  coreMinerals: Record<string, number>;
  onUpdateMineral: (key: string, value: string) => void;
}) {
  const [parsingOpen, setParsingOpen] = useState(false);
  const [flagged, setFlagged] = useState<Record<string, string>>({});

  function applyExtraction(extraction: AiExtraction) {
    const nextFlagged: Record<string, string> = {};
    for (const k of MINERAL_EDIT_KEYS) {
      const ps = mineralParseStateOf(extraction, k);
      if (ps?.status === 'parsed' && ps.value != null) {
        onUpdateMineral(k, String(ps.value));
        if (ps.confidence < MINERAL_CONFIDENCE_THRESHOLD) {
          nextFlagged[k] = `검토 권장 · 신뢰도 ${Math.round(ps.confidence * 100)}%`;
        }
      }
    }
    setFlagged(nextFlagged);
    setParsingOpen(true);
  }

  return (
    <div className="space-y-2 rounded-xs border border-ink-700 bg-white p-2.5">
      <MaterialDocParsePanel supplierId={supplierId} editable onParsed={applyExtraction} onOpenViewer={() => setParsingOpen(true)} />
      <div className="flex flex-wrap items-start gap-3">
        <span className="shrink-0 pt-1.5 text-xs font-semibold text-ink-500">이 공장의 소재 구성(%)</span>
        {MINERAL_EDIT_KEYS.map(k => (
          <label key={k} className="flex flex-col gap-0.5 text-xs text-ink-400">
            <span className="flex items-center gap-1">
              {MINERAL_LABELS[k]}
              <input
                value={coreMinerals[k] ?? ''}
                onChange={e => onUpdateMineral(k, e.target.value)}
                placeholder="-"
                inputMode="decimal"
                className="w-16 rounded-xs border border-ink-700 bg-white px-1.5 py-1 text-xs text-ink-100 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20"
              />
            </span>
            {flagged[k] && <span className="text-[10px] text-warn-text">{flagged[k]}</span>}
          </label>
        ))}
      </div>
      <AiParsingReviewModal supplierId={supplierId} open={parsingOpen} onClose={() => setParsingOpen(false)} />
    </div>
  );
}

export default function FactoryCards({ rows, onChange, isSmelter = false, active = true, contacts, onContactsChange, supplierId }: {
  rows: FactoryDraft[]; onChange: (rows: FactoryDraft[]) => void; isSmelter?: boolean;
  // 상위(원산지 증명서 게이트)가 아직 안 풀렸으면 false — 이 안에서는 재확인 픽커를 자동으로 띄우지 않는다.
  active?: boolean;
  contacts: ContactDraft[]; onContactsChange: (rows: ContactDraft[]) => void;
  supplierId: string;
}) {
  const update = (i: number, patch: Partial<FactoryDraft>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const updateMineral = (i: number, key: string, value: string) =>
    update(i, {
      coreMinerals: value === ''
        ? Object.fromEntries(Object.entries(rows[i].coreMinerals).filter(([k]) => k !== key))
        : { ...rows[i].coreMinerals, [key]: Number(value) },
    });
  const remove = (i: number) => {
    onChange(rows.filter((_, idx) => idx !== i));
    // 이 공장의 담당자는 회사 공통으로 내리고, 뒤쪽 공장들의 인덱스를 한 칸씩 당긴다(삭제로 밀림 방지).
    onContactsChange(contacts.map(c => {
      if (c.factoryIndex == null) return c;
      if (c.factoryIndex === i) return { ...c, factoryIndex: null };
      return c.factoryIndex > i ? { ...c, factoryIndex: c.factoryIndex - 1 } : c;
    }));
    setVerifiedRows(prev => {
      const next = new Set<number>();
      prev.forEach(v => { if (v < i) next.add(v); else if (v > i) next.add(v - 1); });
      return next;
    });
  };
  const applyPicked = (i: number, r: FactoryLocationResult) =>
    update(i, {
      latitude: String(r.latitude), longitude: String(r.longitude),
      ...(r.country ? { country: r.country } : {}),
      ...(r.region ? { region: r.region } : {}),
      ...(r.address ? { address: r.address } : {}),
    });

  // 이번 편집 세션에서 위치를 이미 확인(픽커로 확정)한 카드 — 저장돼 있던 기존 카드(factoryId 있음)만
  // 처음엔 미확인 상태로 시작하고, 신규 추가 카드는 만들어질 때 이미 픽커를 거쳤으니 바로 확인 처리한다.
  const [verifiedRows, setVerifiedRows] = useState<Set<number>>(
    () => new Set(rows.map((r, i) => (r.factoryId ? -1 : i)).filter(i => i !== -1)),
  );
  const pendingIdx = rows.findIndex((_, i) => !verifiedRows.has(i));
  const needsVerification = active && pendingIdx !== -1;

  // 픽커 대상 — 기존 카드 재확인(existing) / 신규 추가(new, role은 광산 추가일 때만 고정).
  type PickerTarget = { mode: 'existing'; idx: number } | { mode: 'new'; role?: string } | null;
  const [picker, setPicker] = useState<PickerTarget>(null);

  // 게이트가 풀리고 재확인 대상이 생기면(카드가 바뀌어도) 자동으로 그 카드의 픽커를 띄운다 — "가장 먼저" 확인.
  useEffect(() => {
    if (needsVerification && picker === null) setPicker({ mode: 'existing', idx: pendingIdx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsVerification, pendingIdx]);

  function handleConfirm(r: FactoryLocationResult) {
    if (!picker) return;
    if (picker.mode === 'existing') {
      applyPicked(picker.idx, r);
      setVerifiedRows(prev => new Set(prev).add(picker.idx));
    } else {
      const draft: FactoryDraft = {
        ...emptyFactoryDraft(),
        ...(picker.role ? { factoryRole: picker.role } : {}),
        latitude: String(r.latitude), longitude: String(r.longitude),
        country: r.country ?? '', region: r.region ?? '', address: r.address ?? '',
      };
      setVerifiedRows(prev => new Set(prev).add(rows.length)); // 새 카드 인덱스 = 지금 길이
      onChange([...rows, draft]);
    }
    setPicker(null);
  }

  const pending = pendingIdx !== -1 ? rows[pendingIdx] : null;
  return (
    <div className="space-y-3">
      {needsVerification && pending && (
        <div className="flex items-center justify-between gap-3 rounded-sm border border-warn-border bg-warn-bg px-3 py-2 text-xs font-semibold text-warn-text">
          <span>기존에 입력된 공장 정보 위치 재확인이 필요합니다 — {pending.factoryName || `(공장명 미입력, ${pendingIdx + 1}번째 카드)`}</span>
          <button type="button" onClick={() => setPicker({ mode: 'existing', idx: pendingIdx })}
            className="shrink-0 rounded-xs border border-warn-text bg-white px-2 py-1 text-xs font-bold text-warn-text hover:bg-warn-solid hover:text-white">
            위치 재확인
          </button>
        </div>
      )}
      <div className="relative">
        <div className={clsx('space-y-3', needsVerification && 'pointer-events-none select-none opacity-40 blur-[1px]')}>
          {rows.length === 0 && (
            <div className="rounded-sm border border-dashed border-ink-700 bg-slate-50 px-4 py-6 text-center text-sm text-ink-500">등록된 공장이 없습니다. &quot;공장정보 추가&quot;를 눌러 위치부터 확정하세요.</div>
          )}
          {rows.map((r, i) => (
            <div key={i} className={clsx('space-y-3 rounded-sm border border-ink-700 bg-white p-4', r.factoryRole === 'mining' && 'bg-accent-50/40')}>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPicker({ mode: 'existing', idx: i })} title="지역/주소 통합검색 (공장명으로는 검색되지 않습니다)"
                  className="inline-flex shrink-0 items-center gap-1 rounded-xs border border-accent-100 bg-accent-50 px-2 py-1 text-xs font-semibold text-accent-700 hover:bg-accent-100">
                  <MapPin className="h-3.5 w-3.5" />통합검색
                </button>
                <input value={r.factoryName} onChange={e => update(i, { factoryName: e.target.value })} placeholder="공장명" className={clsx(editCellCls, 'flex-1 text-sm font-bold')} />
                <select value={r.factoryRole} onChange={e => update(i, { factoryRole: e.target.value })} className={factoryRoleSelectCls}>
                  {FACTORY_ROLE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button type="button" onClick={() => remove(i)} className="shrink-0 rounded-xs border border-ink-700 bg-white px-2 py-1 text-xs font-semibold text-ink-500 hover:border-alert-border hover:text-alert-text">삭제</button>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <FieldCell label="국가"><input value={r.country} onChange={e => update(i, { country: e.target.value })} placeholder="국가" className={editCellCls} /></FieldCell>
                <FieldCell label="지역"><input value={r.region} onChange={e => update(i, { region: e.target.value })} placeholder="지역" className={editCellCls} /></FieldCell>
                <FieldCell label="주소"><input value={r.address} onChange={e => update(i, { address: e.target.value })} placeholder="주소" className={editCellCls} /></FieldCell>
                <FieldCell label="납품처"><input value={r.destination} onChange={e => update(i, { destination: e.target.value })} placeholder="납품처" className={editCellCls} /></FieldCell>
                <FieldCell label="공급비율(%)"><input value={r.supplyRatioPercent} onChange={e => update(i, { supplyRatioPercent: e.target.value })} placeholder="%" inputMode="decimal" className={editCellCls} /></FieldCell>
                <FieldCell label="위도"><input value={r.latitude} onChange={e => update(i, { latitude: e.target.value })} placeholder="위도" inputMode="decimal" className={editCellCls} /></FieldCell>
                <FieldCell label="경도"><input value={r.longitude} onChange={e => update(i, { longitude: e.target.value })} placeholder="경도" inputMode="decimal" className={editCellCls} /></FieldCell>
                <FieldCell label="공장 담당자(대표 1명)"><input value={r.factoryManagerName} onChange={e => update(i, { factoryManagerName: e.target.value })} placeholder="담당자" className={editCellCls} /></FieldCell>
                <FieldCell label="직책"><input value={r.factoryManagerRole} onChange={e => update(i, { factoryManagerRole: e.target.value })} placeholder="직책" className={editCellCls} /></FieldCell>
                <FieldCell label="연락처"><input value={r.factoryManagerPhone} onChange={e => update(i, { factoryManagerPhone: e.target.value })} placeholder="연락처" className={editCellCls} /></FieldCell>
                <FieldCell label="메일"><input value={r.factoryManagerEmail} onChange={e => update(i, { factoryManagerEmail: e.target.value })} placeholder="메일" className={editCellCls} /></FieldCell>
              </div>
              {/* 소재 구성 — 공장(사이트)마다 다룰 수 있어 회사 단위가 아니라 공장 단위로 관리한다
                  (광산뿐 아니라 모든 유형 공통 — §materials.any/materials.handled_any). */}
              <FactoryMineralPanel
                supplierId={supplierId}
                coreMinerals={r.coreMinerals}
                onUpdateMineral={(k, v) => updateMineral(i, k, v)}
              />
              <div className="border-t border-ink-700 pt-3">
                <ContactsSubsection factoryIndex={i} contacts={contacts} onContactsChange={onContactsChange} />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPicker({ mode: 'new' })} className="rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-100">공장정보 추가</button>
            {/* 제련소 전용 — 역할을 고르게 하지 않고 바로 factoryRole='mining'으로, 위치부터 확정해 카드를 만든다. */}
            {isSmelter && (
              <button type="button" onClick={() => setPicker({ mode: 'new', role: 'mining' })} className="inline-flex items-center gap-1 rounded-xs border border-alert-border bg-alert-bg px-3 py-1.5 text-xs font-semibold text-alert-text hover:bg-alert-solid hover:text-white">
                <MapPin className="h-3.5 w-3.5" />+ 광산 추가
              </button>
            )}
          </div>
          {/* 회사 공통 담당자 — 특정 공장에 속하지 않는 PIC(예: 대표·컴플라이언스 담당). 항상 표시. */}
          <div className="space-y-3 rounded-sm border border-ink-700 bg-slate-50 p-4">
            <div className="text-sm font-bold text-ink-100">회사 공통 담당자</div>
            <ContactsSubsection factoryIndex={null} contacts={contacts} onContactsChange={onContactsChange} />
          </div>
        </div>
        {needsVerification && (
          <div className="absolute inset-0 z-10 flex items-start justify-center pt-6">
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
              <Lock className="h-3.5 w-3.5" />위 안내의 기존 공장 위치를 재확인해야 나머지를 입력할 수 있습니다
            </div>
          </div>
        )}
      </div>
      {/* 공장명은 지오코딩으로 못 찾는 사내 명칭이라 검색창에 넣지 않는다 — 주소가 있으면 주소, 없으면 지역(도시명)까지만. */}
      {picker && (
        <FactoryLocationPicker
          open
          title={
            picker.mode === 'existing'
              ? (rows[picker.idx]?.factoryRole === 'mining' ? '광산 위치 재확인' : '공장 위치 재확인')
              : (picker.role === 'mining' ? '광산 위치 선택' : '공장 위치 선택')
          }
          onClose={() => setPicker(null)}
          onConfirm={handleConfirm}
          initialQuery={picker.mode === 'existing' ? (rows[picker.idx]?.address || rows[picker.idx]?.region || '') : ''}
          initialCountry={picker.mode === 'existing' ? rows[picker.idx]?.country : undefined}
          initialLat={picker.mode === 'existing' && rows[picker.idx]?.latitude ? Number(rows[picker.idx].latitude) : null}
          initialLon={picker.mode === 'existing' && rows[picker.idx]?.longitude ? Number(rows[picker.idx].longitude) : null}
        />
      )}
    </div>
  );
}
