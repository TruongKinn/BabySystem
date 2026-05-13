create table if not exists meals (
    id bigserial primary key,
    family_id bigint not null,
    name varchar(160) not null,
    meal_type varchar(32) not null,
    description varchar(500),
    created_at timestamptz not null default now(),
    constraint uq_meals_family_name unique (family_id, name)
);

create table if not exists meal_plans (
    id bigserial primary key,
    family_id bigint not null,
    meal_id bigint not null,
    plan_date date not null,
    notes varchar(500),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fk_meal_plans_meal foreign key (meal_id) references meals(id),
    constraint uq_meal_plans unique (family_id, meal_id, plan_date)
);

create index if not exists idx_meals_family_id on meals(family_id);
create index if not exists idx_meal_plans_family_id on meal_plans(family_id);
create index if not exists idx_meal_plans_plan_date on meal_plans(plan_date);
