(() => {
  const ofPercent = document.getElementById("pct-of-percent");
  const ofNumber = document.getElementById("pct-of-number");
  const ofCalc = document.getElementById("pct-of-calc");
  const ofResult = document.getElementById("pct-of-result");
  const ofDetail = document.getElementById("pct-of-detail");

  const sharePart = document.getElementById("pct-share-part");
  const shareWhole = document.getElementById("pct-share-whole");
  const shareCalc = document.getElementById("pct-share-calc");
  const shareResult = document.getElementById("pct-share-result");
  const shareDetail = document.getElementById("pct-share-detail");

  const changeOld = document.getElementById("pct-change-old");
  const changeNew = document.getElementById("pct-change-new");
  const changeCalc = document.getElementById("pct-change-calc");
  const changeResult = document.getElementById("pct-change-result");
  const changeDetail = document.getElementById("pct-change-detail");

  const sampleButton = document.getElementById("pct-sample");
  const clearButton = document.getElementById("pct-clear");
  const status = document.getElementById("pct-status");

  function parseValue(input) {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : null;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "—";

    const abs = Math.abs(value);

    if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) {
      return value.toExponential(6).replace(/\.?0+e/, "e");
    }

    const rounded = Math.abs(value - Math.round(value)) < 1e-10
      ? Math.round(value)
      : Number(value.toFixed(8));

    return rounded.toLocaleString(undefined, { maximumFractionDigits: 8 });
  }

  function clearStatus() {
    status.textContent = "";
    status.classList.remove("pct-error");
  }

  function showError(message) {
    status.textContent = message;
    status.classList.add("pct-error");
  }

  function calculateOf() {
    clearStatus();

    const percent = parseValue(ofPercent);
    const number = parseValue(ofNumber);

    if (percent === null || number === null) {
      showError("Enter valid numbers in the first calculator.");
      return;
    }

    const result = number * percent / 100;
    ofResult.textContent = formatNumber(result);
    ofDetail.textContent = `${formatNumber(percent)}% of ${formatNumber(number)} = ${formatNumber(result)}`;
  }

  function calculateShare() {
    clearStatus();

    const part = parseValue(sharePart);
    const whole = parseValue(shareWhole);

    if (part === null || whole === null) {
      showError("Enter valid numbers in the second calculator.");
      return;
    }

    if (whole === 0) {
      showError("The whole value cannot be zero.");
      shareResult.textContent = "—";
      shareDetail.textContent = "Division by zero is undefined.";
      return;
    }

    const result = part / whole * 100;
    shareResult.textContent = `${formatNumber(result)}%`;
    shareDetail.textContent = `${formatNumber(part)} is ${formatNumber(result)}% of ${formatNumber(whole)}`;
  }

  function calculateChange() {
    clearStatus();

    const oldValue = parseValue(changeOld);
    const newValue = parseValue(changeNew);

    if (oldValue === null || newValue === null) {
      showError("Enter valid numbers in the percentage change calculator.");
      return;
    }

    if (oldValue === 0) {
      showError("The old value cannot be zero for percentage change.");
      changeResult.textContent = "—";
      changeDetail.textContent = "Percentage change from zero is undefined.";
      return;
    }

    const difference = newValue - oldValue;
    const result = difference / Math.abs(oldValue) * 100;

    let label = "no change";
    if (result > 0) label = "increase";
    if (result < 0) label = "decrease";

    changeResult.textContent = result === 0
      ? "0% change"
      : `${formatNumber(Math.abs(result))}% ${label}`;

    const signedDiff = difference > 0
      ? `+${formatNumber(difference)}`
      : formatNumber(difference);

    changeDetail.textContent = `${formatNumber(oldValue)} → ${formatNumber(newValue)} · difference ${signedDiff}`;
  }

  function calculateAll() {
    calculateOf();
    calculateShare();
    calculateChange();
  }

  ofCalc.addEventListener("click", calculateOf);
  shareCalc.addEventListener("click", calculateShare);
  changeCalc.addEventListener("click", calculateChange);

  [
    [ofPercent, calculateOf],
    [ofNumber, calculateOf],
    [sharePart, calculateShare],
    [shareWhole, calculateShare],
    [changeOld, calculateChange],
    [changeNew, calculateChange]
  ].forEach(([input, fn]) => {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") fn();
    });
  });

  sampleButton.addEventListener("click", () => {
    ofPercent.value = "18";
    ofNumber.value = "350";
    sharePart.value = "42";
    shareWhole.value = "168";
    changeOld.value = "125";
    changeNew.value = "150";
    calculateAll();
    status.textContent = "Sample values loaded.";
    status.classList.remove("pct-error");
  });

  clearButton.addEventListener("click", () => {
    [
      ofPercent, ofNumber, sharePart, shareWhole, changeOld, changeNew
    ].forEach(input => input.value = "");

    ofResult.textContent = "—";
    ofDetail.textContent = "Enter values and calculate.";
    shareResult.textContent = "—";
    shareDetail.textContent = "Enter values and calculate.";
    changeResult.textContent = "—";
    changeDetail.textContent = "Enter values and calculate.";
    clearStatus();
    ofPercent.focus();
  });

  calculateAll();
})();
