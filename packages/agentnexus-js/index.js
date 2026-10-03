// Agent Nexus client: find a working API, MCP server or CLI in 3 lines.
// Zero dependencies. Works in Node 18+, Deno, Bun, browsers and edge runtimes.

export const VERSION = "0.1.0";
export const MCP_URL = "https://agentnexus.app/api/public/mcp";
const DEFAULT_BASE_URL = "https://agentnexus.app";

export class AgentNexusError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AgentNexusError";
    this.status = status;
  }
}

const env = (k) => (typeof process !== "undefined" && process.env ? process.env[k] : undefined);

export class AgentNexus {
  constructor({ apiKey, baseUrl, timeoutMs = 20000 } = {}) {
    this.apiKey = apiKey ?? env("AGENT_NEXUS_API_KEY");
    this.baseUrl = (baseUrl ?? env("AGENT_NEXUS_BASE_URL") ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = timeoutMs;
  }

  async #request(method, path, { body, params } = {}) {
    let url = this.baseUrl + path;
    if (params) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
      const s = q.toString();
      if (s) url += "?" + s;
    }
    const headers = { accept: "application/json" };
    if (typeof window === "undefined") headers["user-agent"] = `agentnexus-js/${VERSION}`;
    if (body !== undefined) headers["content-type"] = "application/json";
    if (this.apiKey) headers["x-api-key"] = this.apiKey;
    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new AgentNexusError(`Agent Nexus request failed: ${err?.message ?? err}`);
    }
    const text = await res.text();
    if (res.status === 429) throw new AgentNexusError("Daily quota reached. Mint a free key with AgentNexus.createKey().", 429);
    if (!res.ok) throw new AgentNexusError(`Agent Nexus returned ${res.status}: ${text.slice(0, 300)}`, res.status);
    try {
      return JSON.parse(text);
    } catch {
      throw new AgentNexusError("Agent Nexus returned a non-JSON response", res.status);
    }
  }

  discover(need, { limit = 5, category, minReliability } = {}) {
    const body = { need, limit };
    if (category) body.category = category;
    if (minReliability) body.min_reliability = minReliability;
    return this.#request("POST", "/api/public/discover", { body });
  }

  async find(need, opts) {
    const r = await this.discover(need, opts);
    return r.matches?.[0] ?? null;
  }

  search(query = "", { category, limit = 20 } = {}) {
    return this.#request("GET", "/api/public/registry", { params: { q: query, category, limit } });
  }

  getEntry(slug) {
    return this.#request("GET", "/api/public/registry/" + encodeURIComponent(slug));
  }

  healthCard(slug) {
    return this.#request("GET", "/api/public/health-card/" + encodeURIComponent(slug));
  }

  report(slug, { ok, statusCode, latencyMs, note } = {}) {
    const body = { slug, outcome: ok ? "success" : "failure" };
    if (statusCode != null) body.status_code = Math.trunc(statusCode);
    if (latencyMs != null) body.latency_ms = Math.trunc(latencyMs);
    if (note) body.error = String(note).slice(0, 500);
    return this.#request("POST", "/api/public/report", { body });
  }

  static async createKey({ agent = "agentnexus-js", purpose, baseUrl } = {}) {
    const body = { agent };
    if (purpose) body.purpose = purpose;
    const r = await new AgentNexus({ baseUrl, apiKey: null }).#request("POST", "/api/public/keys", { body });
    const key = r.api_key ?? r.key;
    if (!key) throw new AgentNexusError("No key in response");
    return key;
  }
}

export default AgentNexus;
