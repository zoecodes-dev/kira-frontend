import type { OriginCertificate } from '@/lib/supplier-detail-data';
import { AlertCircle } from 'lucide-react';
import { PendingBadgeBlock } from '../../shared/PendingBadgeBlock';
import { OriginCertCard } from '../../shared/OriginCertCard';
import { certStatusStyle } from '../../utils/originMeta';

interface Props {
  conflictCerts: OriginCertificate[];
}

export function ConflictMineralsSection({ conflictCerts }: Props) {
  return (
    <div className="space-y-3">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">CMRT 제출 상태</div>
        {conflictCerts.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-red-700/30 bg-red-500/8 text-red-500 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            CMRT 미제출
          </div>
        ) : (
          <div className="space-y-2">
            {conflictCerts.map(cert => {
              const s = certStatusStyle[cert.status];
              return (
                <OriginCertCard
                  key={cert.certId}
                  cert={cert}
                  label={s.label}
                  labelColor={s.text}
                />
              );
            })}
          </div>
        )}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">제련소 RMI 인증 상태</div>
        <PendingBadgeBlock label="RMI 데이터베이스 대조 대기" detail="백엔드 연동 예정" />
      </div>
    </div>
  );
}
