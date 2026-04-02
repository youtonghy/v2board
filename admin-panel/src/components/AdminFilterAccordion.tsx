import type { ReactNode } from "react";
import { adminFilterAccordionClassName } from "./AdminContent";

export function AdminFilterAccordion({
  title = "Filters",
  description = "Refine the current dataset quickly.",
  children
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={adminFilterAccordionClassName}>
      <div className="px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{description}</p>
      </div>
      <div className="px-5 pb-5 pt-0">{children}</div>
    </section>
  );
}
