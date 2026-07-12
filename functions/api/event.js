// Tiny anonymous event counter (answers "does anyone actually press Run?").
// No cookies, no user data — just an event name and a timestamp in D1.

const ALLOWED = new Set(["run"]);

export async function onRequestPost({ request, env }) {
  try {
    const { event } = await request.json();
    if (env.DB && ALLOWED.has(event)) {
      await env.DB.prepare(
        "INSERT INTO events (ts, event) VALUES (datetime('now'), ?1)"
      ).bind(event).run();
    }
  } catch {
    // Never let analytics break anything.
  }
  return new Response(null, { status: 204 });
}
