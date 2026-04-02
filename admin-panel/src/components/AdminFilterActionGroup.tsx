import { ArrowRotateRight, Magnifier } from "@gravity-ui/icons";
import { Button, ButtonGroup, Tooltip } from "@heroui/react";

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
      <Tooltip>
        <Tooltip.Trigger>
          <Button
            isIconOnly
            variant="primary"
            aria-label={searchLabel}
            isDisabled={isDisabled}
            onPress={onSearch}
          >
            <Magnifier width={16} height={16} aria-hidden="true" />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          {searchLabel}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip>
      <Tooltip>
        <Tooltip.Trigger>
          <Button
            isIconOnly
            variant="secondary"
            aria-label={resetLabel}
            isDisabled={isDisabled}
            onPress={onReset}
          >
            <ArrowRotateRight width={16} height={16} aria-hidden="true" />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          {resetLabel}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip>
    </ButtonGroup>
  );
}
