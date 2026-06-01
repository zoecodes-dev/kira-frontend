import Link from 'next/link';
import { LogOut } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description: string;
  badge?: string;
  actions?: React.ReactNode;
  sticky?: boolean;
}

export default function PageHeader({ title, description, badge, actions, sticky = true }: PageHeaderProps) {
  return (
    <header className={`border-b border-ink-700 px-8 py-5 bg-white/95 backdrop-blur shadow-control ${sticky ? 'sticky top-0 z-10' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-bold text-ink-100 tracking-tight">{title}</h1>
            {badge && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-xs bg-accent-50 text-accent-700 border border-accent-100">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-ink-500 leading-5">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            로그아웃
          </Link>
        </div>
      </div>
    </header>
  );
}
