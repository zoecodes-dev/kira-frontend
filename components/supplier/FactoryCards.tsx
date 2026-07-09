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

// 라벨+입력칸 한 칸 — 다른 섹션(CompanyGrid: 회사정보·규제 등)과 같은 테두리 표 톤으로
//   통일한 카드 안 필드 그리드 공용 셀. 부모가 `grid ... md:grid-cols-2`로 감싸 쓴다.
function FieldCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 border-b border-r border-ink-700 px-4 py-2.5 last:border-b-0 even:border-r-0">
      <span className="text-sm font-medium text-ink-500">{label}</span>
      {children}
    </div>
  );
}

// 담당자 서브섹션 — factoryIndex(null=회사 공통)에 속한 담당자만 골라 렌더링. 카드마다 재사용.
//   이름/직책/이메일/연락처를 표(열)로 나눠 세로 정렬한다(한 줄에 다 몰아넣던 이전 방식 대신,
//   확인화면(SupplierGeneralReview)의 표 톤과 통일). max 지정 시(공장 카드 = 1명만) 그 수만큼
//   채워지면 "담당자 추가" 버튼을 숨긴다 — 회사 공통 담당자는 max 미지정(무제한).
function ContactsSubsection({ factoryIndex, contacts, onContactsChange, max }: {
  factoryIndex: number | null;
  contacts: ContactDraft[];
  onContactsChange: (rows: ContactDraft[]) => void;
  max?: number;
}) {
  const items = contacts.map((c, i) => ({ c, i })).filter(({ c }) => c.factoryIndex === factoryIndex);
  const update = (i: number, patch: Partial<ContactDraft>) =>
    onContactsChange(contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const setPrimary = (i: number) => onContactsChange(contacts.map((c, idx) => ({ ...c, isPrimary: idx === i })));
  const remove = (i: number) => onContactsChange(contacts.filter((_, idx) => idx !== i));
  const add = () => onContactsChange([...contacts, emptyContactDraft(factoryIndex)]);
  const showPrimary = max == null;
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-bold text-ink-500">담당자</div>
      {items.length === 0 && <div className="text-xs text-ink-500">등록된 담당자가 없습니다.</div>}
      {items.length > 0 && (
        <div className="overflow-hidden rounded-xs border border-ink-700">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr>
                {['이름', '직책', '이메일', '연락처', ...(showPrimary ? ['대표'] : []), ''].map((h, idx) => (
                  <th key={`${h}-${idx}`} className="border-b border-ink-700 px-2 py-1.5 text-left text-xs font-semibold text-ink-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(({ c, i }) => (
                <tr key={i} className="border-b border-ink-700 last:border-b-0">
                  <td className="px-2 py-1.5"><input value={c.name} onChange={e => update(i, { name: e.target.value })} placeholder="이름" className={editCellCls} /></td>
                  <td className="px-2 py-1.5"><input value={c.role} onChange={e => update(i, { role: e.target.value })} placeholder="직책" className={editCellCls} /></td>
                  <td className="px-2 py-1.5"><input value={c.email} onChange={e => update(i, { email: e.target.value })} placeholder="이메일" className={editCellCls} /></td>
                  <td className="px-2 py-1.5"><input value={c.mobile} onChange={e => update(i, { mobile: e.target.value })} placeholder="연락처" className={editCellCls} /></td>
                  {showPrimary && (
                    <td className="px-2 py-1.5 text-center">
                      <input type="radio" name="contact-primary" checked={c.isPrimary} onChange={() => setPrimary(i)} className="h-3.5 w-3.5 accent-brand" aria-label="대표 담당자" />
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-center">
                    <button type="button" onClick={() => remove(i)} className="rounded-xs border border-ink-700 bg-white px-2 py-1 text-xs font-semibold text-ink-500 hover:border-alert-border hover:text-alert-text">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(max == null || items.length < max) && (
        <button type="button" onClick={add} className="rounded-xs border border-accent-100 bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700 hover:bg-accent-100">담당자 추가</button>
      )}
    </div>
  );
}

// 공장 카드 안 소재구성 — 문서 업로드 + AI 처리 포함. 카드(공장)마다 독립된 파싱 상태를 가진다
//   (컨트롤드 입력이라 파싱 결과는 CompanyGrid의 defaultValue 트릭 없이 곧장 coreMinerals에 반영).
function FactoryMineralPanel({ supplierId, coreMinerals, onUpdateMineral }: {
  supplierId: string;
  coreMinerals: Record<string, number>;
  onUpdateMineral: (key: string, value: string) => void;
}) {
  const [parsingOpen, setParsingOpen] = useState(false);
  const [flagged, setFlagged] = useState<Record<string, string>>({});
  // 방금 업로드한 문서 정보 → 파싱 확인 모달에 넘겨 '파싱 중' 표시/폴링 활성화(업로드 직후 빈 화면 방지).
  const [uploadedDoc, setUploadedDoc] = useState<{ docS3Key: string; fileName: string } | null>(null);

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
    <div className="space-y-2">
      <MaterialDocParsePanel supplierId={supplierId} editable onParsed={applyExtraction} onOpenViewer={() => setParsingOpen(true)} onUploaded={setUploadedDoc} />
      <div className="mb-1 text-sm font-medium text-ink-500">이 공장의 소재 구성</div>
      {/* 다른 섹션(CompanyGrid)과 같은 테두리 표 톤 — 광물마다 한 칸, 균일하게 나뉜다. */}
      <div className="grid overflow-hidden rounded-sm border border-ink-700 md:grid-cols-2">
        {MINERAL_EDIT_KEYS.map(k => (
          <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 border-b border-r border-ink-700 px-4 py-2.5 last:border-b-0 even:border-r-0">
            <span className="text-sm font-medium text-ink-500">{MINERAL_LABELS[k]} 함량(%)</span>
            <div>
              <input
                value={coreMinerals[k] ?? ''}
                onChange={e => {
                  const v = e.target.value;
                  // 소수점 둘째 자리까지만 허용(정수부 최대 3자리) — 입력 도중 상태(빈 값·"7." 등)는 통과.
                  if (v === '' || /^\d{0,3}(\.\d{0,2})?$/.test(v)) onUpdateMineral(k, v);
                }}
                placeholder="-"
                inputMode="decimal"
                className={editCellCls}
              />
              {flagged[k] && <div className="mt-1 text-[11px] font-bold text-warn-text">{flagged[k]}</div>}
            </div>
          </div>
        ))}
      </div>
      <AiParsingReviewModal
        supplierId={supplierId}
        open={parsingOpen}
        onClose={() => setParsingOpen(false)}
        docS3KeyFilter={uploadedDoc?.docS3Key ?? null}
        initialDoc={uploadedDoc ? {
          docId: uploadedDoc.docS3Key,
          fileName: uploadedDoc.fileName,
          fileUrl: null,
          requestType: '소재구성 문서',
          docS3Key: uploadedDoc.docS3Key,
        } : null}
      />
    </div>
  );
}

export default function FactoryCards({ rows, onChange, isSmelter = false, active = true, contacts, onContactsChange, supplierId, hideDestination = false, destinations }: {
  rows: FactoryDraft[]; onChange: (rows: FactoryDraft[]) => void; isSmelter?: boolean;
  // 상위(원산지 증명서 게이트)가 아직 안 풀렸으면 false — 이 안에서는 재확인 픽커를 자동으로 띄우지 않는다.
  active?: boolean;
  contacts: ContactDraft[]; onContactsChange: (rows: ContactDraft[]) => void;
  supplierId: string;
  // 협력사 본인 화면에서는 납품처를 블라인드한다 — 이 값은 전체 공급망에 그대로 노출돼
  // 하위 협력사가 최종 고객사·타 협력사를 알게 되는 경로가 된다. 원청 화면에서만 노출.
  hideDestination?: boolean;
  // factoryId → 자동 계산된 납품처 리전(EU/US/KR). 더 이상 자유 입력이 아니라 고객사 국가 기준
  // 서버 계산값을 고정 표시한다(hideDestination=false일 때만 쓰임).
  destinations?: Map<string, string | null>;
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
              <div className="grid overflow-hidden rounded-sm border border-ink-700 md:grid-cols-2">
                <FieldCell label="국가"><input value={r.country} onChange={e => update(i, { country: e.target.value })} placeholder="국가" className={editCellCls} /></FieldCell>
                <FieldCell label="지역"><input value={r.region} onChange={e => update(i, { region: e.target.value })} placeholder="지역" className={editCellCls} /></FieldCell>
                <FieldCell label="주소"><input value={r.address} onChange={e => update(i, { address: e.target.value })} placeholder="주소" className={editCellCls} /></FieldCell>
                <FieldCell label="납품처">
                  {hideDestination
                    ? <span className="text-sm text-ink-500">비공개</span>
                    : <span className="text-sm font-semibold text-ink-100">{(r.factoryId && destinations?.get(r.factoryId)) || '-'}</span>}
                </FieldCell>
                <FieldCell label="공급비율(%)"><input value={r.supplyRatioPercent} onChange={e => update(i, { supplyRatioPercent: e.target.value })} placeholder="%" inputMode="decimal" className={editCellCls} /></FieldCell>
              </div>
              {/* 소재 구성 — 공장(사이트)마다 다룰 수 있어 회사 단위가 아니라 공장 단위로 관리한다
                  (광산뿐 아니라 모든 유형 공통 — §materials.any/materials.handled_any). */}
              <FactoryMineralPanel
                supplierId={supplierId}
                coreMinerals={r.coreMinerals}
                onUpdateMineral={(k, v) => updateMineral(i, k, v)}
              />
              <div className="border-t border-ink-700 pt-3">
                {/* 공장은 담당자 1명만 — 여러 명 필요하면 회사 공통 담당자 카드 사용. */}
                <ContactsSubsection factoryIndex={i} contacts={contacts} onContactsChange={onContactsChange} max={1} />
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
