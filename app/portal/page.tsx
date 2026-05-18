'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import {
  Upload, FileText, CheckCircle2, AlertCircle, Info,
  FileCheck, X, Plus, MapPin, Hash, DollarSign,
  Truck, Building2, ArrowRight, ArrowUp, ArrowDown,
  EyeOff, Factory, Workflow, ChevronDown
} from 'lucide-react';
import { suppliers, supplyEdges } from '@/lib/data';
import {
  purchaseOrders, parts, factories, supplierContacts,
  tier1ViewerSupplierId, regulationMeta, type Regulation
} from '@/lib/supplier-detail-data';
import clsx from 'clsx';

// 협력사 포털은 "특정 협력사" 시점으로 운영됨
// 시연용으로 S-CAM-001 (POS Cathode) 시점 사용
// 단, 정의서의 권한 제어 시나리오 시연을 위해 S-CELL-001 (Hanyang Cell, 1차 협력사) 시점도 토글 가능
type PortalViewer = 'S-CAM-001' | 'S-CELL-001';

type Step = 'po-select' | 'materials' | 'documents' | 'review';

interface UploadedFile {
  name: string;
  size: string;
  type: string;
  status: 'uploaded' | 'validating' | 'valid' | 'error';
}

export default function SupplierPortalPage() {
  const [viewerSupplierId, setViewerSupplierId] = useState<PortalViewer>('S-CAM-001');
  const [currentStep, setCurrentStep] = useState<Step>('po-select');

  // 원청사가 이 협력사에게 요청한 PO 목록
  const incomingPOs = useMemo(
    () => purchaseOrders.filter(po => po.supplierId === viewerSupplierId),
    [viewerSupplierId]
  );

  // 선택된 PO들 (체크박스 다중 선택)
  const [selectedPoIds, setSelectedPoIds] = useState<Set<string>>(
    new Set(incomingPOs.slice(0, 2).map(po => po.poId))
  );

  // 이 협력사의 공장들
  const myFactories = useMemo(
    () => factories.filter(f => f.supplierId === viewerSupplierId && f.factoryRole !== 'headquarters'),
    [viewerSupplierId]
  );

  // 선택된 공장 (탭)
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>(myFactories[0]?.factoryId || '');
  const selectedFactory = myFactories.find(f => f.factoryId === selectedFactoryId);

  // 협력사 정보
  const viewerSupplier = suppliers.find(s => s.id === viewerSupplierId);
  const viewerName = viewerSupplier?.name || viewerSupplierId;

  // 직상위/직하위 (정의서 ② 권한 제어 — 옆라인 차단)
  const parentEdges = supplyEdges.filter(e => e.from === viewerSupplierId);
  const childEdges = supplyEdges.filter(e => e.to === viewerSupplierId);
  const parents = parentEdges.map(e => ({
    edge: e,
    supplier: suppliers.find(s => s.id === e.to)
  })).filter(p => p.supplier);
  const children = childEdges.map(e => ({
    edge: e,
    supplier: suppliers.find(s => s.id === e.from)
  })).filter(c => c.supplier);

  const [files] = useState<UploadedFile[]>([
    { name: 'invoice_240514_NCM811.pdf',  size: '2.4 MB', type: '거래 인보이스',  status: 'valid' },
    { name: 'origin_certificate_Co.pdf',  size: '1.1 MB', type: '원산지 증명서', status: 'valid' },
    { name: 'carbon_emission_report.pdf', size: '3.8 MB', type: '탄소배출 보고서', status: 'validating' },
  ]);

  const [materials] = useState([
    { id: 1, name: '리튬', amount: '12.4', unit: 'kg', recycled: '7' },
    { id: 2, name: '코발트', amount: '8.2', unit: 'kg', recycled: '18' },
    { id: 3, name: '니켈', amount: '23.6', unit: 'kg', recycled: '8' },
  ]);

  const togglePO = (poId: string) => {
    setSelectedPoIds(prev => {
      const next = new Set(prev);
      if (next.has(poId)) next.delete(poId);
      else next.add(poId);
      return next;
    });
  };

  return (
    <>
      <PageHeader
        title="협력사 데이터 제출"
        description={`${viewerName} · ${viewerSupplierId}`}
        badge="협력사 포털"
        actions={
          <ViewerToggle viewerSupplierId={viewerSupplierId} onChange={setViewerSupplierId} />
        }
      />

      <div className="p-8 max-w-6xl mx-auto space-y-6">

        {/* 진행 단계 */}
        <Card>
          <div className="flex items-center">
            <StepIndicator step="po-select" current={currentStep} label="PO/송장 선택" num={1} />
            <StepConnector active={currentStep !== 'po-select'} />
            <StepIndicator step="materials" current={currentStep} label="공장·부품 정보" num={2} />
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
            <span className="font-semibold text-blue-300">원청사로부터 데이터 요청을 받았습니다.</span>{' '}
            아래 PO/송장 번호를 선택하여 해당 부품의 스펙·공장·탄소배출·광물 정보를 입력해 주세요.
            공장 선택 시 납품처(EU/미국)에 따라 필요한 규제 서류만 표시됩니다.
          </div>
        </div>

        {/* ===== STEP 1: PO 셀렉터 ===== */}
        <Card
          title="원청사 요청 PO/송장"
          subtitle={`${incomingPOs.length}건의 요청이 도착했습니다. 처리할 PO를 선택하세요 (다중 선택 가능)`}
          action={
            <div className="text-[11px] text-ink-400 num-mono">
              선택됨: {selectedPoIds.size}건
            </div>
          }
        >
          <div className="space-y-2">
            {incomingPOs.map(po => {
              const isSelected = selectedPoIds.has(po.poId);
              const part = parts.find(p => p.id === po.partId);
              const factory = factories.find(f => f.factoryId === po.factoryId);
              return (
                <button
                  key={po.poId}
                  onClick={() => togglePO(po.poId)}
                  className={clsx(
                    'w-full text-left rounded-xs border p-3 transition-colors',
                    isSelected
                      ? 'border-accent-700/50 bg-accent-500/5'
                      : 'border-ink-700/60 bg-ink-900/40 hover:bg-ink-800/60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* 체크박스 */}
                    <div className={clsx(
                      'w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 mt-0.5',
                      isSelected ? 'bg-accent-700 border-accent-700' : 'border-ink-600'
                    )}>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 1줄: PO번호 + 부품 + 상태 */}
                      <div className="flex items-center gap-3 flex-wrap mb-1.5">
                        <span className="text-sm font-semibold num-mono text-accent-400">{po.poNumber}</span>
                        <PoStatusBadge status={po.status} />
                        {factory && (
                          <span className="text-[11px] text-ink-400 flex items-center gap-1">
                            <Factory className="w-3 h-3" />
                            {factory.factoryName}
                          </span>
                        )}
                      </div>

                      {/* 2줄: 협력사 코드 → 원청 코드 매핑 (정의서 ③) */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] num-mono text-ink-200">{po.supplierPartCode}</span>
                        <ArrowRight className="w-3 h-3 text-ink-500" />
                        <span className="text-[11px] num-mono text-accent-500 font-semibold">{po.originalPartCode}</span>
                        <span className="text-[10px] text-ink-500">({part?.partName})</span>
                      </div>

                      {/* 3줄: 수량·비율·납기 */}
                      <div className="flex items-center gap-3 text-[10px] text-ink-400 num-mono">
                        <span>{po.quantity.toLocaleString()} {po.unit}</span>
                        <span>·</span>
                        <span className="text-blue-700">공급 비율 {po.supplyRatio}%</span>
                        <span>·</span>
                        <span>$ {po.unitPrice}/{part?.purchaseUnit || po.unit}</span>
                        <span>·</span>
                        <span>HS {part?.hsCode}</span>
                        <span>·</span>
                        <span>원산지 {po.originCountry}</span>
                        <span className="ml-auto">납기 {po.deliveryDate}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {incomingPOs.length === 0 && (
              <div className="py-6 text-center text-xs text-ink-500">
                요청된 PO가 없습니다
              </div>
            )}
          </div>
        </Card>

        {/* ===== STEP 2: 공장 선택 → 공장별 규제 차등 표시 ===== */}
        {selectedPoIds.size > 0 && myFactories.length > 0 && (
          <Card
            title="공장별 입력 (납품처 기준 규제 자동 차등)"
            subtitle="공장을 선택하면 그 공장의 납품처(EU/미국)에 따라 필요한 항목만 표시됩니다"
          >
            {/* 공장 탭 */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {myFactories.map(f => {
                const isActive = f.factoryId === selectedFactoryId;
                const destLabel = f.destination === 'EU' ? 'EU' :
                                  f.destination === 'US' ? '미국' :
                                  f.destination === 'BOTH' ? 'EU+미국' : '국내';
                const destTone = f.destination === 'EU' ? 'emerald' :
                                 f.destination === 'US' ? 'amber' :
                                 f.destination === 'BOTH' ? 'purple' : 'neutral';
                return (
                  <button
                    key={f.factoryId}
                    onClick={() => setSelectedFactoryId(f.factoryId)}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-xs border transition-colors',
                      isActive
                        ? 'border-accent-700/50 bg-accent-500/10 text-accent-400'
                        : 'border-ink-700 hover:border-ink-600 text-ink-300'
                    )}
                  >
                    <Factory className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{f.factoryName}</span>
                    <span className={clsx(
                      'text-[9px] num-mono px-1.5 py-0.5 rounded-xs font-semibold border',
                      destTone === 'emerald' && 'bg-emerald-500/10 border-emerald-700/30 text-emerald-700',
                      destTone === 'amber'   && 'bg-amber-500/10 border-amber-700/30 text-amber-700',
                      destTone === 'purple'  && 'bg-purple-500/10 border-purple-700/30 text-purple-700',
                      destTone === 'neutral' && 'bg-ink-700 text-ink-300'
                    )}>
                      {destLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 선택된 공장 상세 */}
            {selectedFactory && (
              <FactoryFieldsPanel factory={selectedFactory} />
            )}
          </Card>
        )}

        {/* ===== 메인 폼: 원자재 + 증빙 ===== */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">

            {/* 원자재 정보 */}
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
                        <option>kg</option><option>g</option><option>t</option>
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

            {/* === 내 직상위·직하위 협력사 (정의서 ② 권한 제어 시뮬) === */}
            <Card
              title="내 직상위·직하위 협력사"
              subtitle="보안상 직상위(납품처)와 직하위(원료처) 협력사만 조회 가능합니다"
            >
              <div className="rounded-xs border border-amber-700/30 bg-amber-500/5 p-2.5 mb-3 flex items-start gap-2">
                <EyeOff className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-ink-200 leading-relaxed">
                  <span className="font-semibold text-amber-700">권한 제어 활성</span> ·
                  옆 라인 협력사(다른 N차사)와 다이렉트 원청사 정보는 표시되지 않습니다.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 직상위 (이 협력사가 납품하는 대상) */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-2 flex items-center gap-1.5">
                    <ArrowUp className="w-3 h-3 text-accent-500" />
                    직상위 ({parents.length})
                  </div>
                  <div className="space-y-1.5">
                    {parents.length === 0 ? (
                      <div className="text-[11px] text-ink-500 py-2 px-2.5 rounded-xs bg-ink-900/30 border border-ink-700/40">
                        직상위 없음
                      </div>
                    ) : parents.map((p, i) => (
                      <div key={i} className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-2.5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge tone="neutral" size="sm">T{p.supplier!.tier}</Badge>
                          <span className="text-xs font-medium text-ink-100">{p.supplier!.name}</span>
                        </div>
                        <div className="text-[10px] text-ink-400 num-mono">
                          {p.edge.material} · {p.edge.volume} t/월
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 직하위 (이 협력사에 납품하는 협력사) */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-2 flex items-center gap-1.5">
                    <ArrowDown className="w-3 h-3 text-accent-500" />
                    직하위 ({children.length})
                  </div>
                  <div className="space-y-1.5">
                    {children.length === 0 ? (
                      <div className="text-[11px] text-ink-500 py-2 px-2.5 rounded-xs bg-ink-900/30 border border-ink-700/40">
                        직하위 없음 (최말단)
                      </div>
                    ) : children.map((c, i) => (
                      <div key={i} className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-2.5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge tone="neutral" size="sm">T{c.supplier!.tier}</Badge>
                          <span className="text-xs font-medium text-ink-100">{c.supplier!.name}</span>
                        </div>
                        <div className="text-[10px] text-ink-400 num-mono">
                          {c.edge.material} · {c.edge.volume} t/월
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* 탄소발자국 */}
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
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-400">kgCO₂eq/kg</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-ink-400">
                ※ 자체 측정값을 제출하지 못하는 경우 EU 기본 계수를 자동 적용합니다 (단, 평가에서 불리할 수 있음)
              </div>
            </Card>
          </div>

          {/* 우측 사이드: 증빙 + 제출 상태 */}
          <div className="space-y-4">
            <Card title="증빙 서류" subtitle="필수 PDF 첨부">
              <button className="w-full border-2 border-dashed border-ink-600 hover:border-accent-500 rounded-sm p-6 mb-3 transition-colors group">
                <Upload className="w-6 h-6 text-ink-400 group-hover:text-accent-400 mx-auto mb-2" strokeWidth={1.5} />
                <div className="text-xs text-ink-200 font-medium mb-1">파일 선택 또는 끌어놓기</div>
                <div className="text-[10px] text-ink-500">PDF · 최대 20MB · 디지털 서명 권장</div>
              </button>

              <div className="space-y-1.5">
                {files.map(f => (
                  <FileRow key={f.name} file={f} />
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-ink-700">
                <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">필수 누락 항목</div>
                <MissingItem label="공급자 선언서 (DoS)" />
              </div>
            </Card>

            <Card>
              <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-3">제출 준비 상태</div>
              <div className="space-y-2">
                <CheckRow label={`PO 선택 ${selectedPoIds.size}/${incomingPOs.length}`} ok={selectedPoIds.size > 0} warn={selectedPoIds.size === 0} />
                <CheckRow label="공장별 입력" warn />
                <CheckRow label="원자재 정보" ok />
                <CheckRow label="탄소발자국" ok />
                <CheckRow label="필수 증빙 3/4" warn />
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

// =====================================================
// 공장별 규제 차등 패널 (팀원 코드 컨셉 흡수)
// 공장의 destination에 따라 필요 필드만 표시, 다른 시장 규제는 자동 숨김
// =====================================================
function FactoryFieldsPanel({ factory }: { factory: any }) {
  // destination별 필드 정의
  const fieldsByDestination: Record<string, Array<{ label: string; reg: Regulation | '공통'; type: 'upload' | 'input' }>> = {
    EU: [
      { label: '원재료 GPS 좌표 (산림파괴 검증용)', reg: 'EUDR',  type: 'input' },
      { label: 'FSC 인증서 (산림 인증)',           reg: 'EUDR_FSC', type: 'upload' },
      { label: '인권 실사 보고서',                  reg: 'CSDDD', type: 'upload' },
      { label: '재활용 함량 증빙',                  reg: 'EU_BATTERY', type: 'upload' },
      { label: '원산지 증명서',                     reg: '공통',  type: 'upload' },
    ],
    US: [
      { label: '원산지 증명서 (UFLPA 반증용)',    reg: 'UFLPA', type: 'upload' },
      { label: '정련소 위치 + 공정 방식',         reg: 'UFLPA', type: 'input' },
      { label: 'FEOC 직접 지분율 (%)',           reg: 'IRA',   type: 'input' },
      { label: 'FEOC 간접 지분율 (%)',           reg: 'IRA',   type: 'input' },
      { label: '인권 실사 보고서',                reg: 'CSDDD', type: 'upload' },
    ],
    BOTH: [
      { label: '원재료 GPS 좌표',                 reg: 'EUDR',  type: 'input' },
      { label: 'FSC 인증서',                      reg: 'EUDR_FSC', type: 'upload' },
      { label: '원산지 증명서',                   reg: 'UFLPA', type: 'upload' },
      { label: '정련소 위치',                     reg: 'UFLPA', type: 'input' },
      { label: 'FEOC 지분율 (직+간접)',           reg: 'IRA',   type: 'input' },
      { label: '인권 실사 보고서',                reg: 'CSDDD', type: 'upload' },
      { label: '재활용 함량 증빙',                reg: 'EU_BATTERY', type: 'upload' },
    ],
    KR: [
      { label: '원산지 증명서',                   reg: '공통',  type: 'upload' },
      { label: '품질 인증서',                     reg: '공통',  type: 'upload' },
    ],
  };

  const fields = fieldsByDestination[factory.destination] || [];
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const toggle = (idx: number) => setCompleted(prev => ({ ...prev, [idx]: !prev[idx] }));
  const completedCount = Object.values(completed).filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* 공장 정보 헤더 */}
      <div className="flex items-center justify-between p-3 rounded-xs border border-ink-700/60 bg-ink-900/40">
        <div>
          <div className="text-sm font-semibold text-ink-100">{factory.factoryName}</div>
          <div className="text-[11px] text-ink-400 mt-0.5">{factory.destinationDetail}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-ink-400 uppercase tracking-wider">공급 비율</div>
          <div className="text-2xl font-bold text-accent-400 num-mono leading-none">
            {factory.supplyRatioPercent}%
          </div>
        </div>
      </div>

      {/* 적용 규제 + 자동 숨김 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">적용 규제:</span>
        {factory.applicableRegulations?.map((reg: Regulation) => (
          <RegulationChipInline key={reg} reg={reg} />
        ))}
      </div>
      {factory.hiddenRegulations && factory.hiddenRegulations.length > 0 && (
        <div className="text-[10px] text-ink-500 flex items-center gap-1.5">
          <EyeOff className="w-3 h-3" />
          <span>자동 숨김:</span>
          {factory.hiddenRegulations.map((r: Regulation) => regulationMeta[r]?.label).join(', ')}
          <span className="text-ink-600">— 이 공장은 {factory.destination === 'EU' ? '미국' : factory.destination === 'US' ? 'EU' : '해당 시장'} 비납품 공장입니다</span>
        </div>
      )}

      {/* 입력 필드 목록 */}
      <div className="space-y-1.5">
        {fields.map((f, idx) => {
          const isDone = !!completed[idx];
          return (
            <div
              key={idx}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xs border transition-colors',
                isDone
                  ? 'border-emerald-700/40 bg-emerald-500/5'
                  : 'border-ink-700/60 bg-ink-900/40'
              )}
            >
              {f.type === 'upload'
                ? <Upload className="w-3.5 h-3.5 text-ink-500 shrink-0" />
                : <MapPin className="w-3.5 h-3.5 text-ink-500 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-ink-100">{f.label}</div>
                {isDone && <div className="text-[10px] text-emerald-700 font-semibold">완료 ✓</div>}
              </div>
              <RegulationChipInline reg={f.reg as Regulation} />
              <button
                onClick={() => toggle(idx)}
                className={clsx(
                  'text-[10px] px-2.5 py-1 rounded-xs font-semibold transition-colors shrink-0',
                  isDone
                    ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                    : 'bg-accent-700 text-white hover:bg-accent-600'
                )}
              >
                {isDone ? '✓' : f.type === 'upload' ? '업로드' : '입력'}
              </button>
            </div>
          );
        })}
      </div>

      {/* 진행률 */}
      <div className="pt-3 border-t border-ink-700/60">
        <div className="flex items-center justify-between mb-1.5 text-[11px]">
          <span className="text-ink-400">진행률</span>
          <span className="num-mono text-ink-200 font-semibold">
            {completedCount} / {fields.length}
          </span>
        </div>
        <div className="h-1.5 bg-ink-700 rounded-xs overflow-hidden">
          <div
            className="h-full bg-accent-700 transition-all"
            style={{ width: `${fields.length > 0 ? (completedCount / fields.length) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// 규제 칩 (인라인용)
function RegulationChipInline({ reg }: { reg: Regulation | '공통' }) {
  if (reg === '공통') {
    return (
      <span className="text-[9px] num-mono px-1.5 py-0.5 rounded-xs border bg-ink-700 border-ink-600 text-ink-300 font-semibold">
        공통
      </span>
    );
  }
  const meta = regulationMeta[reg];
  if (!meta) return null;
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-700/30 text-emerald-700',
    teal:    'bg-teal-500/10 border-teal-700/30 text-teal-700',
    amber:   'bg-amber-500/10 border-amber-700/30 text-amber-700',
    orange:  'bg-orange-500/10 border-orange-700/30 text-orange-700',
    blue:    'bg-blue-500/10 border-blue-700/30 text-blue-700',
    purple:  'bg-purple-500/10 border-purple-700/30 text-purple-700',
  };
  return (
    <span
      className={clsx(
        'text-[9px] num-mono px-1.5 py-0.5 rounded-xs border font-semibold',
        colorMap[meta.color] || colorMap.blue
      )}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}

// === 시점 토글 (정의서 ② 시연용) ===
function ViewerToggle({ viewerSupplierId, onChange }: { viewerSupplierId: PortalViewer; onChange: (v: PortalViewer) => void }) {
  const options: { id: PortalViewer; label: string; hint: string }[] = [
    { id: 'S-CAM-001',  label: 'POS Cathode 시점',  hint: 'T3 양극재 협력사' },
    { id: 'S-CELL-001', label: 'Hanyang Cell 시점', hint: 'T1 1차 협력사' },
  ];
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.id === viewerSupplierId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xs border border-ink-700 hover:border-ink-600 text-[11px] text-ink-300"
      >
        <Building2 className="w-3 h-3" />
        <span className="text-ink-400">로그인:</span>
        <span className="font-medium text-ink-100">{current?.label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 z-20 min-w-[220px] rounded-xs border border-ink-700 bg-ink-800 shadow-lg py-1">
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className={clsx(
                  'w-full text-left px-3 py-2 hover:bg-ink-700/60 transition-colors',
                  opt.id === viewerSupplierId && 'bg-ink-700/40'
                )}
              >
                <div className={clsx(
                  'text-xs font-medium',
                  opt.id === viewerSupplierId ? 'text-accent-400' : 'text-ink-100'
                )}>
                  {opt.label}
                </div>
                <div className="text-[10px] text-ink-500 num-mono">{opt.hint}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// === Helpers ===
function StepIndicator({ step, current, label, num }: any) {
  const stepOrder: Step[] = ['po-select', 'materials', 'documents', 'review'];
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

function PoStatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: any; label: string }> = {
    pending:    { tone: 'warn',    label: '응답 대기' },
    in_transit: { tone: 'info',    label: '운송 중' },
    delivered:  { tone: 'neutral', label: '인도' },
    verified:   { tone: 'ok',      label: '검증 완료' },
  };
  const m = map[status] || map.pending;
  return <Badge tone={m.tone} size="sm">{m.label}</Badge>;
}

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

function FileRow({ file }: { file: UploadedFile }) {
  const statusConfig: any = {
    uploaded:   { icon: FileText, color: 'text-ink-400', bg: 'bg-ink-800' },
    validating: { icon: FileText, color: 'text-blue-700', bg: 'bg-blue-500/10' },
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
        <div className="text-[10px] text-ink-500 num-mono">{file.type} · {file.size}</div>
      </div>
      {file.status === 'validating' && (
        <div className="text-[10px] text-blue-700 num-mono shrink-0">검증 중</div>
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
