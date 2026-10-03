/**
 * Local end-to-end test for POST /api/webhooks/clerk.
 *
 * Signs a synthetic `user.created` event with CLERK_WEBHOOK_SECRET from
 * .env.local (exactly what Svix sends in production) and POSTs it to the
 * running dev server. Never prints the secret.
 *
 * Usage: node scripts/test-clerk-webhook.mjs [url]
 */
import { Webhook } from "svix";
import { readFileSync } from "node:fs";

const url = process.argv[2] ?? "http://localhost:3000/api/webhooks/clerk";

// Minimal .env.local parser (no dotenv dependency needed).
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).replace(/^["']|["']$/g, "")];
    }),
);

const secret = env.CLERK_WEBHOOK_SECRET;
if (!secret) {
  console.error("CLERK_WEBHOOK_SECRET missing from .env.local");
  process.exit(1);
}

const testUserId =
  process.env.WEBHOOK_DELETE_ID ?? `user_test${Date.now().toString(36)}`;
const event = process.env.WEBHOOK_DELETE_ID
  ? { type: "user.deleted", data: { id: testUserId } }
  : {
  type: "user.created",
  data: {
    id: testUserId,
    first_name: "Webhook",
    last_name: "Smoke Test",
    image_url: null,
    primary_email_address_id: "idn_test_primary",
    email_addresses: [{ id: "idn_test_primary", email_address: "webhook-smoke-test@example.com" }],
    public_metadata: {},
    unsafe_metadata: { campusId: "CA20240001" },
  },
};

const body = JSON.stringify(event);
const wh = new Webhook(secret);
// svix 2.x exposes `sign(msgId, timestamp, payload)` returning the raw
// `v1,<hmac>` signature — build the Svix headers ourselves from that.
const msgId = `msg_${Date.now().toString(36)}`;
const timestamp = new Date();
const signature = wh.sign(msgId, timestamp, body);
const headers = {
  "svix-id": msgId,
  "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
  "svix-signature": signature,
};

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body,
});

console.log("POST status:", res.status);
console.log("test user id:", testUserId);
if (res.status !== 200) {
  console.error("Handler rejected the event — check dev server logs.");
  process.exit(1);
}
