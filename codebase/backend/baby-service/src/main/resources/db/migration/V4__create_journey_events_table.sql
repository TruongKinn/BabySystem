create table if not exists journey_events (
    id           varchar(36)  primary key,
    baby_id      bigint       not null,
    title        varchar(120) not null,
    story        varchar(2000),
    happened_at  timestamptz  not null,
    type         varchar(16)  not null,
    privacy      varchar(16)  not null default 'FAMILY',
    source       varchar(16)  not null default 'MANUAL',
    source_ref   varchar(120),
    capsule_open_at timestamptz,
    recipient    varchar(120),
    created_at   timestamptz  not null default now(),
    created_by   varchar(120),
    constraint fk_journey_events_baby foreign key (baby_id) references babies(id) on delete cascade
);

create index if not exists idx_journey_events_baby_id on journey_events(baby_id);
create index if not exists idx_journey_events_happened_at on journey_events(happened_at);
create index if not exists idx_journey_events_type on journey_events(type);
