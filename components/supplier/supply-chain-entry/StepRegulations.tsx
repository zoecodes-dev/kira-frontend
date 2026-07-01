'use client';

// STEP 3 — 규제 정보: 탄소발자국 / 실사 / 인증(수기 입력) / 원산지 + 증빙
import { Plus, Trash2 } from 'lucide-react';
import type { CertRow, DocItem, RegulationsData } from './SupplyChainEntry';
import DocRow from './DocRow';
import StepFooter from '@/components/supplier/onboarding/StepFooter';

const numInput = 'h-9 w-28 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-brand';
const textInput = 'h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-brand';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 text-sm font-bold text-ink-100">{title}</div>
      {children}
    </div>
  );
}

function Docs({ list, onChange }: { list: DocItem[]; onChange: (list: DocItem[]) => void }) {
  return (
    <div className="mt-3 space-y-2">
      {list.map((doc, i) => (
        <DocRow key={doc.label} label={doc.label} value={doc.fileName} onChange={v => onChange(list.map((d, idx) => (idx === i ? { ...d, fileName: v } : d)))} />
      ))}
    </div>
  );
}

export default function StepRegulations({
  supplierId,
  data,
  onChange,
  onBack,
  onNext,
}: {
  supplierId?: string;
  data: RegulationsData;
  onChange: (d: RegulationsData) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  function setCert(i: number, patch: Partial<CertRow>) {
    onChange({ ...data, certifications: data.certifications.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  }

  return (
    <div className="space-y-4">
      <Section title="탄소 발자국">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">탄소집약도
            <input value={data.carbonIntensity} onChange={e => onChange({ ...data, carbonIntensity: e.target.value })} placeholder="kgCO₂eq/kg" className={`${numInput} ml-2`} />
          </label>
          <label className="text-sm text-slate-600">에너지원
            <input value={data.energySource} onChange={e => onChange({ ...data, energySource: e.target.value })} placeholder="예: 재생에너지 60%" className={`${numInput} ml-2 w-44`} />
          </label>
        </div>
        <Docs list={data.carbonDocs} onChange={l => onChange({ ...data, carbonDocs: l })} />
      </Section>

      <Section title="실사">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">최종 판정
            <select value={data.dueDiligenceVerdict} onChange={e => onChange({ ...data, dueDiligenceVerdict: e.target.value })} className={`${numInput} ml-2 w-32`}>
              <option value="">선택</option>
              <option value="적합">적합</option>
              <option value="조건부 적합">조건부 적합</option>
              <option value="부적합">부적합</option>
              <option value="검토중">검토중</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">교육 이수율
            <input value={data.trainingCompletionPct} onChange={e => onChange({ ...data, trainingCompletionPct: e.target.value })} placeholder="%" className={`${numInput} ml-2`} />
          </label>
        </div>
        <Docs list={data.auditDocs} onChange={l => onChange({ ...data, auditDocs: l })} />
      </Section>

      <Section title="인증">
        <div className="space-y-2">
          {data.certifications.map((c, i) => (
            <div key={i} className="rounded-md border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">인증 {i + 1}</span>
                {data.certifications.length > 1 && (
                  <button type="button" onClick={() => onChange({ ...data, certifications: data.certifications.filter((_, idx) => idx !== i) })} className="text-slate-400 hover:text-alert-text" aria-label="삭제">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input value={c.type} onChange={e => setCert(i, { type: e.target.value })} placeholder="인증서 종류 (예: ISO 14001 / Bettercoal)" className={textInput} />
                <input value={c.issuingBody} onChange={e => setCert(i, { issuingBody: e.target.value })} placeholder="발급기관" className={textInput} />
                <input value={c.certNo} onChange={e => setCert(i, { certNo: e.target.value })} placeholder="인증번호" className={textInput} />
                <input value={c.expiresAt} onChange={e => setCert(i, { expiresAt: e.target.value })} placeholder="만료일 (YYYY-MM-DD)" className={textInput} />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...data, certifications: [...data.certifications, { type: '', issuingBody: '', certNo: '', expiresAt: '' }] })}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-500 hover:border-brand hover:text-brand"
        >
          <Plus className="h-4 w-4" />
          인증 추가
        </button>
      </Section>

      <Section title="원산지">
        <Docs list={data.originDocs} onChange={l => onChange({ ...data, originDocs: l })} />
      </Section>

      <div className="rounded-sm border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <StepFooter onBack={onBack} onNext={onNext} />
      </div>
    </div>
  );
}
