/* Truth at Work - Member Spotlight form: autosave, navigation, review, submit. */
(function () {
  "use strict";
  var CFG = window.TAW_CONFIG || {};
  var SCHEMA = window.TAW_SCHEMA || [];
  var DRAFT_KEY = "taw_spotlight_draft";
  var LAST_KEY = "taw_spotlight_last";
  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var YEAR = new Date().getFullYear();
  var page = document.body.getAttribute("data-page");
  var step = parseInt(document.body.getAttribute("data-step"), 10) || 0;

  /* ---------- storage (localStorage -> sessionStorage -> window.name) ---------- */
  var store = (function () {
    function tryStore(s) {
      try { var t = "__t"; s.setItem(t, "1"); s.removeItem(t); return s; } catch (e) { return null; }
    }
    var ls = tryStore(window.localStorage) || tryStore(window.sessionStorage);
    if (ls) return {
      get: function (k) { try { return ls.getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { ls.setItem(k, v); } catch (e) {} },
      del: function (k) { try { ls.removeItem(k); } catch (e) {} }
    };
    function wn() { try { return JSON.parse(window.name || "{}") || {}; } catch (e) { return {}; } }
    return {
      get: function (k) { var o = wn(); return o[k] == null ? null : o[k]; },
      set: function (k, v) { var o = wn(); o[k] = v; window.name = JSON.stringify(o); },
      del: function (k) { var o = wn(); delete o[k]; window.name = JSON.stringify(o); }
    };
  })();

  /* ---------- access gate (the code itself is checked by the server, never in this file) ---------- */
  var TOKEN_KEY = "taw_spotlight_token";
  function tokenValid() {
    var t = store.get(TOKEN_KEY);
    if (!t) return false;
    var exp = parseInt(String(t).split(".")[0], 10);
    return exp > Date.now() / 1000;
  }
  function workerUrl(path) { return String(CFG.WORKER_URL || "").replace(/\/+$/, "") + path; }
  if (document.body.getAttribute("data-guard") === "1") {
    if (!tokenValid()) { window.location.replace("index.html"); return; }
    document.documentElement.className = "";
  }
  if (page === "index.html") {
    var gform = document.getElementById("gate");
    if (tokenValid()) { window.location.replace("about.html"); return; }
    var gmsg = document.getElementById("gmsg"), gbtn = document.getElementById("gbtn"), gcode = document.getElementById("code");
    if (/expired=1/.test(window.location.search)) { gmsg.className = "gmsg info"; gmsg.textContent = "Your session timed out. Please enter the code again \u2014 your answers are still saved."; }
    gform.addEventListener("submit", function (e) {
      e.preventDefault();
      var code = gcode.value.trim();
      if (!code) { gmsg.className = "gmsg"; gmsg.textContent = "Please enter the access code."; gcode.focus(); return; }
      if (!CFG.WORKER_URL) { gmsg.className = "gmsg"; gmsg.textContent = "This form isn't connected yet (site admin: set WORKER_URL in js/config.js)."; return; }
      gbtn.disabled = true; gmsg.className = "gmsg info"; gmsg.textContent = "Checking\u2026";
      fetch(workerUrl("/verify"), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ code: code }) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.ok && res.token) { store.set(TOKEN_KEY, res.token); window.location.href = "about.html"; return; }
          gbtn.disabled = false; gmsg.className = "gmsg";
          gmsg.textContent = (res && res.error) || "That code isn't right. Please check it and try again.";
          gcode.select();
        })
        .catch(function () { gbtn.disabled = false; gmsg.className = "gmsg"; gmsg.textContent = "Couldn't reach the server. Please check your connection and try again."; });
    });
    return;
  }

  function loadDraft() {
    try {
      var d = JSON.parse(store.get(DRAFT_KEY) || "null");
      if (d && d.v === CFG.DRAFT_VERSION && d.data) return d;
    } catch (e) {}
    return { v: CFG.DRAFT_VERSION, data: {}, visited: {} };
  }
  var draft = loadDraft();
  draft.visited = draft.visited || {};
  function saveDraft() {
    draft.updated = new Date().toISOString();
    store.set(DRAFT_KEY, JSON.stringify(draft));
  }

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function yearLabel(tpl, yo) {
    if (yo == null) return tpl;
    var y = (YEAR + yo) + (yo === 0 ? " (projected)" : "");
    return tpl.replace(/\{y\}/g, y);
  }
  function setStatus(msg, cls) {
    var el = $("#status"); if (!el) return;
    el.textContent = msg || ""; el.className = "status" + (cls ? " " + cls : "");
  }
  function autogrow(t) {
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight + 2, 640) + "px";
  }

  /* ---------- stepper: mark completed pages ---------- */
  $$(".steps li").forEach(function (li) {
    var i = parseInt(li.getAttribute("data-step"), 10);
    if (i < step) li.classList.add("done");
  });

  /* ---------- year labels / selects ---------- */
  $$("[data-year]").forEach(function (el) {
    var yo = parseInt(el.getAttribute("data-year"), 10);
    el.textContent = (YEAR + yo) + (yo === 0 ? " (projected)" : "");
  });
  $$("select[data-months]").forEach(function (sel) {
    sel.innerHTML = '<option value="">Select month</option>' + MONTHS.map(function (m) {
      return '<option value="' + m + '">' + m + "</option>";
    }).join("");
  });
  $$("select[data-years-select]").forEach(function (sel) {
    var o = '<option value="">Select year</option>';
    for (var y = YEAR; y <= YEAR + 1; y++) o += '<option value="' + y + '">' + y + "</option>";
    sel.innerHTML = o;
  });

  /* ---------- form pages ---------- */
  var form = $("#f");
  if (form) {
    $$("input[name],select[name],textarea[name]", form).forEach(function (el) {
      if (el.name === "website") return; // honeypot
      var v = draft.data[el.name];
      if (el.type === "radio") { el.checked = (v != null && v === el.value); return; }
      if (v != null) el.value = v;
      if (el.tagName === "TEXTAREA") autogrow(el);
    });
    var timer = null;
    function persist() {
      $$("input[name],select[name],textarea[name]", form).forEach(function (el) {
        if (el.name === "website") return;
        if (el.type === "radio") { if (el.checked) draft.data[el.name] = el.value; return; }
        draft.data[el.name] = el.value;
      });
      draft.visited[page] = true;
      saveDraft();
      setStatus("Draft saved", "ok");
      clearTimeout(timer);
      timer = setTimeout(function () { setStatus(""); }, 1800);
    }
    form.addEventListener("input", function (e) {
      if (e.target.tagName === "TEXTAREA") autogrow(e.target);
      persist();
    });
    form.addEventListener("change", persist);
    window.addEventListener("resize", function () { $$("textarea", form).forEach(autogrow); });
    $$("input", form).forEach(function (el) {
      el.addEventListener("blur", function () { el.classList.add("touched"); });
    });
    function go(dest) { persist(); window.location.href = dest; }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        $$(".touched,input", form).forEach(function (el) { el.classList.add("touched"); });
        form.reportValidity();
        setStatus("Please complete the required fields.", "err");
        return;
      }
      go(form.getAttribute("data-next"));
    });
    $$("[data-nav=back]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); go(a.getAttribute("href")); });
    });
    persist(); setStatus("");
    // Fire autogrow once fonts/layout settle
    window.addEventListener("load", function () { $$("textarea", form).forEach(autogrow); });
  }

  /* ---------- building the answer list (used by review, submit, download) ---------- */
  function buildAnswers() {
    var out = [];
    SCHEMA.forEach(function (pg) {
      pg.fields.forEach(function (f) {
        var v = draft.data[f.k];
        out.push({
          s: pg.title,
          k: f.k,
          l: yearLabel(f.s, f.yo),
          q: yearLabel(f.q, f.yo),
          v: (v == null ? "" : String(v)).trim(),
          req: !!f.req,
          file: pg.file
        });
      });
    });
    return out;
  }
  function safeName(answers) {
    var n = (answers.filter(function (a) { return a.k === "name"; })[0] || {}).v || "member";
    return "member-spotlight-" + n.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() + ".pdf";
  }
  function downloadPdf(answers, link) {
    if (!window.TAW_makePdf || !window.jspdf) { alert("The PDF tool didn't load. Please refresh the page and try again."); return; }
    var orig = link.textContent; link.textContent = "Preparing PDF\u2026";
    window.TAW_makePdf(answers, SCHEMA).then(function (doc) {
      doc.save(safeName(answers)); link.textContent = orig;
    }, function () { link.textContent = orig; alert("Sorry, the PDF could not be created."); });
  }

  /* ---------- review page ---------- */
  if (page === "review.html") {
    var answers = buildAnswers();
    var host = $("#review");
    var missing = [];
    var html = "";
    SCHEMA.forEach(function (pg) {
      var rows = answers.filter(function (a) { return a.file === pg.file; });
      html += '<section class="rv-sec"><header><h2>' + esc(pg.title) + '</h2><a href="' + pg.file + '">Edit</a></header><dl>';
      var blank = 0;
      rows.forEach(function (a) {
        if (a.req && !a.v) missing.push(a);
        if (a.v) html += "<dt>" + esc(a.q) + (a.req ? ' <span class="req">*</span>' : "") + "</dt><dd>" + esc(a.v) + "</dd>";
        else if (a.req) html += "<dt>" + esc(a.q) + ' <span class="req">*</span></dt><dd class="empty"><span class="rv-miss">Required \u2013 please fill in</span></dd>';
        else blank++;
      });
      if (blank) html += '<dt class="blank">' + blank + (blank === 1 ? " question" : " questions") + " left blank</dt>";
      html += "</dl></section>";
    });
    host.innerHTML = html;

    var warn = $("#warn"), btn = $("#submit");
    if (missing.length) {
      warn.hidden = false;
      warn.innerHTML = "Please go back and complete: " + missing.map(function (m) { return esc(m.l); }).join(", ") + ".";
    } else if (!CFG.WORKER_URL) {
      warn.hidden = false;
      warn.innerHTML = "<strong>Heads up (site admin):</strong> the form isn't connected to a Google Sheet yet, so Submit is turned off. Add your Cloudflare Worker URL to <code>js/config.js</code> (see README). Members can still download a copy of their answers below.";
      btn.disabled = true;
    }
    $("#download").addEventListener("click", function (e) {
      e.preventDefault();
      downloadPdf(answers, this);
    });

    btn.addEventListener("click", function () {
      if (missing.length || !CFG.WORKER_URL) return;
      submit(answers, btn);
    });
    $$("[data-nav=back]").forEach(function (a) { a.addEventListener("click", function () {}); });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- submit ---------- */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
  function submit(answers, btn) {
    if (!draft.submissionId) { draft.submissionId = uuid(); saveDraft(); } // stable across retries -> server de-dupes
    var when = new Date();
    var payload = {
      id: draft.submissionId,
      submitted: when.toISOString(),
      tz: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || "",
      hp: ($("#hp") || {}).value || "",
      answers: answers.map(function (a) { return { s: a.s, l: a.l, q: a.q, v: a.v }; })
    };
    var body = JSON.stringify(payload);
    btn.disabled = true; btn.textContent = "Submitting…";
    setStatus("Sending your answers…");

    function done() {
      store.set(LAST_KEY, JSON.stringify({ answers: answers }));
      store.del(DRAFT_KEY);
      window.location.href = "thanks.html";
    }
    function fail(msg) {
      btn.disabled = false; btn.textContent = "Submit";
      setStatus(msg || "Something went wrong. Your answers are still saved — please try again.", "err");
    }
    payload.token = store.get(TOKEN_KEY) || "";
    body = JSON.stringify(payload);
    fetch(workerUrl("/submit"), { method: "POST", body: body, headers: { "Content-Type": "text/plain;charset=utf-8" } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok) return done();
        if (j && j.error === "auth") { store.del(TOKEN_KEY); window.location.href = "index.html?expired=1"; return; }
        fail(j && j.error ? "The server said: " + j.error : null);
      })
      .catch(function () { fail(); });
  }

  /* ---------- thanks page ---------- */
  if (page === "thanks.html") {
    var last = null;
    try { last = JSON.parse(store.get(LAST_KEY) || "null"); } catch (e) {}
    var dl = $("#download");
    if (last && last.answers && dl) {
      dl.addEventListener("click", function (e) { e.preventDefault(); downloadPdf(last.answers, dl); });
    } else if (dl) { dl.parentNode.hidden = true; }
  }
})();
