-- Fix infinite recursion (54001 stack depth exceeded) on RLS evaluation.
-- is_admin()/is_student() SELECT public.users, whose RLS policies call
-- is_admin() again. Make them SECURITY DEFINER to bypass RLS during eval.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() ->> 'app_role') = 'admin'
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    ),
    false
  );
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() ->> 'app_role') = 'student'
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'student'
    ),
    false
  );
$$;

create or replace function public.is_student_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_student() or public.is_admin();
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_student() from public;
revoke all on function public.is_student_or_admin() from public;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_student() to authenticated;
grant execute on function public.is_student_or_admin() to authenticated;
