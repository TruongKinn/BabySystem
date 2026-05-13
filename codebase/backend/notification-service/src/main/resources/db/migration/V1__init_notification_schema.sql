create table if not exists notifications (
    id bigserial primary key,
    family_id bigint not null,
    user_id bigint,
    channel varchar(32) not null,
    type varchar(32) not null,
    title varchar(180) not null,
    message varchar(1000) not null,
    metadata_json text,
    scheduled_at timestamptz not null,
    sent_at timestamptz,
    read_at timestamptz,
    status varchar(32) not null,
    error_message varchar(500),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_family_id on notifications(family_id);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_notifications_status on notifications(status);
create index if not exists idx_notifications_scheduled_at on notifications(scheduled_at);
create index if not exists idx_notifications_read_at on notifications(read_at);
