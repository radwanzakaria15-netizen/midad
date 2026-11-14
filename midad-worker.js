import * as config from "./functions/api/config.js";
import * as account from "./functions/api/account.js";
import * as invites from "./functions/api/invites.js";
import * as inviteValidate from "./functions/api/invites/validate.js";
import * as inviteRedeem from "./functions/api/invites/redeem.js";
import * as inviteRelease from "./functions/api/invites/release.js";
import * as ratings from "./functions/api/ratings.js";
import * as resources from "./functions/api/resources.js";
import * as student from "./functions/api/student.js";
import * as workspace from "./functions/api/workspace.js";

const routes = new Map([
  ["/api/config", config],
  ["/api/account", account],
  ["/api/invites", invites],
  ["/api/invites/validate", inviteValidate],
  ["/api/invites/redeem", inviteRedeem],
  ["/api/invites/release", inviteRelease],
  ["/api/ratings", ratings],
  ["/api/resources", resources],
  ["/api/student", student],
  ["/api/workspace", workspace]
]);

const allowedOrigin = origin => {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.origin === "https://radwanzakaria15-netizen.github.io" ||
      url.hostname === "midad-a6g.pages.dev" ||
      url.hostname.endsWith(".midad-a6g.pages.dev") ||
      url.hostname === "midad-app-preview.radwanzakaria15.workers.dev";
  } catch {
    return false;
  }
};

function withCors(response, origin) {
  if (!allowedOrigin(origin)) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function methodHandler(module, method) {
  const suffix = method.charAt(0) + method.slice(1).toLowerCase();
  return module["onRequest" + suffix] || module.onRequest || null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (url.pathname.startsWith("/api/")) {
      if (request.method === "OPTIONS") {
        return withCors(new Response(null, { status: 204 }), origin);
      }

      const module = routes.get(url.pathname);
      if (!module) return withCors(json({ error: "المسار المطلوب غير موجود." }, 404), origin);

      const handler = methodHandler(module, request.method);
      if (!handler) return withCors(json({ error: "طريقة الطلب غير مدعومة." }, 405), origin);

      try {
        const response = await handler({
          request,
          env,
          params: {},
          waitUntil: promise => promise,
          passThroughOnException: () => {},
          next: async () => new Response(null, { status: 404 })
        });
        return withCors(response, origin);
      } catch (error) {
        console.error("Midad API error:", error);
        return withCors(json({ error: "حدث خطأ داخلي أثناء معالجة الطلب." }, 500), origin);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
