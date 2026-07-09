'use client';

// 원산지 geo audit 확인 뷰 — 협력사가 업로드한 자료의 원산지(좌표·폴리곤·위성 대조) 검증 결과를
// AI 처리과 함께 확인하는 화면. AI 처리 뷰와 탭으로 분리되어 나란히 뜬다(process.md L23·42).
//
// 데모: 협력사 공장 좌표(getFactories)를 바탕으로 원산지 검증 상태를 결정적으로(공장 index 기반) 렌더링한다.

import { Globe2, MapPin, ShieldCheck, CheckCircle2, AlertTriangle, Clock, Satellite } from 'lucide-react';
import Badge from '@/components/Badge';
import { getFactories } from '@/lib/supplier-detail-data';

type AuditState = 'passed' | 'review' | 'pending';

const STATE_META: Record<AuditState, { label: string; tone: 'ok' | 'warn' | 'info'; icon: React.ElementType; barCls: string }> = {
  passed:  { label: '검증 통과', tone: 'ok',   icon: CheckCircle2,  barCls: 'bg-ok-solid' },
  review:  { label: '확인 필요', tone: 'warn', icon: AlertTriangle, barCls: 'bg-warn-solid' },
  pending: { label: '검증 대기', tone: 'info', icon: Clock,         barCls: 'bg-accent-500' },
};

interface FactoryLike {
  factoryId: string;
  factoryName: string;
  factoryNameEn?: string;
  address?: string;
  destination?: string;
  coordinates?: [number, number];
  factoryRole?: string;
}

// 공장 index로 검증 상태를 결정(데모): 첫 공장 통과, 둘째 확인 필요, 이후 대기.
function deriveState(idx: number): AuditState {
  if (idx === 0) return 'passed';
  if (idx === 1) return 'review';
  return 'pending';
}

export default function GeoAuditView({ supplierId }: { supplierId: string }) {
  const factories = (getFactories(supplierId) as unknown as FactoryLike[])
    .filter(f => f.factoryRole !== 'headquarters');

  const audited = factories.map((f, idx) => ({ factory: f, state: deriveState(idx) }));
  const passedCount = audited.filter(a => a.state === 'passed').length;
  const reviewCount = audited.filter(a => a.state === 'review').length;
  const allPassed = factories.length > 0 && reviewCount === 0 && passedCount === factories.length;

  return (
    <div className="h-full w-full overflow-y-auto bg-ink-800">
      {/* 상단 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-accent-50">
            <Globe2 className="h-4 w-4 text-accent-700" />
          </div>
          <div>
            <div className="text-xs font-bold text-ink-100">원산지 geo audit 검증</div>
            <div className="mt-0.5 text-[10px] text-ink-500">
              업로드한 자료의 원산지 좌표를 위성·광권 데이터와 대조한 결과입니다. 확인 후 AI 처리 탭에서 제출하세요.
            </div>
          </div>
        </div>
        <Badge tone={allPassed ? 'ok' : reviewCount > 0 ? 'warn' : 'neutral'}>
          {passedCount} / {factories.length} 검증 통과
        </Badge>
      </div>

      <div className="space-y-6 p-6">
        {/* 요약 카드 2개 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-sm border border-ink-700 bg-white p-4 shadow-control">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-500">검증 통과</span>
              <ShieldCheck className="h-4 w-4 text-ok-solid" />
            </div>
            <div className="mt-2 num-mono text-2xl font-bold text-ink-100">{passedCount}<span className="text-sm text-ink-400"> 개소</span></div>
            <div className="mt-1 text-[10px] text-ink-500">위성·광권 좌표 일치</div>
          </div>
          <div className="rounded-sm border border-ink-700 bg-white p-4 shadow-control">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-500">확인 필요</span>
              <AlertTriangle className={`h-4 w-4 ${reviewCount > 0 ? 'text-warn-text' : 'text-ink-500'}`} />
            </div>
            <div className={`mt-2 num-mono text-2xl font-bold ${reviewCount > 0 ? 'text-warn-text' : 'text-ink-100'}`}>{reviewCount}<span className="text-sm text-ink-400"> 개소</span></div>
            <div className="mt-1 text-[10px] text-ink-500">좌표 오차 · 폴리곤 미제출</div>
          </div>
        </div>

        {/* 사업장별 원산지 검증 */}
        <div className="rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="border-b border-ink-700 px-5 py-4">
            <div className="text-sm font-bold text-ink-100">사업장별 원산지 좌표 검증</div>
            <div className="mt-0.5 text-[10px] text-ink-500">공장 좌표를 위성 이미지·광권 폴리곤과 대조합니다</div>
          </div>
          <div className="divide-y divide-ink-800">
            {audited.length === 0 && (
              <div className="px-5 py-10 text-center text-xs text-ink-500">등록된 사업장 좌표가 없습니다.</div>
            )}
            {audited.map(({ factory, state }) => {
              const meta = STATE_META[state];
              const Icon = meta.icon;
              const coord = factory.coordinates;
              return (
                <div key={factory.factoryId} className="relative flex gap-4 px-5 py-4">
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.barCls}`} />
                  <div className={`shrink-0 mt-0.5 ${state === 'passed' ? 'text-ok-solid' : state === 'review' ? 'text-warn-text' : 'text-accent-600'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-100">{factory.factoryName}</span>
                      {factory.destination && (
                        <Badge tone={factory.destination === 'US' ? 'warn' : factory.destination === 'EU' ? 'ok' : 'info'}>
                          {factory.destination === 'BOTH' ? 'EU + US' : factory.destination}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-500">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{factory.address ?? '주소 미등록'}</span>
                      {coord && (
                        <span className="flex items-center gap-1 num-mono"><Satellite className="h-3 w-3" />{coord[1].toFixed(4)}, {coord[0].toFixed(4)}</span>
                      )}
                    </div>
                    {/* 검증 세부 */}
                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      <CheckItem label="위성 이미지 대조" ok={state === 'passed'} pending={state === 'pending'} />
                      <CheckItem label="광권 폴리곤 일치" ok={state === 'passed'} pending={state !== 'passed'} />
                      <CheckItem label="EUDR 좌표 등록" ok={state !== 'pending'} pending={state === 'pending'} />
                    </div>
                  </div>
                  <div className="shrink-0 self-center">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ label, ok, pending }: { label: string; ok: boolean; pending?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-xs border px-2 py-1.5 text-[10px] font-semibold ${
      ok ? 'border-ok-border bg-ok-bg text-ok-text'
        : pending ? 'border-ink-700 bg-ink-800 text-ink-500'
        : 'border-warn-border bg-warn-bg text-warn-text'
    }`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : pending ? <Clock className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      <span className="truncate">{label}</span>
    </div>
  );
}
