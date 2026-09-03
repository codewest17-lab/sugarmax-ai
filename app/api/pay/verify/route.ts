import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/paystack";
import { PRO_SCANS_PER_MONTH } from "@/lib/plans";

export const runtime = "nodejs";

/**
 * Independently verify a Paystack transaction and, only if genuinely paid,
 * activate Pro. Idempotent via transaction_locks keyed on the reference.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { reference } = await req.json().catch(() => ({}));
  if (typeof reference !== "string" || !reference) {
    return NextResponse.json({ ok: false, error: "missing_reference" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency: if this reference was already processed, return the prior result.
  const { data: existingLock } = await admin
    .from("transaction_locks")
    .select("status")
    .eq("lock_key", `pay:${reference}`)
    .single();
  if (existingLock?.status === "done") {
    return NextResponse.json({ ok: true, already: true, status: "success" });
  }

  // Claim the lock first (prevents duplicate concurrent processing).
  const lockInsert = await admin
    .from("transaction_locks")
    .insert({ lock_key: `pay:${reference}`, user_id: user.id, status: "pending" });
  if (lockInsert.error) {
    // unique conflict -> already being processed
    return NextResponse.json({ ok: false, error: "processing" }, { status: 409 });
  }

  try {
    // Independent server-side verification (never trust the client).
    const tx = await verifyTransaction(reference);
    if (tx.status !== "success") {
      await admin.from("transaction_locks").update({ status: "done" }).eq("lock_key", `pay:${reference}`);
      await admin.from("payments").update({ status: tx.status, raw: tx as any }).eq("reference", reference);
      return NextResponse.json({ ok: false, error: "payment_not_successful" }, { status: 402 });
    }

    // Verify the payment belongs to this user's email.
    const { data: profile } = await admin.from("profiles").select("email").eq("id", user.id).single();
    if (profile?.email && tx.customer?.email && profile.email.toLowerCase() !== tx.customer.email.toLowerCase()) {
      await admin.from("transaction_locks").update({ status: "done" }).eq("lock_key", `pay:${reference}`);
      return NextResponse.json({ ok: false, error: "payment_mismatch" }, { status: 403 });
    }

    // Activate Pro + grant 200 scans + set renewal (approx 30 days from now).
    const now = new Date();
    const renewal = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await admin
      .from("profiles")
      .update({ plan: "pro", scans_used: 0, scans_allow: PRO_SCANS_PER_MONTH, pro_renewal: renewal })
      .eq("id", user.id);

    await admin
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          plan: "pro",
          status: "active",
          billing_cycle: "monthly",
          renewal_date: renewal,
          provider: "paystack",
          provider_sub_id: `tx_${reference}`,
        },
        { onConflict: "user_id,provider_sub_id", ignoreDuplicates: false }
      );

    await admin
      .from("payments")
      .update({
        status: "success",
        amount: tx.amount,
        currency: tx.currency,
        raw: tx as any,
      })
      .eq("reference", reference);

    await admin.from("transaction_locks").update({ status: "done" }).eq("lock_key", `pay:${reference}`);
    await admin.from("audit_logs").insert({ user_id: user.id, action: "subscription_activate", details: { reference } });

    return NextResponse.json({ ok: true, status: "success" });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("verification failed") || msg.includes("invalid")) {
      await admin.from("transaction_locks").update({ status: "done" }).eq("lock_key", `pay:${reference}`);
      return NextResponse.json({ ok: false, error: "verification_failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}