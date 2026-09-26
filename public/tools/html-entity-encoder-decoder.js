(() => {
  const input = document.getElementById("entity-input");
  const output = document.getElementById("entity-output");
  const inputCount = document.getElementById("entity-input-count");
  const outputCount = document.getElementById("entity-output-count");
  const quoteMode = document.getElementById("entity-quote-mode");
  const numericCheck = document.getElementById("entity-numeric");
  const encodeButton = document.getElementById("entity-encode-button");
  const decodeButton = document.getElementById("entity-decode-button");
  const swapButton = document.getElementById("entity-swap-button");
  const copyButton = document.getElementById("entity-copy-button");
  const sampleButton = document.getElementById("entity-sample-button");
  const clearButton = document.getElementById("entity-clear-button");
  const status = document.getElementById("entity-status");

  function formatCount(n) {
    return `${n.toLocaleString()} ${n === 1 ? "character" : "characters"}`;
  }

  function updateCounts() {
    inputCount.textContent = formatCount(input.value.length);
    outputCount.textContent = formatCount(output.value.length);
  }

  function setSuccess(message) {
    status.className = "status";
    status.textContent = message;
  }

  function setError(message) {
    status.className = "status entity-error";
    status.textContent = message;
  }

  function encodeAsciiSpecials(text) {
    let result = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    if (quoteMode.value === "both" || quoteMode.value === "double") {
      result = result.replace(/"/g, "&quot;");
    }

    if (quoteMode.value === "both") {
      result = result.replace(/'/g, "&#39;");
    }

    return result;
  }

  function encodeNonAscii(text) {
    let result = "";

    for (const char of text) {
      const codePoint = char.codePointAt(0);

      if (codePoint > 127) {
        result += `&#${codePoint};`;
      } else {
        result += char;
      }
    }

    return result;
  }

  function encodeText(text) {
    let encoded = encodeAsciiSpecials(text);

    if (numericCheck.checked) {
      encoded = encodeNonAscii(encoded);
    }

    return encoded;
  }

  function decodeText(text) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }

  encodeButton.addEventListener("click", () => {
    if (!input.value) {
      output.value = "";
      setError("Enter some text first.");
      updateCounts();
      return;
    }

    output.value = encodeText(input.value);
    setSuccess("Encoded.");
    updateCounts();
  });

  decodeButton.addEventListener("click", () => {
    if (!input.value) {
      output.value = "";
      setError("Enter encoded text first.");
      updateCounts();
      return;
    }

    try {
      output.value = decodeText(input.value);
      setSuccess("Decoded.");
    } catch {
      output.value = "";
      setError("Could not decode this text.");
    }

    updateCounts();
  });

  swapButton.addEventListener("click", () => {
    if (!output.value) {
      setError("Create a result first.");
      return;
    }

    input.value = output.value;
    output.value = "";
    setSuccess("Result moved to input.");
    updateCounts();
    input.focus();
  });

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      setError("Create a result first.");
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

  sampleButton.addEventListener("click", () => {
    input.value = '<div class="note">Tom & Jerry — 日本語テスト</div>';
    output.value = "";
    quoteMode.value = "both";
    numericCheck.checked = false;
    setSuccess("Sample loaded.");
    updateCounts();
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
