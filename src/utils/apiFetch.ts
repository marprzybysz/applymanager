export async function apiFetch<T = Record<string, unknown>>(
  url: string,
  options?: RequestInit,
  fallbackMessage = "Request failed"
): Promise<T> {
  const response = await fetch(url, options);
  const data = (await response.json()) as { ok: boolean; error?: string } & T;
  if (!data.ok) {
    throw new Error(data.error || fallbackMessage);
  }
  return data;
}
