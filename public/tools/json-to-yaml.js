(() => {
  const input = document.getElementById("json-yaml-input");
  const output = document.getElementById("json-yaml-output");
  const inputCount = document.getElementById("json-yaml-input-count");
  const outputCount = document.getElementById("json-yaml-output-count");
  const indentSelect = document.getElementById("json-yaml-indent");
  const quoteSelect = document.getElementById("json-yaml-quotes");
  const sortKeys = document.getElementById("json-yaml-sort");
  const documentMarker = document.getElementById("json-yaml-document-marker");
  const convertButton = document.getElementById("json-yaml-convert");
  const copyButton = document.getElementById("json-yaml-copy");
  const sampleButton = document.getElementById("json-yaml-sample");
  const clearButton = document.getElementById("json-yaml-clear");
  const status = document.getElementById("json-yaml-status");

  const YAML_RESERVED = new Set([
    "null", "~", "true", "false", "yes", "no", "on", "off",
    ".nan", ".inf", "+.inf", "-.inf"
  ]);

  function formatCount(value) {
    return `${value.toLocaleString()} ${value === 1 ? "character" : "characters"}`;
  }

  function updateCounts() {
    inputCount.textContent = formatCount(input.value.length);
    outputCount.textContent = formatCount(output.value.length);
  }

  function spaces(level, size) {
    return " ".repeat(level * size);
  }

  function doubleQuote(value) {
    return `"${value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\u0008/g, "\\b")
      .replace(/\u000c/g, "\\f")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, char => {
        return `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
      })}"`;
  }

  function looksLikeYamlScalar(value) {
    const trimmed = value.trim();
    if (trimmed === "") return true;
    if (YAML_RESERVED.has(trimmed.toLowerCase())) return true;
    if (/^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(trimmed)) return true;
    if (/^0x[0-9a-f]+$/i.test(trimmed) || /^0o[0-7]+$/i.test(trimmed) || /^0b[01]+$/i.test(trimmed)) return true;
    if (/^\d{4}-\d{1,2}-\d{1,2}(?:[tT ]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:\s*(?:Z|[+-]\d{1,2}(?::?\d{2})?))?)?$/.test(trimmed)) return true;
    return false;
  }

  function needsQuotes(value) {
    if (looksLikeYamlScalar(value)) return true;
    if (/^[\-?:,\[\]{}#&*!|>'"%@`]/.test(value)) return true;
    if (/[:#]\s/.test(value)) return true;
    if (/\s$|^\s/.test(value)) return true;
    if (/\r|\n|\t/.test(value)) return true;
    if (/[\u0000-\u001f\u007f-\u009f]/.test(value)) return true;
    return false;
  }

  function formatString(value, quoteMode) {
    if (quoteMode === "all" || needsQuotes(value)) return doubleQuote(value);
    return value;
  }

  function formatKey(value, quoteMode) {
    const key = String(value);
    if (quoteMode === "all" || needsQuotes(key) || /[{}\[\],]/.test(key)) return doubleQuote(key);
    return key;
  }

  function formatPrimitive(value, quoteMode) {
    if (value === null) return "null";
    if (typeof value === "string") return formatString(value, quoteMode);
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    return doubleQuote(String(value));
  }

  function isPrimitive(value) {
    return value === null || typeof value !== "object";
  }

  function orderedEntries(object, shouldSort) {
    const entries = Object.entries(object);
    if (!shouldSort) return entries;
    return entries.sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));
  }

  function serialize(value, level, options) {
    const { indentSize, quoteMode, shouldSort } = options;
    const prefix = spaces(level, indentSize);

    if (isPrimitive(value)) {
      return `${prefix}${formatPrimitive(value, quoteMode)}`;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return `${prefix}[]`;
      const lines = [];

      value.forEach(item => {
        if (isPrimitive(item)) {
          lines.push(`${prefix}- ${formatPrimitive(item, quoteMode)}`);
          return;
        }

        if (Array.isArray(item)) {
          if (item.length === 0) {
            lines.push(`${prefix}- []`);
          } else {
            lines.push(`${prefix}-`);
            lines.push(serialize(item, level + 1, options));
          }
          return;
        }

        const entries = orderedEntries(item, shouldSort);
        if (entries.length === 0) {
          lines.push(`${prefix}- {}`);
          return;
        }

        entries.forEach(([key, child], index) => {
          const keyText = formatKey(key, quoteMode);
          const itemPrefix = index === 0 ? `${prefix}- ` : `${prefix}${" ".repeat(indentSize)}`;

          if (isPrimitive(child)) {
            lines.push(`${itemPrefix}${keyText}: ${formatPrimitive(child, quoteMode)}`);
          } else if (Array.isArray(child) && child.length === 0) {
            lines.push(`${itemPrefix}${keyText}: []`);
          } else if (!Array.isArray(child) && Object.keys(child).length === 0) {
            lines.push(`${itemPrefix}${keyText}: {}`);
          } else {
            lines.push(`${itemPrefix}${keyText}:`);
            lines.push(serialize(child, level + 2, options));
          }
        });
      });

      return lines.join("\n");
    }

    const entries = orderedEntries(value, shouldSort);
    if (entries.length === 0) return `${prefix}{}`;

    const lines = [];
    entries.forEach(([key, child]) => {
      const keyText = formatKey(key, quoteMode);
      if (isPrimitive(child)) {
        lines.push(`${prefix}${keyText}: ${formatPrimitive(child, quoteMode)}`);
      } else if (Array.isArray(child) && child.length === 0) {
        lines.push(`${prefix}${keyText}: []`);
      } else if (!Array.isArray(child) && Object.keys(child).length === 0) {
        lines.push(`${prefix}${keyText}: {}`);
      } else {
        lines.push(`${prefix}${keyText}:`);
        lines.push(serialize(child, level + 1, options));
      }
    });
    return lines.join("\n");
  }

  function errorMessage(error, source) {
    const base = error instanceof Error ? error.message : "Invalid JSON.";
    const match = base.match(/position\s+(\d+)/i);
    if (!match) return base;

    const position = Number(match[1]);
    const before = source.slice(0, position);
    const line = before.split("\n").length;
    const lastBreak = before.lastIndexOf("\n");
    const column = position - lastBreak;
    return `${base} (line ${line}, column ${column})`;
  }

  function convert() {
    const source = input.value.trim();
    status.classList.remove("converter-error");

    if (!source) {
      output.value = "";
      status.textContent = "Enter some JSON first.";
      updateCounts();
      return;
    }

    try {
      const parsed = JSON.parse(source);
      const options = {
        indentSize: Number(indentSelect.value) || 2,
        quoteMode: quoteSelect.value === "all" ? "all" : "auto",
        shouldSort: sortKeys.checked
      };
      let yaml = serialize(parsed, 0, options);
      if (documentMarker.checked) yaml = `---\n${yaml}`;
      output.value = `${yaml}\n`;
      status.textContent = "Converted.";
    } catch (error) {
      output.value = "";
      status.textContent = errorMessage(error, source);
      status.classList.add("converter-error");
    }

    updateCounts();
  }

  async function copyOutput() {
    if (!output.value) {
      status.classList.remove("converter-error");
      status.textContent = "Convert some JSON first.";
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      status.classList.remove("converter-error");
      status.textContent = "Copied.";
    } catch {
      output.removeAttribute("readonly");
      output.focus();
      output.select();
      try {
        document.execCommand("copy");
        status.classList.remove("converter-error");
        status.textContent = "Copied.";
      } catch {
        status.classList.add("converter-error");
        status.textContent = "Could not copy automatically. Select the YAML and copy it manually.";
      }
      output.setAttribute("readonly", "");
    }
  }

  function loadSample() {
    input.value = JSON.stringify({
      name: "PocketWorkshop",
      tagline: "Everyday tools, right in your pocket",
      free: true,
      categories: ["PDF", "Image", "Text", "Data", "Developer", "Other"],
      settings: {
        privacy: "Local browser processing",
        analytics: true,
        maxTools: 50
      },
      notes: null
    }, null, 2);
    status.classList.remove("converter-error");
    status.textContent = "Sample loaded.";
    convert();
  }

  input.addEventListener("input", () => {
    status.classList.remove("converter-error");
    status.textContent = "";
    updateCounts();
  });

  [indentSelect, quoteSelect, sortKeys, documentMarker].forEach(control => {
    control.addEventListener("change", () => {
      if (input.value.trim()) convert();
    });
  });

  convertButton.addEventListener("click", convert);
  copyButton.addEventListener("click", copyOutput);
  sampleButton.addEventListener("click", loadSample);
  clearButton.addEventListener("click", () => {
    input.value = "";
    output.value = "";
    status.classList.remove("converter-error");
    status.textContent = "";
    updateCounts();
    input.focus();
  });

  updateCounts();
})();
