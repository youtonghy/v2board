import type { ReactNode } from "react";
import { Drawer } from "@heroui/react";

const drawerWidthClassNames = {
  sm: "w-full sm:max-w-xl",
  md: "w-full sm:max-w-2xl",
  lg: "w-full sm:max-w-4xl",
  xl: "w-full sm:max-w-5xl"
} as const;

export function AdminDrawer({
  isOpen,
  onOpenChange,
  title,
  children,
  footer,
  size = "md",
  isBusy = false
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof drawerWidthClassNames;
  isBusy?: boolean;
}) {
  return (
    <Drawer.Backdrop
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={!isBusy}
      isKeyboardDismissDisabled={isBusy}
      variant="blur"
      className="bg-slate-950/30 backdrop-blur-sm"
    >
      <Drawer.Content placement="right" className={drawerWidthClassNames[size]}>
        <Drawer.Dialog className="h-full border-l border-white/60 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl">
          <Drawer.CloseTrigger className="top-5 right-5 rounded-full border border-slate-200/80 bg-white/80 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900" />
          <Drawer.Header className="border-b border-slate-100 px-6 py-5">
            <Drawer.Heading className="pr-10 text-lg font-semibold tracking-[-0.02em] text-slate-950">
              {title}
            </Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
            {children}
          </Drawer.Body>
          {footer ? (
            <Drawer.Footer className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4">
              {footer}
            </Drawer.Footer>
          ) : null}
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
