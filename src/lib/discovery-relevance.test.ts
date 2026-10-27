import { describe, expect, it } from "vitest";
import { buildDiscovery, needTokens } from "./registry-core";

const entry = (slug: string, capabilities: string[], summary = "") => ({
  slug, name: slug, category: "api", capabilities, summary, description: "", tags: [],
  checks_total: 10, checks_ok: 10, health_ok: true, verified: true,
});
const fx = entry("frankfurter-fx-api", ["convert currency", "exchange rate", "historical fx"]);
const page = entry("pagewire-mcp", ["convert-page-to-markdown"], "Paid in USDC on Base");
const llm = entry("openrouter-api", ["chat_completions", "list_models"], "AI model inference");
const mesh = entry("sketchfab-api", ["search 3d models", "find downloadable mesh"]);
const discover = (need: string, rows: unknown[]) => buildDiscovery(rows, { need, tokens: needTokens(need) });

describe("discovery domain relevance", () => {
  it("datacircle selects Datacircle, never Mockaroo through the fragment data", () => {
    const datacircle = { ...entry("datacircle-mcp", ["list APIs", "search plans"]), name: "Datacircle", category: "mcp" };
    const mockaroo = { ...entry("mockaroo-api", ["mock_data", "schemas"]), name: "Mockaroo" };
    const result = discover("datacircle", [mockaroo, datacircle]);
    expect(result.matches.map((match) => match.slug)).toEqual(["datacircle-mcp"]);
    expect(result.coverage).toBe("exact");
  });
  it("find Korean businesses by region does not suggest Georgia when Korea is uncovered", () => {
    const georgia = entry("legal-sandbox-georgia-api", ["company data", "business lookup", "find", "georgia"]);
    const result = discover("find Korean businesses by region", [georgia]);
    expect(result.coverage).toBe("none");
    expect(result.uncovered).toBe(true);
    expect(result.matches).toEqual([]);
  });
  it("find Korean businesses by region selects a service declaring Korean regional business data", () => {
    const boim = entry("boim-mcp", ["search businesses by region"], "Korean business data");
    const georgia = entry("legal-sandbox-georgia-api", ["company data", "business lookup", "find", "georgia"]);
    const result = discover("find Korean businesses by region", [georgia, boim]);
    expect(result.matches.map((match) => match.slug)).toEqual(["boim-mcp"]);
    expect(result.coverage).toBe("exact");
  });
  it("currency conversion returns FX, not a page converter paid in USDC", () => {
    const result = discover("convert USD to EUR", [page, fx]);
    expect(result.matches.map((m) => m.slug)).toEqual(["frankfurter-fx-api"]);
  });
  it("a missing currency service is uncovered, not an exact incidental match", () => {
    expect(discover("convert USD to EUR", [page]).uncovered).toBe(true);
  });
  it.each(["LLM models", "AI models", "call LLM and AI model APIs from an application"])("%s does not select printable meshes", (need) => {
    expect(discover(need, [mesh, llm]).matches.map((m) => m.slug)).toEqual(["openrouter-api"]);
  });
  it("explicit 3D model requests still select meshes", () => {
    expect(discover("convert 3d model", [llm, mesh]).matches[0]?.slug).toBe("sketchfab-api");
  });
  it.each(["translate text", "traduire"])("%s still selects translation", (need) => {
    const translation = entry("deepl-api", ["translate text"]);
    expect(discover(need, [translation, mesh]).matches[0]?.slug).toBe("deepl-api");
  });
  it.each(["send a transactional email", "envoyer un courriel"])("%s still selects email", (need) => {
    expect(discover(need, [entry("smtp2go-api", ["send email", "transactional email"]), mesh]).matches[0]?.slug).toBe("smtp2go-api");
  });
});

describe("fallback phrasing", () => {
  const stripe = { ...entry("stripe-api", ["accept payments", "charge cards", "subscriptions"]), name: "Stripe API" };
  const paddle = entry("paddle-api", ["accept payments", "subscriptions"]);
  const qr = entry("qr-api", ["generate qr code"], "Down to earth QR alternative");
  it.each(["stripe is down", "alternative to Stripe"])("%s returns another payment service, not Stripe", (need) => {
    const slugs = discover(need, [stripe, paddle, qr]).matches.map((m) => m.slug);
    expect(slugs[0]).toBe("paddle-api");
    expect(slugs).not.toContain("stripe-api");
  });
  it("charge a card selects payments", () => {
    expect(discover("charge a card", [qr, paddle]).matches[0]?.slug).toBe("paddle-api");
  });
});