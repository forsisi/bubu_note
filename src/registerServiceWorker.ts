export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
