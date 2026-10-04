const PRODUCTION_ORIGIN = "https://pocketworkshop.pwtools.workers.dev";

function cleanPath(pathname) {
  if (!pathname || pathname === "/") return "/";
  const cleaned = pathname
    .replace(/\.html$/i, "")
    .replace(/\/+$/, "");
  return cleaned || "/";
}

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const url = new URL(request.url);
    const pathname = url.pathname;
    const contentType = String(response.headers.get("content-type") || "");

    // Redirects and non-HTML assets pass through unchanged.
    if (
      request.method !== "GET" ||
      response.status !== 200 ||
      !contentType.includes("text/html")
    ) {
      return response;
    }

    const canonicalUrl = PRODUCTION_ORIGIN + cleanPath(pathname);
    const isToolPage = cleanPath(pathname).startsWith("/tools/");

    const canonicalHandler = {
      element(element) {
        element.setAttribute("href", canonicalUrl);
      }
    };

    const ogUrlHandler = {
      element(element) {
        element.setAttribute("content", canonicalUrl);
      }
    };

    const bodyHandler = {
      element(element) {
        if (isToolPage) {
          element.append(
            '<script src="/tools/related-tools.js"></script>',
            { html: true }
          );
        }
      }
    };

    return new HTMLRewriter()
      .on('link[rel="canonical"]', canonicalHandler)
      .on('meta[property="og:url"]', ogUrlHandler)
      .on("body", bodyHandler)
      .transform(response);
  }
};
