export function widgetCors(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return { "Access-Control-Allow-Origin": origin || "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", "Vary": "Origin" };
}

export function widgetJson(request: Request, body: unknown, init: ResponseInit = {}) {
  return Response.json(body, { ...init, headers: { ...widgetCors(request), ...(init.headers ?? {}) } });
}

export function widgetOptions(request: Request) {
  return new Response(null, { status: 204, headers: widgetCors(request) });
}

export function requestDomain(request: Request) {
  const value = request.headers.get("origin") || request.headers.get("referer");
  if (!value) return "";
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}
