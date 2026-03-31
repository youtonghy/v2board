import { Grip } from "@gravity-ui/icons";
import {
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, TableCell, TableRow } from "@heroui/react";
import type { ReactNode } from "react";
import {
  adminSortableHandleButtonClassName,
  adminTableActionCellClassName
} from "./AdminContent";

export const sortableCollisionDetection = closestCenter;

export function useSortableTableSensors() {
  return useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 6
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
}

export function SortableTableRow({
  id,
  children,
  dragLabel,
  isDisabled = false
}: {
  id: string;
  children: ReactNode;
  dragLabel: string;
  isDisabled?: boolean;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    disabled: isDisabled
  });

  const style = {
    transform: CSS.Transform.toString(
      transform
        ? {
            ...transform,
            scaleX: 1,
            scaleY: 1
          }
        : null
    ),
    transition,
    opacity: isDragging ? 0.82 : 1
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? "relative z-10 shadow-lg" : undefined}
    >
      <TableCell>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          aria-label={dragLabel}
          className={adminSortableHandleButtonClassName}
          isDisabled={isDisabled}
          {...attributes}
          {...listeners}
        >
          <Grip width={16} height={16} aria-hidden="true" />
        </Button>
      </TableCell>
      {children}
    </TableRow>
  );
}

export { adminTableActionCellClassName };
