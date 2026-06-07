import { createClient } from "npm:@supabase/supabase-js@2.107.0"
import { ensureAllowedOrigin, getCorsHeaders } from "../_shared/cors.ts"

const QUALITY_ROLES = new Set(["okk_member", "okk_head", "admin"])

function getHttpsSecret(name: string) {
  const value = String(Deno.env.get(name) || "").trim()
  if (!value) {
    return ""
  }

  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : ""
  } catch (_error) {
    return ""
  }
}

async function requireApprovedProfile(req: Request) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    throw new Error("unauthorized")
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: userData } = await supabaseUser.auth.getUser()
  if (!userData.user) {
    throw new Error("unauthorized")
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id,role,status,is_active")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle()

  if (!profile || profile.status !== "approved" || !profile.is_active) {
    throw new Error("forbidden")
  }

  return profile
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders })
  }

  if (!ensureAllowedOrigin(req)) {
    return new Response(JSON.stringify({ error: "Недопустимый источник запроса." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const profile = await requireApprovedProfile(req)
    const links = {
      documents: getHttpsSecret("PORTAL_DOCUMENTS_URL"),
      adverseEvent: getHttpsSecret("PORTAL_ADVERSE_EVENT_URL"),
      qualityWorkbook: QUALITY_ROLES.has(profile.role) ? getHttpsSecret("PORTAL_QUALITY_WORKBOOK_URL") : "",
    }

    return new Response(JSON.stringify({ links }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown"
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500

    return new Response(JSON.stringify({ error: "Недостаточно прав." }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
