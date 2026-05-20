alter table users
    add column if not exists date_of_birth date;

create index if not exists idx_users_date_of_birth on users(date_of_birth);
