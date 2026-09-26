(() => {
  const drop = document.getElementById("fav-drop");
  const fileInput = document.getElementById("fav-file");
  const preview = document.getElementById("fav-preview");
  const previewEmpty = document.getElementById("fav-preview-empty");
  const sourceMeta = document.getElementById("fav-source-meta");

  const fitSelect = document.getElementById("fav-fit");
  const paddingRange = document.getElementById("fav-padding-range");
  const paddingNumber = document.getElementById("fav-padding-number");
  const backgroundColor = document.getElementById("fav-background-color");
  const backgroundText = document.getElementById("fav-background-text");
  const transparent = document.getElementById("fav-transparent");

  const outputIco = document.getElementById("fav-output-ico");
  const outputWeb = document.getElementById("fav-output-web");
  const outputApple = document.getElementById("fav-output-apple");
  const outputAndroid = document.getElementById("fav-output-android");

  const generateButton = document.getElementById("fav-generate");
  const sampleButton = document.getElementById("fav-sample");
  const clearButton = document.getElementById("fav-clear");
  const status = document.getElementById("fav-status");
  const results = document.getElementById("fav-results");
  const snippet = document.getElementById("fav-snippet");
  const copySnippetButton = document.getElementById("fav-copy-snippet");

  let sourceFile = null;
  let sourceImage = null;
  let sourceUrl = "";
  let generatedItems = [];

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function revokeGenerated() {
    generatedItems.forEach(item => {
      if (item.url) URL.revokeObjectURL(item.url);
      if (item.thumbUrl && item.thumbUrl !== item.url) URL.revokeObjectURL(item.thumbUrl);
    });
    generatedItems = [];
  }

  function clearSourceUrl() {
    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
      sourceUrl = "";
    }
  }

  function resetResults() {
    revokeGenerated();
    results.innerHTML = '<div class="fav-empty">Generate icons to see download options here.</div>';
    snippet.value = "";
  }

  function clearAll() {
    sourceFile = null;
    sourceImage = null;
    fileInput.value = "";
    clearSourceUrl();
    resetResults();

    preview.hidden = true;
    preview.removeAttribute("src");
    previewEmpty.hidden = false;
    sourceMeta.textContent = "No image loaded.";

    fitSelect.value = "contain";
    paddingRange.value = "8";
    paddingNumber.value = "8";
    backgroundColor.value = "#ffffff";
    backgroundText.value = "#ffffff";
    transparent.checked = true;

    outputIco.checked = true;
    outputWeb.checked = true;
    outputApple.checked = true;
    outputAndroid.checked = true;

    status.textContent = "";
    status.classList.remove("fav-error");
  }

  function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read this image."));
      img.src = url;
    });
  }

  async function loadFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".svg")) {
      status.textContent = "Choose an image file.";
      status.classList.add("fav-error");
      return;
    }

    clearSourceUrl();
    resetResults();

    try {
      sourceUrl = URL.createObjectURL(file);
      const img = await loadImageFromUrl(sourceUrl);

      sourceFile = file;
      sourceImage = img;

      preview.src = sourceUrl;
      preview.hidden = false;
      previewEmpty.hidden = true;
      sourceMeta.textContent = `${file.name} · ${img.naturalWidth.toLocaleString()} × ${img.naturalHeight.toLocaleString()} px · ${formatBytes(file.size)}`;
      status.textContent = "Image loaded.";
      status.classList.remove("fav-error");
    } catch (error) {
      clearSourceUrl();
      sourceFile = null;
      sourceImage = null;
      status.textContent = error.message || "Could not load this image.";
      status.classList.add("fav-error");
    }
  }

  function syncPadding(fromRange) {
    const raw = fromRange ? paddingRange.value : paddingNumber.value;
    let value = Math.round(Number(raw));
    if (!Number.isFinite(value)) value = 0;
    value = Math.max(0, Math.min(30, value));
    paddingRange.value = String(value);
    paddingNumber.value = String(value);
    resetResults();
  }

  function syncColorFromPicker() {
    backgroundText.value = backgroundColor.value;
    resetResults();
  }

  function syncColorFromText() {
    const value = backgroundText.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      backgroundColor.value = value;
      status.textContent = "";
      status.classList.remove("fav-error");
      resetResults();
    }
  }

  function canvasToBlob(canvas, type = "image/png") {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create the image file."));
      }, type);
    });
  }

  async function renderPng(size) {
    if (!sourceImage) throw new Error("Choose an image first.");

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");

    if (!transparent.checked) {
      const bg = backgroundText.value.trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(bg)) {
        throw new Error("Enter a background color such as #ffffff.");
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
    }

    const padPercent = Math.max(0, Math.min(30, Number(paddingNumber.value) || 0));
    const padding = size * (padPercent / 100);
    const box = Math.max(1, size - padding * 2);

    const sw = sourceImage.naturalWidth || sourceImage.width;
    const sh = sourceImage.naturalHeight || sourceImage.height;

    if (!sw || !sh) throw new Error("Could not read the image dimensions.");

    const scale = fitSelect.value === "cover"
      ? Math.max(box / sw, box / sh)
      : Math.min(box / sw, box / sh);

    const dw = sw * scale;
    const dh = sh * scale;
    const dx = (size - dw) / 2;
    const dy = (size - dh) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sourceImage, dx, dy, dw, dh);

    return canvasToBlob(canvas, "image/png");
  }

  async function buildIco(sizes) {
    const pngBlobs = [];
    for (const size of sizes) {
      pngBlobs.push({ size, blob: await renderPng(size) });
    }

    const buffers = [];
    for (const item of pngBlobs) {
      buffers.push({
        size: item.size,
        bytes: new Uint8Array(await item.blob.arrayBuffer())
      });
    }

    const headerSize = 6;
    const entrySize = 16;
    const directorySize = headerSize + entrySize * buffers.length;
    const totalSize = directorySize + buffers.reduce((sum, item) => sum + item.bytes.length, 0);
    const out = new Uint8Array(totalSize);
    const view = new DataView(out.buffer);

    view.setUint16(0, 0, true);
    view.setUint16(2, 1, true);
    view.setUint16(4, buffers.length, true);

    let imageOffset = directorySize;

    buffers.forEach((item, index) => {
      const offset = headerSize + entrySize * index;
      const sizeByte = item.size >= 256 ? 0 : item.size;

      view.setUint8(offset + 0, sizeByte);
      view.setUint8(offset + 1, sizeByte);
      view.setUint8(offset + 2, 0);
      view.setUint8(offset + 3, 0);
      view.setUint16(offset + 4, 1, true);
      view.setUint16(offset + 6, 32, true);
      view.setUint32(offset + 8, item.bytes.length, true);
      view.setUint32(offset + 12, imageOffset, true);

      out.set(item.bytes, imageOffset);
      imageOffset += item.bytes.length;
    });

    return new Blob([out], { type: "image/x-icon" });
  }

  function createDownloadItem(name, blob, label, dimensions, thumbBlob = blob) {
    const url = URL.createObjectURL(blob);
    const thumbUrl = URL.createObjectURL(thumbBlob);

    const item = { name, blob, label, dimensions, url, thumbUrl };
    generatedItems.push(item);
    return item;
  }

  function renderResultCards() {
    if (!generatedItems.length) {
      results.innerHTML = '<div class="fav-empty">No output files were selected.</div>';
      return;
    }

    results.innerHTML = generatedItems.map((item, index) => `
      <article class="fav-result-card">
        <img class="fav-result-thumb" src="${item.thumbUrl}" alt="${item.name} preview" />
        <div>
          <div class="fav-result-name">${item.name}</div>
          <div class="fav-result-meta">${item.label} · ${item.dimensions} · ${formatBytes(item.blob.size)}</div>
        </div>
        <button type="button" data-download-index="${index}">Download</button>
      </article>
    `).join("");

    results.querySelectorAll("[data-download-index]").forEach(button => {
      button.addEventListener("click", () => {
        const item = generatedItems[Number(button.dataset.downloadIndex)];
        if (!item) return;

        const link = document.createElement("a");
        link.href = item.url;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        status.textContent = `${item.name} downloaded.`;
      });
    });
  }

  function buildSnippet() {
    const lines = [];

    if (outputIco.checked) {
      lines.push('<link rel="icon" href="/favicon.ico" sizes="any">');
    }

    if (outputWeb.checked) {
      lines.push('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">');
      lines.push('<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">');
    }

    if (outputApple.checked) {
      lines.push('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">');
    }

    if (outputAndroid.checked) {
      lines.push('<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">');
      lines.push('<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">');
    }

    snippet.value = lines.join("\n");
  }

  async function generate() {
    status.textContent = "";
    status.classList.remove("fav-error");
    resetResults();

    try {
      if (!sourceImage) throw new Error("Choose an image first.");

      if (![outputIco, outputWeb, outputApple, outputAndroid].some(box => box.checked)) {
        throw new Error("Select at least one output type.");
      }

      if (!transparent.checked && !/^#[0-9a-fA-F]{6}$/.test(backgroundText.value.trim())) {
        throw new Error("Enter a background color such as #ffffff.");
      }

      const sizeCache = new Map();

      const getPng = async size => {
        if (!sizeCache.has(size)) sizeCache.set(size, await renderPng(size));
        return sizeCache.get(size);
      };

      if (outputIco.checked) {
        const ico = await buildIco([16, 32, 48, 64]);
        const thumb = await getPng(64);
        createDownloadItem("favicon.ico", ico, "ICO with 4 sizes", "16 / 32 / 48 / 64 px", thumb);
      }

      if (outputWeb.checked) {
        const png16 = await getPng(16);
        const png32 = await getPng(32);
        createDownloadItem("favicon-16.png", png16, "PNG", "16 × 16 px");
        createDownloadItem("favicon-32.png", png32, "PNG", "32 × 32 px");
      }

      if (outputApple.checked) {
        const png180 = await getPng(180);
        createDownloadItem("apple-touch-icon.png", png180, "Apple Touch Icon", "180 × 180 px");
      }

      if (outputAndroid.checked) {
        const png192 = await getPng(192);
        const png512 = await getPng(512);
        createDownloadItem("icon-192.png", png192, "PNG", "192 × 192 px");
        createDownloadItem("icon-512.png", png512, "PNG", "512 × 512 px");
      }

      renderResultCards();
      buildSnippet();
      status.textContent = `${generatedItems.length} file${generatedItems.length === 1 ? "" : "s"} created.`;
    } catch (error) {
      resetResults();
      status.textContent = error.message || "Could not generate favicons.";
      status.classList.add("fav-error");
    }
  }

  async function copySnippet() {
    if (!snippet.value) {
      status.textContent = "Generate favicons first.";
      return;
    }

    try {
      await navigator.clipboard.writeText(snippet.value);
      status.textContent = "HTML snippet copied.";
    } catch {
      snippet.focus();
      snippet.select();
      try {
        document.execCommand("copy");
        status.textContent = "HTML snippet copied.";
      } catch {
        status.textContent = "Could not copy automatically.";
      }
    }
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

  paddingRange.addEventListener("input", () => syncPadding(true));
  paddingNumber.addEventListener("input", () => syncPadding(false));
  backgroundColor.addEventListener("input", syncColorFromPicker);
  backgroundText.addEventListener("input", syncColorFromText);

  [
    fitSelect, transparent, outputIco, outputWeb, outputApple, outputAndroid
  ].forEach(control => {
    control.addEventListener("change", resetResults);
  });

  generateButton.addEventListener("click", generate);
  copySnippetButton.addEventListener("click", copySnippet);
  clearButton.addEventListener("click", clearAll);

  sampleButton.addEventListener("click", async () => {
    clearSourceUrl();
    resetResults();

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" rx="110" fill="#6d5dfc"/>
      <rect x="108" y="108" width="296" height="296" rx="62" fill="#ffffff"/>
      <path d="M168 196h176v34H168zm0 86h176v34H168z" fill="#6d5dfc"/>
      <circle cx="188" cy="368" r="18" fill="#14b8a6"/>
      <circle cx="256" cy="368" r="18" fill="#14b8a6"/>
      <circle cx="324" cy="368" r="18" fill="#14b8a6"/>
    </svg>`;

    const blob = new Blob([svg], { type: "image/svg+xml" });
    sourceUrl = URL.createObjectURL(blob);

    try {
      const img = await loadImageFromUrl(sourceUrl);
      sourceFile = new File([blob], "pocketworkshop-sample.svg", { type: "image/svg+xml" });
      sourceImage = img;

      preview.src = sourceUrl;
      preview.hidden = false;
      previewEmpty.hidden = true;
      sourceMeta.textContent = `pocketworkshop-sample.svg · ${img.naturalWidth} × ${img.naturalHeight} px`;
      status.textContent = "Sample loaded.";
      status.classList.remove("fav-error");
    } catch {
      status.textContent = "Could not load the sample.";
      status.classList.add("fav-error");
    }
  });

  window.addEventListener("beforeunload", () => {
    clearSourceUrl();
    revokeGenerated();
  });

  clearAll();
})();
