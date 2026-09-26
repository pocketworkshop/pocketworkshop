(() => {
  const drop = document.getElementById("wm-drop");
  const fileInput = document.getElementById("wm-file");
  const textInput = document.getElementById("wm-text");
  const sizeRange = document.getElementById("wm-size-range");
  const sizeNumber = document.getElementById("wm-size-number");
  const opacityRange = document.getElementById("wm-opacity-range");
  const opacityNumber = document.getElementById("wm-opacity-number");
  const colorPicker = document.getElementById("wm-color-picker");
  const colorText = document.getElementById("wm-color-text");
  const rotation = document.getElementById("wm-rotation");
  const marginInput = document.getElementById("wm-margin");
  const formatSelect = document.getElementById("wm-format");
  const qualityRange = document.getElementById("wm-quality");
  const qualityNumber = document.getElementById("wm-quality-number");

  const generateButton = document.getElementById("wm-generate");
  const downloadButton = document.getElementById("wm-download");
  const sampleButton = document.getElementById("wm-sample");
  const clearButton = document.getElementById("wm-clear");
  const status = document.getElementById("wm-status");

  const preview = document.getElementById("wm-preview");
  const previewEmpty = document.getElementById("wm-preview-empty");
  const meta = document.getElementById("wm-meta");
  const positionButtons = Array.from(document.querySelectorAll("[data-position]"));

  let sourceFile = null;
  let sourceImage = null;
  let sourceObjectUrl = "";
  let resultBlob = null;
  let resultObjectUrl = "";
  let activePosition = "bottom-right";

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function clearResult() {
    resultBlob = null;
    downloadButton.disabled = true;
    if (resultObjectUrl) {
      URL.revokeObjectURL(resultObjectUrl);
      resultObjectUrl = "";
    }

    if (sourceObjectUrl && sourceImage) {
      preview.src = sourceObjectUrl;
      preview.hidden = false;
      previewEmpty.hidden = true;
    }
  }

  function clearSource() {
    if (sourceObjectUrl) {
      URL.revokeObjectURL(sourceObjectUrl);
      sourceObjectUrl = "";
    }
    sourceFile = null;
    sourceImage = null;
  }

  function syncPair(range, number, min, max) {
    let value = Number(number.value);
    if (!Number.isFinite(value)) value = Number(range.value);
    value = Math.max(min, Math.min(max, Math.round(value)));
    range.value = String(value);
    number.value = String(value);
    clearResult();
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read this image."));
      img.src = url;
    });
  }

  async function loadFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      status.textContent = "Choose an image file.";
      status.classList.add("wm-error");
      return;
    }

    clearSource();
    clearResult();

    try {
      sourceObjectUrl = URL.createObjectURL(file);
      const img = await loadImage(sourceObjectUrl);
      sourceFile = file;
      sourceImage = img;

      preview.src = sourceObjectUrl;
      preview.hidden = false;
      previewEmpty.hidden = true;
      meta.textContent = `${file.name} · ${img.naturalWidth.toLocaleString()} × ${img.naturalHeight.toLocaleString()} px · ${formatBytes(file.size)}`;
      status.textContent = "Image loaded.";
      status.classList.remove("wm-error");
    } catch (error) {
      clearSource();
      preview.hidden = true;
      previewEmpty.hidden = false;
      meta.textContent = "No image loaded.";
      status.textContent = error.message || "Could not load this image.";
      status.classList.add("wm-error");
    }
  }

  function drawWatermark(ctx, canvas, text) {
    const fontSize = Math.max(10, Math.min(160, Number(sizeNumber.value) || 42));
    const opacity = Math.max(5, Math.min(100, Number(opacityNumber.value) || 55)) / 100;
    const angle = Number(rotation.value) * Math.PI / 180;
    const margin = Math.max(0, Math.min(500, Number(marginInput.value) || 0));

    ctx.save();
    ctx.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.globalAlpha = opacity;
    ctx.fillStyle = colorText.value.trim();

    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.2;

    let x = canvas.width / 2;
    let y = canvas.height / 2;

    const halfW = textWidth / 2;
    const halfH = textHeight / 2;

    const leftX = margin + halfW;
    const centerX = canvas.width / 2;
    const rightX = canvas.width - margin - halfW;
    const topY = margin + halfH;
    const middleY = canvas.height / 2;
    const bottomY = canvas.height - margin - halfH;

    const map = {
      "top-left": [leftX, topY],
      "top-center": [centerX, topY],
      "top-right": [rightX, topY],
      "middle-left": [leftX, middleY],
      "center": [centerX, middleY],
      "middle-right": [rightX, middleY],
      "bottom-left": [leftX, bottomY],
      "bottom-center": [centerX, bottomY],
      "bottom-right": [rightX, bottomY]
    };

    [x, y] = map[activePosition] || map["bottom-right"];

    x = Math.max(0, Math.min(canvas.width, x));
    y = Math.max(0, Math.min(canvas.height, y));

    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = Math.max(1, fontSize * 0.08);
    ctx.shadowOffsetX = Math.max(1, fontSize * 0.03);
    ctx.shadowOffsetY = Math.max(1, fontSize * 0.03);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  async function render() {
    status.textContent = "";
    status.classList.remove("wm-error");

    try {
      if (!sourceImage) throw new Error("Choose an image first.");

      const text = textInput.value.trim();
      if (!text) throw new Error("Enter watermark text.");

      if (!/^#[0-9a-fA-F]{6}$/.test(colorText.value.trim())) {
        throw new Error("Enter a text color such as #ffffff.");
      }

      const canvas = document.createElement("canvas");
      canvas.width = sourceImage.naturalWidth;
      canvas.height = sourceImage.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");

      if (formatSelect.value === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(sourceImage, 0, 0);
      drawWatermark(ctx, canvas, text);

      const quality = Math.max(40, Math.min(100, Number(qualityNumber.value) || 92)) / 100;
      const mime = formatSelect.value;

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(result => {
          if (result) resolve(result);
          else reject(new Error("Could not create the output image."));
        }, mime, quality);
      });

      clearResult();
      resultBlob = blob;
      resultObjectUrl = URL.createObjectURL(blob);

      preview.src = resultObjectUrl;
      preview.hidden = false;
      previewEmpty.hidden = true;
      downloadButton.disabled = false;

      meta.textContent = `${canvas.width.toLocaleString()} × ${canvas.height.toLocaleString()} px · ${formatBytes(blob.size)}`;
      status.textContent = "Watermark applied.";
    } catch (error) {
      status.textContent = error.message || "Could not apply the watermark.";
      status.classList.add("wm-error");
    }
  }

  function extensionForMime(mime) {
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    return "jpg";
  }

  fileInput.addEventListener("change", () => {
    loadFile(fileInput.files && fileInput.files[0]);
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
    loadFile(file);
  });

  sizeRange.addEventListener("input", () => {
    sizeNumber.value = sizeRange.value;
    clearResult();
  });
  sizeNumber.addEventListener("input", () => syncPair(sizeRange, sizeNumber, 10, 160));

  opacityRange.addEventListener("input", () => {
    opacityNumber.value = opacityRange.value;
    clearResult();
  });
  opacityNumber.addEventListener("input", () => syncPair(opacityRange, opacityNumber, 5, 100));

  qualityRange.addEventListener("input", () => {
    qualityNumber.value = qualityRange.value;
    clearResult();
  });
  qualityNumber.addEventListener("input", () => syncPair(qualityRange, qualityNumber, 40, 100));

  colorPicker.addEventListener("input", () => {
    colorText.value = colorPicker.value;
    clearResult();
  });

  colorText.addEventListener("input", () => {
    const value = colorText.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) colorPicker.value = value;
    clearResult();
  });

  [
    textInput, rotation, marginInput, formatSelect
  ].forEach(control => {
    control.addEventListener("input", clearResult);
    control.addEventListener("change", clearResult);
  });

  positionButtons.forEach(button => {
    button.addEventListener("click", () => {
      activePosition = button.dataset.position;
      positionButtons.forEach(item => item.classList.toggle("is-active", item === button));
      clearResult();
    });
  });

  generateButton.addEventListener("click", render);

  downloadButton.addEventListener("click", () => {
    if (!resultBlob || !resultObjectUrl) {
      status.textContent = "Apply the watermark first.";
      return;
    }

    const ext = extensionForMime(formatSelect.value);
    const base = sourceFile ? sourceFile.name.replace(/\.[^.]+$/, "") : "watermarked-image";
    const link = document.createElement("a");
    link.href = resultObjectUrl;
    link.download = `${base}-watermarked.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    status.textContent = "Image downloaded.";
  });

  sampleButton.addEventListener("click", async () => {
    clearSource();
    clearResult();

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
    gradient.addColorStop(0, "#6d5dfc");
    gradient.addColorStop(1, "#14b8a6");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 800);

    ctx.fillStyle = "rgba(255,255,255,.16)";
    ctx.beginPath();
    ctx.arc(260, 260, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 72px Arial, sans-serif";
    ctx.fillText("PocketWorkshop", 120, 620);
    ctx.font = "36px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.82)";
    ctx.fillText("Sample image", 122, 675);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    sourceObjectUrl = URL.createObjectURL(blob);

    try {
      const img = await loadImage(sourceObjectUrl);
      sourceFile = new File([blob], "sample-image.png", { type: "image/png" });
      sourceImage = img;

      preview.src = sourceObjectUrl;
      preview.hidden = false;
      previewEmpty.hidden = true;
      meta.textContent = `sample-image.png · 1200 × 800 px · ${formatBytes(blob.size)}`;
      status.textContent = "Sample loaded.";
      status.classList.remove("wm-error");
    } catch {
      status.textContent = "Could not load the sample.";
      status.classList.add("wm-error");
    }
  });

  clearButton.addEventListener("click", () => {
    clearSource();
    clearResult();
    fileInput.value = "";
    preview.hidden = true;
    preview.removeAttribute("src");
    previewEmpty.hidden = false;
    meta.textContent = "No image loaded.";
    textInput.value = "© PocketWorkshop";
    sizeRange.value = sizeNumber.value = "42";
    opacityRange.value = opacityNumber.value = "55";
    colorPicker.value = colorText.value = "#ffffff";
    rotation.value = "0";
    marginInput.value = "24";
    formatSelect.value = "image/jpeg";
    qualityRange.value = qualityNumber.value = "92";
    activePosition = "bottom-right";
    positionButtons.forEach(button => {
      button.classList.toggle("is-active", button.dataset.position === activePosition);
    });
    status.textContent = "";
    status.classList.remove("wm-error");
  });

  window.addEventListener("beforeunload", () => {
    clearSource();
    clearResult();
  });
})();
