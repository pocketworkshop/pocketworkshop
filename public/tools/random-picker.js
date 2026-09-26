(() => {
  const input = document.getElementById("picker-input");
  const count = document.getElementById("picker-count");
  const numberInput = document.getElementById("picker-number");
  const trimInput = document.getElementById("picker-trim");
  const emptyInput = document.getElementById("picker-empty");
  const duplicateInput = document.getElementById("picker-duplicates");
  const repeatInput = document.getElementById("picker-repeat");
  const pickButton = document.getElementById("picker-pick");
  const shuffleButton = document.getElementById("picker-shuffle");
  const sampleButton = document.getElementById("picker-sample");
  const clearButton = document.getElementById("picker-clear");
  const copyButton = document.getElementById("picker-copy");
  const result = document.getElementById("picker-result");
  const status = document.getElementById("picker-status");
  let lastPicks = [];

  function secureRandomInt(max) {
    if (!Number.isSafeInteger(max) || max <= 0) throw new Error("Random range must be a positive integer.");
    if (!window.crypto || !window.crypto.getRandomValues) return Math.floor(Math.random() * max);
    const range = 0x100000000;
    const limit = Math.floor(range / max) * max;
    const array = new Uint32Array(1);
    let value;
    do {
      window.crypto.getRandomValues(array);
      value = array[0];
    } while (value >= limit);
    return value % max;
  }

  function getItems() {
    let items = input.value.replace(/\r\n?/g, "\n").split("\n");
    if (trimInput.checked) items = items.map(item => item.trim());
    if (emptyInput.checked) items = items.filter(item => item !== "");
    if (duplicateInput.checked) {
      const seen = new Set();
      items = items.filter(item => {
        if (seen.has(item)) return false;
        seen.add(item);
        return true;
      });
    }
    return items;
  }

  function updateCount() {
    const items = getItems();
    count.textContent = `${items.length.toLocaleString()} ${items.length === 1 ? "item" : "items"}`;
  }

  function shuffleArray(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function renderPicks(picks) {
    lastPicks = picks.slice();
    if (!picks.length) {
      result.innerHTML = '<div class="picker-empty">Your random pick will appear here.</div>';
      return;
    }
    const list = document.createElement("ol");
    list.className = "picker-result-list";
    picks.forEach((value, index) => {
      const li = document.createElement("li");
      const rank = document.createElement("span");
      const text = document.createElement("span");
      rank.className = "picker-rank";
      rank.textContent = String(index + 1);
      text.className = "picker-value";
      text.textContent = value;
      li.append(rank, text);
      list.appendChild(li);
    });
    result.replaceChildren(list);
  }

  function pick() {
    status.textContent = "";
    status.classList.remove("picker-error");
    const items = getItems();
    const howMany = Math.round(Number(numberInput.value));

    if (!items.length) {
      renderPicks([]);
      status.textContent = "Enter at least one item.";
      status.classList.add("picker-error");
      return;
    }
    if (!Number.isFinite(howMany) || howMany < 1 || howMany > 1000) {
      status.textContent = "Number of picks must be between 1 and 1,000.";
      status.classList.add("picker-error");
      return;
    }
    if (!repeatInput.checked && howMany > items.length) {
      status.textContent = `You asked for ${howMany} picks, but only ${items.length} selectable items are available.`;
      status.classList.add("picker-error");
      return;
    }

    const picks = [];
    if (repeatInput.checked) {
      for (let i = 0; i < howMany; i++) picks.push(items[secureRandomInt(items.length)]);
    } else {
      picks.push(...shuffleArray(items).slice(0, howMany));
    }
    renderPicks(picks);
    status.textContent = `${picks.length} ${picks.length === 1 ? "item" : "items"} picked.`;
  }

  function shuffleInput() {
    const items = getItems();
    if (!items.length) {
      status.textContent = "Enter at least one item.";
      status.classList.add("picker-error");
      return;
    }
    input.value = shuffleArray(items).join("\n");
    updateCount();
    renderPicks([]);
    status.textContent = "List shuffled.";
    status.classList.remove("picker-error");
  }

  async function copyResults() {
    if (!lastPicks.length) {
      status.textContent = "Pick something first.";
      return;
    }
    const text = lastPicks.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = "Result copied.";
    } catch {
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.select();
      try {
        document.execCommand("copy");
        status.textContent = "Result copied.";
      } catch {
        status.textContent = "Could not copy automatically.";
      }
      temp.remove();
    }
  }

  input.addEventListener("input", () => {
    updateCount();
    status.textContent = "";
    status.classList.remove("picker-error");
  });
  [trimInput, emptyInput, duplicateInput].forEach(option => option.addEventListener("change", updateCount));
  pickButton.addEventListener("click", pick);
  shuffleButton.addEventListener("click", shuffleInput);
  copyButton.addEventListener("click", copyResults);

  sampleButton.addEventListener("click", () => {
    input.value = ["Pizza","Sushi","Tacos","Curry","Burgers","Pasta","Salad","Ramen"].join("\n");
    numberInput.value = "1";
    updateCount();
    renderPicks([]);
    status.textContent = "Sample list loaded.";
    status.classList.remove("picker-error");
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    numberInput.value = "1";
    trimInput.checked = true;
    emptyInput.checked = true;
    duplicateInput.checked = true;
    repeatInput.checked = false;
    lastPicks = [];
    updateCount();
    renderPicks([]);
    status.textContent = "";
    status.classList.remove("picker-error");
    input.focus();
  });

  numberInput.addEventListener("keydown", event => {
    if (event.key === "Enter") pick();
  });

  updateCount();
})();
