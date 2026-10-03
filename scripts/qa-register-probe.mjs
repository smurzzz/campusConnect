/**
 * Phase 4 QA helper: mint a real Clerk session token for an existing user and
 * register them for an event through Supabase REST — exercises the same
 * `event_capacity_trigger` path the UI uses, without needing a browser login.
 *
 * Usage: node scripts/qa-register-probe.mjs <clerkUserId> <eventId>
 * Prints the raw result so the caller can assert on the capacity error.
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).replace(/^["']|["']$/g, "")];
    }),
);

const [userId, eventId] = process.argv.slice(2);
if (!userId || !eventId) {
  console.error("usage: node scripts/qa-register-probe.mjs <clerkUserId> <eventId>");
  process.exit(1);
}

const clerk = async (path, init = {}) => {
  const res = await fetch(`https://api.clerk.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Clerk ${path}: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body;
};

const session = await clerk("sessions", { method: "POST", body: new URLSearchParams({ user_id: userId }) });
const { jwt } = await clerk(`sessions/${session.id}/tokens`, { method: "POST" });

const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/event_registrations`, {
  method: "POST",
  headers: {
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify({ event_id: eventId, student_id: userId }),
});
const text = await res.text();
console.log(`POST event_registrations -> ${res.status}`);
console.log(text.slice(0, 500));

// The session is throwaway; revoke it so it cannot linger.
try {
  await clerk(`sessions/${session.id}`, { method: "DELETE" });
} catch {
  /* best effort */
}
