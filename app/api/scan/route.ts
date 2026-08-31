import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeMealImage } from "@/lib/gemini";
import { FREE_LIFETIME_SCANS, PRO_SCANS_PER_MONTH } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 1. Parse & validate the uploaded image -----------------------------------
  let file: File | null = null;
  try {
    const form = await req.formData();
    const candidate = form.get("image");
    if (candidate instanceof File) file = candidate;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_image" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ ok: false, error: "invalid_image" }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ ok: false, error: "unsupported_image" }, { status: 415 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, error: "image_too_large" }, { status: 413 });
  }

  // 2. Quick pre-check (UX only; the atomic consume is the real guard) ---------
  const pre = await preflight(user.id, admin());
  if (!pre.allowed) {
    return NextResponse.json(
      { ok: false, error: pre.reason === "limit" ? "scan_limit_reached" : "free_limit_reached", remaining: pre.remaining },
      { status: 429 }
    );
  }

  // 3. Run AI analysis (no scan consumed yet) ----------------------------------
  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  let analysis;
  try {
    analysis = await analyzeMealImage(base64, file.type);
  } catch (e) {
    console.error("AI analysis failed:", (e as Error).message);
    return NextResponse.json({ ok: false, error: "ai_failed" }, { status: 502 });
  }

  // 4. Atomic scan consumption ------------------------------------------------
  const consume = await consumeScan(user.id, admin());
  if (!consume.allowed) {
    return NextResponse.json(
      { ok: false, error: "scan_limit_reached", remaining: 0 },
      { status: 429 }
    );
  }

  // 5. Persist the meal + foods ------------------------------------------------
  const mealResult = await admin()
    .from("meals")
    .insert({
      user_id: user.id,
      summary: analysis.summary,
      total_sugar_g: analysis.totals.sugar_g,
      total_carbs_g: analysis.totals.carbs_g,
      total_calories: analysis.totals.calories,
      total_protein_g: analysis.totals.protein_g,
      total_fat_g: analysis.totals.fat_g,
      total_fiber_g: analysis.totals.fiber_g,
      confidence: analysis.confidence,
      insights: analysis.insights,
    })
    .select("id")
    .single();

  if (mealResult.error) {
    console.error("meal insert error:", mealResult.error.message);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  const foods = analysis.foods.map((f) => ({
    meal_id: mealResult.data.id,
    name: f.name,
    serving_size: f.serving_size,
    sugar_g: f.sugar_g,
    carbs_g: f.carbs_g,
    calories: f.calories,
    protein_g: f.protein_g,
    fat_g: f.fat_g,
    fiber_g: f.fiber_g,
  }));
  await admin().from("meal_foods").insert(foods);
  await audit(user.id, "scan", admin());

  return NextResponse.json({
    ok: true,
    meal: { id: mealResult.data.id, ...analysis },
    remaining: consume.remaining,
  });
}

// ---- helpers (server-side only, admin client bypasses RLS) ----

function admin() {
  return createAdminClient();
}

async function audit(userId: string, action: string, admin: ReturnType<typeof createAdminClient>) {
  await admin.from("audit_logs").insert({ user_id: userId, action, details: {} });
}

/** Pre-check remaining scans without consuming. */
async function preflight(userId: string, admin: ReturnType<typeof createAdminClient>) {
  const { data: profile } = await admin
    .from("profiles")
    .select("plan, scans_used, scans_allow, pro_renewal")
    .eq("id", userId)
    .single();
  if (!profile) return { allowed: false, remaining: 0, reason: "limit" };
  if (profile.plan === "pro") {
    const remaining = Math.max(0, PRO_SCANS_PER_MONTH - profile.scans_used);
    return { allowed: remaining > 0, remaining, reason: "limit" };
  }
  const remaining = Math.max(0, FREE_LIFETIME_SCANS - (profile.scans_used ?? 0));
  return { allowed: remaining > 0, remaining, reason: "limit" };
}

/** Atomic scan consumption via the SQL function (guards against races). */
async function consumeScan(userId: string, admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin.rpc("consume_scan", { p_user: userId });
  if (error) return { allowed: false, remaining: 0 };
  const allowed = data?.[0]?.allowed === true;
  // Re-read remaining for a truthful response.
  const { data: profile } = await admin
    .from("profiles")
    .select("plan, scans_used, scans_allow")
    .eq("id", userId)
    .single();
  const remaining = profile
    ? Math.max(0, (profile.plan === "pro" ? PRO_SCANS_PER_MONTH : FREE_LIFETIME_SCANS) - profile.scans_used)
    : 0;
  return { allowed, remaining };
}