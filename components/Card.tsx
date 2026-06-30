interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ title, subtitle, action, children, className = '' }: CardProps) {
  return (
    <section className={`rounded-sm border border-ink-700 bg-white shadow-control ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-ink-700 bg-ink-800/60">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-semibold text-ink-100 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-ink-500 mt-1 leading-5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
