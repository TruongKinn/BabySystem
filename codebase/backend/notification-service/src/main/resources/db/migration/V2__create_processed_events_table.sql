create table if not exists processed_events (
    event_id varchar(100) primary key,
    event_type varchar(150) not null,
    processed_at timestamptz not null default now()
);

create index if not exists idx_processed_events_type on processed_events(event_type);
create index if not exists idx_processed_events_processed_at on processed_events(processed_at);
