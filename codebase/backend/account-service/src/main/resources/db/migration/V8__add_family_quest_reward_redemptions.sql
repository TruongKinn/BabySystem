create table if not exists family_quest_reward_redemptions (
    id bigserial primary key,
    family_id bigint not null,
    reward_key varchar(120) not null,
    reward_name varchar(200) not null,
    cost_points integer not null,
    redeemed_by_user_id bigint,
    redeemed_at timestamptz not null default now(),
    constraint fk_family_quest_reward_redemptions_family
        foreign key (family_id) references families(id) on delete cascade,
    constraint chk_family_quest_reward_redemptions_cost_points
        check (cost_points > 0)
);

create index if not exists idx_family_quest_reward_redemptions_family_id
    on family_quest_reward_redemptions(family_id);

create index if not exists idx_family_quest_reward_redemptions_redeemed_at
    on family_quest_reward_redemptions(redeemed_at desc);
