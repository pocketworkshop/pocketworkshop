(() => {
  "use strict";

  const SCRIPT_ID = "pocketworkshop-catalog-for-related-tools";
  const SECTION_ID = "related-tools";

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeToolPath(pathname) {
    let path = String(pathname || "").split("?")[0].split("#")[0];
    if (path.length > 1) path = path.replace(/\/+$/, "");
    if (path.startsWith("/tools/") && !path.endsWith(".html")) {
      path += ".html";
    }
    return path;
  }

  function getRelatedTools(tools, current) {
    const fullCategory = tools.filter(
      (tool) => tool.category === current.category
    );

    if (fullCategory.length <= 1) return [];

    const currentIndex = fullCategory.findIndex(
      (tool) => normalizeToolPath(tool.url) === normalizeToolPath(current.url)
    );

    const result = [];
    const used = new Set([normalizeToolPath(current.url)]);

    for (const offset of [1, -1, 2, -2, 3, -3]) {
      if (result.length >= 3) break;

      const index =
        (currentIndex + offset + fullCategory.length) % fullCategory.length;
      const candidate = fullCategory[index];
      const key = candidate ? normalizeToolPath(candidate.url) : "";

      if (candidate && !used.has(key)) {
        used.add(key);
        result.push(candidate);
      }
    }

    return result;
  }

  function render() {
    if (document.getElementById(SECTION_ID)) return;

    const tools = window.POCKETWORKSHOP_TOOLS;
    if (!Array.isArray(tools) || !tools.length) return;

    const currentPath = normalizeToolPath(window.location.pathname);
    const current = tools.find(
      (tool) => normalizeToolPath(tool.url) === currentPath
    );
    if (!current) return;

    const related = getRelatedTools(tools, current);
    if (!related.length) return;

    const cards = related
      .map(
        (tool) => `
          <a class="tool-card active" href="${escapeHtml(tool.url)}">
            <span class="icon">${escapeHtml(tool.icon)}</span>
            <strong>${escapeHtml(tool.title)}</strong>
            <span>${escapeHtml(tool.description)}</span>
          </a>
        `
      )
      .join("");

    const section = document.createElement("section");
    section.id = SECTION_ID;
    section.className = "section";
    section.setAttribute("aria-labelledby", "related-tools-title");
    section.innerHTML = `
      <div class="section-heading section-heading-row">
        <div>
          <p class="eyebrow">RELATED TOOLS</p>
          <h2 id="related-tools-title">You might also need.</h2>
          <p>More PocketWorkshop tools related to ${escapeHtml(current.title)}.</p>
        </div>
        <a class="text-link" href="/tools.html">View all tools →</a>
      </div>
      <div class="tool-grid">${cards}</div>
    `;

    const main = document.querySelector("main");
    if (main) main.append(section);
  }

  function ensureCatalogThenRender() {
    if (Array.isArray(window.POCKETWORKSHOP_TOOLS)) {
      render();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", render, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "/tools/catalog.js";
    script.addEventListener("load", render, { once: true });
    document.head.append(script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureCatalogThenRender, {
      once: true
    });
  } else {
    ensureCatalogThenRender();
  }
})();
