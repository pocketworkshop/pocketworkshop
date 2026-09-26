(() => {
  const tsInput = document.getElementById("ts-input");
  const tsUnit = document.getElementById("ts-unit");
  const tsConvertButton = document.getElementById("ts-convert-button");
  const tsNowButton = document.getElementById("ts-now-button");
  const tsStatus = document.getElementById("ts-status");

  const dateInput = document.getElementById("date-input");
  const timeInput = document.getElementById("time-input");
  const dateZone = document.getElementById("date-zone");
  const dateConvertButton = document.getElementById("date-convert-button");
  const dateNowButton = document.getElementById("date-now-button");
  const dateStatus = document.getElementById("date-status");

  const resultSeconds = document.getElementById("result-seconds");
  const resultMilliseconds = document.getElementById("result-milliseconds");
  const resultIso = document.getElementById("result-iso");
  const resultUtc = document.getElementById("result-utc");
  const resultLocal = document.getElementById("result-local");

  function setStatus(element, message, error = false) {
    element.className = error ? "status ts-error" : "status";
    element.textContent = message;
  }

  function validDate(date) {
    return date instanceof Date && !Number.isNaN(date.getTime());
  }

  function renderDate(date) {
    if (!validDate(date)) {
      throw new Error("That date is outside the supported range.");
    }

    const ms = date.getTime();
    const seconds = Math.floor(ms / 1000);

    resultSeconds.textContent = String(seconds);
    resultMilliseconds.textContent = String(ms);
    resultIso.textContent = date.toISOString();
    resultUtc.textContent = date.toUTCString();

    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
    resultLocal.textContent = `${date.toLocaleString()} (${zone})`;
  }

  function detectMilliseconds(value) {
    return Math.abs(value) >= 100000000000;
  }

  function timestampToDate() {
    const raw = tsInput.value.trim();

    if (!raw) {
      setStatus(tsStatus, "Enter a timestamp first.", true);
      return;
    }

    if (!/^-?\d+(?:\.\d+)?$/.test(raw)) {
      setStatus(tsStatus, "Enter a numeric Unix timestamp.", true);
      return;
    }

    const value = Number(raw);

    if (!Number.isFinite(value)) {
      setStatus(tsStatus, "That timestamp is too large.", true);
      return;
    }

    let milliseconds;

    if (tsUnit.value === "milliseconds") {
      milliseconds = value;
    } else if (tsUnit.value === "seconds") {
      milliseconds = value * 1000;
    } else {
      milliseconds = detectMilliseconds(value) ? value : value * 1000;
    }

    const date = new Date(milliseconds);

    try {
      renderDate(date);
      const detected = tsUnit.value === "auto"
        ? (detectMilliseconds(value) ? "milliseconds" : "seconds")
        : tsUnit.value;
      setStatus(tsStatus, `Converted as ${detected}.`);
      setStatus(dateStatus, "");
    } catch (error) {
      setStatus(tsStatus, error.message || "Could not convert this timestamp.", true);
    }
  }

  function pad(number) {
    return String(number).padStart(2, "0");
  }

  function setDateInputs(date) {
    dateInput.value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    timeInput.value = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function dateToTimestamp() {
    if (!dateInput.value) {
      setStatus(dateStatus, "Choose a date first.", true);
      return;
    }

    const parts = dateInput.value.split("-").map(Number);
    const timeParts = (timeInput.value || "00:00:00").split(":").map(Number);

    const [year, month, day] = parts;
    const hour = timeParts[0] || 0;
    const minute = timeParts[1] || 0;
    const second = timeParts[2] || 0;

    let date;

    if (dateZone.value === "utc") {
      date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    } else {
      date = new Date(year, month - 1, day, hour, minute, second);
    }

    if (!validDate(date)) {
      setStatus(dateStatus, "Could not interpret that date and time.", true);
      return;
    }

    try {
      renderDate(date);
      setStatus(dateStatus, dateZone.value === "utc" ? "Converted as UTC." : "Converted as local time.");
      setStatus(tsStatus, "");
    } catch (error) {
      setStatus(dateStatus, error.message || "Could not convert this date.", true);
    }
  }

  tsConvertButton.addEventListener("click", timestampToDate);

  tsNowButton.addEventListener("click", () => {
    const now = Date.now();
    tsInput.value = String(Math.floor(now / 1000));
    tsUnit.value = "seconds";
    renderDate(new Date(now));
    setStatus(tsStatus, "Current time loaded.");
    setStatus(dateStatus, "");
  });

  dateConvertButton.addEventListener("click", dateToTimestamp);

  dateNowButton.addEventListener("click", () => {
    const now = new Date();
    setDateInputs(now);
    dateZone.value = "local";
    renderDate(now);
    setStatus(dateStatus, "Current local time loaded.");
    setStatus(tsStatus, "");
  });

  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      const value = target.textContent;

      if (!value || value === "—") return;

      try {
        await navigator.clipboard.writeText(value);
        const original = button.textContent;
        button.textContent = "Copied";
        window.setTimeout(() => {
          button.textContent = original;
        }, 1200);
      } catch {
        setStatus(tsStatus, "Could not copy automatically.", true);
      }
    });
  });

  setDateInputs(new Date());
})();
