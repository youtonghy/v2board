import type { ReactNode } from "react";

export function ModalField({
  label,
  description,
  children,
  className
}: {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-2 space-y-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        {description ? <p className="text-xs text-muted">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
