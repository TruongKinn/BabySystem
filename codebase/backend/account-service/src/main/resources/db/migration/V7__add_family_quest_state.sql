create table if not exists family_quest_states (
    family_id bigint primary key,
    last_claim_date date,
    streak_days integer not null default 0,
    total_points integer not null default 0,
    updated_by_user_id bigint,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fk_family_quest_states_family
        foreign key (family_id) references families(id) on delete cascade,
    constraint chk_family_quest_states_streak_non_negative
        check (streak_days >= 0),
    constraint chk_family_quest_states_total_points_non_negative
        check (total_points >= 0)
);

create index if not exists idx_family_quest_states_updated_at
    on family_quest_states(updated_at desc);
