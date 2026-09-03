// SugarMax AI — settings.html logic

function showAlert(msg, type = "error") {
  document.getElementById("alert-box").innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
}

let sessionUserId = null;

(async function init() {
  const session = await requireAuth();
  if (!session) return;
  sessionUserId = session.user.id;

  const { profile, subscription } = await getUserContext(sessionUserId);
  document.getElementById("full-name").value = profile?.full_name || "";
  document.getElementById("email-display").value = session.user.email || "";

  if (subscription) {
    document.getElementById("sub-detail").textContent =
      subscription.plan === "pro"
        ? `SugarMax Pro — ${subscription.scans_remaining} of ${subscription.scans_limit} scans left, renews ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "—"}.`
        : `Free plan — ${subscription.scans_remaining} of ${subscription.scans_limit} scans remaining.`;
    if (subscription.plan === "pro") {
      document.getElementById("manage-sub-btn").textContent = "Change billing";
    }
  }
})();

document.getElementById("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("save-profile-btn");
  btn.disabled = true;
  btn.textContent = "Saving…";
  const fullName = document.getElementById("full-name").value.trim();

  const { error } = await supabaseClient.from("profiles").update({ full_name: fullName }).eq("id", sessionUserId);
  btn.disabled = false;
  btn.textContent = "Save changes";
  if (error) showAlert(error.message);
  else showAlert("Profile updated.", "success");
});

document.getElementById("password-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const newPw = document.getElementById("new-pw").value;
  if (!newPw || newPw.length < 8) {
    showAlert("Password must be at least 8 characters.");
    return;
  }
  const { error } = await supabaseClient.auth.updateUser({ password: newPw });
  if (error) showAlert(error.message);
  else {
    showAlert("Password updated.", "success");
    document.getElementById("new-pw").value = "";
  }
});
