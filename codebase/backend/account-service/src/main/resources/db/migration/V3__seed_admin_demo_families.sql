insert into users (username, email, display_name)
values
    ('seed_mom_an', 'seed_mom_an@mom.local', 'Nguyen Thi An'),
    ('seed_dad_binh', 'seed_dad_binh@mom.local', 'Tran Van Binh'),
    ('seed_grandma_lan', 'seed_grandma_lan@mom.local', 'Pham Thi Lan'),
    ('seed_mom_hoa', 'seed_mom_hoa@mom.local', 'Le Thi Hoa'),
    ('seed_dad_khanh', 'seed_dad_khanh@mom.local', 'Do Van Khanh'),
    ('seed_caregiver_nhi', 'seed_caregiver_nhi@mom.local', 'Vo Thi Nhi')
on conflict do nothing;

insert into families (name, created_by_user_id)
select 'Gia dinh An Binh', u.id
from users u
where u.username = 'seed_mom_an'
  and not exists (
    select 1
    from families f
    where f.name = 'Gia dinh An Binh'
      and f.created_by_user_id = u.id
);

insert into families (name, created_by_user_id)
select 'Gia dinh Hoa Khanh', u.id
from users u
where u.username = 'seed_mom_hoa'
  and not exists (
    select 1
    from families f
    where f.name = 'Gia dinh Hoa Khanh'
      and f.created_by_user_id = u.id
);

insert into family_members (family_id, user_id, role, relation, parent_user_id)
select f.id, u.id, 'MOM', 'ME', null
from families f
join users u on u.username = 'seed_mom_an'
where f.name = 'Gia dinh An Binh'
  and not exists (
    select 1
    from family_members fm
    where fm.family_id = f.id
      and fm.user_id = u.id
);

insert into family_members (family_id, user_id, role, relation, parent_user_id)
select f.id, u.id, 'DAD', 'BO', null
from families f
join users u on u.username = 'seed_dad_binh'
where f.name = 'Gia dinh An Binh'
  and not exists (
    select 1
    from family_members fm
    where fm.family_id = f.id
      and fm.user_id = u.id
);

insert into family_members (family_id, user_id, role, relation, parent_user_id)
select f.id, u.id, 'GRANDMA', 'BA_NOI', null
from families f
join users u on u.username = 'seed_grandma_lan'
where f.name = 'Gia dinh An Binh'
  and not exists (
    select 1
    from family_members fm
    where fm.family_id = f.id
      and fm.user_id = u.id
);

insert into family_members (family_id, user_id, role, relation, parent_user_id)
select f.id, u.id, 'MOM', 'ME', null
from families f
join users u on u.username = 'seed_mom_hoa'
where f.name = 'Gia dinh Hoa Khanh'
  and not exists (
    select 1
    from family_members fm
    where fm.family_id = f.id
      and fm.user_id = u.id
);

insert into family_members (family_id, user_id, role, relation, parent_user_id)
select f.id, u.id, 'DAD', 'BO', null
from families f
join users u on u.username = 'seed_dad_khanh'
where f.name = 'Gia dinh Hoa Khanh'
  and not exists (
    select 1
    from family_members fm
    where fm.family_id = f.id
      and fm.user_id = u.id
);

insert into family_members (family_id, user_id, role, relation, parent_user_id)
select f.id, caregiver.id, 'CAREGIVER', 'BAO_MAU', mom.id
from families f
join users caregiver on caregiver.username = 'seed_caregiver_nhi'
join users mom on mom.username = 'seed_mom_hoa'
where f.name = 'Gia dinh Hoa Khanh'
  and not exists (
    select 1
    from family_members fm
    where fm.family_id = f.id
      and fm.user_id = caregiver.id
);
