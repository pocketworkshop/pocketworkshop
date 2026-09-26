(() => {
  const input = document.getElementById("crop-input");
  const fileName = document.getElementById("crop-file-name");
  const workspace = document.getElementById("crop-workspace");
  const image = document.getElementById("crop-image");
  const ratioSelect = document.getElementById("crop-ratio");
  const formatSelect = document.getElementById("crop-format");
  const qualityInput = document.getElementById("crop-quality");
  const qualityValue = document.getElementById("crop-quality-value");
  const qualityLabel = document.getElementById("crop-quality-label");
  const cropSize = document.getElementById("crop-size");
  const cropButton = document.getElementById("crop-button");
  const resetSelectionButton = document.getElementById("crop-reset-selection-button");
  const resetButton = document.getElementById("crop-reset-button");
  const status = document.getElementById("crop-status");
  const downloadPanel = document.getElementById("crop-download-panel");
  const downloadInfo = document.getElementById("crop-download-info");
  const downloadButton = document.getElementById("crop-download-button");

  let cropper = null;
  let sourceFile = null;
  let sourceUrl = "";
  let outputBlob = null;
  let outputName = "";

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function baseName(name) {
    return name.replace(/\.[^.]+$/, "") || "image";
  }

  function extensionFor(type) {
    if (type === "image/png") return "png";
    if (type === "image/webp") return "webp";
    return "jpg";
  }

  function hideDownload() {
    outputBlob = null;
    outputName = "";
    downloadPanel.classList.remove("ready");
    downloadInfo.textContent = "";
  }

  function refreshQualityVisibility() {
    qualityLabel.hidden = formatSelect.value === "image/png";
  }

  function updateCropSize() {
    if (!cropper) {
      cropSize.textContent = "—";
      return;
    }

    const data = cropper.getData(true);
    const width = Math.max(0, Math.round(data.width || 0));
    const height = Math.max(0, Math.round(data.height || 0));
    cropSize.textContent = width && height ? `${width.toLocaleString()} × ${height.toLocaleString()} px` : "—";
  }

  function destroyCropper() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  }

  function clearTool() {
    destroyCropper();
    hideDownload();

    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
      sourceUrl = "";
    }

    sourceFile = null;
    input.value = "";
    image.removeAttribute("src");
    fileName.textContent = "No image selected";
    workspace.hidden = true;
    ratioSelect.value = "free";
    formatSelect.value = "image/jpeg";
    qualityInput.value = "90";
    qualityValue.textContent = "90%";
    status.textContent = "";
    cropSize.textContent = "—";
    refreshQualityVisibility();
  }

  function createCropper() {
    destroyCropper();

    if (!window.Cropper) {
      status.textContent = "Crop library failed to load. Please refresh the page.";
      return;
    }

    const ratioValue = ratioSelect.value;
    const aspectRatio = ratioValue === "free" ? NaN : Number(ratioValue);

    cropper = new Cropper(image, {
      aspectRatio,
      viewMode: 1,
      dragMode: "move",
      autoCropArea: 0.82,
      background: false,
      responsive: true,
      restore: false,
      movable: true,
      zoomable: true,
      zoomOnTouch: true,
      zoomOnWheel: true,
      scalable: false,
      rotatable: false,
      crop: updateCropSize,
      ready: () => {
        updateCropSize();
        status.textContent = "Ready";
      }
    });
  }

  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      status.textContent = "Please choose a JPG, PNG or WebP image.";
      input.value = "";
      return;
    }

    hideDownload();
    destroyCropper();

    if (sourceUrl) URL.revokeObjectURL(sourceUrl);

    sourceFile = file;
    sourceUrl = URL.createObjectURL(file);
    fileName.textContent = file.name;
    workspace.hidden = false;
    status.textContent = "Loading image…";

    if (file.type === "image/png") {
      formatSelect.value = "image/png";
    } else if (file.type === "image/webp") {
      formatSelect.value = "image/webp";
    } else {
      formatSelect.value = "image/jpeg";
    }

    refreshQualityVisibility();

    image.onload = () => {
      createCropper();
    };

    image.onerror = () => {
      status.textContent = "This image could not be opened.";
    };

    image.src = sourceUrl;
  });

  ratioSelect.addEventListener("change", () => {
    hideDownload();

    if (!cropper) return;

    const value = ratioSelect.value;
    cropper.setAspectRatio(value === "free" ? NaN : Number(value));
    status.textContent = "";
    updateCropSize();
  });

  formatSelect.addEventListener("change", () => {
    hideDownload();
    refreshQualityVisibility();
  });

  qualityInput.addEventListener("input", () => {
    qualityValue.textContent = `${qualityInput.value}%`;
    hideDownload();
  });

  resetSelectionButton.addEventListener("click", () => {
    if (!cropper) return;
    hideDownload();
    cropper.reset();

    const value = ratioSelect.value;
    cropper.setAspectRatio(value === "free" ? NaN : Number(value));
    status.textContent = "";
    updateCropSize();
  });

  resetButton.addEventListener("click", clearTool);

  cropButton.addEventListener("click", () => {
    if (!cropper || !sourceFile) {
      status.textContent = "Choose an image first.";
      return;
    }

    hideDownload();
    status.textContent = "Cropping…";
    cropButton.disabled = true;

    requestAnimationFrame(() => {
      try {
        const canvas = cropper.getCroppedCanvas({
          maxWidth: 12000,
          maxHeight: 12000,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: "high",
          fillColor: formatSelect.value === "image/jpeg" ? "#ffffff" : undefined
        });

        if (!canvas) {
          cropButton.disabled = false;
          status.textContent = "The crop could not be created.";
          return;
        }

        const type = formatSelect.value;
        const quality = Number(qualityInput.value) / 100;

        canvas.toBlob((blob) => {
          cropButton.disabled = false;

          if (!blob) {
            status.textContent = "The cropped image could not be created.";
            return;
          }

          outputBlob = blob;
          const ext = extensionFor(type);
          outputName = `${baseName(sourceFile.name)}-cropped.${ext}`;

          downloadInfo.textContent =
            `${canvas.width.toLocaleString()} × ${canvas.height.toLocaleString()} px · ${formatBytes(blob.size)} · ${ext.toUpperCase()}`;
          downloadPanel.classList.add("ready");
          status.textContent = "Done";

          downloadPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, type, type === "image/png" ? undefined : quality);
      } catch (error) {
        console.error(error);
        cropButton.disabled = false;
        status.textContent = "Something went wrong while cropping.";
      }
    });
  });

  downloadButton.addEventListener("click", () => {
    if (!outputBlob || !outputName) {
      status.textContent = "Create a cropped image first.";
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

  window.addEventListener("beforeunload", () => {
    destroyCropper();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  });

  refreshQualityVisibility();
})();
