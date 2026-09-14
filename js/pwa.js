// SugarMax AI — registers the service worker for PWA installability.
// Path is root-relative so this works whether loaded from a top-level
// page (index.html) or a subfolder page (legal/privacy.html, admin/index.html).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}
