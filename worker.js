export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const pathname = new URL(request.url).pathname;
    const contentType = String(response.headers.get("content-type") || "");

    // Only enhance successful HTML tool pages.
    // Redirects (including .html -> clean URL) and non-HTML assets pass through unchanged.
    if (
      request.method !== "GET" ||
      response.status !== 200 ||
      !pathname.startsWith("/tools/") ||
      !contentType.includes("text/html")
    ) {
      return response;
    }

    return new HTMLRewriter()
      .on("body", {
        element(element) {
          element.append(
            '<script src="/tools/related-tools.js"></script>',
            { html: true }
          );
        }
      })
      .transform(response);
  }
};
