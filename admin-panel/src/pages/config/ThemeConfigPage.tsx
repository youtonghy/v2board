import { Button, Card, CardBody, CardHeader, Divider, Spinner, Tab, Tabs } from "@heroui/react";
import { useEffect, useState } from "react";
import { adminRequest } from "../../lib/api";
import { PageFrame } from "../../components/PageFrame";
import { ObjectRecordEditor } from "../../components/ObjectRecordEditor";

interface ThemeSummaryResponse {
  themes?: string[];
  active?: string;
}

export function ThemeConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themes, setThemes] = useState<string[]>([]);
  const [active, setActive] = useState<string>("");
  const [currentTheme, setCurrentTheme] = useState<string>("");
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [template, setTemplate] = useState<unknown>(null);

  async function loadThemes(selectedTheme?: string) {
    setLoading(true);
    const [summaryResponse, templateResponse] = await Promise.all([
      adminRequest<ThemeSummaryResponse>("theme/getThemes"),
      adminRequest("config/getThemeTemplate")
    ]);

    const nextThemes = summaryResponse.data?.themes || [];
    const activeTheme = summaryResponse.data?.active || nextThemes[0] || "";
    const resolvedTheme = selectedTheme || currentTheme || activeTheme;
    const configResponse = resolvedTheme
      ? await adminRequest<Record<string, unknown>>("theme/getThemeConfig", {
          method: "POST",
          body: { name: resolvedTheme }
        })
      : { data: {} };

    setThemes(nextThemes);
    setActive(activeTheme);
    setCurrentTheme(resolvedTheme);
    setConfig(configResponse.data || {});
    setTemplate(templateResponse.data);
    setLoading(false);
  }

  async function saveTheme() {
    if (!currentTheme) return;
    setSaving(true);
    try {
      await adminRequest("theme/saveThemeConfig", {
        method: "POST",
        body: {
          name: currentTheme,
          config
        }
      });
      await loadThemes(currentTheme);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadThemes();
  }, []);

  return (
    <PageFrame
      title="Theme Config"
      description="Fantastic-focused theme management now lives in a real HeroUI editor while the underlying save contract stays unchanged."
      legacyPath="/config/theme"
      onRefresh={() => void loadThemes(currentTheme)}
      loading={loading}
    >
      {loading ? (
        <Card className="border border-default-200 shadow-none">
          <CardBody className="flex min-h-[320px] items-center justify-center">
            <Spinner color="warning" label="Loading themes" />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card className="border border-white/60 bg-white/90 shadow-panel">
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">Installed Themes</p>
                <p className="text-sm text-slate-500">Active theme: {active || "Unknown"}</p>
              </div>
              <Button color="primary" onPress={() => void saveTheme()} isLoading={saving}>
                Save theme config
              </Button>
            </CardHeader>
            <CardBody className="gap-6">
              <Tabs
                selectedKey={currentTheme}
                onSelectionChange={key => void loadThemes(String(key))}
                variant="underlined"
                color="warning"
              >
                {themes.map(theme => (
                  <Tab key={theme} title={theme} />
                ))}
              </Tabs>
              <ObjectRecordEditor value={config} onChange={setConfig} />
            </CardBody>
          </Card>

          <Card className="border border-default-200 bg-white/90 shadow-panel">
            <CardHeader>
              <div>
                <p className="text-lg font-semibold text-slate-900">Theme Template</p>
                <p className="text-sm text-slate-500">Reference snapshot from the existing backend template loader.</p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody>
              <pre className="max-h-[560px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-white">
                {JSON.stringify(template, null, 2)}
              </pre>
            </CardBody>
          </Card>
        </div>
      )}
    </PageFrame>
  );
}
