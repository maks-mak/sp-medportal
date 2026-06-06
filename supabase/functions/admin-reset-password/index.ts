import { createClient } from "npm:@supabase/supabase-js@2"
import { ensureAllowedOrigin, getCorsHeaders } from "../_shared/cors.ts"
import { isUuid } from "../_shared/helpers.ts"

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%"
  let password = ""
  crypto.getRandomValues(new Uint32Array(12)).forEach((value) => {
    password += alphabet[value % alphabet.length]
  })
  return password
}

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

  return { supabaseAdmin, adminProfile }
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
    const { supabaseAdmin, adminProfile } = await requireAdmin(req)
    const body = await req.json()
    const requestId = String(body.requestId || "").trim()

    if (!requestId || !isUuid(requestId)) {
      return new Response(JSON.stringify({ error: "Некорректный запрос." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const { data: resetRequest } = await supabaseAdmin
      .from("password_reset_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle()

    if (!resetRequest) {
      return new Response(JSON.stringify({ error: "Запрос не найден." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (resetRequest.status !== "pending") {
      return new Response(JSON.stringify({ error: "Этот запрос уже обработан." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id,auth_user_id,status")
      .eq("login", resetRequest.login)
      .maybeSingle()

    if (!profile || !profile.auth_user_id) {
      return new Response(JSON.stringify({ error: "Пользователь не найден." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const tempPassword = generateTemporaryPassword()

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(profile.auth_user_id, {
      password: tempPassword,
      ban_duration: profile.status === "approved" ? "none" : undefined,
    })

    if (authError) {
      return new Response(JSON.stringify({ error: "Не удалось обновить пароль." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    await supabaseAdmin
      .from("password_reset_requests")
      .update({
        status: "completed",
        reviewed_by: adminProfile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId)

    return new Response(JSON.stringify({ ok: true, temporaryPassword: tempPassword }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown"
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500
    return new Response(JSON.stringify({ error: "Недостаточно прав." }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
