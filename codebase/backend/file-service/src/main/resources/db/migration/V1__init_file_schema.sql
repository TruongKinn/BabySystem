create table if not exists file_metadata (
    id bigserial primary key,
    family_id bigint not null,
    user_id bigint,
    bucket_name varchar(100) not null,
    object_key varchar(400) not null unique,
    original_file_name varchar(300) not null,
    content_type varchar(120),
    size_bytes bigint not null,
    file_tag varchar(120),
    is_deleted boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_file_metadata_family_id on file_metadata(family_id);
create index if not exists idx_file_metadata_bucket_name on file_metadata(bucket_name);
create index if not exists idx_file_metadata_is_deleted on file_metadata(is_deleted);
