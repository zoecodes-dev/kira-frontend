'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity, Network, ListChecks, FileBadge, ShieldCheck,
  UserCheck, Upload, GitBranch, Building2, Box, Map,
  AlertTriangle, Package, ChevronDown, ChevronRight,
  Layers, Send, BarChart3, Users, ClipboardCheck,
  BookOpen, FileSearch, FileText, ClipboardList, FlaskConical, KanbanSquare,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
  'clipboard-check': ClipboardCheck,
  'book-open':    BookOpen,
  'file-search':  FileSearch,
  'file-text':    FileText,
  'clipboard-list': ClipboardList,
  flask:          FlaskConical,
  kanban:         KanbanSquare,
};

interface SubItem {
  href: string;
  label: string;
  matchPattern?: string;
  exact?: boolean;
  children?: SubItem[];
  disabled?: boolean;
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
  const isSubActive = (sub: SubItem) => {
    if (sub.children?.some(isSubActive)) return true;
    if (sub.matchPattern && new RegExp(sub.matchPattern).test(pathname)) return true;
    if (sub.exact) return pathname === sub.href;
    if (sub.href === '/suppliers') return pathname === '/suppliers';
    return pathname === sub.href || pathname.startsWith(sub.href + '/');
  };
  const hasActiveSubItem = subItems?.some(isSubActive) ?? false;
  const isLinkActive = href === '/' ? pathname === '/' : pathname === href || (!subItems && pathname.startsWith(href + '/'));
  const isActive = subItems ? hasActiveSubItem || isLinkActive : isLinkActive;
  const Icon = icons[iconName] ?? Activity;
  const mainClassName = clsx(
    'flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors group flex-1 min-w-0 text-left',
    isLinkActive
      ? 'bg-white/12 text-white border border-white/15'
      : 'text-white/70 border border-transparent hover:bg-white/10 hover:text-white'
  );

  const mainContent = (
    <>
      <div className={clsx(
        'w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border',
        isLinkActive ? 'bg-white border-white text-brand' : 'bg-white/10 border-white/15 text-white/70 group-hover:text-white'
      )}>
        <Icon className="w-4 h-4" strokeWidth={isLinkActive ? 2.5 : 2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="text-[10px] text-white/40 truncate">{subtitle}</div>
      </div>
      {isLinkActive && !subItems && <div className="w-1 h-1 rounded-full bg-white shrink-0" />}
    </>
  );

  // 하위 메뉴가 있으면 자동 열림 (현재 경로가 해당 섹션인 경우)
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <div>
      {/* 메인 링크 */}
      <div className="flex items-center">
        {subItems ? (
          <Link
            href={href}
            onClick={() => setOpen(true)}
            className={mainClassName}
          >
            {mainContent}
          </Link>
        ) : (
          <Link href={href} className={mainClassName}>
            {mainContent}
          </Link>
        )}

        {/* 하위 메뉴 토글 버튼 */}
        {subItems && (
          <button
            onClick={() => setOpen(o => !o)}
            className="p-2 text-white/50 hover:text-white transition-colors shrink-0"
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
        <div className="ml-11 mt-1 space-y-0.5 border-l border-white/15 pl-3">
          {subItems.map(sub => {
            const subActive = isSubActive(sub);
            return (
              <div key={sub.href}>
                <Link
                  href={sub.href}
                  className={clsx(
                    'block px-2 py-1.5 rounded-xs text-[12px] transition-colors',
                    subActive
                      ? 'text-white bg-white/12 font-semibold'
                      : 'text-white/55 hover:text-white hover:bg-white/10'
                  )}
                >
                  {sub.label}
                </Link>
                {sub.children && subActive && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/15 pl-2">
                    {sub.children.map(child => {
                      const childActive = isSubActive(child);
                      const childClassName = clsx(
                        'block rounded-xs px-2 py-1.5 text-[12px] transition-colors',
                        childActive
                          ? 'bg-white/12 text-white font-semibold'
                          : 'text-white/50 hover:bg-white/10 hover:text-white',
                        child.disabled && 'cursor-default hover:bg-transparent hover:text-white/50'
                      );
                      if (child.disabled) {
                        return (
                          <span key={child.href} className={childClassName}>
                            {child.label}
                          </span>
                        );
                      }
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={childClassName}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
