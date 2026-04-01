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
      <Card className="border border-white/70 bg-white/90 shadow-panel backdrop-blur-xl">
        <CardContent className="gap-5 px-5 py-5 md:px-7 md:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Breadcrumbs className="text-slate-400" separator={<span className="text-slate-300">/</span>}>
                <Breadcrumbs.Item className="text-slate-400">Admin</Breadcrumbs.Item>
                {segments.map(segment => (
                  <Breadcrumbs.Item key={segment} className="text-slate-400">
                    {segment.replaceAll("-", " ")}
                  </Breadcrumbs.Item>
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
        </CardContent>
      </Card>

      {children}
    </div>
  );
}
