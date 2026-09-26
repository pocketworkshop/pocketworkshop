const imageInput = document.getElementById("image-input");
const fileNameEl = document.getElementById("image-file-name");
const workspace = document.getElementById("image-workspace");
const preview = document.getElementById("image-preview");
const originalInfo = document.getElementById("image-original-info");
const widthInput = document.getElementById("image-width");
const heightInput = document.getElementById("image-height");
const lockAspect = document.getElementById("image-lock-aspect");
const formatSelect = document.getElementById("image-format");
const qualityInput = document.getElementById("image-quality");
const qualityValue = document.getElementById("image-quality-value");
const qualityLabel = document.getElementById("image-quality-label");
const outputSize = document.getElementById("image-output-size");
const resizeButton = document.getElementById("image-resize-button");
const resetButton = document.getElementById("image-reset-button");
const status = document.getElementById("image-status");
const downloadPanel = document.getElementById("image-download-panel");
const downloadLink = document.getElementById("image-download-link");
const downloadInfo = document.getElementById("image-download-info");
const canvas = document.getElementById("image-resize-canvas");

let sourceImage = null;
let sourceFile = null;
let sourceUrl = "";
let outputUrl = "";
let aspectRatio = 1;
let syncing = false;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extensionFor(type) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function baseName(name) {
  return name.replace(/\.[^.]+$/, "") || "image";
}

function refreshOutputSize() {
  const w = Number(widthInput.value);
  const h = Number(heightInput.value);
  outputSize.textContent = w > 0 && h > 0 ? `${Math.round(w).toLocaleString()} × ${Math.round(h).toLocaleString()} px` : "—";
}

function refreshQualityVisibility() {
  qualityLabel.hidden = formatSelect.value === "image/png";
}

function revokeOutputUrl() {
  if (outputUrl) {
    URL.revokeObjectURL(outputUrl);
    outputUrl = "";
  }
}

function resetTool() {
  revokeOutputUrl();
  if (sourceUrl) {
    URL.revokeObjectURL(sourceUrl);
    sourceUrl = "";
  }

  sourceImage = null;
  sourceFile = null;
  imageInput.value = "";
  fileNameEl.textContent = "No image selected";
  preview.removeAttribute("src");
  workspace.hidden = true;
  downloadPanel.hidden = true;
  status.textContent = "";
  originalInfo.textContent = "";
  widthInput.value = "";
  heightInput.value = "";
  outputSize.textContent = "—";
}

imageInput.addEventListener("change", () => {
  const file = imageInput.files && imageInput.files[0];
  if (!file) return;

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    status.textContent = "Please choose a JPG, PNG or WebP image.";
    imageInput.value = "";
    return;
  }

  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  revokeOutputUrl();

  sourceFile = file;
  sourceUrl = URL.createObjectURL(file);
  sourceImage = new Image();

  sourceImage.onload = () => {
    aspectRatio = sourceImage.naturalWidth / sourceImage.naturalHeight;
    preview.src = sourceUrl;
    fileNameEl.textContent = file.name;
    originalInfo.textContent = `${sourceImage.naturalWidth.toLocaleString()} × ${sourceImage.naturalHeight.toLocaleString()} px · ${formatBytes(file.size)}`;
    widthInput.value = sourceImage.naturalWidth;
    heightInput.value = sourceImage.naturalHeight;

    if (file.type === "image/png") formatSelect.value = "image/png";
    else if (file.type === "image/webp") formatSelect.value = "image/webp";
    else formatSelect.value = "image/jpeg";

    refreshQualityVisibility();
    refreshOutputSize();
    workspace.hidden = false;
    downloadPanel.hidden = true;
    status.textContent = "";
  };

  sourceImage.onerror = () => {
    status.textContent = "This image could not be opened.";
  };

  sourceImage.src = sourceUrl;
});

widthInput.addEventListener("input", () => {
  if (syncing) return;
  const width = Math.round(Number(widthInput.value));
  if (lockAspect.checked && sourceImage && width > 0) {
    syncing = true;
    heightInput.value = Math.max(1, Math.round(width / aspectRatio));
    syncing = false;
  }
  refreshOutputSize();
});

heightInput.addEventListener("input", () => {
  if (syncing) return;
  const height = Math.round(Number(heightInput.value));
  if (lockAspect.checked && sourceImage && height > 0) {
    syncing = true;
    widthInput.value = Math.max(1, Math.round(height * aspectRatio));
    syncing = false;
  }
  refreshOutputSize();
});

lockAspect.addEventListener("change", () => {
  if (lockAspect.checked && sourceImage && Number(widthInput.value) > 0) {
    heightInput.value = Math.max(1, Math.round(Number(widthInput.value) / aspectRatio));
    refreshOutputSize();
  }
});

qualityInput.addEventListener("input", () => {
  qualityValue.textContent = `${qualityInput.value}%`;
});

formatSelect.addEventListener("change", refreshQualityVisibility);
resetButton.addEventListener("click", resetTool);

resizeButton.addEventListener("click", () => {
  if (!sourceImage || !sourceFile) {
    status.textContent = "Choose an image first.";
    return;
  }

  const width = Math.round(Number(widthInput.value));
  const height = Math.round(Number(heightInput.value));

  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    status.textContent = "Enter a valid width and height.";
    return;
  }

  if (width > 12000 || height > 12000 || width * height > 80000000) {
    status.textContent = "That output is too large. Try smaller dimensions.";
    return;
  }

  status.textContent = "Resizing…";
  resizeButton.disabled = true;

  requestAnimationFrame(() => {
    try {
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", { alpha: formatSelect.value !== "image/jpeg" });
      context.clearRect(0, 0, width, height);

      if (formatSelect.value === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(sourceImage, 0, 0, width, height);

      const quality = Number(qualityInput.value) / 100;

      canvas.toBlob((blob) => {
        resizeButton.disabled = false;
        if (!blob) {
          status.textContent = "The resized image could not be created.";
          return;
        }

        revokeOutputUrl();
        outputUrl = URL.createObjectURL(blob);

        const ext = extensionFor(formatSelect.value);
        const filename = `${baseName(sourceFile.name)}-${width}x${height}.${ext}`;

        downloadLink.href = outputUrl;
        downloadLink.download = filename;
        downloadInfo.textContent = `${width.toLocaleString()} × ${height.toLocaleString()} px · ${formatBytes(blob.size)} · ${ext.toUpperCase()}`;
        downloadPanel.hidden = false;
        status.textContent = "Done";
        downloadPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, formatSelect.value, quality);
    } catch (e) {
      resizeButton.disabled = false;
      status.textContent = "Something went wrong while resizing.";
    }
  });
});

refreshQualityVisibility();
refreshOutputSize();
