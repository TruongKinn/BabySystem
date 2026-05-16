alter table family_members
    add column if not exists relation varchar(32) not null default 'THANH_VIEN_KHAC',
    add column if not exists parent_user_id bigint null;

create index if not exists idx_family_members_parent_user_id on family_members(parent_user_id);
