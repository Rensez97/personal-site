// Sends the contact-form notification through Cloudflare Email Routing.
// Called only via service binding from functions/api/contact.js — workers_dev
// is off, so there is no public URL to abuse.

import { EmailMessage } from "cloudflare:email";

// FROM and recipients come from wrangler.toml [vars] so the addresses live in
// exactly one place (no duplication with the send_email binding config).
// MAIL_TO is a comma-separated list — each recipient must be a verified Email
// Routing destination. Note: Outlook/Hotmail often defers Cloudflare's shared
// sending IPs on reputation (451 4.7.650); Gmail is the reliable inbox.

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("bad request", { status: 400 });
    }
    const name = String(body.name || "").slice(0, 120);
    const email = String(body.email || "").slice(0, 200);
    const message = String(body.message || "").slice(0, 5000);
    if (!name || !email || !message) return new Response("bad request", { status: 400 });

    const from = env.MAIL_FROM;
    const recipients = (env.MAIL_TO || "").split(",").map((s) => s.trim()).filter(Boolean);

    // Send to each recipient independently so one provider rejecting (e.g.
    // Hotmail's 451) never blocks delivery to the others. The async wrapper
    // matters: EmailMessage/send can throw synchronously, and a sync throw
    // inside .map() would escape Promise.allSettled and crash the Worker.
    const results = await Promise.allSettled(
      recipients.map(async (to) => {
        const raw = buildRaw({
          from,
          to,
          replyTo: email,
          subject: `Site contact: ${name}`,
          text: `From: ${name} <${email}>\n\n${message}\n`,
        });
        return env.NOTIFY.send(new EmailMessage(from, to, raw));
      })
    );
    results.forEach((r, i) => {
      if (r.status === "rejected") console.error(`send to ${recipients[i]} failed:`, String(r.reason));
    });

    // As long as one recipient accepted, report success — the message is in D1
    // regardless, and Hotmail may defer where Gmail delivers.
    return results.some((r) => r.status === "fulfilled")
      ? new Response("ok")
      : new Response("all sends failed", { status: 502 });
  },
};

// Minimal RFC 5322 message. UTF-8 subject via RFC 2047 so names with accents
// survive; body goes as 8bit UTF-8, which Email Routing accepts.
function buildRaw({ from, to, replyTo, subject, text }) {
  const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: =?utf-8?B?${b64(subject)}?=`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    text.replace(/\r?\n/g, "\r\n"),
  ].join("\r\n");
}
