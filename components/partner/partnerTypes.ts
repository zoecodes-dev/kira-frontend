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
