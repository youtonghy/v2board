import { Button } from "@heroui/react";
import { ArrowRotateRight } from "@gravity-ui/icons";

interface PageFrameProps {
  title: string;
  description: string;
  children: React.ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
  actions?: React.ReactNode;
}

export function PageFrame({
  title,
  description,
  children,
  onRefresh,
  loading,
  actions
}: PageFrameProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 px-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[clamp(2rem,3vw,3.25rem)] font-semibold tracking-[-0.04em] text-ink">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onRefresh ? (
            <Button
              variant="secondary"
              className="px-4"
              onPress={onRefresh}
              isDisabled={loading}
            >
              <span className="inline-flex items-center gap-2">
                <ArrowRotateRight width={16} height={16} aria-hidden="true" />
                <span>Refresh</span>
              </span>
            </Button>
          ) : null}
          {actions}
        </div>
      </div>

      {children}
    </div>
  );
}
