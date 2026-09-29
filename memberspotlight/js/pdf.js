/* Builds the professional PDF copy of a member's Spotlight answers (uses the bundled jsPDF). */
(function () {
  "use strict";
  var GOLD = [111, 95, 22], INK = [42, 38, 23], MUTED = [110, 103, 78], LINE = [214, 206, 172], SOFT = [239, 233, 207];
  var PW = 215.9, PH = 279.4, M = 18, CW = PW - 2 * M, BOTTOM = PH - 20;
  var PT = 0.3528; // mm per point

  function clean(s) {
    return String(s == null ? "" : s)
      .replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-").replace(/…/g, "...").replace(/[•●]/g, "-")
      .replace(/[   ]/g, " ").replace(/\r\n?/g, "\n")
      .replace(/[\uD800-\uDFFF]/g, "").replace(/[^\n\x20-\x7E¡-ÿ]/g, "?");
  }

  function loadBanner() {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        try {
          var c = document.createElement("canvas");
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext("2d").drawImage(img, 0, 0);
          resolve({ data: c.toDataURL("image/jpeg", 0.92), w: img.naturalWidth, h: img.naturalHeight });
        } catch (e) { resolve(null); }
      };
      img.onerror = function () { resolve(null); };
      img.src = "images/banner.jpg";
    });
  }

  window.TAW_makePdf = function (answers, schema) {
    return loadBanner().then(function (banner) {
      var doc = new window.jspdf.jsPDF({ unit: "mm", format: "letter" });
      var y = M;
      var val = {}, lab = {};
      answers.forEach(function (a) { val[a.k] = a.v; lab[a.k] = a.l; });
      var name = val.name || "Member", company = val.company || "";

      function need(h) { if (y + h > BOTTOM) { newPage(); } }
      var HEAD = 0;
      function newPage() {
        doc.addPage();
        if (banner) doc.addImage(banner.data, "JPEG", 0, 0, PW, HEAD);
        else { doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]); doc.rect(0, 0, PW, HEAD, "F"); }
        y = HEAD + 9;
      }
      function font(size, style, color) {
        doc.setFont("helvetica", style || "normal"); doc.setFontSize(size); doc.setTextColor(color[0], color[1], color[2]);
      }
      // write wrapped text; returns nothing, advances y
      function para(str, size, style, color, indent, gap) {
        font(size, style, color);
        var lh = size * PT * 1.42;
        var lines = doc.splitTextToSize(clean(str), CW - (indent || 0));
        lines.forEach(function (ln) {
          need(lh);
          doc.text(ln, M + (indent || 0), y + size * PT * 0.95);
          y += lh;
        });
        y += (gap || 0);
      }
      function qa(question, answer) {
        if (!answer) return;
        var lh = 11.5 * PT * 1.42, alh = 10.5 * PT * 1.42;
        need(lh + alh * 2 + 2);
        para(question, 11.5, "bold", GOLD, 0, 1);
        para(answer, 10.5, "normal", INK, 0, 4.2);
      }
      function sectionHeading(title) {
        need(30);
        doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
        doc.rect(M, y, CW, 8.5, "F");
        doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
        doc.rect(M, y, 1.6, 8.5, "F");
        font(12.5, "bold", GOLD);
        doc.text(clean(title), M + 5, y + 5.9);
        y += 8.5 + 5;
      }
      function subHeading(title) {
        need(20);
        para(title, 11, "bold", GOLD, 0, 1.5);
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.25);
        doc.line(M, y - 1, M + CW, y - 1); y += 1.5;
      }

      /* ---- cover page ---- */
      var CX = PW / 2, bh = 0;
      HEAD = banner ? PW * banner.h / banner.w : 30;
      if (banner) {
        bh = PW * banner.h / banner.w;
        doc.addImage(banner.data, "JPEG", 0, 0, PW, bh);
      } else {
        bh = 30;
        doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]); doc.rect(0, 0, PW, bh, "F");
        font(18, "bold", [255, 255, 255]); doc.text("Truth at Work  |  Round Table", CX, 19, { align: "center" });
      }
      var cy = 112;
      font(38, "bold", GOLD); doc.text("Member Spotlight", CX, cy, { align: "center" });
      doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.8); doc.line(CX - 30, cy + 8, CX + 30, cy + 8);
      cy += 30;
      font(30, "bold", INK);
      doc.splitTextToSize(clean(name), CW).forEach(function (ln) { doc.text(ln, CX, cy, { align: "center" }); cy += 13; });
      cy += 3;
      if (company) {
        font(19, "normal", MUTED);
        doc.splitTextToSize(clean(company), CW).forEach(function (ln) { doc.text(ln, CX, cy, { align: "center" }); cy += 9; });
      }
      var when = [val.pres_month, val.pres_year].filter(Boolean).join(" ");
      if (when) { font(18, "normal", INK); doc.text(clean(when), CX, PH - 45, { align: "center" }); }
      newPage();

      /* ---- sections ---- */
      var shown = 0;
      schema.forEach(function (pg) {
        if (pg.file === "about.html") return;
        var rows = answers.filter(function (a) { return a.file === pg.file && a.v; });
        if (!rows.length) return;
        // the cover is page 1; each section starts on its own fresh page
        if (shown >= 1) { newPage(); }
        shown++;
        sectionHeading(pg.title);

        if (pg.file === "goals.html") {
          [["personal", "Personal Goals"], ["business", "Business Goals"], ["spiritual", "Spiritual Goals"]].forEach(function (c) {
            var items = [];
            for (var i = 1; i <= 5; i++) {
              var g = val["goal_" + c[0] + "_" + i + "_goal"], n = val["goal_" + c[0] + "_" + i + "_notes"];
              if (g || n) items.push({ i: i, g: g, n: n });
            }
            if (!items.length) return;
            subHeading(c[1]);
            items.forEach(function (it) {
              need(22);
              para(it.i + ".  " + (it.g || "(no goal stated)"), 10.5, "bold", INK, 0, 0.6);
              if (it.n) {
                para("Obstacles / Opportunities / Needed Resources", 8.5, "bold", MUTED, 6, 0.4);
                para(it.n, 10.5, "normal", INK, 6, 3);
              } else y += 2.4;
            });
            y += 2;
          });
          return;
        }

        var done = {};
        rows.forEach(function (a) {
          if (done[a.k]) return;
          // financial table
          if (/^(revenue|employees)_\d$/.test(a.k)) {
            if (done.__fin) return; done.__fin = true;
            var cw = [46, 33.5, 33.5, 33.5, 33.5], rh = 8;
            need(rh * 3 + 6);
            var x = M;
            doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]); doc.rect(M, y, CW, rh, "F");
            font(9, "bold", MUTED);
            for (var c = 1; c <= 4; c++) {
              var yr = (lab["revenue_" + c] || "").replace(/^Revenue\s*/, "");
              doc.text(clean(yr), M + cw.slice(0, c).reduce(function (s, v) { return s + v; }, 0) + 2.5, y + 5.4);
            }
            y += rh;
            [["Annual Revenue", "revenue"], ["Number of Employees", "employees"]].forEach(function (r) {
              font(10, "bold", INK); doc.text(r[0], M + 2.5, y + 5.4);
              for (var c2 = 1; c2 <= 4; c2++) {
                var v = val[r[1] + "_" + c2];
                font(10.5, "normal", v ? INK : MUTED);
                doc.text(clean(v || "-"), M + cw.slice(0, c2).reduce(function (s, q) { return s + q; }, 0) + 2.5, y + 5.4);
              }
              doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.25); doc.line(M, y + rh, M + CW, y + rh);
              y += rh;
            });
            y += 6; return;
          }
          // benchmarks
          if (/^bench_\d$/.test(a.k)) {
            if (done.__bench) return; done.__bench = true;
            need(24);
            para("Dashboard benchmarks used to measure the status of the business", 11.5, "bold", GOLD, 0, 1);
            for (var i = 1; i <= 5; i++) if (val["bench_" + i]) para(i + ".  " + val["bench_" + i], 10.5, "normal", INK, 0, 0.8);
            y += 3.4; return;
          }
          // 1-10 scales
          if (a.k === "urgency" || a.k === "impact") {
            if (done.__scale) return; done.__scale = true;
            need(34);
            para("How this issue rates", 11.5, "bold", GOLD, 0, 2.5);
            [["Urgency", "urgency"], ["Impact", "impact"]].forEach(function (s) {
              need(11);
              font(10.5, "bold", INK); doc.text(s[0], M, y + 4.6);
              var sel = parseInt(val[s[1]], 10);
              for (var n = 1; n <= 10; n++) {
                var cx = M + 30 + (n - 1) * 12.5, cy = y + 3.6;
                if (n === sel) { doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]); doc.circle(cx, cy, 4, "F"); font(9.5, "bold", [255, 255, 255]); }
                else { doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.35); doc.circle(cx, cy, 4, "S"); font(9.5, "normal", MUTED); }
                doc.text(String(n), cx, cy + 1.2, { align: "center" });
              }
              y += 11;
            });
            font(8, "normal", MUTED); doc.text("1 = Low      10 = High", M + 30 - 4, y + 1); y += 8; return;
          }
          qa(a.q.replace(/ \(1-10\)$/, ""), a.v);
        });
      });

      /* ---- footers ---- */
      var n = doc.getNumberOfPages();
      for (var p = 2; p <= n; p++) {
        doc.setPage(p);
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.25); doc.line(M, PH - 14, M + CW, PH - 14);
        font(8, "normal", MUTED);
        doc.text(clean("Truth at Work  |  Round Table  |  Featured Member Presentation  -  " + name + (company ? ", " + company : "")), M, PH - 9.5);
        doc.text("Page " + p + " of " + n, M + CW, PH - 9.5, { align: "right" });
      }
      doc.setProperties({ title: "Featured Member Presentation - " + clean(name), author: clean(name), subject: "Truth at Work Member Spotlight" });
      return doc;
    });
  };
})();
