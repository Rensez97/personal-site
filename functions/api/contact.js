// Contact form endpoint — a Cloudflare Pages Function (~40 lines of logic).
// Stores the message in D1 (binding: DB) and forwards a copy to the
// site-email-notify Worker (service binding: EMAIL), which sends it through
// Cloudflare Email Routing — no third-party email service. Spam defence:
// honeypot field plus a per-IP rate limit in D1. See docs/runbook.md §I2.

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }

  // Honeypot: real visitors never see the "company" field. Pretend success.
  if (body.company) return json({ ok: true });

  const name = (body.name || "").trim().slice(0, 120);
  const email = (body.email || "").trim().slice(0, 200);
  const message = (body.message || "").trim().slice(0, 5000);
  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "invalid fields" }, 400);
  }

  const ip = request.headers.get("cf-connecting-ip") || "unknown";

  if (env.DB) {
    // Rate limit: max 5 messages per IP per hour.
    const recent = await env.DB.prepare(
      "SELECT count(*) AS n FROM messages WHERE ip = ?1 AND ts > datetime('now', '-1 hour')"
    ).bind(ip).first();
    if (recent && recent.n >= 5) return json({ error: "rate limited" }, 429);

    await env.DB.prepare(
      "INSERT INTO messages (ts, name, email, message, ip) VALUES (datetime('now'), ?1, ?2, ?3, ?4)"
    ).bind(name, email, message, ip).run();
  }

  if (env.EMAIL) {
    // Best effort: the message is already safe in D1 if this fails. Log any
    // failure so it shows up in the Worker's logs.
    try {
      const r = await env.EMAIL.fetch("https://site-email-notify/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!r.ok) console.error("EMAIL notify failed:", r.status, await r.text());
    } catch (e) {
      console.error("EMAIL notify threw:", e && e.stack ? e.stack : String(e));
    }
  }

  return json({ ok: true });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
