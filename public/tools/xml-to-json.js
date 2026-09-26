(() => {
  const input = document.getElementById("xj-input");
  const output = document.getElementById("xj-output");
  const inputCount = document.getElementById("xj-input-count");
  const outputCount = document.getElementById("xj-output-count");
  const indentSelect = document.getElementById("xj-indent");
  const includeAttributes = document.getElementById("xj-attributes");
  const keepRoot = document.getElementById("xj-root");
  const trimText = document.getElementById("xj-trim");
  const detectTypes = document.getElementById("xj-types");
  const convertButton = document.getElementById("xj-convert");
  const copyButton = document.getElementById("xj-copy");
  const downloadButton = document.getElementById("xj-download");
  const sampleButton = document.getElementById("xj-sample");
  const clearButton = document.getElementById("xj-clear");
  const status = document.getElementById("xj-status");
  const summary = document.getElementById("xj-summary");
  const errorBox = document.getElementById("xj-error");

  function formatCount(n) {
    return `${n.toLocaleString()} ${n === 1 ? "character" : "characters"}`;
  }

  function updateCounts() {
    inputCount.textContent = formatCount(input.value.length);
    outputCount.textContent = formatCount(output.value.length);
  }

  function clearMessages() {
    status.textContent = "";
    summary.textContent = "";
    errorBox.textContent = "";
    errorBox.style.display = "none";
  }

  function showError(message) {
    status.textContent = "Invalid XML.";
    summary.textContent = "";
    errorBox.textContent = message || "The XML could not be parsed.";
    errorBox.style.display = "block";
  }

  function parseXml(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const errors = Array.from(doc.getElementsByTagName("parsererror"));
    if (doc.documentElement && doc.documentElement.localName === "parsererror") {
      errors.unshift(doc.documentElement);
    }
    if (errors.length) {
      const raw = errors.map(node => node.textContent || "").join("\n").trim();
      const cleaned = raw.replace(/\s+/g, " ").trim();
      throw new Error(cleaned || "The XML could not be parsed. Check matching tags, quotes and special characters.");
    }
    if (!doc.documentElement) throw new Error("No XML root element was found.");
    return doc;
  }

  function scalarValue(raw) {
    const value = trimText.checked ? raw.trim() : raw;
    if (!detectTypes.checked) return value;

    const normalized = value.trim();
    if (/^(true|false)$/i.test(normalized)) return normalized.toLowerCase() === "true";
    if (/^null$/i.test(normalized)) return null;
    if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(normalized)) {
      const number = Number(normalized);
      if (Number.isFinite(number)) return number;
    }
    return value;
  }

  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function addChild(object, key, value) {
    if (!own(object, key)) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }

  function attributesToObject(element) {
    const attrs = Object.create(null);
    for (const attr of Array.from(element.attributes || [])) {
      attrs[attr.name] = scalarValue(attr.value);
    }
    return attrs;
  }

  function elementToJson(element) {
    const result = Object.create(null);
    const attrs = includeAttributes.checked ? attributesToObject(element) : null;
    const hasAttributes = attrs && Object.keys(attrs).length > 0;
    if (hasAttributes) result["@attributes"] = attrs;

    const elementChildren = [];
    const textParts = [];

    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        elementChildren.push(child);
      } else if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) {
        textParts.push(child.nodeValue || "");
      }
    }

    const rawText = textParts.join("");
    const comparedText = trimText.checked ? rawText.trim() : rawText;
    const hasText = trimText.checked ? comparedText.length > 0 : /\S/.test(comparedText);

    for (const child of elementChildren) {
      addChild(result, child.nodeName, elementToJson(child));
    }

    if (!elementChildren.length && !hasAttributes) {
      return scalarValue(rawText);
    }

    if (hasText) result["#text"] = scalarValue(rawText);
    return result;
  }

  function countElements(root) {
    return 1 + root.getElementsByTagName("*").length;
  }

  function convert() {
    if (!input.value.trim()) {
      output.value = "";
      clearMessages();
      status.textContent = "Enter some XML first.";
      updateCounts();
      return;
    }

    clearMessages();
    try {
      const doc = parseXml(input.value);
      const root = doc.documentElement;
      const rootValue = elementToJson(root);
      let result;

      if (keepRoot.checked) {
        result = Object.create(null);
        result[root.nodeName] = rootValue;
      } else {
        result = rootValue;
      }

      const indent = Number(indentSelect.value) || 0;
      output.value = JSON.stringify(result, null, indent);
      status.textContent = "Converted successfully.";
      summary.textContent = `${countElements(root).toLocaleString()} elements · root <${root.nodeName}>`;
      updateCounts();
    } catch (error) {
      output.value = "";
      showError(error.message);
      updateCounts();
    }
  }

  convertButton.addEventListener("click", convert);

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      status.textContent = "Convert some XML first.";
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
        status.textContent = "Could not copy automatically. Select the JSON and copy it manually.";
      }
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!output.value) {
      status.textContent = "Convert some XML first.";
      return;
    }
    const blob = new Blob([output.value], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "converted.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    status.textContent = "JSON downloaded.";
  });

  sampleButton.addEventListener("click", () => {
    input.value = `<?xml version="1.0" encoding="UTF-8"?>\n<catalog currency="USD">\n  <book id="101" available="true">\n    <title>Pocket Workshop</title>\n    <price>12.50</price>\n    <tag>tools</tag>\n    <tag>browser</tag>\n  </book>\n  <book id="102" available="false">\n    <title><![CDATA[XML & JSON Basics]]></title>\n    <price>9.95</price>\n  </book>\n</catalog>`;
    output.value = "";
    clearMessages();
    status.textContent = "Sample loaded.";
    updateCounts();
    input.focus();
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    output.value = "";
    clearMessages();
    updateCounts();
    input.focus();
  });

  input.addEventListener("input", () => {
    clearMessages();
    updateCounts();
  });
  output.addEventListener("input", updateCounts);

  updateCounts();
})();
