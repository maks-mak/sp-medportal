import { createClient } from "npm:@supabase/supabase-js@2.107.0"
import { ensureAllowedOrigin, getCorsHeaders } from "../_shared/cors.ts"
import { readLimitedJson, validatePasswordResetPayload } from "../_shared/helpers.ts"

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

    const parsed = validatePasswordResetPayload(payloadResult.data)
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

    const { data: existingRequest } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id")
      .eq("login", parsed.login)
      .eq("status", "pending")
      .maybeSingle()

    if (existingRequest) {
      return new Response(JSON.stringify({ error: "Запрос на сброс уже отправлен и ожидает обработки." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { error: insertError } = await supabaseAdmin
      .from("password_reset_requests")
      .insert({
        login: parsed.login,
        department_name: parsed.departmentName,
        note: parsed.note,
        status: "pending",
      })

    if (insertError) {
      const isDuplicate = /duplicate|unique|already/i.test(insertError.message || "")
      return new Response(
        JSON.stringify({
          error: isDuplicate
            ? "Запрос на сброс уже отправлен и ожидает обработки."
            : "Не удалось отправить запрос на восстановление.",
        }),
        {
          status: isDuplicate ? 409 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    return new Response(JSON.stringify({ ok: true }), {
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
