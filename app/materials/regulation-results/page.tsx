'use client';

// 규제 검증 결과 = AI 파싱 결과 → My Task '협력사 승인(HITL)'로 편입됨.
// 이 경로는 호환을 위해 유지하되 My Task HITL 탭으로 리다이렉트한다.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function MaterialRegulationResultsPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/my-task?tab=hitl'); }, [router]);
  return (
    <div className="flex h-[60vh] items-center justify-center gap-2 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm font-semibold">규제 검증 결과는 My Task 협력사 승인(HITL)으로 이동했습니다…</span>
    </div>
  );
}
