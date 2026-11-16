-- Row-level security, integrity triggers and numbering. Hand-written; Drizzle only tracks it.
-- Assumes Supabase's `auth` schema (auth.uid(), auth.users) and its roles.

alter table public.memberships
  add constraint memberships_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;
--> statement-breakpoint

/* ------------------------------------------------------------- membership helpers
   SECURITY DEFINER so they can read memberships without recursing into its own policies. */

create or replace function public.is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m where m.org_id = org and m.user_id = auth.uid()
  );
$$;
--> statement-breakpoint
create or replace function public.can_write_org(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = org and m.user_id = auth.uid() and m.role in ('owner', 'staff')
  );
$$;
--> statement-breakpoint
create or replace function public.is_org_owner(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = org and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;
--> statement-breakpoint
revoke all on function public.is_org_member(uuid), public.can_write_org(uuid), public.is_org_owner(uuid) from public;
--> statement-breakpoint
grant execute on function public.is_org_member(uuid), public.can_write_org(uuid), public.is_org_owner(uuid)
  to authenticated, service_role;
--> statement-breakpoint

/* ----------------------------------------------------------------- policies */

alter table public.organizations enable row level security;
--> statement-breakpoint
create policy organizations_select on public.organizations for select to authenticated
  using (public.is_org_member(id));
--> statement-breakpoint
create policy organizations_update on public.organizations for update to authenticated
  using (public.is_org_owner(id)) with check (public.is_org_owner(id));
--> statement-breakpoint

alter table public.memberships enable row level security;
--> statement-breakpoint
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
--> statement-breakpoint
create policy memberships_insert on public.memberships for insert to authenticated
  with check (public.is_org_owner(org_id));
--> statement-breakpoint
create policy memberships_update on public.memberships for update to authenticated
  using (public.is_org_owner(org_id)) with check (public.is_org_owner(org_id));
--> statement-breakpoint
create policy memberships_delete on public.memberships for delete to authenticated
  using (public.is_org_owner(org_id));
--> statement-breakpoint

-- Full read/write tenant tables: members read, owner and staff write.
do $$
declare t text;
begin
  foreach t in array array[
    'customers', 'catalog_items', 'quotes', 'quote_sections', 'quote_lines',
    'quote_attachments', 'quote_share_links', 'invoices'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_org_member(org_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_write_org(org_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_write_org(org_id)) with check (public.can_write_org(org_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_write_org(org_id))', t || '_delete', t);
  end loop;
end $$;
--> statement-breakpoint

-- Append-only tables: the audit trail and the customer's comments are never edited or deleted.
do $$
declare t text;
begin
  foreach t in array array['quote_events', 'quote_comments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_org_member(org_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_write_org(org_id))', t || '_insert', t);
  end loop;
end $$;
--> statement-breakpoint

alter table public.ai_drafts enable row level security;
--> statement-breakpoint
create policy ai_drafts_select on public.ai_drafts for select to authenticated
  using (public.is_org_member(org_id));
--> statement-breakpoint
create policy ai_drafts_insert on public.ai_drafts for insert to authenticated
  with check (public.can_write_org(org_id) and user_id = auth.uid());
--> statement-breakpoint
create policy ai_drafts_update on public.ai_drafts for update to authenticated
  using (public.can_write_org(org_id)) with check (public.can_write_org(org_id));
--> statement-breakpoint

/* ------------------------------------------------------- organization signup */

create or replace function public.create_organization(org_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  insert into public.organizations (name) values (org_name) returning id into new_id;
  insert into public.memberships (org_id, user_id, role) values (new_id, auth.uid(), 'owner');
  return new_id;
end $$;
--> statement-breakpoint
revoke all on function public.create_organization(text) from public;
--> statement-breakpoint
grant execute on function public.create_organization(text) to authenticated, service_role;
--> statement-breakpoint

/* ------------------------------------------------------------------ numbering
   One UPDATE ... RETURNING takes the row lock, so two simultaneous sends cannot share a number. */

create or replace function public.next_quote_number(org uuid) returns text
language plpgsql security definer set search_path = public as $$
declare n integer; pfx text; tz text;
begin
  if not public.can_write_org(org) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.organizations
    set quote_number_next = quote_number_next + 1
    where id = org
    returning quote_number_next - 1, quote_number_prefix, timezone into n, pfx, tz;
  return pfx || '-' || to_char(now() at time zone tz, 'YYYY') || '-' || lpad(n::text, 4, '0');
end $$;
--> statement-breakpoint
create or replace function public.next_invoice_number(org uuid) returns text
language plpgsql security definer set search_path = public as $$
declare n integer; pfx text; tz text;
begin
  if not public.can_write_org(org) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.organizations
    set invoice_number_next = invoice_number_next + 1
    where id = org
    returning invoice_number_next - 1, invoice_number_prefix, timezone into n, pfx, tz;
  return pfx || '-' || to_char(now() at time zone tz, 'YYYY') || '-' || lpad(n::text, 4, '0');
end $$;
--> statement-breakpoint
revoke all on function public.next_quote_number(uuid), public.next_invoice_number(uuid) from public;
--> statement-breakpoint
grant execute on function public.next_quote_number(uuid), public.next_invoice_number(uuid)
  to authenticated, service_role;
--> statement-breakpoint

/* ------------------------------------------------------------ integrity triggers */

-- A sent quote is frozen: its sections and lines can only change while the quote is a draft.
create or replace function public.guard_quote_children() returns trigger
language plpgsql as $$
declare qid uuid; st public.quote_status;
begin
  qid := case when tg_op = 'DELETE' then old.quote_id else new.quote_id end;
  select status into st from public.quotes where id = qid;
  if st is not null and st <> 'draft' then
    raise exception 'quote % is % and can no longer be edited; create a revision', qid, st
      using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
--> statement-breakpoint
create trigger quote_lines_guard before insert or update or delete on public.quote_lines
  for each row execute function public.guard_quote_children();
--> statement-breakpoint
create trigger quote_sections_guard before insert or update or delete on public.quote_sections
  for each row execute function public.guard_quote_children();
--> statement-breakpoint

-- The lifecycle as a state machine, and a snapshot that cannot be rewritten once it exists.
create or replace function public.guard_quote_update() returns trigger
language plpgsql as $$
begin
  if old.document_snapshot is not null
     and new.document_snapshot is distinct from old.document_snapshot then
    raise exception 'the snapshot of a sent quote is immutable' using errcode = '23514';
  end if;
  if new.status is distinct from old.status and not (
       (old.status = 'draft'             and new.status in ('sent'))
    or (old.status = 'sent'              and new.status in ('viewed', 'approved', 'rejected', 'changes_requested', 'expired', 'superseded'))
    or (old.status = 'viewed'            and new.status in ('approved', 'rejected', 'changes_requested', 'expired', 'superseded'))
    or (old.status = 'changes_requested' and new.status in ('expired', 'superseded'))
    or (old.status = 'approved'          and new.status in ('invoiced'))
  ) then
    raise exception 'illegal quote status change: % -> %', old.status, new.status
      using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end $$;
--> statement-breakpoint
create trigger quotes_guard before update on public.quotes
  for each row execute function public.guard_quote_update();
--> statement-breakpoint

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
--> statement-breakpoint
create trigger organizations_touch before update on public.organizations
  for each row execute function public.touch_updated_at();
--> statement-breakpoint
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();
--> statement-breakpoint
create trigger catalog_items_touch before update on public.catalog_items
  for each row execute function public.touch_updated_at();
