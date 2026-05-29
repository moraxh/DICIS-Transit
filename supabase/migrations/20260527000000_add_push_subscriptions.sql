create table public.push_subscriptions (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references public.users(id) on delete cascade,
  fcm_token             text        not null unique,
  user_agent            text,
  notify_urgent_notices boolean     not null default true,
  notify_route_mods     boolean     not null default true,
  notify_delay_alerts   boolean     not null default true,
  created_at            timestamptz not null default now(),
  last_used_at          timestamptz
);

alter table public.push_subscriptions enable row level security;

create policy push_sub_select_own_or_admin
  on public.push_subscriptions for select to authenticated
  using (public.is_admin() or user_id = auth.uid());

create policy push_sub_insert_own
  on public.push_subscriptions for insert to authenticated
  with check (public.is_student_or_admin() and user_id = auth.uid());

create policy push_sub_update_own
  on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy push_sub_delete_own
  on public.push_subscriptions for delete to authenticated
  using (public.is_admin() or user_id = auth.uid());

create index idx_push_sub_user  on public.push_subscriptions(user_id);
create index idx_push_sub_token on public.push_subscriptions(fcm_token);
