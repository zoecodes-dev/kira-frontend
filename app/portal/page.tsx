'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import {
  Upload, FileText, CheckCircle2, AlertCircle, Info,
  ChevronRight, FileCheck, X, Plus, Hash, MapPin, DollarSign,
  Workflow, Image as ImageIcon, GripVertical
} from 'lucide-react';
import clsx from 'clsx';

// 협력사가 작성하는 폼의 단계
type Step = 'product' | 'materials' | 'documents' | 'review';

interface UploadedFile {
  name: string;
  size: string;
  type: string;
  status: 'uploaded' | 'validating' | 'valid' | 'error';
}

// 공급 부품 (협력사가 제조해서 원청에 납품하는 부품)
interface SupplyPart {
  id: number;
  partName: string;       // 협력사가 부르는 이름
  originalCode: string;   // 원청 코드 (자동 매핑)
  hsCode: string;         // HS 6자리
  originCountry: string;  // ISO 2자리
  unitPrice: string;      // USD
  purchaseUnit: string;
}

// 제조공정 단계
interface ProcessStep {
  id: number;
  sequenceNo: number;
  processName: string;
  processDescription: string;
  isOutsourced: boolean;
  hasImage: boolean;
}

const countryOptions = [
  { code: 'KR', name: '한국' },
  { code: 'CN', name: '중국' },
  { code: 'JP', name: '일본' },
  { code: 'AU', name: '호주' },
  { code: 'CL', name: '칠레' },
  { code: 'ZA', name: '남아공' },
  { code: 'US', name: '미국' },
  { code: 'DE', name: '독일' },
];

export default function SupplierPortalPage() {
  const [currentStep, setCurrentStep] = useState<Step>('materials');
  const [files, setFiles] = useState<UploadedFile[]>([
    { name: 'invoice_240514_NCM811.pdf',  size: '2.4 MB', type: '거래 인보이스',  status: 'valid' },
    { name: 'origin_certificate_Co.pdf',  size: '1.1 MB', type: '원산지 증명서', status: 'valid' },
    { name: 'carbon_emission_report.pdf', size: '3.8 MB', type: '탄소배출 보고서', status: 'validating' },
    { name: 'process_diagram_CAM.pdf',    size: '4.2 MB', type: '제조공정도',     status: 'valid' },
  ]);

  // 원자재 광물별 입력
  const [materials, setMaterials] = useState([
    { id: 1, name: '리튬', amount: '12.4', unit: 'kg', recycled: '7' },
    { id: 2, name: '코발트', amount: '8.2', unit: 'kg', recycled: '18' },
    { id: 3, name: '니켈', amount: '23.6', unit: 'kg', recycled: '8' },
  ]);

  // 공급 부품 정보 (HS코드/원산지/단가) — FTA에서 흡수한 항목
  const [supplyParts, setSupplyParts] = useState<SupplyPart[]>([
    {
      id: 1,
      partName: 'POS-CAM-NCM-811-A',
      originalCode: 'CAM-NCM811',
      hsCode: '282200',
      originCountry: 'KR',
      unitPrice: '28.40',
      purchaseUnit: 'kg',
    },
  ]);

  // 제조공정도 단계 — FTA에서 흡수한 "제조공정도 필수" 항목
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([
    { id: 1, sequenceNo: 1, processName: '전구체 입고 검사', processDescription: 'NCM 수산화물 전구체 입자 분포, 수분 함량 측정', isOutsourced: false, hasImage: true },
    { id: 2, sequenceNo: 2, processName: '리튬 혼합 및 소성', processDescription: '수산화리튬과 1:1.05 몰비 혼합 후 750°C 10시간 소성', isOutsourced: false, hasImage: true },
    { id: 3, sequenceNo: 3, processName: '분쇄 및 분급', processDescription: '입자 크기 D50 = 10±2μm로 분급, 자성이물 제거', isOutsourced: false, hasImage: true },
    { id: 4, sequenceNo: 4, processName: '표면 코팅', processDescription: 'Al2O3 0.5wt% 표면 코팅으로 사이클 안정성 확보', isOutsourced: true, hasImage: false },
    { id: 5, sequenceNo: 5, processName: '품질 검사 및 포장', processDescription: '용량/저항/입도 전수 검사, 진공 포장 후 출하', isOutsourced: false, hasImage: true },
  ]);

  return (
    <>
      <PageHeader
        title="협력사 데이터 제출"
        description="POS Cathode Materials · S-CAM-001 · NCM811 양극재"
        badge="협력사 포털"
        actions={
          <div className="text-xs text-ink-400">
            <span className="num-mono">제출 번호 SUB-2026-08471</span>
          </div>
        }
      />

      <div className="p-8 max-w-5xl mx-auto space-y-6">
        {/* 진행 단계 표시 */}
        <Card>
          <div className="flex items-center">
            <StepIndicator step="product" current={currentStep} label="제품 정보" num={1} />
            <StepConnector active={currentStep !== 'product'} />
            <StepIndicator step="materials" current={currentStep} label="부품·원자재" num={2} />
            <StepConnector active={['documents', 'review'].includes(currentStep)} />
            <StepIndicator step="documents" current={currentStep} label="증빙 서류" num={3} />
            <StepConnector active={currentStep === 'review'} />
            <StepIndicator step="review" current={currentStep} label="제출 확인" num={4} />
          </div>
        </Card>

        {/* 안내 박스 */}
        <div className="rounded-sm border border-blue-700/30 bg-blue-500/5 p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-ink-200 leading-relaxed">
            <span className="font-semibold text-blue-300">EU 배터리법 대응 필수 입력 항목입니다.</span>
            입력하신 데이터는 자동 검증을 거쳐 24시간 내 결과가 통보됩니다.
            증빙 서류는 PDF 형식으로 업로드해 주시고, 디지털 서명이 있으면 검증이 더 빨라집니다.
          </div>
        </div>

        {/* 메인 폼 영역 */}
        <div className="grid grid-cols-3 gap-6">
          {/* 왼쪽: 입력 폼 (2칸) */}
          <div className="col-span-2 space-y-4">

            {/* === 공급 부품 정보 (NEW: HS코드/원산지/단가) === */}
            <Card
              title="공급 부품 정보"
              subtitle="협력사가 원청에 납품하는 부품별 정보"
              action={
                <button className="text-[11px] text-accent-400 hover:text-accent-300 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> 부품 추가
                </button>
              }
            >
              <div className="space-y-4">
                {supplyParts.map(p => (
                  <div key={p.id} className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-4 space-y-3">
                    {/* 부품명 + 원청 코드 매핑 */}
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-6">
                        <label className="text-[10px] uppercase tracking-wider text-ink-400">협력사 부품명/코드</label>
                        <input
                          defaultValue={p.partName}
                          placeholder="예: POS-CAM-NCM-811-A"
                          className="w-full mt-1 px-3 py-2 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 num-mono focus:border-accent-500 outline-none"
                        />
                      </div>
                      <div className="col-span-5">
                        <label className="text-[10px] uppercase tracking-wider text-ink-400">원청 매핑 코드</label>
                        <div className="mt-1 px-3 py-2 rounded-xs bg-ink-800/60 border border-ink-700 text-sm num-mono text-accent-400 flex items-center justify-between">
                          {p.originalCode}
                          <Badge tone="ok" size="sm">자동 매핑</Badge>
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-end pb-2">
                        <button className="text-ink-500 hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* HS코드 + 원산지 + 단가 (FTA 흡수 핵심 3종) */}
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3">
                        <label className="text-[10px] uppercase tracking-wider text-ink-400 flex items-center gap-1">
                          <Hash className="w-2.5 h-2.5" /> HS 코드 (6자리)
                        </label>
                        <input
                          defaultValue={p.hsCode}
                          placeholder="282200"
                          maxLength={10}
                          className="w-full mt-1 px-3 py-2 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 num-mono focus:border-accent-500 outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] uppercase tracking-wider text-ink-400 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" /> 원산지국
                        </label>
                        <select
                          defaultValue={p.originCountry}
                          className="w-full mt-1 px-3 py-2 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 focus:border-accent-500 outline-none"
                        >
                          {countryOptions.map(c => (
                            <option key={c.code} value={c.code}>{c.code} · {c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] uppercase tracking-wider text-ink-400 flex items-center gap-1">
                          <DollarSign className="w-2.5 h-2.5" /> 단가 (USD)
                        </label>
                        <input
                          defaultValue={p.unitPrice}
                          placeholder="28.40"
                          className="w-full mt-1 px-3 py-2 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 num-mono focus:border-accent-500 outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] uppercase tracking-wider text-ink-400">단위</label>
                        <select
                          defaultValue={p.purchaseUnit}
                          className="w-full mt-1 px-3 py-2 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 focus:border-accent-500 outline-none"
                        >
                          <option>kg</option>
                          <option>g</option>
                          <option>t</option>
                          <option>EA</option>
                          <option>L</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-ink-700 text-[11px] text-ink-400 leading-relaxed">
                ※ HS 코드와 원산지 정보는 EU 수출 시 자동 검증되며,
                <span className="text-ink-200"> 원청 코드와 자동 매핑</span>되어 BOM 관리 화면에 반영됩니다.
              </div>
            </Card>

            {/* === 원자재 구성 정보 (기존) === */}
            <Card
              title="원자재 구성 정보"
              subtitle="배터리 단위 셀에 투입되는 광물별 정보"
              action={
                <button className="text-[11px] text-accent-400 hover:text-accent-300 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> 광물 추가
                </button>
              }
            >
              <div className="space-y-3">
                {materials.map(m => (
                  <div key={m.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <label className="text-[10px] uppercase tracking-wider text-ink-400">광물명</label>
                      <input
                        defaultValue={m.name}
                        className="w-full mt-1 px-3 py-2 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 focus:border-accent-500 outline-none"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] uppercase tracking-wider text-ink-400">투입량</label>
                      <input
                        defaultValue={m.amount}
                        className="w-full mt-1 px-3 py-2 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 num-mono focus:border-accent-500 outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase tracking-wider text-ink-400">단위</label>
                      <select className="w-full mt-1 px-3 py-2 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 focus:border-accent-500 outline-none">
                        <option>kg</option>
                        <option>g</option>
                        <option>t</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] uppercase tracking-wider text-ink-400">재활용 함량 %</label>
                      <input
                        defaultValue={m.recycled}
                        className="w-full mt-1 px-3 py-2 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 num-mono focus:border-accent-500 outline-none"
                      />
                    </div>
                    <button className="col-span-1 mt-5 text-ink-500 hover:text-red-400 flex justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* EU 의무 비율 안내 */}
              <div className="mt-5 pt-4 border-t border-ink-700">
                <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-3">
                  EU 배터리법 2027년 의무 재활용 비율
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <ComplianceCheck metal="코발트" target={16} current={18} />
                  <ComplianceCheck metal="니켈" target={6} current={8} />
                  <ComplianceCheck metal="리튬" target={6} current={7} />
                </div>
              </div>
            </Card>

            {/* === 제조공정도 (NEW) === */}
            <Card
              title="제조공정도"
              subtitle="공급 부품의 생산 공정 단계별 입력"
              action={
                <button className="text-[11px] text-accent-400 hover:text-accent-300 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> 공정 추가
                </button>
              }
            >
              <div className="space-y-2">
                {processSteps.map((step) => (
                  <div key={step.id} className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-3">
                    <div className="flex items-start gap-3">
                      <button className="text-ink-500 hover:text-ink-300 mt-1 cursor-grab">
                        <GripVertical className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-6 h-6 rounded-xs bg-accent-700/30 flex items-center justify-center shrink-0">
                        <span className="text-[11px] num-mono text-accent-300 font-semibold">{step.sequenceNo}</span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-7">
                            <input
                              defaultValue={step.processName}
                              placeholder="공정명"
                              className="w-full px-3 py-1.5 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 font-medium focus:border-accent-500 outline-none"
                            />
                          </div>
                          <div className="col-span-5 flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-[11px] text-ink-300 px-2 py-1 rounded-xs border border-ink-700/60 cursor-pointer hover:bg-ink-800">
                              <input
                                type="checkbox"
                                defaultChecked={step.isOutsourced}
                                className="accent-accent-500 w-3 h-3"
                              />
                              외주 공정
                            </label>
                            <button className={clsx(
                              'flex items-center gap-1 text-[10px] px-2 py-1 rounded-xs border',
                              step.hasImage
                                ? 'border-emerald-700/40 bg-emerald-500/10 text-emerald-700'
                                : 'border-ink-600 text-ink-400 hover:border-accent-500 hover:text-accent-400'
                            )}>
                              <ImageIcon className="w-3 h-3" />
                              {step.hasImage ? '도식 첨부됨' : '도식 첨부'}
                            </button>
                          </div>
                        </div>
                        <textarea
                          defaultValue={step.processDescription}
                          placeholder="공정 설명 (온도/시간/조건 등)"
                          rows={2}
                          className="w-full px-3 py-2 rounded-xs bg-ink-900 border border-ink-700 text-[11px] text-ink-200 leading-relaxed focus:border-accent-500 outline-none resize-none"
                        />
                      </div>
                      <button className="text-ink-500 hover:text-red-400 mt-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-ink-700">
                <div className="flex items-start gap-2 text-[11px] text-ink-400 leading-relaxed">
                  <Workflow className="w-3.5 h-3.5 text-ink-500 shrink-0 mt-0.5" />
                  <span>
                    공정 단계 순서는 드래그로 변경 가능합니다. 외주 공정의 경우 외주 협력사 등록이 별도 필요합니다.
                    각 단계마다 도식(이미지/PDF) 첨부를 권장합니다.
                  </span>
                </div>
              </div>
            </Card>

            {/* === 탄소발자국 (기존) === */}
            <Card title="탄소발자국" subtitle="생산 1kg당 CO₂ 환산 배출량">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-400">측정 방식</label>
                  <select className="w-full mt-1 px-3 py-2 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 focus:border-accent-500 outline-none">
                    <option>실측값 (자체 측정)</option>
                    <option>제3자 검증값</option>
                    <option>EU 기본 계수 사용</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-400">배출량</label>
                  <div className="relative mt-1">
                    <input
                      defaultValue="18.7"
                      className="w-full px-3 py-2 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 num-mono focus:border-accent-500 outline-none pr-24"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-400">
                      kgCO₂eq/kg
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-ink-400">
                ※ 자체 측정값을 제출하지 못하는 경우 EU 기본 계수를 자동 적용합니다 (단, 평가에서 불리할 수 있음)
              </div>
            </Card>
          </div>

          {/* 오른쪽: 증빙 서류 업로드 */}
          <div className="space-y-4">
            <Card title="증빙 서류" subtitle="필수 PDF 첨부">
              <button className="w-full border-2 border-dashed border-ink-600 hover:border-accent-500 rounded-sm p-6 mb-3 transition-colors group">
                <Upload className="w-6 h-6 text-ink-400 group-hover:text-accent-400 mx-auto mb-2" strokeWidth={1.5} />
                <div className="text-xs text-ink-200 font-medium mb-1">파일을 선택하거나 끌어놓으세요</div>
                <div className="text-[10px] text-ink-500">PDF · 최대 20MB · 디지털 서명 권장</div>
              </button>

              <div className="space-y-1.5">
                {files.map(f => (
                  <FileRow key={f.name} file={f} />
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-ink-700">
                <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">필수 누락 항목</div>
                <div className="space-y-1">
                  <MissingItem label="공급자 선언서 (DoS)" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-3">제출 준비 상태</div>
              <div className="space-y-2">
                <CheckRow label="공급 부품 정보" ok />
                <CheckRow label="원자재 정보" ok />
                <CheckRow label="제조공정도 (4/5)" warn />
                <CheckRow label="탄소발자국" ok />
                <CheckRow label="필수 증빙 4/5" warn />
                <CheckRow label="디지털 서명" ok />
              </div>

              <button
                disabled
                className="w-full mt-4 py-2.5 rounded-xs bg-ink-700 text-ink-400 text-xs font-medium cursor-not-allowed"
              >
                필수 항목 완료 후 제출 가능
              </button>
              <div className="mt-2 text-[10px] text-ink-500 text-center">
                제출 후 검증까지 평균 4분
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

// === 단계 인디케이터 ===
function StepIndicator({ step, current, label, num }: any) {
  const stepOrder = ['product', 'materials', 'documents', 'review'];
  const currentIdx = stepOrder.indexOf(current);
  const myIdx = stepOrder.indexOf(step);
  const isCurrent = step === current;
  const isPast = myIdx < currentIdx;

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className={clsx(
        'w-7 h-7 rounded-xs flex items-center justify-center text-xs font-semibold num-mono',
        isCurrent ? 'bg-accent-700 text-white' :
          isPast ? 'bg-accent-700/30 text-accent-300' :
            'bg-ink-700 text-ink-400'
      )}>
        {isPast ? <CheckCircle2 className="w-4 h-4" /> : num}
      </div>
      <span className={clsx(
        'text-xs font-medium',
        isCurrent ? 'text-ink-50' :
          isPast ? 'text-ink-300' :
            'text-ink-500'
      )}>
        {label}
      </span>
    </div>
  );
}

function StepConnector({ active }: { active: boolean }) {
  return <div className={clsx('flex-1 h-px mx-3', active ? 'bg-accent-700/50' : 'bg-ink-700')} />;
}

// === 의무 비율 체크 ===
function ComplianceCheck({ metal, target, current }: any) {
  const ok = current >= target;
  return (
    <div className={clsx(
      'rounded-xs border p-2.5',
      ok ? 'border-emerald-700/30 bg-emerald-500/5' : 'border-amber-700/30 bg-amber-500/5'
    )}>
      <div className="text-[10px] text-ink-400 mb-1">{metal}</div>
      <div className="flex items-baseline justify-between">
        <span className={clsx('text-lg font-semibold num-mono', ok ? 'text-emerald-700' : 'text-amber-700')}>
          {current}%
        </span>
        <span className="text-[10px] text-ink-500 num-mono">/ {target}%</span>
      </div>
    </div>
  );
}

// === 파일 행 ===
function FileRow({ file }: { file: UploadedFile }) {
  const statusConfig: any = {
    uploaded:   { icon: FileText, color: 'text-ink-400', bg: 'bg-ink-800' },
    validating: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', label: '검증 중' },
    valid:      { icon: FileCheck, color: 'text-emerald-700', bg: 'bg-emerald-500/10' },
    error:      { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-500/10' },
  };
  const cfg = statusConfig[file.status];
  const Icon = cfg.icon;

  return (
    <div className={clsx('flex items-center gap-2 p-2 rounded-xs', cfg.bg)}>
      <Icon className={clsx('w-4 h-4 shrink-0', cfg.color)} strokeWidth={1.8} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium text-ink-100 truncate">{file.name}</div>
        <div className="text-[10px] text-ink-500 num-mono">
          {file.type} · {file.size}
        </div>
      </div>
      {file.status === 'validating' && (
        <div className="text-[10px] text-blue-700 pulse-soft num-mono shrink-0">검증 중</div>
      )}
      {file.status === 'valid' && (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
      )}
    </div>
  );
}

function MissingItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-amber-700">
      <AlertCircle className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
}

function CheckRow({ label, ok, warn }: any) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-300">{label}</span>
      {ok && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
      {warn && <AlertCircle className="w-3.5 h-3.5 text-amber-700" />}
    </div>
  );
}
