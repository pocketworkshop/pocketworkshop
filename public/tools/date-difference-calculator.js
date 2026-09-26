(() => {
  const startInput = document.getElementById("date-start");
  const endInput = document.getElementById("date-end");
  const inclusiveInput = document.getElementById("date-inclusive");
  const absInput = document.getElementById("date-abs");

  const calculateButton = document.getElementById("date-calculate");
  const swapButton = document.getElementById("date-swap");
  const todayButton = document.getElementById("date-today");
  const clearButton = document.getElementById("date-clear");
  const status = document.getElementById("date-status");

  const daysOutput = document.getElementById("date-days");
  const weeksOutput = document.getElementById("date-weeks");
  const weekdaysOutput = document.getElementById("date-weekdays");
  const weekendDaysOutput = document.getElementById("date-weekend-days");
  const calendarOutput = document.getElementById("date-calendar-diff");
  const rangeOutput = document.getElementById("date-range");

  const DAY_MS = 86400000;

  function parseDateValue(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

    const [year, month, day] = value.split("-").map(Number);
    const utc = new Date(Date.UTC(year, month - 1, day));

    if (
      utc.getUTCFullYear() !== year ||
      utc.getUTCMonth() !== month - 1 ||
      utc.getUTCDate() !== day
    ) return null;

    return utc;
  }

  function toInputDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  function formatSigned(value) {
    return value.toLocaleString();
  }

  function addUtcYearsMonths(date, years, months) {
    const year = date.getUTCFullYear() + years;
    const month = date.getUTCMonth() + months;
    const day = date.getUTCDate();

    const first = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, lastDay)));
  }

  function calendarDiff(start, end) {
    let sign = 1;
    let a = start;
    let b = end;

    if (a > b) {
      sign = -1;
      a = end;
      b = start;
    }

    let years = b.getUTCFullYear() - a.getUTCFullYear();
    let cursor = addUtcYearsMonths(a, years, 0);

    if (cursor > b) {
      years -= 1;
      cursor = addUtcYearsMonths(a, years, 0);
    }

    let months =
      (b.getUTCFullYear() - cursor.getUTCFullYear()) * 12 +
      (b.getUTCMonth() - cursor.getUTCMonth());

    let monthCursor = addUtcYearsMonths(cursor, 0, months);

    if (monthCursor > b) {
      months -= 1;
      monthCursor = addUtcYearsMonths(cursor, 0, months);
    }

    const days = Math.round((b - monthCursor) / DAY_MS);

    return { years: years * sign, months: months * sign, days: days * sign };
  }

  function plural(value, singular) {
    return `${Math.abs(value).toLocaleString()} ${singular}${Math.abs(value) === 1 ? "" : "s"}`;
  }

  function countWeekdays(start, end, inclusive) {
    let a = start;
    let b = end;

    if (a > b) [a, b] = [b, a];

    let cursor = new Date(a.getTime());
    const final = new Date(b.getTime());
    let weekdays = 0;
    let weekendDays = 0;

    while (cursor < final || (inclusive && cursor <= final)) {
      const day = cursor.getUTCDay();
      if (day === 0 || day === 6) weekendDays += 1;
      else weekdays += 1;
      cursor = new Date(cursor.getTime() + DAY_MS);
    }

    return { weekdays, weekendDays };
  }

  function resetOutputs() {
    daysOutput.textContent = "0";
    weeksOutput.textContent = "0";
    weekdaysOutput.textContent = "0";
    weekendDaysOutput.textContent = "0";
    calendarOutput.textContent = "0 years, 0 months, 0 days";
    rangeOutput.textContent = "Choose two dates to calculate the difference.";
  }

  function calculate() {
    status.textContent = "";
    status.classList.remove("date-error");

    const start = parseDateValue(startInput.value);
    const end = parseDateValue(endInput.value);

    if (!start || !end) {
      resetOutputs();
      status.textContent = "Choose both a valid start date and end date.";
      status.classList.add("date-error");
      return;
    }

    const rawDays = Math.round((end - start) / DAY_MS);
    const inclusiveAdjustment = inclusiveInput.checked ? (rawDays >= 0 ? 1 : -1) : 0;
    let days = rawDays + inclusiveAdjustment;

    const cal = calendarDiff(start, end);
    let displayCal = cal;

    if (absInput.checked) {
      days = Math.abs(days);
      displayCal = {
        years: Math.abs(cal.years),
        months: Math.abs(cal.months),
        days: Math.abs(cal.days)
      };
    }

    const weekValue = days / 7;
    const weekdayCounts = countWeekdays(start, end, inclusiveInput.checked);

    daysOutput.textContent = formatSigned(days);
    weeksOutput.textContent = Number.isInteger(weekValue)
      ? weekValue.toLocaleString()
      : Number(weekValue.toFixed(2)).toLocaleString();

    weekdaysOutput.textContent = weekdayCounts.weekdays.toLocaleString();
    weekendDaysOutput.textContent = weekdayCounts.weekendDays.toLocaleString();

    const calendarParts = [
      plural(displayCal.years, "year"),
      plural(displayCal.months, "month"),
      plural(displayCal.days, "day")
    ];

    calendarOutput.textContent = calendarParts.join(", ");

    const direction = start.getTime() === end.getTime()
      ? "Same date"
      : start < end
        ? "Start → End"
        : "End is before start";

    const inclusiveNote = inclusiveInput.checked ? " · inclusive count" : "";
    rangeOutput.textContent = `${formatDate(start)} → ${formatDate(end)} · ${direction}${inclusiveNote}`;

    status.textContent = "Done.";
  }

  calculateButton.addEventListener("click", calculate);

  swapButton.addEventListener("click", () => {
    const temp = startInput.value;
    startInput.value = endInput.value;
    endInput.value = temp;
    calculate();
  });

  todayButton.addEventListener("click", () => {
    endInput.value = toInputDate(new Date());
    if (startInput.value) calculate();
    else status.textContent = "End date set to today.";
  });

  clearButton.addEventListener("click", () => {
    startInput.value = "";
    endInput.value = "";
    inclusiveInput.checked = false;
    absInput.checked = true;
    status.textContent = "";
    status.classList.remove("date-error");
    resetOutputs();
    startInput.focus();
  });

  [startInput, endInput].forEach(input => {
    input.addEventListener("change", () => {
      status.textContent = "";
      status.classList.remove("date-error");
    });
  });

  [inclusiveInput, absInput].forEach(input => {
    input.addEventListener("change", () => {
      if (startInput.value && endInput.value) calculate();
    });
  });

  // Friendly defaults: one month ending today.
  const today = new Date();
  const endDefault = toInputDate(today);
  const startDefaultDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  startInput.value = toInputDate(startDefaultDate);
  endInput.value = endDefault;
  calculate();
})();
