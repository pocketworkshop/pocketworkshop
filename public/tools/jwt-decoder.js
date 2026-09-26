(() => {
  const input = document.getElementById("jwt-input");
  const headerOutput = document.getElementById("jwt-header");
  const payloadOutput = document.getElementById("jwt-payload");
  const signatureValue = document.getElementById("jwt-signature-value");
  const inputCount = document.getElementById("jwt-input-count");
  const headerCount = document.getElementById("jwt-header-count");
  const payloadCount = document.getElementById("jwt-payload-count");
  const decodeButton = document.getElementById("jwt-decode");
  const sampleButton = document.getElementById("jwt-sample");
  const clearButton = document.getElementById("jwt-clear");
  const copyHeaderButton = document.getElementById("jwt-copy-header");
  const copyPayloadButton = document.getElementById("jwt-copy-payload");
  const status = document.getElementById("jwt-status");
  const summary = document.getElementById("jwt-summary");
  const errorBox = document.getElementById("jwt-error");
  const alg = document.getElementById("jwt-alg");
  const iss = document.getElementById("jwt-iss");
  const sub = document.getElementById("jwt-sub");
  const iat = document.getElementById("jwt-iat");
  const nbf = document.getElementById("jwt-nbf");
  const exp = document.getElementById("jwt-exp");

  function formatCount(n) {
    return `${n.toLocaleString()} ${n === 1 ? "character" : "characters"}`;
  }

  function updateCounts() {
    inputCount.textContent = formatCount(input.value.length);
    headerCount.textContent = formatCount(headerOutput.value.length);
    payloadCount.textContent = formatCount(payloadOutput.value.length);
  }

  function clearMessage() {
    status.textContent = "";
    summary.textContent = "";
    errorBox.textContent = "";
    errorBox.style.display = "none";
  }

  function setError(message) {
    status.textContent = "Could not decode JWT.";
    summary.textContent = "";
    errorBox.textContent = message;
    errorBox.style.display = "block";
  }

  function resetDecoded() {
    headerOutput.value = "";
    payloadOutput.value = "";
    signatureValue.textContent = "—";
    alg.textContent = "—";
    iss.textContent = "—";
    sub.textContent = "—";
    iat.textContent = "—";
    nbf.textContent = "—";
    exp.textContent = "—";
    updateCounts();
  }

  function decodeBase64Url(segment) {
    if (!segment || !/^[A-Za-z0-9_-]+$/.test(segment)) {
      throw new Error("The JWT contains an invalid Base64URL segment.");
    }
    let base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";

    let binary;
    try {
      binary = atob(base64);
    } catch {
      throw new Error("A JWT segment could not be decoded from Base64URL.");
    }

    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("A decoded JWT segment is not valid UTF-8 text.");
    }
  }

  function parseJsonSegment(segment, label) {
    const text = decodeBase64Url(segment);
    try {
      const value = JSON.parse(text);
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error();
      }
      return value;
    } catch {
      throw new Error(`The ${label} segment is not a valid JSON object.`);
    }
  }

  function claimText(value) {
    if (value === undefined || value === null || value === "") return "—";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function formatUnixClaim(value, kind) {
    if (value === undefined || value === null || value === "") return "—";
    const seconds = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(seconds)) return claimText(value);

    const date = new Date(seconds * 1000);
    if (Number.isNaN(date.getTime())) return claimText(value);

    let suffix = "";
    const nowSeconds = Date.now() / 1000;
    if (kind === "exp") suffix = seconds <= nowSeconds ? " · expired" : " · active by exp";
    if (kind === "nbf" && seconds > nowSeconds) suffix = " · not active yet";
    return `${date.toLocaleString()}${suffix}`;
  }

  function decodeJwt() {
    const token = input.value.trim();
    clearMessage();
    resetDecoded();

    if (!token) {
      status.textContent = "Enter a JWT first.";
      return;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      setError(`A compact JWT should contain exactly 3 dot-separated segments. This input has ${parts.length}.`);
      return;
    }

    try {
      const header = parseJsonSegment(parts[0], "header");
      const payload = parseJsonSegment(parts[1], "payload");

      headerOutput.value = JSON.stringify(header, null, 2);
      payloadOutput.value = JSON.stringify(payload, null, 2);
      signatureValue.textContent = parts[2] || "(empty signature segment)";

      alg.textContent = claimText(header.alg);
      iss.textContent = claimText(payload.iss);
      sub.textContent = claimText(payload.sub);
      iat.textContent = formatUnixClaim(payload.iat, "iat");
      nbf.textContent = formatUnixClaim(payload.nbf, "nbf");
      exp.textContent = formatUnixClaim(payload.exp, "exp");

      const payloadClaims = Object.keys(payload).length;
      const type = header.typ ? ` · ${header.typ}` : "";
      summary.textContent = `${payloadClaims.toLocaleString()} payload claims${type}`;
      status.textContent = "Decoded. Signature not verified.";
      updateCounts();
    } catch (error) {
      resetDecoded();
      setError(error.message || "The token could not be decoded.");
    }
  }

  async function copyText(value, emptyMessage) {
    if (!value) {
      status.textContent = emptyMessage;
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      status.textContent = "Copied.";
    } catch {
      const target = value === headerOutput.value ? headerOutput : payloadOutput;
      target.focus();
      target.select();
      try {
        document.execCommand("copy");
        status.textContent = "Copied.";
      } catch {
        status.textContent = "Could not copy automatically. Select the decoded JSON and copy it manually.";
      }
    }
  }

  decodeButton.addEventListener("click", decodeJwt);
  copyHeaderButton.addEventListener("click", () => copyText(headerOutput.value, "Decode a JWT first."));
  copyPayloadButton.addEventListener("click", () => copyText(payloadOutput.value, "Decode a JWT first."));

  sampleButton.addEventListener("click", () => {
    input.value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwb2NrZXR3b3Jrc2hvcCIsInN1YiI6ImRlbW8tdXNlciIsInJvbGUiOiJlZGl0b3IiLCJpYXQiOjE3NjcyMjU2MDAsImV4cCI6MTg5MzQ1NjAwMH0.c2FtcGxlLXNpZ25hdHVyZS1ub3QtdmVyaWZpZWQ";
    clearMessage();
    resetDecoded();
    status.textContent = "Sample loaded.";
    updateCounts();
    input.focus();
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    clearMessage();
    resetDecoded();
    input.focus();
  });

  input.addEventListener("input", () => {
    clearMessage();
    updateCounts();
  });

  updateCounts();
})();
