(() => {
  const input = document.getElementById("cleaner-input");
  const output = document.getElementById("cleaner-output");
  const inputCount = document.getElementById("cleaner-input-count");
  const outputCount = document.getElementById("cleaner-output-count");
  const runButton = document.getElementById("cleaner-run-button");
  const copyButton = document.getElementById("cleaner-copy-button");
  const useResultButton = document.getElementById("cleaner-use-result-button");
  const clearButton = document.getElementById("cleaner-clear-button");
  const status = document.getElementById("cleaner-status");
  const summary = document.getElementById("cleaner-summary");
  const trimLines = document.getElementById("opt-trim-lines");
  const extraSpaces = document.getElementById("opt-extra-spaces");
  const blankLines = document.getElementById("opt-blank-lines");
  const duplicateLines = document.getElementById("opt-duplicate-lines");
  const emptyLines = document.getElementById("opt-empty-lines");
  const smartQuotes = document.getElementById("opt-smart-quotes");

  function formatCount(n) { return `${n.toLocaleString()} ${n === 1 ? "character" : "characters"}`; }
  function updateCounts() {
    inputCount.textContent = formatCount(input.value.length);
    outputCount.textContent = formatCount(output.value.length);
  }
  function normalizePunctuation(text) {
    return text
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2026/g, "...");
  }
  function cleanText(text) {
    let value = text.replace(/\r\n?/g, "\n");
    if (smartQuotes.checked) value = normalizePunctuation(value);
    let lines = value.split("\n");
    if (trimLines.checked) lines = lines.map(line => line.trim());
    if (extraSpaces.checked) lines = lines.map(line => line.replace(/[ \t]+/g, " "));
    if (duplicateLines.checked) {
      const seen = new Set();
      lines = lines.filter(line => {
        if (seen.has(line)) return false;
        seen.add(line);
        return true;
      });
    }
    if (emptyLines.checked) {
      lines = lines.filter(line => line.trim() !== "");
    } else if (blankLines.checked) {
      const reduced = [];
      let previousWasBlank = false;
      for (const line of lines) {
        const isBlank = line.trim() === "";
        if (isBlank && previousWasBlank) continue;
        reduced.push(line);
        previousWasBlank = isBlank;
      }
      lines = reduced;
    }
    return lines.join("\n").trim();
  }

  runButton.addEventListener("click", () => {
    if (!input.value) {
      output.value = "";
      summary.textContent = "";
      status.textContent = "Enter some text first.";
      updateCounts();
      return;
    }
    const before = input.value.length;
    output.value = cleanText(input.value);
    const after = output.value.length;
    const removed = Math.max(0, before - after);
    status.textContent = "Done.";
    summary.textContent = removed ? `${removed.toLocaleString()} characters removed` : "No characters removed";
    updateCounts();
  });

  input.addEventListener("input", () => { status.textContent = ""; summary.textContent = ""; updateCounts(); });
  output.addEventListener("input", updateCounts);

  copyButton.addEventListener("click", async () => {
    if (!output.value) { status.textContent = "Create a cleaned result first."; return; }
    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = "Copied.";
    } catch {
      output.focus();
      output.select();
      try { document.execCommand("copy"); status.textContent = "Copied."; }
      catch { status.textContent = "Could not copy automatically. Select the result and copy it manually."; }
    }
  });

  useResultButton.addEventListener("click", () => {
    if (!output.value) { status.textContent = "Create a cleaned result first."; return; }
    input.value = output.value;
    status.textContent = "Result moved to input.";
    summary.textContent = "";
    updateCounts();
    input.focus();
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    output.value = "";
    status.textContent = "";
    summary.textContent = "";
    updateCounts();
    input.focus();
  });

  updateCounts();
})();
