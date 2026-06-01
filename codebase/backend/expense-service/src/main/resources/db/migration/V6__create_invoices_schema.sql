create table if not exists invoices (
    id bigserial primary key,
    family_id bigint not null,
    invoice_no varchar(50) not null,
    issue_date timestamptz not null,
    due_date timestamptz not null,
    currency varchar(3) not null,
    seller_name varchar(150) not null,
    seller_email varchar(100),
    seller_phone varchar(30),
    seller_address varchar(255),
    buyer_name varchar(150) not null,
    buyer_email varchar(100),
    buyer_phone varchar(30),
    buyer_address varchar(255),
    discount_percent numeric(5,2) not null default 0,
    vat_percent numeric(5,2) not null default 0,
    total_amount numeric(14,2) not null,
    notes varchar(1000),
    file_metadata_id varchar(100),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists invoice_items (
    id bigserial primary key,
    invoice_id bigint not null,
    name varchar(150) not null,
    quantity numeric(10,2) not null,
    price numeric(14,2) not null,
    tax numeric(5,2) not null default 0,
    constraint fk_invoice_item_invoice foreign key (invoice_id) references invoices(id) on delete cascade
);

create index if not exists idx_invoices_family_id on invoices(family_id);
create index if not exists idx_invoices_invoice_no on invoices(invoice_no);
create index if not exists idx_invoice_items_invoice_id on invoice_items(invoice_id);
