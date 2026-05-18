'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity, Network, ListChecks, FileBadge, ShieldCheck,
  UserCheck, Upload, GitBranch
} from 'lucide-react';
import clsx from 'clsx';

const icons: Record<string, any> = {
  activity: Activity,
  network: Network,
  'list-checks': ListChecks,
  'file-badge': FileBadge,
  'shield-check': ShieldCheck,
  'user-check': UserCheck,
  upload: Upload,
  'git-branch': GitBranch,
};

interface NavLinkProps {
  href: string;
  iconName: keyof typeof icons;
  label: string;
  subtitle: string;
}

export default function NavLink({ href, iconName, label, subtitle }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
  const Icon = icons[iconName];

  return (
    <Link
      href={href}
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors group',
        isActive
          ? 'bg-accent-700/15 text-ink-50'
          : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'
      )}
    >
      <div className={clsx(
        'w-8 h-8 rounded-sm flex items-center justify-center shrink-0',
        isActive ? 'bg-accent-700 text-white' : 'bg-ink-800 text-ink-300 group-hover:text-ink-100'
      )}>
        <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[10px] text-ink-400 uppercase tracking-wider truncate">{subtitle}</div>
      </div>
      {isActive && <div className="w-1 h-1 rounded-full bg-accent-500" />}
    </Link>
  );
}
