-- Explicit privileges for the Data API roles, so nothing depends on the project's
-- "Automatically expose new tables" setting. Row-level security still decides which rows.

grant usage on schema public to anon, authenticated, service_role;
--> statement-breakpoint
revoke all on all tables in schema public from anon;
--> statement-breakpoint
grant select, insert, update, delete on all tables in schema public to authenticated;
--> statement-breakpoint
grant all on all tables in schema public to service_role;
--> statement-breakpoint

-- Defense in depth: the audit trail and customer comments are append-only at the privilege level too.
revoke update, delete on public.quote_events, public.quote_comments from authenticated;
