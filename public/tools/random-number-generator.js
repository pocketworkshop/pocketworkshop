(() => {
  const minInput = document.getElementById("rng-min");
  const maxInput = document.getElementById("rng-max");
  const countInput = document.getElementById("rng-count");
  const typeSelect = document.getElementById("rng-type");
  const decimalsInput = document.getElementById("rng-decimals");
  const separatorSelect = document.getElementById("rng-separator");
  const uniqueCheck = document.getElementById("rng-unique");
  const sortCheck = document.getElementById("rng-sort");
  const output = document.getElementById("rng-output");
  const outputCount = document.getElementById("rng-output-count");
  const generateButton = document.getElementById("rng-generate-button");
  const copyButton = document.getElementById("rng-copy-button");
  const downloadButton = document.getElementById("rng-download-button");
  const clearButton = document.getElementById("rng-clear-button");
  const status = document.getElementById("rng-status");
  const summary = document.getElementById("rng-summary");

  let generated = [];

  function setSuccess(message) {
    status.className = "status";
    status.textContent = message;
  }

  function setError(message) {
    status.className = "status rng-error";
    status.textContent = message;
  }

  function randomUint32() {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0];
  }

  function randomUnit() {
    return randomUint32() / 0x100000000;
  }

  function randomIntInclusive(min, max) {
    const range = max - min + 1;

    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || range <= 0) {
      throw new Error("Integer mode supports safe whole-number ranges only.");
    }

    if (range > 0x100000000) {
      return Math.floor(randomUnit() * range) + min;
    }

    const limit = 0x100000000 - (0x100000000 % range);
    let value;

    do {
      value = randomUint32();
    } while (value >= limit);

    return min + (value % range);
  }

  function separator() {
    if (separatorSelect.value === "comma") return ", ";
    if (separatorSelect.value === "space") return " ";
    return "\n";
  }

  function render() {
    output.value = generated.join(separator());
    outputCount.textContent = `${generated.length.toLocaleString()} ${generated.length === 1 ? "number" : "numbers"}`;

    if (generated.length) {
      const numeric = generated.map(Number);
      const min = Math.min(...numeric);
      const max = Math.max(...numeric);
      summary.textContent = `Lowest ${min} · Highest ${max}`;
    } else {
      summary.textContent = "";
    }
  }

  function generateIntegers(min, max, count) {
    const low = Math.ceil(min);
    const high = Math.floor(max);

    if (low > high) {
      throw new Error("This range contains no whole numbers.");
    }

    const available = high - low + 1;

    if (uniqueCheck.checked && count > available) {
      throw new Error(`Only ${available.toLocaleString()} unique integers are available in this range.`);
    }

    if (!uniqueCheck.checked) {
      return Array.from({ length: count }, () => randomIntInclusive(low, high));
    }

    const values = new Set();

    while (values.size < count) {
      values.add(randomIntInclusive(low, high));
    }

    return Array.from(values);
  }

  function generateDecimals(min, max, count, decimals) {
    if (uniqueCheck.checked) {
      const scale = 10 ** decimals;
      const low = Math.ceil(min * scale);
      const high = Math.floor(max * scale);
      const available = high - low + 1;

      if (!Number.isSafeInteger(low) || !Number.isSafeInteger(high) || available <= 0) {
        throw new Error("This decimal range cannot be used with unique mode.");
      }

      if (count > available) {
        throw new Error(`Only ${available.toLocaleString()} unique values are available at ${decimals} decimal places.`);
      }

      const values = new Set();

      while (values.size < count) {
        values.add(randomIntInclusive(low, high));
      }

      return Array.from(values, (value) => (value / scale).toFixed(decimals));
    }

    return Array.from({ length: count }, () => {
      const value = min + randomUnit() * (max - min);
      return value.toFixed(decimals);
    });
  }

  function generate() {
    const min = Number(minInput.value);
    const max = Number(maxInput.value);
    const count = Math.min(1000, Math.max(1, Number(countInput.value) || 1));
    const decimals = Math.min(12, Math.max(0, Number(decimalsInput.value) || 0));

    countInput.value = String(count);
    decimalsInput.value = String(decimals);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      generated = [];
      render();
      setError("Enter valid minimum and maximum values.");
      return;
    }

    if (min > max) {
      generated = [];
      render();
      setError("Minimum must be less than or equal to maximum.");
      return;
    }

    try {
      if (typeSelect.value === "integer") {
        generated = generateIntegers(min, max, count);
      } else {
        generated = generateDecimals(min, max, count, decimals);
      }

      if (sortCheck.checked) {
        generated.sort((a, b) => Number(a) - Number(b));
      }

      render();
      setSuccess("Generated.");
    } catch (error) {
      generated = [];
      render();
      setError(error.message || "Could not generate numbers.");
    }
  }

  typeSelect.addEventListener("change", () => {
    decimalsInput.disabled = typeSelect.value !== "decimal";
    if (typeSelect.value === "decimal") {
      decimalsInput.focus();
    }
  });

  separatorSelect.addEventListener("change", render);
  sortCheck.addEventListener("change", () => {
    if (generated.length && sortCheck.checked) {
      generated.sort((a, b) => Number(a) - Number(b));
    }
    render();
  });

  generateButton.addEventListener("click", generate);

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      setError("Generate numbers first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      setSuccess("Copied.");
    } catch {
      output.focus();
      output.select();
      try {
        document.execCommand("copy");
        setSuccess("Copied.");
      } catch {
        setError("Could not copy automatically. Select the numbers and copy them manually.");
      }
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!output.value) {
      setError("Generate numbers first.");
      return;
    }

    const blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "random-numbers.txt";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);

    setSuccess("Download started.");
  });

  clearButton.addEventListener("click", () => {
    generated = [];
    output.value = "";
    outputCount.textContent = "0 numbers";
    summary.textContent = "";
    status.className = "status";
    status.textContent = "";
  });

  generate();
})();
