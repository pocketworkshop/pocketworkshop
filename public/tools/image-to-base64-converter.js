(() => {
  const encodeTab = document.getElementById("b64-tab-encode");
  const decodeTab = document.getElementById("b64-tab-decode");
  const encodePanel = document.getElementById("b64-panel-encode");
  const decodePanel = document.getElementById("b64-panel-decode");

  const drop = document.getElementById("b64-drop");
  const fileInput = document.getElementById("b64-file");
  const previewWrap = document.getElementById("b64-preview-wrap");
  const preview = document.getElementById("b64-preview");
  const nameField = document.getElementById("b64-name");
  const typeField = document.getElementById("b64-type");
  const sizeField = document.getElementById("b64-size");
  const dimensionsField = document.getElementById("b64-dimensions");
  const dataUrlOption = document.getElementById("b64-data-url");
  const wrapLinesOption = document.getElementById("b64-wrap-lines");
  const output = document.getElementById("b64-output");
  const outputCount = document.getElementById("b64-output-count");
  const copyButton = document.getElementById("b64-copy");
  const downloadTextButton = document.getElementById("b64-download-text");
  const clearButton = document.getElementById("b64-clear");
  const status = document.getElementById("b64-status");

  const decodeInput = document.getElementById("b64-decode-input");
  const decodeCount = document.getElementById("b64-decode-count");
  const previewButton = document.getElementById("b64-preview-button");
  const downloadImageButton = document.getElementById("b64-download-image");
  const decodeClearButton = document.getElementById("b64-decode-clear");
  const decodeStatus = document.getElementById("b64-decode-status");
  const decodedPreview = document.getElementById("b64-decoded-preview");
  const decodedImage = document.getElementById("b64-decoded-image");
  const decodeInfo = document.getElementById("b64-decode-info");

  let selectedFile = null;
  let selectedDataUrl = "";
  let decodedBlobUrl = "";
  let decodedMime = "";
  let decodedExtension = "png";

  function setMode(mode) {
    const encode = mode === "encode";
    encodePanel.hidden = !encode;
    decodePanel.hidden = encode;
    encodeTab.classList.toggle("is-active", encode);
    decodeTab.classList.toggle("is-active", !encode);
    encodeTab.setAttribute("aria-selected", String(encode));
    decodeTab.setAttribute("aria-selected", String(!encode));
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function wrap76(value) {
    return value.replace(/.{1,76}/g, "$&\n").trim();
  }

  function getBase64Part(dataUrl) {
    const comma = dataUrl.indexOf(",");
    return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  }

  function updateOutput() {
    if (!selectedDataUrl) {
      output.value = "";
      outputCount.textContent = "0 characters";
      return;
    }

    let value = dataUrlOption.checked ? selectedDataUrl : getBase64Part(selectedDataUrl);

    if (wrapLinesOption.checked) {
      if (dataUrlOption.checked) {
        const comma = value.indexOf(",");
        if (comma >= 0) {
          value = value.slice(0, comma + 1) + "\n" + wrap76(value.slice(comma + 1));
        }
      } else {
        value = wrap76(value);
      }
    }

    output.value = value;
    outputCount.textContent = `${value.length.toLocaleString()} ${value.length === 1 ? "character" : "characters"}`;
  }

  function resetEncode() {
    selectedFile = null;
    selectedDataUrl = "";
    fileInput.value = "";
    preview.removeAttribute("src");
    previewWrap.classList.remove("is-visible");
    nameField.textContent = "—";
    typeField.textContent = "—";
    sizeField.textContent = "—";
    dimensionsField.textContent = "—";
    output.value = "";
    outputCount.textContent = "0 characters";
    status.textContent = "";
    status.classList.remove("b64-error");
  }

  function readFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      status.textContent = "Choose an image file.";
      status.classList.add("b64-error");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      selectedFile = file;
      selectedDataUrl = String(reader.result || "");

      preview.src = selectedDataUrl;
      previewWrap.classList.add("is-visible");
      nameField.textContent = file.name;
      typeField.textContent = file.type || "Unknown";
      sizeField.textContent = formatBytes(file.size);
      dimensionsField.textContent = "Loading...";

      const img = new Image();
      img.onload = () => {
        dimensionsField.textContent = `${img.naturalWidth.toLocaleString()} × ${img.naturalHeight.toLocaleString()} px`;
      };
      img.onerror = () => {
        dimensionsField.textContent = "Could not read dimensions";
      };
      img.src = selectedDataUrl;

      updateOutput();
      status.textContent = "Image converted.";
      status.classList.remove("b64-error");
    };

    reader.onerror = () => {
      status.textContent = "Could not read this file.";
      status.classList.add("b64-error");
    };

    reader.readAsDataURL(file);
  }

  async function copyText(value, statusElement) {
    if (!value) {
      statusElement.textContent = "Nothing to copy.";
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      statusElement.textContent = "Copied.";
    } catch {
      const temp = document.createElement("textarea");
      temp.value = value;
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.select();

      try {
        document.execCommand("copy");
        statusElement.textContent = "Copied.";
      } catch {
        statusElement.textContent = "Could not copy automatically.";
      }

      temp.remove();
    }
  }

  function downloadText() {
    if (!output.value) {
      status.textContent = "Convert an image first.";
      return;
    }

    const blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const baseName = selectedFile ? selectedFile.name.replace(/\.[^.]+$/, "") : "image";
    link.href = url;
    link.download = `${baseName}-base64.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    status.textContent = "TXT downloaded.";
  }

  function cleanBase64(value) {
    return value.replace(/\s+/g, "");
  }

  function detectImageTypeFromBytes(bytes) {
    if (bytes.length >= 8 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return { mime: "image/png", ext: "png" };
    }

    if (bytes.length >= 3 &&
        bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return { mime: "image/jpeg", ext: "jpg" };
    }

    if (bytes.length >= 6) {
      const sig = String.fromCharCode(...bytes.slice(0, 6));
      if (sig === "GIF87a" || sig === "GIF89a") return { mime: "image/gif", ext: "gif" };
    }

    if (bytes.length >= 12) {
      const riff = String.fromCharCode(...bytes.slice(0, 4));
      const webp = String.fromCharCode(...bytes.slice(8, 12));
      if (riff === "RIFF" && webp === "WEBP") return { mime: "image/webp", ext: "webp" };
    }

    const textStart = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 300)).trimStart();
    if (textStart.startsWith("<svg") || textStart.includes("<svg")) {
      return { mime: "image/svg+xml", ext: "svg" };
    }

    return { mime: "image/png", ext: "png" };
  }

  function decodeBase64ToBlob(value) {
    const trimmed = value.trim();

    if (!trimmed) throw new Error("Paste Base64 or a Data URL first.");

    let mime = "";
    let raw = trimmed;

    const dataUrlMatch = trimmed.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.*)$/is);
    if (dataUrlMatch) {
      mime = dataUrlMatch[1] || "";
      raw = dataUrlMatch[2];
    } else if (trimmed.startsWith("data:")) {
      throw new Error("This Data URL is not Base64 encoded.");
    }

    raw = cleanBase64(raw);

    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(raw) || raw.length % 4 === 1) {
      throw new Error("This does not look like valid Base64.");
    }

    let binary;
    try {
      binary = atob(raw);
    } catch {
      throw new Error("Could not decode this Base64 data.");
    }

    if (!binary.length) throw new Error("The decoded data is empty.");

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const detected = detectImageTypeFromBytes(bytes);
    if (!mime.startsWith("image/")) mime = detected.mime;

    const extMap = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "image/bmp": "bmp"
    };

    return {
      blob: new Blob([bytes], { type: mime }),
      mime,
      ext: extMap[mime] || detected.ext || "img"
    };
  }

  function clearDecodedObjectUrl() {
    if (decodedBlobUrl) {
      URL.revokeObjectURL(decodedBlobUrl);
      decodedBlobUrl = "";
    }
  }

  function previewDecoded() {
    decodeStatus.textContent = "";
    decodeStatus.classList.remove("b64-error");
    downloadImageButton.disabled = true;
    decodedPreview.classList.remove("is-visible");
    decodedImage.removeAttribute("src");
    decodeInfo.textContent = "";
    clearDecodedObjectUrl();

    try {
      const result = decodeBase64ToBlob(decodeInput.value);
      decodedMime = result.mime;
      decodedExtension = result.ext;
      decodedBlobUrl = URL.createObjectURL(result.blob);

      decodedImage.onload = () => {
        decodeInfo.textContent = `${decodedMime} · ${decodedImage.naturalWidth.toLocaleString()} × ${decodedImage.naturalHeight.toLocaleString()} px · ${formatBytes(result.blob.size)}`;
        decodedPreview.classList.add("is-visible");
        downloadImageButton.disabled = false;
        decodeStatus.textContent = "Image decoded.";
      };

      decodedImage.onerror = () => {
        clearDecodedObjectUrl();
        decodeStatus.textContent = "Base64 decoded, but the result is not a readable image.";
        decodeStatus.classList.add("b64-error");
      };

      decodedImage.src = decodedBlobUrl;
    } catch (error) {
      decodeStatus.textContent = error.message || "Could not decode this Base64 data.";
      decodeStatus.classList.add("b64-error");
    }
  }

  encodeTab.addEventListener("click", () => setMode("encode"));
  decodeTab.addEventListener("click", () => setMode("decode"));

  fileInput.addEventListener("change", () => {
    readFile(fileInput.files && fileInput.files[0]);
  });

  ["dragenter", "dragover"].forEach(eventName => {
    drop.addEventListener(eventName, event => {
      event.preventDefault();
      drop.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach(eventName => {
    drop.addEventListener(eventName, event => {
      event.preventDefault();
      drop.classList.remove("is-dragging");
    });
  });

  drop.addEventListener("drop", event => {
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    readFile(file);
  });

  dataUrlOption.addEventListener("change", updateOutput);
  wrapLinesOption.addEventListener("change", updateOutput);

  copyButton.addEventListener("click", () => copyText(output.value, status));
  downloadTextButton.addEventListener("click", downloadText);
  clearButton.addEventListener("click", resetEncode);

  decodeInput.addEventListener("input", () => {
    const n = decodeInput.value.length;
    decodeCount.textContent = `${n.toLocaleString()} ${n === 1 ? "character" : "characters"}`;
    decodeStatus.textContent = "";
    decodeStatus.classList.remove("b64-error");
  });

  previewButton.addEventListener("click", previewDecoded);

  downloadImageButton.addEventListener("click", () => {
    if (!decodedBlobUrl) {
      decodeStatus.textContent = "Preview an image first.";
      return;
    }

    const link = document.createElement("a");
    link.href = decodedBlobUrl;
    link.download = `decoded-image.${decodedExtension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    decodeStatus.textContent = "Image downloaded.";
  });

  decodeClearButton.addEventListener("click", () => {
    decodeInput.value = "";
    decodeCount.textContent = "0 characters";
    decodeStatus.textContent = "";
    decodeStatus.classList.remove("b64-error");
    decodedPreview.classList.remove("is-visible");
    decodedImage.removeAttribute("src");
    decodeInfo.textContent = "";
    downloadImageButton.disabled = true;
    clearDecodedObjectUrl();
    decodeInput.focus();
  });

  window.addEventListener("beforeunload", clearDecodedObjectUrl);

  setMode("encode");
  resetEncode();
})();
