(() => {
  const input = document.getElementById("slug-input");
  const output = document.getElementById("slug-output");
  const inputCount = document.getElementById("slug-input-count");
  const outputCount = document.getElementById("slug-output-count");
  const preview = document.getElementById("slug-preview");
  const separator = document.getElementById("slug-separator");
  const maxLength = document.getElementById("slug-max-length");
  const lowercase = document.getElementById("slug-lowercase");
  const removeAccents = document.getElementById("slug-remove-accents");
  const ampersand = document.getElementById("slug-ampersand");
  const asciiOnly = document.getElementById("slug-ascii-only");
  const generateButton = document.getElementById("slug-generate");
  const copyButton = document.getElementById("slug-copy");
  const sampleButton = document.getElementById("slug-sample");
  const clearButton = document.getElementById("slug-clear");
  const status = document.getElementById("slug-status");
  const summary = document.getElementById("slug-summary");

  function characterLabel(count) {
    return `${count.toLocaleString()} ${count === 1 ? "character" : "characters"}`;
  }

  function escapeForClass(value) {
    return value.replace(/[\\\]\-^]/g, "\\$&");
  }

  function trimToLength(value, limit, sep) {
    if (!limit || value.length <= limit) return value;

    let shortened = value.slice(0, limit);
    const lastSeparator = shortened.lastIndexOf(sep);

    if (lastSeparator > 0 && lastSeparator >= Math.floor(limit * 0.55)) {
      shortened = shortened.slice(0, lastSeparator);
    }

    const edgeSeparator = new RegExp(`${escapeForClass(sep)}+$`);
    return shortened.replace(edgeSeparator, "");
  }

  function makeSlug(source) {
    const sep = separator.value;
    const escapedSep = escapeForClass(sep);
    let value = source.trim();

    if (!value) return "";

    if (ampersand.checked) {
      value = value.replace(/&/g, " and ");
    }

    if (removeAccents.checked) {
      value = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    }

    if (lowercase.checked) {
      value = value.toLocaleLowerCase("en-US");
    }

    if (asciiOnly.checked) {
      value = value.replace(/[^A-Za-z0-9]+/g, sep);
    } else {
      value = value.replace(/[^\p{L}\p{N}]+/gu, sep);
    }

    const repeatedSeparators = new RegExp(`${escapedSep}{2,}`, "g");
    const edgeSeparators = new RegExp(`^${escapedSep}+|${escapedSep}+$`, "g");

    value = value
      .replace(repeatedSeparators, sep)
      .replace(edgeSeparators, "");

    const requestedLimit = Math.min(500, Math.max(0, Number.parseInt(maxLength.value, 10) || 0));
    value = trimToLength(value, requestedLimit, sep);

    return value;
  }

  function updateCounts() {
    inputCount.textContent = characterLabel(input.value.length);
    outputCount.textContent = characterLabel(output.value.length);
  }

  function updatePreview() {
    preview.textContent = output.value ? `/${output.value}` : "/your-url-friendly-slug";
  }

  function generate(showStatus = true) {
    const result = makeSlug(input.value);
    output.value = result;
    updateCounts();
    updatePreview();

    if (!input.value.trim()) {
      summary.textContent = "";
      if (showStatus) status.textContent = "Enter a title or phrase first.";
      return;
    }

    if (!result) {
      summary.textContent = "0 output characters";
      if (showStatus) status.textContent = "No URL-safe characters remain with the current options.";
      return;
    }

    const reduction = Math.max(0, input.value.length - result.length);
    summary.textContent = reduction
      ? `${reduction.toLocaleString()} characters removed or replaced`
      : `${result.length.toLocaleString()} output characters`;

    if (showStatus) status.textContent = "Slug generated.";
  }

  generateButton.addEventListener("click", () => generate(true));

  input.addEventListener("input", () => {
    status.textContent = "";
    generate(false);
  });

  [separator, maxLength, lowercase, removeAccents, ampersand, asciiOnly].forEach(control => {
    control.addEventListener("input", () => {
      status.textContent = "";
      generate(false);
    });
    control.addEventListener("change", () => {
      status.textContent = "";
      generate(false);
    });
  });

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      status.textContent = "Generate a slug first.";
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = "Copied.";
    } catch {
      output.removeAttribute("readonly");
      output.focus();
      output.select();
      try {
        document.execCommand("copy");
        status.textContent = "Copied.";
      } catch {
        status.textContent = "Could not copy automatically. Select the slug and copy it manually.";
      }
      output.setAttribute("readonly", "");
    }
  });

  sampleButton.addEventListener("click", () => {
    input.value = "10 Easy Ways to Build a Better Home Office in 2026";
    separator.value = "-";
    maxLength.value = "0";
    lowercase.checked = true;
    removeAccents.checked = true;
    ampersand.checked = true;
    asciiOnly.checked = true;
    generate(true);
    input.focus();
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    output.value = "";
    status.textContent = "";
    summary.textContent = "";
    updateCounts();
    updatePreview();
    input.focus();
  });

  updateCounts();
  updatePreview();
})();
