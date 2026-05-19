'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity, Network, ListChecks, FileBadge, ShieldCheck,
  UserCheck, Upload, GitBranch, Building2, Box, Map,
  AlertTriangle, Package, ChevronDown, ChevronRight,
  Layers, Send, BarChart3, Users,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const icons: Record<string, any> = {
  activity:       Activity,
  network:        Network,
  'list-checks':  ListChecks,
  'file-badge':   FileBadge,
  'shield-check': ShieldCheck,
  'user-check':   UserCheck,
  upload:         Upload,
  'git-branch':   GitBranch,
  building2:      Building2,
  box:            Box,
  map:            Map,
  'alert-triangle': AlertTriangle,
  package:        Package,
  layers:         Layers,
  send:           Send,
  'bar-chart':    BarChart3,
  users:          Users,
};

interface SubItem {
  href: string;
  label: string;
}

interface NavLinkProps {
  href: string;
  iconName: keyof typeof icons;
  label: string;
  subtitle: string;
  subItems?: SubItem[];   // 하위 메뉴
}

export default function NavLink({ href, iconName, label, subtitle, subItems }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
  const Icon = icons[iconName] ?? Activity;

  // 하위 메뉴가 있으면 자동 열림 (현재 경로가 해당 섹션인 경우)
  const [open, setOpen] = useState(isActive);

  return (
    <div>
      {/* 메인 링크 */}
      <div className="flex items-center">
        <Link
          href={href}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors group flex-1 min-w-0',
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
          {isActive && !subItems && <div className="w-1 h-1 rounded-full bg-accent-500 shrink-0" />}
        </Link>

        {/* 하위 메뉴 토글 버튼 */}
        {subItems && (
          <button
            onClick={() => setOpen(o => !o)}
            className="p-2 text-ink-500 hover:text-ink-300 transition-colors shrink-0"
          >
            {open
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5" />
            }
          </button>
        )}
      </div>

      {/* 하위 메뉴 */}
      {subItems && open && (
        <div className="ml-11 mt-0.5 space-y-0.5 border-l border-ink-700/60 pl-3">
          {subItems.map(sub => {
            const subActive = pathname === sub.href || pathname.startsWith(sub.href + '/');
            return (
              <Link
                key={sub.href}
                href={sub.href}
                className={clsx(
                  'block px-2 py-1.5 rounded-xs text-[12px] transition-colors',
                  subActive
                    ? 'text-accent-400 bg-accent-500/8 font-medium'
                    : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800/50'
                )}
              >
                {sub.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
