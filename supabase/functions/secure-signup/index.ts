// SugarMax AI — secure-signup edge function
// A free-tier-compatible substitute for Supabase's "leaked password
// protection" (that feature requires a Pro plan or above). This function
// checks the chosen password against HaveIBeenPwned's Pwned Passwords API
// — the exact same database Supabase's paid feature checks against — BEFORE
// calling Supabase Auth, so a breached password never even gets accepted.
//
// Uses the k-anonymity model: only the first 5 characters of the SHA-1
// hash are ever sent to HaveIBeenPwned. The real password, and even its
// full hash, never leave this function.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

async function isPasswordPwned(password: string): Promise<boolean> {
  const hashBuffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  if (!res.ok) {
    // If HIBP is unreachable, fail OPEN rather than block every signup —
    // availability of the signup flow matters more than this one extra check.
    console.error("secure-signup: HIBP check failed with status", res.status);
    return false;
  }

  const text = await res.text();
  return text.split("\n").some((line) => line.split(":")[0].trim() === suffix);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);

  try {
    const { email, password, full_name } = await req.json();
    if (!email || !password) return json({ error: "Email and password are required" }, 400, corsHeaders);
    if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400, corsHeaders);

    const pwned = await isPasswordPwned(password);
    if (pwned) {
      return json(
        { error: "This password has appeared in a known data breach. Please choose a different password." },
        400,
        corsHeaders
      );
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await authClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
        emailRedirectTo: `${ALLOWED_ORIGINS[0]}/dashboard.html`,
      },
    });

    if (error) return json({ error: error.message }, 400, corsHeaders);

    return json(
      {
        has_session: !!data.session,
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
      },
      200,
      corsHeaders
    );
  } catch (err) {
    console.error("secure-signup error:", err);
    return json({ error: "Internal error", details: String(err) }, 500, corsHeaders);
  }
});
