create table if not exists baby_log_comments (
    id bigserial primary key,
    baby_log_id bigint not null,
    user_id bigint not null,
    content varchar(1000) not null,
    created_at timestamptz not null default now(),
    constraint fk_baby_log_comments_log foreign key (baby_log_id) references baby_logs(id) on delete cascade
);

create index if not exists idx_baby_log_comments_log_id on baby_log_comments(baby_log_id);
create index if not exists idx_baby_log_comments_created_at on baby_log_comments(created_at);
