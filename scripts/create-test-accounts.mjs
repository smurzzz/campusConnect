/**
 * Creates (or refreshes) the three QA accounts the testing report and demo
 * guide require — student, personnel, admin — plus a claimed Campus ID on
 * the student so Campus-ID login is testable.
 *
 * Each account gets a real inbox (mail.tm) as its primary email, verified
 * through Clerk's email-code flow, so Device Trust codes, signup codes and
 * password-reset codes are all receivable during automated testing.
 *
 * The Clerk webhook cannot reach localhost, so each `public.users` row is
 * upserted here exactly the way `app/api/webhooks/clerk/route.ts` would.
 *
 * Idempotent: re-running reuses existing accounts and inboxes.
 *
 * Usage: node scripts/create-test-accounts.mjs
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

const CLERK_KEY = env.CLERK_SECRET_KEY;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!CLERK_KEY || !SUPABASE_URL || !SERVICE) {
  console.error("Missing CLERK_SECRET_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const PASSWORD = env.QA_ACCOUNT_PASSWORD || "CampusConnect!QA-2026";
const INBOX_PASSWORD = "CampusConnect!Inbox-2026";

/** local-part → role/persona. `qa-signup` is inbox-only (used by the signup UI test). */
const ACCOUNTS = [
  { role: "student", local: "qa-student", legacyEmail: "qa-student@example.com", first: "Maya", last: "Santos" },
  { role: "personnel", local: "qa-marco", legacyEmail: "qa-personnel@example.com", first: "Marco", last: "Reyes" },
  { role: "admin", local: "qa-rita", legacyEmail: "qa-admin@example.com", first: "Rita", last: "Ocampo" },
];
const EXTRA_INBOXES = ["qa-signup"];

/* ------------------------------------------------------------------ */
/* mail.tm — real inboxes so emailed codes are receivable             */
/* ------------------------------------------------------------------ */

const MAIL_BASE = "https://api.mail.tm";
let mailToken = null;

const mail = async (path, init = {}) => {
  const res = await fetch(MAIL_BASE + path, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(mailToken ? { Authorization: `Bearer ${mailToken}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`mail.tm ${path}: ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  return body;
};

const withMailRetry = async (fn) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (String(error).includes(" 429 ")) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw error;
    }
  }
  throw new Error("mail.tm kept rate-limiting");
};

/** Authenticates (or creates) the deterministic inbox for a local part. */
const ensureInbox = async (local) => {
  const domainsBody = await mail("/domains");
  const domains = domainsBody["hydra:member"] ?? domainsBody;
  const domain = (domains.find((d) => d.isActive && !d.isPrivate) ?? domains[0]).domain;
  const address = `${local}@${domain}`;
  const auth = () =>
    mail("/token", { method: "POST", body: JSON.stringify({ address, password: INBOX_PASSWORD }) });
  try {
    const token = await withMailRetry(auth);
    mailToken = token.token;
  } catch {
    await withMailRetry(() =>
      mail("/accounts", { method: "POST", body: JSON.stringify({ address, password: INBOX_PASSWORD }) }),
    );
    const token = await withMailRetry(auth);
    mailToken = token.token;
  }
  return address;
};

/** Snapshot ids before triggering, then poll for a NEW message holding a 6-digit code. */
const waitForCode = async (knownIds, timeoutMs = 60_000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const body = await mail("/messages");
    const list = body["hydra:member"] ?? body;
    const fresh = list.filter((m) => !knownIds.has(m.id));
    if (fresh.length) {
      fresh.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const full = await mail(`/messages/${fresh[0].id}`);
      const text = `${full.text ?? ""} ${(full.html ?? []).join(" ")}`;
      const match = text.match(/\b(\d{6})\b/);
      if (match) return match[1];
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("timed out waiting for a 6-digit code");
};

const inboxMessageIds = async () => {
  const body = await mail("/messages");
  const list = body["hydra:member"] ?? body;
  return new Set(list.map((m) => m.id));
};

/* ------------------------------------------------------------------ */
/* Clerk + Supabase helpers (same style as the other QA scripts)      */
/* ------------------------------------------------------------------ */

const clerk = async (path, init = {}) => {
  const { allowFail, ...rest } = init;
  const res = await fetch(`https://api.clerk.com/v1/${path}`, {
    ...rest,
    headers: { Authorization: `Bearer ${CLERK_KEY}`, "Content-Type": "application/x-www-form-urlencoded", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok && !allowFail) throw new Error(`Clerk ${path}: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return { ok: res.ok, status: res.status, body };
};

const supa = async (path, init = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${path}: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body;
};

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const findUserByEmail = async (email) => {
  const res = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=5`, {
    headers: { Authorization: `Bearer ${CLERK_KEY}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Clerk list: ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  return body[0] ?? null;
};

/** Adds the inbox address to the user if missing, verifies it if needed, makes it primary. */
const ensurePrimaryVerifiedEmail = async (userId, address) => {
  const get = async () => (await clerk(`users/${userId}`)).body;
  let user = await get();
  let entry = user.email_addresses.find((e) => e.email_address === address);
  if (!entry) {
    // Email addresses live in their own top-level Backend API collection.
    const created = await clerk("email_addresses", {
      method: "POST",
      body: new URLSearchParams({ user_id: userId, email_address: address }),
    });
    entry = created.body;
  }
  if (entry.verification?.status !== "verified") {
    const before = await inboxMessageIds();
    const prepare = await clerk(`email_addresses/${entry.id}/prepare_verification`, {
      method: "POST",
      body: new URLSearchParams({ strategy: "email_code" }),
    });
    const verificationId = prepare.body?.verification?.id ?? prepare.body?.id;
    const code = await waitForCode(before);
    const attempt = await clerk(`email_addresses/${entry.id}/attempt_verification`, {
      method: "POST",
      body: new URLSearchParams({ strategy: "email_code", code, verification_id: verificationId ?? "" }),
      allowFail: true,
    });
    if (!attempt.ok) throw new Error(`email verify failed: ${JSON.stringify(attempt.body).slice(0, 200)}`);
  }
  user = await get();
  if (user.primary_email_address_id !== entry.id) {
    await clerk(`users/${userId}`, {
      method: "PATCH",
      body: new URLSearchParams({ primary_email_address_id: entry.id }),
    });
  }
  return address;
};

const ids = {};

for (const acct of ACCOUNTS) {
  const address = await ensureInbox(acct.local);
  console.log(`inbox: ${address}`);

  let user = (await findUserByEmail(acct.legacyEmail)) ?? (await findUserByEmail(address));
  if (!user) {
    const form = new URLSearchParams({
      "email_address[0]": address,
      password: PASSWORD,
      first_name: acct.first,
      last_name: acct.last,
      public_metadata: JSON.stringify({ role: acct.role }),
    });
    const created = await clerk("users", { method: "POST", body: form });
    user = created.body;
    console.log(`created ${acct.role}: ${user.id}`);
  } else {
    console.log(`reusing ${acct.role}: ${user.id}`);
    await clerk(`users/${user.id}`, {
      method: "PATCH",
      allowFail: true,
      body: new URLSearchParams({
        public_metadata: JSON.stringify({ role: acct.role }),
        password: PASSWORD,
        skip_password_checks: "true",
      }),
    });
  }
  ids[acct.role] = user.id;

  await ensurePrimaryVerifiedEmail(user.id, address);

  // Mirror the webhook upsert into public.users (localhost can't receive webhooks).
  await supa("users?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: user.id,
      full_name: `${acct.first} ${acct.last}`,
      email: address,
      role: acct.role,
    }),
  });

  // Verify the mirrored row carries the right role (password login itself is
  // verified for real in the browser during functional testing).
  const [row] = await supa(`users?id=eq.${user.id}&select=id,role,email`);
  check(`${acct.role} row synced`, Boolean(row) && row.role === acct.role && row.email === address,
    row ? `role=${row.role} email=${row.email}` : "public.users row missing");
}

// Inbox for the signup UI test (no Clerk user yet — the test creates one).
for (const local of EXTRA_INBOXES) {
  const address = await ensureInbox(local);
  console.log(`inbox: ${address} (for the signup test)`);
}

// Give the student a claimed Campus ID so Campus-ID login is testable.
const [student] = await supa(`users?id=eq.${ids.student}&select=campus_id`).catch(() => [[]]);
if (student && !student.campus_id) {
  const free = await supa("seeded_campus_ids?is_claimed=is.false&select=campus_id&limit=20&order=campus_id");
  const pick = free.map((r) => r.campus_id).find((v) => /^NU-\d{4,8}$/i.test(v));
  if (pick) {
    await supa(`seeded_campus_ids?campus_id=eq.${encodeURIComponent(pick)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ is_claimed: true, claimed_by: ids.student }),
    });
    await supa(`users?id=eq.${ids.student}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ campus_id: pick }),
    });
    check(`student Campus ID ${pick} claimed`, true);
  } else {
    check("student Campus ID claim", false, "no unclaimed NU-* id left in seeded_campus_ids");
  }
} else if (student) {
  check(`student already holds Campus ID ${student.campus_id}`, true);
}

console.log(`\naccounts ready — password: ${PASSWORD}`);
console.log(`student=${ids.student} personnel=${ids.personnel} admin=${ids.admin}`);
process.exit(failures === 0 ? 0 : 1);
