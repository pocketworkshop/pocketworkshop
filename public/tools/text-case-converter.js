(() => {
  const input = document.getElementById("case-input");
  const output = document.getElementById("case-output");
  const inputCount = document.getElementById("case-input-count");
  const outputCount = document.getElementById("case-output-count");
  const copyButton = document.getElementById("case-copy-button");
  const useResultButton = document.getElementById("case-use-result-button");
  const clearButton = document.getElementById("case-clear-button");
  const status = document.getElementById("case-status");
  const buttons = document.querySelectorAll("[data-case]");

  const SMALL_WORDS = new Set([
    "a", "an", "and", "as", "at", "but", "by", "for", "in",
    "nor", "of", "on", "or", "per", "the", "to", "vs", "via"
  ]);

  function pluralCharacters(length) {
    return `${length.toLocaleString()} ${length === 1 ? "character" : "characters"}`;
  }

  function updateCounts() {
    inputCount.textContent = pluralCharacters(input.value.length);
    outputCount.textContent = pluralCharacters(output.value.length);
  }

  function capitalizeWord(word) {
    return word.replace(/[A-Za-z]+/, (letters) =>
      letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase()
    );
  }

  function toTitleCase(text) {
    return text
      .toLowerCase()
      .split(/(\s+)/)
      .map((token, index, tokens) => {
        if (/^\s+$/.test(token) || token === "") return token;

        const lettersOnly = token.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
        const isFirstWord = !tokens.slice(0, index).some((item) => /[A-Za-z]/.test(item));
        const isLastWord = !tokens.slice(index + 1).some((item) => /[A-Za-z]/.test(item));

        if (!isFirstWord && !isLastWord && SMALL_WORDS.has(lettersOnly)) {
          return token;
        }

        return capitalizeWord(token);
      })
      .join("");
  }

  function toSentenceCase(text) {
    const lower = text.toLowerCase();
    let capitalizeNext = true;
    let result = "";

    for (const char of lower) {
      if (capitalizeNext && /[a-z]/i.test(char)) {
        result += char.toUpperCase();
        capitalizeNext = false;
      } else {
        result += char;
      }

      if (/[.!?]/.test(char)) {
        capitalizeNext = true;
      }
    }

    return result;
  }

  function capitalizeEachWord(text) {
    return text.toLowerCase().replace(/\b([a-z])/g, (match) => match.toUpperCase());
  }

  function removeExtraSpaces(text) {
    return text
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function convert(type) {
    const text = input.value;

    if (!text) {
      output.value = "";
      status.textContent = "Enter some text first.";
      updateCounts();
      return;
    }

    switch (type) {
      case "upper":
        output.value = text.toUpperCase();
        status.textContent = "Converted to uppercase.";
        break;
      case "lower":
        output.value = text.toLowerCase();
        status.textContent = "Converted to lowercase.";
        break;
      case "title":
        output.value = toTitleCase(text);
        status.textContent = "Converted to title case.";
        break;
      case "sentence":
        output.value = toSentenceCase(text);
        status.textContent = "Converted to sentence case.";
        break;
      case "capitalize":
        output.value = capitalizeEachWord(text);
        status.textContent = "Capitalized each word.";
        break;
      case "spaces":
        output.value = removeExtraSpaces(text);
        status.textContent = "Extra spaces removed.";
        break;
      default:
        return;
    }

    updateCounts();
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => convert(button.dataset.case));
  });

  input.addEventListener("input", () => {
    status.textContent = "";
    updateCounts();
  });

  output.addEventListener("input", () => {
    status.textContent = "";
    updateCounts();
  });

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      status.textContent = "Create a result first.";
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = "Copied.";
    } catch (error) {
      output.focus();
      output.select();

      try {
        document.execCommand("copy");
        status.textContent = "Copied.";
      } catch (fallbackError) {
        status.textContent = "Could not copy automatically. Select the result and copy it manually.";
      }
    }
  });

  useResultButton.addEventListener("click", () => {
    if (!output.value) {
      status.textContent = "Create a result first.";
      return;
    }

    input.value = output.value;
    status.textContent = "Result moved to input.";
    updateCounts();
    input.focus();
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    output.value = "";
    status.textContent = "";
    updateCounts();
    input.focus();
  });

  updateCounts();
})();
