// 자료 요청 발송 기록 — 백엔드 미연동 구간의 클라이언트 저장소(localStorage).
// 입력 현황/상세에서 '요청 발송'하면 여기에 기록되고, My Task 자료 요청 탭이 이를 읽어 목록에 반영한다.
// (실제 API 연동 시 이 모듈을 요청 생성 API 호출로 교체)

export type DataRequestStatus = 'overdue' | 'submitted' | 'dueSoon' | 'progress';

export interface DataRequestRecord {
  supplier: string;
  supplierId: string;
  title: string;
  status: DataRequestStatus;
  due: string;
  missing: number;
  createdAt: string;
}

const KEY = 'kira_data_requests';

export function getStoredRequests(): DataRequestRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DataRequestRecord[]) : [];
  } catch {
    return [];
  }
}

export function addStoredRequest(rec: DataRequestRecord): void {
  if (typeof window === 'undefined') return;
  // 같은 협력사는 최신 1건만 유지(재요청 시 갱신).
  const next = [rec, ...getStoredRequests().filter(r => r.supplierId !== rec.supplierId)];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 저장 실패는 무시(quota 등) */
  }
}
