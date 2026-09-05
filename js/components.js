// SugarMax AI — shared nav + footer, rendered into #nav-root / #footer-root

function logoMark() {
  return `<span class="mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.6 4.9L18.5 9.5l-4.9 1.6L12 16l-1.6-4.9L5.5 9.5l4.9-1.6L12 3z" fill="#0A1912"/></svg></span>`;
}

function renderPublicNav(active, base = "") {
  const root = document.getElementById("nav-root");
  if (!root) return;
  const link = (href, label, key, optional) =>
    `<li${optional ? ' class="nav-optional"' : ""}><a href="${base}${href}" class="${active === key ? "active" : ""}">${label}</a></li>`;
  root.innerHTML = `
    <nav class="nav">
      <div class="nav-inner">
        <a href="${base}index.html" class="nav-logo">${logoMark()}SugarMax<span class="dot">.</span>AI</a>
        <ul class="nav-links">
          ${link("index.html#how-it-works", "How it works", "how", true)}
          ${link("pricing.html", "Pricing", "pricing", true)}
          ${link("auth.html", "Log in", "login", false)}
          <li><a href="${base}auth.html?mode=signup" class="btn btn-primary btn-sm">Start free scan</a></li>
        </ul>
      </div>
    </nav>`;
}

async function renderAppNav(active, base = "") {
  const root = document.getElementById("nav-root");
  if (!root) return;
  const link = (href, label, key, optional) =>
    `<li${optional ? ' class="nav-optional"' : ""}><a href="${base}${href}" class="${active === key ? "active" : ""}">${label}</a></li>`;
  root.innerHTML = `
    <nav class="nav">
      <div class="nav-inner">
        <a href="${base}dashboard.html" class="nav-logo">${logoMark()}SugarMax<span class="dot">.</span>AI</a>
        <ul class="nav-links">
          ${link("dashboard.html", "Dashboard", "dashboard", false)}
          ${link("scan.html", "Scan", "scan", false)}
          ${link("history.html", "History", "history", true)}
          ${link("settings.html", "Settings", "settings", true)}
          <li><a href="#" id="nav-signout" class="btn btn-outline btn-sm">Log out</a></li>
        </ul>
      </div>
    </nav>`;
  document.getElementById("nav-signout")?.addEventListener("click", (e) => {
    e.preventDefault();
    signOut();
  });
}

function renderFooter(base = "") {
  const root = document.getElementById("footer-root");
  if (!root) return;
  const legalBase = base ? "" : "legal/";
  root.innerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="flex justify-between items-center" style="flex-wrap:wrap;gap:12px;">
          <div class="nav-logo">${logoMark()}SugarMax<span class="dot">.</span>AI</div>
          <span class="eyebrow-pill" style="font-size:0.68rem;"><span class="dot"></span>Powered by AI Meal Intelligence</span>
        </div>
        <p class="mt-8" style="max-width:44ch">Scan your meal. Know your sugar. AI-powered nutrition insight for every plate.</p>
        <ul class="footer-links">
          <li><a href="${legalBase}privacy.html">Privacy Policy</a></li>
          <li><a href="${legalBase}terms.html">Terms of Service</a></li>
          <li><a href="${legalBase}cookies.html">Cookie Policy</a></li>
          <li><a href="${legalBase}refunds.html">Refund Policy</a></li>
          <li><a href="${legalBase}data-deletion.html">Data Deletion</a></li>
          <li><a href="${legalBase}contact.html">Contact Support</a></li>
        </ul>
        <div class="flex justify-between items-center mt-24" style="flex-wrap:wrap;gap:12px;border-top:1px solid var(--line-soft);padding-top:18px;">
          <span style="font-size:0.78rem;color:var(--ink-soft);">© 2026 SugarMax AI Inc. All rights reserved.</span>
          <span class="footer-status"><span class="dot"></span>Neural engine active</span>
        </div>
      </div>
    </footer>`;
}
