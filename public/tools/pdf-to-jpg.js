(() => {
  const input = document.getElementById("pdfjpg-input");
  const fileName = document.getElementById("pdfjpg-file-name");
  const workspace = document.getElementById("pdfjpg-workspace");
  const infoName = document.getElementById("pdfjpg-info-name");
  const infoPages = document.getElementById("pdfjpg-info-pages");
  const infoSize = document.getElementById("pdfjpg-info-size");
  const pagesInput = document.getElementById("pdfjpg-pages");
  const scaleSelect = document.getElementById("pdfjpg-scale");
  const qualitySelect = document.getElementById("pdfjpg-quality");
  const backgroundSelect = document.getElementById("pdfjpg-background");
  const convertButton = document.getElementById("pdfjpg-convert-button");
  const resetButton = document.getElementById("pdfjpg-reset-button");
  const status = document.getElementById("pdfjpg-status");
  const progress = document.getElementById("pdfjpg-progress");
  const progressBar = document.getElementById("pdfjpg-progress-bar");
  const downloadPanel = document.getElementById("pdfjpg-download-panel");
  const downloadTitle = document.getElementById("pdfjpg-download-title");
  const downloadInfo = document.getElementById("pdfjpg-download-info");
  const downloadButton = document.getElementById("pdfjpg-download-button");

  let selectedFile = null;
  let pdfDocument = null;
  let downloadBlob = null;
  let downloadName = "";

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
  }

  function safeBaseName(name) {
    return (name || "document")
      .replace(/\.pdf$/i, "")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .trim() || "document";
  }

  function canvasToBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create a JPG image."));
      }, "image/jpeg", quality);
    });
  }

  function parsePages(text, totalPages) {
    const value = text.trim();
    if (!value) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const result = [];
    const seen = new Set();

    for (const rawPart of value.split(",")) {
      const part = rawPart.trim();
      if (!part) continue;

      if (/^\d+$/.test(part)) {
        const page = Number(part);
        if (page < 1 || page > totalPages) {
          throw new Error(`Page ${page} is outside this PDF.`);
        }
        if (!seen.has(page)) {
          seen.add(page);
          result.push(page);
        }
        continue;
      }

      const match = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (!match) {
        throw new Error("Use page numbers such as 1-3,5,8.");
      }

      const start = Number(match[1]);
      const end = Number(match[2]);

      if (start < 1 || end < 1 || start > totalPages || end > totalPages || start > end) {
        throw new Error(`Check the page range "${part}".`);
      }

      for (let page = start; page <= end; page += 1) {
        if (!seen.has(page)) {
          seen.add(page);
          result.push(page);
        }
      }
    }

    if (!result.length) {
      throw new Error("Enter at least one valid page.");
    }

    return result;
  }

  function setBusy(busy) {
    convertButton.disabled = busy;
    resetButton.disabled = busy;
    input.disabled = busy;
    pagesInput.disabled = busy;
    scaleSelect.disabled = busy;
    qualitySelect.disabled = busy;
    backgroundSelect.disabled = busy;
  }

  function clearResult() {
    downloadBlob = null;
    downloadName = "";
    downloadPanel.classList.remove("ready");
    downloadInfo.textContent = "";
    progress.hidden = true;
    progressBar.style.width = "0%";
  }

  async function loadPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    return loadingTask.promise;
  }

  input.addEventListener("change", async () => {
    clearResult();
    status.textContent = "";
    pdfDocument = null;
    selectedFile = input.files?.[0] || null;

    if (!selectedFile) {
      fileName.textContent = "No PDF selected";
      workspace.hidden = true;
      return;
    }

    fileName.textContent = selectedFile.name;
    status.textContent = "Reading PDF…";
    workspace.hidden = false;
    infoName.textContent = selectedFile.name;
    infoPages.textContent = "…";
    infoSize.textContent = formatBytes(selectedFile.size);

    try {
      pdfDocument = await loadPdf(selectedFile);
      infoPages.textContent = `${pdfDocument.numPages}`;
      status.textContent = "PDF ready.";
    } catch (error) {
      console.error(error);
      pdfDocument = null;
      infoPages.textContent = "—";
      status.textContent = "Could not open this PDF. It may be damaged or password-protected.";
    }
  });

  convertButton.addEventListener("click", async () => {
    if (!selectedFile || !pdfDocument) {
      status.textContent = "Choose a readable PDF first.";
      return;
    }

    clearResult();

    let pages;
    try {
      pages = parsePages(pagesInput.value, pdfDocument.numPages);
    } catch (error) {
      status.textContent = error.message;
      return;
    }

    const scale = Number(scaleSelect.value);
    const quality = Number(qualitySelect.value);
    const background = backgroundSelect.value === "light" ? "#f3f4f2" : "#ffffff";
    const baseName = safeBaseName(selectedFile.name);

    setBusy(true);
    progress.hidden = false;
    progressBar.style.width = "0%";

    try {
      const files = [];

      for (let index = 0; index < pages.length; index += 1) {
        const pageNumber = pages[index];
        status.textContent = `Converting page ${index + 1} of ${pages.length}…`;

        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { alpha: false });

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        context.save();
        context.fillStyle = background;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.restore();

        await page.render({
          canvasContext: context,
          viewport,
          background
        }).promise;

        const blob = await canvasToBlob(canvas, quality);
        const pageLabel = String(pageNumber).padStart(String(pdfDocument.numPages).length, "0");
        files.push({
          name: `${baseName}-page-${pageLabel}.jpg`,
          blob
        });

        canvas.width = 1;
        canvas.height = 1;

        const percent = Math.round(((index + 1) / pages.length) * 100);
        progressBar.style.width = `${percent}%`;

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (files.length === 1) {
        downloadBlob = files[0].blob;
        downloadName = files[0].name;
        downloadTitle.textContent = "Your JPG file is ready.";
        downloadInfo.textContent = `${downloadName} · ${formatBytes(downloadBlob.size)}`;
      } else {
        status.textContent = "Creating ZIP…";
        const zip = new JSZip();

        for (const file of files) {
          zip.file(file.name, file.blob);
        }

        downloadBlob = await zip.generateAsync(
          { type: "blob", compression: "STORE" },
          (metadata) => {
            status.textContent = `Creating ZIP… ${Math.round(metadata.percent)}%`;
          }
        );

        downloadName = `${baseName}-jpg.zip`;
        downloadTitle.textContent = "Your JPG files are ready.";
        downloadInfo.textContent = `${files.length} JPG files · ${formatBytes(downloadBlob.size)} ZIP`;
      }

      downloadPanel.classList.add("ready");
      status.textContent = "Conversion complete.";
    } catch (error) {
      console.error(error);
      clearResult();
      status.textContent = "Conversion failed. Try fewer pages or a lower resolution.";
    } finally {
      setBusy(false);
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!downloadBlob || !downloadName) return;

    const url = URL.createObjectURL(downloadBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = downloadName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  });

  resetButton.addEventListener("click", () => {
    selectedFile = null;
    pdfDocument = null;
    downloadBlob = null;
    downloadName = "";
    input.value = "";
    pagesInput.value = "";
    scaleSelect.value = "1.5";
    qualitySelect.value = "0.92";
    backgroundSelect.value = "white";
    fileName.textContent = "No PDF selected";
    workspace.hidden = true;
    infoName.textContent = "—";
    infoPages.textContent = "—";
    infoSize.textContent = "—";
    status.textContent = "";
    clearResult();
  });
})();
