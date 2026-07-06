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
