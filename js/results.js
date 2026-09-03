// SugarMax AI — results.html logic

(async function init() {
  const session = await requireAuth();
  if (!session) return;

  const scanId = new URLSearchParams(window.location.search).get("id");
  const root = document.getElementById("results-root");
  if (!scanId) {
    root.innerHTML = `<p>No scan specified. <a href="history.html">View your history</a>.</p>`;
    return;
  }

  const { data: scan, error } = await supabaseClient
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .single();

  if (error || !scan) {
    root.innerHTML = `<p>Couldn't find that scan. <a href="history.html">View your history</a>.</p>`;
    return;
  }

  if (scan.status === "failed") {
    root.innerHTML = `
      <h1 style="font-size:1.8rem;">Scan failed</h1>
      <div class="alert alert-error">${scan.error_message || "Something went wrong analyzing this meal."}</div>
      <a href="scan.html" class="btn btn-primary">Try another scan</a>`;
    return;
  }

  if (scan.status !== "completed") {
    root.innerHTML = `
      <h1 style="font-size:1.8rem;">Still processing…</h1>
      <p>This scan hasn't finished yet. Refresh in a moment.</p>
      <button class="btn btn-outline" onclick="location.reload()">Refresh</button>`;
    return;
  }

  const foods = Array.isArray(scan.detected_foods) ? scan.detected_foods.join(", ") : "Meal";
  const confidencePct = scan.confidence_score != null ? Math.round(scan.confidence_score * 100) : null;

  root.innerHTML = `
    <p class="eyebrow-plain">Scan result</p>
    <h1 style="font-size:1.8rem;">${foods}</h1>
    ${scan.portion_estimate ? `<p class="muted">${scan.portion_estimate}</p>` : ""}

    <div class="label-block mt-24">
      <div class="label-row hero">
        <span class="name">Sugar</span>
        <span class="value">${scan.sugar_g != null ? scan.sugar_g + "g" : "—"}</span>
      </div>
      <div class="label-row"><span class="name">Calories</span><span class="value">${scan.calories ?? "—"} kcal</span></div>
      <div class="label-row"><span class="name">Carbohydrates</span><span class="value">${scan.carbs_g ?? "—"}g</span></div>
      <div class="label-row"><span class="name">Protein</span><span class="value">${scan.protein_g ?? "—"}g</span></div>
      <div class="label-row"><span class="name">Fat</span><span class="value">${scan.fat_g ?? "—"}g</span></div>
      <div class="label-row"><span class="name">Fiber</span><span class="value">${scan.fiber_g ?? "—"}g</span></div>
      ${confidencePct != null ? `<div class="label-row"><span class="name">Confidence</span><span class="value">${confidencePct}%</span></div>` : ""}
    </div>

    ${scan.ai_summary ? `<div class="card mt-24"><h3 style="font-size:1rem;">Summary</h3><p class="mt-0">${scan.ai_summary}</p></div>` : ""}
    ${scan.health_insight ? `<div class="card mt-16" style="border-color:var(--honey-deep);"><h3 style="font-size:1rem;">Insight</h3><p class="mt-0">${scan.health_insight}</p></div>` : ""}

    <div class="flex gap-16 mt-24">
      <a href="scan.html" class="btn btn-primary">Scan another meal</a>
      <a href="history.html" class="btn btn-outline">View history</a>
    </div>`;
})();
