const allowedOrigins = new Set([
  "https://sp-medportal.ru",
  "https://www.sp-medportal.ru",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
])

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Resource-Policy": "same-site",
}

export const corsHeaders = {
  ...securityHeaders,
  "Access-Control-Allow-Origin": "https://sp-medportal.ru",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
}

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || ""
  const allowOrigin = allowedOrigins.has(origin) ? origin : corsHeaders["Access-Control-Allow-Origin"]

  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": allowOrigin,
  }
}

export function ensureAllowedOrigin(req: Request) {
  const origin = req.headers.get("origin")
  if (!origin) {
    return false
  }
  return allowedOrigins.has(origin)
}
