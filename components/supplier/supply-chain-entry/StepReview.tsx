'use client';

// STEP 4 — 검토·제출. 요약 확인 후 제출(mock) → 원청 승인 대기. 임시 저장(로컬).
import Link from 'next/link';
import { CheckCircle2, Clock, Save, Send } from 'lucide-react';
import type { ContextData, MaterialsData, RegulationsData } from './SupplyChainEntry';

const providerLabel: Record<string, string> = {
  manufacturer: '제조사',
  recycler: '재활용',
  trader: '트레이더',
  miner: '광산',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-b-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-ink-100">{value || '-'}</span>
    </div>
  );
}

function countDocs(...lists: { fileName: string }[][]) {
  return lists.flat().filter(d => d.fileName.trim()).length;
}

export default function StepReview({
  context,
  materials,
  regulations,
  submitted,
  onBack,
  onSubmit,
  onSaveDraft,
}: {
  context: ContextData;
  materials: MaterialsData;
  regulations: RegulationsData;
  submitted: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onSaveDraft: () => void;
}) {
  if (submitted) {
    return (
      <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ok-bg">
            <CheckCircle2 className="h-7 w-7 text-ok-text" />
          </div>
          <h2 className="mt-3 text-lg font-bold text-ink-100">공급망맵 정보가 제출되었습니다</h2>
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-warn-border bg-warn-bg px-3 py-1 text-xs font-bold text-warn-text">
            <Clock className="h-3.5 w-3.5" />
            원청 승인 대기 중
          </p>
          <p className="mt-3 max-w-md text-sm text-slate-500">
            제출하신 정보를 원청이 검토합니다. 승인 또는 보완 요청 시 알림을 받게 됩니다.
            <br />
            제출이 지연되거나 보완이 필요한 경우 등록된 담당자에게 알림이 발송됩니다.
          </p>
          <Link href="/supplier" className="mt-5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
            협력사 홈으로
          </Link>
        </div>
      </div>
    );
  }

  const totalDocs = countDocs(materials.recyclingDocs, regulations.carbonDocs, regulations.auditDocs, regulations.originDocs);

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 text-sm font-bold text-ink-100">제출 요약</div>
        <Row label="Provider Type" value={providerLabel[context.providerType] ?? context.providerType} />
        <Row label="대상 PO" value={context.selectedPos.join(', ')} />
        <Row label="소재 구성" value={materials.minerals.filter(m => m.contentPct).map(m => `${m.mineral} ${m.contentPct}%`).join(', ')} />
        <Row label="재활용 함량" value={materials.recycledContentPct ? `${materials.recycledContentPct}%` : ''} />
        <Row label="공장 수" value={materials.factories.length ? `${materials.factories.length}개` : ''} />
        <Row label="하위 자재" value={materials.childMaterials.filter(Boolean).join(', ')} />
        <Row label="탄소집약도" value={regulations.carbonIntensity} />
        <Row label="실사 판정" value={regulations.dueDiligenceVerdict} />
        <Row label="교육 이수율" value={regulations.trainingCompletionPct ? `${regulations.trainingCompletionPct}%` : ''} />
        <Row label="인증" value={regulations.certifications.filter(c => c.type).map(c => c.type).join(', ')} />
        <Row label="첨부 증빙" value={`${totalDocs}건`} />
      </div>

      <div className="rounded-sm border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSaveDraft}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Save className="h-4 w-4" />
            임시 저장
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onBack} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              이전
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              <Send className="h-4 w-4" />
              제출하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
