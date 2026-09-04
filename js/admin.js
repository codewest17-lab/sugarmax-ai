// SugarMax AI — admin/index.html logic
// Requires the logged-in user's profile to have is_admin = true.

function fmtMoney(n) {
  return `₦${Number(n || 0).toLocaleString()}`;
}
function fmtDate(d) {
  return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

(async function init() {
  const root = document.getElementById("admin-root");

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "../auth.html";
    return;
  }

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("is_admin, full_name")
    .eq("id", session.user.id)
    .single();

  if (!profile?.is_admin) {
    root.innerHTML = `
      <h1 style="font-size:1.8rem;">Not authorized</h1>
      <p>This page is for SugarMax AI administrators only.</p>
      <a href="../dashboard.html" class="btn btn-primary">Back to dashboard</a>`;
    return;
  }

  // ---- Aggregate stats ----
  const { data: stats, error: statsError } = await supabaseClient.rpc("get_admin_stats");

  if (statsError) {
    root.innerHTML = `<div class="alert alert-error">Couldn't load admin stats: ${statsError.message}</div>`;
    return;
  }

  // ---- Recent payments ----
  const { data: payments } = await supabaseClient
    .from("payments")
    .select("id, amount, currency, status, paystack_reference, created_at, user_id, profiles(email)")
    .order("created_at", { ascending: false })
    .limit(10);

  // ---- Recent security logs ----
  const { data: securityLogs } = await supabaseClient
    .from("security_logs")
    .select("id, event_type, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(10);

  root.innerHTML = `
    <h1 style="font-size:1.9rem;">Admin dashboard</h1>
    <p class="muted">Signed in as ${profile.full_name || session.user.email}</p>

    <div class="grid-3 mt-24">
      <div class="label-block">
        <div class="label-row hero"><span class="name">Total users</span><span class="value">${stats.total_users}</span></div>
      </div>
      <div class="label-block">
        <div class="label-row hero"><span class="name">Active subscribers</span><span class="value">${stats.active_subscribers}</span></div>
      </div>
      <div class="label-block">
        <div class="label-row hero"><span class="name">Revenue (30d)</span><span class="value">${fmtMoney(stats.revenue_this_month)}</span></div>
      </div>
    </div>

    <div class="label-block mt-24">
      <div class="label-row thick"><span class="name" style="font-family:var(--font-display);font-size:1.05rem;color:var(--ink);">System snapshot</span><span></span></div>
      <div class="label-row"><span class="name">Total scans processed</span><span class="value">${stats.total_scans}</span></div>
      <div class="label-row"><span class="name">Scans today</span><span class="value">${stats.scans_today}</span></div>
      <div class="label-row"><span class="name">Total revenue (all-time)</span><span class="value">${fmtMoney(stats.total_revenue)}</span></div>
      <div class="label-row"><span class="name">Failed payments</span><span class="value">${stats.failed_payments}</span></div>
    </div>

    <div class="mt-40">
      <h2 style="font-size:1.2rem;">Recent payments</h2>
      <div id="payments-list" class="mt-16"></div>
    </div>

    <div class="mt-40">
      <h2 style="font-size:1.2rem;">Security logs</h2>
      <div id="security-list" class="mt-16"></div>
    </div>
  `;

  // Render payments
  const paymentsList = document.getElementById("payments-list");
  if (!payments || payments.length === 0) {
    paymentsList.innerHTML = `<p class="muted">No payments yet.</p>`;
  } else {
    paymentsList.innerHTML = payments
      .map((p) => {
        const statusBadge =
          p.status === "success" ? "badge-honey" : p.status === "failed" ? "badge-outline" : "badge-outline";
        return `
        <div class="card mt-8 flex justify-between items-center" style="padding:14px 20px;">
          <div>
            <div style="font-weight:600;">${p.profiles?.email || p.user_id}</div>
            <div class="muted" style="font-size:0.8rem;">${p.paystack_reference} · ${fmtDate(p.created_at)}</div>
          </div>
          <div class="flex items-center gap-16">
            <span>${fmtMoney(p.amount)}</span>
            <span class="badge ${statusBadge}">${p.status}</span>
          </div>
        </div>`;
      })
      .join("");
  }

  // Render security logs
  const securityList = document.getElementById("security-list");
  if (!securityLogs || securityLogs.length === 0) {
    securityList.innerHTML = `<p class="muted">No security events logged.</p>`;
  } else {
    securityList.innerHTML = securityLogs
      .map(
        (log) => `
        <div class="card mt-8" style="padding:14px 20px;">
          <div class="flex justify-between items-center">
            <span style="font-weight:600;">${log.event_type}</span>
            <span class="muted" style="font-size:0.8rem;">${fmtDate(log.created_at)}</span>
          </div>
        </div>`
      )
      .join("");
  }
})();
