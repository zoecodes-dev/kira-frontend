'use client';

// 공급망맵 입력 — 증빙 문서 업로드 공통 행 (파일명 입력 + 업로드 stub)
import { Paperclip, Upload } from 'lucide-react';

export default function DocRow({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex w-44 shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-600">
        <Paperclip className="h-3.5 w-3.5 text-slate-400" />
        <span className="truncate" title={label}>{label}</span>
        {required && <span className="text-alert-text">*</span>}
      </div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="첨부 파일명"
        className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand"
      />
      <button
        type="button"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50"
      >
        <Upload className="h-3.5 w-3.5" />
        업로드
      </button>
    </div>
  );
}
