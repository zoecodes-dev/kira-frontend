interface PageHeaderProps {
  title: string;
  description: string;
  badge?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, description, badge, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-ink-700 px-8 py-6 bg-ink-900/50 backdrop-blur sticky top-0 z-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-xl font-semibold text-ink-50 tracking-tight">{title}</h1>
            {badge && (
              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-xs bg-accent-700/20 text-accent-400 border border-accent-700/30">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-ink-400">{description}</p>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
