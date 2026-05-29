-- Student login rate limit removed: campus WiFi IP restriction already prevents
-- external abuse, and shared IP caused legitimate students to hit the limit.
drop function if exists public.check_and_increment_login_limit(text);
drop function if exists public.check_and_increment_login_limit(text, text);
drop table if exists public.login_attempts cascade;
