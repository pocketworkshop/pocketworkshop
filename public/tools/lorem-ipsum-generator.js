(() => {
  const typeSelect = document.getElementById("lorem-type");
  const amountInput = document.getElementById("lorem-amount");
  const lengthSelect = document.getElementById("lorem-length");
  const classicStart = document.getElementById("lorem-classic-start");
  const output = document.getElementById("lorem-output");
  const count = document.getElementById("lorem-count");
  const generateButton = document.getElementById("lorem-generate-button");
  const copyButton = document.getElementById("lorem-copy-button");
  const clearButton = document.getElementById("lorem-clear-button");
  const status = document.getElementById("lorem-status");

  const CLASSIC = ["lorem","ipsum","dolor","sit","amet","consectetur","adipiscing","elit"];

  const WORDS = [
    "lorem","ipsum","dolor","sit","amet","consectetur","adipiscing","elit",
    "sed","do","eiusmod","tempor","incididunt","ut","labore","et","dolore",
    "magna","aliqua","enim","ad","minim","veniam","quis","nostrud",
    "exercitation","ullamco","laboris","nisi","aliquip","ex","ea","commodo",
    "consequat","duis","aute","irure","in","reprehenderit","voluptate","velit",
    "esse","cillum","eu","fugiat","nulla","pariatur","excepteur","sint",
    "occaecat","cupidatat","non","proident","sunt","culpa","qui","officia",
    "deserunt","mollit","anim","id","est","laborum","phasellus","viverra",
    "mauris","integer","feugiat","scelerisque","varius","morbi","enim","nunc",
    "faucibus","ornare","suspendisse","potenti","mattis","rhoncus","urna",
    "neque","vulputate","dignissim","sodales","porttitor","lacus","luctus",
    "accumsan","tortor","posuere","ac","ut","consequat","semper","donec",
    "massa","sapien","pellentesque","habitant","tristique","senectus","netus"
  ];

  const sentenceRanges = {
    short: [5, 9],
    medium: [9, 15],
    long: [15, 24]
  };

  const paragraphRanges = {
    short: [2, 3],
    medium: [4, 6],
    long: [7, 9]
  };

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomWord() {
    return WORDS[randomInt(0, WORDS.length - 1)];
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function makeSentence(length, forcedStartWords = null) {
    const [minWords, maxWords] = sentenceRanges[length];
    const target = randomInt(minWords, maxWords);
    const words = [];

    if (forcedStartWords && forcedStartWords.length) {
      words.push(...forcedStartWords);
    }

    while (words.length < target) {
      words.push(randomWord());
    }

    const punctuation = Math.random() < 0.12 ? "?" : ".";
    return capitalize(words.slice(0, target).join(" ")) + punctuation;
  }

  function makeParagraph(length, startClassic = false) {
    const [minSentences, maxSentences] = paragraphRanges[length];
    const total = randomInt(minSentences, maxSentences);
    const sentences = [];

    for (let i = 0; i < total; i += 1) {
      const forced = i === 0 && startClassic ? CLASSIC : null;
      sentences.push(makeSentence(length, forced));
    }

    return sentences.join(" ");
  }

  function wordTargetMultiplier(length) {
    if (length === "short") return 8;
    if (length === "long") return 24;
    return 15;
  }

  function makeWords(amount, length, startClassic) {
    const total = Math.min(5000, Math.max(1, amount * wordTargetMultiplier(length)));
    const words = [];

    if (startClassic) {
      words.push(...CLASSIC);
    }

    while (words.length < total) {
      words.push(randomWord());
    }

    return words.slice(0, total).join(" ");
  }

  function updateCount() {
    const text = output.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    count.textContent = `${words.toLocaleString()} ${words === 1 ? "word" : "words"} · ${text.length.toLocaleString()} characters`;
  }

  function generate() {
    const type = typeSelect.value;
    const length = lengthSelect.value;
    const amount = Math.min(100, Math.max(1, Number(amountInput.value) || 1));
    amountInput.value = amount;

    let result = "";

    if (type === "paragraphs") {
      const paragraphs = [];
      for (let i = 0; i < amount; i += 1) {
        paragraphs.push(makeParagraph(length, classicStart.checked && i === 0));
      }
      result = paragraphs.join("\n\n");
    } else if (type === "sentences") {
      const sentences = [];
      for (let i = 0; i < amount; i += 1) {
        sentences.push(makeSentence(length, classicStart.checked && i === 0 ? CLASSIC : null));
      }
      result = sentences.join(" ");
    } else {
      result = makeWords(amount, length, classicStart.checked);
    }

    output.value = result;
    status.textContent = "Generated.";
    updateCount();
  }

  generateButton.addEventListener("click", generate);

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      status.textContent = "Generate some text first.";
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
        status.textContent = "Could not copy automatically. Select the text and copy it manually.";
      }
    }
  });

  clearButton.addEventListener("click", () => {
    output.value = "";
    status.textContent = "";
    updateCount();
  });

  output.addEventListener("input", updateCount);

  typeSelect.addEventListener("change", () => {
    if (typeSelect.value === "words") {
      amountInput.max = "100";
    } else {
      amountInput.max = "100";
    }
  });

  generate();
})();
