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
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
