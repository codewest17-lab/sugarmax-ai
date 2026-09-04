// SugarMax AI — analyze-meal edge function
// Receives a scan_id + signed image path, calls Gemini for meal analysis,
// writes the result to `scans`, and atomically deducts a scan on success.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

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

// Converts an ArrayBuffer to base64 without spreading the whole array as
// function arguments (which overflows the call stack on real photo-sized
// images from a phone camera, typically several MB).
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

const ANALYSIS_PROMPT = `You are a nutrition analysis AI. Analyze the food image provided and respond with ONLY a JSON object, no markdown, no preamble, matching this exact shape:

{
  "detected_foods": ["food item 1", "food item 2"],
  "portion_estimate": "e.g. 1 medium bowl (~350g)",
  "sugar_g": 0,
  "calories": 0,
  "carbs_g": 0,
  "protein_g": 0,
  "fat_g": 0,
  "fiber_g": 0,
  "confidence_score": 0.0,
  "ai_summary": "one or two sentence plain-language summary of the meal",
  "health_insight": "one short actionable insight about the sugar/nutrition content"
}

confidence_score must be between 0 and 1. All numeric nutrition fields are your best estimate in grams (calories in kcal). If the image does not clearly show food, set confidence_score below 0.3 and explain in ai_summary.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Verify the calling user from their JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);
    const userId = userData.user.id;

    const { scan_id } = await req.json();
    if (!scan_id) return json({ error: "scan_id is required" }, 400);

    // Load scan and confirm ownership
    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .select("*")
      .eq("id", scan_id)
      .eq("user_id", userId)
      .single();
    if (scanErr || !scan) return json({ error: "Scan not found" }, 404);

    // Check remaining scans BEFORE calling the AI (fail fast, no wasted API cost)
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("scans_remaining")
      .eq("user_id", userId)
      .single();
    if (!sub || sub.scans_remaining <= 0) {
      await supabase.from("scans").update({ status: "failed", error_message: "No scans remaining" }).eq("id", scan_id);
      return json({ error: "No scans remaining. Please upgrade to Pro." }, 402);
    }

    await supabase.from("scans").update({ status: "processing" }).eq("id", scan_id);

    // Get a signed URL for the private image so Gemini's fetch (via base64 inline) works
    const path = scan.image_url; // stored as storage path, e.g. `${userId}/${filename}`
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("meal-images")
      .download(path);
    if (downloadErr || !fileData) {
      await supabase.from("scans").update({ status: "failed", error_message: "Could not read image" }).eq("id", scan_id);
      return json({ error: "Could not read uploaded image" }, 500);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64Image = arrayBufferToBase64(arrayBuffer);
    const mimeType = fileData.type || "image/jpeg";

    // Call Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: ANALYSIS_PROMPT },
                { inline_data: { mime_type: mimeType, data: base64Image } },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("analyze-meal: Gemini rejected request:", geminiRes.status, errText);
      await supabase.from("scans").update({ status: "failed", error_message: "AI analysis failed" }).eq("id", scan_id);
      return json({ error: "AI analysis failed", details: errText }, 502);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      await supabase.from("scans").update({ status: "failed", error_message: "Empty AI response" }).eq("id", scan_id);
      return json({ error: "AI returned no result" }, 502);
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      await supabase.from("scans").update({ status: "failed", error_message: "Malformed AI response" }).eq("id", scan_id);
      return json({ error: "Could not parse AI result" }, 502);
    }

    // Save results
    await supabase
      .from("scans")
      .update({
        status: "completed",
        detected_foods: parsed.detected_foods ?? [],
        portion_estimate: parsed.portion_estimate ?? null,
        sugar_g: parsed.sugar_g ?? null,
        calories: parsed.calories ?? null,
        carbs_g: parsed.carbs_g ?? null,
        protein_g: parsed.protein_g ?? null,
        fat_g: parsed.fat_g ?? null,
        fiber_g: parsed.fiber_g ?? null,
        confidence_score: parsed.confidence_score ?? null,
        ai_summary: parsed.ai_summary ?? null,
        health_insight: parsed.health_insight ?? null,
      })
      .eq("id", scan_id);

    // Deduct scan atomically ONLY after a successful, saved analysis
    const { data: deducted } = await supabase.rpc("deduct_scan", {
      p_user_id: userId,
      p_scan_id: scan_id,
    });

    await supabase.from("usage_tracking").insert({
      user_id: userId,
      action: "meal_scan_completed",
      metadata: { scan_id, deducted },
    });

    return json({ success: true, scan_id, deducted });
  } catch (err) {
    console.error("analyze-meal error:", err);
    return json({ error: "Internal error", details: String(err) }, 500);
  }
});
