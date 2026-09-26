(() => {
  const input = document.getElementById("xml-input");
  const output = document.getElementById("xml-output");
  const inputCount = document.getElementById("xml-input-count");
  const outputCount = document.getElementById("xml-output-count");
  const indentSelect = document.getElementById("xml-indent");
  const keepDeclaration = document.getElementById("xml-keep-declaration");
  const formatButton = document.getElementById("xml-format");
  const minifyButton = document.getElementById("xml-minify");
  const validateButton = document.getElementById("xml-validate");
  const copyButton = document.getElementById("xml-copy");
  const sampleButton = document.getElementById("xml-sample");
  const clearButton = document.getElementById("xml-clear");
  const status = document.getElementById("xml-status");
  const summary = document.getElementById("xml-summary");
  const errorBox = document.getElementById("xml-error");

  const serializer = new XMLSerializer();

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

  function getDeclaration(text) {
    const match = text.match(/^\s*(<\?xml\s+[\s\S]*?\?>)/i);
    return match ? match[1] : "";
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
    return doc;
  }

  function indentationUnit() {
    return indentSelect.value === "tab" ? "\t" : " ".repeat(Number(indentSelect.value) || 2);
  }

  function nodeHasMixedContent(node) {
    if (!node || !node.childNodes) return false;
    let hasElementLike = false;
    let hasVisibleText = false;
    for (const child of node.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) hasElementLike = true;
      if (child.nodeType === Node.TEXT_NODE && /\S/.test(child.nodeValue || "")) hasVisibleText = true;
    }
    return hasElementLike && hasVisibleText;
  }

  function elementOpenTag(element) {
    const full = serializer.serializeToString(element);
    const end = full.indexOf(">");
    return end >= 0 ? full.slice(0, end + 1) : full;
  }

  function prettyNode(node, depth, unit, inheritedPreserve) {
    const pad = unit.repeat(depth);

    if (node.nodeType === Node.ELEMENT_NODE) {
      const ownSpace = node.getAttributeNS("http://www.w3.org/XML/1998/namespace", "space") || node.getAttribute("xml:space");
      const preserve = inheritedPreserve || ownSpace === "preserve";
      if (preserve || nodeHasMixedContent(node)) return pad + serializer.serializeToString(node);

      const meaningful = Array.from(node.childNodes).filter(child => {
        if (child.nodeType === Node.TEXT_NODE) return /\S/.test(child.nodeValue || "");
        return true;
      });

      if (!meaningful.length) return pad + serializer.serializeToString(node);

      if (meaningful.length === 1 && (meaningful[0].nodeType === Node.TEXT_NODE || meaningful[0].nodeType === Node.CDATA_SECTION_NODE)) {
        return pad + serializer.serializeToString(node);
      }

      const open = elementOpenTag(node);
      const selfClosing = /\/>$/.test(open);
      if (selfClosing) return pad + open;
      const lines = [pad + open];
      for (const child of meaningful) {
        lines.push(prettyNode(child, depth + 1, unit, preserve));
      }
      lines.push(`${pad}</${node.nodeName}>`);
      return lines.join("\n");
    }

    if (node.nodeType === Node.TEXT_NODE) {
      return pad + (node.nodeValue || "").trim();
    }

    if (node.nodeType === Node.CDATA_SECTION_NODE ||
        node.nodeType === Node.COMMENT_NODE ||
        node.nodeType === Node.PROCESSING_INSTRUCTION_NODE ||
        node.nodeType === Node.DOCUMENT_TYPE_NODE) {
      return pad + serializer.serializeToString(node);
    }

    return pad + serializer.serializeToString(node);
  }

  function prettyPrint(doc, declaration) {
    const unit = indentationUnit();
    const parts = [];
    if (keepDeclaration.checked && declaration) parts.push(declaration);
    for (const node of doc.childNodes) {
      if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE && node.target && node.target.toLowerCase() === "xml") continue;
      if (node.nodeType === Node.TEXT_NODE && !/\S/.test(node.nodeValue || "")) continue;
      parts.push(prettyNode(node, 0, unit, false));
    }
    return parts.filter(Boolean).join("\n");
  }

  function removeFormattingWhitespace(node, inheritedPreserve) {
    if (!node || !node.childNodes) return;
    const ownSpace = node.nodeType === Node.ELEMENT_NODE
      ? (node.getAttributeNS("http://www.w3.org/XML/1998/namespace", "space") || node.getAttribute("xml:space"))
      : "";
    const preserve = inheritedPreserve || ownSpace === "preserve";

    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE && !preserve && !/\S/.test(child.nodeValue || "")) {
        node.removeChild(child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        removeFormattingWhitespace(child, preserve);
      }
    }
  }

  function minifyXml(doc, declaration) {
    removeFormattingWhitespace(doc, false);
    let result = serializer.serializeToString(doc);
    result = result.replace(/^\s*<\?xml[\s\S]*?\?>\s*/i, "");
    if (keepDeclaration.checked && declaration) result = declaration + result;
    return result;
  }

  function setResult(value, message) {
    output.value = value;
    status.textContent = message;
    summary.textContent = `${formatCount(input.value.length)} → ${formatCount(value.length)}`;
    errorBox.textContent = "";
    errorBox.style.display = "none";
    updateCounts();
  }

  function requireInput() {
    if (input.value.trim()) return true;
    output.value = "";
    clearMessages();
    status.textContent = "Enter some XML first.";
    updateCounts();
    return false;
  }

  formatButton.addEventListener("click", () => {
    if (!requireInput()) return;
    clearMessages();
    try {
      const declaration = getDeclaration(input.value);
      const doc = parseXml(input.value);
      setResult(prettyPrint(doc, declaration), "Formatted successfully.");
    } catch (error) {
      output.value = "";
      showError(error.message);
      updateCounts();
    }
  });

  minifyButton.addEventListener("click", () => {
    if (!requireInput()) return;
    clearMessages();
    try {
      const declaration = getDeclaration(input.value);
      const doc = parseXml(input.value);
      setResult(minifyXml(doc, declaration), "Minified successfully.");
    } catch (error) {
      output.value = "";
      showError(error.message);
      updateCounts();
    }
  });

  validateButton.addEventListener("click", () => {
    if (!requireInput()) return;
    clearMessages();
    try {
      const doc = parseXml(input.value);
      const root = doc.documentElement ? doc.documentElement.nodeName : "document";
      status.textContent = "Valid XML.";
      summary.textContent = `Root element: <${root}>`;
    } catch (error) {
      showError(error.message);
    }
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

  sampleButton.addEventListener("click", () => {
    input.value = `<?xml version="1.0" encoding="UTF-8"?>\n<catalog><book id="101"><title>Pocket Workshop</title><author>Alex Example</author><tags><tag>tools</tag><tag>browser</tag></tags></book><!-- second item --><book id="102"><title>Everyday Utilities</title><author><![CDATA[Sam & Team]]></author></book></catalog>`;
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
