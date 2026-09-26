(() => {
  const input = document.getElementById("duplicate-input");
  const output = document.getElementById("duplicate-output");
  const inputCount = document.getElementById("duplicate-input-count");
  const outputCount = document.getElementById("duplicate-output-count");
  const ignoreCase = document.getElementById("duplicate-ignore-case");
  const ignoreWhitespace = document.getElementById("duplicate-ignore-whitespace");
  const dedupeBlank = document.getElementById("duplicate-dedupe-blank");
  const keepMode = document.getElementById("duplicate-keep-mode");
  const runButton = document.getElementById("duplicate-run");
  const copyButton = document.getElementById("duplicate-copy");
  const useResultButton = document.getElementById("duplicate-use-result");
  const sampleButton = document.getElementById("duplicate-sample");
  const clearButton = document.getElementById("duplicate-clear");
  const status = document.getElementById("duplicate-status");
  const statOriginal = document.getElementById("duplicate-stat-original");
  const statUnique = document.getElementById("duplicate-stat-unique");
  const statRemoved = document.getElementById("duplicate-stat-removed");

  function splitLines(value) {
    if (!value) return [];
    return value.replace(/\r\n?/g, "\n").split("\n");
  }

  function lineLabel(count) {
    return `${count.toLocaleString()} ${count === 1 ? "line" : "lines"}`;
  }

  function updateCounts() {
    const inputLines = splitLines(input.value).length;
    const outputLines = splitLines(output.value).length;
    inputCount.textContent = `${lineLabel(inputLines)} · ${input.value.length.toLocaleString()} characters`;
    outputCount.textContent = `${lineLabel(outputLines)} · ${output.value.length.toLocaleString()} characters`;
  }

  function makeKey(line, index) {
    let key = line;
    if (ignoreWhitespace.checked) key = key.trim();
    if (ignoreCase.checked) key = key.toLocaleLowerCase();

    if (!dedupeBlank.checked && key.trim() === "") {
      return `__blank_line_${index}`;
    }

    return key;
  }

  function removeDuplicates(lines) {
    if (keepMode.value === "last") {
      const lastIndex = new Map();
      lines.forEach((line, index) => {
        lastIndex.set(makeKey(line, index), index);
      });

      return lines.filter((line, index) => lastIndex.get(makeKey(line, index)) === index);
    }

    const seen = new Set();
    return lines.filter((line, index) => {
      const key = makeKey(line, index);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function resetStats() {
    statOriginal.textContent = "0";
    statUnique.textContent = "0";
    statRemoved.textContent = "0";
  }

  function run() {
    if (!input.value) {
      output.value = "";
      status.textContent = "Enter some text first.";
      resetStats();
      updateCounts();
      return;
    }

    const lines = splitLines(input.value);
    const unique = removeDuplicates(lines);
    const removed = Math.max(0, lines.length - unique.length);

    output.value = unique.join("\n");
    statOriginal.textContent = lines.length.toLocaleString();
    statUnique.textContent = unique.length.toLocaleString();
    statRemoved.textContent = removed.toLocaleString();
    status.textContent = removed ? `Removed ${removed.toLocaleString()} duplicate ${removed === 1 ? "line" : "lines"}.` : "No duplicate lines found.";
    updateCounts();
  }

  runButton.addEventListener("click", run);

  input.addEventListener("input", () => {
    status.textContent = "";
    resetStats();
    updateCounts();
  });

  output.addEventListener("input", updateCounts);

  [ignoreCase, ignoreWhitespace, dedupeBlank, keepMode].forEach(control => {
    control.addEventListener("change", () => {
      status.textContent = "";
      resetStats();
    });
  });

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      status.textContent = "Create a result first.";
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = "Copied.";
    } catch {
      output.focus();
      output.select();
      try {
        document.execCommand("copy");
        status.textContent = "Copied.";
      } catch {
        status.textContent = "Could not copy automatically. Select the result and copy it manually.";
      }
    }
  });

  useResultButton.addEventListener("click", () => {
    if (!output.value) {
      status.textContent = "Create a result first.";
      return;
    }

    input.value = output.value;
    output.value = "";
    status.textContent = "Result moved to input.";
    resetStats();
    updateCounts();
    input.focus();
  });

  sampleButton.addEventListener("click", () => {
    input.value = [
      "apple",
      "banana",
      "Apple",
      "orange",
      " banana ",
      "grape",
      "apple",
      "orange"
    ].join("\n");
    output.value = "";
    ignoreCase.checked = true;
    ignoreWhitespace.checked = true;
    dedupeBlank.checked = true;
    keepMode.value = "first";
    status.textContent = "Sample loaded. Click Remove duplicates.";
    resetStats();
    updateCounts();
    input.focus();
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    output.value = "";
    status.textContent = "";
    resetStats();
    updateCounts();
    input.focus();
  });

  updateCounts();
})();
