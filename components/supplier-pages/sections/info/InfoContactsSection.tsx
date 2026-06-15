import { Mail, Phone, Factory, Languages, Smartphone } from 'lucide-react';
import clsx from 'clsx';
import { Section } from './InfoSection';
import type { getContacts, getFactories } from '@/lib/supplier-detail-data';

type Contacts = ReturnType<typeof getContacts>;
type Factories = ReturnType<typeof getFactories>;

export function InfoContactsSection({ contacts, factories }: {
  contacts: Contacts;
  factories: Factories;
}) {
  return (
    <Section title="담당자 연락처" subtitle={`${contacts.length}명 · 공장 담당자 포함`}>
      {contacts.length === 0 ? (
        <div className="text-xs text-ink-500 text-center py-6 border border-ink-700/40 border-dashed rounded-xs">
          등록된 담당자가 없습니다
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contacts.map(c => {
            const f = factories.find(ff => ff.factoryId === c.factoryId);
            return (
              <div key={c.contactId} className={clsx(
                'p-4 rounded-xs border',
                c.isPrimary ? 'border-accent-700/40 bg-accent-500/5' : 'border-ink-700/60 bg-ink-900/20',
              )}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-ink-100">{c.name}</div>
                    <div className="text-xs text-ink-400 mt-0.5">{c.role}
                      {c.department ? <span className="text-ink-500"> · {c.department}</span> : ''}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {c.isPrimary && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-accent-700/20 border border-accent-700/30 text-accent-500">주담당</span>
                    )}
                    {c.language && (
                      <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-400">
                        <Languages className="w-2.5 h-2.5" />
                        {c.language}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-[11px] text-blue-500 hover:text-blue-400">
                    <Mail className="w-3 h-3 shrink-0" />
                    {c.email}
                  </a>
                  <div className="flex items-center gap-2 text-[11px] text-ink-300">
                    <Phone className="w-3 h-3 text-ink-500 shrink-0" />
                    {c.phone}
                  </div>
                  {c.mobile && (
                    <div className="flex items-center gap-2 text-[11px] text-ink-400">
                      <Smartphone className="w-3 h-3 text-ink-500 shrink-0" />
                      {c.mobile}
                      <span className="text-[10px] text-ink-500">모바일</span>
                    </div>
                  )}
                  {f && (
                    <div className="flex items-center gap-2 text-[10px] text-ink-500 pt-1 border-t border-ink-700/40">
                      <Factory className="w-3 h-3 shrink-0" />
                      {f.factoryName}
                      {f.factoryNameEn && f.factoryNameEn !== f.factoryName && (
                        <span className="text-ink-600">/ {f.factoryNameEn}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
