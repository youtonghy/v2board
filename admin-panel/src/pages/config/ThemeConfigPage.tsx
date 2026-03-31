import { Button, Card, CardBody, CardHeader, Divider, Spinner, Tab, Tabs } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { adminRequest, unwrapEnvelope } from "../../lib/api";
import { PageFrame } from "../../components/PageFrame";
import { ObjectRecordEditor } from "../../components/ObjectRecordEditor";
import { SectionCard, StatGrid } from "../../components/AdminContent";

interface ThemeSummaryResponse {
  themes?: Record<string, Record<string, unknown>>;
  active?: string;
}

export function ThemeConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themes, setThemes] = useState<string[]>([]);
  const [themeMeta, setThemeMeta] = useState<Record<string, Record<string, unknown>>>({});
  const [active, setActive] = useState<string>("");
  const [currentTheme, setCurrentTheme] = useState<string>("");
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [template, setTemplate] = useState<unknown>(null);
  const [error, setError] = useState<string>();

  async function loadThemes(selectedTheme?: string) {
    setLoading(true);
    setError(undefined);
    try {
      const [summaryResponse, templateResponse] = await Promise.all([
        adminRequest<ThemeSummaryResponse>("theme/getThemes"),
        adminRequest("config/getThemeTemplate")
      ]);

      const summary = unwrapEnvelope(summaryResponse);
      const nextThemeMeta = summary?.themes || {};
      const nextThemes = Object.keys(nextThemeMeta);
      const activeTheme = summary?.active || nextThemes[0] || "";
      const resolvedTheme = selectedTheme || currentTheme || activeTheme;
      const configResponse = resolvedTheme
        ? await adminRequest<Record<string, unknown>>("theme/getThemeConfig", {
            method: "POST",
            body: { name: resolvedTheme }
          })
        : { code: 200, data: {} };

      setThemeMeta(nextThemeMeta);
      setThemes(nextThemes);
      setActive(activeTheme);
      setCurrentTheme(resolvedTheme);
      setConfig(unwrapEnvelope(configResponse) || {});
      setTemplate(unwrapEnvelope(templateResponse));
    } catch (nextError) {
      setThemes([]);
      setThemeMeta({});
      setConfig({});
      setError(nextError instanceof Error ? nextError.message : "Failed to load theme config");
    } finally {
      setLoading(false);
    }
  }

  async function saveTheme() {
    if (!currentTheme) return;
    setSaving(true);
    try {
      await unwrapEnvelope(
        await adminRequest("theme/saveThemeConfig", {
          method: "POST",
          body: {
            name: currentTheme,
            config: btoa(unescape(encodeURIComponent(JSON.stringify(config))))
          }
        })
      );
      await loadThemes(currentTheme);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadThemes();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Installed", value: String(themes.length), hint: "Detected theme packages" },
      { label: "Active", value: active || "—", hint: "Current live theme" },
      { label: "Editing", value: currentTheme || "—", hint: "Config target" },
      { label: "Template keys", value: String(Object.keys((template as Record<string, unknown>) || {}).length), hint: "Template snapshot size" }
    ],
    [active, currentTheme, template, themes.length]
  );

  return (
    <PageFrame
      title="Theme Config"
      description="Fantastic-focused theme management now lives in a real HeroUI editor while the underlying save contract stays unchanged."
      onRefresh={() => void loadThemes(currentTheme)}
      loading={loading}
    >
      <StatGrid items={stats} />

      {loading ? (
        <Card className="border border-default-200 shadow-none">
          <CardBody className="flex min-h-[320px] items-center justify-center">
            <Spinner color="primary" label="Loading themes" />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <SectionCard
            title="Installed Themes"
            description={`Active theme: ${active || "Unknown"}`}
            action={<Button color="primary" radius="full" onPress={() => void saveTheme()} isLoading={saving}>Save theme config</Button>}
            bodyClassName="gap-6"
          >
              <Tabs
                selectedKey={currentTheme}
                onSelectionChange={key => void loadThemes(String(key))}
                variant="underlined"
                color="primary"
              >
                {themes.map(theme => (
                  <Tab key={theme} title={theme} />
                ))}
              </Tabs>
              {currentTheme && themeMeta[currentTheme] ? (
                <div className="rounded-2xl border border-default-200 bg-default-50 p-4 text-sm text-slate-600">
                  <pre className="overflow-x-auto whitespace-pre-wrap text-xs">
                    {JSON.stringify(themeMeta[currentTheme], null, 2)}
                  </pre>
                </div>
              ) : null}
              <ObjectRecordEditor value={config} onChange={setConfig} />
          </SectionCard>

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
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </PageFrame>
  );
}
