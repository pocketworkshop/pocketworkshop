(() => {
  const input = document.getElementById("csv-input");
  const output = document.getElementById("csv-output");
  const inputCount = document.getElementById("csv-input-count");
  const outputCount = document.getElementById("csv-output-count");
  const delimiterSelect = document.getElementById("csv-delimiter");
  const indentSelect = document.getElementById("csv-indent");
  const emptyMode = document.getElementById("csv-empty-mode");
  const headerCheck = document.getElementById("csv-header");
  const typesCheck = document.getElementById("csv-types");
  const skipEmptyCheck = document.getElementById("csv-skip-empty");
  const convertButton = document.getElementById("csv-convert-button");
  const copyButton = document.getElementById("csv-copy-button");
  const downloadButton = document.getElementById("csv-download-button");
  const sampleButton = document.getElementById("csv-sample-button");
  const clearButton = document.getElementById("csv-clear-button");
  const status = document.getElementById("csv-status");
  const summary = document.getElementById("csv-summary");

  function formatCount(n) {
    return `${n.toLocaleString()} ${n === 1 ? "character" : "characters"}`;
  }

  function updateCounts() {
    inputCount.textContent = formatCount(input.value.length);
    outputCount.textContent = formatCount(output.value.length);
  }

  function setError(message) {
    status.className = "status csv-error";
    status.textContent = message;
  }

  function setSuccess(message) {
    status.className = "status";
    status.textContent = message;
  }

  function delimiterValue() {
    if (delimiterSelect.value === "tab") return "\t";
    return delimiterSelect.value;
  }

  function countOutsideQuotes(line, delimiter) {
    let inQuotes = false;
    let count = 0;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (!inQuotes && char === delimiter) {
        count += 1;
      }
    }

    return count;
  }

  function autoDetectDelimiter(text) {
    const candidates = [",", ";", "\t", "|"];
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (!lines.length) return ",";

    let best = ",";
    let bestScore = -1;

    for (const candidate of candidates) {
      const counts = lines.map((line) => countOutsideQuotes(line, candidate));
      const positive = counts.filter((count) => count > 0);

      if (!positive.length) continue;

      const same = positive.filter((count) => count === positive[0]).length;
      const score = same * 100 + positive.reduce((sum, count) => sum + count, 0);

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    return best;
  }

  function parseDelimited(text, delimiter) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') {
        if (field === "") {
          inQuotes = true;
        } else {
          field += char;
        }
      } else if (char === delimiter) {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (char === "\r") {
        if (text[i + 1] === "\n") continue;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }

    if (inQuotes) {
      throw new Error("A quoted field is not closed.");
    }

    if (field !== "" || row.length > 0 || text.endsWith(delimiter)) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }

  function uniqueHeaders(headers) {
    const seen = new Map();

    return headers.map((header, index) => {
      let base = String(header || "").trim();
      if (!base) base = `column_${index + 1}`;

      const count = seen.get(base) || 0;
      seen.set(base, count + 1);

      return count === 0 ? base : `${base}_${count + 1}`;
    });
  }

  function inferValue(raw) {
    const value = raw.trim();

    if (value === "") {
      return emptyMode.value === "null" ? null : "";
    }

    if (!typesCheck.checked) return raw;

    if (/^(true|false)$/i.test(value)) {
      return value.toLowerCase() === "true";
    }

    if (/^null$/i.test(value)) {
      return null;
    }

    if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }

    return raw;
  }

  function convertRows(rows) {
    if (skipEmptyCheck.checked) {
      rows = rows.filter((row) => row.some((cell) => String(cell).trim() !== ""));
    }

    if (!rows.length) {
      throw new Error("No rows were found.");
    }

    if (headerCheck.checked) {
      const headers = uniqueHeaders(rows[0]);
      const dataRows = rows.slice(1);

      return dataRows.map((row) => {
        const object = {};
        headers.forEach((header, index) => {
          object[header] = inferValue(index < row.length ? row[index] : "");
        });
        return object;
      });
    }

    return rows.map((row) => row.map(inferValue));
  }

  function convert() {
    const text = input.value;

    if (!text.trim()) {
      output.value = "";
      summary.textContent = "";
      setError("Paste CSV data first.");
      updateCounts();
      return;
    }

    try {
      const delimiter = delimiterSelect.value === "auto"
        ? autoDetectDelimiter(text)
        : delimiterValue();

      const rows = parseDelimited(text, delimiter);
      const result = convertRows(rows);
      const indent = Number(indentSelect.value);

      output.value = JSON.stringify(result, null, indent || 0);

      const delimiterName =
        delimiter === "\t" ? "tab" :
        delimiter === "," ? "comma" :
        delimiter === ";" ? "semicolon" :
        delimiter === "|" ? "pipe" :
        delimiter;

      summary.textContent = `${result.length.toLocaleString()} ${result.length === 1 ? "record" : "records"} · ${delimiterName} delimiter`;
      setSuccess("Converted.");
      updateCounts();
    } catch (error) {
      output.value = "";
      summary.textContent = "";
      setError(error.message || "Could not parse this data.");
      updateCounts();
    }
  }

  convertButton.addEventListener("click", convert);

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      setError("Convert some data first.");
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
        setError("Could not copy automatically. Select the JSON and copy it manually.");
      }
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!output.value) {
      setError("Convert some data first.");
      return;
    }

    const blob = new Blob([output.value], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "converted.json";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);

    setSuccess("Download started.");
  });

  sampleButton.addEventListener("click", () => {
    input.value = [
      "name,age,active,city",
      'Alice,31,true,"London, UK"',
      "Bob,28,false,Tokyo",
      'Carol,42,true,"New York, USA"'
    ].join("\n");
    output.value = "";
    summary.textContent = "";
    setSuccess("Sample loaded.");
    updateCounts();
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    output.value = "";
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
    updateCounts();
  });

  output.addEventListener("input", updateCounts);

  updateCounts();
})();
