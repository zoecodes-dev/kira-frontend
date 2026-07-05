'use client';

import { X } from 'lucide-react';

/**
 * 공장 좌표(주소로 자동 산출된 lat/lng)를 위성 지도로 보여주는 모달.
 * Google Maps 임베드(t=k=위성, API 키 불필요)를 iframe으로 렌더한다.
 */
export default function MapModal({
  lat, lng, name, onClose,
}: {
  lat: string;
  lng: string;
  name?: string;
  onClose: () => void;
}) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&t=k&z=16&hl=ko&output=embed`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-sm border border-ink-700 bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-slate-50 px-5 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-ink-100">공장 위치 · 위성 지도{name ? ` — ${name}` : ''}</div>
            <div className="num-mono text-[11px] text-ink-500">📍 {lat}, {lng} · 주소로 자동 산출된 좌표</div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-xs p-1 text-ink-500 hover:bg-slate-100" aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>
        <iframe
          title="공장 위치 위성 지도"
          src={src}
          className="min-h-0 w-full flex-1 border-0 bg-slate-100"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
