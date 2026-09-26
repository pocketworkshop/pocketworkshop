(() => {
  const input = document.getElementById("jtc-input");
  const output = document.getElementById("jtc-output");
  const inputCount = document.getElementById("jtc-input-count");
  const outputCount = document.getElementById("jtc-output-count");
  const delimiterSelect = document.getElementById("jtc-delimiter");
  const nestedMode = document.getElementById("jtc-nested-mode");
  const lineEndingSelect = document.getElementById("jtc-line-ending");
  const headerCheck = document.getElementById("jtc-header");
  const bomCheck = document.getElementById("jtc-bom");
  const convertButton = document.getElementById("jtc-convert-button");
  const copyButton = document.getElementById("jtc-copy-button");
  const downloadButton = document.getElementById("jtc-download-button");
  const sampleButton = document.getElementById("jtc-sample-button");
  const clearButton = document.getElementById("jtc-clear-button");
  const status = document.getElementById("jtc-status");
  const summary = document.getElementById("jtc-summary");

  let lastText = "";
  let lastFilename = "converted.csv";

  function formatCount(n) {
    return `${n.toLocaleString()} ${n === 1 ? "character" : "characters"}`;
  }

  function updateCounts() {
    inputCount.textContent = formatCount(input.value.length);
    outputCount.textContent = formatCount(output.value.length);
  }

  function setError(message) {
    status.className = "status jtc-error";
    status.textContent = message;
  }

  function setSuccess(message) {
    status.className = "status";
    status.textContent = message;
  }

  function delimiterValue() {
    return delimiterSelect.value === "tab" ? "\t" : delimiterSelect.value;
  }

  function lineEnding() {
    return lineEndingSelect.value === "crlf" ? "\r\n" : "\n";
  }

  function flattenObject(value, prefix = "", result = {}) {
    Object.entries(value || {}).forEach(([key, item]) => {
      const path = prefix ? `${prefix}.${key}` : key;

      if (item && typeof item === "object" && !Array.isArray(item)) {
        flattenObject(item, path, result);
      } else {
        result[path] = item;
      }
    });

    return result;
  }

  function prepareRows(data) {
    if (!Array.isArray(data)) {
      throw new Error("The top-level JSON value must be an array.");
    }

    if (!data.length) {
      throw new Error("The JSON array is empty.");
    }

    if (data.some((item) => item === null || typeof item !== "object" || Array.isArray(item))) {
      throw new Error("Each array item must be a JSON object.");
    }

    if (nestedMode.value === "flatten") {
      return data.map((item) => flattenObject(item));
    }

    return data;
  }

  function displayValue(value) {
    if (value === null || value === undefined) return "";

    if (typeof value === "object") {
      if (nestedMode.value === "blank") return "";
      return JSON.stringify(value);
    }

    return String(value);
  }

  function escapeField(value, delimiter) {
    const text = displayValue(value);

    if (
      text.includes('"') ||
      text.includes(delimiter) ||
      text.includes("\n") ||
      text.includes("\r") ||
      /^\s|\s$/.test(text)
    ) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  }

  function convert() {
    if (!input.value.trim()) {
      output.value = "";
      summary.textContent = "";
      lastText = "";
      setError("Paste JSON first.");
      updateCounts();
      return;
    }

    try {
      const parsed = JSON.parse(input.value);
      const rows = prepareRows(parsed);
      const columns = [];

      rows.forEach((row) => {
        Object.keys(row).forEach((key) => {
          if (!columns.includes(key)) columns.push(key);
        });
      });

      if (!columns.length) {
        throw new Error("No object keys were found.");
      }

      const delimiter = delimiterValue();
      const eol = lineEnding();
      const lines = [];

      if (headerCheck.checked) {
        lines.push(columns.map((key) => escapeField(key, delimiter)).join(delimiter));
      }

      rows.forEach((row) => {
        lines.push(columns.map((key) => escapeField(row[key], delimiter)).join(delimiter));
      });

      lastText = lines.join(eol);
      output.value = lastText;

      const extension =
        delimiter === "\t" ? "tsv" :
        delimiter === "," ? "csv" :
        "txt";

      lastFilename = `converted.${extension}`;
      summary.textContent = `${rows.length.toLocaleString()} ${rows.length === 1 ? "row" : "rows"} · ${columns.length.toLocaleString()} ${columns.length === 1 ? "column" : "columns"}`;
      setSuccess("Converted.");
      updateCounts();
    } catch (error) {
      output.value = "";
      summary.textContent = "";
      lastText = "";
      setError(error.message || "Could not convert this JSON.");
      updateCounts();
    }
  }

  convertButton.addEventListener("click", convert);

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      setError("Convert some JSON first.");
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
        setError("Could not copy automatically. Select the result and copy it manually.");
      }
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!lastText) {
      setError("Convert some JSON first.");
      return;
    }

    const prefix = bomCheck.checked ? "\uFEFF" : "";
    const blob = new Blob([prefix + lastText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = lastFilename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);

    setSuccess("Download started.");
  });

  sampleButton.addEventListener("click", () => {
    input.value = JSON.stringify([
      {
        name: "Alice",
        age: 31,
        active: true,
        city: "London",
        address: { country: "UK", postcode: "SW1A" },
        tags: ["admin", "editor"]
      },
      {
        name: "Bob",
        age: 28,
        active: false,
        city: "Tokyo",
        address: { country: "Japan", postcode: "100-0001" },
        tags: ["viewer"]
      }
    ], null, 2);

    output.value = "";
    lastText = "";
    summary.textContent = "";
    setSuccess("Sample loaded.");
    updateCounts();
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    output.value = "";
    lastText = "";
    summary.textContent = "";
    status.className = "status";
    status.textContent = "";
    updateCounts();
    input.focus();
  });

  input.addEventListener("input", () => {
    status.className = "status";
    status.textContent = "";
    summary.textContent = "";
    lastText = "";
    updateCounts();
  });

  output.addEventListener("input", updateCounts);

  updateCounts();
})();
