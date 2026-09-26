(() => {
  const input = document.getElementById("sorter-input");
  const output = document.getElementById("sorter-output");
  const inputCount = document.getElementById("sorter-input-count");
  const outputCount = document.getElementById("sorter-output-count");
  const mode = document.getElementById("sorter-mode");
  const ignoreCase = document.getElementById("sorter-ignore-case");
  const trimCompare = document.getElementById("sorter-trim-compare");
  const removeBlank = document.getElementById("sorter-remove-blank");
  const runButton = document.getElementById("sorter-run");
  const copyButton = document.getElementById("sorter-copy");
  const useResultButton = document.getElementById("sorter-use-result");
  const sampleButton = document.getElementById("sorter-sample");
  const clearButton = document.getElementById("sorter-clear");
  const status = document.getElementById("sorter-status");
  const statInput = document.getElementById("sorter-stat-input");
  const statOutput = document.getElementById("sorter-stat-output");
  const statBlank = document.getElementById("sorter-stat-blank");

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

  function resetStats() {
    statInput.textContent = "0";
    statOutput.textContent = "0";
    statBlank.textContent = "0";
  }

  function comparisonValue(line) {
    let value = trimCompare.checked ? line.trim() : line;
    if (ignoreCase.checked) value = value.toLocaleLowerCase();
    return value;
  }

  function createCollator(numeric) {
    return new Intl.Collator(undefined, {
      numeric,
      sensitivity: ignoreCase.checked ? "base" : "variant"
    });
  }

  function numericValue(line) {
    const value = comparisonValue(line).replace(/,/g, "");
    const match = value.match(/[-+]?(?:\d+\.?\d*|\.\d+)/);
    return match ? Number(match[0]) : Number.NaN;
  }

  function stableSort(lines, compare) {
    return lines
      .map((line, index) => ({ line, index }))
      .sort((a, b) => {
        const result = compare(a.line, b.line);
        return result || a.index - b.index;
      })
      .map(item => item.line);
  }

  function shuffle(lines) {
    const result = [...lines];

    function randomIndex(max) {
      if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
        const range = 0x100000000;
        const limit = range - (range % max);
        const bucket = new Uint32Array(1);
        let value;
        do {
          globalThis.crypto.getRandomValues(bucket);
          value = bucket[0];
        } while (value >= limit);
        return value % max;
      }
      return Math.floor(Math.random() * max);
    }

    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = randomIndex(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function sortLines(lines) {
    if (mode.value === "random") return shuffle(lines);

    if (mode.value === "short" || mode.value === "long") {
      const direction = mode.value === "short" ? 1 : -1;
      const collator = createCollator(true);
      return stableSort(lines, (a, b) => {
        const aValue = comparisonValue(a);
        const bValue = comparisonValue(b);
        const lengthDiff = (aValue.length - bValue.length) * direction;
        if (lengthDiff) return lengthDiff;
        return collator.compare(aValue, bValue) * direction;
      });
    }

    if (mode.value === "numeric" || mode.value === "numeric-desc") {
      const direction = mode.value === "numeric" ? 1 : -1;
      const collator = createCollator(true);
      return stableSort(lines, (a, b) => {
        const aNumber = numericValue(a);
        const bNumber = numericValue(b);
        const aValid = Number.isFinite(aNumber);
        const bValid = Number.isFinite(bNumber);

        if (aValid && bValid && aNumber !== bNumber) return (aNumber - bNumber) * direction;
        if (aValid !== bValid) return aValid ? -1 : 1;
        return collator.compare(comparisonValue(a), comparisonValue(b)) * direction;
      });
    }

    const natural = mode.value === "natural" || mode.value === "natural-desc";
    const direction = mode.value === "za" || mode.value === "natural-desc" ? -1 : 1;
    const collator = createCollator(natural);
    return stableSort(lines, (a, b) => collator.compare(comparisonValue(a), comparisonValue(b)) * direction);
  }

  function run() {
    if (!input.value) {
      output.value = "";
      status.textContent = "Enter some text first.";
      resetStats();
      updateCounts();
      return;
    }

    const originalLines = splitLines(input.value);
    let lines = [...originalLines];
    let removedBlank = 0;

    if (removeBlank.checked) {
      const before = lines.length;
      lines = lines.filter(line => line.trim() !== "");
      removedBlank = before - lines.length;
    }

    const sorted = sortLines(lines);
    output.value = sorted.join("\n");

    statInput.textContent = originalLines.length.toLocaleString();
    statOutput.textContent = sorted.length.toLocaleString();
    statBlank.textContent = removedBlank.toLocaleString();
    status.textContent = mode.value === "random" ? "Lines shuffled." : "Lines sorted.";
    updateCounts();
  }

  runButton.addEventListener("click", run);

  input.addEventListener("input", () => {
    status.textContent = "";
    resetStats();
    updateCounts();
  });

  output.addEventListener("input", updateCounts);

  [mode, ignoreCase, trimCompare, removeBlank].forEach(control => {
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
      "item10",
      "Banana",
      "item2",
      "apple",
      "42",
      "7",
      "Cherry",
      "item1",
      "100"
    ].join("\n");
    output.value = "";
    mode.value = "natural";
    ignoreCase.checked = true;
    trimCompare.checked = true;
    removeBlank.checked = false;
    status.textContent = "Sample loaded. Click Sort lines.";
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
