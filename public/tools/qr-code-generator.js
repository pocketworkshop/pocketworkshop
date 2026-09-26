(() => {
  const textInput = document.getElementById("qr-text");
  const sizeSelect = document.getElementById("qr-size");
  const levelSelect = document.getElementById("qr-level");
  const generateButton = document.getElementById("qr-generate-button");
  const clearButton = document.getElementById("qr-clear-button");
  const downloadButton = document.getElementById("qr-download-button");
  const output = document.getElementById("qr-output");
  const status = document.getElementById("qr-status");

  let downloadUrl = "";

  function clearDownloadUrl() {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      downloadUrl = "";
    }
  }

  function clearOutput() {
    clearDownloadUrl();
    output.innerHTML = "";
    downloadButton.hidden = true;
  }

  function getCorrectionLevel(level) {
    const levels = QRCode.CorrectLevel;
    return levels[level] ?? levels.M;
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create the PNG file."));
      }, "image/png");
    });
  }

  async function generateQr() {
    const value = textInput.value.trim();

    if (!value) {
      clearOutput();
      status.textContent = "Enter a URL or text first.";
      textInput.focus();
      return;
    }

    status.textContent = "Generating…";
    clearOutput();

    try {
      const size = Number(sizeSelect.value);

      new QRCode(output, {
        text: value,
        width: size,
        height: size,
        colorDark: "#14231c",
        colorLight: "#ffffff",
        correctLevel: getCorrectionLevel(levelSelect.value)
      });

      // QRCode.js renders a canvas immediately in modern browsers.
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const canvas = output.querySelector("canvas");
      const image = output.querySelector("img");

      let blob;

      if (canvas) {
        blob = await canvasToBlob(canvas);
      } else if (image && image.src.startsWith("data:image/")) {
        const response = await fetch(image.src);
        blob = await response.blob();
      } else {
        throw new Error("QR code image could not be prepared.");
      }

      downloadUrl = URL.createObjectURL(blob);
      downloadButton.hidden = false;
      status.textContent = "QR code ready.";
    } catch (error) {
      console.error(error);
      clearOutput();
      status.textContent = "Could not create the QR code. Try shorter text or a lower error correction level.";
    }
  }

  function downloadQr() {
    if (!downloadUrl) return;

    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = "pocketworkshop-qr-code.png";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  generateButton.addEventListener("click", generateQr);

  clearButton.addEventListener("click", () => {
    textInput.value = "";
    status.textContent = "";
    clearOutput();
    textInput.focus();
  });

  downloadButton.addEventListener("click", downloadQr);

  textInput.addEventListener("input", () => {
    if (status.textContent && !textInput.value.trim()) {
      status.textContent = "";
    }
  });

  window.addEventListener("beforeunload", clearDownloadUrl);
})();
