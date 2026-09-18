// SugarMax AI — scan.html logic

let selectedFile = null;
let selectedImageDataUrl = null;
let currentUserId = null;
let statusInterval = null;

function showAlert(msg, type = "error") {
  document.getElementById("alert-box").innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
}

(async function init() {
  const session = await requireAuth();
  if (!session) return;
  currentUserId = session.user.id;

  const { subscription } = await getUserContext(currentUserId);
  const note = document.getElementById("scans-left-note");
  if (subscription) {
    note.textContent = `${subscription.scans_remaining} scan${subscription.scans_remaining === 1 ? "" : "s"} remaining on your ${subscription.plan === "pro" ? "Pro" : "Free"} plan.`;
    if (subscription.scans_remaining <= 0) {
      showAlert(`You're out of scans. <a href="pricing.html" style="text-decoration:underline;">Upgrade to SugarMax Pro</a> to keep scanning.`);
      document.getElementById("analyze-btn").disabled = true;
    }
  }
})();

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const previewImg = document.getElementById("preview-img");
const dropzoneEmpty = document.getElementById("dropzone-empty");
const analyzeBtn = document.getElementById("analyze-btn");

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    showAlert("Please choose an image file.");
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    showAlert("Image is too large — please choose one under 8MB.");
    return;
  }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    selectedImageDataUrl = e.target.result;
    previewImg.src = e.target.result;
    previewImg.style.display = "inline-block";
    dropzoneEmpty.style.display = "none";
  };
  reader.readAsDataURL(file);
  analyzeBtn.disabled = false;
  document.getElementById("alert-box").innerHTML = "";
}

const SCAN_STATUS_MESSAGES = [
  "Reading your plate…",
  "Identifying foods…",
  "Estimating portion size…",
  "Calculating sugar & nutrition…",
];

analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile || !currentUserId) return;
  document.getElementById("alert-box").innerHTML = "";
  document.getElementById("upload-stage").style.display = "none";
  document.getElementById("scanning-stage").style.display = "block";

  // Show the actual uploaded photo under the scanning animation — not a
  // generic placeholder — so the person sees their real meal being "read".
  document.getElementById("scan-photo").src = selectedImageDataUrl;

  let statusIdx = 0;
  const statusEl = document.getElementById("scan-status-text");
  statusEl.textContent = SCAN_STATUS_MESSAGES[0];
  statusInterval = setInterval(() => {
    statusIdx = (statusIdx + 1) % SCAN_STATUS_MESSAGES.length;
    statusEl.textContent = SCAN_STATUS_MESSAGES[statusIdx];
  }, 2200);

  try {
    const ext = selectedFile.name.split(".").pop() || "jpg";
    const path = `${currentUserId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("meal-images")
      .upload(path, selectedFile, { contentType: selectedFile.type });
    if (uploadError) throw new Error(uploadError.message);

    const { data: scanRow, error: insertError } = await supabaseClient
      .from("scans")
      .insert({ user_id: currentUserId, image_url: path, status: "pending" })
      .select()
      .single();
    if (insertError) throw new Error(insertError.message);

    const { data: { session } } = await supabaseClient.auth.getSession();
    const res = await fetch(`https://wobroovxjugckroijuse.supabase.co/functions/v1/analyze-meal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ scan_id: scanRow.id }),
    });
    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "Analysis failed");
    }

    clearInterval(statusInterval);
    window.location.href = `results.html?id=${scanRow.id}`;
  } catch (err) {
    clearInterval(statusInterval);
    document.getElementById("scanning-stage").style.display = "none";
    document.getElementById("upload-stage").style.display = "block";
    showAlert(err.message || "Something went wrong. Please try again.");
  }
});
