create table if not exists expense_proposal_sagas (
    id uuid primary key,
    proposal_id bigint not null,
    family_id bigint not null,
    status varchar(40) not null,
    current_step varchar(80) not null,
    created_expense_id bigint,
    compensation_action varchar(120),
    error_message varchar(1000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_expense_proposal_sagas_proposal_id on expense_proposal_sagas(proposal_id);
create index if not exists idx_expense_proposal_sagas_family_id on expense_proposal_sagas(family_id);
create index if not exists idx_expense_proposal_sagas_status on expense_proposal_sagas(status);
