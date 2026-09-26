(() => {
  const patternInput = document.getElementById("regex-pattern");
  const textInput = document.getElementById("regex-text");
  const runButton = document.getElementById("regex-run");
  const sampleButton = document.getElementById("regex-sample");
  const clearButton = document.getElementById("regex-clear");
  const preview = document.getElementById("regex-preview");
  const results = document.getElementById("regex-results");
  const status = document.getElementById("regex-status");
  const textCount = document.getElementById("regex-text-count");
  const matchSummary = document.getElementById("regex-match-summary");
  const resultCount = document.getElementById("regex-result-count");
  const flagsDisplay = document.getElementById("regex-flags-display");

  const flags = {
    g: document.getElementById("regex-flag-g"),
    i: document.getElementById("regex-flag-i"),
    m: document.getElementById("regex-flag-m"),
    s: document.getElementById("regex-flag-s"),
    u: document.getElementById("regex-flag-u")
  };

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getFlags() {
    return Object.entries(flags)
      .filter(([, input]) => input.checked)
      .map(([flag]) => flag)
      .join("");
  }

  function updateFlagsDisplay() {
    flagsDisplay.textContent = `/${getFlags()}`;
  }

  function updateTextCount() {
    const n = textInput.value.length;
    textCount.textContent = `${n.toLocaleString()} ${n === 1 ? "character" : "characters"}`;
  }

  function resetOutput(message = "Run a regular expression to inspect matches and capture groups.") {
    preview.textContent = textInput.value || "Matches will be highlighted here.";
    results.innerHTML = `<div class="regex-empty">${escapeHtml(message)}</div>`;
    matchSummary.textContent = "0 matches";
    resultCount.textContent = "0 results";
  }

  function buildRegex(forceGlobal = false) {
    const pattern = patternInput.value;
    if (!pattern) throw new Error("Enter a regular expression first.");

    let activeFlags = getFlags();
    if (forceGlobal && !activeFlags.includes("g")) activeFlags += "g";
    return new RegExp(pattern, activeFlags);
  }

  function collectMatches(text) {
    const userGlobal = flags.g.checked;
    const regex = buildRegex(true);
    const matches = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      matches.push(match);

      if (!userGlobal) break;

      // Prevent an infinite loop for zero-length matches.
      if (match[0] === "") {
        if (regex.lastIndex >= text.length) break;
        regex.lastIndex += 1;
      }

      if (matches.length >= 5000) {
        throw new Error("Too many matches. Narrow the pattern or test a smaller text sample.");
      }
    }

    return matches;
  }

  function renderPreview(text, matches) {
    if (!text) {
      preview.textContent = "Matches will be highlighted here.";
      return;
    }

    if (!matches.length) {
      preview.textContent = text;
      return;
    }

    let cursor = 0;
    let html = "";

    for (const match of matches) {
      const start = match.index;
      const end = start + match[0].length;

      if (start < cursor) continue;

      html += escapeHtml(text.slice(cursor, start));

      if (end === start) {
        html += `<mark title="Zero-length match">​</mark>`;
      } else {
        html += `<mark>${escapeHtml(text.slice(start, end))}</mark>`;
      }

      cursor = end;
    }

    html += escapeHtml(text.slice(cursor));
    preview.innerHTML = html;
  }

  function renderGroups(match) {
    const groupParts = [];

    for (let i = 1; i < match.length; i++) {
      const value = match[i];
      groupParts.push(
        `<div class="regex-group"><strong>Group ${i}:</strong> ${
          value === undefined ? "<em>undefined</em>" : `<code>${escapeHtml(value)}</code>`
        }</div>`
      );
    }

    if (match.groups) {
      for (const [name, value] of Object.entries(match.groups)) {
        groupParts.push(
          `<div class="regex-group"><strong>Named group ${escapeHtml(name)}:</strong> ${
            value === undefined ? "<em>undefined</em>" : `<code>${escapeHtml(value)}</code>`
          }</div>`
        );
      }
    }

    return groupParts.length
      ? `<div class="regex-groups">${groupParts.join("")}</div>`
      : "";
  }

  function renderResults(matches) {
    if (!matches.length) {
      results.innerHTML = '<div class="regex-empty">No matches found.</div>';
      return;
    }

    results.innerHTML = matches.map((match, index) => {
      const end = match.index + match[0].length;
      return `
        <article class="regex-match">
          <div class="regex-match-top">
            <span class="regex-match-index">Match ${index + 1}</span>
            <span class="regex-match-pos">index ${match.index}${match[0].length ? `–${end - 1}` : " · zero-length"}</span>
          </div>
          <code class="regex-code">${match[0] === "" ? "(empty match)" : escapeHtml(match[0])}</code>
          ${renderGroups(match)}
        </article>
      `;
    }).join("");
  }

  function runTest() {
    status.textContent = "";

    try {
      const text = textInput.value;
      const matches = collectMatches(text);

      renderPreview(text, matches);
      renderResults(matches);

      const count = matches.length;
      matchSummary.textContent = `${count.toLocaleString()} ${count === 1 ? "match" : "matches"}`;
      resultCount.textContent = `${count.toLocaleString()} ${count === 1 ? "result" : "results"}`;
      status.textContent = count ? "Done." : "No matches found.";
      status.classList.remove("regex-error");
    } catch (error) {
      resetOutput("Fix the regular expression and try again.");
      status.textContent = error.message || "Invalid regular expression.";
      status.classList.add("regex-error");
    }
  }

  runButton.addEventListener("click", runTest);

  sampleButton.addEventListener("click", () => {
    patternInput.value = "(?<user>[\\w.+-]+)@(?<domain>[\\w.-]+\\.[A-Za-z]{2,})";
    textInput.value = [
      "Contact alice@example.com or bob.smith@sample.org.",
      "You can also write to support@pocketworkshop.dev."
    ].join("\n");

    flags.g.checked = true;
    flags.i.checked = true;
    flags.m.checked = false;
    flags.s.checked = false;
    flags.u.checked = false;

    updateFlagsDisplay();
    updateTextCount();
    runTest();
  });

  clearButton.addEventListener("click", () => {
    patternInput.value = "";
    textInput.value = "";
    status.textContent = "";
    status.classList.remove("regex-error");
    updateTextCount();
    resetOutput();
    patternInput.focus();
  });

  patternInput.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") runTest();
  });

  textInput.addEventListener("input", () => {
    updateTextCount();
    status.textContent = "";
    status.classList.remove("regex-error");
  });

  Object.values(flags).forEach(input => {
    input.addEventListener("change", () => {
      updateFlagsDisplay();
      status.textContent = "";
      status.classList.remove("regex-error");
    });
  });

  updateFlagsDisplay();
  updateTextCount();
  resetOutput();
})();
