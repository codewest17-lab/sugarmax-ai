// SugarMax AI — history.html logic

let allScans = [];

function groupByDate(scans) {
  const groups = {};
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  scans.forEach((scan) => {
    const d = new Date(scan.created_at);
    const dayKey = d.toDateString();
    let label;
    if (dayKey === today) label = "Today";
    else if (dayKey === yesterday) label = "Yesterday";
    else label = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

    if (!groups[dayKey]) groups[dayKey] = { label, scans: [] };
    groups[dayKey].scans.push(scan);
  });
  return Object.values(groups);
}

function scanCardHtml(scan) {
  const foods = Array.isArray(scan.detected_foods) ? scan.detected_foods.join(", ") : "Meal scan";
  const time = new Date(scan.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const badge =
    scan.status === "completed"
      ? `<span class="badge badge-forest">${scan.sugar_g ?? "—"}g sugar</span>`
      : scan.status === "failed"
      ? `<span class="badge badge-outline">Failed</span>`
      : `<span class="badge badge-outline">Processing</span>`;
  return `
    <div class="card mt-12 flex justify-between items-center" style="gap:16px;flex-wrap:wrap;">
      <a href="results.html?id=${scan.id}" style="text-decoration:none;color:inherit;flex:1;min-width:200px;">
        <div style="font-weight:700;">${foods}</div>
        <div class="muted" style="font-size:0.85rem;">${time}</div>
      </a>
      <div class="flex items-center gap-16">
        ${badge}
        <button class="btn btn-outline btn-sm" data-delete="${scan.id}">Delete</button>
      </div>
    </div>`;
}

function renderScans(scans) {
  const list = document.getElementById("history-list");
  if (scans.length === 0) {
    list.innerHTML = `<div class="card text-center"><p class="mt-0">No scans found.</p></div>`;
    return;
  }

  const groups = groupByDate(scans);
  list.innerHTML = groups
    .map(
      (g) => `
      <div class="mt-24">
        <div class="flex items-center gap-8" style="margin-bottom:4px;">
          <span style="width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#34D399,#059669);"></span>
          <span style="font-weight:700;font-size:0.9rem;">${g.label}</span>
        </div>
        ${g.scans.map(scanCardHtml).join("")}
      </div>`
    )
    .join("");

  list.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this scan? This can't be undone.")) return;
      const id = btn.getAttribute("data-delete");
      await supabaseClient.from("scans").delete().eq("id", id);
      allScans = allScans.filter((s) => s.id !== id);
      renderScans(allScans);
    });
  });
}

document.getElementById("search-input").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  if (!q) {
    renderScans(allScans);
    return;
  }
  const filtered = allScans.filter((s) => {
    const foods = Array.isArray(s.detected_foods) ? s.detected_foods.join(" ").toLowerCase() : "";
    return foods.includes(q);
  });
  renderScans(filtered);
});

(async function init() {
  const session = await requireAuth();
  if (!session) return;

  const { data: scans, error } = await supabaseClient
    .from("scans")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    document.getElementById("history-list").innerHTML = `<div class="alert alert-error">Couldn't load history.</div>`;
    return;
  }

  allScans = scans || [];
  renderScans(allScans);
})();
