export const LOGIN_PATTERN = /^[a-z0-9._-]{4,32}$/
export const MIN_PASSWORD_LENGTH = 8
export const MAX_JSON_BODY_BYTES = 16 * 1024
export const LONG_BAN_DURATION = "876000h"
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function buildAuthEmail(login: string) {
  return `${login}@users.sp-medportal.local`
}

export function shortName(fullName: string) {
  const cleaned = String(fullName || "").trim().split(/\s+/)
  if (cleaned.length >= 3) {
    return `${cleaned[1]} ${cleaned[2]}`
  }
  return String(fullName || "").trim()
}

export function isStrongPassword(password: string) {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    /[A-Za-zА-Яа-яЁё]/.test(password) &&
    /\d/.test(password)
  )
}

export function isUuid(value: string) {
  return UUID_PATTERN.test(String(value || "").trim())
}

export function hasJsonContentType(req: Request) {
  return (req.headers.get("content-type") || "").toLowerCase().includes("application/json")
}

export function isRequestBodyTooLarge(req: Request, maxBytes = MAX_JSON_BODY_BYTES) {
  const contentLength = Number(req.headers.get("content-length") || "0")
  return Number.isFinite(contentLength) && contentLength > maxBytes
}

export function validateRegistrationPayload(payload: Record<string, unknown>) {
  const fullName = String(payload.full_name || "").trim()
  const departmentType = String(payload.department_type || "").trim()
  const departmentName = String(payload.department_name || "").trim()
  const position = String(payload.position || "").trim()
  const requestedLogin = String(payload.requested_login || "").trim().toLowerCase()
  const requestedPassword = String(payload.requested_password || "").trim()

  if (!fullName || !departmentType || !departmentName || !position || !requestedLogin || !requestedPassword) {
    return { error: "Заполните все поля формы." }
  }

  if (!LOGIN_PATTERN.test(requestedLogin)) {
    return { error: "Некорректный формат логина." }
  }

  if (fullName.length > 120 || departmentName.length > 120 || position.length > 120) {
    return { error: "Одно из полей слишком длинное." }
  }

  if (!isStrongPassword(requestedPassword)) {
    return { error: "Пароль должен быть не короче 8 символов и содержать хотя бы одну букву и одну цифру." }
  }

  return {
    fullName,
    departmentType,
    departmentName,
    position,
    requestedLogin,
    requestedPassword,
  }
}
