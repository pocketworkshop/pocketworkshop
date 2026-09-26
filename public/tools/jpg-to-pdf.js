(() => {
  const input = document.getElementById("jpgpdf-input");
  const fileName = document.getElementById("jpgpdf-file-name");
  const list = document.getElementById("jpgpdf-list");
  const empty = document.getElementById("jpgpdf-empty");
  const count = document.getElementById("jpgpdf-count");
  const totalSize = document.getElementById("jpgpdf-total-size");
  const clearButton = document.getElementById("jpgpdf-clear-button");
  const createButton = document.getElementById("jpgpdf-create-button");
  const downloadButton = document.getElementById("jpgpdf-download-button");
  const status = document.getElementById("jpgpdf-status");
  const pageSizeSelect = document.getElementById("jpgpdf-page-size");
  const marginSelect = document.getElementById("jpgpdf-margin");
  const qualitySelect = document.getElementById("jpgpdf-quality");
  const downloadPanel = document.getElementById("jpgpdf-download-panel");
  const downloadInfo = document.getElementById("jpgpdf-download-info");

  let items = [];
  let pdfBlob = null;

  const A4_PORTRAIT = [595.28, 841.89];
  const A4_LANDSCAPE = [841.89, 595.28];

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
  }

  function clearResult() {
    pdfBlob = null;
    downloadPanel.classList.remove("ready");
    downloadInfo.textContent = "";
  }

  function revokeItem(item) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  }

  async function getImageDimensions(file) {
    const url = URL.createObjectURL(file);

    try {
      const dims = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("Could not read image."));
        img.src = url;
      });

      return { ...dims, previewUrl: url };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  function render() {
    list.innerHTML = "";

    items.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "image-item";

      const thumb = document.createElement("img");
      thumb.className = "image-thumb";
      thumb.src = item.previewUrl;
      thumb.alt = "";

      const meta = document.createElement("div");
      meta.className = "image-meta";

      const name = document.createElement("span");
      name.className = "image-name";
      name.textContent = item.file.name;

      const details = document.createElement("span");
      details.className = "image-details";
      details.textContent = `${item.width} × ${item.height} · ${formatBytes(item.file.size)}`;

      meta.append(name, details);

      const buttons = document.createElement("div");
      buttons.className = "image-buttons";

      const up = document.createElement("button");
      up.type = "button";
      up.textContent = "Up";
      up.disabled = index === 0;
      up.addEventListener("click", () => moveItem(index, index - 1));

      const down = document.createElement("button");
      down.type = "button";
      down.textContent = "Down";
      down.disabled = index === items.length - 1;
      down.addEventListener("click", () => moveItem(index, index + 1));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => removeItem(index));

      buttons.append(up, down, remove);
      li.append(thumb, meta, buttons);
      list.appendChild(li);
    });

    const total = items.reduce((sum, item) => sum + item.file.size, 0);
    count.textContent = `${items.length} ${items.length === 1 ? "image" : "images"}`;
    totalSize.textContent = `${formatBytes(total)} total`;
    fileName.textContent = items.length
      ? `${items.length} ${items.length === 1 ? "image selected" : "images selected"}`
      : "No images selected";

    empty.hidden = items.length > 0;
    createButton.disabled = items.length === 0;
  }

  function moveItem(from, to) {
    if (to < 0 || to >= items.length) return;
    clearResult();
    const [item] = items.splice(from, 1);
    items.splice(to, 0, item);
    render();
  }

  function removeItem(index) {
    clearResult();
    const [removed] = items.splice(index, 1);
    if (removed) revokeItem(removed);
    render();
  }

  async function addFiles(files) {
    clearResult();
    status.textContent = "Reading images…";

    for (const file of files) {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) continue;

      try {
        const info = await getImageDimensions(file);
        items.push({
          file,
          width: info.width,
          height: info.height,
          previewUrl: info.previewUrl
        });
      } catch (error) {
        console.error(error);
      }
    }

    status.textContent = items.length ? "Images ready." : "Choose JPG, PNG or WebP images.";
    render();
    input.value = "";
  }

  function loadImage(item) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not read ${item.file.name}`));
      img.src = item.previewUrl;
    });
  }

  function canvasToJpegBytes(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error("Could not prepare an image for the PDF."));
          return;
        }
        try {
          resolve(new Uint8Array(await blob.arrayBuffer()));
        } catch (error) {
          reject(error);
        }
      }, "image/jpeg", quality);
    });
  }

  async function normalizeImage(item, quality) {
    const img = await loadImage(item);

    // Keep mobile memory usage reasonable while retaining enough detail for PDFs.
    const maxSide = 3000;
    const ratio = Math.min(1, maxSide / Math.max(item.width, item.height));
    const width = Math.max(1, Math.round(item.width * ratio));
    const height = Math.max(1, Math.round(item.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const bytes = await canvasToJpegBytes(canvas, quality);

    canvas.width = 1;
    canvas.height = 1;

    return { bytes, width, height };
  }

  function pageDimensions(imageWidth, imageHeight, mode) {
    if (mode === "fit") {
      let width = imageWidth * 0.75;
      let height = imageHeight * 0.75;

      const longest = Math.max(width, height);
      if (longest > 1000) {
        const ratio = 1000 / longest;
        width *= ratio;
        height *= ratio;
      }

      return [Math.max(72, width), Math.max(72, height)];
    }

    return imageWidth >= imageHeight ? A4_LANDSCAPE : A4_PORTRAIT;
  }

  input.addEventListener("change", () => {
    const files = Array.from(input.files || []);
    if (files.length) addFiles(files);
  });

  clearButton.addEventListener("click", () => {
    items.forEach(revokeItem);
    items = [];
    clearResult();
    status.textContent = "";
    input.value = "";
    render();
  });

  createButton.addEventListener("click", async () => {
    if (!items.length) return;

    clearResult();
    createButton.disabled = true;
    clearButton.disabled = true;
    status.textContent = "Creating PDF…";

    try {
      const pdfDoc = await PDFLib.PDFDocument.create();
      const margin = Number(marginSelect.value);
      const quality = Number(qualitySelect.value);
      const mode = pageSizeSelect.value;

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        status.textContent = `Processing image ${index + 1} of ${items.length}…`;

        const normalized = await normalizeImage(item, quality);
        const jpg = await pdfDoc.embedJpg(normalized.bytes);

        const [pageWidth, pageHeight] = pageDimensions(normalized.width, normalized.height, mode);
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        const availableWidth = Math.max(1, pageWidth - margin * 2);
        const availableHeight = Math.max(1, pageHeight - margin * 2);
        const scale = Math.min(
          availableWidth / normalized.width,
          availableHeight / normalized.height
        );

        const drawWidth = normalized.width * scale;
        const drawHeight = normalized.height * scale;
        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        page.drawImage(jpg, {
          x,
          y,
          width: drawWidth,
          height: drawHeight
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      status.textContent = "Finishing PDF…";
      const bytes = await pdfDoc.save();
      pdfBlob = new Blob([bytes], { type: "application/pdf" });

      downloadInfo.textContent = `${items.length} ${items.length === 1 ? "page" : "pages"} · ${formatBytes(pdfBlob.size)}`;
      downloadPanel.classList.add("ready");
      status.textContent = "PDF ready.";
    } catch (error) {
      console.error(error);
      clearResult();
      status.textContent = "Could not create the PDF. Try fewer or smaller images.";
    } finally {
      createButton.disabled = items.length === 0;
      clearButton.disabled = false;
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!pdfBlob) return;

    const url = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "images.pdf";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  });

  window.addEventListener("beforeunload", () => {
    items.forEach(revokeItem);
  });

  render();
})();
