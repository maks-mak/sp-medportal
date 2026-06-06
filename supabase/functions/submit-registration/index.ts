import { createClient } from "npm:@supabase/supabase-js@2.107.0"
import { ensureAllowedOrigin, getCorsHeaders } from "../_shared/cors.ts"
import {
  buildAuthEmail,
  LONG_BAN_DURATION,
  readLimitedJson,
  shortName,
  validateRegistrationPayload,
} from "../_shared/helpers.ts"

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
    const payloadResult = await readLimitedJson(req)
    if ("error" in payloadResult) {
      return new Response(JSON.stringify({ error: payloadResult.error }), {
        status: payloadResult.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const payload = payloadResult.data
    const parsed = validateRegistrationPayload(payload)

    if ("error" in parsed) {
      return new Response(JSON.stringify({ error: parsed.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const authEmail = buildAuthEmail(parsed.requestedLogin)

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("login", parsed.requestedLogin)
      .maybeSingle()

    const { data: existingRequest } = await supabaseAdmin
      .from("registration_requests")
      .select("id,status")
      .eq("requested_login", parsed.requestedLogin)
      .maybeSingle()

    if (existingProfile || (existingRequest && existingRequest.status === "pending")) {
      return new Response(JSON.stringify({ error: "Такой логин уже занят или ожидает одобрения." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: parsed.requestedPassword,
      email_confirm: true,
      ban_duration: LONG_BAN_DURATION,
      user_metadata: {
        login: parsed.requestedLogin,
        full_name: parsed.fullName,
      },
      app_metadata: {
        portal_role: "employee",
      },
    })

    if (createUserError || !createdUser.user) {
      const isDuplicateUser = /already|exists|registered|duplicate/i.test(createUserError?.message || "")
      if (isDuplicateUser) {
        return new Response(JSON.stringify({ error: "Такой логин уже занят или ожидает одобрения." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      return new Response(JSON.stringify({ error: "Не удалось создать учетную запись. Попробуйте позже." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const authUserId = createdUser.user.id

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        auth_user_id: authUserId,
        auth_email: authEmail,
        full_name: parsed.fullName,
        short_name: shortName(parsed.fullName),
        login: parsed.requestedLogin,
        department_type: parsed.departmentType,
        department_name: parsed.departmentName,
        position: parsed.position,
        role: "employee",
        status: "pending",
        is_active: false,
      })
      .select("id")
      .single()

    if (profileError || !profile) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return new Response(JSON.stringify({ error: "Не удалось сохранить заявку. Попробуйте позже." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { error: requestError } = await supabaseAdmin.from("registration_requests").insert({
      profile_id: profile.id,
      auth_user_id: authUserId,
      auth_email: authEmail,
      full_name: parsed.fullName,
      department_type: parsed.departmentType,
      department_name: parsed.departmentName,
      position: parsed.position,
      requested_login: parsed.requestedLogin,
      status: "pending",
    })

    if (requestError) {
      await supabaseAdmin.from("profiles").delete().eq("id", profile.id)
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return new Response(JSON.stringify({ error: "Не удалось сохранить заявку. Попробуйте позже." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ ok: true, message: "Заявка отправлена. Ожидайте одобрения администратора портала." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Внутренняя ошибка сервера." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
