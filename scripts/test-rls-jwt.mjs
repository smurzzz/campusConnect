/**
 * End-to-end proof that Clerk session tokens work against Supabase RLS.
 *
 * 1. Creates a throwaway Clerk user WITH publicMetadata.role=student
 *    (so the session token's `metadata` claim resolves for jwt_role()).
 * 2. Creates a session and mints a real RS256 session token; audits claims.
 * 3. Inserts a notification for that user with the service-role key.
 * 4. Reads notifications with the Clerk token — must return exactly the
 *    probe row (proves signature trust + `sub` matching).
 * 5. Inserts a concern with the Clerk token — must succeed (proves
 *    jwt_role()='student' + `sub` authorship checks).
 * 6. Cleans up everything (concern, notification, Clerk user).
 *
 * Usage: node scripts/test-rls-jwt.mjs
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
const SUPABASE_ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!CLERK_KEY || !SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SERVICE) {
  console.error("Missing CLERK_SECRET_KEY / SUPABASE_URL / anon / SERVICE_ROLE keys in .env.local");
  process.exit(1);
}

const clerk = async (path, init = {}) => {
  const res = await fetch(`https://api.clerk.com/v1/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${CLERK_KEY}`, "Content-Type": "application/x-www-form-urlencoded", ...(init.headers ?? {}) },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Clerk ${path}: ${res.status} ${JSON.stringify(body).slice(0, 400)}`);
  return body;
};

const stamp = Date.now().toString(36);
let userId = null;
let concernId = null;
let notificationId = null;
let failures = 0;

const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

try {
  // 1. Throwaway student.
  const form = new URLSearchParams({
    "email_address[0]": `rls-probe-${stamp}@example.com`,
    password: "Xk9!probe-password-42",
    first_name: "RLS",
    last_name: "Probe",
    public_metadata: JSON.stringify({ role: "student" }),
  });
  const user = await clerk("users", { method: "POST", body: form });
  userId = user.id;
  console.log("created clerk student:", userId);

  // 2. Session + token + claims audit.
  const session = await clerk("sessions", { method: "POST", body: new URLSearchParams({ user_id: userId }) });
  const { jwt } = await clerk(`sessions/${session.id}/tokens`, { method: "POST" });
  const claims = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
  console.log("token claims:", JSON.stringify({ sub: claims.sub, role: claims.role, metadata: claims.metadata }, null, 2));
  check("token carries role=authenticated", claims.role === "authenticated");
  check("token carries metadata.role=student", claims.metadata?.role === "student", claims.metadata?.role ? "ok" : "MISSING — Clerk session token editor needs: \"metadata\": {{user.public_metadata}}");

  // 3. Mirror the webhook: upsert the public.users row (Clerk cannot deliver
  // webhooks to localhost), then seed the probe's notification.
  const upRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: { apikey: SUPABASE_SERVICE, Authorization: `Bearer ${SUPABASE_SERVICE}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ id: userId, email: `rls-probe-${stamp}@example.com`, full_name: "RLS Probe", role: "student" }),
  });
  if (!upRes.ok) console.log("WARN: users upsert failed:", (await upRes.text()).slice(0, 200));

  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
    method: "POST",
    headers: { apikey: SUPABASE_SERVICE, Authorization: `Bearer ${SUPABASE_SERVICE}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ user_id: userId, type: "system", message: "RLS probe — safe to delete" }),
  });
  const inserted = await insRes.json();
  notificationId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;
  check("service-role seeded a notification", insRes.ok && Boolean(notificationId), insRes.ok ? notificationId : JSON.stringify(inserted).slice(0, 200));

  const authedHeaders = { apikey: SUPABASE_ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" };

  // 4. Authenticated read as the Clerk student.
  const readRes = await fetch(`${SUPABASE_URL}/rest/v1/notifications?select=id,user_id,message&limit=10`, { headers: authedHeaders });
  const rows = await readRes.json();
  const own = Array.isArray(rows) ? rows.filter((r) => r.user_id === userId) : [];
  check("Clerk-token read of notifications = 200", readRes.ok, `status ${readRes.status} ${JSON.stringify(rows).slice(0, 200)}`);
  check("RLS returns exactly the probe's own row", own.length === 1, `got ${Array.isArray(rows) ? rows.length : "non-array"}`);
  check("no cross-user rows leaked", Array.isArray(rows) && rows.every((r) => r.user_id === userId));

  // 5. Authenticated write as the Clerk student (concerns INSERT policy).
  const writeRes = await fetch(`${SUPABASE_URL}/rest/v1/concerns`, {
    method: "POST",
    headers: { ...authedHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ subject: "RLS probe — safe to delete", description: "Probe concern from scripts/test-rls-jwt.mjs", category: "Other", student_id: userId }),
  });
  const written = await writeRes.json();
  concernId = Array.isArray(written) ? written[0]?.id : written?.id;
  check("Clerk-token concern INSERT allowed (jwt_role student + sub)", writeRes.ok, writeRes.ok ? concernId : `status ${writeRes.status} ${JSON.stringify(written).slice(0, 200)}`);

  // 5b. Cross-user write must be refused by RLS.
  const forgeRes = await fetch(`${SUPABASE_URL}/rest/v1/concerns`, {
    method: "POST",
    headers: authedHeaders,
    body: JSON.stringify({ subject: "FORGED", description: "must be refused", category: "Other", student_id: "user_NOTME" }),
  });
  check("forged student_id INSERT rejected by RLS", !forgeRes.ok, `status ${forgeRes.status}`);
} finally {
  const svcHeaders = { apikey: SUPABASE_SERVICE, Authorization: `Bearer ${SUPABASE_SERVICE}`, "Content-Type": "application/json" };
  if (concernId) {
    const del = await fetch(`${SUPABASE_URL}/rest/v1/concerns?id=eq.${concernId}`, { method: "DELETE", headers: svcHeaders });
    console.log(`cleanup concern ${concernId}: ${del.status}`);
  }
  if (notificationId) {
    const del = await fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${notificationId}`, { method: "DELETE", headers: svcHeaders });
    console.log(`cleanup notification ${notificationId}: ${del.status}`);
  }
  if (userId) {
    // Remove the mirrored users row too (webhook delete-event equivalent).
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, { method: "DELETE", headers: svcHeaders });
    try {
      await clerk(`users/${userId}`, { method: "DELETE" });
      console.log("deleted clerk user:", userId);
    } catch (err) {
      console.error("CLEANUP FAILED — delete manually:", userId, err.message);
    }
  }
}

if (failures > 0) {
  console.log(`\nRESULT: ${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nRESULT: all RLS checks passed — Clerk tokens fully trusted and policies enforced.");
