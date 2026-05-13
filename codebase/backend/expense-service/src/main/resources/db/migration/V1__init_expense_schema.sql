create table if not exists expense_categories (
    id bigserial primary key,
    family_id bigint not null,
    name varchar(100) not null,
    color_code varchar(7),
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    constraint uq_expense_category_family_name unique (family_id, name)
);

create table if not exists budgets (
    id bigserial primary key,
    family_id bigint not null,
    month_key varchar(7) not null,
    limit_amount numeric(14,2) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_budget_family_month unique (family_id, month_key)
);

create table if not exists expenses (
    id bigserial primary key,
    family_id bigint not null,
    category_id bigint not null,
    amount numeric(14,2) not null,
    currency varchar(3) not null,
    note varchar(500),
    spent_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fk_expense_category foreign key (category_id) references expense_categories(id)
);

create index if not exists idx_expense_categories_family_id on expense_categories(family_id);
create index if not exists idx_budgets_family_id on budgets(family_id);
create index if not exists idx_expenses_family_id on expenses(family_id);
create index if not exists idx_expenses_category_id on expenses(category_id);
create index if not exists idx_expenses_spent_at on expenses(spent_at);
