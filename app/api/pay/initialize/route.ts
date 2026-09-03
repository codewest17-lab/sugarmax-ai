import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeCharge } from "@/lib/paystack";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Load profile for email + existing sub
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("email, plan")
    .eq("id", user.id)
    .single();
  if (pErr || !profile?.email) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 400 });
  }
  if (profile.plan === "pro") {
    return NextResponse.json({ error: "already_pro" }, { status: 400 });
  }

  // Unique idempotency reference.
  const reference = `SM-${user.id.slice(0, 8)}-${randomUUID().slice(0, 8)}`;

  // Persist pending payment (idempotency + audit trail).
  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({ user_id: user.id, reference, amount: 999, currency: "NGN", status: "initiated" })
    .select("id")
    .single();
  if (payErr) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Amount in minor units (kobo) — 999 kobo = ₦9.99 default fallback; set via env.
  const amountKobo = Number(process.env.PRO_PRICE_KOBO || 999);

  try {
    const init = await initializeCharge({
      email: profile.email,
      amountKobo,
      reference,
      callbackUrl: `${req.nextUrl.origin}/app/billing/callback?reference=${reference}`,
    });
    await admin
      .from("payments")
      .update({ access_code: init.access_code })
      .eq("id", payment.id);

    return NextResponse.json({ ok: true, authorization_url: init.authorization_url, reference });
  } catch (e) {
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    return NextResponse.json({ ok: false, error: "paystack_error" }, { status: 502 });
  }
}