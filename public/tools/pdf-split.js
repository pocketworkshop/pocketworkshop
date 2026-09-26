const input = document.getElementById("split-input");
const fileName = document.getElementById("split-file-name");
const workspace = document.getElementById("split-workspace");
const fileInfo = document.getElementById("split-file-info");
const pageCountEl = document.getElementById("split-page-count");
const fileSizeEl = document.getElementById("split-file-size");
const pagesInput = document.getElementById("split-pages");
const allButton = document.getElementById("split-all-button");
const extractButton = document.getElementById("split-extract-button");
const everyButton = document.getElementById("split-every-button");
const resetButton = document.getElementById("split-reset-button");
const statusEl = document.getElementById("split-status");
const downloadPanel = document.getElementById("split-download-panel");
const downloadTitle = document.getElementById("split-download-title");
const downloadInfo = document.getElementById("split-download-info");
const downloadButton = document.getElementById("split-download-button");

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
  extractButton.disabled = busy;
  everyButton.disabled = busy;
  allButton.disabled = busy;
  resetButton.disabled = busy;
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
  workspace.hidden = true;
  statusEl.textContent = "";
  hideDownload();
}

function parsePages(value, maxPage) {
  const cleaned = value.trim().replace(/\s+/g, "");
  if (!cleaned) {
    throw new Error("Enter the pages you want to extract.");
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
      throw new Error("Use a format like 1-3,5,8-10.");
    }

    const start = Number(match[1]);
    const end = Number(match[2]);

    if (start < 1 || end < 1 || start > maxPage || end > maxPage) {
      throw new Error(`Page range ${part} is outside this PDF.`);
    }

    if (start > end) {
      throw new Error(`Page range ${part} is backwards.`);
    }

    for (let page = start; page <= end; page++) {
      if (!seen.has(page)) {
        seen.add(page);
        result.push(page);
      }
    }
  }

  if (result.length === 0) {
    throw new Error("No valid pages were selected.");
  }

  return result;
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
    pagesInput.value = sourcePageCount === 1 ? "1" : `1-${sourcePageCount}`;
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

allButton.addEventListener("click", () => {
  if (!sourcePageCount) return;
  pagesInput.value = sourcePageCount === 1 ? "1" : `1-${sourcePageCount}`;
  statusEl.textContent = "";
});

pagesInput.addEventListener("input", () => {
  hideDownload();
  statusEl.textContent = "";
});

extractButton.addEventListener("click", async () => {
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

  statusEl.textContent = "Extracting…";
  setBusy(true);

  try {
    const sourcePdf = await PDFLib.PDFDocument.load(sourceBytes, { ignoreEncryption: false });
    const outputPdf = await PDFLib.PDFDocument.create();

    const zeroBased = selectedPages.map(page => page - 1);
    const copiedPages = await outputPdf.copyPages(sourcePdf, zeroBased);
    copiedPages.forEach(page => outputPdf.addPage(page));

    const outputBytes = await outputPdf.save();
    outputBlob = new Blob([outputBytes], { type: "application/pdf" });
    outputName = `${baseName(sourceFile.name)}-pages.pdf`;

    downloadTitle.textContent = "Your extracted PDF is ready.";
    downloadInfo.textContent =
      `${selectedPages.length} page${selectedPages.length === 1 ? "" : "s"} · ${formatBytes(outputBlob.size)}`;
    downloadButton.textContent = "Download PDF";
    downloadPanel.classList.add("ready");
    statusEl.textContent = "Done";

    downloadPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Could not extract these pages.";
  } finally {
    setBusy(false);
  }
});

everyButton.addEventListener("click", async () => {
  if (!sourceFile || !sourceBytes || !sourcePageCount) {
    statusEl.textContent = "Choose a PDF first.";
    return;
  }

  if (!window.JSZip) {
    statusEl.textContent = "ZIP library failed to load. Please refresh the page.";
    return;
  }

  hideDownload();
  statusEl.textContent = "Splitting pages…";
  setBusy(true);

  try {
    const sourcePdf = await PDFLib.PDFDocument.load(sourceBytes, { ignoreEncryption: false });
    const zip = new JSZip();
    const digits = Math.max(2, String(sourcePageCount).length);

    for (let i = 0; i < sourcePageCount; i++) {
      statusEl.textContent = `Splitting page ${i + 1} of ${sourcePageCount}…`;

      const pagePdf = await PDFLib.PDFDocument.create();
      const [page] = await pagePdf.copyPages(sourcePdf, [i]);
      pagePdf.addPage(page);

      const pageBytes = await pagePdf.save();
      const pageNumber = String(i + 1).padStart(digits, "0");
      zip.file(`page-${pageNumber}.pdf`, pageBytes);
    }

    statusEl.textContent = "Creating ZIP…";
    outputBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });

    outputName = `${baseName(sourceFile.name)}-split-pages.zip`;

    downloadTitle.textContent = "Your split PDFs are ready.";
    downloadInfo.textContent =
      `${sourcePageCount} PDF file${sourcePageCount === 1 ? "" : "s"} in one ZIP · ${formatBytes(outputBlob.size)}`;
    downloadButton.textContent = "Download ZIP";
    downloadPanel.classList.add("ready");
    statusEl.textContent = "Done";

    downloadPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Could not split this PDF.";
  } finally {
    setBusy(false);
  }
});

downloadButton.addEventListener("click", () => {
  if (!outputBlob || !outputName) {
    statusEl.textContent = "Create an output file first.";
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

  // Keep the Blob URL alive long enough for Android browsers to finish the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
});

resetButton.addEventListener("click", resetTool);
