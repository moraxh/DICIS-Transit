-- Critical: Enable Row Level Security on previously unprotected sensitive tables
alter table public.users enable row level security;
alter table public.sessions enable row level security;

-- USERS POLICIES --

-- Students and Admins can read their own user record. Admins can read all.
create policy "Users can read own data" 
on public.users 
for select 
to authenticated 
using (id = auth.uid() or public.is_admin());

-- Students and anonymous sessions can insert their own record on login, but ONLY with role 'student' and default score
create policy "Students can insert own user" 
on public.users 
for insert 
to authenticated 
with check (
  id = auth.uid() 
  and role = 'student' 
  and credibility_score = 100
);

-- Users can update parts of their profile? For now, no direct updates allowed for students unless admin.
create policy "Admins can update users"
on public.users
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());


-- SESSIONS POLICIES --

-- A user can see their own sessions. Admins can read all.
create policy "Users can read own sessions"
on public.sessions
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Users can insert their own session ID upon login
create policy "Users can insert own session"
on public.sessions
for insert
to authenticated
with check (user_id = auth.uid());

-- Users can update (upsert) their own session upon resolving fingerprint conflicts
create policy "Users can update own session"
on public.sessions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Prevent any delete operations from client for sessions, only Admins or system TTL
create policy "Admins can delete sessions"
on public.sessions
for delete
to authenticated
using (public.is_admin());