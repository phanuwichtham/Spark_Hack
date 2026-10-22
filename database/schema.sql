-- Supabase SQL Editor: run as project owner. Additive/idempotent; no data deletion.
-- Trusted-team prototype: all members can edit the shared demo; only admins reset.
begin;
create table if not exists public.spark_workspaces (
  id text primary key,
  revision bigint not null default 0 check (revision >= 0),
  payload jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table if not exists public.spark_members (
  workspace_id text not null references public.spark_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_role text not null default 'editor' check (team_role in ('admin','editor')),
  primary key (workspace_id,user_id)
);
create table if not exists public.spark_write_log (
  id bigint generated always as identity primary key,
  workspace_id text not null references public.spark_workspaces(id) on delete cascade,
  revision bigint not null,
  actor_id uuid references auth.users(id) on delete set null,
  is_reset boolean not null,
  written_at timestamptz not null default now()
);
alter table public.spark_workspaces enable row level security;
alter table public.spark_members enable row level security;
alter table public.spark_write_log enable row level security;
-- No direct browser table access. Membership checks happen inside narrowly scoped RPCs.
revoke all on public.spark_workspaces,public.spark_members,public.spark_write_log from anon,authenticated;
revoke all on sequence public.spark_write_log_id_seq from anon,authenticated;

create or replace function public.spark_read(p_workspace text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.spark_members where workspace_id=p_workspace and user_id=auth.uid()
  ) then raise exception 'Team membership required' using errcode='42501'; end if;
  select payload into result from public.spark_workspaces where id=p_workspace;
  return result;
end;
$$;

create or replace function public.spark_commit(
  p_workspace text,p_expected_revision bigint,p_state jsonb,p_reset boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare old_revision bigint; old_payload jsonb; role_name text; next_payload jsonb; key_name text;
begin
  select team_role into role_name from public.spark_members
    where workspace_id=p_workspace and user_id=auth.uid();
  if auth.uid() is null or role_name is null then
    raise exception 'Team membership required' using errcode='42501';
  end if;
  select revision,payload into old_revision,old_payload from public.spark_workspaces
    where id=p_workspace for update;
  if not found then raise exception 'Workspace not found'; end if;
  if p_expected_revision is null or p_expected_revision<>old_revision then
    raise exception 'Revision conflict: reload before saving' using errcode='40001';
  end if;
  if (coalesce(p_reset,false) or old_payload is null) and role_name<>'admin' then
    raise exception 'Only a team admin can initialize/reset' using errcode='42501';
  end if;
  if p_state is null or jsonb_typeof(p_state)<>'object' or pg_column_size(p_state)>2000000
    or coalesce(p_state->>'schemaVersion','')<>'1'
    or jsonb_typeof(p_state->'demoNow') is distinct from 'string' then
    raise exception 'Invalid payload' using errcode='22023';
  end if;
  foreach key_name in array array['users','cages','orders','observations','incidents','tasks',
    'plans','lots','deliveries','reservations','offers','financialEntries','audit',
    'notifications','processedActions','products','harvests','qualityChecks','assessments'] loop
    if jsonb_typeof(p_state->key_name) is distinct from 'array' then
      raise exception 'Invalid array: %',key_name using errcode='22023';
    end if;
  end loop;
  if jsonb_array_length(p_state->'users')=0 or jsonb_array_length(p_state->'products')=0 then
    raise exception 'Demo users and products required' using errcode='22023';
  end if;
  -- Server revision cannot be forged. Local role, drafts and result links are never shared.
  next_payload=(p_state-'currentUserId'-'drafts'-'lastResultId') ||
    jsonb_build_object('revision',old_revision+1,'updatedAt',now());
  update public.spark_workspaces set payload=next_payload,revision=old_revision+1,
    updated_at=now(),updated_by=auth.uid() where id=p_workspace;
  insert into public.spark_write_log(workspace_id,revision,actor_id,is_reset)
    values(p_workspace,old_revision+1,auth.uid(),coalesce(p_reset,false));
  return next_payload;
end;
$$;
revoke all on function public.spark_read(text) from public,anon;
revoke all on function public.spark_commit(text,bigint,jsonb,boolean) from public,anon;
grant execute on function public.spark_read(text) to authenticated;
grant execute on function public.spark_commit(text,bigint,jsonb,boolean) to authenticated;
insert into public.spark_workspaces(id) values('spark-team') on conflict(id) do nothing;
commit;
