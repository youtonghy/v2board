import { Card, CardBody, CardHeader } from "@heroui/react";
import type { ReactNode } from "react";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

interface SectionCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName
}: SectionCardProps) {
  return (
    <Card className={joinClasses("border border-white/70 bg-white/95 shadow-panel", className)}>
      <CardHeader className="flex flex-col gap-4 px-6 pb-3 pt-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">{title}</p>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {action}
      </CardHeader>
      <CardBody className={joinClasses("px-6 pb-6 pt-2", bodyClassName)}>{children}</CardBody>
    </Card>
  );
}

interface StatItem {
  label: string;
  value: string;
  hint?: string;
}

export function StatGrid({ items }: { items: StatItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map(item => (
        <Card key={item.label} className="border border-white/70 bg-white/95 shadow-panel">
          <CardBody className="gap-2 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">{item.value}</p>
            {item.hint ? <p className="text-sm text-slate-500">{item.hint}</p> : null}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function FilterPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.7rem] border border-slate-100 bg-slate-50/80 p-4 md:p-5">
      <div className="grid gap-3 md:grid-cols-4">{children}</div>
    </div>
  );
}
