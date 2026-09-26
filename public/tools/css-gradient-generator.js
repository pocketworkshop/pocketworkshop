(() => {
  const typeSelect = document.getElementById("gradient-type");
  const angleInput = document.getElementById("gradient-angle");
  const shapeSelect = document.getElementById("gradient-shape");

  const color1 = document.getElementById("gradient-color-1");
  const color2 = document.getElementById("gradient-color-2");
  const hex1 = document.getElementById("gradient-hex-1");
  const hex2 = document.getElementById("gradient-hex-2");
  const stop1 = document.getElementById("gradient-stop-1");
  const stop2 = document.getElementById("gradient-stop-2");

  const preview = document.getElementById("gradient-preview");
  const code = document.getElementById("gradient-code");
  const copyButton = document.getElementById("gradient-copy-button");
  const swapButton = document.getElementById("gradient-swap-button");
  const randomButton = document.getElementById("gradient-random-button");
  const resetButton = document.getElementById("gradient-reset-button");
  const status = document.getElementById("gradient-status");

  let updating = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeHex(value) {
    let text = String(value).trim().replace(/^#/, "");

    if (/^[0-9a-fA-F]{3}$/.test(text)) {
      text = text.split("").map((char) => char + char).join("");
    }

    if (!/^[0-9a-fA-F]{6}$/.test(text)) {
      throw new Error("Use a 3-digit or 6-digit HEX color.");
    }

    return `#${text.toUpperCase()}`;
  }

  function setSuccess(message) {
    status.className = "status";
    status.textContent = message;
  }

  function setError(message) {
    status.className = "status gradient-error";
    status.textContent = message;
  }

  function currentCss() {
    const c1 = normalizeHex(hex1.value);
    const c2 = normalizeHex(hex2.value);
    const s1 = clamp(Number(stop1.value) || 0, 0, 100);
    const s2 = clamp(Number(stop2.value) || 100, 0, 100);

    if (typeSelect.value === "radial") {
      return `background: radial-gradient(${shapeSelect.value}, ${c1} ${s1}%, ${c2} ${s2}%);`;
    }

    const angle = ((Number(angleInput.value) || 0) % 360 + 360) % 360;
    return `background: linear-gradient(${angle}deg, ${c1} ${s1}%, ${c2} ${s2}%);`;
  }

  function render(message = "") {
    try {
      const c1 = normalizeHex(hex1.value);
      const c2 = normalizeHex(hex2.value);

      updating = true;
      color1.value = c1;
      color2.value = c2;
      hex1.value = c1;
      hex2.value = c2;
      stop1.value = String(clamp(Number(stop1.value) || 0, 0, 100));
      stop2.value = String(clamp(Number(stop2.value) || 100, 0, 100));
      angleInput.value = String(((Number(angleInput.value) || 0) % 360 + 360) % 360);
      updating = false;

      const css = currentCss();
      const declaration = css.replace(/^background:\s*/, "").replace(/;$/, "");
      preview.style.background = declaration;
      code.value = css;

      if (message) setSuccess(message);
      else {
        status.className = "status";
        status.textContent = "";
      }
    } catch (error) {
      setError(error.message || "Could not build this gradient.");
    }
  }

  function syncFromPicker(picker, hexInput) {
    if (updating) return;
    hexInput.value = picker.value.toUpperCase();
    render();
  }

  color1.addEventListener("input", () => syncFromPicker(color1, hex1));
  color2.addEventListener("input", () => syncFromPicker(color2, hex2));

  [hex1, hex2].forEach((field) => {
    field.addEventListener("change", () => render("Color updated."));
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") render("Color updated.");
    });
  });

  [stop1, stop2, angleInput, shapeSelect].forEach((control) => {
    control.addEventListener("input", () => render());
    control.addEventListener("change", () => render());
  });

  typeSelect.addEventListener("change", () => {
    const radial = typeSelect.value === "radial";
    angleInput.disabled = radial;
    shapeSelect.disabled = !radial;
    render(radial ? "Radial gradient selected." : "Linear gradient selected.");
  });

  document.querySelectorAll(".gradient-preset").forEach((button) => {
    button.addEventListener("click", () => {
      typeSelect.value = "linear";
      angleInput.disabled = false;
      shapeSelect.disabled = true;
      hex1.value = button.dataset.c1;
      hex2.value = button.dataset.c2;
      stop1.value = "0";
      stop2.value = "100";
      angleInput.value = button.dataset.angle || "135";
      render("Preset loaded.");
    });
  });

  copyButton.addEventListener("click", async () => {
    if (!code.value) {
      setError("Create a gradient first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(code.value);
      setSuccess("CSS copied.");
    } catch {
      code.focus();
      code.select();

      try {
        document.execCommand("copy");
        setSuccess("CSS copied.");
      } catch {
        setError("Could not copy automatically.");
      }
    }
  });

  swapButton.addEventListener("click", () => {
    const oldHex1 = hex1.value;
    const oldStop1 = stop1.value;

    hex1.value = hex2.value;
    hex2.value = oldHex1;
    stop1.value = stop2.value;
    stop2.value = oldStop1;

    render("Colors swapped.");
  });

  randomButton.addEventListener("click", () => {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);

    const randomHex = (offset) => {
      const parts = [bytes[offset], bytes[offset + 1], bytes[offset + 2]];
      return "#" + parts.map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
    };

    typeSelect.value = "linear";
    angleInput.disabled = false;
    shapeSelect.disabled = true;
    hex1.value = randomHex(0);
    hex2.value = randomHex(3);
    stop1.value = "0";
    stop2.value = "100";
    angleInput.value = String(Math.floor((bytes[0] / 255) * 360));

    render("Random gradient generated.");
  });

  resetButton.addEventListener("click", () => {
    typeSelect.value = "linear";
    angleInput.disabled = false;
    shapeSelect.disabled = true;
    shapeSelect.value = "circle";
    angleInput.value = "135";
    hex1.value = "#22A06B";
    hex2.value = "#2563EB";
    stop1.value = "0";
    stop2.value = "100";
    render("Reset.");
  });

  render();
})();
