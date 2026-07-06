# HANDOFF — 공장·광산 위치 픽커 + 광산 위치 강제 입력 (v2, 2026-07-06 재작성)

> 작성: ys / 상태: **설계·코드 전체 완결 + 실브라우저 구동 검증 완료. 적용은 소유자 협의 후.**
> 이 작업은 **공유 파일(SupplierGeneralReview.tsx·lib/api.ts)을 건드려야** 해서, ys가 직접 넣지 않고 여기에 정리해 넘깁니다.
>
> **v1과 달라진 점(중요)**: v1(같은 날 이전 버전)은 입력점을 `PicRegister.tsx`(온보딩)로 잡았었는데, 이후 은진(PM)의 설계 확인 결과 **그건 틀린 방향**이었습니다. 실제로는 `factoryRole` enum에 `'mining'`이 이미 존재하고(`lib/api.ts:504`), 공장정보 테이블이 광산 행도 겸해서 받는 구조가 맞습니다. 이번 버전은 **`SupplierGeneralReview.tsx`의 공장정보 섹션(FactoryEditor)**을 대상으로 다시 짰습니다.

## 1. 무엇 / 왜

- **무엇**: 세 가지를 한 번에 처리합니다.
  1. 공장·광산 위치를 "직접 좌표 타이핑"이 아니라 "지명 검색 → 지도 확정" 방식으로 입력(`FactoryLocationPicker`).
  2. **제련소(provider_type=smelter)가 자기 공장정보 테이블에 원료 공급 광산을 최소 1곳 등록하도록 강제** — 광산은 담당자 연락처를 못 주는 게 보통이라 초대(SubSupplierInviteModal) 경로가 안 통하고, 광산 자체는 직접 입력 주체가 아니므로(완성도 면제 정책), **직상위(제련소)가 자기 공장정보 섹션 안에서 대신 입력**하는 게 유일한 실질 경로입니다.
  3. **5섹션(기업정보·공장정보·소재구성·규제·문서)을 단계별로 순차 해제** — 미완료 섹션은 반투명 오버레이로 덮어 다음으로 못 넘어가게 하고, 공장정보(광산 포함)를 2번(소재구성보다 앞)으로 당깁니다.
- **왜**: 좌표가 비거나 틀린 공장·광산은 지리검증 3종(신장·country_mismatch·EUDR)이 `location IS NOT NULL`에서 스킵 → 컴플라이언스 사각지대. 특히 **광산 좌표를 넣는 경로가 지금까지 어디에도 없었던 것**(초대는 이메일 필수라 막힘, 자체입력은 정책상 없음, 공장정보 테이블의 `factoryRole='mining'`은 있지만 자유텍스트+숫자입력이라 아무도 안 챙김)이 핵심 공백입니다.
- **스코프**: 완성도 판정(§5-1)과 선언 기록(§5-2)은 **백엔드 확장이 필요**(이 저장소엔 백엔드 없음, 별도 repo). 그 전까지는 프론트가 클라이언트 측에서 동일한 조건을 미리 적용해 UX는 완성돼 있으나, 백엔드가 이 조건을 반영해야 원청 쪽 완성도 집계에도 정확히 잡힙니다.

## 2. 누구와 협조 (선 넘는 영역)

| 건드리는 파일 | 왜 | 소유/협조 대상 |
|---|---|---|
| `lib/api.ts` (지오코딩 함수 2개 추가) | 픽커가 백엔드 지오코딩 호출 | **은진·지혜** (공유 핫파일) |
| `app/suppliers/check-info/SupplierGeneralReview.tsx` (섹션 순서·FactoryEditor·게이팅 UI) | 공장정보 입력 테이블이 이 파일에만 있음 | **은진·지혜** (이 화면 소유) |
| `package.json` / lock (`leaflet`,`react-leaflet`,`@types/leaflet`) | 지도 렌더 | 머지 순서 공유(락파일 충돌 주의) |
| (후속) 백엔드 완성도 판정·선언 저장 필드 | §5 | **백엔드 담당**(supplier 도메인) |
| (참고) 원산지증명서 AI 파싱 | §4-4-d, §5-3 | **은지(C)** 진행 중인 것으로 파악 — 이번 건 프론트는 업로드 스텁만, 실 파싱 연동은 은지 파이프라인 완성 후 |

> `components/supplier/FactoryLocationPicker.tsx`는 **신규 파일**이라 충돌 없음 — 소유자가 그대로 추가하면 됩니다.

## 3. 검증 상태 (오늘 실측)

- 백엔드 `GET /supply-chain/geocode/search`·`/reverse` **실제 브라우저로 구동해 응답 확인**(로컬 mock 아님 — 실제 지오코딩 서비스가 응답함).
  - "우루무치" 검색 → `新疆维吾尔自治区`, `CN`, `43.91, 87.49`, **신장 배지 정확히 표시**.
  - "콜웨지"(DRC 코발트 광산 지대) 검색 → `Kolwezi, Mutshatsha, Lualaba, République démocratique du Congo`, `CD`, `-10.717, 25.467` — 지도에 실제 GECAMINES 광구 인근까지 정확히 표시.
- `SupplierGeneralReview.tsx`에 아래 §4-4 전체를 적용한 상태로 **`tsc --noEmit` 통과 확인**.
- Playwright로 실제 화면 구동해 전체 흐름 확인(콘솔 에러 0건 — 무관한 사전 존재 500 리소스 에러 1건 제외):
  1. 섹션 순서가 기업정보→**공장정보**→소재구성→규제→문서로 재배치됨을 확인.
  2. 이전 섹션(기업정보) 미완료 시 2~5번 섹션에 반투명 잠금 오버레이("🔒 이전 섹션을 완료하면 열립니다") 표시 확인.
  3. `provider_type=smelter`일 때만 "+ 광산 추가" 버튼 노출(일반 협력사는 버튼 자체가 없음) 확인.
  4. "+ 광산 추가" 클릭 → 역할 select가 **자동으로 "광산" 선택된 채** 행 생성 확인.
  5. 위도 셀 옆 지도 핀 버튼 클릭 → 픽커 열림 → 검색·지도 확정 → 국가/지역/주소/위도/경도 **자동 반영** 확인.
  6. 좌표 채우기 전엔 "이 외에 원료를 공급받는 광산이 더 없습니다" 체크박스가 **비활성화**, 좌표 채운 후 활성화되어 체크 가능함을 확인.

## 4. 어떻게 (적용 절차 — 소유자가 실행)

### 4-1. 의존성
```bash
npm install leaflet@^1.9 react-leaflet@^4.2 && npm install -D @types/leaflet
```

### 4-2. `lib/api.ts` — `getSupplyChainAlternatives` 아래에 추가
```ts
// ── 지오코딩(공장·광산 위치 픽커) — GET /supply-chain/geocode/{search,reverse} ──────
//   응답은 래퍼가 snake→camel 변환하되 lat/lon(단어 단위)은 그대로 유지된다.
//   isXinjiang은 서버 UFLPA 판정 신호 — 프론트는 표시만.
export interface GeocodeCandidate {
  lat: number;
  lon: number;
  displayName: string;
  admin: string | null;
  countryCode: string | null;
  isXinjiang: boolean;
}
export interface GeocodeSearchResult {
  query: string;
  candidates: GeocodeCandidate[];
}
/** 지명→후보. country(alpha2) 있으면 그 나라 한정, 없으면 전세계(동명 해소). */
export const geocodeSearch = (query: string, country?: string, limit = 5) => {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (country) params.set("country", country);
  return api.get<GeocodeSearchResult>(`/supply-chain/geocode/search?${params.toString()}`);
};
/** 좌표→국가/행정구역 역추출. 없으면 null. */
export const geocodeReverse = (lat: number, lon: number) =>
  api.get<GeocodeCandidate | null>(`/supply-chain/geocode/reverse?lat=${lat}&lon=${lon}`);
```

### 4-3. 신규 파일 `components/supplier/FactoryLocationPicker.tsx`
아래 전체를 그대로 새 파일로 저장하면 됩니다(오늘 세션에서 완성·실브라우저 검증된 버전 — v1 대비 `title` prop이 추가돼 공장/광산에 따라 모달 제목이 바뀝니다).
```tsx
'use client';
// 위치 픽커 — "위치 먼저" 흐름. 좌표는 "직접 타이핑"이 아니라 "선택/보정 결과값".
//   공장 위치·광산(원산지) 위치 등, 지명검색→지도선택→좌표+국가/지역 자동입력이 필요한 곳에 공용으로 쓴다.
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Loader2, AlertTriangle } from 'lucide-react';
import ModalShell from '@/components/supply-chain/ModalShell';
import { geocodeSearch, geocodeReverse, type GeocodeCandidate } from '@/lib/api';

export interface FactoryLocationResult {
  latitude: number; longitude: number;
  country: string | null; region: string | null;
  address: string; displayName: string; isXinjiang: boolean;
}
function pin(color: string) {
  return L.divIcon({
    className: '',
    html: `<svg width="26" height="26" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white" stroke="none"/></svg>`,
    iconSize: [26, 26], iconAnchor: [13, 26],
  });
}
const PIN = pin('#2563eb');
const PIN_SELECTED = pin('#dc2626');
function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lon], Math.max(map.getZoom(), 12)); }, [lat, lon, map]);
  return null;
}
export default function FactoryLocationPicker({
  open, onClose, onConfirm, title = '위치 선택', initialQuery = '', initialCountry, initialLat, initialLon,
}: {
  open: boolean; onClose: () => void; onConfirm: (r: FactoryLocationResult) => void;
  title?: string;
  initialQuery?: string; initialCountry?: string; initialLat?: number | null; initialLon?: number | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [selected, setSelected] = useState<GeocodeCandidate | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const country = initialCountry && /^[A-Za-z]{2}$/.test(initialCountry) ? initialCountry.toUpperCase() : undefined;
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery); setCandidates([]); setSearched(false); setSearchError(null);
    if (initialLat != null && initialLon != null) {
      setSelected({ lat: initialLat, lon: initialLon, displayName: initialQuery || '기존 좌표', admin: null, countryCode: country ?? null, isXinjiang: false });
    } else setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  async function runSearch() {
    const q = query.trim(); if (!q) return;
    setSearching(true); setSearchError(null);
    try {
      const res = await geocodeSearch(q, country, 5);
      setCandidates(res.candidates); setSearched(true);
      if (res.candidates.length > 0) setSelected(res.candidates[0]);
    } catch { setSearchError('검색에 실패했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setSearching(false); }
  }
  async function handleDragEnd(lat: number, lon: number) {
    setSelected(prev => (prev ? { ...prev, lat, lon } : prev));
    setReverseLoading(true);
    try {
      const r = await geocodeReverse(lat, lon);
      if (r) setSelected(r);
      else setSelected(prev => (prev ? { ...prev, lat, lon, admin: null, displayName: `${lat.toFixed(5)}, ${lon.toFixed(5)}` } : prev));
    } catch { /* 좌표 유지 */ } finally { setReverseLoading(false); }
  }
  if (!open) return null;
  const center: [number, number] = selected ? [selected.lat, selected.lon] : [36.5, 127.9];
  return (
    <ModalShell
      title={title}
      subtitle="지명·주소·이름으로 검색해 지도에서 실제 위치를 선택하세요. 핀을 끌어 정확한 지점으로 보정할 수 있습니다."
      onClose={onClose} maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-xs text-slate-500">
            {selected ? (
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" />
                <span className="truncate">{selected.lat.toFixed(5)}, {selected.lon.toFixed(5)}{selected.displayName ? ` · ${selected.displayName}` : ''}</span>
              </span>
            ) : '아직 위치가 선택되지 않았습니다.'}
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={onClose} className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">취소</button>
            <button type="button" disabled={!selected || reverseLoading}
              onClick={() => { if (!selected) return; onConfirm({ latitude: selected.lat, longitude: selected.lon, country: selected.countryCode, region: selected.admin, address: selected.displayName, displayName: selected.displayName, isXinjiang: selected.isXinjiang }); }}
              className="rounded-sm bg-accent-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm enabled:hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50">이 위치로 확정</button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* 검색창 — 이름·지명·주소 다 받음 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
              placeholder="지명 · 주소 (예: 청주 / 우루무치 / 콜웨지)"
              className="h-9 w-full rounded-sm border border-slate-200 bg-white pl-8 pr-3 text-sm text-ink-100 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20" />
          </div>
          <button type="button" onClick={runSearch} disabled={searching || !query.trim()}
            className="flex items-center gap-1.5 rounded-sm bg-accent-600 px-3 text-sm font-bold text-white enabled:hover:bg-accent-700 disabled:opacity-50">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}검색
          </button>
        </div>
        {country && <div className="text-[11px] text-slate-500">국가 <b>{country}</b>로 한정 검색 중 (동명 지명이 많으면 국가 코드를 비워 전세계로 검색).</div>}
        {searchError && <div className="text-xs text-alert-text">{searchError}</div>}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
          {/* 후보 리스트 */}
          <div className="max-h-[320px] overflow-y-auto rounded-sm border border-slate-200">
            {candidates.length === 0 ? (
              <div className="p-3 text-xs text-slate-400">{searched ? '검색 결과가 없습니다. 지명이나 주소로 다시 검색해 보세요.' : '검색하면 후보가 여기에 표시됩니다.'}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {candidates.map((c, i) => {
                  const isSel = selected?.lat === c.lat && selected?.lon === c.lon;
                  return (
                    <li key={`${c.lat}-${c.lon}-${i}`}>
                      <button type="button" onClick={() => setSelected(c)}
                        className={`block w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${isSel ? 'bg-accent-50' : ''}`}>
                        <div className="flex items-center gap-1 font-semibold text-ink-100">
                          <span className="truncate">{c.admin || c.displayName}</span>
                          {c.isXinjiang && <span className="flex shrink-0 items-center gap-0.5 rounded-xs bg-alert-bg px-1 py-0.5 text-[10px] font-bold text-alert-text"><AlertTriangle className="h-2.5 w-2.5" />신장</span>}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-slate-500">{c.displayName}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">{c.countryCode ?? '—'} · {c.lat.toFixed(4)}, {c.lon.toFixed(4)}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {/* 지도 */}
          <div className="relative h-[320px] overflow-hidden rounded-sm border border-slate-200">
            {mounted ? (
              <MapContainer center={center} zoom={selected ? 12 : 6} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {selected && <Recenter lat={selected.lat} lon={selected.lon} />}
                {candidates.map((c, i) => {
                  const isSel = selected?.lat === c.lat && selected?.lon === c.lon;
                  if (isSel) return null;
                  return <Marker key={`m-${c.lat}-${c.lon}-${i}`} position={[c.lat, c.lon]} icon={PIN} eventHandlers={{ click: () => setSelected(c) }} />;
                })}
                {selected && (
                  <Marker position={[selected.lat, selected.lon]} icon={PIN_SELECTED} draggable
                    eventHandlers={{ dragend: e => { const { lat, lng } = (e.target as L.Marker).getLatLng(); handleDragEnd(lat, lng); } }} />
                )}
              </MapContainer>
            ) : <div className="flex h-full items-center justify-center text-xs text-slate-400">지도 로딩…</div>}
            {reverseLoading && <div className="absolute right-2 top-2 z-[400] flex items-center gap-1 rounded-sm bg-white/90 px-2 py-1 text-[11px] text-slate-500 shadow-sm"><Loader2 className="h-3 w-3 animate-spin" /> 주소 확인 중</div>}
          </div>
        </div>

        {/* 선택 결과 파생값 미리보기 */}
        {selected && (
          <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>국가: <b className="text-ink-100">{selected.countryCode ?? '—'}</b></span>
              <span>지역: <b className="text-ink-100">{selected.admin ?? '—'}</b></span>
              {selected.isXinjiang && <span className="font-bold text-alert-text">⚠ 신장위구르 지역(서버 UFLPA 판정 대상)</span>}
            </div>
            <div className="mt-1 truncate">주소: {selected.displayName || '—'}</div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
```
> Leaflet은 클라이언트 전용이라 `mounted` 가드 후 `MapContainer` 렌더. 타일은 `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`(앱 CSP 커스텀 없음 확인, 외부 타일 로드 가능). **위 코드로 컴포넌트 전체가 완결됨.**

### 4-4. `SupplierGeneralReview.tsx` 변경 — 7곳

**(a) import 추가**
```ts
// 기존 lucide-react import 블록에 Lock, MapPin 추가
import { /* ...기존 항목..., */ Lock, MapPin } from 'lucide-react';
import FactoryLocationPicker, { type FactoryLocationResult } from '@/components/supplier/FactoryLocationPicker';
```

**(b) `sections` 배열 — factories를 2번으로, materials를 3번으로 스왑**
```ts
const sections: CollectionSection[] = [
  { key: 'company', order: 1, title: '기업 기본정보', /* ...기존과 동일... */ },
  { key: 'factories', order: 2, title: '공장 정보', completed: 0, total: 1, status: '미입력',
    icon: <Building2 className="h-5 w-5" />, comment: '공급비율·위치(원산지)·공장 담당자.', missing: [] },
  { key: 'materials', order: 3, title: '소재 구성', completed: 0, total: 1, status: '미입력',
    icon: <Box className="h-5 w-5" />, comment: '핵심광물(Li/Co/Ni) 함량(%)을 입력하세요.', missing: [] },
  { key: 'regulation', order: 4, title: '규제', /* ...기존과 동일... */ },
  { key: 'documents', order: 5, title: '필요 문서', /* ...기존과 동일... */ },
];
```

**(c) `FactoryEditor` 전체 교체** — 역할 자유텍스트→select, 위도 셀에 지도버튼, "+ 광산 추가" 버튼, 픽커 마운트
```tsx
// 역할(factoryRole) enum — 백엔드 계약과 동일한 값(lib/api.ts:504). 라벨만 한글.
const FACTORY_ROLE_OPTS: { value: string; label: string }[] = [
  { value: '', label: '선택' },
  { value: 'headquarters', label: '본사' },
  { value: 'production', label: '생산' },
  { value: 'outsourcing', label: '위탁' },
  { value: 'processing', label: '가공' },
  { value: 'mining', label: '광산' },
];
const factoryRoleSelectCls = 'w-full min-w-20 rounded-xs border border-ink-700 bg-white px-2 py-1 text-sm text-ink-100 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20';

// 공장 정보 편집 테이블 — 행 추가/삭제. 좌표는 latitude/longitude 입력(있으면 coordinates로 매핑).
//   isSmelter면 "+ 광산 추가" 전용 버튼 노출 — 역할을 고르게 하지 않고 factoryRole='mining'으로 바로 고정해
//   행을 만든다(직상위가 원산지 광산 위치를 놓치지 않고 넣게 하는 지점, 역할 선택 실수 방지).
function FactoryEditor({ rows, onChange, isSmelter = false }: { rows: FactoryDraft[]; onChange: (rows: FactoryDraft[]) => void; isSmelter?: boolean }) {
  const update = (i: number, patch: Partial<FactoryDraft>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, emptyFactoryDraft()]);
  const addMining = () => onChange([...rows, { ...emptyFactoryDraft(), factoryRole: 'mining' }]);
  const [pickerRow, setPickerRow] = useState<number | null>(null);
  const applyPicked = (i: number, r: FactoryLocationResult) =>
    update(i, {
      latitude: String(r.latitude), longitude: String(r.longitude),
      ...(r.country ? { country: r.country } : {}),
      ...(r.region ? { region: r.region } : {}),
      ...(r.address ? { address: r.address } : {}),
    });
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-sm border border-ink-700">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['공장명', '국가', '지역', '주소', '역할', '납품처', '공급비율(%)', '위도', '경도', '담당자 이름', '직책', '연락처', '메일', ''].map((h, i) => (
                <th key={`${h}-${i}`} className="whitespace-nowrap border-b border-ink-700 px-3 py-2.5 text-left text-xs font-semibold text-ink-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={clsx('border-b border-ink-700 last:border-b-0', r.factoryRole === 'mining' && 'bg-accent-50/40')}>
                <td className="px-2 py-1.5"><input value={r.factoryName} onChange={e => update(i, { factoryName: e.target.value })} placeholder="공장명" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.country} onChange={e => update(i, { country: e.target.value })} placeholder="국가" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.region} onChange={e => update(i, { region: e.target.value })} placeholder="지역" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.address} onChange={e => update(i, { address: e.target.value })} placeholder="주소" className={editCellCls} /></td>
                <td className="px-2 py-1.5">
                  <select value={r.factoryRole} onChange={e => update(i, { factoryRole: e.target.value })} className={factoryRoleSelectCls}>
                    {FACTORY_ROLE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5"><input value={r.destination} onChange={e => update(i, { destination: e.target.value })} placeholder="납품처" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.supplyRatioPercent} onChange={e => update(i, { supplyRatioPercent: e.target.value })} placeholder="%" inputMode="decimal" className={editCellCls} /></td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setPickerRow(i)} title="지도에서 위치 선택"
                      className="shrink-0 rounded-xs border border-accent-100 bg-accent-50 p-1 text-accent-700 hover:bg-accent-100">
                      <MapPin className="h-3.5 w-3.5" />
                    </button>
                    <input value={r.latitude} onChange={e => update(i, { latitude: e.target.value })} placeholder="위도" inputMode="decimal" className={editCellCls} />
                  </div>
                </td>
                <td className="px-2 py-1.5"><input value={r.longitude} onChange={e => update(i, { longitude: e.target.value })} placeholder="경도" inputMode="decimal" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.factoryManagerName} onChange={e => update(i, { factoryManagerName: e.target.value })} placeholder="담당자" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.factoryManagerRole} onChange={e => update(i, { factoryManagerRole: e.target.value })} placeholder="직책" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.factoryManagerPhone} onChange={e => update(i, { factoryManagerPhone: e.target.value })} placeholder="연락처" className={editCellCls} /></td>
                <td className="px-2 py-1.5"><input value={r.factoryManagerEmail} onChange={e => update(i, { factoryManagerEmail: e.target.value })} placeholder="메일" className={editCellCls} /></td>
                <td className="px-2 py-1.5 text-center">
                  <button type="button" onClick={() => remove(i)} className="rounded-xs border border-ink-700 bg-white px-2 py-1 text-xs font-semibold text-ink-500 hover:border-alert-border hover:text-alert-text">삭제</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={14} className="px-3 py-6 text-center text-sm text-ink-500">등록된 공장이 없습니다. 행을 추가하세요.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={add} className="rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-100">행 추가</button>
        {isSmelter && (
          <button type="button" onClick={addMining} className="inline-flex items-center gap-1 rounded-xs border border-alert-border bg-alert-bg px-3 py-1.5 text-xs font-semibold text-alert-text hover:bg-alert-solid hover:text-white">
            <MapPin className="h-3.5 w-3.5" />+ 광산 추가
          </button>
        )}
      </div>
      {pickerRow !== null && rows[pickerRow] && (
        <FactoryLocationPicker
          open
          title={rows[pickerRow].factoryRole === 'mining' ? '광산 위치 선택' : '공장 위치 선택'}
          onClose={() => setPickerRow(null)}
          onConfirm={r => { applyPicked(pickerRow, r); setPickerRow(null); }}
          initialQuery={rows[pickerRow].factoryName || rows[pickerRow].address || rows[pickerRow].region}
          initialCountry={rows[pickerRow].country}
          initialLat={rows[pickerRow].latitude ? Number(rows[pickerRow].latitude) : null}
          initialLon={rows[pickerRow].longitude ? Number(rows[pickerRow].longitude) : null}
        />
      )}
    </div>
  );
}
```

**(d) 신규 함수 `OriginCertUploadPanel`** — `MaterialDocParsePanel` 바로 아래에 추가(원산지증명서 업로드, 참고용 — 실제 AI 파싱은 은지 파이프라인 완성 후 연동 지점)
```tsx
// ── 원산지 증명서 업로드(공장정보 섹션 최상단) ──────────────────────────────
//   있으면 먼저 첨부하도록 유도하는 참고용 스텝. 파일은 업로드해 보관하지만, 아직 은지(C)의
//   원산지증명서 전용 AI 파싱 파이프라인이 백엔드에 없어 자동으로 위치를 채우진 못한다(그 파이프라인이
//   생기면 여기서 파싱 결과를 받아 FactoryLocationPicker의 initialQuery로 넘기면 됨 — 그 전까지는
//   증명서 유무와 무관하게 아래 공장정보 통합검색+지도확정이 항상 필수 경로).
function OriginCertUploadPanel({ supplierId }: { supplierId: string }) {
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    setError('');
    try {
      const meta = await uploadFile(f, `origin-cert:${supplierId}`);
      setFileName(meta.fileName || f.name);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-sm border border-ink-700 bg-white px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink-100">원산지 증명서 (있으면 먼저 첨부)</div>
        <div className={`mt-0.5 truncate text-xs ${error ? 'text-alert-text' : 'text-ink-500'}`}>
          {error || (uploading ? '업로드 중…' : fileName ? `첨부됨 · ${fileName} (검토 참고용)` : '없어도 진행 가능 — 아래 공장정보 입력은 증명서 유무와 무관하게 항상 필요합니다.')}
        </div>
      </div>
      <label className={`shrink-0 rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 ${uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-accent-100'}`}>
        {fileName ? '파일 변경' : '자료 업로드'}
        <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" disabled={uploading} onChange={handleSelect} />
      </label>
    </div>
  );
}
```

**(e) `SectionContent` — props 3개 추가 + factories 분기 교체**
```ts
// 함수 시그니처에 추가
function SectionContent({ /* ...기존..., */ noMoreMines = false, setNoMoreMines, isSmelter = false }: {
  /* ...기존 타입..., */
  noMoreMines?: boolean;
  setNoMoreMines?: (v: boolean) => void;
  isSmelter?: boolean;
}) {
```
```tsx
// section.key === 'factories' 분기(editable 쪽)를 아래로 교체
} else if (section.key === 'factories') {
  if (editable && factoriesDraft && setFactoriesDraft) {
    const miningRows = factoriesDraft.filter(f => f.factoryRole === 'mining');
    const miningRowsComplete = miningRows.length > 0 && miningRows.every(f => f.latitude.trim() !== '' && f.longitude.trim() !== '');
    content = (
      <div className="space-y-5">
        <OriginCertUploadPanel supplierId={supplierId} />
        <div>
          <div className="mb-2 text-xs font-bold text-ink-500">공장 정보 (공급비율·위치(원산지)·역할)</div>
          <FactoryEditor rows={factoriesDraft} onChange={setFactoriesDraft} isSmelter={isSmelter} />
        </div>
        {isSmelter && (
          <div className="rounded-sm border border-slate-200 bg-slate-50 p-3">
            {!miningRowsComplete && (
              <div className="mb-2 text-xs font-semibold text-alert-text">제련소는 원료를 공급받는 광산을 최소 1곳 등록하고 위치를 확정해야 합니다 ("+ 광산 추가" 버튼).</div>
            )}
            <label className={clsx('flex cursor-pointer items-start gap-2 text-sm text-ink-300', !miningRowsComplete && 'pointer-events-none opacity-40')}>
              <input type="checkbox" checked={noMoreMines} onChange={e => setNoMoreMines?.(e.target.checked)} disabled={!miningRowsComplete} className="mt-0.5 h-4 w-4 accent-brand" />
              <span>
                <b>이 외에 원료를 공급받는 광산이 더 없습니다.</b>
                <span className="mt-0.5 block text-[11px] text-slate-500">이 선언은 기록으로 남습니다. 실제로 광산이 더 있는데 누락하면 원산지 추적이 끊깁니다.</span>
              </span>
            </label>
          </div>
        )}
        {contactsDraft && setContactsDraft && (
          <div>
            <div className="mb-2 text-xs font-bold text-ink-500">협력사 담당자 (PIC · 연락처)</div>
            <ContactEditor rows={contactsDraft} onChange={setContactsDraft} />
          </div>
        )}
      </div>
    );
  } else {
    /* ...기존 읽기전용 분기 그대로... */
  }
}
```

**(f) `AccordionSection` — `locked`·`isSmelter`·`noMoreMines`/`setNoMoreMines` prop 추가 + 잠금 오버레이**
```tsx
function AccordionSection({
  /* ...기존 props..., */
  noMoreMines, setNoMoreMines, isSmelter = false, locked = false,
}: {
  /* ...기존 타입..., */
  noMoreMines?: boolean;
  setNoMoreMines?: (v: boolean) => void;
  isSmelter?: boolean;
  locked?: boolean;  // 이전 섹션 미완료 — 내용은 비쳐 보이되 편집 불가
}) {
  const needsRequest = /* 기존과 동일 */;
  return (
    <section id={`section-${section.key}`} className="scroll-mt-24 overflow-hidden border-b border-ink-700 bg-white first:rounded-t-sm first:border-t last:rounded-b-sm">
      <div className="flex w-full items-center justify-between gap-3 border-b border-ink-700 bg-slate-50/60 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {/* ...기존 아이콘·타이틀... */}
          {locked && (
            <span className="inline-flex items-center gap-1 rounded-xs border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
              <Lock className="h-3 w-3" />이전 섹션 완료 필요
            </span>
          )}
        </div>
        {/* ...기존 상태뱃지·요청버튼... */}
      </div>
      <div className="relative">
        <SectionContent
          /* ...기존 props..., */
          noMoreMines={noMoreMines}
          setNoMoreMines={setNoMoreMines}
          isSmelter={isSmelter}
        />
        {locked && (
          <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/70 pt-10 backdrop-blur-[1px]">
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
              <Lock className="h-3.5 w-3.5" />이전 섹션을 완료하면 열립니다
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
```

**(g) `SupplierGeneralReviewContent` — state 추가 + `liveSections` 오버라이드 + 렌더 루프 게이팅**
```ts
// factoriesDraft/contactsDraft state 선언 바로 아래
const [noMoreMines, setNoMoreMines] = useState(false);
```
```ts
// 기존 const liveSections = api ? sections.map(...) : sections; 를 아래로 교체
// 제련소 광산 요건 — 백엔드 완성도 SSOT가 아직 이 조건을 모르므로(§5-1 요청) 클라이언트에서 덧씌운다:
//   역할=광산 행이 최소 1개 있고, 전부 좌표가 있고, "추가 광산 없음"을 명시 선언해야 factories 완료.
const isSmelter = api?.detail?.providerType === 'smelter';
const miningRows = factoriesDraft.filter(f => f.factoryRole === 'mining');
const mineRequirementMet = !isSmelter || (miningRows.length > 0 && miningRows.every(f => f.latitude.trim() !== '' && f.longitude.trim() !== '') && noMoreMines);
const liveSections = (api ? sections.map(s => ({ ...s, ...deriveSectionMeta(s.key, api) })) : sections)
  .map(s => (s.key === 'factories' && isSmelter && !mineRequirementMet)
    ? { ...s, status: '미입력' as ReviewStatus, missing: Array.from(new Set([...s.missing, '광산 위치(최소 1곳) + 추가 광산 없음 확인'])) }
    : s);
```
```tsx
// liveSections.map(section => <AccordionSection .../>) 렌더 루프를 아래로 교체
{liveSections.map((section, idx) => {
  const locked = editable && idx > 0 && !['완료', '해당 없음'].includes(liveSections[idx - 1].status);
  return (
    <AccordionSection
      key={section.key}
      section={section}
      onRequestSection={openRequestForSection}
      real={api}
      editable={editable}
      showRequest={isPrime}
      isPrime={isPrime}
      supplierId={supplierId}
      factoriesDraft={factoriesDraft}
      setFactoriesDraft={setFactoriesDraft}
      contactsDraft={contactsDraft}
      setContactsDraft={setContactsDraft}
      noMoreMines={noMoreMines}
      setNoMoreMines={setNoMoreMines}
      isSmelter={isSmelter}
      locked={locked}
    />
  );
})}
```

> 게이팅은 `editable`(자료 제출 입력 모드)일 때만 적용됩니다. 원청 검토(isPrime) · 협력사 보기 모드는 항상 전체 노출 — 검토는 순서를 강제할 이유가 없기 때문입니다.

## 5. 후속(백엔드 요청 — 별도 repo, 이번 세션에서 코드 작업 불가)

1. **완성도 판정 확장**: `deriveSectionMetaFromBackend`가 참조하는 백엔드 완성도 계산에 "provider_type=smelter는 factories 중 role=mining 행이 최소 1개 있고 좌표가 있어야 완료" 조건 추가. 지금은 프론트가 클라이언트에서 동일 조건을 미리 적용해두었지만(§4-4-g), 백엔드가 반영해야 원청 쪽 집계·"미입력 N건 요청" 배너에도 정확히 잡힙니다.
2. **"추가 광산 없음" 선언 저장 필드**: 선언 여부(boolean) + 선언 시각(timestamp) 저장 컬럼 신설. 지금은 프론트 로컬 상태(`noMoreMines`)로만 존재 — 새로고침하면 날아갑니다. `PicRegister`의 "하위 협력사 없음(말단)" 선언과 동일한 성격(감사 시 증거로 남아야 함).
3. **(참고, 급하지 않음) 원산지증명서 AI 파싱**: 은지(C)가 진행 중인 것으로 파악. 완성되면 `OriginCertUploadPanel`의 업로드 콜백에서 파싱 결과를 받아 `FactoryEditor`의 `initialQuery`로 넘기는 자리만 있으면 연결 가능(§4-4-d 주석 참고). **증명서에 실제로 좌표·상세주소까지 나오는지는 재확인 필요** — 이 저장소의 `OriginCertificate` mock 모델엔 국가 필드만 있고, 실제 원산지증명서(FTA/UFLPA반증/CMRT 등)도 통상 국가 단위 판정이라 완전한 대체 경로는 아님. 있으면 참고, 없어도 공장정보 통합입력은 항상 필수라는 게 이번 설계의 전제.

## 6. 안 하는 것 / 주의사항

- **하드차단(제출 자체를 막는 것) 아님**: 픽커·게이팅 모두 "완료해야 다음 섹션이 보인다"는 UX 유도지, 백엔드 제출 자체를 막는 조건은 아님(§5-1 백엔드 조건이 반영되면 원청 쪽 완성도 표시에는 정확히 잡힘).
- **`PicRegister.tsx`(온보딩) / `SubSupplierInviteModal.tsx`(협력사 포털 하위초대)는 이번 스코프 아님** — 처음엔 이쪽을 입력점으로 고려했으나, 광산이 PIC 이메일을 못 주는 게 보통이라 초대 경로 자체가 광산에 안 맞는다는 게 확인돼 방향을 공장정보 테이블 쪽으로 정정했습니다. 착오 없으시길.
- **provider_type이 smelter가 아닌 다른 유형(예: trader)이 광산을 소싱하는 경우**는 이번 설계에 안 들어있음 — 필요하면 `isSmelter` 조건을 확장하는 별도 논의 필요.
