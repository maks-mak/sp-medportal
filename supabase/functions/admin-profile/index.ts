import { createClient } from "npm:@supabase/supabase-js@2.107.0"
import { ensureAllowedOrigin, getCorsHeaders } from "../_shared/cors.ts"
import { isUuid, LONG_BAN_DURATION, readLimitedJson } from "../_shared/helpers.ts"

const ALLOWED_ROLES = new Set(["employee", "okk_member", "okk_head", "admin"])
const ALLOWED_STATUSES = new Set(["pending", "approved", "blocked", "rejected"])

async function requireAdmin(req: Request) {
  const corsHeaders = getCorsHeaders(req)
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

  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("id,role,status,is_active")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle()

  if (!adminProfile || adminProfile.role !== "admin" || adminProfile.status !== "approved" || !adminProfile.is_active) {
    throw new Error("forbidden")
  }

  return { supabaseAdmin, userId: userData.user.id }
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
    const { supabaseAdmin, userId } = await requireAdmin(req)
    const bodyResult = await readLimitedJson(req)
    if ("error" in bodyResult) {
      return new Response(JSON.stringify({ error: bodyResult.error }), {
        status: bodyResult.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const body = bodyResult.data
    const profileId = String(body.profileId || "").trim()
    const role = String(body.role || "").trim()
    const status = String(body.status || "").trim()

    if (!profileId || !isUuid(profileId) || !role || !status || !ALLOWED_ROLES.has(role) || !ALLOWED_STATUSES.has(status)) {
      return new Response(JSON.stringify({ error: "Некорректный запрос." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id,auth_user_id")
      .eq("id", profileId)
      .maybeSingle()

    if (!profile) {
      return new Response(JSON.stringify({ error: "Пользователь не найден." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (profile.auth_user_id === userId && (role !== "admin" || status !== "approved")) {
      return new Response(JSON.stringify({ error: "Нельзя снять доступ или роль администратора у своей текущей учетной записи." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        role,
        status,
        is_active: status === "approved",
      })
      .eq("id", profileId)

    if (profile.auth_user_id) {
      await supabaseAdmin.auth.admin.updateUserById(profile.auth_user_id, {
        ban_duration: status === "approved" ? "none" : LONG_BAN_DURATION,
        app_metadata: { portal_role: role },
      })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown"
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500
    return new Response(JSON.stringify({ error: "Недостаточно прав." }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
