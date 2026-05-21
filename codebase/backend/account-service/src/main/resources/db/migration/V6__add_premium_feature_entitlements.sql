create table if not exists premium_features (
    key varchar(120) primary key,
    name varchar(200) not null,
    description varchar(500) not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists family_feature_entitlements (
    id bigserial primary key,
    family_id bigint not null,
    feature_key varchar(120) not null,
    status varchar(16) not null,
    expires_at timestamptz,
    reason varchar(300),
    updated_by_user_id bigint,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fk_family_feature_entitlements_family
        foreign key (family_id) references families(id) on delete cascade,
    constraint fk_family_feature_entitlements_feature
        foreign key (feature_key) references premium_features(key),
    constraint chk_family_feature_entitlements_status
        check (status in ('ALLOW', 'DENY', 'INHERIT')),
    constraint uq_family_feature_entitlements unique (family_id, feature_key)
);

create table if not exists entitlement_audit_logs (
    id bigserial primary key,
    family_id bigint not null,
    feature_key varchar(120) not null,
    old_status varchar(16),
    new_status varchar(16) not null,
    old_expires_at timestamptz,
    new_expires_at timestamptz,
    reason varchar(300),
    changed_by_user_id bigint,
    changed_at timestamptz not null default now(),
    constraint chk_entitlement_audit_old_status
        check (old_status in ('ALLOW', 'DENY', 'INHERIT') or old_status is null),
    constraint chk_entitlement_audit_new_status
        check (new_status in ('ALLOW', 'DENY', 'INHERIT'))
);

create index if not exists idx_family_feature_entitlements_family_id
    on family_feature_entitlements(family_id);
create index if not exists idx_family_feature_entitlements_feature_key
    on family_feature_entitlements(feature_key);
create index if not exists idx_family_feature_entitlements_expires_at
    on family_feature_entitlements(expires_at);
create index if not exists idx_entitlement_audit_logs_family_id
    on entitlement_audit_logs(family_id);
create index if not exists idx_entitlement_audit_logs_changed_at
    on entitlement_audit_logs(changed_at desc);

insert into premium_features (key, name, description)
values ('advanced_growth_tracking', 'Advanced Growth Tracking', 'Growth percentile analysis, trend deltas, and deeper pediatric insights.'),
       ('smart_reminders', 'Smart Reminders', 'Adaptive reminders for care routines, vaccination milestones, and recurring tasks.'),
       ('ai_care_assistant', 'AI Care Assistant', 'Personalized care suggestions based on baby logs and behavior patterns.'),
       ('premium_reports', 'Premium Reports', 'Weekly and monthly reports for sleep, feeding, growth, and care quality.'),
       ('family_collaboration_plus', 'Family Collaboration Plus', 'Advanced caregiver collaboration features and role-based activity visibility.'),
       ('medical_vault_export', 'Medical Vault Export', 'Secure medical history export for clinical visits and family records.'),
       ('unlimited_memory', 'Unlimited Memory', 'Higher limits for baby memories, uploads, and milestone timeline storage.')
on conflict (key) do nothing;
