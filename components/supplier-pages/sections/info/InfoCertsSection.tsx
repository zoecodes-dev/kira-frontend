import clsx from 'clsx';
import { Section } from './InfoSection';
import type { getCertifications } from '@/lib/supplier-detail-data';

type Certs = ReturnType<typeof getCertifications>;

const NOW = new Date('2026-05-19');

export function InfoCertsSection({ certs }: { certs: Certs }) {
  return (
    <Section title="인증서" subtitle={`${certs.length}건`}>
      {certs.length === 0 ? (
        <div className="text-xs text-ink-500 text-center py-6 border border-ink-700/40 border-dashed rounded-xs">
          등록된 인증서가 없습니다
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {certs.map(c => {
            const exp      = new Date(c.expiresAt);
            const daysLeft = Math.ceil((exp.getTime() - NOW.getTime()) / 86400000);
            return (
              <div key={c.certId} className={clsx(
                'flex items-center justify-between px-3 py-2.5 rounded-xs border',
                c.status === 'expired'       ? 'border-alert-border bg-alert-bg' :
                c.status === 'expiring_soon' ? 'border-warn-border bg-warn-bg' :
                                               'border-ink-700/60 bg-ink-900/20',
              )}>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-ink-200 truncate">{c.certName}</div>
                  <div className="text-[10px] text-ink-500 truncate">{c.issuingBody} · {c.certNumber}</div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className={clsx('text-[10px] font-semibold',
                    c.status === 'expired'       ? 'text-alert-text' :
                    c.status === 'expiring_soon' ? 'text-warn-text' : 'text-ok-text',
                  )}>
                    {c.status === 'expired'       ? '만료' :
                     c.status === 'expiring_soon' ? `${daysLeft}일 남음` : '유효'}
                  </div>
                  <div className="text-[9px] text-ink-500 num-mono">{c.expiresAt.slice(0, 10)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
