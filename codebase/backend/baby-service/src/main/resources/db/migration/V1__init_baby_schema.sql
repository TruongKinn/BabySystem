create table if not exists babies (
    id bigserial primary key,
    family_id bigint not null,
    name varchar(120) not null,
    birth_date date not null,
    gender varchar(16) not null,
    notes varchar(600),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists baby_logs (
    id bigserial primary key,
    baby_id bigint not null,
    log_type varchar(32) not null,
    value numeric(10,2),
    note varchar(500),
    logged_at timestamptz not null,
    created_at timestamptz not null default now(),
    constraint fk_baby_logs_baby foreign key (baby_id) references babies(id) on delete cascade
);

create table if not exists vaccinations (
    id bigserial primary key,
    baby_id bigint not null,
    vaccine_name varchar(160) not null,
    due_date date not null,
    completed boolean not null default false,
    completed_at timestamptz,
    notes varchar(500),
    created_at timestamptz not null default now(),
    constraint fk_vaccinations_baby foreign key (baby_id) references babies(id) on delete cascade
);

create table if not exists growth_records (
    id bigserial primary key,
    baby_id bigint not null,
    measured_at date not null,
    weight_kg numeric(5,2),
    height_cm numeric(5,2),
    head_circumference_cm numeric(5,2),
    notes varchar(500),
    created_at timestamptz not null default now(),
    constraint fk_growth_records_baby foreign key (baby_id) references babies(id) on delete cascade
);

create index if not exists idx_babies_family_id on babies(family_id);
create index if not exists idx_baby_logs_baby_id on baby_logs(baby_id);
create index if not exists idx_baby_logs_logged_at on baby_logs(logged_at);
create index if not exists idx_vaccinations_baby_id on vaccinations(baby_id);
create index if not exists idx_vaccinations_due_date on vaccinations(due_date);
create index if not exists idx_growth_records_baby_id on growth_records(baby_id);
