(() => {
  "use strict";
  const SUPABASE_URL = "https://dwzbffuzupgjctdkswbq.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_VzlX6SSmCVcGEVG3OWdX3w_XIwNlSM-";
  let supabaseClient = null;
  let session = null;
  let mode = "signin";

  const $ = (selector) => document.querySelector(selector);
  const byId = (id) => document.getElementById(id);
  const setHidden = (id, hidden) => { const el = byId(id); if (el) el.classList.toggle("hidden", hidden); };
  const showMessage = (text, ok = false) => { const el = byId("authMessage"); if (el) { el.textContent = text || ""; el.classList.toggle("ok", ok); } };

  function showAuth(updateHash = true) {
    const auth = byId("auth");
    if (!auth) return;
    auth.classList.remove("hidden");
    auth.setAttribute("aria-hidden", "false");
    document.body.classList.add("auth-open");
    if (updateHash && location.hash !== "#auth") history.replaceState(null, "", "#auth");
    const email = byId("email");
    if (email) setTimeout(() => email.focus(), 0);
  }

  function hideAuth(clearHash = true) {
    const auth = byId("auth");
    if (!auth) return;
    auth.classList.add("hidden");
    auth.setAttribute("aria-hidden", "true");
    document.body.classList.remove("auth-open");
    if (clearHash && location.hash === "#auth") history.replaceState(null, "", location.pathname + location.search);
  }

  function updateAuthMode() {
    const signup = mode === "signup";
    const title = byId("authTitle"), sub = byId("authSub"), submit = byId("emailSubmit"), toggle = byId("toggleAuth");
    if (title) title.textContent = signup ? "Create your account" : "Welcome back";
    if (sub) sub.textContent = signup ? "Create an account and start with 2 free scans." : "Sign in to continue analyzing your food.";
    if (submit) submit.textContent = signup ? "Create account" : "Sign in";
    if (toggle) toggle.textContent = signup ? "I already have an account" : "Create a new account";
  }

  async function oauth(provider) {
    showMessage("");
    if (!supabaseClient) return showMessage("Authentication is not ready. Please refresh and try again.");
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) showMessage(error.message);
  }

  async function ensureProfile() { try { await supabaseClient.rpc("ensure_profile"); } catch (_) {} }

  async function loadQuota() {
    if (!session || !supabaseClient) return;
    const { data, error } = await supabaseClient.from("profiles").select("plan,scans_used,scans_limit").eq("user_id", session.user.id).maybeSingle();
    if (error) return;
    const limit = data?.scans_limit ?? 2, used = data?.scans_used ?? 0, left = Math.max(limit - used, 0);
    const text = byId("quotaText"), bar = byId("quotaBar");
    if (text) text.textContent = `${left} / ${limit}`;
    if (bar) bar.style.width = `${limit ? Math.min(100, (left / limit) * 100) : 0}%`;
  }

  async function loadHistory() {
    if (!session || !supabaseClient) return;
    const box = byId("historyList"); if (!box) return;
    const { data } = await supabaseClient.from("scans").select("food_name,sugar_grams,sugar_percentage,is_good_to_eat,created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(10);
    box.innerHTML = "";
    (data || []).forEach((x) => { const el = document.createElement("div"); el.className = "history-list-item"; el.innerHTML = `<div><strong>${escapeHtml(x.food_name || "Food")}</strong><br><small>${new Date(x.created_at).toLocaleString()}</small></div><div><strong>${Number(x.sugar_grams || 0).toFixed(1)}g</strong><br><small>${Number(x.sugar_percentage || 0).toFixed(1)}% sugar</small></div>`; box.appendChild(el); });
    if (!data?.length) box.innerHTML = "<p class='muted'>No scans yet.</p>";
  }

  async function openApp(s) {
    session = s;
    hideAuth(false);
    setHidden("app", false); setHidden("home", true);
    const how = byId("how"), pricing = byId("pricing"); if (how) how.classList.add("hidden"); if (pricing) pricing.classList.add("hidden");
    await loadQuota(); await loadHistory(); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function logoutUI() { session = null; setHidden("app", true); setHidden("home", false); const how = byId("how"), pricing = byId("pricing"); if (how) how.classList.remove("hidden"); if (pricing) pricing.classList.remove("hidden"); }
  function escapeHtml(v) { return String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }

  async function submitEmail(e) {
    e.preventDefault();
    showMessage("");

    if (!supabaseClient) {
      return showMessage("Authentication is not ready. Please refresh and try again.");
    }

    const email = (byId("email")?.value || "").trim();
    const password = byId("password")?.value || "";

    if (!email) {
      return showMessage("Please enter your email address.");
    }

    if (password.length < 6) {
      return showMessage("Password must be at least 6 characters.");
    }

    const submit = byId("emailSubmit");
    if (submit) {
      submit.disabled = true;
      submit.textContent = mode === "signup" ? "Creating account..." : "Signing in...";
    }

    try {
      if (mode === "signup") {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${window.location.pathname}`
          }
        });

        if (error) throw error;

        if (data?.session) {
          await openApp(data.session);
        } else {
          showMessage(
            "Account created successfully. Check your email and click the confirmation link, then return here to sign in.",
            true
          );
        }
      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        if (data?.session) {
          await openApp(data.session);
        } else {
          showMessage("Login succeeded, but no session was returned. Please try again.");
        }
      }
    } catch (err) {
      console.error("Email authentication error:", err);
      showMessage(err?.message || "Authentication failed. Please try again.");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = mode === "signup" ? "Create account" : "Sign in";
      }
    }
  }

  async function analyze(file) {
    if (!session) return showAuth();
    setHidden("dropZone", true); setHidden("loading", false); setHidden("result", true);
    try {
      const compressed = await compressImage(file, 1280, .82), base64 = await toBase64(compressed.blob);
      const { data, error } = await supabaseClient.functions.invoke("analyze-food-v2", { body: { image_base64: base64, mime_type: "image/jpeg" } });
      if (error) throw error;
      if (data?.error === "SCAN_LIMIT_REACHED") throw new Error("Your free scans are finished. Upgrade to Pro for 100 scans.");
      renderResult(data); await loadQuota(); await loadHistory();
    } catch (e) { renderError(e?.message || "Analysis failed."); }
    finally { setHidden("loading", true); }
  }

  function renderResult(a) { const el = byId("result"); if (!el) return; el.classList.remove("hidden"); el.innerHTML = `<div class="result-head"><div><span class="eyebrow">${a.cached ? "CACHED ANALYSIS" : "AI ANALYSIS"}</span><h3>${escapeHtml(a.food_name || "Food")}</h3><p>Confidence: ${Number(a.confidence || 0).toFixed(0)}%</p></div><div class="score">${Number(a.health_rating || 0).toFixed(1)}/10</div></div><div class="metrics"><div class="metric"><small>Estimated sugar</small><strong>${Number(a.sugar_grams || 0).toFixed(1)}g</strong></div><div class="metric"><small>Sugar percentage</small><strong>${Number(a.sugar_percentage || 0).toFixed(1)}%</strong></div><div class="metric"><small>Assessment</small><strong>${a.is_good_to_eat ? "Good" : "Limit"}</strong></div></div><p><strong>Portion:</strong> ${escapeHtml(a.portion_estimate || "Unknown")}</p><p>${escapeHtml(a.explanation || "")}</p><p><strong>Advice:</strong> ${escapeHtml(a.advice || "")}</p><button class="secondary" id="scanAgain" type="button">Scan another food</button>`; byId("scanAgain")?.addEventListener("click", resetScanner); }
  function renderError(m) { const el = byId("result"); if (!el) return; el.classList.remove("hidden"); el.innerHTML = `<div><span class="eyebrow">NOTICE</span><h3>We couldn't complete the scan</h3><p>${escapeHtml(m)}</p><button class="primary" id="tryAgain" type="button">Try again</button></div>`; byId("tryAgain")?.addEventListener("click", resetScanner); }
  function resetScanner() { setHidden("result", true); setHidden("dropZone", false); const input = byId("fileInput"); if (input) input.value = ""; }
  function compressImage(file, max = 1280, quality = .82) { return new Promise((resolve, reject) => { const img = new Image(), url = URL.createObjectURL(file); img.onload = () => { let w = img.width, h = img.height; if (Math.max(w, h) > max) { const r = max / Math.max(w, h); w = Math.round(w * r); h = Math.round(h * r); } const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h); c.toBlob(blob => { URL.revokeObjectURL(url); blob ? resolve({ blob }) : reject(new Error("Could not prepare image.")); }, "image/jpeg", quality); }; img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image.")); }; img.src = url; }); }
  function toBase64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); }); }
  async function startPayment() { if (!supabaseClient) return alert("Payment is not ready. Please refresh and try again."); const { data, error } = await supabaseClient.functions.invoke("initialize-payment", { body: { callback_url: window.location.origin + window.location.pathname + "?payment=complete" } }); if (error || !data?.authorization_url) return alert(error?.message || "Payment initialization failed."); window.location.href = data.authorization_url; }

  function bindEvents() {
    byId("heroStart")?.addEventListener("click", () => showAuth());
    byId("navLogin")?.addEventListener("click", () => showAuth());
    byId("pricingUpgrade")?.addEventListener("click", () => showAuth());
    byId("appUpgrade")?.addEventListener("click", startPayment);
    byId("closeAuth")?.addEventListener("click", () => hideAuth());
    byId("toggleAuth")?.addEventListener("click", () => { mode = mode === "signin" ? "signup" : "signin"; updateAuthMode(); showMessage(""); });
    byId("googleBtn")?.addEventListener("click", () => oauth("google"));
    byId("appleBtn")?.addEventListener("click", () => oauth("apple"));
    byId("emailForm")?.addEventListener("submit", submitEmail);
    byId("logout")?.addEventListener("click", async () => { if (supabaseClient) await supabaseClient.auth.signOut(); logoutUI(); });
    byId("chooseBtn")?.addEventListener("click", () => byId("fileInput")?.click());
    byId("cameraBtn")?.addEventListener("click", () => { const input = byId("fileInput"); if (input) { input.setAttribute("capture", "environment"); input.click(); } });
    byId("fileInput")?.addEventListener("change", e => { const f = e.target.files?.[0]; if (f) analyze(f); });
    byId("refreshHistory")?.addEventListener("click", loadHistory);
    byId("dropZone")?.addEventListener("dragover", e => { e.preventDefault(); });
    byId("dropZone")?.addEventListener("drop", e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) analyze(f); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !byId("auth")?.classList.contains("hidden")) hideAuth(); });
    window.addEventListener("hashchange", route);
  }

  function route() { if (!session && location.hash === "#auth") showAuth(false); else if (!session && location.hash !== "#auth") hideAuth(false); }

  async function init() {
  updateAuthMode();
  bindEvents();

  if (!window.supabase?.createClient) {
    showMessage("Authentication service could not load. Check your internet connection and refresh.");
    return;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    }
  );

  supabaseClient.auth.onAuthStateChange((_event, newSession) => {
    session = newSession;

    if (newSession) {
      openApp(newSession);
    } else {
      logoutUI();
    }
  });

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Session error:", error);
    logoutUI();
    return;
  }

  if (data?.session) {
    session = data.session;
    await openApp(data.session);
  } else {
    logoutUI();
    route();
  }
}

  window.SugarMax = { showAuth, hideAuth };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
