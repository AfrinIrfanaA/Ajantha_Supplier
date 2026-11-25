export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

function apiUrl(path: string) {
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parse(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = localStorage.getItem("token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(apiUrl(path), { ...options, headers, credentials: "include" });
  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    const data = await parse(res);
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: string }).message)
        : "Something went wrong. Please try again.";
    const code = typeof data === "object" && data && "code" in data ? String((data as { code: string }).code) : undefined;
    throw new ApiError(message, res.status, code);
  }

  if (res.headers.get("content-type")?.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.blob()) as T;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function apiDownload(path: string, filename: string) {
  const headers = new Headers();
  const token = localStorage.getItem("token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl(path), { headers, credentials: "include" });
  if (!res.ok) {
    throw new ApiError("Unable to download file. Please try again.", res.status);
  }
  const blob = await res.blob();
  downloadBlob(blob, filename);
}
