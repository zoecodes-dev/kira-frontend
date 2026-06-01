import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import { ArrowRight, FileText, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

const results = [
  { id: 'REG-001', material: 'NCM811 양극재', supplier: 'POS Cathode Materials', regulation: 'EU_BATTERY', verdict: 'passed', confidence: 0.94, clause: 'Annex XIII', evidence: 'Recycled_content_report.pdf', target: '/materials' },
  { id: 'REG-002', material: 'NCM 전구체', supplier: 'Quzhou Precursor', regulation: 'IRA', verdict: 'gray_zone', confidence: 0.72, clause: 'FEOC ownership', evidence: 'ownership_disclosure.xlsx', target: '/submission-review' },
  { id: 'REG-003', material: '코발트 원광', supplier: 'Katanga Cobalt Mining', regulation: 'CONFLICT_MINERALS', verdict: 'warning', confidence: 0.81, clause: 'Due diligence evidence', evidence: 'Cobalt_origin_certificate_scan.pdf', target: '/due-diligence' },
  { id: 'REG-004', material: '코발트 원광', supplier: 'Ganzhou Rare Metals', regulation: 'IRA', verdict: 'violation', confidence: 0.91, clause: 'FEOC direct ownership 25%', evidence: 'ownership_structure_scan.pdf', target: '/risk/actions' },
  { id: 'REG-005', material: '니켈 원광', supplier: 'Sulawesi Nickel Mine', regulation: 'EUDR', verdict: 'gray_zone', confidence: 0.68, clause: 'Mine boundary coordinates', evidence: 'Mine_boundary_coordinates.geojson', target: '/submission-status' },
];

const tone = {
  passed: 'ok',
  warning: 'warn',
  gray_zone: 'info',
  violation: 'alert',
} as const;

export default function MaterialRegulationResultsPage() {
  const stats = [
    { label: '전체 판정', value: results.length, tone: 'neutral' as const },
    { label: '통과', value: results.filter(r => r.verdict === 'passed').length, tone: 'ok' as const },
    { label: '검토 필요', value: results.filter(r => r.verdict === 'gray_zone').length, tone: 'warn' as const },
    { label: '위반', value: results.filter(r => r.verdict === 'violation').length, tone: 'alert' as const },
  ];

  return (
    <>
      <PageHeader title="규제 검증 결과" description="자재와 물질 조성 기준의 규제별 자동 검증 및 원청사 검토 결과" badge="P0" />
      <div className="p-8 space-y-7">
        <section className="rounded-sm border border-ink-700 bg-white shadow-control px-5 py-4">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h2 className="text-sm font-semibold text-ink-100">자재 규제 판정 큐</h2>
              <p className="text-xs text-ink-500 mt-1">자동 검증 결과를 판정 상태와 후속 관리 화면 기준으로 정렬해 확인합니다</p>
            </div>
            <div className="grid grid-cols-4 gap-7 shrink-0">
              {stats.map(item => (
                <Metric key={item.label} label={item.label} value={item.value} tone={item.tone} />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-sm border border-ink-700 bg-white shadow-panel overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-ink-700 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-ink-100">자재별 규제 판정</h2>
              <p className="text-xs text-ink-500 mt-1">판정 결과는 DPP Readiness와 리스크 조치 보드로 연결됩니다</p>
            </div>
            <Badge tone="info">{results.filter(r => r.confidence < 0.85).length}건 HITL 후보</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-ink-700 bg-ink-800">
                  {['ID', '자재', '협력사', '규제', '판정', '신뢰도', '근거/증빙', '이동'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-ink-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(result => (
                  <tr key={result.id} className="border-b border-ink-700/70 last:border-0 hover:bg-ink-800/60 transition-colors">
                    <td className="px-4 py-4 text-xs text-ink-400 num-mono">{result.id}</td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-ink-100">{result.material}</div>
                      <div className="text-[11px] text-ink-500 mt-1">{result.clause}</div>
                    </td>
                    <td className="px-4 py-4 text-xs text-ink-400">{result.supplier}</td>
                    <td className="px-4 py-4 text-xs text-ink-300 num-mono">{result.regulation}</td>
                    <td className="px-4 py-4"><Badge tone={tone[result.verdict as keyof typeof tone]}>{result.verdict}</Badge></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-ink-800 overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full',
                              result.confidence >= 0.85 ? 'bg-signal-ok' : result.confidence >= 0.75 ? 'bg-signal-warn' : 'bg-signal-alert',
                            )}
                            style={{ width: `${Math.round(result.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-ink-300 num-mono">{Math.round(result.confidence * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-xs text-ink-400 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-accent-700 shrink-0" />
                        <span className="truncate">{result.evidence}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={result.target} className="inline-flex items-center gap-1 text-xs font-semibold text-accent-700 hover:text-accent-600">
                        관리 화면
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-sm border border-amber-200 bg-amber-50/60 px-5 py-4">
          <div className="flex items-start justify-between gap-5">
            <div className="shrink-0">
              <h2 className="text-sm font-semibold text-ink-100">HITL 전환 기준</h2>
              <p className="text-xs text-ink-500 mt-1">자동 판단이 불안정한 항목은 사람이 결정합니다</p>
            </div>
            <div className="grid grid-cols-3 gap-4 flex-1">
            {['confidence 0.85 미만', '증빙 값과 입력값 불일치', 'FEOC/원산지 회색지대'].map(item => (
              <div key={item} className="flex items-center gap-2 text-xs text-ink-300">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                {item}
              </div>
            ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'ok' | 'warn' | 'alert' }) {
  const color = { neutral: 'text-ink-200', ok: 'text-emerald-700', warn: 'text-amber-700', alert: 'text-red-700' }[tone];
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className={`text-xl font-bold num-mono mt-1 ${color}`}>{value}<span className="text-xs text-ink-500 ml-1">건</span></div>
    </div>
  );
}
