export type LivenessResult = { ok: boolean; status_code: number | null; latency_ms: number | null; error: string | null };

/** Every HTTP attempt owns its timeout: a timed-out HEAD cannot abort GET. */
export async function probeLivenessOnce(url: string, firstMethod: "HEAD" | "GET" = "HEAD"): Promise<LivenessResult> {
  const started = Date.now();
  const attempt = async (method: "HEAD" | "GET") => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { method, redirect: "follow", signal: controller.signal, headers: { "user-agent": "AgentNexus-HealthCheck/1.0" } });
      // SSE bodies must not stay open after we have the status.
      await response.body?.cancel();
      return response;
    } finally { clearTimeout(timer); }
  };
  try {
    let response: Response;
    if (firstMethod === "GET") response = await attempt("GET");
    else {
      try {
        response = await attempt("HEAD");
        if (response.status === 405 || response.status === 501) response = await attempt("GET");
      } catch { response = await attempt("GET"); }
    }
    const ok = response.status < 500;
    return { ok, status_code: response.status, latency_ms: Date.now() - started, error: ok ? null : `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, status_code: null, latency_ms: Date.now() - started, error: error instanceof Error ? error.message.slice(0, 200) : "Request failed" };
  }
}