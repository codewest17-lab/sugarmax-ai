// SugarMax AI — pricing.html logic

function showAlert(msg, type = "error") {
  document.getElementById("alert-box").innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
}

const FUNCTIONS_URL = "https://wobroovxjugckroijuse.supabase.co/functions/v1";

document.getElementById("upgrade-cta").addEventListener("click", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "auth.html?mode=signup";
    return;
  }

  const btn = document.getElementById("upgrade-cta");
  btn.disabled = true;
  btn.textContent = "Preparing checkout…";

  try {
    const res = await fetch(`${FUNCTIONS_URL}/paystack-init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ callback_url: window.location.origin + "/dashboard.html" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not start checkout");

    const popup = new PaystackPop();
    popup.resumeTransaction(data.access_code, {
      onSuccess: async (transaction) => {
        btn.textContent = "Verifying payment…";
        const verifyRes = await fetch(`${FUNCTIONS_URL}/paystack-verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ reference: data.reference }),
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          window.location.href = "dashboard.html";
        } else {
          showAlert("Payment could not be verified. Contact support if you were charged.");
          btn.disabled = false;
          btn.textContent = "Upgrade to Pro";
        }
      },
      onCancel: () => {
        btn.disabled = false;
        btn.textContent = "Upgrade to Pro";
      },
    });
  } catch (err) {
    showAlert(err.message);
    btn.disabled = false;
    btn.textContent = "Upgrade to Pro";
  }
});

(async function checkExistingPlan() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  document.getElementById("free-cta").textContent = "Current plan";
  document.getElementById("free-cta").href = "dashboard.html";

  const { subscription } = await getUserContext(session.user.id);
  if (subscription?.plan === "pro") {
    const btn = document.getElementById("upgrade-cta");
    btn.textContent = "You're on Pro";
    btn.disabled = true;
  }
})();
