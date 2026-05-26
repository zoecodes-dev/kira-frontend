'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import { BookOpen, Calculator, Database, FileText, Search, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

const tabs = ['규제 사전', 'KPI 사전', '판정 기준', '데이터 원천'] as const;

const regulations = [
  { code: 'EU_BATTERY', name: 'EU Battery Regulation', region: 'EU', summary: '배터리 DPP, 탄소발자국, 재활용 함량, 공급망 실사 의무를 관리합니다.', evidence: ['탄소 보고서', '재활용 함량 증빙', '공급망 실사 보고서'], screens: ['물질 관리', 'DPP Readiness'] },
  { code: 'IRA', name: 'Inflation Reduction Act / FEOC', region: 'US', summary: 'FEOC 지분과 원산지 요건을 기준으로 미국향 제품 적격성을 판단합니다.', evidence: ['지분 구조 공시', '최종 수익자 정보', '원산지 증명'], screens: ['협력사 신뢰성 평가', '제출 자료 검토'] },
  { code: 'UFLPA', name: 'Uyghur Forced Labor Prevention Act', region: 'US', summary: '강제노동 고위험 지역과 공급망 추적 증빙을 확인합니다.', evidence: ['광물 추적 보고서', '공장 좌표', '반증 서류'], screens: ['공급망 맵', '감사 패키지'] },
  { code: 'CONFLICT_MINERALS', name: 'Conflict Minerals', region: 'EU/US', summary: '코발트 등 분쟁광물의 원산지와 실사 증빙을 관리합니다.', evidence: ['Conflict-free 증빙', '원산지 증명서', '실사 보고서'], screens: ['물질 관리', '원산지 증명서'] },
  { code: 'CSDDD', name: 'Corporate Sustainability Due Diligence', region: 'EU', summary: '인권, 환경, 공급망 실사와 개선조치 이행을 관리합니다.', evidence: ['인권 정책', '행동강령', 'CAPA 완료 증빙'], screens: ['공급망 실사 관리', '리스크 조치 보드'] },
];

const kpis = [
  { name: 'DPP Ready', formula: '필수 데이터 충족 + 위반 없음 + blocker 0건', source: 'DPP Readiness', owner: 'ESG' },
  { name: 'HITL Queue', formula: 'confidence < 0.85 또는 gray_zone 케이스 수', source: 'HITL 검토', owner: '검토자' },
  { name: '데이터 완성도', formula: 'filledFieldCount / requiredFieldCount * 100', source: '입력 현황', owner: '데이터 운영' },
  { name: '기한 초과', formula: 'dueDate < today AND status != approved', source: '입력 현황', owner: '구매/ESG' },
];

const verdicts = [
  { name: 'passed', label: '통과', desc: '필수 조건과 증빙이 충족되어 DPP 판단에 사용 가능', tone: 'ok' as const },
  { name: 'warning', label: '주의', desc: '위반은 아니지만 추가 모니터링 또는 갱신 필요', tone: 'warn' as const },
  { name: 'gray_zone', label: '회색지대', desc: '자동 판단이 어려워 HITL 검토 필요', tone: 'info' as const },
  { name: 'violation', label: '위반', desc: '규제 기준 미충족. DPP 발행 blocker로 반영', tone: 'alert' as const },
];

const sources = [
  { type: 'system', label: '시스템 연동', trust: '높음', validation: 'API 서명, 원본 시스템 ID, timestamp 확인' },
  { type: 'manual', label: '협력사 수기', trust: '중간', validation: '필수 증빙, 범위 검증, 원청사 승인 필요' },
  { type: 'ocr', label: 'OCR 추출', trust: '중간-낮음', validation: 'confidence, 원문 위치, 입력값 비교' },
  { type: 'external', label: '외부 DB', trust: '높음', validation: '조회 시점, 버전, 출처 URL 저장' },
  { type: 'human_review', label: '검토자 판단', trust: '높음', validation: '판단 사유, 담당자, 인용 조항 기록' },
];

export default function KnowledgePage() {
  const [tab, setTab] = useState<typeof tabs[number]>('규제 사전');

  return (
    <>
      <PageHeader title="지표·규제 사전" description="규제, 지표, 판정 기준, 데이터 원천을 같은 의미로 이해하게 하는 기준 화면" badge="P1" />
      <div className="p-8 space-y-6">
        <Card title="사전 검색" subtitle="규제 코드, KPI, 데이터 필드, 판정 기준을 검색하는 기준 화면">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-500" />
              <input className="w-full pl-9 pr-4 py-2.5 rounded-xs border border-ink-700 bg-ink-900 text-xs text-ink-100 placeholder-ink-500 focus:outline-none focus:border-accent-500" placeholder="UFLPA, DPP Ready, carbon_intensity, gray_zone..." />
            </div>
            <div className="flex rounded-xs border border-ink-700 overflow-hidden">
              {tabs.map(item => (
                <button key={item} onClick={() => setTab(item)} className={clsx('px-3 py-2 text-xs font-semibold', tab === item ? 'bg-ink-700 text-ink-100' : 'text-ink-500 hover:text-ink-300')}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {tab === '규제 사전' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {regulations.map(reg => (
              <Card key={reg.code} title={reg.code} subtitle={`${reg.name} · ${reg.region}`}>
                <p className="text-sm text-ink-300 leading-6 mb-4">{reg.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MiniList icon={FileText} title="요구 증빙" items={reg.evidence} />
                  <MiniList icon={ShieldCheck} title="관련 화면" items={reg.screens} />
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === 'KPI 사전' && (
          <Card title="KPI 계산식" subtitle="대시보드와 My Task에서 쓰는 지표 정의">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead><tr className="border-b border-ink-700">{['KPI', '계산식', '출처', '담당'].map(h => <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-ink-500">{h}</th>)}</tr></thead>
                <tbody>{kpis.map(kpi => <tr key={kpi.name} className="border-b border-ink-700/40"><td className="px-3 py-3 text-sm font-semibold text-ink-100">{kpi.name}</td><td className="px-3 py-3 text-xs text-ink-300">{kpi.formula}</td><td className="px-3 py-3 text-xs text-ink-400">{kpi.source}</td><td className="px-3 py-3 text-xs text-ink-400">{kpi.owner}</td></tr>)}</tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === '판정 기준' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {verdicts.map(v => <Card key={v.name} title={v.name} action={<Badge tone={v.tone}>{v.label}</Badge>}><p className="text-xs text-ink-400 leading-5">{v.desc}</p></Card>)}
          </div>
        )}

        {tab === '데이터 원천' && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
            {sources.map(src => (
              <Card key={src.type} title={src.label} subtitle={src.type}>
                <div className="space-y-3">
                  <Badge tone={src.trust === '높음' ? 'ok' : src.trust === '중간' ? 'warn' : 'alert'}>신뢰도 {src.trust}</Badge>
                  <p className="text-xs text-ink-400 leading-5">{src.validation}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function MiniList({ icon: Icon, title, items }: { icon: any; title: string; items: string[] }) {
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-100 mb-2"><Icon className="w-3.5 h-3.5 text-accent-500" />{title}</div>
      <div className="space-y-1">{items.map(item => <div key={item} className="text-[11px] text-ink-500">· {item}</div>)}</div>
    </div>
  );
}
