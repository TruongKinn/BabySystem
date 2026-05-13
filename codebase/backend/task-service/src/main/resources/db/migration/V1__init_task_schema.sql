create table if not exists task_categories (
    id bigserial primary key,
    family_id bigint not null,
    name varchar(120) not null,
    color_code varchar(7),
    created_at timestamptz not null default now(),
    constraint uq_task_categories_family_name unique (family_id, name)
);

create table if not exists tasks (
    id bigserial primary key,
    family_id bigint not null,
    title varchar(200) not null,
    description varchar(600),
    category_id bigint,
    status varchar(32) not null,
    assignee_user_id bigint,
    due_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fk_tasks_category foreign key (category_id) references task_categories(id)
);

create table if not exists recurring_tasks (
    id bigserial primary key,
    family_id bigint not null,
    title varchar(200) not null,
    description varchar(600),
    category_id bigint,
    assignee_user_id bigint,
    recurrence_rule varchar(120) not null,
    next_run_at timestamptz,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fk_recurring_tasks_category foreign key (category_id) references task_categories(id)
);

create index if not exists idx_task_categories_family_id on task_categories(family_id);
create index if not exists idx_tasks_family_id on tasks(family_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_due_at on tasks(due_at);
create index if not exists idx_recurring_tasks_family_id on recurring_tasks(family_id);
