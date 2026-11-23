import { useEffect } from "react";
import { isCtaRef } from "./entry-cta";

/**
 * One web-analytics event per arrival from a listing CTA, sent through the
 * existing Lovable visitor-analytics SDK. No new table, no personal data:
 * only the CTA id, the source listing slug, the landing path and a timestamp.
 * Refreshes in the same tab are deduplicated through sessionStorage.
 */
export const CTA_ARRIVAL_EVENT = "entry_cta_arrival";

type Track = (name: string, props?: Record<string, unknown>) => void;

export function arrivalKey(cta: string, from: string, path: string): string {
  return `an:cta-arrival:${cta}:${from}:${path}`;
}

export function trackCtaArrival(
  ref: string | undefined,
  from: string | undefined,
  extra: Record<string, string | number | boolean> = {},
): boolean {
  if (typeof window === "undefined" || !isCtaRef(ref)) return false;
  const path = window.location.pathname;
  const source = (from ?? "").slice(0, 120) || "unknown";
  const key = arrivalKey(ref, source, path);
  const track = (window as unknown as { __lovableEvents?: { track?: Track } }).__lovableEvents?.track;
  if (!track) return false; // analytics not loaded: do not mark as sent
  try {
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* storage blocked: send anyway */
  }
  track(CTA_ARRIVAL_EVENT, {
    cta: ref,
    from_slug: source,
    landing_path: path,
    arrived_at: new Date().toISOString(),
    ...extra,
  });
  return true;
}

export function useCtaArrival(
  ref: string | undefined,
  from: string | undefined,
  extra?: Record<string, string | number | boolean>,
  ready = true,
) {
  useEffect(() => {
    if (!ready) return;
    // SDK script is deferred; retry briefly until it is available.
    let tries = 0;
    const id = window.setInterval(() => {
      tries++;
      const has = !!(window as unknown as { __lovableEvents?: { track?: Track } }).__lovableEvents?.track;
      if (has || tries > 40) {
        window.clearInterval(id);
        trackCtaArrival(ref, from, extra);
      }
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, from, ready]);
}
