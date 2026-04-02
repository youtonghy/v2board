import { ArrowRotateRight, Magnifier } from "@gravity-ui/icons";
import { Button, ButtonGroup } from "@heroui/react";

export function AdminFilterActionGroup({
  onSearch,
  onReset,
  isDisabled = false,
  searchLabel = "Search",
  resetLabel = "Reset filters"
}: {
  onSearch: () => void;
  onReset: () => void;
  isDisabled?: boolean;
  searchLabel?: string;
  resetLabel?: string;
}) {
  return (
    <ButtonGroup className="justify-end">
      <Button
        isIconOnly
        variant="primary"
        aria-label={searchLabel}
        isDisabled={isDisabled}
        onPress={onSearch}
      >
        <Magnifier width={16} height={16} aria-hidden="true" />
      </Button>
      <Button
        isIconOnly
        variant="secondary"
        aria-label={resetLabel}
        isDisabled={isDisabled}
        onPress={onReset}
      >
        <ArrowRotateRight width={16} height={16} aria-hidden="true" />
      </Button>
    </ButtonGroup>
  );
}
