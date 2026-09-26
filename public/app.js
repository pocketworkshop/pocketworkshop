const input = document.getElementById("text-input");
const wordsEl = document.getElementById("words");
const charsEl = document.getElementById("characters");
const noSpacesEl = document.getElementById("characters-no-spaces");
const sentencesEl = document.getElementById("sentences");
const paragraphsEl = document.getElementById("paragraphs");
const readingEl = document.getElementById("reading-time");
const clearButton = document.getElementById("clear-button");
const copyButton = document.getElementById("copy-button");
const copyStatus = document.getElementById("copy-status");

function countText(text) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/u).filter(Boolean).length : 0;
  const characters = text.length;
  const noSpaces = text.replace(/\s/gu, "").length;
  const paragraphs = trimmed
    ? trimmed.split(/\n\s*\n/u).filter(p => p.trim().length > 0).length
    : 0;

  const sentenceMatches = trimmed.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/gu);
  const sentences = trimmed && sentenceMatches ? sentenceMatches.length : 0;

  const minutes = words === 0 ? 0 : Math.max(1, Math.ceil(words / 225));

  return { words, characters, noSpaces, sentences, paragraphs, minutes };
}

function update() {
  const stats = countText(input.value);
  wordsEl.textContent = stats.words.toLocaleString();
  charsEl.textContent = stats.characters.toLocaleString();
  noSpacesEl.textContent = stats.noSpaces.toLocaleString();
  sentencesEl.textContent = stats.sentences.toLocaleString();
  paragraphsEl.textContent = stats.paragraphs.toLocaleString();
  readingEl.textContent = `${stats.minutes} min`;
}

input.addEventListener("input", update);

clearButton.addEventListener("click", () => {
  input.value = "";
  copyStatus.textContent = "";
  update();
  input.focus();
});

copyButton.addEventListener("click", async () => {
  if (!input.value) {
    copyStatus.textContent = "Nothing to copy";
    return;
  }

  try {
    await navigator.clipboard.writeText(input.value);
    copyStatus.textContent = "Copied";
  } catch {
    input.select();
    document.execCommand("copy");
    copyStatus.textContent = "Copied";
  }

  window.setTimeout(() => {
    copyStatus.textContent = "";
  }, 1800);
});

update();
