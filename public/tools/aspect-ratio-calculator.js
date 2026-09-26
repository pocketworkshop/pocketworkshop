(() => {
  const widthInput = document.getElementById("ar-width");
  const heightInput = document.getElementById("ar-height");
  const calculateButton = document.getElementById("ar-calculate");
  const swapButton = document.getElementById("ar-swap");
  const status = document.getElementById("ar-status");

  const ratioOutput = document.getElementById("ar-ratio");
  const ratioDetail = document.getElementById("ar-ratio-detail");

  const modeSelect = document.getElementById("ar-mode");
  const knownInput = document.getElementById("ar-known");
  const resizeButton = document.getElementById("ar-resize");
  const resizeResult = document.getElementById("ar-resize-result");
  const resizeDetail = document.getElementById("ar-resize-detail");

  const previewBox = document.getElementById("ar-preview-box");
  const previewNote = document.getElementById("ar-preview-note");
  const presetButtons = Array.from(document.querySelectorAll("[data-w][data-h]"));

  let ratioW = 16;
  let ratioH = 9;

  function gcd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }

  function validPositive(value) {
    return Number.isFinite(value) && value > 0;
  }

  function simplify(width, height) {
    const divisor = gcd(width, height);
    return [Math.round(width) / divisor, Math.round(height) / divisor];
  }

  function updatePreview(width, height) {
    const w = Math.max(1, Number(width));
    const h = Math.max(1, Number(height));
    const ratio = w / h;

    let previewWidth = 320;
    let previewHeight = previewWidth / ratio;

    if (previewHeight > 220) {
      previewHeight = 220;
      previewWidth = previewHeight * ratio;
    }

    previewBox.style.width = `${Math.max(70, previewWidth)}px`;
    previewBox.style.height = `${Math.max(70, previewHeight)}px`;
    previewBox.textContent = `${Math.round(w).toLocaleString()} × ${Math.round(h).toLocaleString()}`;
    previewNote.textContent = `${ratioW}:${ratioH}`;
  }

  function calculateRatio() {
    status.textContent = "";
    status.classList.remove("ar-error");

    const width = Number(widthInput.value);
    const height = Number(heightInput.value);

    if (!validPositive(width) || !validPositive(height)) {
      status.textContent = "Enter a width and height greater than zero.";
      status.classList.add("ar-error");
      return;
    }

    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      status.textContent = "Use whole-number dimensions for ratio simplification.";
      status.classList.add("ar-error");
      return;
    }

    [ratioW, ratioH] = simplify(width, height);
    const decimal = width / height;

    ratioOutput.textContent = `${ratioW}:${ratioH}`;
    ratioDetail.textContent = `${width.toLocaleString()} × ${height.toLocaleString()} · ${decimal.toFixed(4)}`;
    resizeDetail.textContent = `Same ${ratioW}:${ratioH} ratio`;
    updatePreview(width, height);
    calculateResize();
  }

  function calculateResize() {
    status.textContent = "";
    status.classList.remove("ar-error");

    const known = Number(knownInput.value);

    if (!validPositive(known)) {
      status.textContent = "Enter a new dimension greater than zero.";
      status.classList.add("ar-error");
      return;
    }

    let width;
    let height;

    if (modeSelect.value === "width") {
      width = known;
      height = known * ratioH / ratioW;
    } else {
      height = known;
      width = known * ratioW / ratioH;
    }

    const roundedWidth = Math.round(width);
    const roundedHeight = Math.round(height);

    resizeResult.textContent = `${roundedWidth.toLocaleString()} × ${roundedHeight.toLocaleString()}`;
    resizeDetail.textContent = `Same ${ratioW}:${ratioH} ratio`;
  }

  calculateButton.addEventListener("click", calculateRatio);
  resizeButton.addEventListener("click", calculateResize);

  swapButton.addEventListener("click", () => {
    const oldWidth = widthInput.value;
    widthInput.value = heightInput.value;
    heightInput.value = oldWidth;
    calculateRatio();
  });

  presetButtons.forEach(button => {
    button.addEventListener("click", () => {
      const w = Number(button.dataset.w);
      const h = Number(button.dataset.h);

      widthInput.value = w * 100;
      heightInput.value = h * 100;
      ratioW = w;
      ratioH = h;

      ratioOutput.textContent = `${w}:${h}`;
      ratioDetail.textContent = `${(w * 100).toLocaleString()} × ${(h * 100).toLocaleString()} · ${(w / h).toFixed(4)}`;
      resizeDetail.textContent = `Same ${w}:${h} ratio`;
      updatePreview(w * 100, h * 100);
      calculateResize();

      status.textContent = `${w}:${h} loaded.`;
      status.classList.remove("ar-error");
    });
  });

  [widthInput, heightInput].forEach(input => {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") calculateRatio();
    });
  });

  knownInput.addEventListener("keydown", event => {
    if (event.key === "Enter") calculateResize();
  });

  modeSelect.addEventListener("change", calculateResize);

  calculateRatio();
})();
