'use client';

// AI 파싱 확인 (/partner/ai-parsing) — app/supplier/page.tsx의 activeView==='ai-parsing' 분기를 이관.
import { useRouter } from 'next/navigation';
import AiParsingView from '@/components/supplier/AiParsingView';
import { usePartnerWorkspace } from './PartnerWorkspaceContext';

export default function PartnerAiParsing() {
  const router = useRouter();
  const { supplierId } = usePartnerWorkspace();
  return (
    <AiParsingView
      supplierId={supplierId}
      onConfirmComplete={() => router.push('/partner')}
    />
  );
}
