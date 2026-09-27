export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);

    // The route configuration already limits this Worker to /tools/*.html.
    // These checks keep the behavior safe if the routing is changed later.
    if (
      request.method !== "GET" ||
      response.status !== 200 ||
      !new URL(request.url).pathname.startsWith("/tools/") ||
      !new URL(request.url).pathname.endsWith(".html") ||
      !String(response.headers.get("content-type") || "").includes("text/html")
    ) {
      return response;
    }

    try {
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
    } catch {
      // Fail open: if the enhancement cannot be applied, serve the original page.
      return response;
    }
  }
};
