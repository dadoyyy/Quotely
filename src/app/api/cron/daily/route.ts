import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { publicEnv } from "@/lib/env";
import { composeDigestEmail } from "@/lib/email-compose";
import { emailConfigured, sendEmail } from "@/lib/email";
import { followUps, type QuoteSummary } from "@/lib/quotes/insights";
import { todayIn } from "@/lib/quotes/model";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * The daily job: mark overdue quotes expired for every business, then email each business a short
 * list of the quotes that need attention. Authorized by CRON_SECRET, not by a user.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: expired, error } = await admin.rpc("expire_overdue_quotes");
  if (error) {
    console.error("[cron] expire", error.code, error.message);
    return NextResponse.json({ error: "expire failed" }, { status: 500 });
  }

  let digests = 0;
  if (emailConfigured()) {
    const { data: orgs } = await admin.from("organizations").select("id, name, email, timezone").not("email", "is", null).limit(500);
    const appUrl = publicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

    for (const org of orgs ?? []) {
      const { data: rows } = await admin
        .from("quotes")
        .select("id, title, quote_number, version, status, total_cents, valid_until, sent_at, responded_at, updated_at, customer_id")
        .eq("org_id", org.id)
        .in("status", ["sent", "viewed", "changes_requested"])
        .limit(1000);
      const items = followUps((rows ?? []) as QuoteSummary[], todayIn(org.timezone)).slice(0, 15);
      if (!items.length || !org.email) continue;

      const ids = [...new Set(items.map((i) => i.quote.customer_id))];
      const { data: customers } = await admin.from("customers").select("id, name").in("id", ids);
      const names = new Map((customers ?? []).map((c) => [c.id, c.name]));

      const mail = composeDigestEmail({
        businessName: org.name,
        dashboardUrl: `${appUrl}/app`,
        items: items.map((i) => ({
          title: i.quote.title || "Untitled",
          number: i.quote.quote_number,
          customerName: names.get(i.quote.customer_id) ?? "Customer",
          reason: i.reason,
          totalCents: i.quote.total_cents,
        })),
      });
      const result = await sendEmail({ to: org.email, ...mail });
      if (result.ok) digests += 1;
    }
  }

  return NextResponse.json({ expired, digests });
}
