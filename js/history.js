// SugarMax AI — history.html logic

let allScans = [];

function renderScans(scans) {
  const list = document.getElementById("history-list");
  if (scans.length === 0) {
    list.innerHTML = `<div class="card text-center"><p class="mt-0">No scans found.</p></div>`;
    return;
  }
  list.innerHTML = scans
    .map((scan) => {
      const foods = Array.isArray(scan.detected_foods) ? scan.detected_foods.join(", ") : "Meal scan";
      const date = new Date(scan.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      const badge =
        scan.status === "completed"
          ? `<span class="badge badge-honey">${scan.sugar_g ?? "—"}g sugar</span>`
          : scan.status === "failed"
          ? `<span class="badge badge-outline">Failed</span>`
          : `<span class="badge badge-outline">Processing</span>`;
      return `
      <div class="card mt-16 flex justify-between items-center" style="gap:16px;flex-wrap:wrap;">
        <a href="results.html?id=${scan.id}" style="text-decoration:none;color:inherit;flex:1;min-width:200px;">
          <div style="font-weight:600;">${foods}</div>
          <div class="muted" style="font-size:0.85rem;">${date}</div>
        </a>
        <div class="flex items-center gap-16">
          ${badge}
          <button class="btn btn-outline btn-sm" data-delete="${scan.id}">Delete</button>
        </div>
      </div>`;
    })
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
