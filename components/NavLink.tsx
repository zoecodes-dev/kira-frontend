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
    'flex items-center gap-3 px-3 py-2.5 rounded-none transition-colors group flex-1 min-w-0 text-left',
    isLinkActive
      ? 'bg-white text-[#11352A] font-semibold'
      : 'bg-transparent text-white/88 font-medium hover:bg-white/8'
  );

  const mainContent = (
    <>
      <div className={clsx(
        'w-8 h-8 flex items-center justify-center shrink-0',
        isLinkActive ? 'text-[#11352A]' : 'text-white/70'
      )}>
        <Icon className="w-4 h-4" strokeWidth={isLinkActive ? 2.5 : 2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px]">{label}</div>
        <div className={clsx('text-[10px] truncate', isLinkActive ? 'text-[#11352A]/60' : 'text-white/50')}>{subtitle}</div>
      </div>
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
            className="p-2 text-white/50 hover:text-white/88 transition-colors shrink-0"
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
                    'block px-2 py-1.5 rounded-none text-[12px] transition-colors',
                    subActive
                      ? 'bg-white text-[#11352A] font-semibold'
                      : 'text-white/62 hover:text-white/88 hover:bg-white/8'
                  )}
                >
                  {sub.label}
                </Link>
                {sub.children && subActive && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/15 pl-2">
                    {sub.children.map(child => {
                      const childActive = isSubActive(child);
                      const childClassName = clsx(
                        'block rounded-none px-2 py-1.5 text-[12px] transition-colors',
                        childActive
                          ? 'bg-white text-[#11352A] font-semibold'
                          : 'text-white/62 hover:bg-white/8 hover:text-white/88',
                        child.disabled && 'cursor-default hover:bg-transparent hover:text-white/62'
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
