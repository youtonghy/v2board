export interface AdminBootstrap {
  title: string;
  version: string;
  logo: string | null;
  securePath: string;
  apiHost: string;
}

export interface ApiEnvelope<T = unknown> {
  code: number;
  message?: string;
  data?: T;
  total?: number;
  [key: string]: unknown;
}

export interface ResourceSource {
  id: string;
  label: string;
  endpoint: string;
  method?: "GET" | "POST";
  query?: Record<string, string | number>;
}

export interface ResourcePageSpec {
  title: string;
  description: string;
  legacyPath: string;
  sources: ResourceSource[];
}

declare global {
  interface Window {
    __ADMIN_V2_BOOTSTRAP__?: AdminBootstrap;
    settings?: Record<string, unknown>;
    __ADMIN_V2_DEV__?: boolean;
  }
}
