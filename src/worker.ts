export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);

    // Serve index.html for the root path so the static site loads on Pages.
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const index = `<!doctype html><html><head><meta charset="utf-8"><title>sour.ai</title></head><body><div id="root"></div><script>/* Replace with built assets served from /assets */</script></body></html>`;
      return new Response(index, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // Default 404 for all other routes — replace with real API handling as needed.
    return new Response('Not Found', { status: 404 });
  },
};
