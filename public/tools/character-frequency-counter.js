(() => {
  const input = document.getElementById("freq-input");
  const inputCount = document.getElementById("freq-input-count");
  const mode = document.getElementById("freq-mode");
  const sort = document.getElementById("freq-sort");
  const filter = document.getElementById("freq-filter");
  const ignoreCase = document.getElementById("freq-ignore-case");
  const ignoreSpaces = document.getElementById("freq-ignore-spaces");
  const analyzeButton = document.getElementById("freq-analyze");
  const copyCsvButton = document.getElementById("freq-copy-csv");
  const sampleButton = document.getElementById("freq-sample");
  const clearButton = document.getElementById("freq-clear");
  const status = document.getElementById("freq-status");
  const totalEl = document.getElementById("freq-total");
  const totalLabel = document.getElementById("freq-total-label");
  const uniqueEl = document.getElementById("freq-unique");
  const mostEl = document.getElementById("freq-most");
  const mostCountEl = document.getElementById("freq-most-count");
  const results = document.getElementById("freq-results");
  const empty = document.getElementById("freq-empty");

  let rows = [];
  let totalCount = 0;

  function segmentWords(text) {
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
      return Array.from(segmenter.segment(text))
        .filter(part => part.isWordLike)
        .map(part => part.segment);
    }
    return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || [];
  }

  function segmentCharacters(text) {
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return Array.from(segmenter.segment(text), part => part.segment);
    }
    return Array.from(text);
  }

  function formatToken(token) {
    if (token === " ") return "␠ space";
    if (token === "\t") return "⇥ tab";
    if (token === "\n") return "↵ newline";
    if (token === "\r") return "↵ carriage return";
    return token;
  }

  function countWordsForHeader(text) {
    return segmentWords(text).length;
  }

  function updateInputCount() {
    const chars = segmentCharacters(input.value).length;
    const words = countWordsForHeader(input.value);
    inputCount.textContent = `${chars.toLocaleString()} ${chars === 1 ? "character" : "characters"} · ${words.toLocaleString()} ${words === 1 ? "word" : "words"}`;
  }

  function normalizeToken(token) {
    return ignoreCase.checked ? token.toLocaleLowerCase() : token;
  }

  function buildRows() {
    let tokens = mode.value === "words" ? segmentWords(input.value) : segmentCharacters(input.value);

    if (mode.value === "characters" && ignoreSpaces.checked) {
      tokens = tokens.filter(token => !/^\s+$/u.test(token));
    }

    const counts = new Map();
    for (const rawToken of tokens) {
      const token = normalizeToken(rawToken);
      counts.set(token, (counts.get(token) || 0) + 1);
    }

    totalCount = tokens.length;
    rows = Array.from(counts, ([token, count]) => ({ token, count }));
  }

  function sortedFilteredRows() {
    const needle = normalizeToken(filter.value.trim());
    const data = needle ? rows.filter(row => row.token.includes(needle)) : rows.slice();

    data.sort((a, b) => {
      if (sort.value === "frequency-asc") return a.count - b.count || a.token.localeCompare(b.token);
      if (sort.value === "az") return a.token.localeCompare(b.token, undefined, { numeric: true, sensitivity: ignoreCase.checked ? "base" : "variant" });
      if (sort.value === "za") return b.token.localeCompare(a.token, undefined, { numeric: true, sensitivity: ignoreCase.checked ? "base" : "variant" });
      return b.count - a.count || a.token.localeCompare(b.token);
    });

    return data;
  }

  function render() {
    const data = sortedFilteredRows();
    results.textContent = "";
    empty.style.display = data.length ? "none" : "block";

    const maxCount = rows.length ? Math.max(...rows.map(row => row.count)) : 0;

    for (const row of data) {
      const tr = document.createElement("tr");

      const tokenTd = document.createElement("td");
      tokenTd.className = "freq-token";
      tokenTd.textContent = formatToken(row.token);

      const countTd = document.createElement("td");
      countTd.textContent = row.count.toLocaleString();

      const percentTd = document.createElement("td");
      const percent = totalCount ? (row.count / totalCount) * 100 : 0;
      percentTd.textContent = `${percent.toFixed(percent >= 10 ? 1 : 2)}%`;

      const barTd = document.createElement("td");
      const bar = document.createElement("div");
      bar.className = "freq-bar";
      const fill = document.createElement("span");
      fill.style.width = `${maxCount ? (row.count / maxCount) * 100 : 0}%`;
      bar.appendChild(fill);
      barTd.appendChild(bar);

      tr.append(tokenTd, countTd, percentTd, barTd);
      results.appendChild(tr);
    }
  }

  function updateSummary() {
    totalEl.textContent = totalCount.toLocaleString();
    totalLabel.textContent = mode.value === "words" ? "counted words" : "counted characters";
    uniqueEl.textContent = rows.length.toLocaleString();

    if (!rows.length) {
      mostEl.textContent = "—";
      mostCountEl.textContent = "0";
      return;
    }

    const top = rows.reduce((best, row) => row.count > best.count ? row : best, rows[0]);
    mostEl.textContent = formatToken(top.token);
    mostEl.title = formatToken(top.token);
    mostCountEl.textContent = top.count.toLocaleString();
  }

  function analyze() {
    if (!input.value) {
      rows = [];
      totalCount = 0;
      render();
      updateSummary();
      status.textContent = "Enter some text first.";
      return;
    }

    buildRows();
    render();
    updateSummary();
    status.textContent = rows.length ? "Done." : "No countable items found.";
  }

  function csvEscape(value) {
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  async function copyCsv() {
    const data = sortedFilteredRows();
    if (!data.length) {
      status.textContent = "Analyze some text first.";
      return;
    }

    const lines = ["item,count,percent"];
    for (const row of data) {
      const percent = totalCount ? (row.count / totalCount) * 100 : 0;
      lines.push(`${csvEscape(row.token)},${row.count},${percent.toFixed(4)}`);
    }
    const csv = lines.join("\n");

    try {
      await navigator.clipboard.writeText(csv);
      status.textContent = "CSV copied.";
    } catch {
      const helper = document.createElement("textarea");
      helper.value = csv;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      try {
        document.execCommand("copy");
        status.textContent = "CSV copied.";
      } catch {
        status.textContent = "Could not copy automatically.";
      }
      helper.remove();
    }
  }

  input.addEventListener("input", () => {
    updateInputCount();
    status.textContent = "";
  });

  analyzeButton.addEventListener("click", analyze);
  copyCsvButton.addEventListener("click", copyCsv);
  filter.addEventListener("input", render);
  sort.addEventListener("change", render);
  mode.addEventListener("change", () => {
    ignoreSpaces.disabled = mode.value === "words";
    if (input.value) analyze();
    else updateSummary();
  });
  ignoreCase.addEventListener("change", () => { if (input.value) analyze(); });
  ignoreSpaces.addEventListener("change", () => { if (input.value) analyze(); });

  sampleButton.addEventListener("click", () => {
    input.value = "Pocket tools make everyday tasks easier. Tools save time, and simple tools are easy to use. PocketWorkshop keeps useful tools in your pocket.";
    updateInputCount();
    analyze();
    input.focus();
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    filter.value = "";
    rows = [];
    totalCount = 0;
    results.textContent = "";
    empty.style.display = "block";
    empty.textContent = "Analyze some text to see frequency results here.";
    status.textContent = "";
    updateInputCount();
    updateSummary();
    input.focus();
  });

  updateInputCount();
  updateSummary();
})();
