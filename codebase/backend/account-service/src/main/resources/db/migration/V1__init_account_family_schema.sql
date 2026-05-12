create table if not exists users (
    id bigserial primary key,
    username varchar(120) not null unique,
    email varchar(160) not null unique,
    display_name varchar(160) not null,
    created_at timestamptz not null default now()
);

create table if not exists families (
    id bigserial primary key,
    name varchar(160) not null,
    created_by_user_id bigint not null,
    created_at timestamptz not null default now(),
    constraint fk_family_creator foreign key (created_by_user_id) references users(id)
);

create table if not exists family_members (
    id bigserial primary key,
    family_id bigint not null,
    user_id bigint not null,
    role varchar(32) not null,
    joined_at timestamptz not null default now(),
    constraint fk_family_members_family foreign key (family_id) references families(id),
    constraint fk_family_members_user foreign key (user_id) references users(id),
    constraint uq_family_user unique (family_id, user_id)
);

create index if not exists idx_family_members_family_id on family_members(family_id);
create index if not exists idx_family_members_user_id on family_members(user_id);
