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

  // Circular gauge — sugar grams against a 40g reference scale (visual only,
  // not a medical claim), matching the reference design's signature element.
  const sugarVal = scan.sugar_g != null ? Number(scan.sugar_g) : 0;
  const gaugeMax = 40;
  const gaugePct = Math.max(0, Math.min(1, sugarVal / gaugeMax));
  const circumference = 2 * Math.PI * 80; // r=80
  const dashOffset = circumference * (1 - gaugePct);

  root.innerHTML = `
    <p class="eyebrow-pill"><span class="dot"></span>Scan result</p>

    <div class="card mt-16" style="display:flex;gap:28px;align-items:center;flex-wrap:wrap;">
      <div style="position:relative;width:180px;height:180px;flex-shrink:0;">
        <svg viewBox="0 0 180 180" width="180" height="180">
          <circle cx="90" cy="90" r="80" fill="none" stroke="#EEF4F0" stroke-width="14"/>
          <circle cx="90" cy="90" r="80" fill="none" stroke="url(#gaugeGrad)" stroke-width="14" stroke-linecap="round"
            stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
            transform="rotate(-90 90 90)" style="transition:stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1);"/>
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#34D399"/>
              <stop offset="1" stop-color="#059669"/>
            </linearGradient>
          </defs>
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
          <span style="font-size:2rem;font-weight:800;line-height:1;color:var(--ink);">${scan.sugar_g ?? "—"}g</span>
          <span style="font-size:0.7rem;color:var(--ink-soft);font-weight:700;margin-top:4px;">SUGAR</span>
        </div>
      </div>
      <div style="flex:1;min-width:220px;">
        <h1 style="font-size:1.6rem;">${foods}</h1>
        ${scan.portion_estimate ? `<p class="muted mt-0">${scan.portion_estimate}</p>` : ""}
        ${confidencePct != null ? `<span class="badge badge-forest">${confidencePct}% confidence</span>` : ""}
      </div>
    </div>

    <div class="label-block mt-24">
      <div class="label-row"><span class="name">Calories</span><span class="value">${scan.calories ?? "—"} kcal</span></div>
      <div class="label-row"><span class="name">Carbohydrates</span><span class="value">${scan.carbs_g ?? "—"}g</span></div>
      <div class="label-row"><span class="name">Protein</span><span class="value">${scan.protein_g ?? "—"}g</span></div>
      <div class="label-row"><span class="name">Fat</span><span class="value">${scan.fat_g ?? "—"}g</span></div>
      <div class="label-row"><span class="name">Fiber</span><span class="value">${scan.fiber_g ?? "—"}g</span></div>
    </div>

    ${scan.ai_summary ? `<div class="card mt-24"><h3 style="font-size:1rem;">Summary</h3><p class="mt-0">${scan.ai_summary}</p></div>` : ""}
    ${scan.health_insight ? `<div class="card mt-16" style="border-color:var(--mint-deep);"><h3 style="font-size:1rem;">Insight</h3><p class="mt-0">${scan.health_insight}</p></div>` : ""}

    <div class="flex gap-16 mt-24">
      <a href="scan.html" class="btn btn-primary">Scan another meal</a>
      <a href="history.html" class="btn btn-outline">View history</a>
    </div>`;
})();
