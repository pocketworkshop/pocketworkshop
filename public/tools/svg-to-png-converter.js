(() => {
  const fileTab = document.getElementById("svg-tab-file");
  const codeTab = document.getElementById("svg-tab-code");
  const filePanel = document.getElementById("svg-panel-file");
  const codePanel = document.getElementById("svg-panel-code");

  const drop = document.getElementById("svg-drop");
  const fileInput = document.getElementById("svg-file");
  const codeInput = document.getElementById("svg-code");
  const codeCount = document.getElementById("svg-code-count");

  const widthInput = document.getElementById("svg-width");
  const heightInput = document.getElementById("svg-height");
  const scaleSelect = document.getElementById("svg-scale");
  const backgroundColor = document.getElementById("svg-background-color");
  const backgroundText = document.getElementById("svg-background-text");
  const transparent = document.getElementById("svg-transparent");

  const convertButton = document.getElementById("svg-convert");
  const sampleButton = document.getElementById("svg-sample");
  const resetSizeButton = document.getElementById("svg-reset-size");
  const clearButton = document.getElementById("svg-clear");
  const status = document.getElementById("svg-status");

  const preview = document.getElementById("svg-preview");
  const previewEmpty = document.getElementById("svg-preview-empty");
  const sourceInfo = document.getElementById("svg-source-info");
  const pngSize = document.getElementById("svg-png-size");
  const outputDimensions = document.getElementById("svg-output-dimensions");
  const downloadButton = document.getElementById("svg-download");

  let mode = "file";
  let svgText = "";
  let sourceName = "";
  let detectedWidth = 0;
  let detectedHeight = 0;
  let pngBlob = null;
  let pngObjectUrl = "";

  function setMode(nextMode) {
    mode = nextMode;
    const fileMode = mode === "file";
    filePanel.hidden = !fileMode;
    codePanel.hidden = fileMode;
    fileTab.classList.toggle("is-active", fileMode);
    codeTab.classList.toggle("is-active", !fileMode);
    fileTab.setAttribute("aria-selected", String(fileMode));
    codeTab.setAttribute("aria-selected", String(!fileMode));

    if (!fileMode) {
      sourceName = "Pasted SVG markup";
      svgText = codeInput.value.trim();
      inspectSvg(svgText, sourceName, false);
    }
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function clearPng() {
    pngBlob = null;
    downloadButton.disabled = true;
    pngSize.textContent = "—";
    outputDimensions.textContent = "—";
    preview.hidden = true;
    previewEmpty.hidden = false;

    if (pngObjectUrl) {
      URL.revokeObjectURL(pngObjectUrl);
      pngObjectUrl = "";
    }

    preview.removeAttribute("src");
  }

  function parseLength(value) {
    if (!value) return 0;
    const match = String(value).trim().match(/^([0-9]*\.?[0-9]+)/);
    return match ? Number(match[1]) : 0;
  }

  function parseSvgDimensions(text) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");
    const error = doc.querySelector("parsererror");

    if (error) throw new Error("Invalid SVG markup.");

    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== "svg") {
      throw new Error("The input does not contain a valid SVG root element.");
    }

    let width = parseLength(svg.getAttribute("width"));
    let height = parseLength(svg.getAttribute("height"));

    const viewBox = svg.getAttribute("viewBox");
    if ((!width || !height) && viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite)) {
        if (!width) width = Math.abs(parts[2]);
        if (!height) height = Math.abs(parts[3]);
      }
    }

    if (!width) width = 800;
    if (!height) height = 800;

    return { width, height };
  }

  function inspectSvg(text, name, updateSize = true) {
    clearPng();

    if (!text) {
      svgText = "";
      detectedWidth = 0;
      detectedHeight = 0;
      sourceInfo.textContent = "No SVG loaded";
      return;
    }

    try {
      const dimensions = parseSvgDimensions(text);
      svgText = text;
      sourceName = name || "SVG";
      detectedWidth = Math.round(dimensions.width);
      detectedHeight = Math.round(dimensions.height);

      if (updateSize) {
        widthInput.value = detectedWidth;
        heightInput.value = detectedHeight;
      }

      sourceInfo.textContent = `${sourceName} · ${detectedWidth.toLocaleString()} × ${detectedHeight.toLocaleString()} px`;
      status.textContent = "SVG loaded.";
      status.classList.remove("svg-error");
    } catch (error) {
      svgText = "";
      detectedWidth = 0;
      detectedHeight = 0;
      sourceInfo.textContent = "Could not read SVG";
      status.textContent = error.message || "Could not read this SVG.";
      status.classList.add("svg-error");
    }
  }

  function readFile(file) {
    if (!file) return;

    const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    if (!isSvg) {
      status.textContent = "Choose an SVG file.";
      status.classList.add("svg-error");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      codeInput.value = String(reader.result || "");
      updateCodeCount();
      inspectSvg(codeInput.value, file.name, true);
    };

    reader.onerror = () => {
      status.textContent = "Could not read this SVG file.";
      status.classList.add("svg-error");
    };

    reader.readAsText(file);
  }

  function updateCodeCount() {
    const n = codeInput.value.length;
    codeCount.textContent = `${n.toLocaleString()} ${n === 1 ? "character" : "characters"}`;
  }

  function syncColorFromPicker() {
    backgroundText.value = backgroundColor.value;
  }

  function syncColorFromText() {
    const value = backgroundText.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      backgroundColor.value = value;
      status.textContent = "";
      status.classList.remove("svg-error");
    }
  }

  function getSvgForConversion() {
    if (mode === "code") {
      const value = codeInput.value.trim();
      if (!value) throw new Error("Paste SVG markup first.");
      parseSvgDimensions(value);
      return value;
    }

    if (!svgText) throw new Error("Choose an SVG file first.");
    return svgText;
  }

  function loadSvgAsImage(text) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([text], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("The browser could not render this SVG."));
      };

      img.src = url;
    });
  }

  async function convertToPng() {
    status.textContent = "";
    status.classList.remove("svg-error");
    clearPng();

    try {
      const text = getSvgForConversion();
      const width = Math.round(Number(widthInput.value));
      const height = Math.round(Number(heightInput.value));
      const scale = Number(scaleSelect.value);

      if (!Number.isFinite(width) || width < 1 || width > 12000 ||
          !Number.isFinite(height) || height < 1 || height > 12000) {
        throw new Error("Width and height must be between 1 and 12,000 pixels.");
      }

      const outputWidth = width * scale;
      const outputHeight = height * scale;

      if (outputWidth > 16000 || outputHeight > 16000) {
        throw new Error("The scaled output is too large for many browsers. Reduce the size or scale.");
      }

      const img = await loadSvgAsImage(text);
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");

      if (!transparent.checked) {
        const bg = backgroundText.value.trim();
        if (!/^#[0-9a-fA-F]{6}$/.test(bg)) {
          throw new Error("Enter a background color such as #ffffff.");
        }
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, outputWidth, outputHeight);
      }

      ctx.drawImage(img, 0, 0, outputWidth, outputHeight);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(result => {
          if (result) resolve(result);
          else reject(new Error("Could not create the PNG."));
        }, "image/png");
      });

      pngBlob = blob;
      pngObjectUrl = URL.createObjectURL(blob);
      preview.src = pngObjectUrl;
      preview.hidden = false;
      previewEmpty.hidden = true;
      downloadButton.disabled = false;

      pngSize.textContent = formatBytes(blob.size);
      outputDimensions.textContent = `${outputWidth.toLocaleString()} × ${outputHeight.toLocaleString()} px`;
      status.textContent = "PNG created.";
    } catch (error) {
      status.textContent = error.message || "Could not convert this SVG.";
      status.classList.add("svg-error");
    }
  }

  function useDetectedSize() {
    try {
      const text = mode === "code" ? codeInput.value.trim() : svgText;
      if (!text) throw new Error(mode === "code" ? "Paste SVG markup first." : "Choose an SVG file first.");

      const dimensions = parseSvgDimensions(text);
      detectedWidth = Math.round(dimensions.width);
      detectedHeight = Math.round(dimensions.height);
      widthInput.value = detectedWidth;
      heightInput.value = detectedHeight;
      status.textContent = "SVG size restored.";
      status.classList.remove("svg-error");
    } catch (error) {
      status.textContent = error.message || "Could not read SVG dimensions.";
      status.classList.add("svg-error");
    }
  }

  function resetAll() {
    clearPng();
    svgText = "";
    sourceName = "";
    detectedWidth = 0;
    detectedHeight = 0;
    fileInput.value = "";
    codeInput.value = "";
    updateCodeCount();
    widthInput.value = "800";
    heightInput.value = "800";
    scaleSelect.value = "1";
    backgroundColor.value = "#ffffff";
    backgroundText.value = "#ffffff";
    transparent.checked = true;
    sourceInfo.textContent = "No SVG loaded";
    status.textContent = "";
    status.classList.remove("svg-error");
    setMode("file");
  }

  fileTab.addEventListener("click", () => setMode("file"));
  codeTab.addEventListener("click", () => setMode("code"));

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

  codeInput.addEventListener("input", () => {
    updateCodeCount();
    if (mode === "code") {
      status.textContent = "";
      status.classList.remove("svg-error");
      clearPng();
      sourceInfo.textContent = codeInput.value.trim() ? "Pasted SVG markup" : "No SVG loaded";
    }
  });

  backgroundColor.addEventListener("input", syncColorFromPicker);
  backgroundText.addEventListener("input", syncColorFromText);

  convertButton.addEventListener("click", convertToPng);
  resetSizeButton.addEventListener("click", useDetectedSize);

  sampleButton.addEventListener("click", () => {
    const sample = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="g" x1="0" x2="1">
      <stop offset="0" stop-color="#6d5dfc"/>
      <stop offset="1" stop-color="#14b8a6"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" rx="36" fill="url(#g)"/>
  <circle cx="130" cy="180" r="72" fill="white" opacity=".9"/>
  <text x="235" y="165" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="white">PocketWorkshop</text>
  <text x="237" y="215" font-family="Arial, sans-serif" font-size="24" fill="white" opacity=".85">SVG → PNG</text>
</svg>`;

    setMode("code");
    codeInput.value = sample;
    updateCodeCount();
    inspectSvg(sample, "Sample SVG", true);
  });

  clearButton.addEventListener("click", resetAll);

  downloadButton.addEventListener("click", () => {
    if (!pngBlob || !pngObjectUrl) {
      status.textContent = "Create a PNG first.";
      return;
    }

    const link = document.createElement("a");
    const base = sourceName && sourceName !== "Pasted SVG markup"
      ? sourceName.replace(/\.svg$/i, "")
      : "converted-svg";

    link.href = pngObjectUrl;
    link.download = `${base}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    status.textContent = "PNG downloaded.";
  });

  window.addEventListener("beforeunload", () => {
    if (pngObjectUrl) URL.revokeObjectURL(pngObjectUrl);
  });

  setMode("file");
  updateCodeCount();
})();
