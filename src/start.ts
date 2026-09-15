import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const isLovableInternal = (request?: Request) => {
  if (!request) return false;
  try {
    return new URL(request.url).pathname.startsWith("/lovable/");
  } catch {
    return false;
  }
};

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx: any) =>
    ctx.handlerType === "serverFn" && !isLovableInternal(ctx?.request),
});

/**
 * Records every hit on a machine-facing surface (/mcp, /llms.txt, the public
 * JSON APIs, the well-known manifests). HTML pages are ignored. Best-effort:
 * a logging failure never affects the response.
 */
const accessLogMiddleware = createMiddleware().server(async (ctx: any) => {
  const request: Request | undefined = ctx?.request;
  if (isLovableInternal(request)) return ctx.next();
  let surface: string | null = null;
  if (request) {
    try {
      const { surfaceFor } = await import("./lib/access-log.server");
      surface = surfaceFor(new URL(request.url).pathname);
    } catch {
      surface = null;
    }
  }

  const result = await ctx.next();

  if (request && surface) {
    try {
      const { logAccess } = await import("./lib/access-log.server");
      await logAccess(request, surface);
    } catch {
      // swallow
    }
  }

  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware, accessLogMiddleware],
}));
