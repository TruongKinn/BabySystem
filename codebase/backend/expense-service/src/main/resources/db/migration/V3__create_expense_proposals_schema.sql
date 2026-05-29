create table if not exists expense_proposals (
    id bigserial primary key,
    family_id bigint not null,
    title varchar(200) not null,
    amount numeric(14,2) not null,
    category_name varchar(100) not null,
    proposed_by varchar(100) not null,
    approver varchar(100) not null,
    status varchar(20) not null default 'PENDING', -- PENDING, APPROVED, REJECTED
    reject_reason varchar(500),
    current_step int not null default 1, -- 1: Reviewing, 2: Final Result
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_expense_proposals_family_id on expense_proposals(family_id);
