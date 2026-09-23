/**
 * Applies the saved theme before first paint.
 *
 * This must run as a blocking inline script in <head>, before React hydrates
 * and before the browser paints the body. A React effect would run after the
 * first paint, so the page would flash light before switching to a saved dark
 * preference. There is no cross-viewer state here worth a server round trip;
 * localStorage is exactly the right tool for a per-device display preference,
 * unlike state that must be read back by the server.
 */

const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("shadow-idx-theme");
    if (stored === "dark" || stored === "light") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  // Static, non-interpolated string; no user input reaches this markup.
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
