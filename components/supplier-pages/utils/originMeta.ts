import { SUPPLIER_NOW } from './supplierNow';

export const certStatusStyle: Record<string, {
  label: string; border: string; text: string; bg: string;
}> = {
  valid:         { label: '유효',     border: 'border-emerald-700/30', text: 'text-emerald-500', bg: 'bg-emerald-500/8' },
  expiring_soon: { label: '만료임박', border: 'border-amber-700/30',   text: 'text-amber-500',   bg: 'bg-amber-500/8' },
  expired:       { label: '만료',     border: 'border-red-700/30',     text: 'text-red-500',     bg: 'bg-red-500/8' },
  under_review:  { label: '검토 중',  border: 'border-blue-700/30',    text: 'text-blue-500',    bg: 'bg-blue-500/8' },
};

export function calcDaysLeft(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - SUPPLIER_NOW.getTime()) / 86400000);
}
