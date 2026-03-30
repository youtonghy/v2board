import { Button, Card, CardBody, Chip } from "@heroui/react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { openLegacyPage } from "../lib/bootstrap";

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
  return (
    <div className="space-y-6">
      <Card className="overflow-visible border border-white/40 bg-white/85 shadow-panel backdrop-blur">
        <CardBody className="gap-5 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <Chip className="border-none bg-accentSoft text-accent" radius="full" variant="flat">
                New Admin Preview
              </Chip>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {onRefresh ? (
                <Button
                  variant="flat"
                  startContent={<RefreshCw size={16} />}
                  onPress={onRefresh}
                  isLoading={loading}
                >
                  Refresh
                </Button>
              ) : null}
              <Button
                color="primary"
                endContent={<ArrowUpRight size={16} />}
                onPress={() => openLegacyPage(legacyPath)}
              >
                Open legacy page
              </Button>
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-dashed border-orange-200 bg-orange-50/70 p-4 text-sm leading-7 text-orange-900">
            This page already runs in the new shell. Editing-heavy flows still fall back to the legacy panel so the team can migrate behavior safely without breaking existing operations.
          </div>
        </CardBody>
      </Card>
      {children}
    </div>
  );
}
