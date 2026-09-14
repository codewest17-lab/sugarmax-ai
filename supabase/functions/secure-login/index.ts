// SugarMax AI — secure-login edge function
// A free-tier-compatible substitute for Supabase's Password Verification
// Attempt Auth Hook (that hook requires a Teams/Enterprise plan). This
// function sits in front of the normal sign-in call: it checks a lockout
// table BEFORE ever calling Supabase Auth, so a brute-force attempt never
// even reaches the Auth API once locked out.
//
// 5 failed attempts within 15 minutes locks that email out for 15 minutes,
// even if a later attempt happens to guess the right password.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Lockout thresholds (5 attempts / 15-minute window / 15-minute lockout)
// live in the check_login_lockout / record_login_attempt Postgres functions,
// not here — this file just calls them.

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

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);

  try {
    const { email, password } = await req.json();
    if (!email || !password) return json({ error: "Email and password are required" }, 400, corsHeaders);

    const normalizedEmail = String(email).trim().toLowerCase();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fast lock check BEFORE calling Supabase Auth at all.
    const { data: lockCheck } = await admin.rpc("check_login_lockout", { p_email: normalizedEmail });
    if (lockCheck?.locked) {
      const secondsLeft = Math.ceil((new Date(lockCheck.locked_until).getTime() - Date.now()) / 1000);
      const minutesLeft = Math.max(1, Math.ceil(secondsLeft / 60));
      return json(
        { error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` },
        429,
        corsHeaders
      );
    }

    // Not locked out — attempt the real sign-in via the normal Auth API,
    // using the anon key exactly as the client would have done directly.
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });

    // Atomically record the result — row-level locking inside this RPC
    // means concurrent attempts against the same email can't race past
    // the counter, unlike a JS-side read-then-write would allow.
    await admin.rpc("record_login_attempt", { p_email: normalizedEmail, p_success: !error });

    if (error) {
      return json({ error: error.message }, 401, corsHeaders);
    }

    return json({
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
    }, 200, corsHeaders);
  } catch (err) {
    console.error("secure-login error:", err);
    return json({ error: "Internal error", details: String(err) }, 500, corsHeaders);
  }
});
