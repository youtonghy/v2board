function readStorage(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key);
    return typeof value === "string" && value.trim() ? value : null;
  } catch (error) {
    return null;
  }
}

function unwrapLegacyToken(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { value?: unknown; data?: unknown } | null;
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.value === "string" && parsed.value.trim()) {
        return parsed.value;
      }
      if (typeof parsed.data === "string" && parsed.data.trim()) {
        return parsed.data;
      }
    }
  } catch (error) {
  }

  return raw;
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
  }
}

export function clearAdminAuthStorage(): void {
  try {
    window.localStorage.removeItem("authorization");
    window.localStorage.removeItem("auth_data");
  } catch (error) {
  }
}

export function getAdminAuthToken(): string | null {
  const legacyToken = unwrapLegacyToken(readStorage("authorization"));
  if (legacyToken) {
    return legacyToken;
  }

  const authDataToken = readStorage("auth_data");
  if (authDataToken) {
    writeStorage("authorization", authDataToken);
    return authDataToken;
  }

  return null;
}
