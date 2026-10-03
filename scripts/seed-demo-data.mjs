/**
 * Seeds realistic school-themed demo data: announcements, events, a concern
 * thread and lost & found items — each with a real photo downloaded from
 * Pexels (every URL slug describes the school scene it shows) and uploaded
 * into the Supabase Storage buckets, so images render on every device
 * exactly like user uploads.
 *
 * Rows are tagged with a marker prefix so re-running never duplicates.
 *
 * Usage: node scripts/seed-demo-data.mjs
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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_ID = "user_3Jw4UpKyca3UN9TLs6dpWqQugHI"; // your admin account
const MARKER = "[Demo] "; // title/name prefix so re-runs are idempotent-ish

const headers = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

const rest = async (path, init = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers, ...init });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${path}: ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  return body;
};

/** Downloads a photo and uploads it into a bucket folder; returns public URL. */
async function seedImage(bucket, folder, filename, sourceUrl) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`image fetch ${res.status}: ${sourceUrl}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const path = `${folder}/${filename}`;
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": res.headers.get("content-type") ?? "image/jpeg", "x-upsert": "true" },
    body: bytes,
  });
  if (!up.ok) throw new Error(`storage upload ${up.status}: ${await up.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// School-themed Pexels photos; the URL slug describes the scene, so every
// image is classroom / library / campus / student life related.
const px = (slug) => `https://images.pexels.com/photos/${slug}?auto=compress&cs=tinysrgb&w=1920`;
const at = (days, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const announcements = [
  { title: "Enrollment for Term 2 Opens Monday", category: "Academic", photo: px("31367502/pexels-photo-31367502/free-photo-of-diverse-university-students-in-lecture-hall.jpeg"), body: "Registration portals open at 08:00 on Monday for all returning students. Core sections fill quickly — log in early, confirm your adviser holds, and enroll before 17:00 Friday to avoid late fees. Academic advisers are available on walk-in hours all week in Founders Hall." },
  { title: "Library Extends Hours for Finals", category: "Campus Life", photo: px("16420473/pexels-photo-16420473/free-photo-of-a-group-of-students-sitting-in-a-library-and-studying.jpeg"), body: "Ashby Library will stay open until 02:00 from Monday through the end of the examination period. Quiet floors 3–5 remain silent at all hours; group rooms are bookable online. Free coffee and tea will be available in the atrium after 22:00, courtesy of the Student Union." },
  { title: "Campus Wide Power Maintenance Saturday", category: "Facilities", photo: px("17565045/pexels-photo-17565045/free-photo-of-school-in-city.jpeg"), body: "Essential electrical maintenance runs Saturday 07:00–14:00 across Bellhaven, Cedar Court and Kingsley Hall. Power outlets and lighting will be intermittent. Plan lab work accordingly and report any outage lasting past 14:00 to the Facilities team through a concern." },
  { title: "New Merit Scholarships for Spring Intake", category: "Financial Aid", photo: px("19579986/pexels-photo-19579986/free-photo-of-students-sitting-at-graduation-ceremony.jpeg"), body: "The university has released fifty new merit scholarships covering 25–60% of tuition for the spring intake. Applications require a one-page statement and latest transcript. Deadline is the last day of this month; decisions arrive within three weeks of submission." },
  { title: "Safety Drill: Evacuation Practice Wednesday", category: "Safety", photo: px("28987495/pexels-photo-28987495/free-photo-of-sunlit-empty-school-corridor-with-lockers.jpeg"), body: "A full evacuation drill takes place Wednesday at 11:00 in all academic buildings. Follow your floor marshals, use the stairwells, and gather at your assembly points (East Quad or Library Courtyard). The drill should add no more than fifteen minutes to your day." },
];

const events = [
  { title: "Innovation Week 2026 — Opening Keynote", description: "Kick off Innovation Week with a keynote from alumni founders on turning campus research into startups. Followed by a networking mixer with light refreshments.", category: "Academic", location: "Founders Hall", photo: px("27769510/pexels-photo-27769510/free-photo-of-a-group-of-students-sitting-in-a-lecture-hall.jpeg"), start: at(3, 9), end: at(3, 12), capacity: 120 },
  { title: "Interfaculty Football Cup Final", description: "Engineering vs Medicine in the grand final. Cheer your faculty at the ICCT Sports Centre main pitch; the winning faculty lifts the cup at full time.", category: "Sports", location: "ICCT Sports Centre", photo: px("31220287/pexels-photo-31220287/free-photo-of-dynamic-urban-street-soccer-game-in-school-courtyard.jpeg"), start: at(5, 16), end: at(5, 18), capacity: 200 },
  { title: "Spring Career Fair — 40+ Employers", description: "Meet recruiters from four dozen companies hiring interns and graduates. Bring printed CVs; professional headshots available free at the entrance booth.", category: "Careers", location: "Student Union", photo: px("35138560/pexels-photo-35138560/free-photo-of-modern-trade-show-exhibition-with-busy-attendees.jpeg"), start: at(9, 10), end: at(9, 16), capacity: 300 },
  { title: "Open Mic & Poetry Night", description: "An evening of student music, spoken word and poetry at the Dockside Union. Sign-up sheet at the door; five-minute slots. Free entry with your student ID.", category: "Arts & Culture", location: "Dockside Union", photo: px("16458219/pexels-photo-16458219/free-photo-of-two-microphones-on-a-stage.jpeg"), start: at(12, 19), end: at(12, 22), capacity: 80 },
  { title: "Volunteer Day: Riverside Cleanup", description: "Join Facilities and the Green Society for our termly riverside cleanup. Gloves and bags provided; lunch for all volunteers afterwards in the Library Courtyard.", category: "Community", location: "East Quad", photo: px("36713110/pexels-photo-36713110/free-photo-of-community-volunteers-cleaning-riverbank-outdoors.jpeg"), start: at(15, 8), end: at(15, 12), capacity: 60 },
];

const concerns = [
  { subject: "Air conditioning in Room 304 not working", category: "Facility", description: "The air conditioning unit in Room 304 (Bellhaven Hall) has been out since Monday. Afternoon classes are unbearable and several students have felt unwell. Could the Facilities team inspect and repair it this week?", status: "in_progress" },
  { subject: "Transcript request pending for three weeks", category: "Administrative", description: "I requested an official transcript three weeks ago through the registrar portal for a scholarship deadline. The portal still shows pending, and the deadline is in ten days. Please advise on how to expedite.", status: "pending" },
];

const lostFound = [
  { type: "lost", name: "Black umbrella with wooden handle", category: "Personal item", location: "Ashby Library", photo: px("14982805/pexels-photo-14982805/free-photo-of-grayscale-photo-of-a-woman-holding-an-umbrella.jpeg"), description: "Left at the second-floor study desks on Tuesday evening. Has a small silver charm on the strap." },
  { type: "found", name: "Student ID card — J. Cruz", category: "Documents", location: "Student Union", photo: px("32081457/pexels-photo-32081457/free-photo-of-portuguese-passport-and-citizen-card-close-up.jpeg"), description: "Found near the cafeteria entrance. Handed to the Union front desk; message me to verify and collect." },
  { type: "found", name: "Silver wireless earbuds in blue case", category: "Electronics", location: "ICCT Sports Centre", photo: px("16703772/pexels-photo-16703772/free-photo-of-close-up-of-wireless-earphones-and-case.jpeg"), description: "Found in the changing room after the evening session. Case has a small sticker on the lid." },
];

try {
  // 1. Announcements (+ cover images into cms-images).
  for (const [index, a] of announcements.entries()) {
    // Always (re)upload: same deterministic path, so existing rows instantly
    // pick up the new school photo without a DB update.
    const image = await seedImage("cms-images", ADMIN_ID, `demo-announcement-${index + 1}.jpg`, a.photo);
    const existing = await rest(`announcements?select=id&title=eq.${encodeURIComponent(MARKER + a.title)}`);
    if (existing.length) { console.log("refresh announcement image:", a.title); continue; }
    const row = await rest("announcements", {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify([{ title: MARKER + a.title, category: a.category, body: a.body, status: "published", audience: "Everyone", image_url: image, created_by: ADMIN_ID }]),
    });
    console.log("seeded announcement:", row[0].title);
  }

  // 2. Events (+ cover images).
  for (const [index, e] of events.entries()) {
    const image = await seedImage("cms-images", ADMIN_ID, `demo-event-${index + 1}.jpg`, e.photo);
    const existing = await rest(`events?select=id&title=eq.${encodeURIComponent(MARKER + e.title)}`);
    if (existing.length) { console.log("refresh event image:", e.title); continue; }
    const row = await rest("events", {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify([{ title: MARKER + e.title, description: e.description, category: e.category, location: e.location, start_time: e.start, end_time: e.end, capacity: e.capacity, cover_image_url: image, created_by: ADMIN_ID }]),
    });
    console.log("seeded event:", row[0].title);
  }

  // 3. Concerns thread (authored by the admin acting as a student proxy).
  for (const c of concerns) {
    const existing = await rest(`concerns?select=id&subject=eq.${encodeURIComponent(c.subject)}`);
    if (existing.length) { console.log("skip concern:", c.subject); continue; }
    const row = await rest("concerns", {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify([{ subject: c.subject, category: c.category, description: c.description, status: c.status, student_id: ADMIN_ID }]),
    });
    await rest("concern_messages", {
      method: "POST",
      body: JSON.stringify([{ concern_id: row[0].id, sender_id: ADMIN_ID, message: "Adding a follow-up: it has been getting worse each afternoon. Happy to show the room to a technician any weekday 12:00–14:00." }]),
    });
    console.log("seeded concern:", row[0].subject);
  }

  // 4. Lost & found (+ photos into lost-found-attachments).
  for (const [index, item] of lostFound.entries()) {
    const photo = await seedImage("lost-found-attachments", ADMIN_ID, `demo-item-${index + 1}.jpg`, item.photo);
    const existing = await rest(`lost_found_items?select=id&name=eq.${encodeURIComponent(item.name)}`);
    if (existing.length) { console.log("refresh lost-found image:", item.name); continue; }
    const row = await rest("lost_found_items", {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify([{ type: item.type, name: item.name, category: item.category, location: item.location, description: item.description, date: new Date(Date.now() - (index + 1) * 864e5).toISOString().slice(0, 10), photo_url: photo, status: "reported", reported_by: ADMIN_ID }]),
    });
    console.log("seeded lost-found:", row[0].name);
  }

  console.log("\nSeed complete.");
} catch (error) {
  console.error("SEED FAILED:", error.message);
  process.exit(1);
}
