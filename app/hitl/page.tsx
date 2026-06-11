'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import { 
  CheckCircle2, XCircle, AlertCircle, FileText, MapPin, 
  Layers, TrendingUp, MessageSquare, Clock, ExternalLink,
  Bot, Wrench, ChevronDown, ChevronRight, AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';

// HITL 검토가 필요한 배치들 (목업)
interface ReviewCase {
  id: string;
  batchId: string;
  productName: string;
  supplier: string;
  destination: 'US' | 'EU' | 'KR';
  receivedAt: string;
  triggerReason: string;
  confidence: number;
  agentVerdict: 'violation' | 'gray-zone' | 'low-confidence';
  priority: 'high' | 'medium' | 'low';
}

const reviewQueue: ReviewCase[] = [
  {
    id: 'B-2026051403',
    batchId: 'LOT-PRE-240514-C',
    productName: 'BMW i4 Prismatic NCM 81Ah',
    supplier: 'Quzhou Precursor Co.',
    destination: 'US',
    receivedAt: '2026-05-14 10:18',
    triggerReason: 'Compliance 신뢰도 임계치 미달',
    confidence: 0.74,
    agentVerdict: 'low-confidence',
    priority: 'high',
  },
  {
    id: 'B-2026051402',
    batchId: 'LOT-NCA-240514-B',
    productName: 'BMW i4 Prismatic NCM 81Ah',
    supplier: 'Yantai Cathode Tech',
    destination: 'US',
    receivedAt: '2026-05-14 09:41',
    triggerReason: 'FEOC 지분율 경계값 (22.0%)',
    confidence: 0.81,
    agentVerdict: 'gray-zone',
    priority: 'medium',
  },
  {
    id: 'B-2026051409',
    batchId: 'LOT-COB-240514-I',
    productName: 'Mercedes GLC EV Prismatic NCM 94Ah',
    supplier: 'Ganzhou Rare Metals',
    destination: 'EU',
    receivedAt: '2026-05-14 11:55',
    triggerReason: '재활용 함량 미달 의심',
    confidence: 0.79,
    agentVerdict: 'gray-zone',
    priority: 'medium',
  },
];

export default function HitlPage() {
  const [selectedCase, setSelectedCase] = useState<ReviewCase>(reviewQueue[0]);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [reasonExpanded, setReasonExpanded] = useState(true);
  const [evidenceExpanded, setEvidenceExpanded] = useState(true);

  return (
    <>
      <PageHeader 
        title="HITL 검토"
        description="에이전트 판단 신뢰도 미달 또는 회색지대 사례 · 인간 검토자 승인 필요"
        badge={`${reviewQueue.length}건 대기`}
        actions={
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <div className="w-6 h-6 rounded-full bg-accent-50 border border-accent-100 flex items-center justify-center text-xs font-semibold text-accent-700">김</div>
            <span>김정민 ESG팀장</span>
          </div>
        }
      />

      <div className="bg-[#F3F6F8] p-8">
        <div className="grid h-[calc(100vh-169px)] grid-cols-[20rem_minmax(0,1fr)] gap-6">
        {/* 왼쪽: 검토 대기 큐 */}
        <aside className="min-h-0 overflow-y-auto rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="p-4 border-b border-ink-700 sticky top-0 bg-white/95 backdrop-blur">
            <div className="text-xs font-semibold text-ink-500 mb-1">검토 대기열</div>
            <div className="text-xl font-semibold num-mono text-ink-100">{reviewQueue.length}<span className="text-xs text-ink-500 ml-1">건</span></div>
          </div>
          
          <div className="divide-y divide-ink-700/60">
            {reviewQueue.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedCase(c); setDecision(null); }}
                className={clsx(
                  'w-full text-left p-4 hover:bg-ink-800/40 transition-colors',
                  selectedCase.id === c.id && 'bg-accent-50 border-l-2 border-accent-600'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold num-mono text-ink-500">{c.batchId}</span>
                  <PriorityDot priority={c.priority} />
                </div>
                <div className="text-sm font-semibold text-ink-100 mb-1 truncate">{c.productName}</div>
                <div className="text-xs text-ink-500 mb-2 truncate">{c.supplier}</div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Badge tone="neutral" size="sm">→ {c.destination}</Badge>
                  <VerdictBadge verdict={c.agentVerdict} />
                </div>
                <div className="text-xs text-ink-500 flex items-center justify-between">
                  <span>신뢰도 <span className="num-mono">{c.confidence}</span></span>
                  <span><Clock className="w-2.5 h-2.5 inline mr-1" />{c.receivedAt.slice(11)}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* 가운데/오른쪽: 상세 검토 화면 */}
        <main className="min-h-0 overflow-y-auto rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="h-full p-6 space-y-5">
            
            {/* 케이스 헤더 */}
            <div className="rounded-sm border border-ink-700 bg-white p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold num-mono text-ink-500">{selectedCase.batchId}</span>
                    <Badge tone="neutral">→ {selectedCase.destination}</Badge>
                    <VerdictBadge verdict={selectedCase.agentVerdict} />
                  </div>
                  <h2 className="text-lg font-semibold text-ink-100">{selectedCase.productName}</h2>
                  <p className="mt-1 text-sm text-ink-500">{selectedCase.supplier}</p>
                </div>
                <div className="text-right text-xs text-ink-500">
                  <div>접수 <span className="num-mono">{selectedCase.receivedAt}</span></div>
                  <div className="mt-0.5">대기 시간 {timeElapsed(selectedCase.receivedAt)}</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-ink-700 grid grid-cols-4 gap-4">
                <MetricBox label="에이전트 신뢰도" value={selectedCase.confidence.toFixed(2)} tone={selectedCase.confidence < 0.85 ? 'warn' : 'ok'} />
                <MetricBox label="검토 우선순위" value={priorityLabel(selectedCase.priority)} tone={selectedCase.priority === 'high' ? 'alert' : 'warn'} />
                <MetricBox label="LangGraph 단계" value="HITL 대기" />
                <MetricBox label="MES 상태" value="잠금 보류" tone="warn" />
              </div>
            </div>

            {/* HITL 트리거 사유 */}
            <Card 
              title="검토 요청 사유"
              subtitle="시스템이 자동 판단하지 못한 이유"
              action={
                <button onClick={() => setReasonExpanded(!reasonExpanded)} className="text-ink-500 hover:text-ink-100">
                  {reasonExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              }
            >
              {reasonExpanded && (
                <div className="space-y-3">
                  <div className="rounded-xs border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-ink-100 leading-relaxed">
                      <span className="font-semibold text-amber-800">{selectedCase.triggerReason}</span>
                      <p className="mt-1 text-xs text-ink-500">
                        Compliance 에이전트(Opus)가 UFLPA / IRA / EU Battery 규제별로 추론한 결과, 
                        최종 판정 신뢰도가 시스템 임계치(0.85) 미만입니다. 
                        추가 정보 검토 또는 협력사 재확인이 필요할 수 있습니다.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xs border border-ink-700 bg-white p-3">
                      <div className="text-xs font-semibold text-ink-500 mb-1.5">에이전트 잠정 판정</div>
                      <div className="text-ink-100">위반 가능성 있음 (확신 부족)</div>
                    </div>
                    <div className="rounded-xs border border-ink-700 bg-white p-3">
                      <div className="text-xs font-semibold text-ink-500 mb-1.5">권장 조치</div>
                      <div className="text-ink-100">협력사에 추가 증빙 요청 검토</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* 핵심 증거 */}
            <Card 
              title="핵심 검증 결과"
              subtitle="에이전트와 툴이 수집한 증거"
              action={
                <button onClick={() => setEvidenceExpanded(!evidenceExpanded)} className="text-ink-500 hover:text-ink-100">
                  {evidenceExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              }
            >
              {evidenceExpanded && (
                <div className="space-y-2.5">
                  <EvidenceRow 
                    icon={Bot}
                    nodeType="agent"
                    nodeName="은진 — Data Gateway"
                    finding="PDF 4페이지에서 NCM 전구체 조성 추출 완료"
                    detail="Co 8.2kg · Ni 23.6kg · Mn 4.1kg · 재활용 함량 명시 없음"
                    severity="info"
                  />
                  <EvidenceRow 
                    icon={Wrench}
                    nodeType="tool"
                    nodeName="check_pdf_integrity()"
                    finding="원본 PDF 메타데이터 정상, 수정 이력 없음"
                    detail="작성일 2026-05-13 · 디지털 서명 있음 · MD5 해시 일치"
                    severity="ok"
                  />
                  <EvidenceRow 
                    icon={Wrench}
                    nodeType="tool"
                    nodeName="query_neo4j_supply_path()"
                    finding="3차 광산 좌표 4개 식별 — 그 중 1개가 회색지대"
                    detail="Sulawesi(ID), Katanga(CD), Xinjiang 인근(CN) · 폴리곤 경계 +12km"
                    severity="warn"
                  />
                  <EvidenceRow 
                    icon={Bot}
                    nodeType="agent"
                    nodeName="영수 — Geo Audit"
                    finding="신장 폴리곤에서 12km 떨어진 광산 식별"
                    detail="UFLPA 직접 적용 대상 아니나 회색지대 — 인접 거리 기준 보수적 판단 필요"
                    severity="warn"
                  />
                  <EvidenceRow 
                    icon={Bot}
                    nodeType="agent"
                    nodeName="은지 — Regulatory Analyst"
                    finding="신뢰도 0.74로 임계치 미달, HITL 요청"
                    detail="법령 인용: UFLPA §3(a)(1) · CBP 가이던스 2024 · 회색지대 판례 부족"
                    severity="warn"
                  />
                </div>
              )}
            </Card>

            {/* 첨부 자료 */}
            <Card title="제출 증빙 서류" subtitle="협력사가 업로드한 원본 자료">
              <div className="grid grid-cols-2 gap-2">
                <FileLink name="invoice_240514_PRE.pdf" type="거래 인보이스" pages={4} />
                <FileLink name="origin_certificate_NCM.pdf" type="원산지 증명서" pages={2} />
                <FileLink name="carbon_emission_report.pdf" type="탄소배출 보고서" pages={8} />
                <FileLink name="supplier_declaration.pdf" type="공급자 선언서" pages={1} />
              </div>
            </Card>

            {/* 의사결정 영역 */}
            <Card title="검토 결정" subtitle="판단을 내리고 사유를 기록해 주세요">
              {/* 의사결정 버튼 */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button 
                  onClick={() => setDecision('approve')}
                  className={clsx(
                    'rounded-xs border p-4 transition-all text-left',
                    decision === 'approve' 
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-ink-700 bg-white hover:border-emerald-300'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <CheckCircle2 className={clsx('w-5 h-5', decision === 'approve' ? 'text-emerald-700' : 'text-ink-500')} />
                    <span className={clsx('text-sm font-semibold', decision === 'approve' ? 'text-emerald-800' : 'text-ink-100')}>
                      승인
                    </span>
                  </div>
                  <p className="text-xs text-ink-500">
                    회색지대 검토 결과 적합. DPP 발행 단계로 진행합니다.
                  </p>
                </button>

                <button 
                  onClick={() => setDecision('reject')}
                  className={clsx(
                    'rounded-xs border p-4 transition-all text-left',
                    decision === 'reject' 
                      ? 'border-red-500 bg-red-50'
                      : 'border-ink-700 bg-white hover:border-red-300'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <XCircle className={clsx('w-5 h-5', decision === 'reject' ? 'text-red-700' : 'text-ink-500')} />
                    <span className={clsx('text-sm font-semibold', decision === 'reject' ? 'text-red-800' : 'text-ink-100')}>
                      반려
                    </span>
                  </div>
                  <p className="text-xs text-ink-500">
                    규제 위반 위험 확인. MES 출고 잠금 유지, 협력사 통지 진행.
                  </p>
                </button>
              </div>

              {/* 사유 입력 */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink-500">결정 사유 (감사 기록에 영구 저장)</label>
                <textarea 
                  rows={3}
                  placeholder="이 결정의 근거를 명확히 기록해 주세요. 향후 규제 당국 감사 시 활용됩니다."
                  className="w-full px-3 py-2.5 rounded-xs bg-white border border-ink-700 text-sm text-ink-100 focus:border-accent-500 outline-none resize-none"
                />
              </div>

              {/* 추가 조치 옵션 */}
              <div className="mt-4 pt-4 border-t border-ink-700">
                <div className="text-xs font-semibold text-ink-500 mb-2">추가 조치</div>
                <div className="space-y-2">
                  <CheckOption label="협력사에 추가 증빙 요청 메일 발송" defaultChecked />
                  <CheckOption label="다음 분기 정기 감사 대상에 포함" />
                  <CheckOption label="법무팀에 검토 의견 요청" />
                </div>
              </div>

              {/* 제출 버튼 */}
              <div className="mt-5 flex items-center gap-2">
                <button 
                  disabled={!decision}
                  className={clsx(
                    'flex-1 py-2.5 rounded-xs text-sm font-medium transition-colors',
                    decision === 'approve' && 'bg-emerald-600 hover:bg-emerald-500 text-white',
                    decision === 'reject' && 'bg-red-600 hover:bg-red-500 text-white',
                    !decision && 'bg-ink-700 text-ink-500 cursor-not-allowed'
                  )}
                >
                  {decision === 'approve' && '승인 처리 및 DPP 발행 진행'}
                  {decision === 'reject' && '반려 처리 및 협력사 통지'}
                  {!decision && '결정을 선택해 주세요'}
                </button>
                <button className="px-4 py-2.5 rounded-xs border border-ink-700 bg-white text-xs text-ink-500 hover:bg-ink-800 transition-colors">
                  나중에 결정
                </button>
              </div>
            </Card>
          </div>
        </main>
        </div>
      </div>
    </>
  );
}

// === 우선순위 점 ===
function PriorityDot({ priority }: { priority: string }) {
  const colors: any = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  };
  return <div className={clsx('w-2 h-2 rounded-full', colors[priority])} />;
}

function priorityLabel(p: string) {
  return { high: '높음', medium: '중간', low: '낮음' }[p] || p;
}

// === 판정 배지 ===
function VerdictBadge({ verdict }: { verdict: string }) {
  const config: any = {
    'violation': { tone: 'alert', label: '위반' },
    'gray-zone': { tone: 'warn', label: '회색지대' },
    'low-confidence': { tone: 'warn', label: '신뢰도 미달' },
  };
  const c = config[verdict];
  return <Badge tone={c.tone} size="sm">{c.label}</Badge>;
}

// === 메트릭 박스 ===
function MetricBox({ label, value, tone }: any) {
  const colors: any = {
    ok: 'text-emerald-700',
    warn: 'text-amber-700',
    alert: 'text-red-700',
  };
  return (
    <div>
      <div className="text-xs font-semibold text-ink-500 mb-1">{label}</div>
      <div className={clsx('text-sm font-semibold', colors[tone] || 'text-ink-100')}>
        {value}
      </div>
    </div>
  );
}

// === 증거 행 ===
function EvidenceRow({ icon: Icon, nodeType, nodeName, finding, detail, severity }: any) {
  const sevColors: any = {
    ok:    'border-emerald-200 bg-emerald-50',
    warn:  'border-amber-200 bg-amber-50',
    alert: 'border-red-200 bg-red-50',
    info:  'border-ink-700 bg-white',
  };
  const iconColors: any = {
    agent: 'text-accent-700 bg-accent-50',
    tool: 'text-blue-700 bg-blue-50',
  };

  return (
    <div className={clsx('rounded-xs border p-3', sevColors[severity])}>
      <div className="flex items-start gap-3">
        <div className={clsx('w-7 h-7 rounded-xs flex items-center justify-center shrink-0', iconColors[nodeType])}>
          <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-ink-100">{nodeName}</span>
          </div>
          <div className="text-xs text-ink-100">{finding}</div>
          <div className="text-xs text-ink-500 mt-1">{detail}</div>
        </div>
      </div>
    </div>
  );
}

// === 파일 링크 ===
function FileLink({ name, type, pages }: any) {
  return (
    <button className="flex items-center gap-2.5 p-2.5 rounded-xs border border-ink-700 bg-white hover:border-accent-600 hover:bg-accent-50 transition-colors text-left">
      <FileText className="w-4 h-4 text-ink-400 shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-ink-100 truncate">{name}</div>
        <div className="text-xs text-ink-500">{type} · {pages}p</div>
      </div>
      <ExternalLink className="w-3 h-3 text-ink-500 shrink-0" />
    </button>
  );
}

// === 체크 옵션 ===
function CheckOption({ label, defaultChecked }: any) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <input 
        type="checkbox" 
        defaultChecked={defaultChecked}
        className="w-3.5 h-3.5 rounded-xs accent-accent-600"
      />
      <span className="text-xs text-ink-500 group-hover:text-ink-100">{label}</span>
    </label>
  );
}

// === 시간 경과 계산 ===
function timeElapsed(timestamp: string): string {
  // 단순 목업 - 실제로는 현재 시간과 차이 계산
  return '4시간 12분';
}
