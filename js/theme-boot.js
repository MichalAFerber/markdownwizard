/* Applies the saved (or system) theme before first paint to avoid a flash. */
(function () {
  var t = null;
  try { t = localStorage.getItem('mdw:theme'); } catch (e) {}
  if (t !== 'light' && t !== 'dark') {
    try { t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
    catch (e) { t = 'light'; }
  }
  document.documentElement.dataset.theme = t;
})();
