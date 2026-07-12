// Sends the contact-form notification through Cloudflare Email Routing.
// Called only via service binding from functions/api/contact.js — workers_dev
// is off, so there is no public URL to abuse.

import { EmailMessage } from "cloudflare:email";

const FROM = "site@rensevanderzee.nl";
const TO = "rensevdzee@hotmail.com"; // must match a verified destination address

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

    const raw = buildRaw({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `Site contact: ${name}`,
      text: `From: ${name} <${email}>\n\n${message}\n`,
    });
    await env.NOTIFY.send(new EmailMessage(FROM, TO, raw));
    return new Response("ok");
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
