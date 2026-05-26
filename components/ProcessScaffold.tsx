import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { CheckCircle2, CircleDot, Clock3 } from 'lucide-react';

interface ProcessScaffoldProps {
  title: string;
  description: string;
  badge: string;
  process: string;
  purpose: string;
  primaryData: string[];
  workflow: string[];
  nextBuild: string[];
}

export default function ProcessScaffold({
  title,
  description,
  badge,
  process,
  purpose,
  primaryData,
  workflow,
  nextBuild,
}: ProcessScaffoldProps) {
  return (
    <>
      <PageHeader title={title} description={description} badge={badge} />
      <div className="p-8 space-y-6">
        <Card title="프로세스 위치" subtitle="이 화면이 전체 업무 흐름에서 맡는 역할">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">
            <div className="rounded-xs border border-accent-700/30 bg-accent-500/5 p-4">
              <div className="text-[10px] uppercase tracking-wider text-accent-500 font-semibold mb-2">
                Process
              </div>
              <div className="text-lg font-semibold text-ink-100">{process}</div>
              <p className="text-sm text-ink-400 mt-2 leading-6">{purpose}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {primaryData.map(item => (
                <div key={item} className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-3">
                  <div className="flex items-center gap-2 text-xs text-ink-200">
                    <CircleDot className="w-3.5 h-3.5 text-accent-500" />
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card title="업무 흐름" subtitle="요청에서 반영까지 이어지는 단계">
            <div className="space-y-3">
              {workflow.map((step, index) => (
                <div key={step} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full border border-ink-700 bg-ink-900 flex items-center justify-center text-[11px] num-mono text-accent-500 shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 border-b border-ink-700/40 pb-3 last:border-b-0">
                    <div className="text-sm text-ink-100">{step}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="다음 구현 단위" subtitle="placeholder 이후 실제 화면에서 채울 기능">
            <div className="space-y-3">
              {nextBuild.map(item => (
                <div key={item} className="flex items-start gap-2 rounded-xs border border-ink-700/50 bg-ink-900/30 p-3">
                  <Clock3 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-ink-300 leading-5">{item}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card title="화면 설계 원칙" subtitle="KIRA_final_spec.md 기준">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              '결과 조회와 관리 작업을 분리한다',
              '업로드 화면과 원청사 검토 화면을 모두 둔다',
              '승인된 결과만 공급망·DPP·대시보드에 반영한다',
            ].map(item => (
              <div key={item} className="flex items-start gap-2 rounded-xs border border-emerald-700/30 bg-emerald-500/5 p-3">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs text-ink-300 leading-5">{item}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
