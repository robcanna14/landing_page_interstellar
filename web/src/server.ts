import app from "./api";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import Index from "./web/pages/index";

const port = Number(process.env.PORT ?? 3000);
const distDir = `${import.meta.dir}/../dist`;
const indexPath = `${distDir}/index.html`;

// Build SSR HTML once on startup and cache it
let ssrHtml: string | null = null;

async function getSSRHtml(): Promise<string> {
  if (ssrHtml) return ssrHtml;

  // Read the built index.html template
  const templateFile = Bun.file(indexPath);
  if (!(await templateFile.exists())) {
    // During dev (no dist), use a minimal template
    const appHtml = renderToString(createElement(Index));
    return `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Interstellar Trading</title></head><body><div id="root">${appHtml}</div></body></html>`;
  }

  const template = await templateFile.text();
  const appHtml = renderToString(createElement(Index));
  ssrHtml = template.replace("<!--app-html-->", appHtml);
  return ssrHtml;
}

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api")) {
      return app.fetch(request);
    }

    // Known page routes — always SSR, never treat as assets
    const pageRoutes = ["/", "/review"];
    const isPageRoute = pageRoutes.includes(url.pathname);

    // For asset requests (JS, CSS, images etc.) serve from dist
    const isAsset = !isPageRoute && !url.pathname.endsWith(".html");
    if (isAsset) {
      const filePath = getStaticFilePath(url.pathname);
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file);
      }
    }

    // SSR: render the page and return full HTML with content inline
    try {
      const html = await getSSRHtml();
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      });
    } catch (err) {
      console.error("SSR render error:", err);
      // Fallback: serve static index.html if SSR fails
      const index = Bun.file(indexPath);
      if (await index.exists()) {
        return new Response(index, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      return new Response("Build output not found. Run `bun run build` first.", {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  },
});

console.log(`Web server listening on http://localhost:${server.port}`);

function getStaticFilePath(pathname: string) {
  const cleanPath = decodeURIComponent(pathname)
    .replace(/^\/+/, "")
    .replaceAll("..", "");

  return cleanPath ? `${distDir}/${cleanPath}` : indexPath;
}
