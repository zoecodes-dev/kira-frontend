'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { suppliers } from '@/lib/data';
import {
  getSupplierName, getContacts, getFactories, getCertifications,
  getProcesses, getCompleteness, getRemindLogs, getRiskProfile, supplierExtended,
  getCtiDetails,
} from '@/lib/supplier-detail-data';
import { InfoSummary } from './sections/info/InfoSummary';
import { InfoGeneralSection } from './sections/info/InfoGeneralSection';
import { InfoContactsSection } from './sections/info/InfoContactsSection';
import { InfoFactoriesSection } from './sections/info/InfoFactoriesSection';
import { InfoCertsSection } from './sections/info/InfoCertsSection';
import { InfoCompletenessSection } from './sections/info/InfoCompletenessSection';

export default function SupplierInfoPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams   = useSearchParams();
  const activeInfoTab  = searchParams.get('tab') === 'general' ? 'general' : 'summary';
  const supplier       = suppliers.find(s => s.id === id);
  const name           = getSupplierName(id);
  const ext            = supplierExtended.find(e => e.supplierId === id);
  const contacts       = getContacts(id);
  const factories      = getFactories(id);
  const certs          = getCertifications(id);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const processes      = getProcesses(id);
  const completeness   = getCompleteness(id);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const reminds        = getRemindLogs(id);
  const risk           = getRiskProfile(id);
  const ctiDetails     = getCtiDetails(id);

  if (!supplier) return <div className="p-8 text-xs text-ink-500">협력사를 찾을 수 없습니다</div>;

  const hq         = factories.find(f => f.factoryRole === 'headquarters');
  const production = factories.filter(f => f.factoryRole !== 'headquarters');

  return (
    <div className="w-full space-y-8 p-8">
      {activeInfoTab === 'summary' ? (
        <InfoSummary
          supplier={supplier}
          name={name}
          contacts={contacts}
          factories={factories}
          certs={certs}
          completeness={completeness}
          risk={risk}
        />
      ) : (
        <>
          <InfoGeneralSection supplier={supplier} name={name} ext={ext} ctiDetails={ctiDetails} />
          <InfoContactsSection contacts={contacts} factories={factories} />
          <InfoFactoriesSection factories={factories} hq={hq} production={production} />
          <InfoCertsSection certs={certs} />
          {completeness && <InfoCompletenessSection completeness={completeness} />}
        </>
      )}
    </div>
  );
}
