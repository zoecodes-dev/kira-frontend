'use client';

// AI 파싱 확인 (/partner/ai-parsing) — AI 파싱 뷰 + 원산지 geo audit 뷰를 탭으로 분리해 나란히 띄운다.
// 협력사는 두 탭(AI 파싱 결과 / 원산지 geo audit 검증)을 확인한 뒤 AI 파싱 탭에서 최종 제출한다.
// (process.md L22-23·38·42 — 표준 데이터 입력 → geo audit·AI 파싱 확인 후 제출)
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScanLine, Globe2 } from 'lucide-react';
import AiParsingView from '@/components/supplier/AiParsingView';
import GeoAuditView from '@/components/supplier/GeoAuditView';
import { addDemoNotification } from '@/lib/demo-notifications';
import { usePartnerWorkspace } from './PartnerWorkspaceContext';

type ParsingTab = 'ai' | 'geo';

export default function PartnerAiParsing() {
  const router = useRouter();
  const { supplierId, name } = usePartnerWorkspace();
  const myLabel = name?.nameKo ?? name?.nameEn ?? '협력사';
  const [tab, setTab] = useState<ParsingTab>('ai');

  const tabs: { id: ParsingTab; label: string; sub: string; icon: React.ElementType }[] = [
    { id: 'ai',  label: 'AI 파싱 확인',   sub: '추출 결과 검토·수정',   icon: ScanLine },
    { id: 'geo', label: '원산지 geo audit', sub: '좌표·위성 대조 검증', icon: Globe2 },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-ink-800">
      {/* 탭 바 — AI 파싱 / geo audit 분리 */}
      <div className="flex shrink-0 items-end gap-0.5 border-b border-ink-700 bg-white px-4 pt-2">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-t-xs border-x border-t px-4 py-2.5 text-[11px] font-semibold transition-colors ${
                active
                  ? 'border-ink-700 bg-ink-800 text-accent-700'
                  : 'border-transparent bg-white text-ink-500 hover:text-ink-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="flex flex-col items-start leading-tight">
                <span>{t.label}</span>
                <span className="text-[9px] font-medium text-ink-500">{t.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* 탭 내용 — 상태 유지를 위해 둘 다 마운트하고 비활성 탭만 숨긴다. */}
      <div className="min-h-0 flex-1">
        <div className={tab === 'ai' ? 'h-full' : 'hidden'}>
          <AiParsingView
            supplierId={supplierId}
            onConfirmComplete={() => {
              // [process.md L23·53] AI 파싱 + geo audit 확인 후 최종 제출 →
              // 원청 탭에 "공급망 최종 검증 가능" 알림 전파.
              addDemoNotification({
                audience: 'prime',
                notification_type: 'approval_needed',
                subject: '공급망 자료 입력 완료 · 최종 검증 요청',
                body: `${myLabel}가 AI 파싱 결과와 원산지(geo audit) 검증을 확인하고 자료를 최종 제출했습니다. 공급망 맵에서 최종 검증을 진행할 수 있습니다.`,
                deep_link: 'supply-chain-map',
                actor: myLabel,
              });
              router.push('/partner');
            }}
          />
        </div>
        <div className={tab === 'geo' ? 'h-full' : 'hidden'}>
          <GeoAuditView supplierId={supplierId} />
        </div>
      </div>
    </div>
  );
}
