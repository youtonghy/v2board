import { adminBootstrap } from "./bootstrap";
import type { ApiEnvelope } from "../types";

function getAuthToken(): string | null {
  try {
    return window.localStorage.getItem("auth_data");
  } catch (error) {
    return null;
  }
}

function buildUrl(endpoint: string, query?: Record<string, string | number>): string {
  const securePath = adminBootstrap.securePath;
  const normalized = endpoint.replace(/^\/+/, "");
  const url = new URL(`/${securePath}/${normalized}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function parseResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return {
    code: response.ok ? 200 : response.status,
    data: (await response.text()) as T
  };
}

export async function adminRequest<T>(
  endpoint: string,
  options?: {
    method?: "GET" | "POST";
    query?: Record<string, string | number>;
    body?: Record<string, unknown>;
  }
): Promise<ApiEnvelope<T>> {
  const token = getAuthToken();
  const method = options?.method || "GET";
  const headers = new Headers({
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest"
  });

  if (token) {
    headers.set("Authorization", token);
  }

  let body: string | undefined;
  if (method !== "GET" && options?.body) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(buildUrl(endpoint, options?.query), {
    method,
    headers,
    credentials: "same-origin",
    body
  });

  return parseResponse<T>(response);
}

export async function gatewayRequest<T>(
  endpoint: string,
  options?: { method?: "GET" | "POST"; params?: Record<string, unknown> }
): Promise<ApiEnvelope<T>> {
  const token = getAuthToken();
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest"
  });

  if (token) {
    headers.set("Authorization", token);
  }

  const response = await fetch("/api/v3/server", {
    method: "POST",
    headers,
    credentials: "same-origin",
    body: JSON.stringify({
      endpoint,
      method: options?.method || "GET",
      params: options?.params || {}
    })
  });

  return parseResponse<T>(response);
}
