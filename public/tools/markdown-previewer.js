(() => {
  const input = document.getElementById("md-input");
  const preview = document.getElementById("md-preview");
  const count = document.getElementById("md-count");
  const renderStatus = document.getElementById("md-render-status");
  const breaksCheck = document.getElementById("md-breaks");
  const openLinksCheck = document.getElementById("md-open-links");
  const copyHtmlButton = document.getElementById("md-copy-html");
  const downloadHtmlButton = document.getElementById("md-download-html");
  const copyMarkdownButton = document.getElementById("md-copy-markdown");
  const sampleButton = document.getElementById("md-sample");
  const clearButton = document.getElementById("md-clear");
  const status = document.getElementById("md-status");

  let renderedHtml = "";

  function setSuccess(message) {
    status.className = "status";
    status.textContent = message;
  }

  function setError(message) {
    status.className = "status md-error";
    status.textContent = message;
  }

  function updateCount() {
    const text = input.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    count.textContent = `${words.toLocaleString()} ${words === 1 ? "word" : "words"} · ${text.length.toLocaleString()} characters`;
  }

  function rendererAvailable() {
    return typeof window.marked !== "undefined" && typeof window.DOMPurify !== "undefined";
  }

  function render() {
    updateCount();

    if (!rendererAvailable()) {
      preview.textContent = "Markdown renderer could not be loaded. Check your connection and reload the page.";
      renderStatus.textContent = "Renderer unavailable";
      renderedHtml = "";
      return;
    }

    try {
      window.marked.setOptions({
        gfm: true,
        breaks: breaksCheck.checked
      });

      const rawHtml = window.marked.parse(input.value || "");
      renderedHtml = window.DOMPurify.sanitize(rawHtml, {
        USE_PROFILES: { html: true }
      });

      preview.innerHTML = renderedHtml;

      if (openLinksCheck.checked) {
        preview.querySelectorAll("a[href]").forEach((link) => {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        });
      } else {
        preview.querySelectorAll("a[href]").forEach((link) => {
          link.removeAttribute("target");
          link.removeAttribute("rel");
        });
      }

      renderStatus.textContent = "Live preview";
      status.className = "status";
      status.textContent = "";
    } catch (error) {
      preview.textContent = "Could not render this Markdown.";
      renderStatus.textContent = "Render error";
      renderedHtml = "";
      setError(error.message || "Could not render this Markdown.");
    }
  }

  function standaloneHtml() {
    const body = renderedHtml || "<p></p>";
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Markdown Export</title>
<style>
body{max-width:820px;margin:40px auto;padding:0 20px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.7;color:#14231c}
img{max-width:100%;height:auto}
pre{overflow:auto;padding:14px;border-radius:10px;background:#14231c;color:#f7f3e9}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
:not(pre)>code{padding:.15em .35em;border-radius:5px;background:#f3f4f6}
blockquote{margin:1em 0;padding:.2em 1em;border-left:4px solid #22a06b;background:#f4f8f5;color:#53635b}
table{width:100%;border-collapse:collapse}
th,td{padding:8px 10px;border:1px solid #d9dedb;text-align:left}
th{background:#f4f8f5}
</style>
</head>
<body>
${body}
</body>
</html>`;
  }

  async function copyText(text, successMessage) {
    if (!text) {
      setError("There is nothing to copy yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setSuccess(successMessage);
    } catch {
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.focus();
      temp.select();

      try {
        document.execCommand("copy");
        setSuccess(successMessage);
      } catch {
        setError("Could not copy automatically.");
      } finally {
        temp.remove();
      }
    }
  }

  input.addEventListener("input", render);
  breaksCheck.addEventListener("change", render);
  openLinksCheck.addEventListener("change", render);

  copyHtmlButton.addEventListener("click", () => {
    if (!input.value.trim()) {
      setError("Enter some Markdown first.");
      return;
    }
    copyText(renderedHtml, "HTML copied.");
  });

  copyMarkdownButton.addEventListener("click", () => {
    if (!input.value) {
      setError("Enter some Markdown first.");
      return;
    }
    copyText(input.value, "Markdown copied.");
  });

  downloadHtmlButton.addEventListener("click", () => {
    if (!input.value.trim()) {
      setError("Enter some Markdown first.");
      return;
    }

    const blob = new Blob([standaloneHtml()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "markdown-preview.html";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);

    setSuccess("Download started.");
  });

  sampleButton.addEventListener("click", () => {
    input.value = `# PocketWorkshop Markdown Preview

Write **Markdown** on the left and see the rendered result on the right.

## Example list

- Fast live preview
- Tables and code blocks
- Copy or download HTML

> Everything you type stays in your browser.

### Table

| Tool | Status |
| --- | --- |
| Markdown Previewer | Ready |
| More tools | Coming soon |

### Code

\`\`\`js
const message = "Hello, PocketWorkshop!";
console.log(message);
\`\`\`

[Visit PocketWorkshop](/)`;

    render();
    setSuccess("Sample loaded.");
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    renderedHtml = "";
    render();
    input.focus();
  });

  render();
})();
