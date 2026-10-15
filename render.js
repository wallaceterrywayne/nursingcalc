// Block renderer: turns solution blocks into DOM. One function per block type.
// Depends on window.CATALOG (from data.js) and KaTeX (loaded in the page).

(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Fill a catalog string; parameter values may be nested {key, params} references.
  function resolve(key, params) {
    const tpl = window.CATALOG[key];
    if (tpl === undefined) return `[missing text: ${key}]`;
    return tpl.replace(/\{(\w+)\}/g, (_, name) => {
      const v = (params || {})[name];
      if (v && typeof v === "object" && v.key) return resolve(v.key, v.params);
      return v === undefined ? `{${name}}` : String(v);
    });
  }

  // Minimal markdown: **bold**, *italic*, and inline $tex$.
  function md(s) {
    let h = esc(s);
    h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
    return h;
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  const renderers = {
    section(b) {
      const sec = el("section", "blk-section");
      const head = renderers[b.heading.type](b.heading);
      head.classList.add("sec-head");
      sec.appendChild(head);
      if (b.children && b.children.length) {
        const body = el("div", "sec-body");
        b.children.forEach((c) => body.appendChild(renderBlock(c)));
        sec.appendChild(body);
      }
      return sec;
    },
    text(b) {
      return el("p", "blk-text", md(resolve(b.key, b.params)));
    },
    callout(b) {
      return el("div", `blk-callout ${b.style || ""}`, md(resolve(b.key, b.params)));
    },
    math(b) {
      const d = el("div", "blk-math");
      try {
        window.katex.render(b.tex, d, { displayMode: true, throwOnError: false });
      } catch (e) {
        d.textContent = b.tex;
      }
      return d;
    },
    table(b) {
      const t = el("table", "blk-table");
      const hl = new Set((b.highlight || []).map(([r, c]) => `${r},${c}`));
      t.appendChild(el("thead", null, "<tr>" + b.header.map((h) => `<th>${esc(h)}</th>`).join("") + "</tr>"));
      const body = el("tbody");
      b.rows.forEach((row, r) => {
        body.insertAdjacentHTML("beforeend", "<tr>" + row.map((c, ci) =>
          `<td class="${hl.has(`${r},${ci}`) ? "hl" : ""}">${esc(c)}</td>`).join("") + "</tr>");
      });
      t.appendChild(body);
      return t;
    },
    image(b) {
      const i = el("img", "blk-image");
      i.src = b.src; i.alt = b.alt || "";
      return i;
    },
    diagram(b) {
      const fn = window.DIAGRAMS[b.kind];
      const wrap = el("div", "blk-diagram");
      wrap.innerHTML = fn ? fn(b) : `[unknown diagram: ${esc(b.kind)}]`;
      return wrap;
    },
  };

  function renderBlock(b) {
    const r = renderers[b.type];
    return r ? r(b) : el("p", "blk-text", `[unknown block: ${esc(b.type)}]`);
  }

  function renderBlocks(blocks, into) {
    into.innerHTML = "";
    blocks.forEach((b) => into.appendChild(renderBlock(b)));
  }

  // The problem as students see it: stem text, then the order card and drug label when present.
  function problemHTML(p) {
    let h = `<div class="stem">${esc(p.stem)}</div>`;
    if (p.order || p.label) {
      h += '<div class="given">';
      if (p.order) h += '<div class="order-card">' + p.order.map(([k, v]) => `<b>${esc(k)}</b><div>${esc(v)}</div>`).join("") + "</div>";
      if (p.label && window.Labels) h += `<button type="button" class="label-wrap" aria-label="Enlarge the drug label">${window.Labels.draw(p.label)}<span class="zoom-hint">Click to enlarge</span></button>`;
      h += "</div>";
    }
    if (p.question) h += `<p class="question">${esc(p.question)}</p>`;
    return h;
  }

  // Click a label to see it enlarged; click anywhere or press Escape to close.
  function openZoom(svg) {
    const ov = el("div", "label-zoom");
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", "Enlarged drug label");
    const big = svg.cloneNode(true);
    big.removeAttribute("width");
    ov.appendChild(big);
    ov.appendChild(el("button", "zoom-close", "Close"));
    const close = () => { ov.remove(); document.removeEventListener("keydown", onKey); last && last.focus(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    const last = document.activeElement;
    ov.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(ov);
    ov.querySelector(".zoom-close").focus();
  }
  document.addEventListener("click", (e) => {
    const w = e.target.closest && e.target.closest(".label-wrap");
    if (w) openZoom(w.querySelector("svg"));
  });

  window.Render = { resolve, renderBlocks, md, esc, problemHTML };
})();
