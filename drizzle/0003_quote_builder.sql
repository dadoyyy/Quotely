/*
  Phase 2: the quote builder.

  save_quote_draft replaces a draft's header, sections and lines in ONE transaction, so a failed
  save can never leave a half-written quote. It is SECURITY INVOKER: row-level security still
  decides who may touch which quote, exactly as for a plain update.
*/

create or replace function public.save_quote_draft(
  p_quote_id uuid,
  p_quote jsonb,
  p_sections jsonb,
  p_lines jsonb
) returns void
language plpgsql security invoker set search_path = public as $$
declare
  q public.quotes%rowtype;
begin
  select * into q from public.quotes where id = p_quote_id for update;
  if not found then
    raise exception 'quote not found' using errcode = 'P0002';
  end if;
  if q.status <> 'draft' then
    raise exception 'quote % is % and can no longer be edited; create a revision', p_quote_id, q.status
      using errcode = '23514';
  end if;

  -- Catalog references must belong to the same organization (the FK alone only checks existence).
  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_lines, '[]'::jsonb)) as l(catalog_item_id uuid)
    where l.catalog_item_id is not null
      and not exists (
        select 1 from public.catalog_items c where c.id = l.catalog_item_id and c.org_id = q.org_id
      )
  ) then
    raise exception 'a line refers to a catalog item outside this organization' using errcode = '23503';
  end if;

  update public.quotes set
    customer_id            = (p_quote ->> 'customer_id')::uuid,
    title                  = coalesce(p_quote ->> 'title', ''),
    scope                  = nullif(p_quote ->> 'scope', ''),
    terms                  = nullif(p_quote ->> 'terms', ''),
    notes                  = nullif(p_quote ->> 'notes', ''),
    issue_date             = nullif(p_quote ->> 'issue_date', '')::date,
    valid_until            = nullif(p_quote ->> 'valid_until', '')::date,
    vat_rate_bps           = (p_quote ->> 'vat_rate_bps')::int,
    customer_is_vat_exempt = (p_quote ->> 'customer_is_vat_exempt')::boolean,
    deposit_percent_bps    = (p_quote ->> 'deposit_percent_bps')::int,
    discount_kind          = (p_quote ->> 'discount_kind')::public.discount_kind,
    discount_value         = (p_quote ->> 'discount_value')::bigint,
    subtotal_cents         = (p_quote ->> 'subtotal_cents')::bigint,
    discount_cents         = (p_quote ->> 'discount_cents')::bigint,
    vat_cents              = (p_quote ->> 'vat_cents')::bigint,
    total_cents            = (p_quote ->> 'total_cents')::bigint,
    deposit_cents          = (p_quote ->> 'deposit_cents')::bigint
  where id = p_quote_id;

  -- Replace children: lines first (they reference sections), then sections, then re-insert.
  delete from public.quote_lines where quote_id = p_quote_id;
  delete from public.quote_sections where quote_id = p_quote_id;

  insert into public.quote_sections (id, org_id, quote_id, position, title)
  select s.id, q.org_id, p_quote_id, s.position, coalesce(s.title, '')
  from jsonb_to_recordset(coalesce(p_sections, '[]'::jsonb)) as s(id uuid, position int, title text);

  insert into public.quote_lines (
    id, org_id, quote_id, section_id, position, catalog_item_id, name, description, kind, unit,
    quantity_milli, unit_cost_cents, markup_bps, unit_price_override_cents, unit_price_cents,
    line_discount_bps, is_taxable
  )
  select
    l.id, q.org_id, p_quote_id, l.section_id, l.position, l.catalog_item_id, l.name,
    nullif(l.description, ''), l.kind::public.catalog_kind, l.unit::public.unit_of_measure,
    l.quantity_milli, l.unit_cost_cents, l.markup_bps, l.unit_price_override_cents, l.unit_price_cents,
    l.line_discount_bps, l.is_taxable
  from jsonb_to_recordset(coalesce(p_lines, '[]'::jsonb)) as l(
    id uuid, section_id uuid, position int, catalog_item_id uuid, name text, description text,
    kind text, unit text, quantity_milli bigint, unit_cost_cents bigint, markup_bps int,
    unit_price_override_cents bigint, unit_price_cents bigint, line_discount_bps int, is_taxable boolean
  );
end $$;
--> statement-breakpoint
grant execute on function public.save_quote_draft(uuid, jsonb, jsonb, jsonb) to authenticated, service_role;
--> statement-breakpoint

-- Only drafts can be deleted. (The children guard alone is not enough: on a cascade the parent
-- row is already gone when the child trigger looks up its status.)
create or replace function public.guard_quote_delete() returns trigger
language plpgsql as $$
begin
  if old.status <> 'draft' then
    raise exception 'quote % is % and cannot be deleted', old.id, old.status using errcode = '23514';
  end if;
  return old;
end $$;
--> statement-breakpoint
create trigger quotes_delete_guard before delete on public.quotes
  for each row execute function public.guard_quote_delete();
