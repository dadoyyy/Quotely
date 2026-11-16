/*
  Phase 4: the life of a quote after it is sent.

  create_revision copies a sent quote into a new draft with the next version number (same quote
  number, version + 1). Nothing about the old quote changes yet: it is only superseded when the
  revision is actually sent, so the customer is never told "replaced" while the replacement is
  still a draft.

  send_quote is replaced to do that superseding, in the same transaction.

  expire_overdue_quotes marks open quotes past their valid-until date as expired.
*/

create or replace function public.create_revision(
  p_quote_id uuid,
  p_new_id uuid,
  p_issue_date date,
  p_valid_until date
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  src public.quotes%rowtype;
  latest int;
  sec record;
  smap jsonb := '{}'::jsonb;
  new_sec uuid;
begin
  select * into src from public.quotes where id = p_quote_id for update;
  if not found then
    raise exception 'quote not found' using errcode = 'P0002';
  end if;
  if src.status not in ('sent', 'viewed', 'changes_requested', 'rejected', 'expired') then
    raise exception 'a % quote can''t be revised', src.status using errcode = '23514';
  end if;

  select max(version) into latest from public.quotes where root_quote_id = src.root_quote_id;
  if latest > src.version then
    raise exception 'a newer version of this quote already exists' using errcode = '23514';
  end if;

  insert into public.quotes (
    id, org_id, customer_id, root_quote_id, quote_number, version, status, title, scope, terms, notes,
    issue_date, valid_until, vat_rate_bps, customer_is_vat_exempt, deposit_percent_bps, discount_kind,
    discount_value, subtotal_cents, discount_cents, vat_cents, total_cents, deposit_cents, created_by
  ) values (
    p_new_id, src.org_id, src.customer_id, src.root_quote_id, src.quote_number, src.version + 1, 'draft',
    src.title, src.scope, src.terms, src.notes, p_issue_date, p_valid_until, src.vat_rate_bps,
    src.customer_is_vat_exempt, src.deposit_percent_bps, src.discount_kind, src.discount_value,
    src.subtotal_cents, src.discount_cents, src.vat_cents, src.total_cents, src.deposit_cents, auth.uid()
  );

  for sec in select * from public.quote_sections where quote_id = src.id order by position loop
    new_sec := gen_random_uuid();
    smap := smap || jsonb_build_object(sec.id::text, new_sec);
    insert into public.quote_sections (id, org_id, quote_id, position, title)
    values (new_sec, src.org_id, p_new_id, sec.position, sec.title);
  end loop;

  insert into public.quote_lines (
    org_id, quote_id, section_id, position, catalog_item_id, name, description, kind, unit, quantity_milli,
    unit_cost_cents, markup_bps, unit_price_override_cents, unit_price_cents, line_discount_bps, is_taxable
  )
  select
    l.org_id, p_new_id, (smap ->> l.section_id::text)::uuid, l.position, l.catalog_item_id, l.name, l.description,
    l.kind, l.unit, l.quantity_milli, l.unit_cost_cents, l.markup_bps, l.unit_price_override_cents,
    l.unit_price_cents, l.line_discount_bps, l.is_taxable
  from public.quote_lines l where l.quote_id = src.id;

  insert into public.quote_events (org_id, quote_id, type, actor_type, actor_user_id, payload)
  values (src.org_id, p_new_id, 'revision_created', 'staff', auth.uid(),
          jsonb_build_object('from_version', src.version, 'from_quote_id', src.id));

  return p_new_id;
end $$;
--> statement-breakpoint
revoke all on function public.create_revision(uuid, uuid, date, date) from public;
--> statement-breakpoint
grant execute on function public.create_revision(uuid, uuid, date, date) to authenticated, service_role;
--> statement-breakpoint

-- send_quote, now also superseding the version it replaces.
create or replace function public.send_quote(
  p_quote_id uuid,
  p_expected_updated_at timestamptz,
  p_snapshot jsonb,
  p_token_hash text,
  p_expires_at timestamptz
) returns text
language plpgsql security invoker set search_path = public as $$
declare
  q public.quotes%rowtype;
  tz text;
  num text;
  snap jsonb;
  old record;
begin
  select * into q from public.quotes where id = p_quote_id for update;
  if not found then
    raise exception 'quote not found' using errcode = 'P0002';
  end if;
  if q.status <> 'draft' then
    raise exception 'quote % is % and was already sent', p_quote_id, q.status using errcode = '23514';
  end if;
  if q.updated_at <> p_expected_updated_at then
    raise exception 'the quote changed while it was being sent; review it and send again' using errcode = '40001';
  end if;
  if not exists (select 1 from public.quote_lines where quote_id = p_quote_id) then
    raise exception 'add at least one item before sending' using errcode = '23514';
  end if;
  select timezone into tz from public.organizations where id = q.org_id;
  if q.valid_until is not null and q.valid_until < (now() at time zone tz)::date then
    raise exception 'the valid-until date has already passed' using errcode = '23514';
  end if;

  num := coalesce(q.quote_number, public.next_quote_number(q.org_id));
  snap := jsonb_set(jsonb_set(p_snapshot, '{quote,number}', to_jsonb(num)), '{quote,sentAt}', to_jsonb(now()));

  update public.quotes set
    quote_number = num,
    status = 'sent',
    sent_at = now(),
    document_snapshot = snap,
    snapshot_hash = encode(sha256(convert_to(snap::text, 'UTF8')), 'hex')
  where id = p_quote_id;

  -- An earlier, still-open version is replaced: its links stop working and the customer is told so.
  for old in
    select id from public.quotes
    where root_quote_id = q.root_quote_id and version < q.version
      and status in ('sent', 'viewed', 'changes_requested')
    for update
  loop
    update public.quotes set status = 'superseded' where id = old.id;
    update public.quote_share_links set revoked_at = now() where quote_id = old.id and revoked_at is null;
    insert into public.quote_events (org_id, quote_id, type, actor_type, actor_user_id, payload)
    values (q.org_id, old.id, 'superseded', 'staff', auth.uid(), jsonb_build_object('by_version', q.version));
  end loop;

  insert into public.quote_share_links (org_id, quote_id, token_hash, expires_at, created_by)
  values (q.org_id, p_quote_id, p_token_hash, p_expires_at, auth.uid());

  insert into public.quote_events (org_id, quote_id, type, actor_type, actor_user_id, payload)
  values (q.org_id, p_quote_id, 'sent', 'staff', auth.uid(), jsonb_build_object('number', num, 'version', q.version));

  return num;
end $$;
--> statement-breakpoint

-- Open quotes past their valid-until date become expired. p_org limits it to one business (for a
-- signed-in member); with no org it sweeps everything and only a caller without a user may do that
-- (the scheduled job). Returns how many quotes changed.
create or replace function public.expire_overdue_quotes(p_org uuid default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0; r record;
begin
  if p_org is not null and not public.is_org_member(p_org) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_org is null and auth.uid() is not null then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  for r in
    select q.id, q.org_id from public.quotes q
    join public.organizations o on o.id = q.org_id
    where q.status in ('sent', 'viewed', 'changes_requested')
      and q.valid_until is not null
      and q.valid_until < (now() at time zone o.timezone)::date
      and (p_org is null or q.org_id = p_org)
    for update of q
  loop
    update public.quotes set status = 'expired' where id = r.id;
    insert into public.quote_events (org_id, quote_id, type, actor_type)
    values (r.org_id, r.id, 'expired', 'system');
    n := n + 1;
  end loop;
  return n;
end $$;
--> statement-breakpoint
revoke all on function public.expire_overdue_quotes(uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.expire_overdue_quotes(uuid) to authenticated, service_role;
