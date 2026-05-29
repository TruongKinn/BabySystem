create table if not exists outbox_events (
    id uuid primary key,
    aggregatetype varchar(255) not null,
    aggregateid varchar(255) not null,
    type varchar(255) not null,
    payload jsonb not null,
    timestamp timestamptz not null default now()
);

create index if not exists idx_outbox_events_aggregate on outbox_events(aggregatetype, aggregateid);
create index if not exists idx_outbox_events_timestamp on outbox_events(timestamp);
