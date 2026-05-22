create table if not exists insight_export_files (
    id bigserial primary key,
    family_id bigint not null,
    report_month varchar(7) not null,
    file_name varchar(180) not null,
    password_hash varchar(128) not null,
    password_salt varchar(64) not null,
    password_algorithm varchar(80) not null,
    password_masked varchar(24) not null,
    file_size_bytes bigint not null,
    exported_by_user_id bigint,
    created_at timestamptz not null default now(),
    constraint uq_insight_export_files_file_name unique (file_name)
);

create index if not exists idx_insight_export_files_family_month
    on insight_export_files(family_id, report_month);

create index if not exists idx_insight_export_files_user_created_at
    on insight_export_files(exported_by_user_id, created_at);

create index if not exists idx_insight_export_files_created_at
    on insight_export_files(created_at);
