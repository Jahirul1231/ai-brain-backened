const BACKEND = "https://ai-brain-backened-production.up.railway.app";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  let qs = `?state=${encodeURIComponent(state || "")}`;
  if (code) qs += `&code=${encodeURIComponent(code)}`;
  if (error) qs += `&error=${encodeURIComponent(error)}`;

  // Forward to Railway backend which handles token exchange and returns popup HTML
  const res = await fetch(`${BACKEND}/sheets/callback${qs}`);
  const html = await res.text();

  return new Response(html, {
    status: res.status,
    headers: { "Content-Type": "text/html" },
  });
}
