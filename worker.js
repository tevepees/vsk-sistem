/**
 * VSK Sistem — Cloudflare Worker
 * Routing clean URLs → static HTML files
 *
 * Routes:
 *   /                → index.html    (homepage/portal)
 *   /produksi        → produksi.html
 *   /rawmat          → rawmat.html
 *   /penjualan       → penjualan.html
 *   /ceo-dashboard   → ceo-dashboard.html
 *
 * Semua path lain (aset: shared.css, logo.svg, sw.js, dll)
 * langsung di-forward ke ASSETS tanpa perubahan.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';

    const routes = {
      '/':               '/index.html',
      '/produksi':       '/produksi.html',
      '/rawmat':         '/rawmat.html',
      '/penjualan':      '/penjualan.html',
      '/ceo-dashboard':  '/ceo-dashboard.html',
    };

    if (routes[path]) {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = routes[path];
      return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
    }

    // Static assets (css, js, images, manifest, sw, dll) — langsung serve
    return env.ASSETS.fetch(request);
  }
};
