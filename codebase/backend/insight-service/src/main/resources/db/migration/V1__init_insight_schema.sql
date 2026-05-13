create table if not exists insight_daily_stats (
    id bigserial primary key,
    family_id bigint not null,
    stat_date date not null,
    expense_total numeric(14,2) not null default 0,
    expense_count bigint not null default 0,
    meals_planned bigint not null default 0,
    tasks_created bigint not null default 0,
    tasks_completed bigint not null default 0,
    baby_sleep_hours numeric(10,2) not null default 0,
    baby_feedings bigint not null default 0,
    diaper_changes bigint not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_insight_daily_family_date unique (family_id, stat_date)
);

create index if not exists idx_insight_daily_family_id on insight_daily_stats(family_id);
create index if not exists idx_insight_daily_stat_date on insight_daily_stats(stat_date);
