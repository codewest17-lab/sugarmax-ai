// SugarMax AI — dashboard.html logic

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function scanRowHtml(scan) {
  const foods = Array.isArray(scan.detected_foods) ? scan.detected_foods.join(", ") : "Processing…";
  const sugar = scan.sugar_g != null ? `${scan.sugar_g}g sugar` : scan.status;
  return `
    <a href="results.html?id=${scan.id}" class="card mt-16" style="display:block;text-decoration:none;color:inherit;">
      <div class="flex justify-between items-center">
        <div>
          <div style="font-weight:600;">${foods || "Meal scan"}</div>
          <div class="muted" style="font-size:0.85rem;">${timeAgo(scan.created_at)}</div>
        </div>
        <div class="badge ${scan.status === "completed" ? "badge-honey" : "badge-outline"}">${sugar}</div>
      </div>
    </a>`;
}

(async function init() {
  const session = await requireAuth();
  if (!session) return;
  const userId = session.user.id;

  const { profile, subscription } = await getUserContext(userId);

  document.getElementById("greeting").textContent = profile?.full_name
    ? `Welcome back, ${profile.full_name.split(" ")[0]}`
    : "Welcome back";

  if (subscription) {
    document.getElementById("scans-remaining").textContent = subscription.scans_remaining;
    document.getElementById("plan-name").textContent = subscription.plan === "pro" ? "SugarMax Pro" : "Free";
    document.getElementById("renews-on").textContent = subscription.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString()
      : "—";
    document.getElementById("sub-status").textContent =
      subscription.plan === "pro"
        ? `${subscription.scans_remaining} of ${subscription.scans_limit} scans left this cycle.`
        : `${subscription.scans_remaining} of ${subscription.scans_limit} free scans left.`;
    if (subscription.plan !== "pro") {
      document.getElementById("upgrade-btn").style.display = "inline-flex";
    }
  }

  const { data: scans } = await supabaseClient
    .from("scans")
    .select("id, status, detected_foods, sugar_g, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  const container = document.getElementById("recent-scans");
  if (!scans || scans.length === 0) {
    container.innerHTML = `<div class="card text-center"><p class="mt-0">No scans yet — your first one is free.</p><a href="scan.html" class="btn btn-primary mt-8">Scan your first meal</a></div>`;
  } else {
    container.innerHTML = scans.map(scanRowHtml).join("");
  }
})();
