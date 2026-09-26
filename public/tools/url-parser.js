(() => {
  const input = document.getElementById("url-input");
  const parseButton = document.getElementById("url-parse");
  const sampleButton = document.getElementById("url-sample");
  const copyAllButton = document.getElementById("url-copy-all");
  const clearButton = document.getElementById("url-clear");
  const status = document.getElementById("url-status");
  const queryWrap = document.getElementById("url-query-wrap");
  const queryCount = document.getElementById("url-query-count");

  const fields = {
    protocol: document.getElementById("url-protocol"),
    hostname: document.getElementById("url-hostname"),
    port: document.getElementById("url-port"),
    host: document.getElementById("url-host"),
    pathname: document.getElementById("url-pathname"),
    search: document.getElementById("url-search"),
    hash: document.getElementById("url-hash"),
    origin: document.getElementById("url-origin")
  };

  let lastParsed = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function displayValue(element, value) {
    if (value) {
      element.textContent = value;
      element.classList.remove("url-value-muted");
    } else {
      element.textContent = "—";
      element.classList.add("url-value-muted");
    }
  }

  function resetFields() {
    Object.values(fields).forEach(element => displayValue(element, ""));
    queryCount.textContent = "0 parameters";
    queryWrap.innerHTML = '<div class="query-empty">Parse a URL to see query parameters here.</div>';
    lastParsed = null;
  }

  async function copyText(value) {
    if (!value) {
      status.textContent = "Nothing to copy.";
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      status.textContent = "Copied.";
    } catch {
      const temp = document.createElement("textarea");
      temp.value = value;
      temp.setAttribute("readonly", "");
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.select();

      try {
        document.execCommand("copy");
        status.textContent = "Copied.";
      } catch {
        status.textContent = "Could not copy automatically.";
      }

      temp.remove();
    }
  }

  function renderQueryParams(url) {
    const entries = Array.from(url.searchParams.entries());
    const count = entries.length;

    queryCount.textContent = `${count.toLocaleString()} ${count === 1 ? "parameter" : "parameters"}`;

    if (!count) {
      queryWrap.innerHTML = '<div class="query-empty">This URL has no query parameters.</div>';
      return;
    }

    const rows = entries.map(([key, value], index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(key)}</td>
        <td>${escapeHtml(value)}</td>
      </tr>
    `).join("");

    queryWrap.innerHTML = `
      <table class="query-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function parseUrl() {
    status.textContent = "";
    status.classList.remove("url-error");

    const raw = input.value.trim();

    if (!raw) {
      resetFields();
      status.textContent = "Enter a URL first.";
      return;
    }

    try {
      const url = new URL(raw);

      if (!/^https?:$/.test(url.protocol) && !/^ftp:$/.test(url.protocol)) {
        throw new Error("Use a complete URL such as https://example.com/path");
      }

      lastParsed = url;

      displayValue(fields.protocol, url.protocol);
      displayValue(fields.hostname, url.hostname);
      displayValue(fields.port, url.port);
      displayValue(fields.host, url.host);
      displayValue(fields.pathname, url.pathname);
      displayValue(fields.search, url.search);
      displayValue(fields.hash, url.hash);
      displayValue(fields.origin, url.origin);

      renderQueryParams(url);
      status.textContent = "Done.";
    } catch (error) {
      resetFields();
      status.textContent = error.message === "Invalid URL"
        ? "Invalid URL. Include the protocol, for example https://example.com."
        : (error.message || "Could not parse this URL.");
      status.classList.add("url-error");
    }
  }

  parseButton.addEventListener("click", parseUrl);

  sampleButton.addEventListener("click", () => {
    input.value = "https://shop.example.com:8443/products/search?q=wireless+headphones&sort=price&tag=audio&tag=sale#reviews";
    parseUrl();
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    status.textContent = "";
    status.classList.remove("url-error");
    resetFields();
    input.focus();
  });

  copyAllButton.addEventListener("click", () => {
    if (!lastParsed) {
      status.textContent = "Parse a URL first.";
      return;
    }

    const params = Array.from(lastParsed.searchParams.entries())
      .map(([key, value], index) => `Query ${index + 1}: ${key} = ${value}`)
      .join("\n");

    const result = [
      `Protocol: ${lastParsed.protocol || ""}`,
      `Hostname: ${lastParsed.hostname || ""}`,
      `Port: ${lastParsed.port || ""}`,
      `Host: ${lastParsed.host || ""}`,
      `Path: ${lastParsed.pathname || ""}`,
      `Query string: ${lastParsed.search || ""}`,
      `Hash: ${lastParsed.hash || ""}`,
      `Origin: ${lastParsed.origin || ""}`,
      params ? `\n${params}` : ""
    ].filter(Boolean).join("\n");

    copyText(result);
  });

  document.querySelectorAll("[data-copy]").forEach(button => {
    button.addEventListener("click", () => {
      if (!lastParsed) {
        status.textContent = "Parse a URL first.";
        return;
      }

      const key = button.dataset.copy;
      copyText(lastParsed[key] || "");
    });
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") parseUrl();
  });

  input.addEventListener("input", () => {
    status.textContent = "";
    status.classList.remove("url-error");
  });

  resetFields();
})();
