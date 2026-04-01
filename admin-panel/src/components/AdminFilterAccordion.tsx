import { Accordion } from "@heroui/react";
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
    <Accordion
      variant="surface"
      hideSeparator
      className={adminFilterAccordionClassName}
      defaultExpandedKeys={["filters"]}
    >
      <Accordion.Item id="filters" className="px-0">
        <Accordion.Heading className="px-5 py-4">
          <Accordion.Trigger className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="mt-1 text-xs text-slate-400">{description}</p>
            </div>
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="px-5 pb-5 pt-0">{children}</Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
