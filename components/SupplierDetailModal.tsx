'use client';

import { useState, useEffect } from 'react';
import { Supplier, supplyEdges } from '@/lib/data';
import {
  getSupplierExtended, getContacts, getFactories, getCertifications,
  getProcesses, getCompleteness, getRemindLogs, getIncomingPOs, getOutgoingPOs,
  getPart, type ViewerRole, tier1ViewerSupplierId,
  regulationMeta, type Regulation
} from '@/lib/supplier-detail-data';
import {
  X, Building2, Factory, Truck, Database,
  Mail, Phone, MapPin, Calendar, Hash, DollarSign, Layers,
  CheckCircle2, AlertCircle, ArrowDown, ArrowUp,
  ExternalLink, Send, Award, EyeOff, PieChart
} from 'lucide-react';
import Badge from './Badge';
import clsx from 'clsx';

// 탭 순서: 위험 우선 (데이터 완성도 → 공급 부품 → 인증 → 공장 → 기업·담당자)
// '상하위 관계'는 협력사 포털(/portal)로 이동 — 협력사 본인이 자기 직상위/직하위만 보는 화면
type TabKey =
  | 'completeness' // 데이터 완성도·리마인드 (위험 신호)
  | 'parts'        // 공급 부품·PO (실사 핵심)
  | 'cert'         // 인증·증빙·공정
  | 'factory'      // 공장(사업장)
  | 'company';     // 기업·담당자 (메타정보)

interface ModalProps {
  supplier: Supplier | null;
  onClose: () => void;
  viewerRole: ViewerRole;
  onSelectSupplier: (s: Supplier) => void;
  initialTab?: TabKey;            // 외부에서 특정 탭으로 점프 (검색 결과 → PO 탭 등)
}

const providerTypeLabel: Record<string, string> = {
  manufacturer: '제조업체',
  recycler: '재활용업체',
  trader: '트레이더',
  miner: '광산',
};

const countryNames: Record<string, string> = {
  KR: '한국', CN: '중국', JP: '일본', AU: '호주', CL: '칠레',
  ZA: '남아공', DE: '독일', US: '미국', PH: '필리핀', CD: '콩고민주공화국',
};

export default function SupplierDetailModal({ supplier, onClose, viewerRole, onSelectSupplier, initialTab }: ModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? 'completeness');

  // 외부에서 initialTab 변경 시 (검색 결과 클릭) 활성 탭 동기화
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, supplier?.id]);

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (supplier) {
      window.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [supplier, onClose]);

  if (!supplier) return null;

  // 1차 협력사 시점에서 보이는 협력사인지 (정의서 ② 권한 제어 시뮬)
  const isMaskedView = viewerRole === 'tier1_supplier' && supplier.id !== tier1ViewerSupplierId
    && !supplyEdges.some(e => (e.to === tier1ViewerSupplierId && e.from === supplier.id))
    && !supplyEdges.some(e => (e.from === tier1ViewerSupplierId && e.to === supplier.id));

  const ext = getSupplierExtended(supplier.id);
  const contacts = getContacts(supplier.id);
  const factoryList = getFactories(supplier.id);
  const certs = getCertifications(supplier.id);
  const processes = getProcesses(supplier.id);
  const completeness = getCompleteness(supplier.id);
  const reminds = getRemindLogs(supplier.id);
  const incomingPOs = getIncomingPOs(supplier.id);
  const outgoingPOs = getOutgoingPOs(supplier.id);

  const primaryContact = contacts.find(c => c.isPrimary) || contacts[0];
  const hq = factoryList.find(f => f.factoryRole === 'headquarters');
  const productionFactories = factoryList.filter(f => f.factoryRole !== 'headquarters');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-50/50 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-ink-800 border border-ink-700 rounded-sm w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== 헤더 ===== */}
        <div className="border-b border-ink-700 px-6 py-4 flex items-start justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <StatusBadge status={supplier.status} />
              {/* Tier 배지: 여러 Tier를 다루면 모두 표시 */}
              <div className="flex items-center gap-0.5">
                {supplier.tiers.map(t => (
                  <Badge key={t} tone="neutral">{`T${t}`}</Badge>
                ))}
              </div>
              {ext && <Badge tone="info">{providerTypeLabel[ext.providerType]}</Badge>}
              <span className="text-[10px] text-ink-400 num-mono">{supplier.id}</span>
            </div>
            <h2 className="text-xl font-semibold text-ink-50 tracking-tight">{supplier.name}</h2>
            <div className="text-xs text-ink-400 mt-0.5 flex items-center gap-3 flex-wrap">
              <span>{supplier.role}</span>
              <span>·</span>
              <span>{countryNames[supplier.country] || supplier.country} · {supplier.region}</span>
              {ext && (
                <>
                  <span>·</span>
                  <span className="num-mono">설립 {ext.establishedYear}</span>
                  <span>·</span>
                  <span className="num-mono">{ext.employeeCount.toLocaleString()}명</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-100 p-1 rounded-xs hover:bg-ink-700/60 shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ===== 권한 마스킹 오버레이 ===== */}
        {isMaskedView ? (
          <MaskedView onClose={onClose} />
        ) : (
          <>
            {/* ===== 탭 (위험 우선 순서) ===== */}
            <div className="border-b border-ink-700 px-6 flex items-center gap-1 overflow-x-auto shrink-0">
              <TabButton active={activeTab === 'completeness'} onClick={() => setActiveTab('completeness')} icon={Database}   label="데이터·리마인드" alert={completeness && completeness.completionRate < 80} />
              <TabButton active={activeTab === 'parts'}        onClick={() => setActiveTab('parts')}        icon={Truck}      label="공급 부품·PO" badge={incomingPOs.length + outgoingPOs.length} />
              <TabButton active={activeTab === 'cert'}         onClick={() => setActiveTab('cert')}         icon={Award}      label="인증·공정" badge={certs.length} />
              <TabButton active={activeTab === 'factory'}      onClick={() => setActiveTab('factory')}      icon={Factory}    label="공장" badge={factoryList.length} />
              <TabButton active={activeTab === 'company'}      onClick={() => setActiveTab('company')}      icon={Building2}  label="기업·담당자" />
            </div>

            {/* ===== 본문 ===== */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeTab === 'company' && (
                <CompanyTab supplier={supplier} ext={ext} contacts={contacts} primaryContact={primaryContact} />
              )}
              {activeTab === 'factory' && (
                <FactoryTab hq={hq} production={productionFactories} />
              )}
              {activeTab === 'parts' && (
                <PartsTab incoming={incomingPOs} outgoing={outgoingPOs} supplierId={supplier.id} />
              )}
              {activeTab === 'cert' && (
                <CertTab certs={certs} processes={processes} />
              )}
              {activeTab === 'completeness' && (
                <CompletenessTab completeness={completeness} reminds={reminds} contacts={contacts} />
              )}
            </div>

            {/* ===== 푸터: 빠른 액션 ===== */}
            <div className="border-t border-ink-700 px-6 py-3 flex items-center justify-between shrink-0 bg-ink-900/40">
              <div className="text-[11px] text-ink-400 num-mono">
                마지막 검증 {supplier.lastVerified}
              </div>
              <div className="flex items-center gap-2">
                {supplier.status === 'review' || supplier.status === 'pending' ? (
                  <>
                    <button className="text-xs px-3 py-1.5 rounded-xs border border-ink-700 hover:border-amber-700/50 hover:bg-amber-500/10 text-ink-200 flex items-center gap-1.5">
                      <Send className="w-3 h-3" /> 데이터 요청 메일
                    </button>
                    <button className="text-xs px-3 py-1.5 rounded-xs border border-red-700/40 hover:bg-red-500/10 text-red-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" /> 반려
                    </button>
                  </>
                ) : null}
                <button className="text-xs px-3 py-1.5 rounded-xs bg-accent-700 hover:bg-accent-600 text-white flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> 승인
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
        .animate-slideUp { animation: slideUp 0.2s ease-out; }
      `}</style>
    </div>
  );
}

// =====================================================
// 권한 마스킹 뷰
// =====================================================
function MaskedView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-xs bg-ink-700/60 mx-auto flex items-center justify-center mb-4">
          <EyeOff className="w-7 h-7 text-ink-400" strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-semibold text-ink-100 mb-2">접근 권한 없음</h3>
        <p className="text-xs text-ink-400 leading-relaxed mb-1">
          현재 <span className="text-ink-200 font-medium">1차 협력사 시점</span>에서는 직상위·직하위 협력사 정보만 조회할 수 있습니다.
        </p>
        <p className="text-xs text-ink-400 leading-relaxed mb-5">
          옆 라인 협력사 및 다른 N차 협력사 정보는 보안상 차단되어 있습니다.
        </p>
        <button
          onClick={onClose}
          className="text-xs px-4 py-1.5 rounded-xs border border-ink-700 hover:bg-ink-700/60 text-ink-200"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

// =====================================================
// 탭: 기업·담당자
// =====================================================
function CompanyTab({ supplier, ext, contacts, primaryContact }: any) {
  return (
    <div className="space-y-5">
      {/* 기업 일반정보 */}
      <Section title="기업 일반정보">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KVItem label="대표자" value={ext?.ceoName || '—'} />
          <KVItem label="사업자 등록번호" value={ext?.businessRegNo || '—'} mono />
          <KVItem label="법인 등록번호" value={ext?.corporateRegNo || '—'} mono />
          <KVItem label="DUNS Number" value={ext?.dunsNumber || '—'} mono />
          <KVItem label="Tax Number" value={ext?.taxNumber || '—'} mono />
          <KVItem label="홈페이지" value={ext?.website || '—'} link={ext?.website} />
          <KVItem label="설립연도" value={ext?.establishedYear?.toString() || '—'} mono />
          <KVItem label="직원수" value={ext?.employeeCount ? `${ext.employeeCount.toLocaleString()}명` : '—'} mono />
          <KVItem label="공급자 유형" value={ext ? providerTypeLabel[ext.providerType] : '—'} />
        </div>
      </Section>

      {/* 담당자 다중 */}
      <Section title={`담당자 (${contacts.length}명)`} subtitle="CEO · ESG · 영업 · 구매전략">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {contacts.map((c: any) => (
            <div key={c.contactId} className={clsx(
              'rounded-xs border p-3 transition-colors',
              c.isPrimary ? 'border-accent-700/40 bg-accent-500/5' : 'border-ink-700/60 bg-ink-900/40'
            )}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-100">{c.name}</span>
                  <Badge tone={c.role === 'ESG' ? 'ok' : c.role === 'CEO' ? 'info' : 'neutral'} size="sm">
                    {c.role}
                  </Badge>
                </div>
                {c.isPrimary && <Badge tone="ok" size="sm" dot>대표 컨택</Badge>}
              </div>
              <div className="space-y-0.5">
                <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-[11px] text-ink-300 hover:text-accent-400 num-mono">
                  <Mail className="w-3 h-3 text-ink-500" /> {c.email}
                </a>
                <div className="flex items-center gap-1.5 text-[11px] text-ink-400 num-mono">
                  <Phone className="w-3 h-3 text-ink-500" /> {c.phone}
                </div>
              </div>
            </div>
          ))}
          {contacts.length === 0 && (
            <div className="text-xs text-ink-500 py-4 text-center col-span-2">등록된 담당자가 없습니다</div>
          )}
        </div>
      </Section>
    </div>
  );
}

// =====================================================
// 탭: 공장(사업장)
// =====================================================
function FactoryTab({ hq, production }: any) {
  return (
    <div className="space-y-5">
      {/* 본사 */}
      {hq && (
        <Section title="본사 (Headquarters)" subtitle="법인 등록 주소">
          <FactoryCard factory={hq} tone="hq" />
        </Section>
      )}

      {/* 생산 공장 */}
      <Section
        title={`생산·가공 공장 (${production.length}개소)`}
        subtitle="실제 부품이 생산되는 사업장 — 원산지 증명의 기준"
      >
        <div className="space-y-2">
          {production.map((f: any) => (
            <FactoryCard key={f.factoryId} factory={f} tone="prod" />
          ))}
          {production.length === 0 && (
            <div className="text-xs text-ink-500 py-4 text-center">등록된 생산 공장이 없습니다</div>
          )}
        </div>
      </Section>
    </div>
  );
}

function FactoryCard({ factory, tone }: { factory: any; tone: 'hq' | 'prod' }) {
  const roleLabel: Record<string, string> = {
    headquarters: '본사',
    production: '생산공장',
    outsourcing: '외주공장',
    processing: '가공·정제',
    mining: '광산',
  };
  const destLabel: Record<string, string> = {
    EU: 'EU 납품',
    US: '미국 납품',
    BOTH: 'EU + 미국 동시',
    KR: '국내 납품',
  };
  const destTone: Record<string, 'ok' | 'info' | 'warn' | 'neutral'> = {
    EU: 'ok',
    US: 'info',
    BOTH: 'warn',
    KR: 'neutral',
  };

  const hasSupplyInfo = factory.destination && factory.supplyRatioPercent != null;

  return (
    <div className={clsx(
      'rounded-xs border p-3',
      tone === 'hq' ? 'border-blue-700/30 bg-blue-500/5' : 'border-ink-700/60 bg-ink-900/40'
    )}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Factory className={clsx('w-4 h-4', tone === 'hq' ? 'text-blue-700' : 'text-accent-500')} strokeWidth={1.8} />
          <span className="text-sm font-medium text-ink-100">{factory.factoryName}</span>
          <Badge tone={tone === 'hq' ? 'info' : 'neutral'} size="sm">{roleLabel[factory.factoryRole]}</Badge>
          {factory.destination && (
            <Badge tone={destTone[factory.destination]} size="sm">
              {destLabel[factory.destination]}
            </Badge>
          )}
          {!factory.isActive && <Badge tone="alert" size="sm">가동중지</Badge>}
        </div>
        {factory.monthlyCapacity && (
          <span className="text-[11px] num-mono text-ink-300 shrink-0">
            월 {factory.monthlyCapacity}
          </span>
        )}
      </div>

      <div className="space-y-1 pl-6">
        <div className="text-[11px] text-ink-300 flex items-start gap-1.5">
          <MapPin className="w-3 h-3 text-ink-500 shrink-0 mt-0.5" />
          <span>{factory.address}</span>
        </div>
        <div className="text-[10px] text-ink-500 num-mono">
          {factory.coordinates[1].toFixed(4)}, {factory.coordinates[0].toFixed(4)}
        </div>
        <div className="text-[11px] text-ink-400 flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-ink-500" />
          가동 <span className="num-mono">{factory.operatingPeriodFrom}</span>
          {factory.operatingPeriodTo ? <> ~ <span className="num-mono">{factory.operatingPeriodTo}</span></> : <span className="text-emerald-700"> ~ 현재</span>}
        </div>
        {factory.destinationDetail && (
          <div className="text-[11px] text-ink-300 flex items-center gap-1.5">
            <Truck className="w-3 h-3 text-ink-500" />
            <span>{factory.destinationDetail}</span>
          </div>
        )}
      </div>

      {/* 공급 비율 시각화 — 팀원 코드 컨셉 흡수 */}
      {hasSupplyInfo && (
        <div className="mt-3 pl-6 pr-2">
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <PieChart className="w-3 h-3 text-ink-500" />
              <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">
                이 부품 공급 비율
              </span>
              {factory.supplyQuantity && (
                <span className="text-[10px] text-ink-500 num-mono">· {factory.supplyQuantity}</span>
              )}
            </div>
            <span className={clsx(
              'text-2xl font-bold num-mono leading-none',
              factory.supplyRatioPercent === 100 ? 'text-emerald-700' :
              factory.supplyRatioPercent >= 50 ? 'text-blue-700' :
              'text-amber-700'
            )}>
              {factory.supplyRatioPercent}%
            </span>
          </div>
          <div className="h-1.5 bg-ink-700 rounded-xs overflow-hidden">
            <div
              className={clsx(
                'h-full transition-all',
                factory.supplyRatioPercent === 100 ? 'bg-emerald-700' :
                factory.supplyRatioPercent >= 50 ? 'bg-blue-700' :
                'bg-amber-700'
              )}
              style={{ width: `${factory.supplyRatioPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 적용 규제 배지 */}
      {factory.applicableRegulations && factory.applicableRegulations.length > 0 && (
        <div className="mt-3 pl-6 pr-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1.5">
            적용 규제
          </div>
          <div className="flex flex-wrap gap-1">
            {factory.applicableRegulations.map((reg: Regulation) => (
              <RegulationChip key={reg} reg={reg} />
            ))}
          </div>
          {factory.hiddenRegulations && factory.hiddenRegulations.length > 0 && (
            <div className="mt-1.5 text-[10px] text-ink-500 flex items-center gap-1">
              <EyeOff className="w-2.5 h-2.5" />
              자동 숨김: {factory.hiddenRegulations.map((r: Regulation) => regulationMeta[r]?.label).join(', ')}
              <span className="text-ink-600">(다른 시장 규제)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 규제 배지 컴포넌트
function RegulationChip({ reg }: { reg: Regulation }) {
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
        'text-[10px] num-mono px-1.5 py-0.5 rounded-xs border font-semibold',
        colorMap[meta.color] || colorMap.blue
      )}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}

// =====================================================
// 탭: 공급 부품·PO
// =====================================================
function PartsTab({ incoming, outgoing, supplierId }: any) {
  return (
    <div className="space-y-5">
      {/* 납품 (이 협력사가 보내는 것) */}
      <Section
        title={`납품 부품 (${outgoing.length}건)`}
        subtitle="이 협력사가 출하한 PO·송장 기준"
        icon={ArrowUp}
      >
        <PoTable pos={outgoing} direction="outgoing" />
      </Section>

      {/* 수신 (이 협력사가 받는 것) */}
      <Section
        title={`수신 부품 (${incoming.length}건)`}
        subtitle="이 협력사가 하위로부터 받은 PO·송장 기준"
        icon={ArrowDown}
      >
        <PoTable pos={incoming} direction="incoming" />
      </Section>
    </div>
  );
}

function PoTable({ pos, direction }: { pos: any[]; direction: 'incoming' | 'outgoing' }) {
  if (pos.length === 0) {
    return <div className="text-xs text-ink-500 py-4 text-center rounded-xs bg-ink-900/30 border border-ink-700/40">해당 방향의 PO가 없습니다</div>;
  }
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-ink-400 border-b border-ink-700">
            <th className="text-left font-medium px-2 py-2">PO 번호</th>
            <th className="text-left font-medium px-2 py-2">부품 (협력사 코드 → 원청 코드)</th>
            <th className="text-left font-medium px-2 py-2">HS</th>
            <th className="text-right font-medium px-2 py-2">수량</th>
            <th className="text-right font-medium px-2 py-2">비율</th>
            <th className="text-right font-medium px-2 py-2">단가</th>
            <th className="text-left font-medium px-2 py-2">원산지</th>
            <th className="text-left font-medium px-2 py-2">상태</th>
          </tr>
        </thead>
        <tbody>
          {pos.map((po: any) => {
            const part = getPart(po.partId);
            return (
              <tr key={po.poId} className="border-b border-ink-700/40 hover:bg-ink-800/40">
                <td className="px-2 py-2">
                  <div className="num-mono text-accent-400 text-[11px]">{po.poNumber}</div>
                  <div className="text-[10px] text-ink-500 num-mono">{po.deliveryDate}</div>
                </td>
                <td className="px-2 py-2">
                  <div className="font-medium text-ink-200">{part?.partName}</div>
                  <div className="text-[10px] text-ink-500 num-mono">
                    {po.supplierPartCode} → <span className="text-accent-500">{po.originalPartCode}</span>
                  </div>
                </td>
                <td className="px-2 py-2 num-mono text-[11px] text-ink-300">{part?.hsCode}</td>
                <td className="px-2 py-2 text-right num-mono text-ink-200">
                  {po.quantity.toLocaleString()}<span className="text-ink-500 ml-0.5">{po.unit}</span>
                </td>
                <td className="px-2 py-2 text-right num-mono">
                  <span className={clsx(
                    'text-[11px] px-1.5 py-0.5 rounded-xs',
                    po.supplyRatio === 100 ? 'bg-ink-700 text-ink-200' : 'bg-blue-500/10 text-blue-700'
                  )}>
                    {po.supplyRatio}%
                  </span>
                </td>
                <td className="px-2 py-2 text-right num-mono text-ink-200">${po.unitPrice}</td>
                <td className="px-2 py-2 num-mono text-[11px]">
                  <span className="px-1.5 py-0.5 rounded-xs bg-ink-800 border border-ink-700/60">
                    {po.originCountry}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <PoStatusBadge status={po.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PoStatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: any; label: string }> = {
    pending:    { tone: 'warn',    label: '대기' },
    in_transit: { tone: 'info',    label: '운송중' },
    delivered:  { tone: 'neutral', label: '인도' },
    verified:   { tone: 'ok',      label: '검증완료' },
  };
  const m = map[status] || map.pending;
  return <Badge tone={m.tone} size="sm">{m.label}</Badge>;
}

// =====================================================
// 탭: 인증·공정
// =====================================================
function CertTab({ certs, processes }: any) {
  return (
    <div className="space-y-5">
      <Section title={`인증서 (${certs.length}건)`} subtitle="ISO · IRMA · IATF 등 — 만료 추적 대상">
        <div className="space-y-1.5">
          {certs.map((c: any) => {
            const expDate = new Date(c.expiresAt);
            const now = new Date('2026-05-18');
            const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return (
              <div key={c.certId} className={clsx(
                'rounded-xs border p-2.5 flex items-center gap-3',
                c.status === 'expired'        ? 'border-red-700/40 bg-red-500/5'      :
                c.status === 'expiring_soon'  ? 'border-amber-700/40 bg-amber-500/5'  :
                                                 'border-ink-700/60 bg-ink-900/40'
              )}>
                <Award className={clsx(
                  'w-4 h-4 shrink-0',
                  c.status === 'expired'       ? 'text-red-700' :
                  c.status === 'expiring_soon' ? 'text-amber-700' : 'text-emerald-700'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-100">{c.certName}</span>
                    <span className="text-[10px] text-ink-500 num-mono">{c.certNumber}</span>
                  </div>
                  <div className="text-[10px] text-ink-400 mt-0.5">
                    발급 <span className="num-mono">{c.issuingBody}</span> ·
                    <span className="num-mono ml-1">{c.issuedAt} ~ {c.expiresAt}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {c.status === 'expired' ? (
                    <Badge tone="alert" size="sm">만료됨</Badge>
                  ) : c.status === 'expiring_soon' ? (
                    <Badge tone="warn" size="sm">{daysLeft}일 남음</Badge>
                  ) : (
                    <Badge tone="ok" size="sm">유효</Badge>
                  )}
                </div>
              </div>
            );
          })}
          {certs.length === 0 && (
            <div className="text-xs text-ink-500 py-4 text-center rounded-xs bg-ink-900/30 border border-ink-700/40">
              등록된 인증서가 없습니다
            </div>
          )}
        </div>
      </Section>

      <Section
        title={`제조공정도 (${processes.length}단계)`}
        subtitle="공급 부품의 생산 공정 — 외주 표시"
      >
        <div className="space-y-1.5">
          {processes.map((p: any) => (
            <div key={p.id} className="flex items-start gap-3 p-2.5 rounded-xs border border-ink-700/60 bg-ink-900/40">
              <div className="w-6 h-6 rounded-xs bg-accent-700/30 flex items-center justify-center shrink-0">
                <span className="text-[11px] num-mono text-accent-300 font-semibold">{p.sequenceNo}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-ink-100">{p.processName}</span>
                  {p.isOutsourced && <Badge tone="warn" size="sm">외주</Badge>}
                  {!p.hasDiagram && <Badge tone="alert" size="sm">도식 누락</Badge>}
                </div>
                <div className="text-[11px] text-ink-300 mt-0.5 leading-relaxed">
                  {p.processDescription}
                </div>
                {p.isOutsourced && p.outsourcedToSupplierId && (
                  <div className="text-[10px] text-ink-500 mt-1 flex items-center gap-1 num-mono">
                    <ExternalLink className="w-2.5 h-2.5" />
                    외주처: {p.outsourcedToSupplierId}
                  </div>
                )}
              </div>
            </div>
          ))}
          {processes.length === 0 && (
            <div className="text-xs text-ink-500 py-4 text-center rounded-xs bg-ink-900/30 border border-ink-700/40">
              등록된 제조공정도가 없습니다
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

// =====================================================
// 탭: 데이터 완성도 + 리마인드
// =====================================================
function CompletenessTab({ completeness, reminds, contacts }: any) {
  return (
    <div className="space-y-5">
      <Section title="데이터 완성도" subtitle="필수 항목 충족률">
        {completeness ? (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs text-ink-400">전체 충족률</span>
              <span className={clsx(
                'text-2xl font-semibold num-mono',
                completeness.completionRate >= 90 ? 'text-emerald-700' :
                completeness.completionRate >= 70 ? 'text-amber-700' : 'text-red-700'
              )}>
                {completeness.completionRate}%
              </span>
            </div>
            <div className="h-2 bg-ink-700 rounded-xs overflow-hidden mb-2">
              <div
                className={clsx(
                  'h-full transition-all',
                  completeness.completionRate >= 90 ? 'bg-emerald-700' :
                  completeness.completionRate >= 70 ? 'bg-amber-700' : 'bg-red-700'
                )}
                style={{ width: `${completeness.completionRate}%` }}
              />
            </div>
            <div className="text-[11px] text-ink-400 num-mono mb-3">
              {completeness.filledFieldCount} / {completeness.requiredFieldCount} 필드 ·
              <span className="ml-1">마지막 갱신 {completeness.lastUpdatedAt}</span>
            </div>
            {completeness.missingFields.length > 0 && (
              <div className="rounded-xs border border-amber-700/30 bg-amber-500/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-amber-700 mb-1.5 font-semibold">
                  누락 항목 ({completeness.missingFields.length}개)
                </div>
                <ul className="space-y-1">
                  {completeness.missingFields.map((f: string, i: number) => (
                    <li key={i} className="text-[11px] text-ink-200 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 text-amber-700 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-ink-500">완성도 데이터가 없습니다</div>
        )}
      </Section>

      <Section
        title={`데이터 요청·리마인드 이력 (${reminds.length}건)`}
        subtitle="SLA 2주 기준 자동 발송"
      >
        {reminds.length === 0 ? (
          <div className="text-xs text-ink-500 py-4 text-center rounded-xs bg-ink-900/30 border border-ink-700/40">
            요청 이력이 없습니다
          </div>
        ) : (
          <div className="space-y-1.5">
            {reminds.map((r: any) => {
              const contact = contacts.find((c: any) => c.contactId === r.contactId);
              const typeMap: Record<string, { tone: any; label: string }> = {
                initial:  { tone: 'info',    label: '최초 요청' },
                remind_1: { tone: 'warn',    label: '1차 리마인드' },
                remind_2: { tone: 'warn',    label: '2차 리마인드' },
                final:    { tone: 'alert',   label: '최종 통보' },
                response: { tone: 'ok',      label: '응답 수신' },
              };
              const statusMap: Record<string, { color: string; label: string }> = {
                sent:        { color: 'text-ink-300',     label: '발송됨' },
                opened:      { color: 'text-blue-700',    label: '열람됨' },
                in_progress: { color: 'text-amber-700',   label: '응답 중' },
                completed:   { color: 'text-emerald-700', label: '완료' },
                overdue:     { color: 'text-red-700',     label: '기한 초과' },
              };
              const t = typeMap[r.requestType];
              const s = statusMap[r.status];
              return (
                <div key={r.logId} className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Badge tone={t.tone} size="sm">{t.label}</Badge>
                      <span className={clsx('text-[11px] font-medium', s.color)}>{s.label}</span>
                    </div>
                    <span className="text-[10px] text-ink-500 num-mono">{r.sentAt}</span>
                  </div>
                  <div className="text-[11px] text-ink-200 mb-0.5">{r.requestedField}</div>
                  <div className="text-[10px] text-ink-500 flex items-center gap-2 num-mono">
                    <span>→ {contact?.name || r.contactId} ({contact?.role || '—'})</span>
                    <span>·</span>
                    <span>마감 {r.dueDate}</span>
                    {r.responseAt && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-700">응답 {r.responseAt}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// =====================================================
// 공통 컴포넌트
// =====================================================
function Section({ title, subtitle, icon: Icon, children }: any) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-accent-500" />}
        <h3 className="text-xs font-semibold text-ink-100 uppercase tracking-wider">{title}</h3>
        {subtitle && <span className="text-[10px] text-ink-500">— {subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function KVItem({ label, value, mono, link }: any) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-0.5">{label}</div>
      {link ? (
        <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer"
           className="text-xs text-accent-400 hover:text-accent-300 truncate block num-mono flex items-center gap-1">
          {value} <ExternalLink className="w-2.5 h-2.5" />
        </a>
      ) : (
        <div className={clsx('text-xs text-ink-100 truncate', mono && 'num-mono')}>{value}</div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, badge, alert }: any) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
        active
          ? 'text-ink-50 border-accent-500'
          : 'text-ink-400 border-transparent hover:text-ink-200 hover:border-ink-600'
      )}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.2 : 1.8} />
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-[10px] num-mono px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-200">{badge}</span>
      )}
      {alert && <AlertCircle className="w-3 h-3 text-amber-700" />}
    </button>
  );
}

function StatusBadge({ status }: { status: any }) {
  const map: any = {
    verified:  { tone: 'ok',    label: '검증 완료' },
    pending:   { tone: 'info',  label: '검토 대기' },
    review:    { tone: 'warn',  label: '추가 확인' },
    violation: { tone: 'alert', label: '규제 위반' },
  };
  const m = map[status] || map.pending;
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}
