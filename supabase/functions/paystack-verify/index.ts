// SugarMax AI — paystack-verify edge function
// Verifies a Paystack transaction reference and activates/renews Pro on success.
// Designed to be safe to call multiple times (idempotent) — duplicate verifications
// of an already-`success` payment are no-ops.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);
    const userId = userData.user.id;

    const { reference } = await req.json();
    if (!reference) return json({ error: "reference is required" }, 400);

    // Load our payment record and confirm ownership
    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .select("*")
      .eq("paystack_reference", reference)
      .eq("user_id", userId)
      .single();
    if (paymentErr || !payment) return json({ error: "Payment record not found" }, 404);

    // Idempotency: already processed, don't re-charge scans/renew again
    if (payment.status === "success") {
      return json({ success: true, already_processed: true });
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.status) {
      await supabase.from("payments").update({ status: "failed", paystack_response: verifyData }).eq("id", payment.id);
      return json({ error: "Verification request failed" }, 502);
    }

    const txn = verifyData.data;
    const isSuccessful = txn.status === "success";

    await supabase
      .from("payments")
      .update({
        status: isSuccessful ? "success" : "failed",
        paystack_response: txn,
        verified_at: isSuccessful ? new Date().toISOString() : null,
      })
      .eq("id", payment.id);

    if (!isSuccessful) {
      await supabase.from("security_logs").insert({
        user_id: userId,
        event_type: "payment_verification_failed",
        metadata: { reference, gateway_status: txn.status },
      });
      return json({ success: false, status: txn.status });
    }

    // Determine renewal vs first activation
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", userId)
      .single();

    if (sub?.plan === "pro") {
      await supabase.rpc("renew_pro_subscription", { p_user_id: userId });
    } else {
      await supabase.rpc("activate_pro_subscription", {
        p_user_id: userId,
        p_customer_code: txn.customer?.customer_code ?? null,
        p_subscription_code: txn.plan_object?.plan_code ?? null,
      });
    }

    await supabase.from("usage_tracking").insert({
      user_id: userId,
      action: "subscription_activated",
      metadata: { reference },
    });

    return json({ success: true, plan: "pro" });
  } catch (err) {
    return json({ error: "Internal error", details: String(err) }, 500);
  }
});
