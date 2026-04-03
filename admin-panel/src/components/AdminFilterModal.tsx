import type { ReactNode } from "react";
import { useState } from "react";
import { Button, Form, Modal, Tooltip } from "@heroui/react";

export function AdminFilterModal({
  title = "Filters",
  description = "Refine the current dataset quickly.",
  triggerLabel = "Filters",
  searchLabel = "Search",
  resetLabel = "Reset filters",
  children,
  onSearch,
  onReset,
  isBusy = false,
  isDisabled = false,
  size = "lg"
}: {
  title?: string;
  description?: ReactNode;
  triggerLabel?: string;
  searchLabel?: string;
  resetLabel?: string;
  children: ReactNode;
  onSearch: () => void;
  onReset: () => void;
  isBusy?: boolean;
  isDisabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "cover" | "full";
}) {
  const busy = isBusy || isDisabled;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Modal isOpen={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <Tooltip.Trigger>
          <Button className="whitespace-nowrap" variant="secondary" onPress={() => setIsOpen(true)}>
            {triggerLabel}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>{triggerLabel}<Tooltip.Arrow /></Tooltip.Content>
      </Tooltip>
      <Modal.Backdrop variant="blur" className="bg-slate-950/30 backdrop-blur-sm" isDismissable={!busy}>
        <Modal.Container size={size}>
          <Modal.Dialog className="flex w-full flex-col border border-white/70 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl">
            <Modal.CloseTrigger className="top-5 right-5 rounded-full border border-slate-200/80 bg-white/80 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900" />
            <Modal.Header className="shrink-0 border-b border-slate-100 px-6 py-5">
              <div className="pr-10">
                <Modal.Heading className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                  {title}
                </Modal.Heading>
                {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
              </div>
            </Modal.Header>
            <Form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={event => {
                event.preventDefault();
                if (busy) return;
                onSearch();
                setIsOpen(false);
              }}
            >
              <Modal.Body className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
                {children}
              </Modal.Body>
              <Modal.Footer className="shrink-0 flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4">
                <Tooltip>
                  <Tooltip.Trigger>
                    <Button
                      variant="ghost"
                      isDisabled={busy}
                      onPress={() => {
                        if (busy) return;
                        onReset();
                        setIsOpen(false);
                      }}
                      type="button"
                    >
                      {resetLabel}
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{resetLabel}<Tooltip.Arrow /></Tooltip.Content>
                </Tooltip>
                <Tooltip>
                  <Tooltip.Trigger>
                    <Button variant="primary" isDisabled={busy} type="submit">
                      {searchLabel}
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{searchLabel}<Tooltip.Arrow /></Tooltip.Content>
                </Tooltip>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}