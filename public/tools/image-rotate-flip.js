(() => {
  const input = document.getElementById("irf-file-input");
  const drop = document.getElementById("irf-drop");
  const preview = document.getElementById("irf-preview");
  const placeholder = document.getElementById("irf-placeholder");
  const rotateLeftButton = document.getElementById("irf-rotate-left");
  const rotateRightButton = document.getElementById("irf-rotate-right");
  const rotate180Button = document.getElementById("irf-rotate-180");
  const flipHorizontalButton = document.getElementById("irf-flip-horizontal");
  const flipVerticalButton = document.getElementById("irf-flip-vertical");
  const resetButton = document.getElementById("irf-reset");
  const formatSelect = document.getElementById("irf-format");
  const qualityRange = document.getElementById("irf-quality-range");
  const qualityNumber = document.getElementById("irf-quality-number");
  const backgroundSelect = document.getElementById("irf-background");
  const meta = document.getElementById("irf-meta");
  const downloadButton = document.getElementById("irf-download");
  const clearButton = document.getElementById("irf-clear");
  const status = document.getElementById("irf-status");
  const summary = document.getElementById("irf-summary");

  const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

  let file = null;
  let image = null;
  let objectUrl = null;
  let rotation = 0;
  let flipX = 1;
  let flipY = 1;

  function setSuccess(message) {
    status.className = "status";
    status.textContent = message;
  }

  function setError(message) {
    status.className = "status irf-error";
    status.textContent = message;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function mimeLabel(type) {
    if (type === "image/jpeg") return "JPG";
    if (type === "image/png") return "PNG";
    if (type === "image/webp") return "WebP";
    return type || "Image";
  }

  function extensionFor(type) {
    if (type === "image/jpeg") return "jpg";
    if (type === "image/png") return "png";
    return "webp";
  }

  function baseName(name) {
    return name.replace(/\.[^.]+$/, "") || "transformed-image";
  }

  function normalizeRotation(value) {
    return ((value % 360) + 360) % 360;
  }

  function selectedType() {
    if (formatSelect.value === "original") {
      return file ? file.type : "image/png";
    }
    return formatSelect.value;
  }

  function outputDimensions() {
    if (!image) return { width: 0, height: 0 };
    const quarterTurn = normalizeRotation(rotation) % 180 !== 0;
    return quarterTurn
      ? { width: image.naturalHeight, height: image.naturalWidth }
      : { width: image.naturalWidth, height: image.naturalHeight };
  }

  function updateMeta() {
    if (!file || !image) {
      meta.textContent = "No image selected.";
      summary.textContent = "";
      return;
    }

    const dims = outputDimensions();
    meta.textContent = `${file.name}
${mimeLabel(file.type)} · ${image.naturalWidth} × ${image.naturalHeight} · ${formatBytes(file.size)}
Output dimensions: ${dims.width} × ${dims.height}`;

    summary.textContent = `Rotation ${normalizeRotation(rotation)}° · Horizontal ${flipX === -1 ? "flipped" : "normal"} · Vertical ${flipY === -1 ? "flipped" : "normal"}`;
  }

  function updatePreview() {
    if (!image) {
      preview.style.display = "none";
      placeholder.style.display = "block";
      updateMeta();
      return;
    }

    preview.style.display = "block";
    placeholder.style.display = "none";
    preview.style.transform = `rotate(${rotation}deg) scale(${flipX}, ${flipY})`;
    updateMeta();
  }

  function syncQuality(value) {
    const clean = Math.min(100, Math.max(10, Number(value) || 92));
    qualityRange.value = String(clean);
    qualityNumber.value = String(clean);
  }

  function updateFormatControls() {
    const type = selectedType();
    const isPng = type === "image/png";
    qualityRange.disabled = isPng;
    qualityNumber.disabled = isPng;
    backgroundSelect.disabled = type !== "image/jpeg";
  }

  function clearObjectUrl() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  }

  function loadFile(nextFile) {
    if (!nextFile || !supportedTypes.has(nextFile.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }

    clearObjectUrl();

    file = nextFile;
    objectUrl = URL.createObjectURL(nextFile);

    const nextImage = new Image();

    nextImage.onload = () => {
      image = nextImage;
      rotation = 0;
      flipX = 1;
      flipY = 1;
      preview.src = objectUrl;
      formatSelect.value = "original";
      updateFormatControls();
      updatePreview();
      setSuccess("Image loaded.");
    };

    nextImage.onerror = () => {
      setError("Could not read this image.");
      clearObjectUrl();
      file = null;
      image = null;
      updatePreview();
    };

    nextImage.src = objectUrl;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error(`${mimeLabel(type)} output is not supported by this browser.`));
          return;
        }
        resolve(blob);
      }, type, quality);
    });
  }

  async function createOutputBlob() {
    if (!image || !file) {
      throw new Error("Choose an image first.");
    }

    const type = selectedType();
    const quality = Math.min(1, Math.max(0.1, Number(qualityNumber.value) / 100));
    const angle = normalizeRotation(rotation);
    const dims = outputDimensions();

    const canvas = document.createElement("canvas");
    canvas.width = dims.width;
    canvas.height = dims.height;

    const context = canvas.getContext("2d", { alpha: type !== "image/jpeg" });

    if (type === "image/jpeg") {
      context.fillStyle = backgroundSelect.value;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(angle * Math.PI / 180);
    context.scale(flipX, flipY);

    const drawWidth = image.naturalWidth;
    const drawHeight = image.naturalHeight;

    context.drawImage(
      image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    return canvasToBlob(canvas, type, type === "image/png" ? undefined : quality);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function downloadTransformed() {
    if (!file || !image) {
      setError("Choose an image first.");
      return;
    }

    downloadButton.disabled = true;

    try {
      const blob = await createOutputBlob();
      const type = selectedType();
      const extension = extensionFor(type);
      downloadBlob(blob, `${baseName(file.name)}-transformed.${extension}`);
      setSuccess(`Downloaded · ${formatBytes(blob.size)}.`);
    } catch (error) {
      setError(error.message || "Could not transform this image.");
    } finally {
      downloadButton.disabled = false;
    }
  }

  rotateLeftButton.addEventListener("click", () => {
    if (!image) return setError("Choose an image first.");
    rotation -= 90;
    updatePreview();
  });

  rotateRightButton.addEventListener("click", () => {
    if (!image) return setError("Choose an image first.");
    rotation += 90;
    updatePreview();
  });

  rotate180Button.addEventListener("click", () => {
    if (!image) return setError("Choose an image first.");
    rotation += 180;
    updatePreview();
  });

  flipHorizontalButton.addEventListener("click", () => {
    if (!image) return setError("Choose an image first.");
    flipX *= -1;
    updatePreview();
  });

  flipVerticalButton.addEventListener("click", () => {
    if (!image) return setError("Choose an image first.");
    flipY *= -1;
    updatePreview();
  });

  resetButton.addEventListener("click", () => {
    if (!image) return setError("Choose an image first.");
    rotation = 0;
    flipX = 1;
    flipY = 1;
    updatePreview();
    setSuccess("Transform reset.");
  });

  input.addEventListener("change", () => {
    if (input.files && input.files[0]) loadFile(input.files[0]);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      drop.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      drop.classList.remove("is-dragging");
    });
  });

  drop.addEventListener("drop", (event) => {
    const nextFile = event.dataTransfer.files && event.dataTransfer.files[0];
    if (nextFile) loadFile(nextFile);
  });

  qualityRange.addEventListener("input", () => syncQuality(qualityRange.value));
  qualityNumber.addEventListener("input", () => syncQuality(qualityNumber.value));

  formatSelect.addEventListener("change", updateFormatControls);

  downloadButton.addEventListener("click", downloadTransformed);

  clearButton.addEventListener("click", () => {
    clearObjectUrl();
    file = null;
    image = null;
    rotation = 0;
    flipX = 1;
    flipY = 1;
    input.value = "";
    preview.removeAttribute("src");
    formatSelect.value = "original";
    updateFormatControls();
    updatePreview();
    status.className = "status";
    status.textContent = "";
  });

  window.addEventListener("beforeunload", clearObjectUrl);
  updateFormatControls();
  updatePreview();
})();
