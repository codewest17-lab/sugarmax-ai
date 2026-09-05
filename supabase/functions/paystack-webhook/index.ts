// SugarMax AI — paystack-webhook edge function
// Server-to-server payment confirmation. Unlike the client-side onSuccess
// callback (which can be missed if the user closes the tab/app right after
// paying — very common on mobile), Paystack calls this directly from their
// servers once a transaction settles, so activation never depends on the
// browser staying open.
//
// Configure in Paystack Dashboard -> Settings -> API Keys & Webhooks:
//   Webhook URL: https://wobroovxjugckroijuse.supabase.co/functions/v1/paystack-webhook
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Verifies the `x-paystack-signature` header: HMAC-SHA512 of the raw request
// body, signed with the Paystack secret key. This is what actually proves
// the request came from Paystack and not an attacker spoofing a webhook call.
async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PAYSTACK_SECRET_KEY),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time-ish comparison
  if (computedHex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    const validSignature = await verifySignature(rawBody, signature);
    if (!validSignature) {
      console.error("paystack-webhook: invalid signature — possible spoofed request");
      return json({ error: "Invalid signature" }, 401);
    }

    const event = JSON.parse(rawBody);
    // Always 200 quickly for events we don't act on, so Paystack doesn't retry forever.
    if (event.event !== "charge.success") {
      return json({ received: true });
    }

    const txn = event.data;
    const reference = txn.reference;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .select("*")
      .eq("paystack_reference", reference)
      .single();

    if (paymentErr || !payment) {
      console.error("paystack-webhook: no matching payment row for reference", reference);
      return json({ received: true }); // still 200 — nothing more we can do, avoid retry storms
    }

    // Idempotent — if the client-side verify already handled this, skip.
    if (payment.status === "success") {
      return json({ received: true, already_processed: true });
    }

    if (txn.status !== "success") {
      await supabase.from("payments").update({ status: "failed", paystack_response: txn }).eq("id", payment.id);
      return json({ received: true });
    }

    // Guard against amount tampering — only activate if the paid amount matches what we billed.
    const expectedKobo = Math.round(Number(payment.amount) * 100);
    if (txn.amount !== expectedKobo) {
      console.error("paystack-webhook: amount mismatch", { expected: expectedKobo, got: txn.amount, reference });
      await supabase.from("security_logs").insert({
        user_id: payment.user_id,
        event_type: "payment_amount_mismatch",
        metadata: { reference, expected: expectedKobo, received: txn.amount },
      });
      return json({ received: true });
    }

    await supabase
      .from("payments")
      .update({ status: "success", paystack_response: txn, verified_at: new Date().toISOString() })
      .eq("id", payment.id);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", payment.user_id)
      .single();

    if (sub?.plan === "pro") {
      await supabase.rpc("renew_pro_subscription", { p_user_id: payment.user_id });
    } else {
      await supabase.rpc("activate_pro_subscription", {
        p_user_id: payment.user_id,
        p_customer_code: txn.customer?.customer_code ?? null,
        p_subscription_code: txn.plan_object?.plan_code ?? null,
      });
    }

    await supabase.from("usage_tracking").insert({
      user_id: payment.user_id,
      action: "subscription_activated_via_webhook",
      metadata: { reference },
    });

    return json({ received: true });
  } catch (err) {
    console.error("paystack-webhook error:", err);
    // Still return 200-ish territory is debatable; 500 tells Paystack to retry, which is what we want for real errors.
    return json({ error: "Internal error", details: String(err) }, 500);
  }
});
