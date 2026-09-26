(() => {
  const input = document.getElementById("yaml-json-input");
  const output = document.getElementById("yaml-json-output");
  const inputCount = document.getElementById("yaml-json-input-count");
  const outputCount = document.getElementById("yaml-json-output-count");
  const indentSelect = document.getElementById("yaml-json-indent");
  const sortKeys = document.getElementById("yaml-json-sort");
  const legacyBools = document.getElementById("yaml-json-legacy-bools");
  const convertButton = document.getElementById("yaml-json-convert");
  const copyButton = document.getElementById("yaml-json-copy");
  const sampleButton = document.getElementById("yaml-json-sample");
  const clearButton = document.getElementById("yaml-json-clear");
  const status = document.getElementById("yaml-json-status");

  function formatCount(value) {
    return `${value.toLocaleString()} ${value === 1 ? "character" : "characters"}`;
  }

  function updateCounts() {
    inputCount.textContent = formatCount(input.value.length);
    outputCount.textContent = formatCount(output.value.length);
  }

  function yamlError(message, lineNumber) {
    const error = new Error(lineNumber ? `${message} (line ${lineNumber})` : message);
    error.name = "YAMLParseError";
    return error;
  }

  function countIndent(line, lineNumber) {
    const prefix = line.match(/^\s*/)[0];
    if (prefix.includes("\t")) throw yamlError("Tabs cannot be used for YAML indentation.", lineNumber);
    return prefix.length;
  }

  function stripComment(text) {
    let single = false;
    let double = false;
    let escaped = false;
    let square = 0;
    let curly = 0;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (double) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') double = false;
        continue;
      }

      if (single) {
        if (char === "'" && text[i + 1] === "'") {
          i += 1;
        } else if (char === "'") {
          single = false;
        }
        continue;
      }

      if (char === '"') double = true;
      else if (char === "'") single = true;
      else if (char === "[") square += 1;
      else if (char === "]") square = Math.max(0, square - 1);
      else if (char === "{") curly += 1;
      else if (char === "}") curly = Math.max(0, curly - 1);
      else if (char === "#" && square === 0 && curly === 0 && (i === 0 || /\s/.test(text[i - 1]))) {
        return text.slice(0, i).trimEnd();
      }
    }
    return text.trimEnd();
  }

  function findMappingColon(text) {
    let single = false;
    let double = false;
    let escaped = false;
    let square = 0;
    let curly = 0;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (double) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') double = false;
        continue;
      }
      if (single) {
        if (char === "'" && text[i + 1] === "'") i += 1;
        else if (char === "'") single = false;
        continue;
      }
      if (char === '"') double = true;
      else if (char === "'") single = true;
      else if (char === "[") square += 1;
      else if (char === "]") square = Math.max(0, square - 1);
      else if (char === "{") curly += 1;
      else if (char === "}") curly = Math.max(0, curly - 1);
      else if (char === ":" && square === 0 && curly === 0 && (i === text.length - 1 || /\s/.test(text[i + 1]))) return i;
    }
    return -1;
  }

  function splitFlow(text, delimiter) {
    const parts = [];
    let start = 0;
    let single = false;
    let double = false;
    let escaped = false;
    let square = 0;
    let curly = 0;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (double) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') double = false;
        continue;
      }
      if (single) {
        if (char === "'" && text[i + 1] === "'") i += 1;
        else if (char === "'") single = false;
        continue;
      }
      if (char === '"') double = true;
      else if (char === "'") single = true;
      else if (char === "[") square += 1;
      else if (char === "]") square -= 1;
      else if (char === "{") curly += 1;
      else if (char === "}") curly -= 1;
      else if (char === delimiter && square === 0 && curly === 0) {
        parts.push(text.slice(start, i).trim());
        start = i + 1;
      }
    }
    parts.push(text.slice(start).trim());
    return parts;
  }

  function parseDoubleQuoted(text, lineNumber) {
    try {
      return JSON.parse(text);
    } catch {
      throw yamlError("Invalid double-quoted string.", lineNumber);
    }
  }

  function parseKey(text, lineNumber, options) {
    const trimmed = text.trim();
    if (!trimmed) throw yamlError("Mapping keys cannot be empty.", lineNumber);
    const value = parseScalar(trimmed, lineNumber, options, true);
    if (value !== null && typeof value === "object") throw yamlError("Complex mapping keys are not supported.", lineNumber);
    return String(value);
  }

  function parseFlowObject(text, lineNumber, options) {
    const inner = text.slice(1, -1).trim();
    if (!inner) return {};
    const result = {};
    for (const part of splitFlow(inner, ",")) {
      if (!part) continue;
      const colon = findMappingColon(part);
      if (colon < 0) throw yamlError("Invalid inline object entry.", lineNumber);
      const key = parseKey(part.slice(0, colon), lineNumber, options);
      const valueText = part.slice(colon + 1).trim();
      result[key] = valueText ? parseScalar(valueText, lineNumber, options) : null;
    }
    return result;
  }

  function parseScalar(text, lineNumber, options, keyMode = false) {
    const value = text.trim();
    if (value === "") return "";

    if (!keyMode && (/^(?:&|\*|!)/.test(value) || /^<<\s*:/.test(value))) {
      throw yamlError("Anchors, aliases, tags and merge keys are not supported by this converter.", lineNumber);
    }

    if (value.startsWith('"')) {
      if (!value.endsWith('"') || value.length < 2) throw yamlError("Unclosed double-quoted string.", lineNumber);
      return parseDoubleQuoted(value, lineNumber);
    }

    if (value.startsWith("'")) {
      if (!value.endsWith("'") || value.length < 2) throw yamlError("Unclosed single-quoted string.", lineNumber);
      return value.slice(1, -1).replace(/''/g, "'");
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      if (!inner) return [];
      return splitFlow(inner, ",").map(item => parseScalar(item, lineNumber, options));
    }

    if (value.startsWith("{") && value.endsWith("}")) return parseFlowObject(value, lineNumber, options);

    if (/^(?:null|~)$/i.test(value)) return null;
    if (/^(?:true|false)$/i.test(value)) return value.toLowerCase() === "true";
    if (options.legacyBools && /^(?:yes|no|on|off)$/i.test(value)) return /^(?:yes|on)$/i.test(value);

    const numeric = value.replace(/_/g, "");
    if (/^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(numeric)) {
      const number = Number(numeric);
      if (Number.isFinite(number)) return number;
    }
    if (/^[+-]?0x[0-9a-f]+$/i.test(numeric)) return Number.parseInt(numeric, 16);
    if (/^[+-]?0o[0-7]+$/i.test(numeric)) {
      const sign = numeric.startsWith("-") ? -1 : 1;
      return sign * Number.parseInt(numeric.replace(/^[+-]?0o/i, ""), 8);
    }
    if (/^[+-]?0b[01]+$/i.test(numeric)) {
      const sign = numeric.startsWith("-") ? -1 : 1;
      return sign * Number.parseInt(numeric.replace(/^[+-]?0b/i, ""), 2);
    }

    return value;
  }

  function makeLines(source) {
    const rawLines = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
    const lines = [];
    let sawDocument = false;

    rawLines.forEach((raw, index) => {
      const lineNumber = index + 1;
      const indent = countIndent(raw, lineNumber);
      const body = raw.slice(indent);
      const stripped = stripComment(body).trimEnd();
      const trimmed = stripped.trim();

      if (!trimmed) {
        lines.push({ raw, indent, content: "", lineNumber, blank: true });
        return;
      }

      if (trimmed === "---") {
        if (sawDocument || lines.some(line => !line.blank)) throw yamlError("Multiple YAML documents are not supported.", lineNumber);
        sawDocument = true;
        return;
      }
      if (trimmed === "...") return;

      lines.push({ raw, indent, content: stripped.trimStart(), lineNumber, blank: false });
    });

    return lines;
  }

  function nextContentIndex(lines, index) {
    let i = index;
    while (i < lines.length && lines[i].blank) i += 1;
    return i;
  }

  function readBlockScalar(lines, index, parentIndent, style) {
    let i = index;
    const collected = [];
    let blockIndent = null;

    while (i < lines.length) {
      const line = lines[i];
      if (line.blank) {
        collected.push("");
        i += 1;
        continue;
      }
      if (line.indent <= parentIndent) break;
      if (blockIndent === null) blockIndent = line.indent;
      const remove = Math.min(blockIndent, line.raw.length);
      collected.push(line.raw.slice(remove));
      i += 1;
    }

    if (style === "|") return { value: `${collected.join("\n")}\n`, next: i };

    let result = "";
    let pendingBlank = 0;
    collected.forEach((line, position) => {
      if (line === "") {
        pendingBlank += 1;
        return;
      }
      if (result) {
        if (pendingBlank) result += "\n".repeat(pendingBlank + 1);
        else result += " ";
      }
      result += line;
      pendingBlank = 0;
      if (position === collected.length - 1) result += "\n";
    });
    if (!result && collected.length) result = "\n";
    return { value: result, next: i };
  }

  function parseNode(lines, index, indent, options) {
    index = nextContentIndex(lines, index);
    if (index >= lines.length) return { value: null, next: index };
    if (lines[index].indent < indent) return { value: null, next: index };
    if (lines[index].indent > indent) throw yamlError("Unexpected indentation.", lines[index].lineNumber);

    if (/^-($|\s)/.test(lines[index].content)) return parseSequence(lines, index, indent, options);
    return parseMapping(lines, index, indent, options);
  }

  function parseMapping(lines, index, indent, options, seed = null) {
    const object = seed || {};
    let i = index;

    while (i < lines.length) {
      i = nextContentIndex(lines, i);
      if (i >= lines.length) break;
      const line = lines[i];
      if (line.indent < indent) break;
      if (line.indent > indent) throw yamlError("Unexpected indentation.", line.lineNumber);
      if (/^-($|\s)/.test(line.content)) break;

      const colon = findMappingColon(line.content);
      if (colon < 0) throw yamlError("Expected a mapping entry in the form key: value.", line.lineNumber);
      const key = parseKey(line.content.slice(0, colon), line.lineNumber, options);
      if (Object.prototype.hasOwnProperty.call(object, key)) throw yamlError(`Duplicate key: ${key}`, line.lineNumber);

      const valueText = stripComment(line.content.slice(colon + 1)).trim();
      if (valueText === "|" || valueText === ">") {
        const block = readBlockScalar(lines, i + 1, indent, valueText);
        object[key] = block.value;
        i = block.next;
        continue;
      }

      if (valueText) {
        object[key] = parseScalar(valueText, line.lineNumber, options);
        i += 1;
        continue;
      }

      const next = nextContentIndex(lines, i + 1);
      if (next < lines.length && lines[next].indent > indent) {
        const parsed = parseNode(lines, next, lines[next].indent, options);
        object[key] = parsed.value;
        i = parsed.next;
      } else {
        object[key] = null;
        i += 1;
      }
    }

    return { value: object, next: i };
  }

  function parseSequence(lines, index, indent, options) {
    const array = [];
    let i = index;

    while (i < lines.length) {
      i = nextContentIndex(lines, i);
      if (i >= lines.length) break;
      const line = lines[i];
      if (line.indent < indent) break;
      if (line.indent > indent) throw yamlError("Unexpected indentation.", line.lineNumber);
      if (!/^-($|\s)/.test(line.content)) break;

      const rest = line.content.slice(1).trimStart();
      if (!rest) {
        const next = nextContentIndex(lines, i + 1);
        if (next < lines.length && lines[next].indent > indent) {
          const parsed = parseNode(lines, next, lines[next].indent, options);
          array.push(parsed.value);
          i = parsed.next;
        } else {
          array.push(null);
          i += 1;
        }
        continue;
      }

      if (rest === "|" || rest === ">") {
        const block = readBlockScalar(lines, i + 1, indent, rest);
        array.push(block.value);
        i = block.next;
        continue;
      }

      const colon = findMappingColon(rest);
      if (colon >= 0) {
        const key = parseKey(rest.slice(0, colon), line.lineNumber, options);
        const valueText = stripComment(rest.slice(colon + 1)).trim();
        const object = {};
        let nextIndex = i + 1;

        if (valueText === "|" || valueText === ">") {
          const block = readBlockScalar(lines, i + 1, indent, valueText);
          object[key] = block.value;
          nextIndex = block.next;
        } else if (valueText) {
          object[key] = parseScalar(valueText, line.lineNumber, options);
        } else {
          const next = nextContentIndex(lines, i + 1);
          if (next < lines.length && lines[next].indent > indent) {
            const deeper = lines[next].indent;
            if (/^-($|\s)/.test(lines[next].content)) {
              const parsed = parseNode(lines, next, deeper, options);
              object[key] = parsed.value;
              nextIndex = parsed.next;
            } else if (deeper > indent) {
              const firstColon = findMappingColon(lines[next].content);
              if (firstColon < 0) throw yamlError("Expected a nested mapping or sequence.", lines[next].lineNumber);
              const parsed = parseNode(lines, next, deeper, options);
              object[key] = parsed.value;
              nextIndex = parsed.next;
            }
          } else {
            object[key] = null;
          }
        }

        const continuation = nextContentIndex(lines, nextIndex);
        if (continuation < lines.length && lines[continuation].indent > indent && !/^-($|\s)/.test(lines[continuation].content)) {
          const childIndent = lines[continuation].indent;
          const parsed = parseMapping(lines, continuation, childIndent, options, object);
          nextIndex = parsed.next;
        }

        array.push(object);
        i = nextIndex;
        continue;
      }

      array.push(parseScalar(stripComment(rest).trim(), line.lineNumber, options));
      i += 1;
    }

    return { value: array, next: i };
  }

  function parseYaml(source, options) {
    const lines = makeLines(source);
    const first = nextContentIndex(lines, 0);
    if (first >= lines.length) return null;
    if (lines[first].indent !== 0) throw yamlError("Top-level YAML must start at the left edge.", lines[first].lineNumber);
    const parsed = parseNode(lines, first, 0, options);
    const remaining = nextContentIndex(lines, parsed.next);
    if (remaining < lines.length) throw yamlError("Could not parse the remaining YAML content.", lines[remaining].lineNumber);
    return parsed.value;
  }

  function sortObjectDeep(value) {
    if (Array.isArray(value)) return value.map(sortObjectDeep);
    if (!value || typeof value !== "object") return value;
    return Object.keys(value)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }))
      .reduce((result, key) => {
        result[key] = sortObjectDeep(value[key]);
        return result;
      }, {});
  }

  function convert() {
    const source = input.value;
    status.classList.remove("converter-error");

    if (!source.trim()) {
      output.value = "";
      status.textContent = "Enter some YAML first.";
      updateCounts();
      return;
    }

    try {
      const options = { legacyBools: legacyBools.checked };
      let parsed = parseYaml(source, options);
      if (sortKeys.checked) parsed = sortObjectDeep(parsed);
      const indent = Number(indentSelect.value);
      output.value = JSON.stringify(parsed, null, indent || undefined);
      status.textContent = "Converted.";
    } catch (error) {
      output.value = "";
      status.textContent = error instanceof Error ? error.message : "Could not parse the YAML.";
      status.classList.add("converter-error");
    }

    updateCounts();
  }

  async function copyOutput() {
    if (!output.value) {
      status.classList.remove("converter-error");
      status.textContent = "Convert some YAML first.";
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
        status.textContent = "Could not copy automatically. Select the JSON and copy it manually.";
      }
      output.setAttribute("readonly", "");
    }
  }

  function loadSample() {
    input.value = `name: PocketWorkshop\ntagline: "Everyday tools, right in your pocket"\nfree: true\ncategories:\n  - PDF\n  - Image\n  - Text\n  - Data\nsettings:\n  privacy: Local browser processing\n  analytics: true\n  maxTools: 50\ndescription: |\n  Small browser tools.\n  No account required.\nnotes: null`;
    status.classList.remove("converter-error");
    status.textContent = "Sample loaded.";
    convert();
  }

  input.addEventListener("input", () => {
    status.classList.remove("converter-error");
    status.textContent = "";
    updateCounts();
  });

  [indentSelect, sortKeys, legacyBools].forEach(control => {
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
