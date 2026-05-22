create table if not exists family_quest_point_grant_logs (
    id bigserial primary key,
    family_id bigint not null,
    points integer not null,
    reason varchar(300),
    granted_by_user_id bigint,
    granted_at timestamptz not null default now(),
    constraint fk_family_quest_point_grant_logs_family
        foreign key (family_id) references families(id) on delete cascade,
    constraint chk_family_quest_point_grant_logs_points_positive
        check (points > 0)
);

create index if not exists idx_family_quest_point_grant_logs_family_id
    on family_quest_point_grant_logs(family_id);

create index if not exists idx_family_quest_point_grant_logs_granted_at
    on family_quest_point_grant_logs(granted_at desc);
