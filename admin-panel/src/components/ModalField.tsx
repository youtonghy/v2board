import type { ReactNode } from "react";

export function ModalField({
  label,
  description,
  children,
  className,
  required = false
}: {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={["w-full space-y-2", className].filter(Boolean).join(" ")}>
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-700">
          {label}
          {required ? <span className="ml-1 text-danger">*</span> : null}
        </p>
        {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
