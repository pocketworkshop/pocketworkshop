(() => {
  const input = document.getElementById("b64-input");
  const output = document.getElementById("b64-output");
  const inputCount = document.getElementById("b64-input-count");
  const outputCount = document.getElementById("b64-output-count");
  const variantSelect = document.getElementById("b64-variant");
  const paddingCheck = document.getElementById("b64-padding");
  const encodeButton = document.getElementById("b64-encode-button");
  const decodeButton = document.getElementById("b64-decode-button");
  const swapButton = document.getElementById("b64-swap-button");
  const copyButton = document.getElementById("b64-copy-button");
  const sampleButton = document.getElementById("b64-sample-button");
  const clearButton = document.getElementById("b64-clear-button");
  const status = document.getElementById("b64-status");

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
    status.className = "status b64-error";
    status.textContent = message;
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  }

  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  function toUrlSafe(base64) {
    return base64.replace(/\+/g, "-").replace(/\//g, "_");
  }

  function fromUrlSafe(base64) {
    return base64.replace(/-/g, "+").replace(/_/g, "/");
  }

  function normalizePadding(base64) {
    const remainder = base64.length % 4;
    if (remainder === 0) return base64;
    if (remainder === 1) throw new Error("Invalid Base64 length.");
    return base64 + "=".repeat(4 - remainder);
  }

  function encodeText(text) {
    const bytes = new TextEncoder().encode(text);
    let encoded = bytesToBase64(bytes);

    if (variantSelect.value === "url") {
      encoded = toUrlSafe(encoded);
    }

    if (!paddingCheck.checked) {
      encoded = encoded.replace(/=+$/g, "");
    }

    return encoded;
  }

  function decodeText(text) {
    let normalized = text.replace(/\s+/g, "");

    if (!normalized) {
      throw new Error("Enter Base64 text first.");
    }

    if (variantSelect.value === "url") {
      normalized = fromUrlSafe(normalized);
    }

    normalized = normalizePadding(normalized);

    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
      throw new Error("This does not look like valid Base64.");
    }

    const bytes = base64ToBytes(normalized);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }

  encodeButton.addEventListener("click", () => {
    if (!input.value) {
      output.value = "";
      setError("Enter some text first.");
      updateCounts();
      return;
    }

    try {
      output.value = encodeText(input.value);
      setSuccess("Encoded.");
    } catch (error) {
      output.value = "";
      setError(error.message || "Could not encode this text.");
    }

    updateCounts();
  });

  decodeButton.addEventListener("click", () => {
    try {
      output.value = decodeText(input.value);
      setSuccess("Decoded.");
    } catch (error) {
      output.value = "";
      setError(error.message || "Could not decode this Base64 text.");
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
    input.value = "PocketWorkshop 日本語テスト 🔧";
    output.value = "";
    variantSelect.value = "standard";
    paddingCheck.checked = true;
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
