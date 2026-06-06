# Быстрый запуск backend для SP MedPortal

Боевой backend состоит из SQL-схемы, секретов проекта и четырёх `Edge Functions`.

## Что уже должно быть
- Выполнен `schema_v1.sql`
- Создан пользователь `admin@users.sp-medportal.local`
- Создан профиль `admin` в `public.profiles`
- Админ входит на `https://sp-medportal.ru/login.html`

## Что осталось после изменения backend
1. Проверить секреты в `Supabase`
2. Задеплоить 4 `Edge Functions` из папки `supabase/functions`
3. Проверить регистрацию, одобрение заявки и сброс пароля

## 1. Секреты
В `Supabase` открой `Edge Functions` → `Secrets` и добавь:

- `SUPABASE_URL` = URL проекта
- `SUPABASE_ANON_KEY` = publishable / anon key проекта
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key проекта

## 2. Функции
Источник функций находится только здесь:

- `submit-registration`
- `admin-registration`
- `admin-profile`
- `admin-reset-password`

Деплой выполняется через Supabase CLI:

```bash
read -s SUPABASE_ACCESS_TOKEN
export SUPABASE_ACCESS_TOKEN
for fn in submit-registration admin-registration admin-profile admin-reset-password; do
  .tools/supabase functions deploy "$fn" --project-ref pgifephtehfyfzgpbelu
done
unset SUPABASE_ACCESS_TOKEN
```

Так токен не попадает в текст команды. После деплоя проверь, что `Origin: null` больше не разрешается.

## 3. Проверка
После публикации функций:
- `register.html` должен принимать заявку
- в админ-панели должна появляться заявка
- одобрение заявки должно открывать доступ сотруднику
- `forgot.html` должен создавать запрос на сброс
- админ должен видеть запрос и выдавать временный пароль
