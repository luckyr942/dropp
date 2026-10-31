// HTML for the embedded Bolna web-call page. It runs inside a WebView because Bolna's SDK is a
// browser (WebRTC) SDK. The app injects a call session minted by our backend (the Bolna API key never
// reaches the phone). The talk button lives in the page because browsers only allow microphone
// calls to start from a tap inside the page.
export const BOLNA_SDK_URL = 'https://cdn.jsdelivr.net/gh/bolna-ai/web-call@v3.0.1/dist/bolna-web-call.min.js';

export const bolnaCallPageHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; height: 100%; background: transparent; font-family: -apple-system, system-ui, sans-serif; }
  body { display: flex; flex-direction: column; align-items: center; justify-content: center; -webkit-user-select: none; user-select: none; }
  #orb {
    width: 132px; height: 132px; border-radius: 50%; border: 0; outline: none; cursor: pointer;
    background: radial-gradient(circle at 35% 30%, #60A5FA, #2563EB 55%, #1D4ED8);
    box-shadow: 0 12px 30px rgba(37, 99, 235, 0.35);
    display: flex; align-items: center; justify-content: center; transition: transform .2s ease, background .3s ease;
    -webkit-tap-highlight-color: transparent;
  }
  #orb:active { transform: scale(0.96); }
  #orb.live { background: radial-gradient(circle at 35% 30%, #34D399, #10B981 55%, #059669); animation: pulse 1.6s ease-in-out infinite; }
  #orb.busy { opacity: .65; }
  #orb svg { width: 52px; height: 52px; fill: #fff; }
  @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,.45); } 50% { box-shadow: 0 0 0 22px rgba(16,185,129,0); } }
  #label { margin-top: 16px; font-size: 15px; font-weight: 700; color: #0F172A; }
  #sub { margin-top: 4px; font-size: 12px; color: #64748B; min-height: 16px; text-align: center; padding: 0 16px; }
</style>
</head>
<body>
  <button id="orb" class="busy" aria-label="Talk to Aura">
    <svg viewBox="0 0 24 24"><path id="icon" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>
  </button>
  <div id="label">Getting ready…</div>
  <div id="sub"></div>
<script>
  var post = function (type, data) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data || null })); } catch (e) {}
  };
  var orb = document.getElementById('orb');
  var label = document.getElementById('label');
  var sub = document.getElementById('sub');
  var session = null;      // single-use session from our backend
  var call = null;
  var live = false;
  var sdkReady = false;

  function ui(state, text, detail) {
    orb.className = state === 'live' ? 'live' : state === 'busy' ? 'busy' : '';
    label.textContent = text;
    sub.textContent = detail || '';
  }
  function idle() {
    live = false;
    if (session && sdkReady) ui('idle', 'Tap to talk', 'Speak in Hindi, Hinglish or English');
    else ui('busy', 'Getting ready…');
  }

  // Called by the app with a fresh session (sessions expire in ~2 minutes and work once)
  window.__setSession = function (s) { session = s; if (!live) idle(); };

  function on(target, name, fn) {
    if (typeof target.on === 'function') target.on(name, fn);
    else if (typeof target.addEventListener === 'function') target.addEventListener(name, function (e) { fn(e && e.detail !== undefined ? e.detail : e); });
  }

  orb.addEventListener('click', function () {
    if (live && call) { try { call.stop(); } catch (e) {} return; }
    if (!session || !sdkReady) { post('need-session'); return; }
    var Ctor = window.BolnaWebCall && (window.BolnaWebCall.BolnaWebCall || window.BolnaWebCall);
    try {
      call = new Ctor({ session: session });
    } catch (e) {
      post('error', { message: 'Could not start voice: ' + e.message });
      return;
    }
    session = null; // consumed by this call
    ui('busy', 'Connecting…');
    on(call, 'call-start', function () { live = true; ui('live', 'Listening…', 'Tap to end'); post('call-start'); });
    on(call, 'call-end', function (e) { post('call-end', { reason: e && e.reason }); call = null; idle(); post('need-session'); });
    on(call, 'state-change', function (s) { post('state', { state: typeof s === 'string' ? s : (s && s.state) }); });
    on(call, 'error', function (e) {
      post('error', { code: e && e.code, message: (e && e.message) || 'Voice call failed' });
      if (!live) { call = null; idle(); post('need-session'); }
    });
    Promise.resolve(call.start()).catch(function (e) {
      post('error', { message: (e && e.message) || 'Could not start the call' });
      call = null; idle(); post('need-session');
    });
  });

  var script = document.createElement('script');
  script.src = '${BOLNA_SDK_URL}';
  script.onload = function () { sdkReady = true; idle(); post('ready'); };
  script.onerror = function () { ui('busy', 'Voice unavailable', 'Could not load the voice engine. Check your internet.'); post('error', { message: 'Could not load the Bolna voice SDK' }); };
  document.head.appendChild(script);
  post('loaded');
</script>
</body>
</html>`;
