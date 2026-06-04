create table if not exists baby_forecast_snapshots (
    id bigserial primary key,
    baby_id bigint not null,
    family_id bigint not null,
    forecast_date date not null,
    generated_at timestamptz not null,
    horizon_hours integer not null,
    sleep_window_start timestamptz,
    sleep_window_end timestamptz,
    feeding_window_start timestamptz,
    feeding_window_end timestamptz,
    risk_level varchar(16) not null,
    summary varchar(1000) not null,
    recommendations_json text,
    signals_json text,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint fk_baby_forecast_snapshots_baby foreign key (baby_id) references babies(id) on delete cascade
);

create index if not exists idx_baby_forecast_snapshots_baby_generated on baby_forecast_snapshots(baby_id, generated_at desc);
create index if not exists idx_baby_forecast_snapshots_family_generated on baby_forecast_snapshots(family_id, generated_at desc);
create index if not exists idx_baby_forecast_snapshots_baby_date on baby_forecast_snapshots(baby_id, forecast_date);

create table if not exists baby_forecast_anomalies (
    id bigserial primary key,
    baby_id bigint not null,
    family_id bigint not null,
    source_log_id bigint,
    anomaly_type varchar(64) not null,
    severity varchar(16) not null,
    message varchar(1000) not null,
    detected_at timestamptz not null,
    resolved_at timestamptz,
    metadata_json text,
    constraint fk_baby_forecast_anomalies_baby foreign key (baby_id) references babies(id) on delete cascade,
    constraint fk_baby_forecast_anomalies_log foreign key (source_log_id) references baby_logs(id) on delete set null
);

create index if not exists idx_baby_forecast_anomalies_baby_detected on baby_forecast_anomalies(baby_id, detected_at desc);
create index if not exists idx_baby_forecast_anomalies_family_detected on baby_forecast_anomalies(family_id, detected_at desc);
create index if not exists idx_baby_forecast_anomalies_source_log on baby_forecast_anomalies(source_log_id);
create index if not exists idx_baby_forecast_anomalies_open on baby_forecast_anomalies(baby_id, resolved_at);

create table if not exists baby_forecast_processed_messages (
    id bigserial primary key,
    message_id varchar(120) not null,
    queue_name varchar(120) not null,
    processed_at timestamptz not null,
    constraint uq_baby_forecast_processed_messages unique (message_id, queue_name)
);
