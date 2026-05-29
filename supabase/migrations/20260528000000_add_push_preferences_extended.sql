alter table public.push_subscriptions
  add column notify_report_verified  boolean not null default true,
  add column notify_service_cuts     boolean not null default true,
  add column notify_schedule_changes boolean not null default true,
  add column notify_full_capacity    boolean not null default false,
  add column notify_service_restored boolean not null default true,
  add column notify_weather_alert    boolean not null default false;
