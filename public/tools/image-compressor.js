const input = document.getElementById("compressor-input");
const fileName = document.getElementById("compressor-file-name");
const workspace = document.getElementById("compressor-workspace");
const preview = document.getElementById("compressor-preview");
const originalInfo = document.getElementById("compressor-original-info");
const format = document.getElementById("compressor-format");
const quality = document.getElementById("compressor-quality");
const qualityValue = document.getElementById("compressor-quality-value");
const qualityLabel = document.getElementById("compressor-quality-label");
const outputInfo = document.getElementById("compressor-output-info");
const button = document.getElementById("compressor-button");
const reset = document.getElementById("compressor-reset-button");
const status = document.getElementById("compressor-status");
const panel = document.getElementById("compressor-download-panel");
const link = document.getElementById("compressor-download-link");
const info = document.getElementById("compressor-download-info");
const badge = document.getElementById("compressor-saving-badge");
const canvas = document.getElementById("compressor-canvas");

let sourceImage = null;
let sourceFile = null;
let sourceUrl = "";
let outputUrl = "";

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

function refreshQualityLabel() {
  qualityValue.textContent = `${quality.value}%`;

  if (format.value === "image/png") {
    qualityLabel.hidden = true;
    outputInfo.textContent = sourceImage
      ? `${sourceImage.naturalWidth.toLocaleString()} × ${sourceImage.naturalHeight.toLocaleString()} px · PNG is lossless`
      : "PNG is lossless";
  } else {
    qualityLabel.hidden = false;
    outputInfo.textContent = sourceImage
      ? `${sourceImage.naturalWidth.toLocaleString()} × ${sourceImage.naturalHeight.toLocaleString()} px · Quality ${quality.value}%`
      : `Quality ${quality.value}%`;
  }
}

function clearOutputUrl() {
  if (outputUrl) {
    URL.revokeObjectURL(outputUrl);
    outputUrl = "";
  }
}

function resetTool() {
  clearOutputUrl();

  if (sourceUrl) {
    URL.revokeObjectURL(sourceUrl);
    sourceUrl = "";
  }

  sourceImage = null;
  sourceFile = null;
  input.value = "";
  fileName.textContent = "No image selected";
  preview.removeAttribute("src");
  originalInfo.textContent = "";
  outputInfo.textContent = "Same dimensions";
  workspace.hidden = true;
  panel.hidden = true;
  status.textContent = "";
  badge.textContent = "";
}

input.addEventListener("change", () => {
  const file = input.files && input.files[0];
  if (!file) return;

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    status.textContent = "Please choose a JPG, PNG or WebP image.";
    input.value = "";
    return;
  }

  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  clearOutputUrl();

  sourceFile = file;
  sourceUrl = URL.createObjectURL(file);
  sourceImage = new Image();

  sourceImage.onload = () => {
    preview.src = sourceUrl;
    fileName.textContent = file.name;
    originalInfo.textContent =
      `${sourceImage.naturalWidth.toLocaleString()} × ${sourceImage.naturalHeight.toLocaleString()} px · ${formatBytes(file.size)}`;

    /*
      Real compression defaults:
      - JPEG -> JPEG
      - PNG  -> WebP (PNG quality is ignored by canvas.toBlob)
      - WebP -> WebP
    */
    if (file.type === "image/jpeg") {
      format.value = "image/jpeg";
      quality.value = "75";
    } else {
      format.value = "image/webp";
      quality.value = "75";
    }

    refreshQualityLabel();
    workspace.hidden = false;
    panel.hidden = true;
    status.textContent = "";
  };

  sourceImage.onerror = () => {
    status.textContent = "This image could not be opened.";
  };

  sourceImage.src = sourceUrl;
});

format.addEventListener("change", () => {
  if (format.value === "image/png") {
    status.textContent = "PNG is lossless, so file size may not get smaller. WebP usually compresses better.";
  } else {
    status.textContent = "";
  }
  refreshQualityLabel();
});

quality.addEventListener("input", refreshQualityLabel);
reset.addEventListener("click", resetTool);

button.addEventListener("click", () => {
  if (!sourceImage || !sourceFile) {
    status.textContent = "Choose an image first.";
    return;
  }

  if (format.value === "image/png") {
    status.textContent = "Compressing PNG… PNG is lossless, so the result may not be smaller.";
  } else {
    status.textContent = "Compressing…";
  }

  button.disabled = true;

  requestAnimationFrame(() => {
    try {
      const width = sourceImage.naturalWidth;
      const height = sourceImage.naturalHeight;

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", {
        alpha: format.value !== "image/jpeg"
      });

      context.clearRect(0, 0, width, height);

      if (format.value === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(sourceImage, 0, 0, width, height);

      const q = Number(quality.value) / 100;

      canvas.toBlob((blob) => {
        button.disabled = false;

        if (!blob) {
          status.textContent = "The compressed image could not be created.";
          return;
        }

        clearOutputUrl();
        outputUrl = URL.createObjectURL(blob);

        const ext = extensionFor(format.value);
        const filename = `${baseName(sourceFile.name)}-compressed.${ext}`;
        const difference = sourceFile.size - blob.size;
        const percent = sourceFile.size > 0
          ? Math.round((Math.abs(difference) / sourceFile.size) * 100)
          : 0;

        link.href = outputUrl;
        link.download = filename;
        info.textContent =
          `${width.toLocaleString()} × ${height.toLocaleString()} px · ${formatBytes(sourceFile.size)} → ${formatBytes(blob.size)} · ${ext.toUpperCase()}`;

        if (difference > 0) {
          badge.textContent = `Saved ${formatBytes(difference)} (${percent}%)`;
          status.textContent = "Done";
        } else if (difference === 0) {
          badge.textContent = "Same file size";
          status.textContent = "No size reduction. Try a lower quality or WebP.";
        } else {
          badge.textContent = `${formatBytes(Math.abs(difference))} larger`;
          status.textContent = "The result is larger. Try a lower quality or WebP.";
        }

        panel.hidden = false;
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, format.value, q);
    } catch (e) {
      button.disabled = false;
      status.textContent = "Something went wrong while compressing.";
    }
  });
});

refreshQualityLabel();
