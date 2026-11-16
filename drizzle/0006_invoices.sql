alter table public.invoices add column if not exists paid_method text;
--> statement-breakpoint
alter table public.invoices add column if not exists paid_reference text;
--> statement-breakpoint
alter table public.invoices add column if not exists voided_at timestamptz;
--> statement-breakpoint

-- An invoice is a frozen copy of what the customer approved. Only its payment status moves.
create or replace function public.guard_invoice_update() returns trigger
language plpgsql as $$
begin
  if new.org_id is distinct from old.org_id
     or new.quote_id is distinct from old.quote_id
     or new.invoice_number is distinct from old.invoice_number
     or new.issue_date is distinct from old.issue_date
     or new.total_cents is distinct from old.total_cents
     or new.document_snapshot is distinct from old.document_snapshot then
    raise exception 'an issued invoice cannot be edited' using errcode = '23514';
  end if;
  if new.status is distinct from old.status and not (
       (old.status = 'unpaid' and new.status in ('paid', 'void'))
    or (old.status = 'paid'   and new.status = 'unpaid')
  ) then
    raise exception 'illegal invoice status change: % -> %', old.status, new.status using errcode = '23514';
  end if;
  return new;
end $$;
--> statement-breakpoint
create trigger invoices_guard before update on public.invoices
  for each row execute function public.guard_invoice_update();
--> statement-breakpoint
create or replace function public.guard_invoice_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'invoices are never deleted; void it instead' using errcode = '23514';
end $$;
--> statement-breakpoint
create trigger invoices_no_delete before delete on public.invoices
  for each row execute function public.guard_invoice_delete();
--> statement-breakpoint

-- Invoice an approved quote: numbered, snapshotted from what the customer approved, and the quote moves to invoiced.
create or replace function public.create_invoice(
  p_quote_id uuid,
  p_invoice_id uuid,
  p_issue_date date,
  p_due_date date
) returns text
language plpgsql security invoker set search_path = public as $$
declare
  q public.quotes%rowtype;
  num text;
  snap jsonb;
  total bigint;
begin
  select * into q from public.quotes where id = p_quote_id for update;
  if not found then
    raise exception 'quote not found' using errcode = 'P0002';
  end if;
  if q.status <> 'approved' then
    raise exception 'only an approved quote can be invoiced (this one is %)', q.status using errcode = '23514';
  end if;
  if q.document_snapshot is null then
    raise exception 'quote has no snapshot' using errcode = '23514';
  end if;
  if p_due_date is not null and p_due_date < p_issue_date then
    raise exception 'the due date is before the issue date' using errcode = '23514';
  end if;
  total := (q.document_snapshot #>> '{totals,totalCents}')::bigint;
  if total is null then
    raise exception 'quote snapshot has no total' using errcode = '23514';
  end if;

  num := public.next_invoice_number(q.org_id);
  snap := jsonb_set(q.document_snapshot, '{invoice}',
    jsonb_build_object('number', num, 'issueDate', p_issue_date, 'dueDate', p_due_date));

  insert into public.invoices (id, org_id, quote_id, invoice_number, issue_date, due_date, total_cents, document_snapshot)
  values (p_invoice_id, q.org_id, q.id, num, p_issue_date, p_due_date, total, snap);

  update public.quotes set status = 'invoiced' where id = q.id;
  insert into public.quote_events (org_id, quote_id, type, actor_type, actor_user_id, payload)
  values (q.org_id, q.id, 'invoiced', 'staff', auth.uid(), jsonb_build_object('invoice_number', num));

  return num;
end $$;
--> statement-breakpoint

create or replace function public.set_invoice_status(
  p_invoice_id uuid,
  p_status public.invoice_status,
  p_method text,
  p_reference text
) returns void
language plpgsql security invoker set search_path = public as $$
declare inv public.invoices%rowtype;
begin
  select * into inv from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'invoice not found' using errcode = 'P0002';
  end if;
  update public.invoices set
    status = p_status,
    paid_at = case when p_status = 'paid' then now() when p_status = 'unpaid' then null else paid_at end,
    paid_method = case when p_status = 'paid' then nullif(left(btrim(coalesce(p_method, '')), 60), '') else null end,
    paid_reference = case when p_status = 'paid' then nullif(left(btrim(coalesce(p_reference, '')), 120), '') else null end,
    voided_at = case when p_status = 'void' then now() else voided_at end
  where id = p_invoice_id;
  insert into public.quote_events (org_id, quote_id, type, actor_type, actor_user_id, payload)
  values (inv.org_id, inv.quote_id, 'invoice_' || p_status::text, 'staff', auth.uid(),
          jsonb_build_object('invoice_number', inv.invoice_number));
end $$;
--> statement-breakpoint
revoke all on function public.create_invoice(uuid, uuid, date, date), public.set_invoice_status(uuid, public.invoice_status, text, text) from public;
--> statement-breakpoint
grant execute on function public.create_invoice(uuid, uuid, date, date), public.set_invoice_status(uuid, public.invoice_status, text, text) to authenticated;
