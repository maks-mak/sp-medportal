# SP MedPortal

Статический каркас нового портала сотрудников без зависимости от `Google Apps Script`.

## Что уже есть

- `index.html` — стартовая страница портала
- `login.html` — новая страница входа
- `dashboard.html` — демо-кабинет сотрудника
- `assets/app.js` — временная клиентская авторизация через `localStorage`
- `assets/site.css` — единый стиль для всех страниц

## Как это работает сейчас

Сайт полностью статический и может размещаться на:

- `GitHub Pages`
- `Cloudflare Pages`
- `Vercel`

Вход сейчас работает в двух режимах:

- основной режим: `Supabase Auth`, если заполнен файл `assets/config.js`
- временный режим: локальный вход `admin`, пока `Supabase` еще не подключен

Это позволяет уже сейчас пользоваться сайтом и безболезненно перейти на настоящую авторизацию.

## Следующий этап

Для прод-версии стоит заменить демо-вход на один из вариантов:

1. `Supabase Auth + Supabase Database`
2. `Cloudflare Pages + Workers + D1`
3. `Next.js + Vercel + PostgreSQL`

## Как включить настоящий вход через Supabase

1. Создать проект в `Supabase`
2. Включить `Email Auth`
3. Создать администратора, например `admin@sp-medportal.ru`
4. Заполнить `assets/config.js`:

```js
window.SP_MEDPORTAL_CONFIG = {
    supabaseUrl: "https://your-project-id.supabase.co",
    supabaseAnonKey: "your-public-anon-key"
};
```

5. Перезалить сайт

## Что советую дальше

1. Оставить этот репозиторий как фронтенд-основу
2. Перенести сайт с `GitHub Pages` на `Cloudflare Pages`
3. Подключить реальную авторизацию
4. Добавить роли: врач, медсестра, администратор
5. После этого переносить документы, уведомления и реестры
