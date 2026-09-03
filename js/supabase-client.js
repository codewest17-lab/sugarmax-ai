// SugarMax AI — Supabase client (public anon key only; safe for browser use)
const SUPABASE_URL = "https://wobroovxjugckroijuse.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvYnJvb3Z4anVnY2tyb2lqdXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzODQ3MzgsImV4cCI6MjEwMzk2MDczOH0.ScG027w_2MxDa-caevhMbD06jwurPF-KmpQNYdXyH1M";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Paystack public key — replace with your live/test key from the Paystack dashboard
const PAYSTACK_PUBLIC_KEY = "pk_live_324cf3b977f4f16b4182b6e282055cabbc78fef4";

/** Redirect to /auth.html if there is no active session. Returns the session or null. */
async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "auth.html";
    return null;
  }
  return session;
}

/** Fetch the caller's profile + subscription in one go. */
async function getUserContext(userId) {
  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabaseClient.from("profiles").select("*").eq("id", userId).single(),
    supabaseClient.from("subscriptions").select("*").eq("user_id", userId).single(),
  ]);
  return { profile, subscription };
}

async function signOut() {
  await supabaseClient.auth.signOut();
  const base = window.location.pathname.includes("/admin/") ? "../" : "";
  window.location.href = base + "index.html";
}
