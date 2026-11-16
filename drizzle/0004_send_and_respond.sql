/*
  Phase 3: sending a quote, and the customer's side of it.

  send_quote runs as the signed-in user (row-level security applies). It freezes the quote in one
  transaction: allocates the number, stores the immutable snapshot and its hash, creates the share
  link (only the token's hash is stored), and writes the audit event. If anything fails, nothing
  happened, including the number.

  record_quote_view and respond_to_quote are for the public approval route only. They run as the
  table owner and are executable by service_role alone; the route authorizes by token hash.
*/

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

  insert into public.quote_share_links (org_id, quote_id, token_hash, expires_at, created_by)
  values (q.org_id, p_quote_id, p_token_hash, p_expires_at, auth.uid());

  insert into public.quote_events (org_id, quote_id, type, actor_type, actor_user_id, payload)
  values (q.org_id, p_quote_id, 'sent', 'staff', auth.uid(), jsonb_build_object('number', num));

  return num;
end $$;
--> statement-breakpoint
revoke all on function public.send_quote(uuid, timestamptz, jsonb, text, timestamptz) from public;
--> statement-breakpoint
grant execute on function public.send_quote(uuid, timestamptz, jsonb, text, timestamptz) to authenticated, service_role;
--> statement-breakpoint

-- A new link for a sent quote; every earlier link stops working.
create or replace function public.renew_share_link(
  p_quote_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
) returns void
language plpgsql security invoker set search_path = public as $$
declare q public.quotes%rowtype;
begin
  select * into q from public.quotes where id = p_quote_id for update;
  if not found then
    raise exception 'quote not found' using errcode = 'P0002';
  end if;
  if q.status = 'draft' then
    raise exception 'send the quote first' using errcode = '23514';
  end if;
  update public.quote_share_links set revoked_at = now() where quote_id = p_quote_id and revoked_at is null;
  insert into public.quote_share_links (org_id, quote_id, token_hash, expires_at, created_by)
  values (q.org_id, p_quote_id, p_token_hash, p_expires_at, auth.uid());
  insert into public.quote_events (org_id, quote_id, type, actor_type, actor_user_id, payload)
  values (q.org_id, p_quote_id, 'link_renewed', 'staff', auth.uid(), '{}'::jsonb);
end $$;
--> statement-breakpoint
revoke all on function public.renew_share_link(uuid, text, timestamptz) from public;
--> statement-breakpoint
grant execute on function public.renew_share_link(uuid, text, timestamptz) to authenticated, service_role;
--> statement-breakpoint

/* ------------------------------------------------------------ the customer's side */

-- Record that the customer opened the link. Idempotent within ten minutes so a refresh is not a new view.
create or replace function public.record_quote_view(p_link_id uuid, p_ip text, p_user_agent text)
returns void
language plpgsql security definer set search_path = public as $$
declare l public.quote_share_links%rowtype; q public.quotes%rowtype;
begin
  select * into l from public.quote_share_links where id = p_link_id;
  if not found or l.revoked_at is not null or l.expires_at <= now() then return; end if;
  select * into q from public.quotes where id = l.quote_id for update;
  if q.status = 'draft' then return; end if;

  if q.status = 'sent' then
    update public.quotes set status = 'viewed' where id = q.id;
  end if;
  if not exists (
    select 1 from public.quote_events
    where quote_id = q.id and type = 'viewed' and created_at > now() - interval '10 minutes'
  ) then
    insert into public.quote_events (org_id, quote_id, type, actor_type, actor_label, ip, user_agent)
    values (q.org_id, q.id, 'viewed', 'customer', null, left(p_ip, 64), left(p_user_agent, 300));
  end if;
end $$;
--> statement-breakpoint

-- approve | reject | changes. Allowed once, while the quote is open and not past its valid-until date.
create or replace function public.respond_to_quote(
  p_link_id uuid, p_action text, p_name text, p_note text, p_ip text, p_user_agent text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  l public.quote_share_links%rowtype;
  q public.quotes%rowtype;
  tz text;
  new_status public.quote_status;
  who text := nullif(btrim(coalesce(p_name, '')), '');
  note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into l from public.quote_share_links where id = p_link_id;
  if not found or l.revoked_at is not null or l.expires_at <= now() then
    raise exception 'this link is no longer valid' using errcode = '23514';
  end if;
  select * into q from public.quotes where id = l.quote_id for update;
  if q.status not in ('sent', 'viewed') then
    raise exception 'this quote has already been answered or is no longer open' using errcode = '23514';
  end if;
  select timezone into tz from public.organizations where id = q.org_id;
  if q.valid_until is not null and q.valid_until < (now() at time zone tz)::date then
    raise exception 'this quote has expired' using errcode = '23514';
  end if;

  if p_action = 'approve' then
    if who is null then raise exception 'please type your name to approve' using errcode = '22023'; end if;
    new_status := 'approved';
  elsif p_action = 'reject' then
    if note is null then raise exception 'please tell us why' using errcode = '22023'; end if;
    new_status := 'rejected';
  elsif p_action = 'changes' then
    if note is null then raise exception 'please describe the changes you need' using errcode = '22023'; end if;
    new_status := 'changes_requested';
  else
    raise exception 'unknown action' using errcode = '22023';
  end if;
  if char_length(coalesce(who, '')) > 120 or char_length(coalesce(note, '')) > 2000 then
    raise exception 'that is too long' using errcode = '22023';
  end if;

  update public.quotes set status = new_status, responded_at = now() where id = q.id;

  insert into public.quote_events (org_id, quote_id, type, actor_type, actor_label, payload, ip, user_agent)
  values (q.org_id, q.id, new_status::text, 'customer', who,
          jsonb_build_object('snapshot_hash', q.snapshot_hash), left(p_ip, 64), left(p_user_agent, 300));

  if note is not null then
    insert into public.quote_comments (org_id, quote_id, author_type, author_label, body)
    values (q.org_id, q.id, 'customer', who, note);
  end if;

  return new_status::text;
end $$;
--> statement-breakpoint
revoke all on function public.record_quote_view(uuid, text, text) from public, anon, authenticated;
--> statement-breakpoint
revoke all on function public.respond_to_quote(uuid, text, text, text, text, text) from public, anon, authenticated;
--> statement-breakpoint
grant execute on function public.record_quote_view(uuid, text, text) to service_role;
--> statement-breakpoint
grant execute on function public.respond_to_quote(uuid, text, text, text, text, text) to service_role;
