'use client';

import { Suspense } from 'react';
import PartnerNotifications from '@/components/partner/PartnerNotifications';

export default function PartnerNotificationsPage() {
  return (
    <Suspense>
      <PartnerNotifications />
    </Suspense>
  );
}
