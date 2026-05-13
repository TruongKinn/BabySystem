create table if not exists shopping_lists (
    id bigserial primary key,
    family_id bigint not null,
    name varchar(160) not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists shopping_items (
    id bigserial primary key,
    list_id bigint not null,
    item_name varchar(180) not null,
    quantity varchar(80),
    is_checked boolean not null default false,
    note varchar(500),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fk_shopping_items_list foreign key (list_id) references shopping_lists(id) on delete cascade
);

create index if not exists idx_shopping_lists_family_id on shopping_lists(family_id);
create index if not exists idx_shopping_items_list_id on shopping_items(list_id);
create index if not exists idx_shopping_items_checked on shopping_items(is_checked);
