// SugarMax AI — paystack-init edge function
// Initializes a Paystack transaction for the Pro plan upgrade.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const PRO_PLAN_AMOUNT_NGN = 100; // TEMP: testing price — restore to 3000 before real launch

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

    const user = userData.user;
    const { callback_url } = await req.json();

    // Paystack amounts are in the smallest currency unit — kobo for NGN
    const amountInSubunits = Math.round(PRO_PLAN_AMOUNT_NGN * 100);
    const reference = `sugarmax_${user.id.slice(0, 8)}_${Date.now()}`;

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountInSubunits,
        currency: "NGN",
        reference,
        callback_url: callback_url ?? undefined,
        metadata: { user_id: user.id, plan: "pro" },
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackRes.ok || !paystackData.status) {
      console.error("paystack-init: Paystack rejected request:", JSON.stringify(paystackData));
      return json({ error: "Could not initialize payment", details: paystackData }, 502);
    }

    // Record a pending payment row before redirecting the user
    await supabase.from("payments").insert({
      user_id: user.id,
      paystack_reference: reference,
      amount: PRO_PLAN_AMOUNT_NGN,
      currency: "NGN",
      status: "pending",
      plan: "pro",
    });

    return json({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference,
    });
  } catch (err) {
    console.error("paystack-init error:", err);
    return json({ error: "Internal error", details: String(err) }, 500);
  }
});
