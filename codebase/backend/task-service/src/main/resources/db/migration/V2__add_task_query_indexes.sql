create index if not exists idx_tasks_fam_status_due_created
    on tasks(family_id, status, due_at, created_at desc);

create index if not exists idx_tasks_fam_assignee_due_created
    on tasks(family_id, assignee_user_id, due_at, created_at desc);

create index if not exists idx_tasks_fam_status_assignee_due_created
    on tasks(family_id, status, assignee_user_id, due_at, created_at desc);

create index if not exists idx_tasks_fam_unassigned
    on tasks(family_id)
    where assignee_user_id is null;
