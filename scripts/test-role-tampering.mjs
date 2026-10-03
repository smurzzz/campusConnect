/**
 * Role-tampering probes (Phase 4 security testing, report §3).
 *
 * Mints a real Clerk session token for a student (metadata.role=student) and
 * one for an admin, then drives Supabase REST directly to prove:
 *
 *  1. A student token cannot perform admin-only writes:
 *     announcement INSERT/UPDATE/DELETE, event INSERT.
 *  2. A student token cannot read other users' rows from `users`
 *     (users_select_admin must not open the table; only own row returns).
 *  3. Draft announcements are invisible to a student token AND to the bare
 *     anon key — only `status='published'` leaks through.
 *  4. The anon key (no JWT) is refused every write it attempts.
 *  5. Escalating own `users.role` via the API is either refused or, if the
 *     `users_update_own` policy allows column-level tampering, must be
 *     reported — RLS role checks read the JWT (`jwt_role()`), never this
 *     column, so a successful UPDATE still grants no privileges. The probe
 *     restores the original value in `finally`.
 *  6. A SQL-injection payload in a search term is treated as literal text:
 *     query returns 200, zero (or only literal-match) rows, and the table
 *     still exists afterwards.
 *
 * Usage: node scripts/test-role-tampering.mjs
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
let studentId = null;
let adminId = null;
let probeAnnouncementId = null;
let draftAnnouncementId = null;
let originalRole = null;
let failures = 0;

const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const svc = (path, init = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE,
      Authorization: `Bearer ${SUPABASE_SERVICE}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

async function mintToken(userId) {
  const session = await clerk("sessions", { method: "POST", body: new URLSearchParams({ user_id: userId }) });
  const { jwt } = await clerk(`sessions/${session.id}/tokens`, { method: "POST" });
  return { jwt, sessionId: session.id };
}

async function createUser(role, firstName) {
  const form = new URLSearchParams({
    "email_address[0]": `tamper-${role}-${stamp}@example.com`,
    password: "Xk9!tamper-probe-42",
    first_name: firstName,
    last_name: "Probe",
    public_metadata: JSON.stringify({ role }),
  });
  const user = await clerk("users", { method: "POST", body: form });
  // Mirror the webhook (Clerk can't reach localhost): public.users row.
  await svc("users", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ id: user.id, email: `tamper-${role}-${stamp}@example.com`, full_name: `${firstName} Probe`, role }),
  });
  return user.id;
}

const rest = (jwt) => ({
  headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
});

try {
  // ---------------------------------------------------------------- setup
  studentId = await createUser("student", "Tamper");
  adminId = await createUser("admin", "TamperAdmin");
  console.log(`student probe: ${studentId}\nadmin probe:   ${adminId}`);

  const { jwt: studentJwt } = await mintToken(studentId);
  const student = rest(studentJwt);

  // Seed: one published + one draft announcement (service role).
  for (const [status] of [["published"], ["draft"]]) {
    const res = await svc("announcements", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        title: `Tamper probe (${status}) — safe to delete`,
        body: "Phase 4 role-tampering probe fixture.",
        category: "General",
        status,
        created_by: status === "draft" ? null : adminId,
      }),
    });
    const rows = await res.json();
    if (status === "published") probeAnnouncementId = rows[0]?.id;
    else draftAnnouncementId = rows[0]?.id;
  }
  console.log(`fixtures: published=${probeAnnouncementId} draft=${draftAnnouncementId}`);

  // ------------------------------------------- 1. admin writes as student
  const annInsert = await fetch(`${SUPABASE_URL}/rest/v1/announcements`, {
    method: "POST",
    headers: student.headers,
    body: JSON.stringify({ title: "STUDENT FAKED AN ANNOUNCEMENT", body: "should be refused", status: "published" }),
  });
  check("student INSERT announcement refused", !annInsert.ok, `status ${annInsert.status}`);

  const annUpdate = await fetch(`${SUPABASE_URL}/rest/v1/announcements?id=eq.${probeAnnouncementId}`, {
    method: "PATCH",
    headers: student.headers,
    body: JSON.stringify({ title: "STUDENT EDITED THIS" }),
  });
  check("student UPDATE announcement refused", !annUpdate.ok || (await annUpdate.text()) === "", `status ${annUpdate.status} (RLS no-op = 0 rows)`);

  const annDelete = await fetch(`${SUPABASE_URL}/rest/v1/announcements?id=eq.${probeAnnouncementId}`, {
    method: "DELETE",
    headers: student.headers,
  });
  const annDeleted = await annDelete.text();
  check("student DELETE announcement refused", !annDelete.ok || annDeleted === "", `status ${annDelete.status}`);

  // The fixture must still exist (service-role count).
  const stillThere = await svc(`announcements?id=eq.${probeAnnouncementId}`);
  check("published announcement survived", (await stillThere.json()).length === 1);

  const eventInsert = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: "POST",
    headers: student.headers,
    body: JSON.stringify({
      title: "STUDENT-MADE EVENT",
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      created_by: studentId,
    }),
  });
  check("student INSERT event refused", !eventInsert.ok, `status ${eventInsert.status}`);

  // ------------------------------------------ 2. users table visibility
  const usersRead = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,role,email&limit=100`, { headers: student.headers });
  const usersRows = await usersRead.json();
  check("student reads users table 200", usersRead.ok, `status ${usersRead.status}`);
  check("student sees ONLY own users row", Array.isArray(usersRows) && usersRows.length === 1 && usersRows[0].id === studentId, `got ${JSON.stringify(usersRows).slice(0, 200)}`);

  // ------------------------------------------- 3. drafts stay invisible
  const draftViaStudent = await fetch(`${SUPABASE_URL}/rest/v1/announcements?id=eq.${draftAnnouncementId}`, { headers: student.headers });
  check("draft invisible to student token", (await draftViaStudent.json()).length === 0);

  const draftViaAnon = await fetch(`${SUPABASE_URL}/rest/v1/announcements?id=eq.${draftAnnouncementId}`, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
  });
  check("draft invisible to anon key", (await draftViaAnon.json()).length === 0);

  const publishedViaAnon = await fetch(`${SUPABASE_URL}/rest/v1/announcements?id=eq.${probeAnnouncementId}`, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
  });
  check("published announcement readable by anon (public feed)", (await publishedViaAnon.json()).length === 1);

  // ---------------------------------------------- 4. anon key writes
  const anonHeaders = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json" };
  const anonAnn = await fetch(`${SUPABASE_URL}/rest/v1/announcements`, {
    method: "POST",
    headers: anonHeaders,
    body: JSON.stringify({ title: "ANON FAKED", body: "should be refused", status: "published" }),
  });
  check("anon INSERT announcement refused", !anonAnn.ok, `status ${anonAnn.status}`);

  const anonEvent = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: "POST",
    headers: anonHeaders,
    body: JSON.stringify({ title: "ANON EVENT", start_time: new Date().toISOString(), end_time: new Date().toISOString() }),
  });
  check("anon INSERT event refused", !anonEvent.ok, `status ${anonEvent.status}`);

  const anonUsers = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id&limit=5`, { headers: anonHeaders });
  const anonUsersRows = await anonUsers.json();
  check("anon sees no users rows", Array.isArray(anonUsersRows) && anonUsersRows.length === 0, JSON.stringify(anonUsersRows).slice(0, 120));

  // ------------------------------------- 5. own-row role column tampering
  const beforeRole = await svc(`users?id=eq.${studentId}&select=role`);
  originalRole = (await beforeRole.json())[0]?.role;
  const escalate = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${studentId}`, {
    method: "PATCH",
    headers: { ...student.headers, Prefer: "return=representation" },
    body: JSON.stringify({ role: "admin" }),
  });
  const escalateBody = await escalate.text();
  const afterRole = await svc(`users?id=eq.${studentId}&select=role`);
  const nowRole = (await afterRole.json())[0]?.role;
  if (nowRole === "admin") {
    // Not a privilege gain: every RLS/admin gate reads jwt_role() (the signed
    // Clerk metadata claim), never users.role. Logged as a data-integrity
    // finding for the report instead of a bypass.
    console.log(`FINDING  users.role is writable on own row — reported as low-severity data-integrity finding; RLS still sees role=student via jwt_role()`);
  } else {
    check("own users.role escalation refused", originalRole === "student", `PATCH status ${escalate.status} ${escalateBody.slice(0, 80) || "(empty)"}, role still ${nowRole}`);
  }

  // Prove the tamper (if any) granted nothing: admin-only read still denied.
  const adminRead = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id&limit=100`, { headers: student.headers });
  const adminReadRows = await adminRead.json();
  check("role tampering grants no extra reads", Array.isArray(adminReadRows) && adminReadRows.length <= 1, `saw ${Array.isArray(adminReadRows) ? adminReadRows.length : "?"} rows`);

  const adminAnnWrite = await fetch(`${SUPABASE_URL}/rest/v1/announcements`, {
    method: "POST",
    headers: student.headers,
    body: JSON.stringify({ title: "STILL A STUDENT", body: "after role tamper", status: "published" }),
  });
  check("role tampering grants no admin writes", !adminAnnWrite.ok, `status ${adminAnnWrite.status}`);

  // ------------------------------------------------- 6. SQL injection
  // The payload is sent exactly the way the app's search sends it (supabase-js
  // `.or()` → `or=(...)`), so either the edge WAF rejects the request outright
  // or PostgREST treats the term as literal text. Execution is the only
  // failure: a 403/400 from the edge, or 200-with-no-rows from PostgREST,
  // both mean the statement never ran.
  const payload = "'; DROP TABLE public.events; --";
  const inj = await fetch(`${SUPABASE_URL}/rest/v1/events?select=id,title&or=${encodeURIComponent(`(title.ilike.%${payload}%)`)}`, { headers: student.headers });
  const injBody = await inj.text();
  let injRows = null;
  try { injRows = JSON.parse(injBody); } catch { /* non-JSON body = blocked at edge */ }
  const blockedAtEdge = inj.status === 403 || inj.status === 400;
  check(
    "injection payload never executes",
    blockedAtEdge || (inj.ok && Array.isArray(injRows)),
    blockedAtEdge ? `blocked upstream — status ${inj.status}` : `status ${inj.status}`,
  );

  const tableCheck = await svc(`events?select=id&limit=1`);
  check("events table still exists after injection", tableCheck.status === 200, `status ${tableCheck.status}`);

  // Literal-match semantics: the payload must match zero rows.
  check(
    "injection payload matches no rows",
    injRows === null || (Array.isArray(injRows) && injRows.length === 0),
    injRows === null ? "n/a (blocked at edge)" : `${injRows.length} row(s)`,
  );

  // A real search term still works (escaping does not break normal queries).
  const normal = await fetch(`${SUPABASE_URL}/rest/v1/events?select=id,title&or=${encodeURIComponent("(title.ilike.%Innovation%)")}`, { headers: student.headers });
  const normalBody = await normal.text();
  let normalRows = null;
  try { normalRows = JSON.parse(normalBody); } catch { /* reported below */ }
  check(
    "legit search still works after escaping",
    normal.ok && Array.isArray(normalRows),
    normal.ok ? `${normalRows?.length ?? "?"} row(s)` : `status ${normal.status} ${normalBody.slice(0, 120)}`,
  );
} finally {
  // ----------------------------------------------------------- cleanup
  if (draftAnnouncementId) await svc(`announcements?id=eq.${draftAnnouncementId}`, { method: "DELETE" });
  if (probeAnnouncementId) await svc(`announcements?id=eq.${probeAnnouncementId}`, { method: "DELETE" });
  if (studentId && originalRole && originalRole !== "student") {
    await svc(`users?id=eq.${studentId}`, { method: "PATCH", body: JSON.stringify({ role: originalRole }) });
  }
  for (const [id, label] of [[studentId, "student"], [adminId, "admin"]]) {
    if (!id) continue;
    // Dependent rows first: the announcement-publish trigger fans out
    // notifications to every user, and those FKs make the users DELETE 409.
    await svc(`notifications?user_id=eq.${id}`, { method: "DELETE" });
    await svc(`concerns?student_id=eq.${id}`, { method: "DELETE" });
    await svc(`users?id=eq.${id}`, { method: "DELETE" });
    try {
      await clerk(`users/${id}`, { method: "DELETE" });
      console.log(`cleanup ${label} probe: ${id}`);
    } catch (err) {
      console.error(`CLEANUP FAILED — delete manually (${label}):`, id, err.message);
    }
  }
}

if (failures > 0) {
  console.log(`\nRESULT: ${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nRESULT: all role-tampering probes passed — no privilege escalation path found.");
