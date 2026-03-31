import { Breadcrumbs, Button, Card, CardContent } from "@heroui/react";
import { ArrowRotateRight } from "@gravity-ui/icons";
import { useLocation } from "react-router-dom";

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
  const location = useLocation();
  const segments = location.pathname.replace(/^\/new\/?/, "").split("/").filter(Boolean);

  return (
    <div className="space-y-6">
      <Card shadow="none" radius="lg" className="border border-white/70 bg-white/90 shadow-panel backdrop-blur-xl">
        <CardContent className="gap-5 px-5 py-5 md:px-7 md:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Breadcrumbs
                itemClasses={{
                  item: "text-slate-400",
                  separator: "text-slate-300"
                }}
              >
                <Breadcrumbs.Item>Admin</Breadcrumbs.Item>
                {segments.map(segment => (
                  <Breadcrumbs.Item key={segment}>{segment.replaceAll("-", " ")}</Breadcrumbs.Item>
                ))}
              </Breadcrumbs>
              <div>
                <h1 className="text-[clamp(2rem,3vw,3.25rem)] font-semibold tracking-[-0.04em] text-slate-950">
                  {title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">{description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onRefresh ? (
                <Button
                  radius="full"
                  variant="flat"
                  color="default"
                  className="px-4"
                  startContent={<ArrowRotateRight width={16} height={16} aria-hidden="true" />}
                  onPress={onRefresh}
                  isLoading={loading}
                >
                  Refresh
                </Button>
              ) : null}
              {actions}
            </div>
          </div>
        </CardContent>
      </Card>

      {children}
    </div>
  );
}
