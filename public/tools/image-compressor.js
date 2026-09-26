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
  qualityLabel.hidden = format.value === "image/png";
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
    originalInfo.textContent = `${sourceImage.naturalWidth.toLocaleString()} × ${sourceImage.naturalHeight.toLocaleString()} px · ${formatBytes(file.size)}`;

    if (file.type === "image/png") format.value = "image/png";
    else if (file.type === "image/webp") format.value = "image/webp";
    else format.value = "image/jpeg";

    outputInfo.textContent = `${sourceImage.naturalWidth.toLocaleString()} × ${sourceImage.naturalHeight.toLocaleString()} px`;
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

format.addEventListener("change", refreshQualityLabel);
quality.addEventListener("input", refreshQualityLabel);
reset.addEventListener("click", resetTool);

button.addEventListener("click", () => {
  if (!sourceImage || !sourceFile) {
    status.textContent = "Choose an image first.";
    return;
  }

  status.textContent = "Compressing…";
  button.disabled = true;

  requestAnimationFrame(() => {
    try {
      const width = sourceImage.naturalWidth;
      const height = sourceImage.naturalHeight;

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", { alpha: format.value !== "image/jpeg" });
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
        const saved = Math.max(0, sourceFile.size - blob.size);
        const savedPercent = sourceFile.size > 0 ? Math.max(0, Math.round((saved / sourceFile.size) * 100)) : 0;

        link.href = outputUrl;
        link.download = filename;
        info.textContent = `${width.toLocaleString()} × ${height.toLocaleString()} px · ${formatBytes(blob.size)} · ${ext.toUpperCase()}`;
        badge.textContent = saved > 0 ? `Saved ${formatBytes(saved)} (${savedPercent}%)` : "No reduction";

        panel.hidden = false;
        status.textContent = "Done";
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, format.value, q);
    } catch (e) {
      button.disabled = false;
      status.textContent = "Something went wrong while compressing.";
    }
  });
});

refreshQualityLabel();
