-- После того как нужный сотрудник зарегистрируется,
-- замените login ниже на его логин и выполните этот SQL один раз.

update public.profiles
set
    role = 'admin',
    status = 'approved',
    is_active = true
where login = 'admin';
