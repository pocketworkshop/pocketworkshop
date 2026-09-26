(() => {
  const input = document.getElementById("organizer-input");
  const fileName = document.getElementById("organizer-file-name");
  const workspace = document.getElementById("organizer-workspace");
  const fileInfo = document.getElementById("organizer-file-info");
  const originalPagesEl = document.getElementById("organizer-original-pages");
  const keptPagesEl = document.getElementById("organizer-kept-pages");
  const grid = document.getElementById("organizer-page-grid");
  const restoreButton = document.getElementById("organizer-restore-button");
  const createButton = document.getElementById("organizer-create-button");
  const resetButton = document.getElementById("organizer-reset-button");
  const statusEl = document.getElementById("organizer-status");
  const downloadPanel = document.getElementById("organizer-download-panel");
  const downloadInfo = document.getElementById("organizer-download-info");
  const downloadButton = document.getElementById("organizer-download-button");

  let sourceFile = null;
  let sourceBytes = null;
  let pageOrder = [];
  let previewCanvases = new Map();
  let outputBlob = null;
  let outputName = "";
  let renderToken = 0;

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function baseName(name) {
    return name.replace(/\.pdf$/i, "") || "document";
  }

  function hideDownload() {
    outputBlob = null;
    outputName = "";
    downloadPanel.classList.remove("ready");
    downloadInfo.textContent = "";
  }

  function setBusy(busy) {
    input.disabled = busy;
    restoreButton.disabled = busy;
    createButton.disabled = busy || pageOrder.length === 0;
    resetButton.disabled = busy;

    grid.querySelectorAll("button").forEach((button) => {
      button.disabled = busy || button.dataset.wasDisabled === "true";
    });
  }

  function updateCounts() {
    keptPagesEl.textContent = `${pageOrder.length}`;
    createButton.disabled = pageOrder.length === 0;
  }

  function cloneCanvas(source) {
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext("2d").drawImage(source, 0, 0);
    return canvas;
  }

  function renderGrid() {
    grid.innerHTML = "";

    pageOrder.forEach((pageIndex, position) => {
      const card = document.createElement("article");
      card.className = "page-card";

      const preview = document.createElement("div");
      preview.className = "page-preview";

      const cached = previewCanvases.get(pageIndex);
      if (cached) {
        preview.appendChild(cloneCanvas(cached));
      } else {
        const loading = document.createElement("span");
        loading.className = "status";
        loading.textContent = "Loading preview…";
        preview.appendChild(loading);
      }

      const body = document.createElement("div");
      body.className = "page-card-body";

      const title = document.createElement("div");
      title.className = "page-card-title";

      const strong = document.createElement("strong");
      strong.textContent = `Page ${pageIndex + 1}`;

      const positionLabel = document.createElement("span");
      positionLabel.textContent = `Position ${position + 1}`;

      title.append(strong, positionLabel);

      const actions = document.createElement("div");
      actions.className = "page-card-actions";

      const up = document.createElement("button");
      up.type = "button";
      up.textContent = "Up";
      up.disabled = position === 0;
      up.dataset.wasDisabled = up.disabled ? "true" : "false";
      up.addEventListener("click", () => movePage(position, position - 1));

      const down = document.createElement("button");
      down.type = "button";
      down.textContent = "Down";
      down.disabled = position === pageOrder.length - 1;
      down.dataset.wasDisabled = down.disabled ? "true" : "false";
      down.addEventListener("click", () => movePage(position, position + 1));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.dataset.wasDisabled = "false";
      remove.addEventListener("click", () => removePage(position));

      actions.append(up, down, remove);
      body.append(title, actions);
      card.append(preview, body);
      grid.appendChild(card);
    });

    updateCounts();
  }

  function movePage(from, to) {
    if (to < 0 || to >= pageOrder.length) return;
    hideDownload();
    const [page] = pageOrder.splice(from, 1);
    pageOrder.splice(to, 0, page);
    statusEl.textContent = "";
    renderGrid();
  }

  function removePage(position) {
    if (position < 0 || position >= pageOrder.length) return;
    hideDownload();
    pageOrder.splice(position, 1);
    statusEl.textContent = pageOrder.length ? "" : "At least one page is required to create a PDF.";
    renderGrid();
  }

  function resetTool() {
    renderToken += 1;
    sourceFile = null;
    sourceBytes = null;
    pageOrder = [];
    previewCanvases = new Map();
    outputBlob = null;
    outputName = "";

    input.value = "";
    fileName.textContent = "No PDF selected";
    fileInfo.textContent = "—";
    originalPagesEl.textContent = "—";
    keptPagesEl.textContent = "—";
    workspace.hidden = true;
    grid.innerHTML = "";
    statusEl.textContent = "";
    hideDownload();
  }

  async function makePreviews(bytes, pageCount, token) {
    if (!window.pdfjsLib) return;

    const pdf = await window.pdfjsLib.getDocument({ data: bytes.slice() }).promise;

    for (let i = 0; i < pageCount; i += 1) {
      if (token !== renderToken) return;

      statusEl.textContent = `Creating preview ${i + 1} of ${pageCount}…`;

      const page = await pdf.getPage(i + 1);
      const baseViewport = page.getViewport({ scale: 1 });
      const maxWidth = 150;
      const scale = Math.min(0.45, maxWidth / baseViewport.width);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));

      const context = canvas.getContext("2d", { alpha: false });
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport,
        background: "#ffffff"
      }).promise;

      previewCanvases.set(i, canvas);
      renderGrid();

      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (token === renderToken) {
      statusEl.textContent = "Ready";
    }
  }

  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;

    if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      statusEl.textContent = "Please choose a PDF file.";
      input.value = "";
      return;
    }

    if (!window.PDFLib || !window.pdfjsLib) {
      statusEl.textContent = "PDF libraries failed to load. Please refresh the page.";
      return;
    }

    renderToken += 1;
    const token = renderToken;

    statusEl.textContent = "Reading PDF…";
    hideDownload();
    setBusy(true);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: false });
      const pageCount = pdf.getPageCount();

      sourceFile = file;
      sourceBytes = bytes;
      pageOrder = Array.from({ length: pageCount }, (_, index) => index);
      previewCanvases = new Map();

      fileName.textContent = file.name;
      fileInfo.textContent = `${file.name} · ${formatBytes(file.size)}`;
      originalPagesEl.textContent = `${pageCount}`;
      keptPagesEl.textContent = `${pageCount}`;
      workspace.hidden = false;
      renderGrid();

      setBusy(false);
      await makePreviews(bytes, pageCount, token);
    } catch (error) {
      console.error(error);
      resetTool();
      statusEl.textContent = "Could not open this PDF. It may be password-protected or damaged.";
    } finally {
      setBusy(false);
    }
  });

  restoreButton.addEventListener("click", () => {
    if (!sourceBytes) return;
    hideDownload();
    const total = Number(originalPagesEl.textContent);
    pageOrder = Array.from({ length: total }, (_, index) => index);
    statusEl.textContent = "Original order restored.";
    renderGrid();
  });

  createButton.addEventListener("click", async () => {
    if (!sourceFile || !sourceBytes) {
      statusEl.textContent = "Choose a PDF first.";
      return;
    }

    if (!pageOrder.length) {
      statusEl.textContent = "Keep at least one page.";
      return;
    }

    hideDownload();
    setBusy(true);
    statusEl.textContent = "Creating organized PDF…";

    try {
      const sourcePdf = await PDFLib.PDFDocument.load(sourceBytes, { ignoreEncryption: false });
      const outputPdf = await PDFLib.PDFDocument.create();
      const copiedPages = await outputPdf.copyPages(sourcePdf, pageOrder);

      copiedPages.forEach((page) => outputPdf.addPage(page));

      const outputBytes = await outputPdf.save();
      outputBlob = new Blob([outputBytes], { type: "application/pdf" });
      outputName = `${baseName(sourceFile.name)}-organized.pdf`;

      downloadInfo.textContent =
        `${pageOrder.length} page${pageOrder.length === 1 ? "" : "s"} · ${formatBytes(outputBlob.size)}`;
      downloadPanel.classList.add("ready");
      statusEl.textContent = "Done";

      downloadPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      console.error(error);
      hideDownload();
      statusEl.textContent = "Could not create the organized PDF.";
    } finally {
      setBusy(false);
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!outputBlob || !outputName) {
      statusEl.textContent = "Create an organized PDF first.";
      return;
    }

    const url = URL.createObjectURL(outputBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = outputName;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  });

  resetButton.addEventListener("click", resetTool);
})();
