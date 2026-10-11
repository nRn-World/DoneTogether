// Endast logga — rensa ALDRIG hela sidan vid runtime-fel (t.ex. GPS).
// Annars mister användaren appen vid vanliga GeolocationPositionError.
// Ligger i egen fil (inte inline i index.html) så att CSP:n kan köra script-src utan 'unsafe-inline'.
window.onerror = function (message, source, lineno, colno, error) {
  console.error('[Pre-React error]', message, source, lineno, colno, error);
  return false;
};
window.onunhandledrejection = function (event) {
  console.error('[Pre-React rejection]', event && event.reason);
  try {
    var r = event && event.reason;
    var text = (r != null ? String(r) : '') + (r && r.message ? r.message : '');
    if (/geolocation|positionerror/i.test(text) || (r && typeof r.code === 'number' && r.code >= 1 && r.code <= 3)) {
      if (event.preventDefault) event.preventDefault();
    }
  } catch (e) {}
};
