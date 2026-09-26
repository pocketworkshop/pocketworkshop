(() => {
  const amountInput = document.getElementById("uuid-amount");
  const separatorSelect = document.getElementById("uuid-separator");
  const uppercaseCheck = document.getElementById("uuid-uppercase");
  const noHyphensCheck = document.getElementById("uuid-no-hyphens");
  const bracesCheck = document.getElementById("uuid-braces");
  const output = document.getElementById("uuid-output");
  const outputCount = document.getElementById("uuid-output-count");
  const generateButton = document.getElementById("uuid-generate-button");
  const copyButton = document.getElementById("uuid-copy-button");
  const downloadButton = document.getElementById("uuid-download-button");
  const clearButton = document.getElementById("uuid-clear-button");
  const status = document.getElementById("uuid-status");
  const summary = document.getElementById("uuid-summary");

  let generated = [];

  function fallbackUuidV4() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join("")
    ].join("-");
  }

  function uuidV4() {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return fallbackUuidV4();
  }

  function formatUuid(uuid) {
    let value = uuid;

    if (noHyphensCheck.checked) {
      value = value.replace(/-/g, "");
    }

    if (uppercaseCheck.checked) {
      value = value.toUpperCase();
    }

    if (bracesCheck.checked) {
      value = `{${value}}`;
    }

    return value;
  }

  function separator() {
    if (separatorSelect.value === "comma") return ", ";
    if (separatorSelect.value === "space") return " ";
    return "\n";
  }

  function render() {
    const formatted = generated.map(formatUuid);
    output.value = formatted.join(separator());
    outputCount.textContent = `${generated.length.toLocaleString()} ${generated.length === 1 ? "UUID" : "UUIDs"}`;
    summary.textContent = generated.length
      ? `${output.value.length.toLocaleString()} characters`
      : "";
  }

  function generate() {
    const amount = Math.min(1000, Math.max(1, Number(amountInput.value) || 1));
    amountInput.value = amount;

    generated = Array.from({ length: amount }, () => uuidV4());
    render();
    status.textContent = "Generated.";
  }

  generateButton.addEventListener("click", generate);

  [separatorSelect, uppercaseCheck, noHyphensCheck, bracesCheck].forEach((control) => {
    control.addEventListener("change", () => {
      render();
      if (generated.length) status.textContent = "Format updated.";
    });
  });

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      status.textContent = "Generate UUIDs first.";
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = "Copied.";
    } catch {
      output.focus();
      output.select();
      try {
        document.execCommand("copy");
        status.textContent = "Copied.";
      } catch {
        status.textContent = "Could not copy automatically. Select the UUIDs and copy them manually.";
      }
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!output.value) {
      status.textContent = "Generate UUIDs first.";
      return;
    }

    const blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "uuids.txt";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);

    status.textContent = "Download started.";
  });

  clearButton.addEventListener("click", () => {
    generated = [];
    output.value = "";
    outputCount.textContent = "0 UUIDs";
    summary.textContent = "";
    status.textContent = "";
  });

  generate();
})();
