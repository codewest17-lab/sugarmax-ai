// SugarMax AI — paystack-init edge function
// Initializes a Paystack transaction for the Pro plan upgrade.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const PRO_PLAN_AMOUNT_USD = 2.99;
const FALLBACK_USD_TO_NGN_RATE = 1450; // used only if the live rate fetch fails

const ALLOWED_ORIGINS = ["https://sugarmaxai-app.netlify.app"];

function getCorsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Fetches today's USD->NGN rate so the $2.99 price stays honest over time
// instead of silently drifting from a hardcoded snapshot. Falls back to a
// fixed rate if the live lookup fails, so checkout never breaks over this.
async function getUsdToNgnRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error(`rate API returned ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.NGN;
    if (typeof rate !== "number" || rate <= 0) throw new Error("NGN rate missing from response");
    return rate;
  } catch (err) {
    console.error("paystack-init: live exchange rate fetch failed, using fallback:", err);
    return FALLBACK_USD_TO_NGN_RATE;
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401, corsHeaders);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401, corsHeaders);

    const user = userData.user;
    const { callback_url } = await req.json();

    const usdToNgnRate = await getUsdToNgnRate();
    const amountNgn = Math.round(PRO_PLAN_AMOUNT_USD * usdToNgnRate);

    // Paystack amounts are in the smallest currency unit — kobo for NGN
    const amountInSubunits = amountNgn * 100;
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
      return json({ error: "Could not initialize payment", details: paystackData }, 502, corsHeaders);
    }

    // Record a pending payment row before redirecting the user
    await supabase.from("payments").insert({
      user_id: user.id,
      paystack_reference: reference,
      amount: amountNgn,
      currency: "NGN",
      status: "pending",
      plan: "pro",
    });

    return json({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference,
      amount_ngn: amountNgn,
      usd_price: PRO_PLAN_AMOUNT_USD,
    }, 200, corsHeaders);
  } catch (err) {
    console.error("paystack-init error:", err);
    return json({ error: "Internal error", details: String(err) }, 500, corsHeaders);
  }
});
