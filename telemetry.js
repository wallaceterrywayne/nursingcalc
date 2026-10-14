// Optional usage data. Off unless PC_CONFIG.telemetry.endpoint is set AND the student has agreed
// (Edit deck → "Share anonymous practice data"). Students are identified only by a random ID made
// on their device; no names, emails, or answers typed in free text beyond the number they entered.
// Events wait in an outbox and are sent in small batches; if sending fails they stay for next time.
(function () {
  const cfg = (window.PC_CONFIG && window.PC_CONFIG.telemetry) || {};
  const enabled = !!cfg.endpoint && !window.PC_DEMO;
  const OUT = "nursecalc.outbox", UID = "nursecalc.uid";
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
  let uid = get(UID, null);
  if (enabled && !uid) { uid = "s-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); put(UID, uid); }
  let consent = () => false;

  function flush() {
    if (!enabled || !consent()) return;
    const box = get(OUT, []);
    if (!box.length) return;
    const batch = box.slice(0, 50);
    fetch(cfg.endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" },
                          body: JSON.stringify(batch), keepalive: true })
      .then(() => { put(OUT, get(OUT, []).slice(batch.length)); if (box.length > batch.length) flush(); })
      .catch(() => { /* offline: try again later */ });
  }

  function send(type, data) {
    if (!enabled || !consent()) return;
    const box = get(OUT, []);
    box.push({ t: new Date().toISOString(), uid, study: cfg.study || "", type, ...data });
    put(OUT, box.slice(-2000));
    flush();
  }

  window.Telemetry = {
    enabled,
    setConsent(fn) { consent = fn; flush(); },
    send,
    flush,
    uid: () => uid,
  };
  window.addEventListener("online", flush);
})();
