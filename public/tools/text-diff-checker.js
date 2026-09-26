(() => {
  const left = document.getElementById("diff-left");
  const right = document.getElementById("diff-right");
  const leftCount = document.getElementById("diff-left-count");
  const rightCount = document.getElementById("diff-right-count");
  const ignoreCase = document.getElementById("diff-ignore-case");
  const ignoreWhitespace = document.getElementById("diff-ignore-whitespace");
  const collapseSpaces = document.getElementById("diff-collapse-spaces");
  const compareButton = document.getElementById("diff-compare");
  const swapButton = document.getElementById("diff-swap");
  const sampleButton = document.getElementById("diff-sample");
  const clearButton = document.getElementById("diff-clear");
  const status = document.getElementById("diff-status");
  const result = document.getElementById("diff-result");
  const statSame = document.getElementById("diff-stat-same");
  const statAdded = document.getElementById("diff-stat-added");
  const statRemoved = document.getElementById("diff-stat-removed");
  const statTotal = document.getElementById("diff-stat-total");

  function setSuccess(message) {
    status.className = "status";
    status.textContent = message;
  }

  function setError(message) {
    status.className = "status diff-error";
    status.textContent = message;
  }

  function lineCount(text) {
    if (!text) return 0;
    return text.split(/\r?\n/).length;
  }

  function updateCounts() {
    leftCount.textContent = `${lineCount(left.value).toLocaleString()} lines · ${left.value.length.toLocaleString()} characters`;
    rightCount.textContent = `${lineCount(right.value).toLocaleString()} lines · ${right.value.length.toLocaleString()} characters`;
  }

  function normalizeLine(line) {
    let value = line;

    if (ignoreWhitespace.checked) {
      value = value.trim();
    }

    if (collapseSpaces.checked) {
      value = value.replace(/\s+/g, " ");
    }

    if (ignoreCase.checked) {
      value = value.toLocaleLowerCase();
    }

    return value;
  }

  function makeMatrix(a, b) {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const cellCount = rows * cols;

    if (cellCount > 2500000) {
      throw new Error("These texts are too large for aligned comparison. Try comparing smaller sections.");
    }

    const matrix = new Uint32Array(cellCount);
    const at = (i, j) => i * cols + j;

    for (let i = a.length - 1; i >= 0; i -= 1) {
      for (let j = b.length - 1; j >= 0; j -= 1) {
        if (a[i].key === b[j].key) {
          matrix[at(i, j)] = matrix[at(i + 1, j + 1)] + 1;
        } else {
          matrix[at(i, j)] = Math.max(
            matrix[at(i + 1, j)],
            matrix[at(i, j + 1)]
          );
        }
      }
    }

    return { matrix, cols, at };
  }

  function buildDiff(leftLines, rightLines) {
    const a = leftLines.map((text, index) => ({
      text,
      line: index + 1,
      key: normalizeLine(text)
    }));

    const b = rightLines.map((text, index) => ({
      text,
      line: index + 1,
      key: normalizeLine(text)
    }));

    const { matrix, at } = makeMatrix(a, b);
    const rows = [];
    let i = 0;
    let j = 0;

    while (i < a.length && j < b.length) {
      if (a[i].key === b[j].key) {
        rows.push({ type: "same", left: a[i], right: b[j] });
        i += 1;
        j += 1;
      } else if (matrix[at(i + 1, j)] >= matrix[at(i, j + 1)]) {
        rows.push({ type: "removed", left: a[i], right: null });
        i += 1;
      } else {
        rows.push({ type: "added", left: null, right: b[j] });
        j += 1;
      }
    }

    while (i < a.length) {
      rows.push({ type: "removed", left: a[i], right: null });
      i += 1;
    }

    while (j < b.length) {
      rows.push({ type: "added", left: null, right: b[j] });
      j += 1;
    }

    return rows;
  }

  function makeCell(className, text) {
    const div = document.createElement("div");
    div.className = className;
    div.textContent = text;
    return div;
  }

  function renderRows(rows) {
    result.innerHTML = "";

    let same = 0;
    let added = 0;
    let removed = 0;

    rows.forEach((row) => {
      const line = document.createElement("div");
      line.className = "diff-row";

      if (row.type === "same") same += 1;
      if (row.type === "added") added += 1;
      if (row.type === "removed") removed += 1;

      const leftNo = makeCell("diff-line-no", row.left ? String(row.left.line) : "");
      const leftText = makeCell(
        `diff-line${row.type === "removed" ? " diff-removed" : ""}`,
        row.left ? row.left.text : ""
      );

      const rightNo = makeCell("diff-line-no", row.right ? String(row.right.line) : "");
      const rightText = makeCell(
        `diff-line${row.type === "added" ? " diff-added" : ""}`,
        row.right ? row.right.text : ""
      );

      line.append(leftNo, leftText, rightNo, rightText);
      result.appendChild(line);
    });

    statSame.textContent = same.toLocaleString();
    statAdded.textContent = added.toLocaleString();
    statRemoved.textContent = removed.toLocaleString();
    statTotal.textContent = rows.length.toLocaleString();
  }

  function compare() {
    if (!left.value && !right.value) {
      setError("Paste text into at least one side first.");
      return;
    }

    try {
      const leftLines = left.value.replace(/\r\n?/g, "\n").split("\n");
      const rightLines = right.value.replace(/\r\n?/g, "\n").split("\n");
      const rows = buildDiff(leftLines, rightLines);

      renderRows(rows);

      const changed = Number(statAdded.textContent.replace(/,/g, "")) +
        Number(statRemoved.textContent.replace(/,/g, ""));

      setSuccess(changed === 0 ? "No differences found." : "Comparison complete.");
    } catch (error) {
      setError(error.message || "Could not compare these texts.");
    }
  }

  [left, right].forEach((field) => {
    field.addEventListener("input", () => {
      updateCounts();
      status.className = "status";
      status.textContent = "";
    });
  });

  [ignoreCase, ignoreWhitespace, collapseSpaces].forEach((control) => {
    control.addEventListener("change", () => {
      if (left.value || right.value) compare();
    });
  });

  compareButton.addEventListener("click", compare);

  swapButton.addEventListener("click", () => {
    const temp = left.value;
    left.value = right.value;
    right.value = temp;
    updateCounts();
    if (left.value || right.value) compare();
    else setSuccess("Sides swapped.");
  });

  sampleButton.addEventListener("click", () => {
    left.value = `PocketWorkshop tools
Word Counter
Image Resizer
PDF Merge
Simple tools are useful.`;

    right.value = `PocketWorkshop tools
Word Counter
Text Cleaner
Image Resizer
PDF Merge
Simple tools can be very useful.`;

    updateCounts();
    compare();
    setSuccess("Sample loaded and compared.");
  });

  clearButton.addEventListener("click", () => {
    left.value = "";
    right.value = "";
    result.innerHTML = '<div class="diff-empty">Compare two texts to see the differences here.</div>';
    statSame.textContent = "0";
    statAdded.textContent = "0";
    statRemoved.textContent = "0";
    statTotal.textContent = "0";
    status.className = "status";
    status.textContent = "";
    updateCounts();
    left.focus();
  });

  updateCounts();
})();
