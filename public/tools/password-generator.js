(() => {
  const lengthRange = document.getElementById("pw-length-range");
  const lengthNumber = document.getElementById("pw-length-number");
  const countInput = document.getElementById("pw-count");
  const lowercaseCheck = document.getElementById("pw-lowercase");
  const uppercaseCheck = document.getElementById("pw-uppercase");
  const numbersCheck = document.getElementById("pw-numbers");
  const symbolsCheck = document.getElementById("pw-symbols");
  const ambiguousCheck = document.getElementById("pw-ambiguous");
  const requireEachCheck = document.getElementById("pw-require-each");
  const output = document.getElementById("pw-output");
  const strength = document.getElementById("pw-strength");
  const generateButton = document.getElementById("pw-generate-button");
  const copyButton = document.getElementById("pw-copy-button");
  const downloadButton = document.getElementById("pw-download-button");
  const clearButton = document.getElementById("pw-clear-button");
  const status = document.getElementById("pw-status");
  const summary = document.getElementById("pw-summary");

  const SETS = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    numbers: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{};:,.?/"
  };

  const AMBIGUOUS = new Set(["O", "0", "I", "l", "1"]);

  let generated = [];

  function setSuccess(message) {
    status.className = "status";
    status.textContent = message;
  }

  function setError(message) {
    status.className = "status pw-error";
    status.textContent = message;
  }

  function randomIndex(maxExclusive) {
    if (maxExclusive <= 0) throw new Error("No characters are available.");

    const range = 0x100000000;
    const limit = range - (range % maxExclusive);
    const values = new Uint32Array(1);

    do {
      crypto.getRandomValues(values);
    } while (values[0] >= limit);

    return values[0] % maxExclusive;
  }

  function randomChar(chars) {
    return chars[randomIndex(chars.length)];
  }

  function cryptoShuffle(items) {
    const result = items.slice();

    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = randomIndex(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function cleanSet(chars) {
    if (!ambiguousCheck.checked) return chars;
    return Array.from(chars).filter((char) => !AMBIGUOUS.has(char)).join("");
  }

  function selectedSets() {
    const sets = [];
    if (lowercaseCheck.checked) sets.push(cleanSet(SETS.lower));
    if (uppercaseCheck.checked) sets.push(cleanSet(SETS.upper));
    if (numbersCheck.checked) sets.push(cleanSet(SETS.numbers));
    if (symbolsCheck.checked) sets.push(cleanSet(SETS.symbols));
    return sets.filter(Boolean);
  }

  function passwordLength() {
    return Math.min(128, Math.max(8, Number(lengthNumber.value) || 20));
  }

  function passwordCount() {
    return Math.min(100, Math.max(1, Number(countInput.value) || 1));
  }

  function generateOne(length, sets) {
    const pool = sets.join("");
    const chars = [];

    if (requireEachCheck.checked) {
      if (length < sets.length) {
        throw new Error("Password length is too short for the selected character types.");
      }

      sets.forEach((set) => {
        chars.push(randomChar(set));
      });
    }

    while (chars.length < length) {
      chars.push(randomChar(pool));
    }

    return cryptoShuffle(chars).join("");
  }

  function estimateStrength(length, poolSize) {
    if (!poolSize) return "—";

    const entropy = length * Math.log2(poolSize);

    if (entropy < 45) return "Weak";
    if (entropy < 65) return "Fair";
    if (entropy < 85) return "Strong";
    return "Very strong";
  }

  function renderStrength() {
    const sets = selectedSets();
    const poolSize = new Set(sets.join("")).size;
    const label = estimateStrength(passwordLength(), poolSize);
    strength.textContent = `Strength estimate: ${label}`;
  }

  function syncLength(value) {
    const clean = Math.min(128, Math.max(8, Number(value) || 20));
    lengthRange.value = String(clean);
    lengthNumber.value = String(clean);
    renderStrength();
  }

  function generate() {
    const sets = selectedSets();

    if (!sets.length) {
      generated = [];
      output.value = "";
      summary.textContent = "";
      setError("Select at least one character type.");
      renderStrength();
      return;
    }

    const length = passwordLength();
    const count = passwordCount();

    lengthNumber.value = String(length);
    lengthRange.value = String(length);
    countInput.value = String(count);

    try {
      generated = Array.from({ length: count }, () => generateOne(length, sets));
      output.value = generated.join("\n");
      summary.textContent = `${count.toLocaleString()} ${count === 1 ? "password" : "passwords"} · ${length} characters each`;
      renderStrength();
      setSuccess("Generated.");
    } catch (error) {
      generated = [];
      output.value = "";
      summary.textContent = "";
      setError(error.message || "Could not generate passwords.");
    }
  }

  lengthRange.addEventListener("input", () => syncLength(lengthRange.value));
  lengthNumber.addEventListener("input", () => syncLength(lengthNumber.value));

  [lowercaseCheck, uppercaseCheck, numbersCheck, symbolsCheck, ambiguousCheck].forEach((control) => {
    control.addEventListener("change", renderStrength);
  });

  generateButton.addEventListener("click", generate);

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      setError("Generate passwords first.");
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
        setError("Could not copy automatically. Select the passwords and copy them manually.");
      }
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!output.value) {
      setError("Generate passwords first.");
      return;
    }

    const blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "passwords.txt";
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
    summary.textContent = "";
    status.className = "status";
    status.textContent = "";
  });

  renderStrength();
  generate();
})();
