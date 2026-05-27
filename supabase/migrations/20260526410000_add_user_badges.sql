create table public.user_badges (
  user_id uuid not null references public.users(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

alter table public.user_badges enable row level security;

create policy user_badges_select_own_or_admin
on public.user_badges for select to authenticated
using (public.is_admin() or user_id = auth.uid());

create index idx_user_badges_user on public.user_badges(user_id);

-- Grant first_report badge when a user's first report is inserted
create or replace function public.grant_first_report_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only if user has no prior reports
  if (select count(*) from public.reports where user_id = new.user_id) = 1 then
    insert into public.user_badges (user_id, badge_key)
    values (new.user_id, 'first_report')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_grant_first_report_badge
after insert on public.reports
for each row
when (new.user_id is not null)
execute function public.grant_first_report_badge();
