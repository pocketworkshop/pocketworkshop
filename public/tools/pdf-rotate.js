(() => {
  const input = document.getElementById("rotate-input");
  const fileName = document.getElementById("rotate-file-name");
  const workspace = document.getElementById("rotate-workspace");
  const fileInfo = document.getElementById("rotate-file-info");
  const pageCountEl = document.getElementById("rotate-page-count");
  const fileSizeEl = document.getElementById("rotate-file-size");
  const pagesInput = document.getElementById("rotate-pages");
  const angleSelect = document.getElementById("rotate-angle");
  const rotateButton = document.getElementById("rotate-button");
  const resetButton = document.getElementById("rotate-reset-button");
  const statusEl = document.getElementById("rotate-status");
  const downloadPanel = document.getElementById("rotate-download-panel");
  const downloadInfo = document.getElementById("rotate-download-info");
  const downloadButton = document.getElementById("rotate-download-button");

  let sourceFile = null;
  let sourceBytes = null;
  let sourcePageCount = 0;
  let outputBlob = null;
  let outputName = "";

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
    rotateButton.disabled = busy;
    resetButton.disabled = busy;
    input.disabled = busy;
    pagesInput.disabled = busy;
    angleSelect.disabled = busy;
  }

  function resetTool() {
    sourceFile = null;
    sourceBytes = null;
    sourcePageCount = 0;
    outputBlob = null;
    outputName = "";

    input.value = "";
    fileName.textContent = "No PDF selected";
    fileInfo.textContent = "—";
    pageCountEl.textContent = "—";
    fileSizeEl.textContent = "—";
    pagesInput.value = "";
    angleSelect.value = "90";
    workspace.hidden = true;
    statusEl.textContent = "";
    hideDownload();
  }

  function parsePages(value, maxPage) {
    const cleaned = value.trim().replace(/\s+/g, "");

    if (!cleaned) {
      return Array.from({ length: maxPage }, (_, index) => index + 1);
    }

    const result = [];
    const seen = new Set();

    for (const part of cleaned.split(",")) {
      if (!part) {
        throw new Error("Check the page list format.");
      }

      if (/^\d+$/.test(part)) {
        const page = Number(part);

        if (page < 1 || page > maxPage) {
          throw new Error(`Page ${page} is outside this PDF.`);
        }

        if (!seen.has(page)) {
          seen.add(page);
          result.push(page);
        }

        continue;
      }

      const match = part.match(/^(\d+)-(\d+)$/);

      if (!match) {
        throw new Error("Use a format like 1-3,5,8.");
      }

      const start = Number(match[1]);
      const end = Number(match[2]);

      if (start < 1 || end < 1 || start > maxPage || end > maxPage) {
        throw new Error(`Page range ${part} is outside this PDF.`);
      }

      if (start > end) {
        throw new Error(`Page range ${part} is backwards.`);
      }

      for (let page = start; page <= end; page += 1) {
        if (!seen.has(page)) {
          seen.add(page);
          result.push(page);
        }
      }
    }

    if (!result.length) {
      throw new Error("No valid pages were selected.");
    }

    return result;
  }

  function normalizedAngle(angle) {
    return ((angle % 360) + 360) % 360;
  }

  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;

    if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      statusEl.textContent = "Please choose a PDF file.";
      input.value = "";
      return;
    }

    if (!window.PDFLib) {
      statusEl.textContent = "PDF library failed to load. Please refresh the page.";
      return;
    }

    statusEl.textContent = "Reading PDF…";
    hideDownload();
    setBusy(true);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: false });

      sourceFile = file;
      sourceBytes = bytes;
      sourcePageCount = pdf.getPageCount();

      fileName.textContent = file.name;
      fileInfo.textContent = file.name;
      pageCountEl.textContent = `${sourcePageCount}`;
      fileSizeEl.textContent = formatBytes(file.size);
      pagesInput.value = "";
      workspace.hidden = false;
      statusEl.textContent = "Ready";
    } catch (error) {
      console.error(error);
      resetTool();
      statusEl.textContent = "Could not open this PDF. It may be password-protected or damaged.";
    } finally {
      setBusy(false);
    }
  });

  pagesInput.addEventListener("input", () => {
    hideDownload();
    statusEl.textContent = "";
  });

  angleSelect.addEventListener("change", () => {
    hideDownload();
    statusEl.textContent = "";
  });

  rotateButton.addEventListener("click", async () => {
    if (!sourceFile || !sourceBytes || !sourcePageCount) {
      statusEl.textContent = "Choose a PDF first.";
      return;
    }

    hideDownload();

    let selectedPages;
    try {
      selectedPages = parsePages(pagesInput.value, sourcePageCount);
    } catch (error) {
      statusEl.textContent = error.message;
      return;
    }

    const rotationToAdd = Number(angleSelect.value);
    statusEl.textContent = "Rotating pages…";
    setBusy(true);

    try {
      const pdf = await PDFLib.PDFDocument.load(sourceBytes, { ignoreEncryption: false });

      selectedPages.forEach((pageNumber) => {
        const page = pdf.getPage(pageNumber - 1);
        const currentRotation = page.getRotation().angle || 0;
        page.setRotation(PDFLib.degrees(normalizedAngle(currentRotation + rotationToAdd)));
      });

      const outputBytes = await pdf.save();
      outputBlob = new Blob([outputBytes], { type: "application/pdf" });
      outputName = `${baseName(sourceFile.name)}-rotated.pdf`;

      downloadInfo.textContent =
        `${selectedPages.length} page${selectedPages.length === 1 ? "" : "s"} rotated · ${formatBytes(outputBlob.size)}`;

      downloadPanel.classList.add("ready");
      statusEl.textContent = "Done";

      downloadPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      console.error(error);
      hideDownload();
      statusEl.textContent = "Could not rotate this PDF.";
    } finally {
      setBusy(false);
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!outputBlob || !outputName) {
      statusEl.textContent = "Create the rotated PDF first.";
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
