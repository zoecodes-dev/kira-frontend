'use client';
// 위치 픽커 — "위치 먼저" 흐름. 좌표는 "직접 타이핑"이 아니라 "선택/보정 결과값".
//   공장 위치·광산(원산지) 위치 등, 지명검색→지도선택→좌표+국가/지역 자동입력이 필요한 곳에 공용으로 쓴다.
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
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
// 검색이 안 통하는 경우(사내 시설명 등)를 위한 탈출구 — 지도를 직접 보고 이동/확대해 정확한 지점을
//   클릭하면 그 좌표로 핀을 찍고 역지오코딩한다. 검색 결과가 하나도 없어도 항상 쓸 수 있다.
function ClickToPin({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) });
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
  // 국가 코드 — 예전엔 initialCountry를 그대로만 쓰고 이 화면에서 못 바꿨다. 이제 직접 수정 가능
  //   (기존 값 있으면 프리필, 없으면 빈 값에서 시작 — 비워두면 전세계 검색).
  const [country, setCountry] = useState(() => (initialCountry && /^[A-Za-z]{2}$/.test(initialCountry) ? initialCountry.toUpperCase() : ''));
  const [mapView, setMapView] = useState<'street' | 'satellite'>('street');
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery); setCandidates([]); setSearched(false); setSearchError(null);
    setCountry(initialCountry && /^[A-Za-z]{2}$/.test(initialCountry) ? initialCountry.toUpperCase() : '');
    if (initialLat != null && initialLon != null) {
      // 기존 좌표가 있으면 곧바로 역지오코딩해서 "실제로 이 좌표가 어디를 가리키는지" 확인한다.
      //   예전엔 initialQuery(공장명 텍스트)를 그대로 displayName으로 써서, 검색이 실패해도
      //   확정 버튼을 누르면 그 텍스트가 그대로 "주소"인 것처럼 저장돼버리는 문제가 있었다.
      const fallbackName = (lat: number, lon: number) => `${lat.toFixed(5)}, ${lon.toFixed(5)} (주소 확인 불가 — 좌표만 존재)`;
      setSelected({ lat: initialLat, lon: initialLon, displayName: '기존 좌표 확인 중…', admin: null, countryCode: country || null, isXinjiang: false });
      setReverseLoading(true);
      // r.lat/r.lon(가장 가까운 알려진 주소 지점)로 덮어쓰지 않는다 — 기존 좌표 그대로 유지, 라벨만 가져온다.
      geocodeReverse(initialLat, initialLon)
        .then(r => setSelected(r ? { ...r, lat: initialLat, lon: initialLon } : { lat: initialLat, lon: initialLon, displayName: fallbackName(initialLat, initialLon), admin: null, countryCode: country || null, isXinjiang: false }))
        .catch(() => setSelected({ lat: initialLat, lon: initialLon, displayName: fallbackName(initialLat, initialLon), admin: null, countryCode: country || null, isXinjiang: false }))
        .finally(() => setReverseLoading(false));
    } else setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  async function runSearch() {
    const q = query.trim(); if (!q) return;
    setSearching(true); setSearchError(null);
    try {
      const res = await geocodeSearch(q, country || undefined, 5);
      setCandidates(res.candidates); setSearched(true);
      if (res.candidates.length > 0) setSelected(res.candidates[0]);
    } catch { setSearchError('검색에 실패했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setSearching(false); }
  }
  // 핀을 끌거나(dragend) 지도를 클릭했을 때(ClickToPin) 공통으로 쓰는 역지오코딩 확정 로직.
  //   드래그는 기존 selected를 이어받고(prev 있어야 함), 클릭은 selected가 없어도(검색 실패 상태) 새로 만든다.
  async function resolveAt(lat: number, lon: number) {
    setSelected(prev => (prev ? { ...prev, lat, lon } : { lat, lon, displayName: '주소 확인 중…', admin: null, countryCode: country || null, isXinjiang: false }));
    setReverseLoading(true);
    try {
      const r = await geocodeReverse(lat, lon);
      // 주의: r.lat/r.lon은 "가장 가까운 이미 알려진 주소 지점"이라 건물 미상세 지역에선
      //   길가로 스냅되어버린다 — 사용자가 실제로 찍은 좌표(lat, lon)를 덮어쓰면 안 되고,
      //   표시용 라벨(주소/행정구역/국가)만 가져다 쓴다. 좌표의 정확성이 이 기능의 핵심이다.
      if (r) setSelected({ ...r, lat, lon });
      else setSelected(prev => ({ ...(prev ?? { admin: null, countryCode: country || null, isXinjiang: false }), lat, lon, displayName: `${lat.toFixed(5)}, ${lon.toFixed(5)} (주소 확인 불가)` }));
    } catch { /* 좌표는 유지 */ } finally { setReverseLoading(false); }
  }
  if (!open) return null;
  const center: [number, number] = selected ? [selected.lat, selected.lon] : [36.5, 127.9];
  return (
    <ModalShell
      title={title}
      subtitle="지명·주소로 검색하거나, 지도를 직접 이동·확대해 원하는 지점을 클릭해도 핀이 찍힙니다. 핀을 끌어 정확한 지점으로 보정할 수도 있습니다."
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
        {/* 검색창 — 이름·지명·주소 다 받음. 국가 코드는 여기서 직접 수정 가능(기존 값 있으면 프리필). */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
              placeholder="지명 · 주소 (예: 청주 / 우루무치 / 콜웨지)"
              className="h-9 w-full rounded-sm border border-slate-200 bg-white pl-8 pr-3 text-sm text-ink-100 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20" />
          </div>
          <input value={country} onChange={e => setCountry(e.target.value.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase())}
            title="국가 코드(ISO 2자리, 예: KR/CN) — 비우면 전세계 검색"
            placeholder="국가"
            className="h-9 w-16 rounded-sm border border-slate-200 bg-white px-2 text-center text-sm font-bold uppercase text-ink-100 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20" />
          <button type="button" onClick={runSearch} disabled={searching || !query.trim()}
            className="flex items-center gap-1.5 rounded-sm bg-accent-600 px-3 text-sm font-bold text-white enabled:hover:bg-accent-700 disabled:opacity-50">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}검색
          </button>
        </div>
        <div className="text-[11px] text-slate-500">
          {country ? <>국가 코드 <b>{country}</b>로 한정 검색 중 — 지워서 전세계 검색으로 바꿀 수 있습니다.</> : '국가 코드가 비어 있어 전세계로 검색합니다. 동명 지명이 많으면 국가 코드(예: KR)를 입력해 좁혀보세요.'}
        </div>
        {searchError && <div className="text-xs text-alert-text">{searchError}</div>}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
          {/* 후보 리스트 */}
          <div className="max-h-[320px] overflow-y-auto rounded-sm border border-slate-200">
            {candidates.length === 0 ? (
              searched ? (
                <div className="flex items-start gap-1.5 p-3 text-xs font-semibold text-alert-text">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  검색 결과가 없습니다. 사내 공장 이름 대신 실제 지명(도시명)이나 정확한 주소로 다시 검색해 보세요.
                </div>
              ) : (
                <div className="p-3 text-xs text-slate-400">검색하면 후보가 여기에 표시됩니다.</div>
              )
            ) : (
              <ul className="divide-y divide-slate-100">
                {candidates.map((c, i) => {
                  const isSel = selected?.lat === c.lat && selected?.lon === c.lon;
                  return (
                    <li key={`${c.lat}-${c.lon}-${i}`}>
                      <button type="button" onClick={() => setSelected(c)}
                        className={`block w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${isSel ? 'bg-accent-50' : ''}`}>
                        {/* 전체 주소를 먼저·크게 — 예전엔 admin(도 단위뿐인 경우가 많아 애매함)을 먼저 보여줘서
                            "여기가 맞는 곳인지" 판단이 어려웠다. 국가/좌표는 한눈에 비교하도록 맨 위로. */}
                        <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-accent-700">
                          <span>{c.countryCode ?? '—'} · {c.lat.toFixed(4)}, {c.lon.toFixed(4)}</span>
                          {c.isXinjiang && <span className="flex shrink-0 items-center gap-0.5 rounded-xs bg-alert-bg px-1 py-0.5 text-[10px] font-bold text-alert-text"><AlertTriangle className="h-2.5 w-2.5" />신장</span>}
                        </div>
                        <div className="mt-1 break-words font-semibold leading-snug text-ink-100">{c.displayName}</div>
                        {c.admin && <div className="mt-0.5 text-[11px] text-slate-400">{c.admin}</div>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="min-w-0">
            {/* 검색이 안 통하면(사내 시설명 등) 이 지도를 직접 이동·확대해 원하는 지점을 클릭하면 된다. */}
            <div className="mb-1 text-[11px] font-semibold text-accent-700">지도를 클릭하면 그 자리에 핀이 찍힙니다 (검색이 안 될 때 이 방법을 쓰세요).</div>
            <div className="relative h-[300px] overflow-hidden rounded-sm border border-slate-200">
            {/* 위성사진 토글 — 도로지도만으론 실제 건물 규모를 눈으로 확인하기 어려워서(길 잘 몰라도 되도록) 추가. */}
            <button
              type="button"
              onClick={() => setMapView(v => (v === 'street' ? 'satellite' : 'street'))}
              className="absolute left-2 top-2 z-[400] rounded-sm border border-slate-200 bg-white/95 px-2 py-1 text-[11px] font-bold text-slate-600 shadow-sm hover:bg-white"
            >
              {mapView === 'street' ? '🛰 위성사진으로 보기' : '🗺 일반 지도로 보기'}
            </button>
            {mounted ? (
              <MapContainer center={center} zoom={selected ? 12 : 6} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                {mapView === 'street' ? (
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                ) : (
                  <TileLayer attribution='Tiles &copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                )}
                {selected && <Recenter lat={selected.lat} lon={selected.lon} />}
                <ClickToPin onPick={resolveAt} />
                {candidates.map((c, i) => {
                  const isSel = selected?.lat === c.lat && selected?.lon === c.lon;
                  if (isSel) return null;
                  return <Marker key={`m-${c.lat}-${c.lon}-${i}`} position={[c.lat, c.lon]} icon={PIN} eventHandlers={{ click: () => setSelected(c) }} />;
                })}
                {selected && (
                  <Marker position={[selected.lat, selected.lon]} icon={PIN_SELECTED} draggable
                    eventHandlers={{ dragend: e => { const { lat, lng } = (e.target as L.Marker).getLatLng(); resolveAt(lat, lng); } }} />
                )}
              </MapContainer>
            ) : <div className="flex h-full items-center justify-center text-xs text-slate-400">지도 로딩…</div>}
            {reverseLoading && <div className="absolute right-2 top-2 z-[400] flex items-center gap-1 rounded-sm bg-white/90 px-2 py-1 text-[11px] text-slate-500 shadow-sm"><Loader2 className="h-3 w-3 animate-spin" /> 주소 확인 중</div>}
            </div>
          </div>
        </div>

        {/* 선택 결과 파생값 미리보기 */}
        {selected && (
          <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {/* 전체 주소를 잘리지 않게 먼저 보여준다 — 한 줄로 잘려서 판단이 안 서던 문제 수정. */}
            <div className="break-words font-semibold text-ink-100">주소: {selected.displayName || '—'}</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span>국가: <b className="text-ink-100">{selected.countryCode ?? '—'}</b></span>
              <span>지역: <b className="text-ink-100">{selected.admin ?? '—'}</b></span>
              {selected.isXinjiang && <span className="font-bold text-alert-text">⚠ 신장위구르 지역(서버 UFLPA 판정 대상)</span>}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
