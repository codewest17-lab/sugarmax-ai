// SugarMax AI — auth.html logic

function showAlert(message, type = "error") {
  const box = document.getElementById("alert-box");
  box.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}
function clearAlert() {
  document.getElementById("alert-box").innerHTML = "";
}

function switchTab(which) {
  const signinForm = document.getElementById("signin-form");
  const signupForm = document.getElementById("signup-form");
  const tabSignin = document.getElementById("tab-signin");
  const tabSignup = document.getElementById("tab-signup");
  clearAlert();
  if (which === "signin") {
    signinForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
    tabSignin.classList.add("active");
    tabSignup.classList.remove("active");
  } else {
    signupForm.classList.remove("hidden");
    signinForm.classList.add("hidden");
    tabSignup.classList.add("active");
    tabSignin.classList.remove("active");
  }
}

// Deep-link support: auth.html?mode=signup
const params = new URLSearchParams(window.location.search);
if (params.get("mode") === "signup") switchTab("signup");

// ---------- Email sign in ----------
document.getElementById("signin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAlert();
  const btn = document.getElementById("signin-submit");
  btn.disabled = true;
  btn.textContent = "Logging in…";

  const email = document.getElementById("signin-email").value.trim();
  const password = document.getElementById("signin-password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    showAlert(error.message);
    btn.disabled = false;
    btn.textContent = "Log in";
    return;
  }
  window.location.href = "dashboard.html";
});

// ---------- Email sign up ----------
document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAlert();

  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("signup-confirm").value;
  const confirmError = document.getElementById("confirm-error");

  if (password !== confirm) {
    confirmError.classList.add("show");
    return;
  }
  confirmError.classList.remove("show");

  const btn = document.getElementById("signup-submit");
  btn.disabled = true;
  btn.textContent = "Creating account…";

  const fullName = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: window.location.origin + "/dashboard.html",
    },
  });

  if (error) {
    showAlert(error.message);
    btn.disabled = false;
    btn.textContent = "Create account";
    return;
  }

  if (data.session) {
    // Email confirmation disabled — user is signed in immediately
    window.location.href = "onboarding.html";
  } else {
    showAlert("Account created — check your email to verify, then log in.", "success");
    btn.disabled = false;
    btn.textContent = "Create account";
    switchTab("signin");
  }
});

// ---------- Forgot password ----------
document.getElementById("forgot-link").addEventListener("click", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signin-email").value.trim();
  if (!email) {
    showAlert("Enter your email above first, then click \u201cForgot password?\u201d again.");
    return;
  }
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset-password.html",
  });
  if (error) showAlert(error.message);
  else showAlert("Password reset link sent — check your email.", "success");
});

// ---------- OAuth ----------
document.getElementById("google-btn").addEventListener("click", async () => {
  await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/dashboard.html" },
  });
});
document.getElementById("apple-btn").addEventListener("click", async () => {
  await supabaseClient.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: window.location.origin + "/dashboard.html" },
  });
});
