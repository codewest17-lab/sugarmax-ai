// SugarMax AI — shared nav + footer, rendered into #nav-root / #footer-root

function renderPublicNav(active, base = "") {
  const root = document.getElementById("nav-root");
  if (!root) return;
  const link = (href, label, key) =>
    `<a href="${base}${href}" class="${active === key ? "active" : ""}">${label}</a>`;
  root.innerHTML = `
    <nav class="nav">
      <div class="nav-inner">
        <a href="${base}index.html" class="nav-logo">SugarMax<span class="dot">.</span>AI</a>
        <ul class="nav-links">
          <li>${link("index.html#how-it-works", "How it works", "how")}</li>
          <li>${link("pricing.html", "Pricing", "pricing")}</li>
          <li>${link("auth.html", "Log in", "login")}</li>
          <li><a href="${base}auth.html?mode=signup" class="btn btn-primary btn-sm">Start free scan</a></li>
        </ul>
      </div>
    </nav>`;
}

async function renderAppNav(active, base = "") {
  const root = document.getElementById("nav-root");
  if (!root) return;
  const link = (href, label, key) =>
    `<a href="${base}${href}" class="${active === key ? "active" : ""}">${label}</a>`;
  root.innerHTML = `
    <nav class="nav">
      <div class="nav-inner">
        <a href="${base}dashboard.html" class="nav-logo">SugarMax<span class="dot">.</span>AI</a>
        <ul class="nav-links">
          <li>${link("dashboard.html", "Dashboard", "dashboard")}</li>
          <li>${link("scan.html", "Scan", "scan")}</li>
          <li>${link("history.html", "History", "history")}</li>
          <li>${link("settings.html", "Settings", "settings")}</li>
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
        <div class="nav-logo">SugarMax<span class="dot">.</span>AI</div>
        <p class="mt-8" style="max-width:44ch">Scan your meal. Know your sugar. AI-powered nutrition insight for every plate.</p>
        <ul class="footer-links">
          <li><a href="${legalBase}privacy.html">Privacy Policy</a></li>
          <li><a href="${legalBase}terms.html">Terms of Service</a></li>
          <li><a href="${legalBase}cookies.html">Cookie Policy</a></li>
          <li><a href="${legalBase}refunds.html">Refund Policy</a></li>
          <li><a href="${legalBase}data-deletion.html">Data Deletion</a></li>
          <li><a href="${legalBase}contact.html">Contact Support</a></li>
        </ul>
      </div>
    </footer>`;
}
