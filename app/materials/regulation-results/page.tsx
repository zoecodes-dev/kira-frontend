import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import { ArrowRight, FileText, ShieldAlert } from 'lucide-react';

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
  return (
    <>
      <PageHeader title="규제 검증 결과" description="자재와 물질 조성 기준의 규제별 자동 검증 및 원청사 검토 결과" badge="P0" />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric label="전체 판정" value={results.length} tone="neutral" />
          <Metric label="통과" value={results.filter(r => r.verdict === 'passed').length} tone="ok" />
          <Metric label="검토 필요" value={results.filter(r => r.verdict === 'gray_zone').length} tone="warn" />
          <Metric label="위반" value={results.filter(r => r.verdict === 'violation').length} tone="alert" />
        </div>

        <Card title="자재별 규제 판정" subtitle="판정 결과는 DPP Readiness와 리스크 조치 보드로 연결됩니다">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-ink-700">
                  {['ID', '자재', '협력사', '규제', '판정', '신뢰도', '근거/증빙', '이동'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-ink-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(result => (
                  <tr key={result.id} className="border-b border-ink-700/40">
                    <td className="px-3 py-3 text-xs text-ink-400 num-mono">{result.id}</td>
                    <td className="px-3 py-3 text-sm font-semibold text-ink-100">{result.material}</td>
                    <td className="px-3 py-3 text-xs text-ink-400">{result.supplier}</td>
                    <td className="px-3 py-3 text-xs text-ink-300 num-mono">{result.regulation}</td>
                    <td className="px-3 py-3"><Badge tone={tone[result.verdict as keyof typeof tone]}>{result.verdict}</Badge></td>
                    <td className="px-3 py-3 text-xs text-ink-300 num-mono">{Math.round(result.confidence * 100)}%</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 text-xs text-ink-400">
                        <FileText className="w-3.5 h-3.5 text-accent-500" />
                        {result.clause} · {result.evidence}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Link href={result.target} className="inline-flex items-center gap-1 text-xs font-semibold text-accent-500 hover:text-accent-400">
                        관리 화면
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="HITL 전환 기준" subtitle="자동 판단이 불안정한 항목은 사람이 결정합니다">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['confidence 0.85 미만', '증빙 값과 입력값 불일치', 'FEOC/원산지 회색지대'].map(item => (
              <div key={item} className="flex items-center gap-2 rounded-xs border border-amber-700/30 bg-amber-500/5 p-3 text-xs text-ink-300">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'ok' | 'warn' | 'alert' }) {
  const color = { neutral: 'text-ink-200', ok: 'text-emerald-400', warn: 'text-amber-400', alert: 'text-red-400' }[tone];
  return <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-4"><div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div><div className={`text-2xl font-bold num-mono mt-2 ${color}`}>{value}<span className="text-sm text-ink-500 ml-1">건</span></div></div>;
}
