# Быстрый запуск backend для SP MedPortal

Боевой backend состоит из SQL-схемы, секретов проекта и пяти `Edge Functions`.

## Что уже должно быть
- Выполнен `schema_v1.sql`
- Создан пользователь `admin@users.sp-medportal.local`
- Создан профиль `admin` в `public.profiles`
- Админ входит на `https://sp-medportal.ru/login.html`

## Что осталось после изменения backend
1. Проверить секреты в `Supabase`
2. Задеплоить 5 `Edge Functions` из папки `supabase/functions`
3. Включить серверный сброс пароля в `assets/config.js`
4. Проверить регистрацию, одобрение заявки и сброс пароля

## 1. Секреты
В `Supabase` открой `Edge Functions` → `Secrets` и добавь:

- `SUPABASE_URL` = URL проекта
- `SUPABASE_ANON_KEY` = publishable / anon key проекта
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key проекта

## 2. Функции
Источник функций находится только здесь:

- `submit-registration`
- `submit-password-reset`
- `admin-registration`
- `admin-profile`
- `admin-reset-password`

Деплой выполняется через Supabase CLI:

```bash
./scripts/deploy_supabase_functions.sh
```

Скрипт сам попросит токен скрытым вводом, задеплоит все функции через `--use-api` и удалит токен из окружения после завершения.

Если оборвалась только одна функция, можно повторить её отдельно:

```bash
./scripts/deploy_supabase_functions.sh admin-reset-password
```

Ручной вариант:

```bash
read -s SUPABASE_ACCESS_TOKEN
export SUPABASE_ACCESS_TOKEN
for fn in submit-registration submit-password-reset admin-registration admin-profile admin-reset-password; do
  .tools/supabase functions deploy "$fn" --project-ref pgifephtehfyfzgpbelu --use-api
done
unset SUPABASE_ACCESS_TOKEN
```

Так токен не попадает в текст команды. После деплоя проверь, что `Origin: null` больше не разрешается.

## 3. Включение серверного сброса пароля

До деплоя `submit-password-reset` живой сайт использует временный совместимый режим, чтобы не сломать форму восстановления.

После успешного деплоя функции измени `assets/config.js`:

```js
passwordResetFunctionReady: true
```

Затем выполни актуальный `supabase/schema_v1.sql`: он закрывает прямую вставку в `password_reset_requests` через клиент и оставляет сброс пароля только через Edge Function.

Можно выполнить одной командой:

```bash
./scripts/apply_supabase_schema.sh
```

Скрипт попросит Supabase access token скрытым вводом и применит `supabase/schema_v1.sql` через `Supabase CLI`.

## 4. Проверка
После публикации функций:
- `register.html` должен принимать заявку
- в админ-панели должна появляться заявка
- одобрение заявки должно открывать доступ сотруднику
- `forgot.html` должен создавать запрос на сброс
- админ должен видеть запрос и выдавать временный пароль
