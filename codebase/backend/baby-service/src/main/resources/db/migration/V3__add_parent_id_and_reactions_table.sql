alter table baby_log_comments add column parent_id bigint;
alter table baby_log_comments add constraint fk_baby_log_comments_parent foreign key (parent_id) references baby_log_comments(id) on delete cascade;

create table if not exists baby_log_comment_reactions (
    id bigserial primary key,
    comment_id bigint not null,
    user_id bigint not null,
    reaction_type varchar(32) not null,
    created_at timestamptz not null default now(),
    constraint fk_baby_log_comment_reactions_comment foreign key (comment_id) references baby_log_comments(id) on delete cascade,
    constraint uq_baby_log_comment_reactions_user_comment unique (comment_id, user_id)
);

create index if not exists idx_baby_log_comment_reactions_comment_id on baby_log_comment_reactions(comment_id);
