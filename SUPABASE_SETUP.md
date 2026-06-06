# Быстрый запуск backend для SP MedPortal

Если сайт уже открывает админ-панель, значит фронт и база уже подключены. Осталось вручную добавить серверные функции в Supabase.

## Что уже должно быть
- Выполнен `schema_v1.sql`
- Создан пользователь `admin@users.sp-medportal.local`
- Создан профиль `admin` в `public.profiles`
- Админ входит на `https://sp-medportal.ru/login.html`

## Что осталось
1. Добавить секреты в `Supabase`
2. Создать 4 `Edge Functions`
3. Проверить регистрацию и одобрение заявки

## 1. Секреты
В `Supabase` открой `Edge Functions` → `Secrets` и добавь:

- `SUPABASE_URL` = URL проекта
- `SUPABASE_ANON_KEY` = publishable / anon key проекта
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key проекта

## 2. Функции
В `Supabase` → `Edge Functions` → `Open Editor` создай по очереди 4 функции:

- `submit-registration`
- `admin-registration`
- `admin-profile`
- `admin-reset-password`

Для каждой функции:
- создавай файл `index.ts`
- вставляй код из одноимённого файла в папке `supabase/manual-deploy/`
- публикуй функцию

## Какие файлы копировать
- `supabase/manual-deploy/submit-registration.ts`
- `supabase/manual-deploy/admin-registration.ts`
- `supabase/manual-deploy/admin-profile.ts`
- `supabase/manual-deploy/admin-reset-password.ts`

## 3. Проверка
После публикации функций:
- `register.html` должен принимать заявку
- в админ-панели должна появляться заявка
- одобрение заявки должно открывать доступ сотруднику
- `forgot.html` должен создавать запрос на сброс
- админ должен видеть запрос и выдавать временный пароль
