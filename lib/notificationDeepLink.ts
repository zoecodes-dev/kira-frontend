// 알림 target(맵+협력사 노드 좌표) → 원청 공급망 맵 URL 변환.
//
// 알림 클릭 핸들러가 4곳(벨/피드/토스터/…)에 흩어져 있어, target → URL 조립 규칙을
// 이 헬퍼 하나로 모은다. 산출 URL은 원청 맵 허브(/supply-chain/map)가 읽는 쿼리 계약과 1:1로 맞춘다:
//   productId       → 맵을 여는 제품 (SupplyChainHub가 searchParams로 읽음)
//   bomVersionId    → 단위기간 BOM 버전 (지정 시 그 버전을 고정 선택)
//   focusSupplier   → 맵 안에서 스크롤·하이라이트할 협력사 id
//
// 협력사 자료 제출 알림처럼 "맵 + 그 안의 특정 협력사 노드"로 바로 진입시키는 용도.

import type { NotificationTarget } from './api';

/** 원청 공급망 맵 허브 라우트. PRIME_DEEP_LINK_ROUTE['supply-chain-map']와 동일. */
export const PRIME_MAP_ROUTE = '/supply-chain/map';

/** target을 원청 맵 딥링크 URL로 변환. productId는 필수이므로 없으면 맵 랜딩으로 폴백. */
export function buildMapDeepLink(target: NotificationTarget): string {
  if (!target.productId) return PRIME_MAP_ROUTE;
  const params = new URLSearchParams();
  params.set('productId', target.productId);
  if (target.bomVersionId) params.set('bomVersionId', target.bomVersionId);
  if (target.focusSupplierId) params.set('focusSupplier', target.focusSupplierId);
  return `${PRIME_MAP_ROUTE}?${params.toString()}`;
}
