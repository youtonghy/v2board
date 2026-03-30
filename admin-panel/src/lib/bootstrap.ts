import type { AdminBootstrap } from "../types";

function normalizePath(path: string | undefined): string {
  return (path || "").replace(/^\/+|\/+$/g, "");
}

export const adminBootstrap: AdminBootstrap = {
  title:
    window.__ADMIN_V2_BOOTSTRAP__?.title ||
    String(window.settings?.title || "V2Board"),
  version:
    window.__ADMIN_V2_BOOTSTRAP__?.version ||
    String(window.settings?.version || "dev"),
  logo:
    window.__ADMIN_V2_BOOTSTRAP__?.logo ??
    (typeof window.settings?.logo === "string" ? String(window.settings.logo) : null),
  securePath: normalizePath(
    window.__ADMIN_V2_BOOTSTRAP__?.securePath ||
      (typeof window.settings?.secure_path === "string"
        ? String(window.settings.secure_path)
        : "")
  ),
  apiHost:
    window.__ADMIN_V2_BOOTSTRAP__?.apiHost ||
    String(window.settings?.apiHost || window.location.origin)
};

export function legacyHash(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `#${normalized}`;
}

export function openLegacyPage(path: string): void {
  window.location.hash = legacyHash(path);
}
