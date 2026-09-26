(() => {
  const input = document.getElementById("ifc-file-input");
  const drop = document.getElementById("ifc-drop");
  const formatSelect = document.getElementById("ifc-format");
  const qualityRange = document.getElementById("ifc-quality-range");
  const qualityNumber = document.getElementById("ifc-quality-number");
  const backgroundSelect = document.getElementById("ifc-background");
  const list = document.getElementById("ifc-list");
  const convertAllButton = document.getElementById("ifc-convert-all");
  const clearButton = document.getElementById("ifc-clear");
  const status = document.getElementById("ifc-status");
  const summary = document.getElementById("ifc-summary");

  const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const items = [];

  function setSuccess(message) {
    status.className = "status";
    status.textContent = message;
  }

  function setError(message) {
    status.className = "status ifc-error";
    status.textContent = message;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function extensionFor(type) {
    if (type === "image/jpeg") return "jpg";
    if (type === "image/png") return "png";
    return "webp";
  }

  function mimeLabel(type) {
    if (type === "image/jpeg") return "JPG";
    if (type === "image/png") return "PNG";
    return "WebP";
  }

  function baseName(name) {
    return name.replace(/\.[^.]+$/, "") || "converted-image";
  }

  function syncQuality(value) {
    const clean = Math.min(100, Math.max(10, Number(value) || 90));
    qualityRange.value = String(clean);
    qualityNumber.value = String(clean);
  }

  function createImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        resolve({ image, url });
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Could not read ${file.name}.`));
      };

      image.src = url;
    });
  }

  async function addFiles(files) {
    const valid = Array.from(files).filter((file) => supportedTypes.has(file.type));

    if (!valid.length) {
      setError("Choose JPG, PNG or WebP images.");
      return;
    }

    for (const file of valid) {
      try {
        const { image, url } = await createImageFromFile(file);

        items.push({
          file,
          image,
          url,
          width: image.naturalWidth,
          height: image.naturalHeight
        });
      } catch (error) {
        setError(error.message);
      }
    }

    renderList();
    setSuccess(`${valid.length} ${valid.length === 1 ? "image" : "images"} added.`);
  }

  function renderList() {
    if (!items.length) {
      list.innerHTML = '<div class="ifc-empty">No images selected yet.</div>';
      summary.textContent = "";
      return;
    }

    list.innerHTML = "";

    let totalSize = 0;

    items.forEach((item, index) => {
      totalSize += item.file.size;

      const row = document.createElement("div");
      row.className = "ifc-item";

      const thumb = document.createElement("img");
      thumb.className = "ifc-thumb";
      thumb.src = item.url;
      thumb.alt = "";

      const info = document.createElement("div");
      const name = document.createElement("div");
      name.className = "ifc-name";
      name.textContent = item.file.name;

      const meta = document.createElement("div");
      meta.className = "ifc-meta";
      meta.textContent = `${mimeLabel(item.file.type)} · ${item.width} × ${item.height} · ${formatBytes(item.file.size)}`;

      info.append(name, meta);

      const actions = document.createElement("div");
      actions.className = "ifc-item-actions";

      const convertButton = document.createElement("button");
      convertButton.type = "button";
      convertButton.textContent = "Convert";
      convertButton.addEventListener("click", () => convertOne(index));

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => removeItem(index));

      actions.append(convertButton, removeButton);
      row.append(thumb, info, actions);
      list.appendChild(row);
    });

    summary.textContent = `${items.length.toLocaleString()} ${items.length === 1 ? "image" : "images"} · ${formatBytes(totalSize)}`;
  }

  function removeItem(index) {
    const [item] = items.splice(index, 1);
    if (item) URL.revokeObjectURL(item.url);
    renderList();
    setSuccess("Image removed.");
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error(`${mimeLabel(type)} output is not supported by this browser.`));
            return;
          }
          resolve(blob);
        },
        type,
        quality
      );
    });
  }

  async function convertItem(item) {
    const type = formatSelect.value;
    const quality = Math.min(1, Math.max(0.1, Number(qualityNumber.value) / 100));

    const canvas = document.createElement("canvas");
    canvas.width = item.width;
    canvas.height = item.height;

    const context = canvas.getContext("2d", { alpha: type !== "image/jpeg" });

    if (type === "image/jpeg") {
      context.fillStyle = backgroundSelect.value;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(item.image, 0, 0, item.width, item.height);

    return canvasToBlob(canvas, type, type === "image/png" ? undefined : quality);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function convertOne(index) {
    const item = items[index];

    if (!item) return;

    try {
      const blob = await convertItem(item);
      const extension = extensionFor(formatSelect.value);
      downloadBlob(blob, `${baseName(item.file.name)}.${extension}`);
      setSuccess(`Converted ${item.file.name} · ${formatBytes(blob.size)}.`);
    } catch (error) {
      setError(error.message || "Could not convert this image.");
    }
  }

  async function convertAll() {
    if (!items.length) {
      setError("Choose at least one image first.");
      return;
    }

    convertAllButton.disabled = true;
    let completed = 0;

    try {
      for (const item of items) {
        const blob = await convertItem(item);
        const extension = extensionFor(formatSelect.value);
        downloadBlob(blob, `${baseName(item.file.name)}.${extension}`);
        completed += 1;
        setSuccess(`Converted ${completed} of ${items.length}...`);
        await new Promise((resolve) => setTimeout(resolve, 180));
      }

      setSuccess(`Converted ${completed} ${completed === 1 ? "image" : "images"}.`);
    } catch (error) {
      setError(error.message || "Could not convert all images.");
    } finally {
      convertAllButton.disabled = false;
    }
  }

  function clearAll() {
    items.forEach((item) => URL.revokeObjectURL(item.url));
    items.length = 0;
    input.value = "";
    renderList();
    status.className = "status";
    status.textContent = "";
  }

  input.addEventListener("change", () => addFiles(input.files));

  ["dragenter", "dragover"].forEach((eventName) => {
    drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      drop.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      drop.classList.remove("is-dragging");
    });
  });

  drop.addEventListener("drop", (event) => {
    addFiles(event.dataTransfer.files);
  });

  qualityRange.addEventListener("input", () => syncQuality(qualityRange.value));
  qualityNumber.addEventListener("input", () => syncQuality(qualityNumber.value));

  formatSelect.addEventListener("change", () => {
    const isPng = formatSelect.value === "image/png";
    qualityRange.disabled = isPng;
    qualityNumber.disabled = isPng;
    backgroundSelect.disabled = formatSelect.value !== "image/jpeg";
  });

  convertAllButton.addEventListener("click", convertAll);
  clearButton.addEventListener("click", clearAll);

  backgroundSelect.disabled = true;
})();
