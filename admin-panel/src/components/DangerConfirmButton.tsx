import {AlertDialog, Button, Tooltip} from "@heroui/react";
import {useState, type ReactNode} from "react";

type DangerConfirmButtonProps = Omit<React.ComponentPropsWithoutRef<typeof Button>, "variant" | "onPress" | "children"> & {
  children: ReactNode;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  onConfirm: () => void | Promise<void>;
};

export function DangerConfirmButton({
  children,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  ...buttonProps
}: DangerConfirmButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const triggerLabel = typeof buttonProps["aria-label"] === "string" ? buttonProps["aria-label"] : confirmLabel;

  async function handleConfirm() {
    setIsPending(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AlertDialog>
      <Tooltip>
        <Tooltip.Trigger>
          <Button {...buttonProps} variant="danger" onPress={() => setIsOpen(true)}>
            {children}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>{triggerLabel}<Tooltip.Arrow /></Tooltip.Content>
      </Tooltip>
      <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>{description}</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" isDisabled={isPending}>
                {cancelLabel}
              </Button>
              <Button variant="danger" onPress={() => void handleConfirm()} isPending={isPending}>
                {confirmLabel}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}