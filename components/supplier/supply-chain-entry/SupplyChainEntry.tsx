'use client';

// 협력사 본인 공급망맵 입력 — 자재·공장·규제 정보를 단계별로 입력해 제출(원청 승인 대기)
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Network } from 'lucide-react';
import StepContext from './StepContext';
import StepMaterials from './StepMaterials';
import StepRegulations from './StepRegulations';
import StepReview from './StepReview';

export type ProviderType = 'manufacturer' | 'recycler' | 'trader' | 'miner' | 'smelter';
export type EntryStep = 'context' | 'materials' | 'regulations' | 'review';

export interface DocItem {
  label: string;
  fileName: string;
}
export interface MineralRow {
  mineral: string; // Li / Co / Ni
  contentPct: string;
  recoveryPct: string;
}
export interface FactoryRatioRow {
  factoryId: string;
  factoryName: string;
  origin: string; // country · region
  destination: string;
  ratioPct: string;
}
export interface CertRow {
  type: string;
  issuingBody: string;
  certNo: string;
  expiresAt: string;
}

export interface ContextData {
  providerType: ProviderType | '';
  selectedPos: string[];
}
export interface MaterialsData {
  minerals: MineralRow[];
  harmfulSubstances: string;
  recycledContentPct: string;
  recyclingDocs: DocItem[];
  factories: FactoryRatioRow[];
  childMaterials: string[];
}
export interface RegulationsData {
  carbonIntensity: string;
  energySource: string;
  carbonDocs: DocItem[];
  directOwnershipPct: string;
  indirectOwnershipPct: string;
  feocDocs: DocItem[];
  dueDiligenceVerdict: string;
  trainingCompletionPct: string;
  auditDocs: DocItem[];
  certifications: CertRow[];
  originDocs: DocItem[];
}

function docs(...labels: string[]): DocItem[] {
  return labels.map(label => ({ label, fileName: '' }));
}

const initialContext: ContextData = { providerType: '', selectedPos: [] };
const initialMaterials: MaterialsData = {
  minerals: [
    { mineral: 'Li', contentPct: '', recoveryPct: '' },
    { mineral: 'Co', contentPct: '', recoveryPct: '' },
    { mineral: 'Ni', contentPct: '', recoveryPct: '' },
  ],
  harmfulSubstances: '',
  recycledContentPct: '',
  recyclingDocs: docs('GRS / RCS 인증서', '재활용 함량 시험성적서', '소재 분석 리포트', '재활용 공정 설명서'),
  factories: [],
  childMaterials: [''],
};
const initialRegulations: RegulationsData = {
  carbonIntensity: '',
  energySource: '',
  carbonDocs: docs('PCF 보고서 / 탄소발자국 선언서', 'LCA 보고서', '제3자 검증서', 'LCI 데이터시트'),
  directOwnershipPct: '',
  indirectOwnershipPct: '',
  feocDocs: docs('FEOC 진술서 / 자기선언서'),
  dueDiligenceVerdict: '',
  trainingCompletionPct: '',
  auditDocs: docs('실사 감사 보고서'),
  certifications: [{ type: '', issuingBody: '', certNo: '', expiresAt: '' }],
  originDocs: docs('원산지포괄확인서 / 원산지증명서(C/O)', '광산 운영 허가증 / 채굴권 증서', 'Mine-to-refinery 추적 서류'),
};

const STEPS: EntryStep[] = ['context', 'materials', 'regulations', 'review'];
const stepLabel: Record<EntryStep, string> = {
  context: '기본 · 직상위 · PO',
  materials: '자재 정보',
  regulations: '규제 정보',
  review: '검토 · 제출',
};

export default function SupplyChainEntry() {
  const params = useSearchParams();
  const supplierId = params.get('supplierId') ?? undefined;
  const parentName = params.get('parent') ?? undefined;

  const [step, setStep] = useState<EntryStep>('context');
  const [context, setContext] = useState<ContextData>(initialContext);
  const [materials, setMaterials] = useState<MaterialsData>(initialMaterials);
  const [regulations, setRegulations] = useState<RegulationsData>(initialRegulations);
  const [submitted, setSubmitted] = useState(false);
  const [savedAt, setSavedAt] = useState('');

  const currentIndex = STEPS.indexOf(step);
  const goNext = () => {
    const next = STEPS[currentIndex + 1];
    if (next) setStep(next);
  };
  const goBack = () => {
    const prev = STEPS[currentIndex - 1];
    if (prev) setStep(prev);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-2.5 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand">
            <Network className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-bold text-ink-100">공급망맵 정보 입력</div>
            <div className="text-[11px] text-slate-500">
              {parentName ? `직상위: ${parentName} · ` : ''}자재·공장·규제 표준 입력
            </div>
          </div>
        </div>
      </header>

      {/* 단계 인디케이터 */}
      <div className="mx-auto max-w-4xl px-6 pt-6">
        <ol className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li key={s} className="flex flex-1 items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done ? 'bg-brand text-white' : active ? 'border-2 border-brand text-brand' : 'border border-slate-300 text-slate-400'
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={`truncate text-xs font-semibold ${active ? 'text-ink-100' : 'text-slate-400'}`}>{stepLabel[s]}</span>
                {i < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-6">
        {step === 'context' && (
          <StepContext
            supplierId={supplierId}
            parentName={parentName}
            data={context}
            onChange={setContext}
            onNext={goNext}
          />
        )}

        {step === 'materials' && (
          <StepMaterials
            supplierId={supplierId}
            data={materials}
            onChange={setMaterials}
            onBack={goBack}
            onNext={goNext}
          />
        )}

        {step === 'regulations' && (
          <StepRegulations
            supplierId={supplierId}
            data={regulations}
            onChange={setRegulations}
            onBack={goBack}
            onNext={goNext}
          />
        )}

        {step === 'review' && (
          <StepReview
            context={context}
            materials={materials}
            regulations={regulations}
            submitted={submitted}
            onBack={goBack}
            onSubmit={() => setSubmitted(true)}
            onSaveDraft={() => setSavedAt(new Date().toLocaleString('ko-KR'))}
          />
        )}

        {savedAt && !submitted && step === 'review' && (
          <div className="mt-3 rounded-md border border-ok-border bg-ok-bg px-3 py-2 text-xs font-semibold text-ok-text">
            임시 저장되었습니다 · {savedAt}
          </div>
        )}
      </div>
    </main>
  );
}
