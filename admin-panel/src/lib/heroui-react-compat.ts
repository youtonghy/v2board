import type { ReactNode } from "react";
import { ModalDialog } from "@heroui/react/modal";
import { BreadcrumbsItem } from "@heroui/react/breadcrumbs";
import { ListBox } from "@heroui/react/list-box";
import { ListBoxItem } from "@heroui/react/list-box-item";
import { CardContent } from "@heroui/react/card";
import { Separator } from "@heroui/react/separator";
import { TextArea } from "@heroui/react/textarea";

export * from "../../node_modules/@heroui/react/dist/index.js";

export function HeroUIProvider({ children }: { children: ReactNode }) {
  return children;
}

export { BreadcrumbsItem as BreadcrumbItem };
export { CardContent as CardBody };
export { Separator as Divider };
export { ListBox as Listbox };
export { ListBoxItem as ListboxItem };
export { ListBoxItem as SelectItem };
export { ModalDialog as ModalContent };
export { TextArea as Textarea };
