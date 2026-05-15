interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ title, subtitle, action, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-sm border border-ink-700 bg-ink-800/40 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-700">
          <div>
            {title && <h3 className="text-sm font-semibold text-ink-100 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-[11px] text-ink-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
