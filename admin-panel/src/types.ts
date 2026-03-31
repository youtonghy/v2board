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

export interface AdminListResult<T = unknown> {
  data: T[];
  total: number;
}

declare global {
  interface Window {
    __ADMIN_V2_BOOTSTRAP__?: AdminBootstrap;
    settings?: Record<string, unknown>;
    __ADMIN_V2_DEV__?: boolean;
  }
}
