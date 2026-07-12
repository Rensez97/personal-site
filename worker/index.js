// Worker entry point for the personal site.
//
// The static site (./site) is served automatically by Cloudflare's static
// assets — this Worker only runs for requests that don't match a static file,
// i.e. the JSON API. It reuses the exact handlers from functions/api/* so the
// contact-form and run-counter logic still lives in one place.

import { onRequestPost as contact } from "../functions/api/contact.js";
import { onRequestPost as event } from "../functions/api/event.js";

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (request.method === "POST") {
      if (pathname === "/api/contact") return contact({ request, env });
      if (pathname === "/api/event") return event({ request, env });
    }

    // Not an API route — hand back to the static assets (serves 404.html etc.).
    return env.ASSETS.fetch(request);
  },
};
