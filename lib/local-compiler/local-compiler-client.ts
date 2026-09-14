import type {
  LocalAgentInfo,
  LocalBuildStatusResponse,
  LocalCompileRequest,
  LocalSyncTexForward,
  LocalSyncTexInverse,
} from "@/lib/local-compiler/types";

export const DEFAULT_LOCAL_AGENT_PORT = 47823;

const LOCAL_AGENT_PORT_STORAGE_KEY = "inkwell.local-agent.port";

export function getLocalAgentPort(): number {
  if (typeof window === "undefined") return DEFAULT_LOCAL_AGENT_PORT;
  try {
    const stored = window.localStorage.getItem(LOCAL_AGENT_PORT_STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LOCAL_AGENT_PORT;
  } catch {
    return DEFAULT_LOCAL_AGENT_PORT;
  }
}

export function setLocalAgentPort(port: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_AGENT_PORT_STORAGE_KEY, String(port));
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
}

function baseUrl(): string {
  return `http://localhost:${getLocalAgentPort()}`;
}

async function fetchJson<T>(path: string, init?: RequestInit, timeoutMs = 4000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl()}${path}`, { ...init, signal: controller.signal });
    if (!res.ok) {
      let message = `Local agent request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch {
        // ignore body parse failure
      }
      throw new Error(message);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function detectLocalAgent(timeoutMs = 900): Promise<LocalAgentInfo | null> {
  try {
    return await fetchJson<LocalAgentInfo>("/version", { method: "GET" }, timeoutMs);
  } catch {
    return null;
  }
}

export async function startLocalCompile(
  request: LocalCompileRequest
): Promise<{ buildId: string; status: "queued" }> {
  return fetchJson("/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function getLocalBuildStatus(buildId: string): Promise<LocalBuildStatusResponse> {
  return fetchJson(`/status/${encodeURIComponent(buildId)}`, { method: "GET" });
}

export async function cancelLocalBuild(buildId: string): Promise<void> {
  await fetchJson(`/cancel/${encodeURIComponent(buildId)}`, { method: "POST" });
}

export async function closeLocalProject(projectId: string): Promise<void> {
  try {
    await fetchJson(`/project/${encodeURIComponent(projectId)}`, { method: "DELETE" }, 1500);
  } catch {
    // best-effort cleanup signal, ignore failures
  }
}

export function localPdfUrl(pdfUrl: string): string {
  return `${baseUrl()}${pdfUrl}`;
}

export async function localSyncTexForward(
  projectId: string,
  mainFile: string,
  file: string,
  line: number
): Promise<LocalSyncTexForward | null> {
  const params = new URLSearchParams({ file, line: String(line), mainFile });
  try {
    return await fetchJson<LocalSyncTexForward>(
      `/synctex/forward/${encodeURIComponent(projectId)}?${params}`,
      { method: "GET" },
      4000
    );
  } catch {
    return null;
  }
}

export async function localSyncTexInverse(
  projectId: string,
  mainFile: string,
  page: number,
  x: number,
  y: number
): Promise<LocalSyncTexInverse | null> {
  const params = new URLSearchParams({ page: String(page), x: String(x), y: String(y), mainFile });
  try {
    return await fetchJson<LocalSyncTexInverse>(
      `/synctex/inverse/${encodeURIComponent(projectId)}?${params}`,
      { method: "GET" },
      4000
    );
  } catch {
    return null;
  }
}

export function subscribeLocalBuildUpdates(
  projectId: string,
  onUpdate: (status: LocalBuildStatusResponse) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  let socket: WebSocket | null = null;

  try {
    socket = new WebSocket(`ws://localhost:${getLocalAgentPort()}/events`);
    socket.addEventListener("open", () => {
      socket?.send(JSON.stringify({ type: "subscribe", projectId }));
    });
    socket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === "build-update" && data.projectId === projectId) {
          onUpdate(data as LocalBuildStatusResponse);
        }
      } catch {
        // ignore malformed messages
      }
    });
  } catch {
    socket = null;
  }

  return () => {
    socket?.close();
  };
}
