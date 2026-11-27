// Sets the theme class before first paint so the page never flashes light before the saved
// dark theme is applied. Mirrors App.tsx: saved 'theme' in localStorage, default 'dark'.
// External file (not inline) so the CSP can keep script-src without 'unsafe-inline'.
(function () {
  var theme = 'dark';
  try { theme = localStorage.getItem('theme') || 'dark'; } catch (e) {}
  var root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  root.style.backgroundColor = theme === 'dark' ? '#09090b' : '#fafafa';
})();
