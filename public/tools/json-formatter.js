(() => {
  const input = document.getElementById("json-input");
  const output = document.getElementById("json-output");
  const inputCount = document.getElementById("json-input-count");
  const outputCount = document.getElementById("json-output-count");
  const indentSelect = document.getElementById("json-indent");
  const sortKeys = document.getElementById("json-sort-keys");
  const formatButton = document.getElementById("json-format-button");
  const minifyButton = document.getElementById("json-minify-button");
  const validateButton = document.getElementById("json-validate-button");
  const copyButton = document.getElementById("json-copy-button");
  const downloadButton = document.getElementById("json-download-button");
  const clearButton = document.getElementById("json-clear-button");
  const status = document.getElementById("json-status");

  function formatCount(length) {
    return `${length.toLocaleString()} ${length === 1 ? "character" : "characters"}`;
  }

  function updateCounts() {
    inputCount.textContent = formatCount(input.value.length);
    outputCount.textContent = formatCount(output.value.length);
  }

  function parseInput() {
    if (!input.value.trim()) {
      throw new Error("Enter JSON first.");
    }
    return JSON.parse(input.value);
  }

  function sortRecursively(value) {
    if (Array.isArray(value)) {
      return value.map(sortRecursively);
    }

    if (value && typeof value === "object") {
      const sorted = {};
      Object.keys(value)
        .sort((a, b) => a.localeCompare(b))
        .forEach((key) => {
          sorted[key] = sortRecursively(value[key]);
        });
      return sorted;
    }

    return value;
  }

  function currentIndent() {
    return indentSelect.value === "tab" ? "\t" : Number(indentSelect.value);
  }

  function preparedValue() {
    const parsed = parseInput();
    return sortKeys.checked ? sortRecursively(parsed) : parsed;
  }

  function setSuccess(message) {
    status.className = "status json-valid";
    status.textContent = message;
  }

  function setError(error) {
    status.className = "status json-error";
    status.textContent = error && error.message ? error.message : "Invalid JSON.";
  }

  formatButton.addEventListener("click", () => {
    try {
      const parsed = preparedValue();
      output.value = JSON.stringify(parsed, null, currentIndent());
      setSuccess("Valid JSON · formatted.");
    } catch (error) {
      output.value = "";
      setError(error);
    }
    updateCounts();
  });

  minifyButton.addEventListener("click", () => {
    try {
      const parsed = preparedValue();
      output.value = JSON.stringify(parsed);
      setSuccess("Valid JSON · minified.");
    } catch (error) {
      output.value = "";
      setError(error);
    }
    updateCounts();
  });

  validateButton.addEventListener("click", () => {
    try {
      parseInput();
      setSuccess("Valid JSON.");
    } catch (error) {
      setError(error);
    }
  });

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      setError(new Error("Create a result first."));
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      setSuccess("Copied.");
    } catch {
      output.focus();
      output.select();
      try {
        document.execCommand("copy");
        setSuccess("Copied.");
      } catch {
        setError(new Error("Could not copy automatically. Select the result and copy it manually."));
      }
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!output.value) {
      setError(new Error("Create a result first."));
      return;
    }

    const blob = new Blob([output.value], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "formatted.json";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    setSuccess("Download started.");
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    output.value = "";
    status.className = "status";
    status.textContent = "";
    updateCounts();
    input.focus();
  });

  input.addEventListener("input", () => {
    status.className = "status";
    status.textContent = "";
    updateCounts();
  });

  output.addEventListener("input", updateCounts);

  updateCounts();
})();
