-- Adds mock subscription storage (no Stripe IDs)

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  plan text,
  status text,
  renewal_date date
);

create index if not exists subscriptions_user_id_idx on subscriptions(user_id);
create index if not exists subscriptions_status_idx on subscriptions(status);

