import { createClient } from "npm:@supabase/supabase-js@2"
import { ensureAllowedOrigin, getCorsHeaders } from "../_shared/cors.ts"
import { isUuid, LONG_BAN_DURATION } from "../_shared/helpers.ts"

async function getAdminContext(req: Request) {
  const corsHeaders = getCorsHeaders(req)
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return { error: new Response(JSON.stringify({ error: "Нет авторизации." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) }
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: userData, error: userError } = await supabaseUser.auth.getUser()
  if (userError || !userData.user) {
    return { error: new Response(JSON.stringify({ error: "Недействительная сессия." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) }
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, status, is_active")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle()

  if (!adminProfile || adminProfile.role !== "admin" || adminProfile.status !== "approved" || !adminProfile.is_active) {
    return { error: new Response(JSON.stringify({ error: "Недостаточно прав." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) }
  }

  return { supabaseAdmin, adminProfile, user: userData.user }
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

  const context = await getAdminContext(req)
  if ("error" in context) {
    return context.error
  }

  const { supabaseAdmin, adminProfile } = context
  const body = await req.json()
  const requestId = String(body.requestId || "").trim()
  const action = String(body.action || "").trim()

  if (!requestId || !isUuid(requestId) || !["approve", "reject"].includes(action)) {
    return new Response(JSON.stringify({ error: "Некорректный запрос." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const { data: requestRow } = await supabaseAdmin
    .from("registration_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle()

  if (!requestRow) {
    return new Response(JSON.stringify({ error: "Заявка не найдена." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  if (requestRow.status !== "pending") {
    return new Response(JSON.stringify({ error: "Эта заявка уже обработана." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  if (action === "approve") {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(requestRow.auth_user_id, {
      ban_duration: "none",
      app_metadata: { portal_role: "employee" },
    })

    if (authError) {
      return new Response(JSON.stringify({ error: "Не удалось открыть доступ пользователю." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        status: "approved",
        is_active: true,
      })
      .eq("id", requestRow.profile_id)

    await supabaseAdmin
      .from("registration_requests")
      .update({
        status: "approved",
        reviewed_by: adminProfile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId)

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  await supabaseAdmin.auth.admin.updateUserById(requestRow.auth_user_id, {
    ban_duration: LONG_BAN_DURATION,
  })

  await supabaseAdmin
    .from("profiles")
    .update({
      status: "rejected",
      is_active: false,
    })
    .eq("id", requestRow.profile_id)

  await supabaseAdmin
    .from("registration_requests")
    .update({
      status: "rejected",
      reviewed_by: adminProfile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
})
