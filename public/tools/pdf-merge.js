const input = document.getElementById("pdf-input");
const fileName = document.getElementById("pdf-file-name");
const list = document.getElementById("pdf-list");
const empty = document.getElementById("pdf-empty");
const countEl = document.getElementById("pdf-count");
const totalSizeEl = document.getElementById("pdf-total-size");
const clearButton = document.getElementById("pdf-clear-button");
const mergeButton = document.getElementById("pdf-merge-button");
const statusEl = document.getElementById("pdf-status");
const downloadPanel = document.getElementById("pdf-download-panel");
const downloadLink = document.getElementById("pdf-download-link");
const downloadInfo = document.getElementById("pdf-download-info");

let files = [];
let outputUrl = "";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function revokeOutputUrl() {
  if (outputUrl) {
    URL.revokeObjectURL(outputUrl);
    outputUrl = "";
  }
}

function updateSummary() {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  countEl.textContent = `${files.length} file${files.length === 1 ? "" : "s"}`;
  totalSizeEl.textContent = `${formatBytes(totalSize)} total`;

  if (files.length === 0) {
    fileName.textContent = "No PDF files selected";
    empty.hidden = false;
  } else {
    fileName.textContent = `${files.length} PDF file${files.length === 1 ? "" : "s"} selected`;
    empty.hidden = true;
  }

  mergeButton.disabled = files.length < 2;
}

function renderList() {
  list.innerHTML = "";

  files.forEach((file, index) => {
    const item = document.createElement("li");
    item.className = "pdf-item";

    const meta = document.createElement("div");
    meta.className = "pdf-meta";

    const name = document.createElement("span");
    name.className = "pdf-name";
    name.textContent = `${index + 1}. ${file.name}`;

    const size = document.createElement("span");
    size.className = "pdf-size";
    size.textContent = formatBytes(file.size);

    meta.appendChild(name);
    meta.appendChild(size);

    const buttons = document.createElement("div");
    buttons.className = "pdf-buttons";

    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "Up";
    up.disabled = index === 0;
    up.addEventListener("click", () => moveFile(index, index - 1));

    const down = document.createElement("button");
    down.type = "button";
    down.textContent = "Down";
    down.disabled = index === files.length - 1;
    down.addEventListener("click", () => moveFile(index, index + 1));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => removeFile(index));

    buttons.appendChild(up);
    buttons.appendChild(down);
    buttons.appendChild(remove);

    item.appendChild(meta);
    item.appendChild(buttons);
    list.appendChild(item);
  });

  updateSummary();
}

function moveFile(from, to) {
  if (to < 0 || to >= files.length) return;
  const copy = [...files];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  files = copy;
  renderList();
}

function removeFile(index) {
  files.splice(index, 1);
  revokeOutputUrl();
  downloadPanel.hidden = true;
  statusEl.textContent = "";
  renderList();
}

function clearFiles() {
  files = [];
  input.value = "";
  revokeOutputUrl();
  downloadPanel.hidden = true;
  statusEl.textContent = "";
  renderList();
}

input.addEventListener("change", () => {
  const selected = Array.from(input.files || []);
  const valid = selected.filter(file => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));

  if (valid.length === 0) {
    statusEl.textContent = "Please choose PDF files.";
    return;
  }

  files = [...files, ...valid];
  revokeOutputUrl();
  downloadPanel.hidden = true;
  statusEl.textContent = "";
  renderList();
  input.value = "";
});

clearButton.addEventListener("click", clearFiles);

mergeButton.addEventListener("click", async () => {
  if (files.length < 2) {
    statusEl.textContent = "Choose at least two PDF files.";
    return;
  }

  if (!window.PDFLib) {
    statusEl.textContent = "PDF library failed to load. Please refresh the page.";
    return;
  }

  statusEl.textContent = "Merging…";
  mergeButton.disabled = true;

  try {
    const mergedPdf = await PDFLib.PDFDocument.create();

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const sourcePdf = await PDFLib.PDFDocument.load(bytes);
      const pageIndices = sourcePdf.getPageIndices();
      const pages = await mergedPdf.copyPages(sourcePdf, pageIndices);

      pages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();
    const blob = new Blob([mergedBytes], { type: "application/pdf" });

    revokeOutputUrl();
    outputUrl = URL.createObjectURL(blob);

    downloadLink.href = outputUrl;
    downloadLink.download = "merged.pdf";
    downloadInfo.textContent = `${files.length} files merged · ${formatBytes(blob.size)}`;

    downloadPanel.hidden = false;
    statusEl.textContent = "Done";
    downloadPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Could not merge these PDF files.";
  } finally {
    mergeButton.disabled = files.length < 2;
  }
});

renderList();
