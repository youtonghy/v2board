import { adminBootstrap } from "./bootstrap";
import { clearAdminAuthStorage, getAdminAuthToken } from "./authStorage";
import type { ApiEnvelope } from "../types";

function appendQueryValue(
  params: URLSearchParams,
  key: string,
  value: unknown
): void {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    params.append(key, "");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      appendQueryValue(params, `${key}[${index}]`, item);
    });
    return;
  }
  if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
      appendQueryValue(params, `${key}[${childKey}]`, childValue);
    });
    return;
  }
  params.append(key, String(value));
}

function buildUrl(endpoint: string, query?: Record<string, unknown>): string {
  const securePath = adminBootstrap.securePath;
  const normalized = endpoint.replace(/^\/+/, "");
  const baseHost = adminBootstrap.apiHost || window.location.origin;
  const url = new URL(`/api/v1/${securePath}/${normalized}`, baseHost);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      appendQueryValue(url.searchParams, key, value);
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
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
  }
): Promise<ApiEnvelope<T>> {
  const token = getAdminAuthToken();
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

  if (response.status === 401 || response.status === 403) {
    clearAdminAuthStorage();
  }

  return parseResponse<T>(response);
}

export async function gatewayRequest<T>(
  endpoint: string,
  options?: { method?: "GET" | "POST"; params?: Record<string, unknown> }
): Promise<ApiEnvelope<T>> {
  const token = getAdminAuthToken();
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

  if (response.status === 401 || response.status === 403) {
    clearAdminAuthStorage();
  }

  return parseResponse<T>(response);
}

export function getEnvelopeError(envelope?: ApiEnvelope | null): string | null {
  if (!envelope) {
    return "Empty response";
  }

  if (typeof envelope.code === "number" && envelope.code >= 400) {
    if (typeof envelope.message === "string" && envelope.message.trim()) {
      return envelope.message;
    }
    if (typeof envelope.data === "string" && envelope.data.trim()) {
      return envelope.data;
    }
    return `Request failed (${envelope.code})`;
  }

  if (
    typeof envelope.message === "string" &&
    envelope.message.trim() &&
    envelope.code !== 200
  ) {
    return envelope.message;
  }

  return null;
}

export function unwrapEnvelope<T>(envelope?: ApiEnvelope<T> | null): T {
  const error = getEnvelopeError(envelope);
  if (error) {
    throw new Error(error);
  }
  return (envelope?.data ?? null) as T;
}
