// Scrolls to and focuses the element named by a URL hash, waiting for it to render
// (signed-in sections appear after their data loads).
export function focusHashTarget(hash: string, doc: Document = document, timeoutMs = 4000): Promise<boolean> {
  const id = hash.replace(/^#/, "");
  if (!id) return Promise.resolve(false);
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const el = doc.getElementById(id);
      if (el) {
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        el.scrollIntoView?.({ block: "start" });
        el.focus({ preventScroll: true });
        return resolve(true);
      }
      if (Date.now() - start > timeoutMs) return resolve(false);
      setTimeout(tick, 50);
    };
    tick();
  });
}
