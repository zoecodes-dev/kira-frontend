// [작업 9 — 포털 홈 대시보드 + 규제 이행 현황 추가]
// 변경 사항:
// 1. PageHeader 바로 아래, 기존 입력 흐름(스텝 인디케이터) 위에 두 영역 삽입:
//    - 영역 1: KPI 카드 행 (미완료 요청 / 데이터 완성도 / 인증서 만료 위험 / 현재 리스크 레벨)
//    - 영역 2: 규제 누락 경고 패널 (missingFields 기반)
// 2. 기존 Step 1~4 입력 흐름, 모든 컴포넌트, 상태 완전 유지

'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import {
  Upload, FileText, CheckCircle2, AlertCircle, Info,
  FileCheck, X, Plus, MapPin, Hash, DollarSign,
  Truck, Building2, ArrowRight, ArrowUp, ArrowDown,
  Factory, ChevronDown,
} from 'lucide-react';
import { suppliers, supplyEdges } from '@/lib/data';
import {
  purchaseOrders, parts, factories, supplierContacts,
  tier1ViewerSupplierId, regulationMeta, type Regulation,
  getCompleteness, getCertifications, getRiskProfile,
} from '@/lib/supplier-detail-data';
import clsx from 'clsx';

type PortalViewer = 'S-CAM-001' | 'S-CELL-001';
type Step = 'po-select' | 'materials' | 'documents' | 'review';

interface UploadedFile {
  name: string; size: string; type: string;
  status: 'uploaded' | 'validating' | 'valid' | 'error';
}

// missingFields 키워드 → 규제 배지 매핑
const MISSING_REG_MAP: Array<{ keyword: string; label: string; color: string }> = [
  { keyword: '광산 폴리곤',   label: 'EUDR',       color: 'border-emerald-700/30 bg-emerald-500/8 text-emerald-500' },
  { keyword: '광물 추적',     label: 'UFLPA',      color: 'border-amber-700/30 bg-amber-500/8 text-amber-500' },
  { keyword: 'FEOC 지분',    label: 'IRA',        color: 'border-orange-700/30 bg-orange-500/8 text-orange-500' },
  { keyword: '제3자 검증',   label: 'EU Battery', color: 'border-blue-700/30 bg-blue-500/8 text-blue-400' },
  { keyword: 'Scope 3',      label: 'CBAM/Art.7', color: 'border-purple-700/30 bg-purple-500/8 text-purple-400' },
];

function getRegBadge(field: string) {
  const match = MISSING_REG_MAP.find(r => field.includes(r.keyword));
  if (match) return match;
  return { label: '규제 누락', color: 'border-ink-700/60 bg-ink-800 text-ink-400' };
}

const riskLevelLabel: Record<string, string> = {
  low: '저위험', medium: '중위험', high: '고위험', critical: '최고위험',
};
const riskLevelTone: Record<string, any> = {
  low: 'ok', medium: 'warn', high: 'alert', critical: 'alert',
};

export default function SupplierPortalPage() {
  const [viewerSupplierId, setViewerSupplierId] = useState<PortalViewer>('S-CAM-001');
  const [currentStep, setCurrentStep] = useState<Step>('po-select');

  const incomingPOs = useMemo(
    () => purchaseOrders.filter(po => po.supplierId === viewerSupplierId),
    [viewerSupplierId]
  );

  const [selectedPoIds, setSelectedPoIds] = useState<Set<string>>(
    new Set(incomingPOs.slice(0, 2).map(po => po.poId))
  );

  const myFactories = useMemo(
    () => factories.filter(f => f.supplierId === viewerSupplierId && f.factoryRole !== 'headquarters'),
    [viewerSupplierId]
  );

  const [selectedFactoryId, setSelectedFactoryId] = useState<string>(myFactories[0]?.factoryId || '');
  const selectedFactory = myFactories.find(f => f.factoryId === selectedFactoryId);

  const viewerSupplier = suppliers.find(s => s.id === viewerSupplierId);
  const viewerName = viewerSupplier?.name || viewerSupplierId;

  const parentEdges = supplyEdges.filter(e => e.from === viewerSupplierId);
  const childEdges  = supplyEdges.filter(e => e.to === viewerSupplierId);
  const parents = parentEdges.map(e => ({ edge: e, supplier: suppliers.find(s => s.id === e.to) })).filter(p => p.supplier);
  const children = childEdges.map(e => ({ edge: e, supplier: suppliers.find(s => s.id === e.from) })).filter(c => c.supplier);

  const [files] = useState<UploadedFile[]>([
    { name: 'invoice_240514_NCM811.pdf',  size: '2.4 MB', type: '거래 인보이스',   status: 'valid' },
    { name: 'origin_certificate_Co.pdf',  size: '1.1 MB', type: '원산지 증명서',  status: 'valid' },
    { name: 'carbon_emission_report.pdf', size: '3.8 MB', type: '탄소배출 보고서', status: 'validating' },
  ]);

  const [materials] = useState([
    { id: 1, name: '리튬',   amount: '12.4', unit: 'kg', recycled: '7' },
    { id: 2, name: '코발트', amount: '8.2',  unit: 'kg', recycled: '18' },
    { id: 3, name: '니켈',   amount: '23.6', unit: 'kg', recycled: '8' },
  ]);

  const togglePO = (poId: string) => {
    setSelectedPoIds(prev => {
      const next = new Set(prev);
      next.has(poId) ? next.delete(poId) : next.add(poId);
      return next;
    });
  };

  const stepOrder: Step[] = ['po-select', 'materials', 'documents', 'review'];
  const currentIdx = stepOrder.indexOf(currentStep);

  // ── 영역 1: KPI 데이터 ──────────────────────────────────────
  const completeness  = getCompleteness(viewerSupplierId);
  const certis        = getCertifications(viewerSupplierId);
  const riskProfile   = getRiskProfile(viewerSupplierId);

  const pendingPOs    = purchaseOrders.filter(
    po => po.supplierId === viewerSupplierId && po.status !== 'delivered'
  ).length;
  const expiredCertCount = certis.filter(c => c.status !== 'active').length;
  const missing = completeness?.missingFields ?? [];

  return (
    <>
      <PageHeader
        title="협력사 포털"
        description="PO 기반 데이터 제출 · 공장별 규제 차등 입력"
        badge="협력사"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-ink-400">시점:</span>
            <button
              onClick={() => {
                const next = viewerSupplierId === 'S-CAM-001' ? 'S-CELL-001' : 'S-CAM-001';
                setViewerSupplierId(next);
                setSelectedPoIds(new Set(purchaseOrders.filter(po => po.supplierId === next).slice(0, 2).map(po => po.poId)));
              }}
              className="text-xs px-3 py-1.5 rounded-xs border border-ink-600 hover:border-ink-500 text-ink-200 transition-colors"
            >
              {viewerSupplierId === 'S-CAM-001' ? 'POS Cathode' : 'Hanyang Cell'} ↔ 전환
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-6">

        {/* ══════════════════════════════════════════════════════
            [신규] 영역 1 — KPI 카드 행
        ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="미완료 요청"
            value={pendingPOs}
            unit="건"
            icon={AlertCircle}
            tone={pendingPOs > 0 ? 'warn' : 'ok'}
          />
          <KpiCard
            label="데이터 완성도"
            value={completeness?.completionRate ?? 0}
            unit="%"
            icon={CheckCircle2}
            tone={
              (completeness?.completionRate ?? 0) >= 90 ? 'ok' :
              (completeness?.completionRate ?? 0) >= 70 ? 'warn' : 'alert'
            }
            hint={
              completeness
                ? `${completeness.filledFieldCount} / ${completeness.requiredFieldCount} 항목`
                : undefined
            }
          />
          <KpiCard
            label="인증서 만료 위험"
            value={expiredCertCount}
            unit="건"
            icon={FileCheck}
            tone={expiredCertCount > 0 ? 'alert' : 'ok'}
            hint={expiredCertCount > 0 ? '만료 또는 만료 임박' : '전체 유효'}
          />
          <KpiCard
            label="현재 리스크 레벨"
            value={riskProfile ? riskLevelLabel[riskProfile.riskLevel] : '—'}
            unit=""
            icon={AlertCircle}
            tone={riskProfile ? riskLevelTone[riskProfile.riskLevel] : 'neutral'}
          />
        </div>

        {/* ══════════════════════════════════════════════════════
            [신규] 영역 2 — 규제 누락 경고 패널
        ══════════════════════════════════════════════════════ */}
        <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-3">
            규제 이행 누락 항목
          </div>
          {missing.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-emerald-700/30 bg-emerald-500/8 text-emerald-500 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              모든 필수 항목이 제출되었습니다
            </div>
          ) : (
            <div className="space-y-1.5">
              {missing.map((field, i) => {
                const badge = getRegBadge(field);
                return (
                  <div key={i} className="flex items-center gap-3 py-1.5 border-b border-ink-700/20 last:border-0">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="flex-1 text-[11px] text-ink-300">{field}</span>
                    <span className={clsx(
                      'shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-xs border',
                      badge.color
                    )}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            기존 입력 흐름 — 스텝 인디케이터 ~ Step 1~4 완전 유지
        ══════════════════════════════════════════════════════ */}

        {/* 스텝 인디케이터 */}
        <div className="flex items-center">
          <StepIndicator step="po-select"  current={currentStep} label="PO 선택"    num="1" />
          <StepConnector active={currentIdx > 0} />
          <StepIndicator step="materials"  current={currentStep} label="원자재·공장" num="2" />
          <StepConnector active={currentIdx > 1} />
          <StepIndicator step="documents"  current={currentStep} label="증빙 서류"   num="3" />
          <StepConnector active={currentIdx > 2} />
          <StepIndicator step="review"     current={currentStep} label="검토·제출"   num="4" />
        </div>

        {/* 스텝 1: PO 선택 */}
        {currentStep === 'po-select' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2 flex items-center gap-1">
                  <ArrowUp className="w-3 h-3" /> 직상위
                </div>
                {parents.length === 0 ? (
                  <div className="text-[11px] text-ink-500">없음 (원청사)</div>
                ) : parents.map(({ supplier: s }) => (
                  <div key={s!.id} className="text-[11px] text-ink-200 font-medium">{s!.name}</div>
                ))}
              </div>
              <div className="rounded-xs border border-accent-500/30 bg-accent-500/5 p-3 flex flex-col items-center justify-center">
                <Building2 className="w-4 h-4 text-accent-400 mb-1" />
                <div className="text-xs font-semibold text-ink-100">{viewerName}</div>
                <div className="text-[10px] text-ink-400">현재 시점</div>
              </div>
              <div className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2 flex items-center gap-1">
                  <ArrowDown className="w-3 h-3" /> 직하위
                </div>
                {children.map(({ supplier: s }) => (
                  <div key={s!.id} className="text-[11px] text-ink-200">{s!.name}</div>
                ))}
              </div>
            </div>

            <Card title="요청된 PO 목록" subtitle="원청사로부터 데이터 제출 요청된 발주">
              <div className="space-y-2">
                {incomingPOs.map(po => {
                  const part = parts.find(p => p.id === po.partId);
                  const isSelected = selectedPoIds.has(po.poId);
                  const statusMap: Record<string, { tone: any; label: string }> = {
                    pending:    { tone: 'warn',    label: '응답 대기' },
                    in_transit: { tone: 'info',    label: '운송 중' },
                    delivered:  { tone: 'neutral', label: '인도' },
                    verified:   { tone: 'ok',      label: '검증 완료' },
                  };
                  const sm = statusMap[po.status] || statusMap.pending;
                  return (
                    <button
                      key={po.poId}
                      onClick={() => togglePO(po.poId)}
                      className={clsx(
                        'w-full text-left rounded-xs border p-3 transition-colors',
                        isSelected ? 'border-accent-500/40 bg-accent-500/8' : 'border-ink-700/60 bg-ink-900/30 hover:bg-ink-800/30'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            'w-4 h-4 rounded-xs border flex items-center justify-center shrink-0',
                            isSelected ? 'bg-accent-700 border-accent-500' : 'border-ink-600'
                          )}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-ink-100 num-mono">{po.poId}</div>
                            <div className="text-[11px] text-ink-400 mt-0.5">{part?.partName || po.partId}</div>
                          </div>
                        </div>
                        <Badge tone={sm.tone} size="sm">{sm.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-ink-500 num-mono ml-7">
                        <span>{po.quantity} {part?.purchaseUnit || po.unit}</span>
                        <span>·</span>
                        <span>$ {po.unitPrice}/{part?.purchaseUnit || po.unit}</span>
                        <span>·</span>
                        <span>HS {part?.hsCode}</span>
                        <span>·</span>
                        <span>원산지 {po.originCountry}</span>
                        <span className="ml-auto">납기 {po.deliveryDate}</span>
                      </div>
                    </button>
                  );
                })}
                {incomingPOs.length === 0 && (
                  <div className="py-6 text-center text-xs text-ink-500">요청된 PO가 없습니다</div>
                )}
              </div>
            </Card>

            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep('materials')}
                disabled={selectedPoIds.size === 0}
                className={clsx(
                  'px-6 py-2.5 rounded-xs text-sm font-semibold transition-colors',
                  selectedPoIds.size > 0 ? 'bg-accent-700 hover:bg-accent-600 text-white' : 'bg-ink-700 text-ink-500 cursor-not-allowed'
                )}
              >
                다음: 원자재 · 공장 입력 →
              </button>
            </div>
          </div>
        )}

        {/* 스텝 2: 원자재 + 공장별 규제 차등 */}
        {currentStep === 'materials' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <Card title="원자재 구성" subtitle="배터리 광물 구성 및 재활용 함량">
                <div className="space-y-2">
                  {materials.map(m => (
                    <div key={m.id} className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-ink-100">{m.name}</span>
                        <span className="text-[10px] text-ink-400">{m.unit}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-ink-500 mb-1">총량</div>
                          <input defaultValue={m.amount} className="w-full bg-ink-800 border border-ink-600 rounded-xs px-2 py-1.5 text-xs text-ink-100 focus:outline-none focus:border-accent-500" />
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-ink-500 mb-1">재활용 함량 %</div>
                          <input defaultValue={m.recycled} className="w-full bg-ink-800 border border-ink-600 rounded-xs px-2 py-1.5 text-xs text-ink-100 focus:outline-none focus:border-accent-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="탄소발자국" subtitle="kgCO₂eq/kg — EU 배터리법 Art.7 기준">
                <div className="space-y-3">
                  {['Scope 1 (직접 배출)', 'Scope 2 (전력)', 'Scope 3 (업스트림)'].map((s, i) => (
                    <div key={i}>
                      <div className="text-[10px] text-ink-400 mb-1">{s}</div>
                      <div className="relative">
                        <input defaultValue={['4.2', '8.7', '12.1'][i]} className="w-full bg-ink-800 border border-ink-600 rounded-xs px-3 py-2 text-xs text-ink-100 focus:outline-none focus:border-accent-500 pr-24" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-400">kgCO₂eq/kg</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-ink-400">
                  ※ 자체 측정값을 제출하지 못하는 경우 EU 기본 계수를 자동 적용합니다 (단, 평가에서 불리할 수 있음)
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <Card title="공장별 입력" subtitle="공장을 선택하면 해당 공장 납품 시장의 규제 항목이 안내됩니다">
                <div className="flex gap-2 mb-4 flex-wrap">
                  {myFactories.map(f => {
                    const isActive = f.factoryId === selectedFactoryId;
                    const destLabel = f.destination === 'EU' ? 'EU' : f.destination === 'US' ? '미국' : f.destination === 'BOTH' ? 'EU+미국' : '국내';
                    const destTone  = f.destination === 'EU' ? 'emerald' : f.destination === 'US' ? 'amber' : f.destination === 'BOTH' ? 'purple' : 'neutral';
                    return (
                      <button key={f.factoryId} onClick={() => setSelectedFactoryId(f.factoryId)}
                        className={clsx('flex items-center gap-2 px-3 py-2 rounded-xs border transition-colors',
                          isActive ? 'border-accent-500/40 bg-accent-500/8 text-ink-100' : 'border-ink-700/60 bg-ink-900/30 text-ink-400 hover:text-ink-200'
                        )}>
                        <Factory className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{f.factoryName}</span>
                        <Badge tone={destTone as any} size="sm">{destLabel}</Badge>
                      </button>
                    );
                  })}
                </div>
                {selectedFactory && <FactoryFieldsPanel factory={selectedFactory} />}
              </Card>
            </div>
          </div>
        )}

        {/* 스텝 3: 증빙 서류 */}
        {currentStep === 'documents' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <Card title="재활용 함량 검증" subtitle="EU 배터리법 의무 비율 대비">
                <div className="grid grid-cols-3 gap-3">
                  <ComplianceCheck metal="코발트 (Co)" target={16} current={18} />
                  <ComplianceCheck metal="니켈 (Ni)"   target={6}  current={8} />
                  <ComplianceCheck metal="리튬 (Li)"   target={6}  current={7} />
                </div>
              </Card>
              <Card title="증빙 서류" subtitle="필수 PDF 첨부">
                <button className="w-full border-2 border-dashed border-ink-600 hover:border-accent-500 rounded-sm p-6 mb-3 transition-colors group">
                  <Upload className="w-6 h-6 text-ink-400 group-hover:text-accent-400 mx-auto mb-2" strokeWidth={1.5} />
                  <div className="text-xs text-ink-200 font-medium mb-1">파일 선택 또는 끌어놓기</div>
                  <div className="text-[10px] text-ink-500">PDF · 최대 20MB · 디지털 서명 권장</div>
                </button>
                <div className="space-y-1.5">
                  {files.map(f => <FileRow key={f.name} file={f} />)}
                </div>
                <div className="mt-4 pt-3 border-t border-ink-700">
                  <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">필수 누락 항목</div>
                  <MissingItem label="공급자 선언서 (DoS)" />
                </div>
              </Card>
            </div>
            <div className="space-y-4">
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
                <button disabled className="w-full mt-4 py-2.5 rounded-xs bg-ink-700 text-ink-400 text-xs font-medium cursor-not-allowed">
                  필수 항목 완료 후 제출 가능
                </button>
                <div className="mt-2 text-[10px] text-ink-500 text-center">제출 후 검증까지 평균 4분</div>
              </Card>
            </div>
          </div>
        )}

        {/* 스텝 내비게이션 */}
        {currentStep !== 'po-select' && (
          <div className="flex justify-between pt-2">
            <button onClick={() => setCurrentStep(stepOrder[currentIdx - 1])} className="px-4 py-2 rounded-xs border border-ink-600 text-ink-200 text-xs hover:border-ink-500 transition-colors">
              ← 이전
            </button>
            {currentStep !== 'documents' && (
              <button onClick={() => setCurrentStep(stepOrder[currentIdx + 1])} className="px-6 py-2 rounded-xs bg-accent-700 hover:bg-accent-600 text-white text-xs font-semibold transition-colors">
                다음 →
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── 기존 서브 컴포넌트 전체 유지 ──────────────────────────────

function FactoryFieldsPanel({ factory }: { factory: any }) {
  const fieldsByDestination: Record<string, Array<{ label: string; reg: Regulation | '공통'; type: 'upload' | 'input'; required?: boolean }>> = {
    EU: [
      { label: '원재료 GPS 좌표 (산림파괴 검증용)',  reg: 'EUDR',              type: 'input',  required: true },
      { label: 'FSC 인증서 (산림 인증)',             reg: 'EUDR_FSC',          type: 'upload', required: true },
      { label: '인권 실사 보고서',                    reg: 'CSDDD',             type: 'upload', required: true },
      { label: '재활용 함량 증빙',                    reg: 'EU_BATTERY',        type: 'upload', required: true },
      { label: '분쟁광물 공급망 실사 보고서 (CMRT)', reg: 'CONFLICT_MINERALS', type: 'upload', required: true },
      { label: '탄소발자국 신고서 (Scope 1-3)',      reg: 'EU_BATTERY_ART7',   type: 'upload', required: true },
      { label: 'Battery DDP 정책서',                reg: 'EU_BATTERY_ART47',  type: 'upload', required: false },
      { label: 'Notified Body 검증서',              reg: 'EU_BATTERY_ART47',  type: 'upload', required: false },
      { label: 'CRMA 원산지별 공급 비율 증빙',       reg: 'CRMA',              type: 'input',  required: false },
      { label: 'LkSG 인권 실사 요약서',             reg: 'LKSG',              type: 'upload', required: false },
      { label: 'CBAM 탄소 함량 신고 데이터',         reg: 'CBAM',              type: 'upload', required: false },
      { label: '원산지 증명서',                       reg: '공통',              type: 'upload', required: true },
    ],
    US: [
      { label: '원산지 증명서 (UFLPA 반증용)',       reg: 'UFLPA', type: 'upload', required: true },
      { label: '정련소 위치 + 공정 방식',            reg: 'UFLPA', type: 'input',  required: true },
      { label: 'FEOC 직접 지분율 (%)',              reg: 'IRA',   type: 'input',  required: true },
      { label: 'FEOC 간접 지분율 (%)',              reg: 'IRA',   type: 'input',  required: true },
      { label: '인권 실사 보고서',                    reg: 'CSDDD', type: 'upload', required: false },
    ],
    BOTH: [
      { label: '원재료 GPS 좌표',                    reg: 'EUDR',              type: 'input',  required: true },
      { label: 'FSC 인증서',                         reg: 'EUDR_FSC',          type: 'upload', required: true },
      { label: '인권 실사 보고서',                    reg: 'CSDDD',             type: 'upload', required: true },
      { label: '재활용 함량 증빙',                    reg: 'EU_BATTERY',        type: 'upload', required: true },
      { label: '분쟁광물 공급망 실사 보고서 (CMRT)', reg: 'CONFLICT_MINERALS', type: 'upload', required: true },
      { label: '탄소발자국 신고서 (Scope 1-3)',      reg: 'EU_BATTERY_ART7',   type: 'upload', required: true },
      { label: 'CRMA 원산지별 공급 비율 증빙',       reg: 'CRMA',              type: 'input',  required: false },
      { label: 'LkSG 인권 실사 요약서',             reg: 'LKSG',              type: 'upload', required: false },
      { label: 'CBAM 탄소 함량 신고 데이터',         reg: 'CBAM',              type: 'upload', required: false },
      { label: '원산지 증명서 (UFLPA 반증용)',       reg: 'UFLPA', type: 'upload', required: true },
      { label: '정련소 위치',                         reg: 'UFLPA', type: 'input',  required: true },
      { label: 'FEOC 지분율 (직+간접)',              reg: 'IRA',   type: 'input',  required: true },
      { label: '원산지 증명서',                       reg: '공통',  type: 'upload', required: true },
    ],
    KR: [
      { label: '원산지 증명서', reg: '공통', type: 'upload', required: true },
      { label: '품질 인증서',   reg: '공통', type: 'upload', required: true },
    ],
  };

  const fields = fieldsByDestination[factory.destination] || [];
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const toggle = (idx: number) => setCompleted(prev => ({ ...prev, [idx]: !prev[idx] }));
  const completedCount = Object.values(completed).filter(Boolean).length;
  const requiredCount = fields.filter(f => f.required).length;
  const completedRequiredCount = fields.filter((f, i) => f.required && !!completed[i]).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 rounded-xs border border-ink-700/60 bg-ink-900/40">
        <div>
          <div className="text-sm font-semibold text-ink-100">{factory.factoryName}</div>
          <div className="text-[11px] text-ink-400 mt-0.5">{factory.destinationDetail}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-ink-400 uppercase tracking-wider">공급 비율</div>
          <div className="text-2xl font-bold text-accent-400 num-mono leading-none">{factory.supplyRatioPercent}%</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">이 공장 적용 규제:</span>
        {factory.applicableRegulations?.map((reg: Regulation) => (
          <RegulationChipInline key={reg} reg={reg} />
        ))}
      </div>
      <div className="space-y-1.5">
        {fields.map((f, idx) => {
          const isDone = !!completed[idx];
          return (
            <div key={idx} className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-xs border transition-colors',
              isDone ? 'border-emerald-700/40 bg-emerald-500/5' : 'border-ink-700/60 bg-ink-900/40'
            )}>
              {f.type === 'upload' ? <Upload className="w-3.5 h-3.5 text-ink-500 shrink-0" /> : <MapPin className="w-3.5 h-3.5 text-ink-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-ink-100">{f.label}</span>
                  {f.required && <span className="text-[9px] text-red-400 font-semibold">필수</span>}
                </div>
                {isDone && <div className="text-[10px] text-emerald-500 font-semibold">완료 ✓</div>}
              </div>
              <RegulationChipInline reg={f.reg as Regulation} />
              <button onClick={() => toggle(idx)} className={clsx('text-[10px] px-2.5 py-1 rounded-xs font-semibold transition-colors shrink-0',
                isDone ? 'bg-emerald-700 text-white hover:bg-emerald-600' : 'bg-accent-700 text-white hover:bg-accent-600'
              )}>
                {isDone ? '✓' : f.type === 'upload' ? '업로드' : '입력'}
              </button>
            </div>
          );
        })}
      </div>
      <div className="pt-3 border-t border-ink-700/60">
        <div className="flex items-center justify-between mb-1.5 text-[11px]">
          <span className="text-ink-400">진행률 (필수 {completedRequiredCount}/{requiredCount})</span>
          <span className="num-mono text-ink-200 font-semibold">{completedCount} / {fields.length}</span>
        </div>
        <div className="h-1.5 bg-ink-700 rounded-xs overflow-hidden">
          <div className="h-full bg-accent-700 transition-all" style={{ width: `${fields.length > 0 ? (completedCount / fields.length) * 100 : 0}%` }} />
        </div>
      </div>
    </div>
  );
}

function RegulationChipInline({ reg }: { reg: Regulation | '공통' }) {
  if (reg === '공통') return (
    <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-xs border border-ink-600/60 text-[9px] text-ink-400 font-medium">공통</span>
  );
  const meta = regulationMeta[reg];
  if (!meta) return null;
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-700/30 bg-emerald-500/8 text-emerald-600',
    teal:    'border-teal-700/30 bg-teal-500/8 text-teal-600',
    amber:   'border-amber-700/30 bg-amber-500/8 text-amber-600',
    orange:  'border-orange-700/30 bg-orange-500/8 text-orange-600',
    blue:    'border-blue-700/30 bg-blue-500/8 text-blue-600',
    cyan:    'border-cyan-700/30 bg-cyan-500/8 text-cyan-600',
    purple:  'border-purple-700/30 bg-purple-500/8 text-purple-600',
    red:     'border-red-700/30 bg-red-500/8 text-red-600',
    violet:  'border-violet-700/30 bg-violet-500/8 text-violet-600',
    slate:   'border-slate-700/30 bg-slate-500/8 text-slate-500',
  };
  return (
    <span className={clsx('shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-xs border text-[9px] font-semibold', colorMap[meta.color] || 'border-ink-600 text-ink-400')}>
      {meta.label}
    </span>
  );
}

function StepIndicator({ step, current, label, num }: any) {
  const stepOrder: Step[] = ['po-select', 'materials', 'documents', 'review'];
  const currentIdx = stepOrder.indexOf(current);
  const myIdx = stepOrder.indexOf(step);
  const isCurrent = step === current;
  const isPast = myIdx < currentIdx;
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className={clsx('w-7 h-7 rounded-xs flex items-center justify-center text-xs font-semibold num-mono',
        isCurrent ? 'bg-accent-700 text-white' : isPast ? 'bg-accent-700/30 text-accent-300' : 'bg-ink-700 text-ink-400'
      )}>
        {isPast ? <CheckCircle2 className="w-4 h-4" /> : num}
      </div>
      <span className={clsx('text-xs font-medium', isCurrent ? 'text-ink-50' : isPast ? 'text-ink-300' : 'text-ink-500')}>{label}</span>
    </div>
  );
}

function StepConnector({ active }: { active: boolean }) {
  return <div className={clsx('flex-1 h-px mx-3', active ? 'bg-accent-700/50' : 'bg-ink-700')} />;
}

function FileRow({ file }: { file: UploadedFile }) {
  const statusMap = {
    uploaded:   { icon: FileText,    color: 'text-ink-400',     label: '업로드됨' },
    validating: { icon: AlertCircle, color: 'text-amber-500',   label: '검증 중' },
    valid:      { icon: FileCheck,   color: 'text-emerald-500', label: '유효' },
    error:      { icon: X,           color: 'text-red-500',     label: '오류' },
  };
  const sm = statusMap[file.status];
  const Icon = sm.icon;
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xs border border-ink-700/60 bg-ink-900/30">
      <Icon className={clsx('w-3.5 h-3.5 shrink-0', sm.color)} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-ink-100 truncate">{file.name}</div>
        <div className="text-[10px] text-ink-500">{file.type} · {file.size}</div>
      </div>
      <span className={clsx('text-[10px] font-medium', sm.color)}>{sm.label}</span>
    </div>
  );
}

function MissingItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-red-400">
      <AlertCircle className="w-3 h-3 shrink-0" />{label}
    </div>
  );
}

function CheckRow({ label, ok, warn }: { label: string; ok?: boolean; warn?: boolean }) {
  const icon = ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> :
               warn ? <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> :
               <Info className="w-3.5 h-3.5 text-ink-500" />;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      {icon}
      <span className={ok ? 'text-ink-300' : warn ? 'text-amber-400' : 'text-ink-500'}>{label}</span>
    </div>
  );
}

function ComplianceCheck({ metal, target, current }: any) {
  const ok = current >= target;
  return (
    <div className={clsx('rounded-xs border p-2.5', ok ? 'border-emerald-700/30 bg-emerald-500/5' : 'border-amber-700/30 bg-amber-500/5')}>
      <div className="text-[10px] text-ink-400 mb-1">{metal}</div>
      <div className="flex items-baseline justify-between">
        <span className={clsx('text-lg font-semibold num-mono', ok ? 'text-emerald-400' : 'text-amber-400')}>{current}%</span>
        <span className="text-[9px] text-ink-500">의무 {target}%</span>
      </div>
    </div>
  );
}
