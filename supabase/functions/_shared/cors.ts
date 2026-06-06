const allowedOrigins = new Set([
  "https://sp-medportal.ru",
  "https://www.sp-medportal.ru",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "null",
])

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || ""
  const allowOrigin = allowedOrigins.has(origin) ? origin : "https://sp-medportal.ru"

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}

export function ensureAllowedOrigin(req: Request) {
  const origin = req.headers.get("origin")
  if (!origin) {
    return true
  }
  return allowedOrigins.has(origin)
}
