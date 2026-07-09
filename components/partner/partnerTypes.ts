// 협력사 업무공간(/partner) 전역에서 쓰는 목 데이터 형태 타입 — app/supplier/page.tsx에서 그대로 이관.
export interface MockSupplier {
  id: string; name?: string; region?: string; country?: string;
  status?: string; role?: string;
}

export interface MockContact {
  contactId: string; name: string; role?: string; jobTitle?: string;
  department?: string; email?: string; phone?: string; isPrimary?: boolean;
}

export interface MockFactory {
  factoryId: string;
  factoryName: string;
  factoryNameEn?: string;
  destination?: string;
  address?: string;
  establishedAt?: string;
  capacity?: string;
  destinationDetail?: string;
  applicableRegulations?: string[];
  factoryRole?: string;
  region?: string;
  operatingPeriodFrom?: string;
  operatingPeriodTo?: string;
  monthlyCapacity?: string;
}

// 8단계 제출 트래커(구 EightStageStepper.tsx)에서 이관된 타입.
export type StageStatus =
  | 'done'       // 완료 (초록)
  | 'active'     // 현재 진행 중 (accent 깜빡 펄스)
  | 'rejected'   // 보완 요청 / 반려 (빨강)
  | 'pending';   // 대기 (회색)

export interface Stage {
  no: number;
  label: string;
  sublabel: string;           // 단계 설명 (툴팁용)
  status: StageStatus;
  completedAt?: string;       // 완료 일시
}

export interface Submission {
  id: string;
  documentName: string;       // 서류명
  submittedAt: string;        // 최초 제출일
  stages: Stage[];
  /** 반려된 경우 해당 단계 번호 (1-based) */
  rejectedStageNo?: number;
  rejectionReason?: string;   // 반려 사유
  onResubmit?: () => void;    // [재제출 하기] 클릭 콜백
}
