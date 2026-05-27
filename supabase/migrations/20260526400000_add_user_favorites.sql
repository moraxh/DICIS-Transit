create table public.user_favorites (
  user_id uuid not null references public.users(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, route_id)
);

alter table public.user_favorites enable row level security;

create policy user_favorites_select_own_or_admin
on public.user_favorites for select to authenticated
using (public.is_admin() or user_id = auth.uid());

create policy user_favorites_insert_own
on public.user_favorites for insert to authenticated
with check (public.is_student_or_admin() and user_id = auth.uid());

create policy user_favorites_delete_own
on public.user_favorites for delete to authenticated
using (user_id = auth.uid());

create index idx_user_favorites_user on public.user_favorites(user_id);
