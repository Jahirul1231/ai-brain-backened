const BACKEND = "https://ai-brain-backened-production.up.railway.app";

async function handler(req, { params }) {
  const { path } = await params;
  const url = `${BACKEND}/${path.join("/")}`;

  const qs = req.url.includes("?") ? "?" + req.url.split("?")[1] : "";

  const headers = { "Content-Type": "application/json" };
  const auth = req.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;

  const init = { method: req.method, headers, redirect: "manual" };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  const res = await fetch(`${url}${qs}`, init);

  // Pass redirects through to the browser (needed for OAuth flow)
  if ([301, 302, 307, 308].includes(res.status)) {
    return new Response(null, {
      status: res.status,
      headers: { Location: res.headers.get("Location") || "/" },
    });
  }

  const contentType = res.headers.get("Content-Type") || "application/json";
  const data = await res.text();

  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": contentType },
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
