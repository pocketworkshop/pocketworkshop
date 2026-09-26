(() => {
  const input = document.getElementById("url-input");
  const output = document.getElementById("url-output");
  const inputCount = document.getElementById("url-input-count");
  const outputCount = document.getElementById("url-output-count");
  const modeSelect = document.getElementById("url-mode");
  const decodeModeSelect = document.getElementById("url-decode-mode");
  const encodeButton = document.getElementById("url-encode-button");
  const decodeButton = document.getElementById("url-decode-button");
  const swapButton = document.getElementById("url-swap-button");
  const copyButton = document.getElementById("url-copy-button");
  const sampleButton = document.getElementById("url-sample-button");
  const clearButton = document.getElementById("url-clear-button");
  const status = document.getElementById("url-status");

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
    status.className = "status url-error";
    status.textContent = message;
  }

  function encodeForm(text) {
    return encodeURIComponent(text).replace(/%20/g, "+");
  }

  function decodeForm(text) {
    return decodeURIComponent(text.replace(/\+/g, " "));
  }

  function encodeText(text, mode) {
    if (mode === "full") return encodeURI(text);
    if (mode === "form") return encodeForm(text);
    return encodeURIComponent(text);
  }

  function decodeText(text, mode) {
    if (mode === "full") return decodeURI(text);
    if (mode === "form") return decodeForm(text);
    return decodeURIComponent(text);
  }

  encodeButton.addEventListener("click", () => {
    if (!input.value) {
      output.value = "";
      setError("Enter some text first.");
      updateCounts();
      return;
    }

    try {
      output.value = encodeText(input.value, modeSelect.value);
      setSuccess("Encoded.");
    } catch (error) {
      output.value = "";
      setError(error.message || "Could not encode this text.");
    }

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
      output.value = decodeText(input.value, decodeModeSelect.value);
      setSuccess("Decoded.");
    } catch (error) {
      output.value = "";
      setError("Invalid or incomplete percent-encoded text.");
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
    input.value = "https://example.com/search?q=hello world&lang=日本語";
    output.value = "";
    modeSelect.value = "full";
    decodeModeSelect.value = "full";
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
