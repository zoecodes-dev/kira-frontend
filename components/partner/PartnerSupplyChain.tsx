'use client';

// 공급망 연결 (/partner/supply-chain) — app/supplier/page.tsx의 activeView==='supply-chain' 분기를 이관.
// 선택된 노드(selectedSupplyNodeId)는 새로고침/공유 링크가 의미 있는 값이라 URL 쿼리(?node=)로 관리한다.
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import SupplyChainMap from '@/components/supplier/SupplyChainMap';
import SubSupplierInviteModal from '@/components/supply-chain/SubSupplierInviteModal';
import { getSupplierName } from '@/lib/supplier-detail-data';
import { addDemoNotification } from '@/lib/demo-notifications';
import { usePartnerWorkspace } from './PartnerWorkspaceContext';
import SupplierInfoPreview from './SupplierInfoPreview';

export default function PartnerSupplyChain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supplierId, supplierUuid, upstream, downstream, name } = usePartnerWorkspace();
  const myLabel = name?.nameKo ?? name?.nameEn ?? '협력사';

  // 이 화면 안에서만 쓰이는 UI 상태 — 하위 협력사 초대 모달
  const [subInviteOpen, setSubInviteOpen] = useState(false);

  const selectedSupplyNodeId = searchParams.get('node');
  function setSelectedSupplyNodeId(id: string | null) {
    router.push(id ? `/partner/supply-chain?node=${id}` : '/partner/supply-chain');
  }

  const allNodes = [...upstream, ...downstream];
  const selectedNodeSupplier = selectedSupplyNodeId
    ? allNodes.find(item => item.supplier.id === selectedSupplyNodeId)?.supplier
    : null;
  const isDownstream = selectedSupplyNodeId
    ? downstream.some(d => d.supplier.id === selectedSupplyNodeId)
    : false;

  return (
    <div className="space-y-6">
      {/* [P3] 하위 협력사 초대 — 회사명+PIC 등록 → 가입요청 메일(SES)·공급망 편입 */}
      <div className="flex items-center justify-between rounded-sm border border-ink-700 bg-white p-4">
        <div>
          <div className="text-xs font-bold text-ink-200">하위 협력사 초대</div>
          <div className="mt-0.5 text-[11px] text-ink-500">우리 회사의 하위 협력사(회사명·담당자)를 등록하면 가입 요청 메일이 발송되고 공급망에 편입됩니다.</div>
        </div>
        <button
          type="button"
          onClick={() => setSubInviteOpen(true)}
          className="shrink-0 rounded-xs bg-accent-600 px-3 py-2 text-xs font-semibold text-white hover:bg-accent-700"
        >
          + 하위 협력사 초대
        </button>
      </div>

      <SupplyChainMap
        supplierId={supplierId}
        upstream={upstream as never}
        downstream={downstream as never}
        onSelectNode={(s: { id: string } | null) => setSelectedSupplyNodeId(s ? s.id : null)}
        selectedId={selectedSupplyNodeId}
      />

      {/* 선택된 노드 상세 정보 */}
      {selectedNodeSupplier && (
        <div>
          <div className="flex items-center gap-2 mb-4 border-t border-ink-700 pt-6">
            <ChevronRight className="h-4 w-4 text-accent-600" />
            <span className="text-xs font-bold text-ink-300">직접 연결 업체 상세 정보</span>
            <span className="text-[10px] text-ink-500">
              — {getSupplierName(selectedNodeSupplier.id)?.nameEn ?? selectedNodeSupplier.name}
            </span>
            <button
              type="button"
              onClick={() => setSelectedSupplyNodeId(null)}
              className="ml-auto text-[10px] text-ink-500 hover:text-ink-200"
            >
              닫기 ✕
            </button>
          </div>
          <SupplierInfoPreview
            supplierId={selectedNodeSupplier.id}
            relation={isDownstream ? 'child' : 'parent'}
            onRequestForm={
              isDownstream
                ? () => {
                    // ③ 퀵액션 고도화: 발송 확인 → 데이터 수집 탭 자동 전환
                    alert('하위 협력사 양식 요청이 접수되었습니다.');
                  }
                : undefined
            }
          />
        </div>
      )}

      {/* [P3] 하위 협력사 초대 — inviter=로그인 협력사 본인. createSupplier로 stub+가입요청 메일+PIC 저장 */}
      {subInviteOpen && (
        <SubSupplierInviteModal
          inviterSupplierId={supplierUuid}
          onClose={() => setSubInviteOpen(false)}
          onInvited={() => {
            setSubInviteOpen(false);
            alert('하위 협력사 가입 요청 메일이 발송되었습니다.');
            // [process.md L19-20] 협력사의 하위 가입 요청 발송 → 원청 탭에 발신 내용 알림.
            addDemoNotification({
              audience: 'prime',
              notification_type: 'info',
              subject: '협력사 하위 초대 발송',
              body: `${myLabel}가 하위 협력사에게 가입 요청 메일을 발송했습니다. 공급망 Pool에 편입 예정입니다.`,
              deep_link: 'supply-chain',
              actor: myLabel,
            });
          }}
        />
      )}
    </div>
  );
}
