import { BreadcrumbItem, Breadcrumbs, Button } from "@heroui/react";
import { useLocation } from "react-router-dom";
import { openLegacyPage } from "../lib/bootstrap";
import { ExternalLinkIcon, RefreshIcon } from "./AdminIcons";

interface PageFrameProps {
  title: string;
  description: string;
  legacyPath: string;
  children: React.ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
}

export function PageFrame({
  title,
  description,
  legacyPath,
  children,
  onRefresh,
  loading
}: PageFrameProps) {
  const location = useLocation();
  const segments = location.pathname.replace(/^\/new\/?/, "").split("/").filter(Boolean);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white/80 px-5 py-5 shadow-[0_24px_80px_rgba(15,23,32,0.06)] backdrop-blur-xl md:px-7 md:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Breadcrumbs
              itemClasses={{
                item: "text-slate-400",
                separator: "text-slate-300"
              }}
            >
              <BreadcrumbItem>Admin</BreadcrumbItem>
              {segments.map(segment => (
                <BreadcrumbItem key={segment}>{segment.replaceAll("-", " ")}</BreadcrumbItem>
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
                variant="light"
                className="bg-slate-100 px-4 text-slate-700"
                startContent={<RefreshIcon size={16} />}
                onPress={onRefresh}
                isLoading={loading}
              >
                Refresh
              </Button>
            ) : null}
            <Button
              color="primary"
              radius="full"
              className="px-5"
              endContent={<ExternalLinkIcon size={16} />}
              onPress={() => openLegacyPage(legacyPath)}
            >
              Open legacy
            </Button>
          </div>
        </div>
      </section>

      {children}
    </div>
  );
}
