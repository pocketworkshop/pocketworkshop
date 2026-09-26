(() => {
  const textTab = document.getElementById("hash-tab-text");
  const fileTab = document.getElementById("hash-tab-file");
  const textPanel = document.getElementById("hash-text-panel");
  const filePanel = document.getElementById("hash-file-panel");
  const textInput = document.getElementById("hash-text");
  const fileInput = document.getElementById("hash-file");
  const textCount = document.getElementById("hash-text-count");
  const fileStatus = document.getElementById("hash-file-status");
  const fileMeta = document.getElementById("hash-file-meta");
  const algorithm = document.getElementById("hash-algorithm");
  const outputFormat = document.getElementById("hash-output-format");
  const generateButton = document.getElementById("hash-generate");
  const sampleButton = document.getElementById("hash-sample");
  const clearButton = document.getElementById("hash-clear");
  const copyPrimaryButton = document.getElementById("hash-copy-primary");
  const copySecondaryButton = document.getElementById("hash-copy-secondary");
  const primaryLabel = document.getElementById("hash-primary-label");
  const secondaryLabel = document.getElementById("hash-secondary-label");
  const primaryOutput = document.getElementById("hash-primary");
  const secondaryOutput = document.getElementById("hash-secondary");
  const status = document.getElementById("hash-status");
  const summary = document.getElementById("hash-summary");
  const errorBox = document.getElementById("hash-error");

  let source = "text";

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes.toLocaleString()} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function updateTextCount() {
    const count = textInput.value.length;
    textCount.textContent = `${count.toLocaleString()} ${count === 1 ? "character" : "characters"}`;
  }

  function updateFileMeta() {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      fileStatus.textContent = "No file selected";
      fileMeta.textContent = "Choose a file from your device. It is read locally in your browser.";
      return;
    }
    fileStatus.textContent = formatBytes(file.size);
    fileMeta.textContent = `${file.name} · ${formatBytes(file.size)}${file.type ? ` · ${file.type}` : ""}`;
  }

  function clearMessage() {
    status.textContent = "";
    summary.textContent = "";
    errorBox.textContent = "";
    errorBox.style.display = "none";
  }

  function setError(message) {
    status.textContent = "Could not generate hash.";
    summary.textContent = "";
    errorBox.textContent = message;
    errorBox.style.display = "block";
  }

  function clearOutputs() {
    primaryOutput.value = "";
    secondaryOutput.value = "";
  }

  function setSource(nextSource) {
    source = nextSource;
    const isText = source === "text";
    textTab.setAttribute("aria-selected", String(isText));
    fileTab.setAttribute("aria-selected", String(!isText));
    textPanel.classList.toggle("is-active", isText);
    filePanel.classList.toggle("is-active", !isText);
    clearMessage();
    clearOutputs();
  }

  function bytesToHex(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  function updateOutputLabels() {
    const primaryIsHex = outputFormat.value === "hex";
    primaryLabel.textContent = primaryIsHex ? "HEX output" : "Base64 output";
    secondaryLabel.textContent = primaryIsHex ? "Base64 output" : "HEX output";
  }

  async function getInputBuffer() {
    if (source === "text") {
      if (!textInput.value) throw new Error("Enter some text first.");
      return {
        buffer: new TextEncoder().encode(textInput.value),
        label: `${textInput.value.length.toLocaleString()} characters`
      };
    }

    const file = fileInput.files && fileInput.files[0];
    if (!file) throw new Error("Choose a file first.");
    return {
      buffer: new Uint8Array(await file.arrayBuffer()),
      label: `${file.name} · ${formatBytes(file.size)}`
    };
  }

  async function generateHash() {
    clearMessage();
    clearOutputs();

    if (!window.crypto || !window.crypto.subtle) {
      setError("Your browser does not provide the Web Crypto API required for SHA hashing.");
      return;
    }

    try {
      generateButton.disabled = true;
      status.textContent = "Generating...";
      const inputData = await getInputBuffer();
      const digest = await crypto.subtle.digest(algorithm.value, inputData.buffer);
      const bytes = new Uint8Array(digest);
      const hex = bytesToHex(bytes);
      const base64 = bytesToBase64(bytes);
      const primaryIsHex = outputFormat.value === "hex";

      primaryOutput.value = primaryIsHex ? hex : base64;
      secondaryOutput.value = primaryIsHex ? base64 : hex;
      status.textContent = "Hash generated.";
      summary.textContent = `${algorithm.value} · ${inputData.label}`;
    } catch (error) {
      setError(error && error.message ? error.message : "The hash could not be generated.");
    } finally {
      generateButton.disabled = false;
    }
  }

  async function copyOutput(target) {
    if (!target.value) {
      status.textContent = "Generate a hash first.";
      return;
    }
    try {
      await navigator.clipboard.writeText(target.value);
      status.textContent = "Copied.";
    } catch {
      target.focus();
      target.select();
      try {
        document.execCommand("copy");
        status.textContent = "Copied.";
      } catch {
        status.textContent = "Could not copy automatically. Select the value and copy it manually.";
      }
    }
  }

  textTab.addEventListener("click", () => setSource("text"));
  fileTab.addEventListener("click", () => setSource("file"));
  generateButton.addEventListener("click", generateHash);
  copyPrimaryButton.addEventListener("click", () => copyOutput(primaryOutput));
  copySecondaryButton.addEventListener("click", () => copyOutput(secondaryOutput));

  sampleButton.addEventListener("click", () => {
    setSource("text");
    textInput.value = "PocketWorkshop";
    updateTextCount();
    clearMessage();
    clearOutputs();
    status.textContent = "Sample loaded.";
    textInput.focus();
  });

  clearButton.addEventListener("click", () => {
    textInput.value = "";
    fileInput.value = "";
    updateTextCount();
    updateFileMeta();
    clearMessage();
    clearOutputs();
    if (source === "text") textInput.focus();
  });

  textInput.addEventListener("input", () => {
    updateTextCount();
    clearMessage();
    clearOutputs();
  });

  fileInput.addEventListener("change", () => {
    updateFileMeta();
    clearMessage();
    clearOutputs();
  });

  algorithm.addEventListener("change", () => {
    clearMessage();
    clearOutputs();
  });

  outputFormat.addEventListener("change", () => {
    updateOutputLabels();
    if (primaryOutput.value || secondaryOutput.value) generateHash();
  });

  updateTextCount();
  updateFileMeta();
  updateOutputLabels();
})();
