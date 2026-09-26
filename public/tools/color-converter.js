(() => {
  const preview = document.getElementById("color-preview");
  const picker = document.getElementById("color-picker");
  const hexInput = document.getElementById("hex-input");
  const rgbR = document.getElementById("rgb-r");
  const rgbG = document.getElementById("rgb-g");
  const rgbB = document.getElementById("rgb-b");
  const rgbOutput = document.getElementById("rgb-output");
  const hslH = document.getElementById("hsl-h");
  const hslS = document.getElementById("hsl-s");
  const hslL = document.getElementById("hsl-l");
  const hslOutput = document.getElementById("hsl-output");
  const randomButton = document.getElementById("color-random-button");
  const resetButton = document.getElementById("color-reset-button");
  const status = document.getElementById("color-status");

  let updating = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function setSuccess(message) {
    status.className = "status";
    status.textContent = message;
  }

  function setError(message) {
    status.className = "status color-error";
    status.textContent = message;
  }

  function normalizeHex(value) {
    let text = String(value).trim().replace(/^#/, "");

    if (/^[0-9a-fA-F]{3}$/.test(text)) {
      text = text.split("").map((char) => char + char).join("");
    }

    if (!/^[0-9a-fA-F]{6}$/.test(text)) {
      throw new Error("Enter a 3-digit or 6-digit HEX color.");
    }

    return `#${text.toUpperCase()}`;
  }

  function hexToRgb(hex) {
    const clean = normalizeHex(hex).slice(1);
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b]
      .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    const delta = max - min;

    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));

      if (max === r) {
        h = 60 * (((g - b) / delta) % 6);
      } else if (max === g) {
        h = 60 * (((b - r) / delta) + 2);
      } else {
        h = 60 * (((r - g) / delta) + 4);
      }
    }

    if (h < 0) h += 360;

    return {
      h: Math.round(h),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let rp = 0;
    let gp = 0;
    let bp = 0;

    if (h < 60) [rp, gp, bp] = [c, x, 0];
    else if (h < 120) [rp, gp, bp] = [x, c, 0];
    else if (h < 180) [rp, gp, bp] = [0, c, x];
    else if (h < 240) [rp, gp, bp] = [0, x, c];
    else if (h < 300) [rp, gp, bp] = [x, 0, c];
    else [rp, gp, bp] = [c, 0, x];

    return {
      r: Math.round((rp + m) * 255),
      g: Math.round((gp + m) * 255),
      b: Math.round((bp + m) * 255)
    };
  }

  function renderFromRgb(r, g, b, message = "") {
    r = clamp(Math.round(r), 0, 255);
    g = clamp(Math.round(g), 0, 255);
    b = clamp(Math.round(b), 0, 255);

    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);

    updating = true;

    preview.style.background = hex;
    picker.value = hex;
    hexInput.value = hex;

    rgbR.value = r;
    rgbG.value = g;
    rgbB.value = b;
    rgbOutput.value = `rgb(${r}, ${g}, ${b})`;

    hslH.value = hsl.h;
    hslS.value = hsl.s;
    hslL.value = hsl.l;
    hslOutput.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

    updating = false;

    if (message) setSuccess(message);
  }

  function updateFromHex() {
    if (updating) return;

    try {
      const rgb = hexToRgb(hexInput.value);
      renderFromRgb(rgb.r, rgb.g, rgb.b, "Converted.");
    } catch (error) {
      setError(error.message);
    }
  }

  function updateFromRgb() {
    if (updating) return;

    const r = Number(rgbR.value);
    const g = Number(rgbG.value);
    const b = Number(rgbB.value);

    if (![r, g, b].every(Number.isFinite)) {
      setError("Enter valid RGB values.");
      return;
    }

    renderFromRgb(r, g, b, "Converted.");
  }

  function updateFromHsl() {
    if (updating) return;

    const h = Number(hslH.value);
    const s = Number(hslS.value);
    const l = Number(hslL.value);

    if (![h, s, l].every(Number.isFinite)) {
      setError("Enter valid HSL values.");
      return;
    }

    const rgb = hslToRgb(h, s, l);
    renderFromRgb(rgb.r, rgb.g, rgb.b, "Converted.");
  }

  picker.addEventListener("input", () => {
    const rgb = hexToRgb(picker.value);
    renderFromRgb(rgb.r, rgb.g, rgb.b);
  });

  hexInput.addEventListener("change", updateFromHex);
  hexInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") updateFromHex();
  });

  [rgbR, rgbG, rgbB].forEach((field) => {
    field.addEventListener("change", updateFromRgb);
  });

  [hslH, hslS, hslL].forEach((field) => {
    field.addEventListener("change", updateFromHsl);
  });

  document.querySelectorAll(".color-swatch").forEach((button) => {
    button.addEventListener("click", () => {
      const rgb = hexToRgb(button.dataset.color);
      renderFromRgb(rgb.r, rgb.g, rgb.b, "Color selected.");
    });
  });

  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      const value = target.value;

      try {
        await navigator.clipboard.writeText(value);
        const original = button.textContent;
        button.textContent = "Copied";
        window.setTimeout(() => {
          button.textContent = original;
        }, 1200);
        setSuccess("Copied.");
      } catch {
        target.focus();
        target.select();
        try {
          document.execCommand("copy");
          setSuccess("Copied.");
        } catch {
          setError("Could not copy automatically.");
        }
      }
    });
  });

  randomButton.addEventListener("click", () => {
    const bytes = new Uint8Array(3);
    crypto.getRandomValues(bytes);
    renderFromRgb(bytes[0], bytes[1], bytes[2], "Random color generated.");
  });

  resetButton.addEventListener("click", () => {
    renderFromRgb(34, 160, 107, "Reset.");
  });

  renderFromRgb(34, 160, 107);
})();
