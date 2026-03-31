import { Button, Card, CardBody, CardHeader, Divider, Input, Spinner, Tab, Tabs } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../lib/api";
import { PageFrame } from "../../components/PageFrame";
import { ObjectRecordEditor } from "../../components/ObjectRecordEditor";

interface SystemConfigState {
  loading: boolean;
  saving: boolean;
  testingMail: boolean;
  settingWebhook: boolean;
  sections: Record<string, Record<string, unknown>>;
  activeKey: string;
  emailTemplate: unknown;
  mailResult?: string;
  webhookResult?: string;
  error?: string;
}

export function SystemConfigPage() {
  const [state, setState] = useState<SystemConfigState>({
    loading: true,
    saving: false,
    testingMail: false,
    settingWebhook: false,
    sections: {},
    activeKey: "site",
    emailTemplate: null
  });

  const activeRecord = state.sections[state.activeKey] || {};

  async function loadConfig() {
    setState(current => ({ ...current, loading: true, error: undefined }));
    try {
      const [configResponse, templateResponse] = await Promise.all([
        adminRequest<Record<string, Record<string, unknown>>>("config/fetch"),
        adminRequest("config/getEmailTemplate")
      ]);

      const sections = configResponse.data || {};
      const firstKey = Object.keys(sections)[0] || "site";

      setState(current => ({
        ...current,
        loading: false,
        sections,
        activeKey: current.activeKey in sections ? current.activeKey : firstKey,
        emailTemplate: templateResponse.data
      }));
    } catch (error) {
      setState(current => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load config"
      }));
    }
  }

  async function saveCurrentSection() {
    const payload = state.sections[state.activeKey];
    if (!payload) return;

    setState(current => ({ ...current, saving: true }));
    try {
      await adminRequest("config/save", {
        method: "POST",
        body: payload
      });
      await loadConfig();
    } finally {
      setState(current => ({ ...current, saving: false }));
    }
  }

  async function testSendMail() {
    setState(current => ({ ...current, testingMail: true, mailResult: undefined, error: undefined }));
    try {
      const response = await adminRequest<{ error?: string; email?: string; config?: Record<string, unknown> }>("config/testSendMail", {
        method: "POST"
      });
      const log = (response as { log?: { error?: string; email?: string; config?: Record<string, unknown> } }).log;
      const smtpHost = log?.config?.host ? ` via ${String(log.config.host)}` : "";
      const target = log?.email ? ` to ${String(log.email)}` : "";
      setState(current => ({
        ...current,
        mailResult: log?.error ? `Send failed${target}: ${String(log.error)}` : `Test email sent${target}${smtpHost}.`
      }));
    } catch (nextError) {
      setState(current => ({
        ...current,
        mailResult: nextError instanceof Error ? nextError.message : "Failed to send test email"
      }));
    } finally {
      setState(current => ({ ...current, testingMail: false }));
    }
  }

  async function setTelegramWebhook() {
    const token = String(state.sections.telegram?.telegram_bot_token || "").trim();
    if (!token) {
      setState(current => ({
        ...current,
        webhookResult: "Telegram bot token is required before setting the webhook."
      }));
      return;
    }

    setState(current => ({ ...current, settingWebhook: true, webhookResult: undefined, error: undefined }));
    try {
      await adminRequest("config/setTelegramWebhook", {
        method: "POST",
        body: { telegram_bot_token: token }
      });
      setState(current => ({
        ...current,
        webhookResult: "Telegram webhook configured successfully."
      }));
    } catch (nextError) {
      setState(current => ({
        ...current,
        webhookResult: nextError instanceof Error ? nextError.message : "Failed to configure Telegram webhook"
      }));
    } finally {
      setState(current => ({ ...current, settingWebhook: false }));
    }
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  const sectionKeys = useMemo(() => Object.keys(state.sections), [state.sections]);

  return (
    <PageFrame
      title="System Config"
      description="This page replaces the generic data snapshot with a HeroUI section editor. The current save contract stays unchanged and still posts the selected config section to the existing admin endpoint."
      legacyPath="/config/system"
      onRefresh={() => void loadConfig()}
      loading={state.loading}
    >
      {state.loading ? (
        <Card className="border border-default-200 shadow-none">
          <CardBody className="flex min-h-[320px] items-center justify-center">
            <Spinner color="warning" label="Loading system config" />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card className="border border-white/60 bg-white/90 shadow-panel">
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">Config Sections</p>
                <p className="text-sm text-slate-500">Editable scalar fields stay inline; arrays and nested objects fall back to JSON-safe textareas.</p>
              </div>
              <Button color="primary" onPress={() => void saveCurrentSection()} isLoading={state.saving}>
                Save section
              </Button>
            </CardHeader>
            <CardBody className="gap-6">
              {sectionKeys.length ? (
                <Tabs
                  selectedKey={state.activeKey}
                  onSelectionChange={key => setState(current => ({ ...current, activeKey: String(key) }))}
                  variant="underlined"
                  color="warning"
                  classNames={{ tabList: "overflow-x-auto" }}
                >
                  {sectionKeys.map(key => (
                    <Tab key={key} title={key} />
                  ))}
                </Tabs>
              ) : null}
              <ObjectRecordEditor
                value={activeRecord}
                onChange={nextValue =>
                  setState(current => ({
                    ...current,
                    sections: {
                      ...current.sections,
                      [current.activeKey]: nextValue
                    }
                  }))
                }
              />
            </CardBody>
          </Card>

          <Card className="border border-default-200 bg-white/90 shadow-panel">
            <CardHeader>
              <div>
                <p className="text-lg font-semibold text-slate-900">Email Template Snapshot</p>
                <p className="text-sm text-slate-500">Read-only context to keep configuration changes grounded in the current template set.</p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody>
              <pre className="max-h-[560px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-white">
                {JSON.stringify(state.emailTemplate, null, 2)}
              </pre>
            </CardBody>
          </Card>

          <Card className="border border-default-200 bg-white/90 shadow-panel xl:col-span-2">
            <CardHeader>
              <div>
                <p className="text-lg font-semibold text-slate-900">Validation Actions</p>
                <p className="text-sm text-slate-500">Run the same test actions that existed in the legacy admin without leaving the new panel.</p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Test Mail Delivery</p>
                <p className="mt-1 text-sm text-slate-500">Send a test message to the current admin account using the active SMTP settings.</p>
                <Button className="mt-4" color="primary" onPress={() => void testSendMail()} isLoading={state.testingMail}>
                  Send test mail
                </Button>
                {state.mailResult ? (
                  <p className="mt-3 text-sm text-slate-600">{state.mailResult}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Telegram Webhook</p>
                <p className="mt-1 text-sm text-slate-500">Use the token from the Telegram section to register the webhook endpoint.</p>
                <Input
                  className="mt-4"
                  label="Telegram Bot Token"
                  labelPlacement="outside"
                  value={String(state.sections.telegram?.telegram_bot_token || "")}
                  onValueChange={value =>
                    setState(current => ({
                      ...current,
                      sections: {
                        ...current.sections,
                        telegram: {
                          ...(current.sections.telegram || {}),
                          telegram_bot_token: value
                        }
                      }
                    }))
                  }
                />
                <Button className="mt-4" color="primary" variant="flat" onPress={() => void setTelegramWebhook()} isLoading={state.settingWebhook}>
                  Set webhook
                </Button>
                {state.webhookResult ? (
                  <p className="mt-3 text-sm text-slate-600">{state.webhookResult}</p>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
    </PageFrame>
  );
}
