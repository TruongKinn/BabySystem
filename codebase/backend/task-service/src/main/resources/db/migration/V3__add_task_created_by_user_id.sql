alter table tasks
    add column if not exists created_by_user_id bigint;

create index if not exists idx_tasks_created_by_user_id
    on tasks(created_by_user_id);
