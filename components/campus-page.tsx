"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle, Archive, ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, Camera, Check,
  CheckCircle2, ChevronDown, CircleHelp, ClipboardList, Download, Eye, EyeOff, FileText,
  Filter, GraduationCap, LayoutDashboard, LoaderCircle, LockKeyhole, LogOut, MapPin, Menu,
  Megaphone, MessageSquareText, MoreHorizontal, PackageSearch, Pencil, Plus,
  Search, Send, Settings2, ShieldCheck, Sparkles, Trash2, Upload, UserRound,
  UsersRound, X, Clock3, BarChart3, TrendingUp, CalendarCheck, Mail, Inbox, ImagePlus, KeyRound,
  LogIn, UserPlus, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { dashboardRouteForRole } from "@/lib/constants/routes";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";
import { toPublicationLabel, statusTone, PUBLICATION_STATUSES, ITEM_STATUSES, ITEM_TYPES, type PublicationStatus, type ItemType } from "@/lib/constants/statuses";
import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_AUDIENCES } from "@/lib/constants/categories";
import { useAnnouncementMutations, useAnnouncements } from "@/lib/hooks/use-announcements";
import { isAnnouncementAudience, isAnnouncementCategory, type AnnouncementDraft, type AnnouncementRow as AnnouncementRecord } from "@/lib/announcements";

type PageKey = string;
type Role = "student" | "staff" | "admin";

type Status = "Pending" | "In Progress" | "Resolved" | "Urgent" | "Published" | "Draft" | "Open" | "Claimed" | "Upcoming" | "Past" | "Active" | "Deactivated";

/** Row shapes as they come back from Supabase, so list views stay typed. */
type AnnouncementRow = Database["public"]["Tables"]["announcements"]["Row"];
type EventRow = Database["public"]["Tables"]["events"]["Row"];
type ConcernRow = Database["public"]["Tables"]["concerns"]["Row"];
type LostFoundRow = Database["public"]["Tables"]["lost_found_items"]["Row"];

/**
 * View model for the concerns table. Deliberately looser than the
 * `concerns` row: the list pages project a joined, denormalised shape
 * (student name, assignee name) that no single column carries.
 */
type ConcernListItem = {
  id: string;
  subject: string;
  category: string | null;
  status: string;
  submittedAt: string;
  studentName?: string | null;
  assignee?: string | null;
};

/** Cover gradients cycled across event cards so no two neighbours match. */
const EVENT_COVER_TONES = ["bg-event-blue", "bg-event-green", "bg-event-amber"] as const;

/** Tab order for the lost/found switcher. */
const ITEM_STATUS_TAB_ORDER = [ITEM_TYPES.LOST, ITEM_TYPES.FOUND] as const;

/** Number of body characters shown in a list card before truncating. */
const ANNOUNCEMENT_EXCERPT_LENGTH = 180;

function formatAnnouncementDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function excerptFrom(body: string | null | undefined): string {
  const text = (body ?? "").trim();
  if (text.length <= ANNOUNCEMENT_EXCERPT_LENGTH) return text;
  return `${text.slice(0, ANNOUNCEMENT_EXCERPT_LENGTH).trimEnd()}…`;
}

/** `lost_found_items.status` is stored lowercase; map it to the chip label. */
function toItemStatusLabel(value: string | null | undefined): string {
  return value === "claimed" ? ITEM_STATUSES.CLAIMED : ITEM_STATUSES.OPEN;
}

/** Status chip shared by every list and detail view; tone comes from the shared map. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}><span className="size-1.5 rounded-full bg-current" />{status}</Badge>;
}

const studentNav = [
  ["Dashboard", "/dashboard", LayoutDashboard], ["Announcements", "/announcements", Megaphone], ["Events", "/events", CalendarDays], ["Concerns", "/concerns", MessageSquareText], ["Lost & Found", "/lost-found", PackageSearch], ["Notifications", "/notifications", Bell], ["Profile", "/profile", UserRound],
] as const;
const staffNav = [["Dashboard", "/staff/dashboard", LayoutDashboard], ["Concerns", "/staff/concerns", MessageSquareText], ["Lost & Found", "/staff/lost-found", PackageSearch]] as const;
const adminNav = [["Dashboard", "/admin/dashboard", LayoutDashboard], ["Announcements", "/admin/announcements", Megaphone], ["Events", "/admin/events", CalendarDays], ["Concerns", "/admin/concerns", MessageSquareText], ["Lost & Found", "/admin/lost-found", PackageSearch], ["Users", "/admin/users", UsersRound], ["Reports", "/admin/reports", BarChart3]] as const;

function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-brand"><GraduationCap className="size-5" /></span>{!compact && <span className="text-lg font-bold text-foreground">Campus<span className="text-primary">Connect</span></span>}</Link>;
}
function PublicNav() {
  const [open,setOpen]=useState(false);
  return <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8"><Brand/><nav className="hidden items-center gap-8 md:flex"><Link href="/announcements" className="nav-link">Announcements</Link><Link href="/events" className="nav-link">Events</Link><Link href="/lost-found" className="nav-link">Lost & Found</Link></nav><div className="hidden items-center gap-2 md:flex"><Button variant="ghost" asChild><Link href="/login">Log in</Link></Button><Button asChild><Link href="/signup">Sign up</Link></Button></div><Button variant="ghost" size="icon" className="md:hidden" onClick={()=>setOpen(!open)} aria-label="Toggle menu">{open?<X/>:<Menu/>}</Button></div>{open&&<div className="border-t border-border bg-background px-5 py-4 md:hidden"><div className="grid gap-2"><Link href="/announcements" className="mobile-link">Announcements</Link><Link href="/events" className="mobile-link">Events</Link><Link href="/lost-found" className="mobile-link">Lost & Found</Link><Button asChild><Link href="/login">Log in</Link></Button></div></div>}</header>;
}
export function AnnouncementCards({ items, student=false, emptyText="Announcements will appear here once they are published." }: { items?: AnnouncementRow[]; student?: boolean; emptyText?: string }) {
  if (!items || items.length === 0) return <EmptyState title="No announcements yet" text={emptyText}/>;
  return <div className="space-y-3">{items.map((a,i)=><article key={a.id} className="content-card group animate-rise" style={{animationDelay:`${i*60}ms`}}><div className="flex flex-wrap items-center gap-2"><span className="category-badge">{a.category}</span><span className="text-xs text-muted-foreground">{formatAnnouncementDate(a.created_at)}</span>{student&&<StatusBadge status={toPublicationLabel(a.status)}/>}</div><h2 className="mt-3 text-lg font-semibold group-hover:text-primary">{a.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{excerptFrom(a.body)}</p><Link href={`/announcements/${a.id}${student?"?view=student":""}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Read more <ArrowRight/></Link></article>)}</div>;
}
export function EventCards({ items, register=false }: { items?: EventRow[]; register?: boolean }) {
  if (!items || items.length === 0) return <EmptyState title="No events yet" text="New campus events will appear here once they are published."/>;
  return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((e,i)=>{const startsAt=new Date(e.start_time);return <article key={e.id} className="event-card animate-rise" style={{animationDelay:`${i*70}ms`}}><div className={cn("relative flex h-40 items-end p-5",EVENT_COVER_TONES[i%3])}><span className="rounded-md bg-background/90 px-3 py-2 text-center text-xs font-bold text-foreground shadow-sm">{startsAt.toLocaleDateString(undefined,{month:"short"})}<strong className="block text-xl text-primary">{startsAt.getDate()}</strong></span></div><div className="p-5"><span className="category-badge">{e.category}</span><h2 className="mt-3 text-lg font-semibold">{e.title}</h2><div className="mt-4 space-y-2 text-sm text-muted-foreground"><p className="flex items-center gap-2"><CalendarDays/>{startsAt.toLocaleString()}</p><p className="flex items-center gap-2"><MapPin/>{e.location}</p>{register&&e.capacity!=null&&<p className="flex items-center gap-2"><UsersRound/>{e.capacity} spots</p>}</div><Button className="mt-5 w-full" variant={register?"default":"outline"} asChild><Link href={`/events/${e.id}${register?"?view=student":""}`}>{register?"Register":"View details"}</Link></Button></div></article>})}</div>;
}
function PublicShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background"><PublicNav/><main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">{children}</main></div>;
}
/**
 * Public-facing composition point: the guest shell plus a page header, so a
 * server page can keep its own `metadata` and hand a Client Component the body.
 */
export function PublicPage({ title, text, actions, children }: { title: string; text: string; actions?: ReactNode; children: ReactNode }) {
  return <PublicShell><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="page-title">{title}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{text}</p></div>{actions}</div>{children}</PublicShell>;
}
function AppShell({ role, title, subtitle, actions, children }: { role: Role; title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  const { unreadCount } = useNotifications();
  const path=usePathname();
  const [collapsed,setCollapsed]=useState(false);
  const nav=role==="admin"?adminNav:role==="staff"?staffNav:studentNav;
  return <div className="min-h-screen bg-app"><aside className={cn("fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:flex lg:flex-col",collapsed?"w-20":"w-64")}><div className="flex h-20 items-center justify-between px-5"><Brand compact={collapsed}/><Button variant="ghost" size="icon" onClick={()=>setCollapsed(!collapsed)} aria-label="Collapse sidebar"><Menu/></Button></div><nav className="flex-1 space-y-1 px-3">{nav.map(([label,href,Icon])=><Link key={href} href={href} title={label} className={cn("sidebar-link", path===href&&"sidebar-link-active",collapsed&&"justify-center px-0")}><Icon/>{!collapsed&&<span>{label}</span>}</Link>)}</nav><div className="border-t border-sidebar-border p-3"><Link href="/" className={cn("sidebar-link",collapsed&&"justify-center px-0")}><LogOut/>{!collapsed&&"Exit demo"}</Link></div></aside><div className={cn("transition-all duration-300",collapsed?"lg:pl-20":"lg:pl-64")}><header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-xl lg:px-8"><div className="lg:hidden"><Brand compact/></div><div className="relative hidden w-full max-w-sm lg:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" placeholder="Search CampusConnect" /></div><div className="flex items-center gap-2"><Button variant="ghost" size="icon" className="relative" aria-label="Notifications" asChild><Link href="/notifications"><Bell/><span className="absolute right-2 top-2 size-2 rounded-full bg-danger ring-2 ring-background"/></Link></Button><div className="ml-1 flex items-center gap-2 border-l border-border pl-3"><span className="grid size-9 place-items-center rounded-full bg-primary-soft font-semibold text-primary">MS</span><div className="hidden text-left sm:block"><p className="text-sm font-semibold">Maya Santos</p><p className="text-xs capitalize text-muted-foreground">{role}</p></div><ChevronDown className="size-4 text-muted-foreground"/></div></div></header><main className="mx-auto max-w-[1480px] px-5 py-7 pb-24 lg:px-8 lg:py-9"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-sm font-semibold uppercase text-primary">{role==="admin"?"Administration":role==="staff"?"Personnel portal":"Student portal"}</p><h1 className="page-title">{title}</h1>{subtitle&&<p className="mt-2 text-muted-foreground">{subtitle}</p>}</div>{actions}</div>{children}</main><nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-background px-2 py-2 lg:hidden">{nav.slice(0,4).map(([label,href,Icon])=><Link key={href} href={href} className={cn("flex flex-col items-center gap-1 py-1 text-[11px] font-medium text-muted-foreground",path===href&&"text-primary")}><Icon className="size-5"/><span>{label}</span></Link>)}</nav></div></div>;
}
function PageHeader({ title, text }: { title: string; text: string }) { return <div className="mb-8"><h1 className="page-title">{title}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{text}</p></div>; }
function Filters({ search="Search", extra=true, value, onValue }: { search?: string; extra?: boolean; value?: string; onValue?: (value:string)=>void }) { return <div className="mb-6 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" placeholder={search} value={value} onChange={e=>onValue?.(e.target.value)}/></div>{extra&&<><select className="field-select"><option>All categories</option><option>Academic</option><option>Facilities</option><option>Community</option></select><Button variant="outline"><Filter/>Filters</Button></>}</div>; }
export function EmptyState({ title, text, action }: { title:string; text:string; action?:ReactNode }) { return <div className="empty-state animate-rise"><span className="empty-state-icon"><Inbox/></span><h2 className="mt-4 text-lg font-bold">{title}</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{text}</p>{action&&<div className="mt-5">{action}</div>}</div>; }
function StatCard({ label,value,icon,trend }: {label:string;value:string|number;icon:any;trend?:string}) { return <div className="stat-card"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p>{trend&&<p className="mt-2 text-xs font-medium text-success"><TrendingUp className="mr-1 inline size-3"/>{trend}</p>}</div><span className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary">{icon}</span></div></div>; }
export function Section({title,action,children}:{title:string;action?:ReactNode;children:ReactNode}) { return <section className="section-panel"><div className="mb-5 flex items-center justify-between"><h2 className="section-title">{title}</h2>{action}</div>{children}</section>; }
function AssignConcernDialog({ concern }: { concern: ConcernListItem }) { const [assignee,setAssignee]=useState(concern.assignee ?? "Unassigned"); return <Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Assign ${concern.subject}`}><UserRound/></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Assign concern</DialogTitle><DialogDescription>Choose the personnel team responsible for {concern.id}.</DialogDescription></DialogHeader><div className="rounded-md border border-border bg-muted/50 p-4"><p className="text-sm font-semibold">{concern.subject}</p><p className="mt-1 text-xs text-muted-foreground">Submitted by {concern.studentName} · {concern.category}</p></div><FormField label="Assign to personnel"><select className="field-select w-full" value={assignee} onChange={e=>setAssignee(e.target.value)}><option>Unassigned</option><option>Facilities Team</option><option>Student Services</option><option>Safety Office</option><option>Academic Affairs</option></select></FormField><div className="flex items-start gap-3 rounded-md bg-primary-soft p-3 text-sm text-primary"><Bell className="mt-0.5 shrink-0"/><p>The selected team will be notified and can update the concern immediately.</p></div><DialogFooter><Button onClick={()=>toast.success(`${concern.id} assigned to ${assignee}`)}>Confirm assignment</Button></DialogFooter></DialogContent></Dialog>; }
export function ConcernsTable({ admin=false, staff=false, items, concerns }: { admin?:boolean;staff?:boolean;items?: ConcernListItem[];concerns?: ConcernListItem[] }) {
  const rows = items ?? concerns ?? [];
  if(!rows.length)return <EmptyState title="No concerns found" text="Try changing your search or filters. New concerns will appear here when submitted."/>;
  return <div className="table-shell">
    <div className="hidden grid-cols-[1.6fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-border bg-muted/60 px-5 py-3 text-xs font-semibold uppercase text-muted-foreground md:grid">
      <span>Subject</span>
      <span>{admin||staff?"Student":"Category"}</span>
      <span>Category</span>
      <span>Status</span>
      <span>Date</span>
      <span>Actions</span>
    </div>
    {rows.map(c=> (
      <div key={c.id} className="data-grid-row md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_auto]">
        <div>
          <p className="font-semibold">{c.subject}</p>
          <p className="mt-1 text-xs text-muted-foreground">{c.id}</p>
        </div>
        <div>
          <span className="mobile-label">{admin||staff?"Student":"Category"}</span>
          {admin||staff?c.studentName:c.category}
        </div>
        <div className="hidden md:block">
          {c.category}
        </div>
        <div>
          <span className="mobile-label">Status</span>
          <StatusBadge status={c.status as Status} />
        </div>
        <div>
          <span className="mobile-label">Date</span>
          {c.submittedAt}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href={staff?`/staff/concerns/${c.id}`:`/concerns/${c.id}`} aria-label={`View ${c.subject}`}>
              <Eye/>
            </Link>
          </Button>
          {admin&&<AssignConcernDialog concern={c}/>}
        </div>
      </div>
    ))}
  </div>;
}
function ChangeRoleDialog({ name, currentRole }: { name:string; currentRole:string }) { const [role,setRole]=useState(currentRole); return <Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Change role for ${name}`}><Pencil/></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Change account role</DialogTitle><DialogDescription>Update the permissions available to {name}.</DialogDescription></DialogHeader><div className="flex items-center gap-3 rounded-md border border-border p-4"><span className="avatar">{name.split(" ").map(x=>x.charAt(0)).join("")}</span><div><p className="font-semibold">{name}</p><p className="text-xs text-muted-foreground">Current role: {currentRole}</p></div></div><FormField label="New role"><select className="field-select w-full" value={role} onChange={e=>setRole(e.target.value)}><option>Student</option><option>Personnel</option><option>Admin</option></select></FormField><div className="flex items-start gap-3 rounded-md bg-warning-soft p-3 text-sm text-warning"><AlertCircle className="mt-0.5 shrink-0"/><p>Permission changes take effect immediately. Admin access includes user and campus-wide management.</p></div><DialogFooter><Button onClick={()=>toast.success(`${name} is now ${role}`)}>Confirm role change</Button></DialogFooter></DialogContent></Dialog>; }
export function ManagementTable({kind, data}:{kind:"announcements"|"events"|"lost"|"users"; data?: any[]}) {
  // Use real data if provided, otherwise show empty state
  const rows = (data || []).map((item) => {
    if (kind === "announcements") {
      return [item.title, item.category, item.date, item.status || "Published"];
    } else if (kind === "events") {
      return [item.title, item.location, item.date, `${item.cap - item.spots} registered`];
    } else if (kind === "lost") {
      return [item.name, item.type, item.date, item.status];
    } else { // users
      return [item.full_name || `${item.first_name} ${item.last_name}`, item.email, item.role, item.status || "Active"];
    }
  });
  return <div className="table-shell">{rows.map((r,i)=>{ const [name = "", detail = "", date = "", status = "Open"]: string[] = r; return <div key={i} className="data-grid-row md:grid-cols-[1.8fr_1fr_1fr_1fr_auto]"><div className="flex items-center gap-3">{kind==="users"&&<span className="grid size-9 place-items-center rounded-full bg-primary-soft font-semibold text-primary">{name.split(" ").map((x: string)=>x.charAt(0)).join("")}</span>}<span className="font-semibold">{name}</span></div><div>{detail}</div><div>{date}</div><div><StatusBadge status={status}/></div><div className="flex gap-1">{kind==="users"?<ChangeRoleDialog name={name} currentRole={date}/>:<Button variant="ghost" size="icon" aria-label={`Edit ${name}`} onClick={()=>toast("Edit panel opened")}><Pencil/></Button>}<Button variant="ghost" size="icon" aria-label={`More options for ${name}`} onClick={()=>toast("More actions opened")}><MoreHorizontal/></Button></div></div>})}</div>;
}
function MiniChart({type="bar"}:{type?:"bar"|"line"|"donut"}) { const vals=[42,64,48,76,58,88,72]; return <div className="mt-5 flex h-44 items-end gap-3 border-b border-border px-2 pb-0">{type==="donut"?<div className="mx-auto mb-5 grid size-36 place-items-center rounded-full bg-chart-ring"><div className="grid size-20 place-items-center rounded-full bg-card text-center"><span><strong className="block text-2xl">78%</strong><small className="text-muted-foreground">resolved</small></span></div></div>:vals.map((v,i)=><div key={i} className="flex h-full flex-1 items-end"><span className={cn("w-full rounded-t-sm",type==="line"?"bg-accent":"bg-primary/75")} style={{height:`${v}%`}}/></div>)}</div>; }
export function AdminDashboard({reports=false, stats, concernsByStatus, eventsAttendance, lostFoundResolution}:{reports?:boolean; stats?:{totalUsers:number; activeConcerns:number; upcomingEvents:number; openItems:number}; concernsByStatus?:Array<{status:string; count:number}>; eventsAttendance?:Array<{title:string; capacity:number; event_registrations:Array<{count:number}>}>; lostFoundResolution?:Array<{status:string; count:number}>}) {
  return <AppShell role="admin" title={reports?"Reports & insights":"Good afternoon, Dr. Lim"} subtitle={reports?"Understand service performance across the campus.":"Here’s what’s happening across CampusConnect today."} actions={reports?<Button onClick={()=>toast.success("Report export started")}><Download/>Export CSV/PDF</Button>:undefined}>
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={reports?"Concerns resolved":"Total users"} value={stats?.totalUsers ?? 0} icon={UsersRound} trend="8.4% this month"/>
      <StatCard label="Active concerns" value={stats?.activeConcerns ?? 0} icon={MessageSquareText}/>
      <StatCard label="Upcoming events" value={stats?.upcomingEvents ?? 0} icon={CalendarDays}/>
      <StatCard label="Open item reports" value={stats?.openItems ?? 0} icon={PackageSearch}/>
    </div>
    {reports&&<Filters search="Filter report data"/>}
    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Concerns by status">
        <div className="flex gap-4 text-xs text-muted-foreground">
          {(concernsByStatus || []).map((item) => (
            <span key={item.status}>● {item.status}</span>
          ))}
        </div>
        {(concernsByStatus || []).length > 0 ? <MiniChart/> : null}
      </Section>
      <Section title={reports?"Lost & found resolution rate":"New user signups"}>
        {reports ? (
          <>
            <div className="flex gap-4 text-xs text-muted-foreground">
              {(lostFoundResolution || []).map((item) => (
                <span key={item.status}>● {item.status}</span>
              ))}
            </div>
            <MiniChart type="donut"/>
          </>
        ) : (
          <>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>● New users this month</span>
            </div>
            <MiniChart type="line"/>
          </>
        )}
      </Section>
      {reports&&<Section title="Events by attendance">
        <MiniChart/>
      </Section>}
    </div>
  </AppShell>;
}
function Thread({staff=false}:{staff?:boolean}) { return <AppShell role={staff?"staff":"student"} title="Air conditioning in Room 304" subtitle="Concern CC-1048 · Facility"><div className="grid gap-6 xl:grid-cols-[1fr_320px]"><Section title="Conversation"><div className="space-y-6"><div className="thread-item"><span className="avatar">MS</span><div><div className="flex flex-wrap items-center gap-2"><strong>Maya Santos</strong><span className="text-xs text-muted-foreground">Sep 24 · 10:18 AM</span></div><p className="mt-2 text-sm leading-6 text-muted-foreground">The air conditioning in Room 304 has not been working since Monday. Our afternoon classes have become uncomfortable.</p></div></div><div className="thread-item"><span className="avatar bg-success-soft text-success"><ShieldCheck/></span><div><div className="flex flex-wrap items-center gap-2"><strong>Facilities Team</strong><span className="text-xs text-muted-foreground">Sep 24 · 2:40 PM</span></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Thanks for reporting this. A technician has inspected the unit and replacement parts are scheduled for tomorrow.</p></div></div></div><div className="mt-6 border-t border-border pt-5"><Textarea placeholder={staff?"Reply to the student…":"Add a follow-up comment…"}/><div className="mt-3 flex justify-end"><Button onClick={()=>toast.success("Reply sent")}><Send/>{staff?"Send response":"Add comment"}</Button></div></div></Section><Section title="Concern details"><dl className="detail-list"><div><dt>Status</dt><dd>{staff?<select className="field-select w-full"><option>In Progress</option><option>Pending</option><option>Resolved</option></select>:<StatusBadge status="In Progress"/>}</dd></div><div><dt>Category</dt><dd>Facility</dd></div><div><dt>Submitted</dt><dd>Sep 24, 2026</dd></div><div><dt>Assigned to</dt><dd>Facilities Team</dd></div></dl></Section></div></AppShell>; }
function FormField({label,children,note}:{label:string;children:ReactNode;note?:string}) {return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span>{children}{note&&<span className="mt-1.5 block text-xs text-muted-foreground">{note}</span>}</label>}
function FormPage({lost=false}:{lost?:boolean}) { const [mode,setMode]=useState("Lost"); return <AppShell role="student" title={lost?"Report a lost or found item":"Submit a concern"} subtitle={lost?"Help reunite campus items with their owners.":"Tell us what happened and the right team will follow up."}><div className="max-w-3xl"><Section title={lost?"Item details":"Concern details"}><form className="space-y-5" onSubmit={e=>{e.preventDefault();toast.success(lost?"Item report submitted":"Concern submitted successfully")}}>{lost&&<div className="segmented">{["Lost","Found"].map(x=><Button type="button" key={x} variant={mode===x?"default":"ghost"} onClick={()=>setMode(x)}>{x}</Button>)}</div>}<div className="grid gap-5 sm:grid-cols-2"><FormField label={lost?"Item name":"Category"}>{lost?<Input placeholder="e.g. Black umbrella"/>:<select className="field-select w-full"><option>Academic</option><option>Facility</option><option>Administrative</option><option>Other</option></select>}</FormField><FormField label={lost?"Category":"Subject"}>{lost?<select className="field-select w-full"><option>Personal item</option><option>Electronics</option><option>Documents</option></select>:<Input placeholder="Briefly summarize your concern"/>}</FormField></div>{lost&&<div className="grid gap-5 sm:grid-cols-2"><FormField label="Location"><Input placeholder="Where was it lost or found?"/></FormField><FormField label="Date"><Input type="date"/></FormField></div>}<FormField label="Description"><Textarea className="min-h-36" placeholder="Add helpful details…"/></FormField><FormField label={lost?"Photo":"Attachment (optional)"} note="PNG, JPG or PDF up to 10 MB"><button type="button" className="upload-zone"><Upload/><span>{lost?"Upload a clear photo":"Drop a file here or browse"}</span></button></FormField><div className="flex justify-end"><Button size="lg" type="submit"><Send/>{lost?"Submit report":"Submit concern"}</Button></div></form></Section></div></AppShell> }
function AuthField({ label, type = "text", placeholder, icon: Icon, onValue, delay, children }: { label: string; type?: string; placeholder: string; icon: typeof Mail; onValue?: (v: string) => void; delay?: number; children?: ReactNode }) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <div className="animate-rise" style={{ animationDelay: `${delay ?? 0}ms` }}>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <div className="auth-field">
        <Icon />
        <Input className="h-11 pl-10" type={isPw && show ? "text" : type} placeholder={placeholder} onChange={(e) => onValue?.(e.target.value)} />
        {isPw && <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>}
      </div>
      {children}
    </div>
  );
}
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-5">
      <path d="M7.18 4.554a7.8 7.8 0 0 1 4.82-1.66c2.06 0 3.92.86 5.26 2.24a.55.55 0 0 1-.01.77l-1.75 1.75a.55.55 0 0 1-.76.01 4.63 4.63 0 0 0-2.74-1.42v2.35h3.86a.55.55 0 0 1 .54.65 7.85 7.85 0 0 1-1.98 3.98l1.9 1.9a.55.55 0 0 1 0 .78 9.87 9.87 0 0 1-6.32 2.32c-4.14 0-7.8-2.63-9.16-6.5a.55.55 0 0 1 .52-.73h3.06a.55.55 0 0 1 .52.37 5.3 5.3 0 0 0 1.24 1.95v-2.9H3.5a.55.55 0 0 1-.53-.7 9.9 9.9 0 0 1 4.21-5.94" />
    </svg>
  );
}
function AuthPage({ signup = false }: { signup?: boolean }) {
  const [busy, setBusy] = useState(false);
  const submit = (e: React.FormEvent) => { e.preventDefault(); setBusy(true); window.sessionStorage.setItem("cc-session","1"); setTimeout(() => { location.href = "/dashboard"; }, 1100); };
  const google = () => { window.location.href = "/api/auth/google"; };
  return (
    <div className="auth-bg flex min-h-screen flex-col">
      <div className="px-5 pt-5 sm:px-8"><Brand /></div>
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="auth-card animate-rise w-full max-w-md">
          <div className="text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-brand transition-transform hover:scale-110 hover:-rotate-6"><GraduationCap /></span>
            <h1 className="mt-5 text-2xl font-bold">{signup ? "Create your account" : "Welcome back"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{signup ? "Join your campus community" : "Log in to continue to CampusConnect"}</p>
          </div>

          {/* Social login buttons */}
          <div className="mb-6">
            <Button variant="outline" className="w-full flex items-center justify-start gap-3" onClick={google}>
              <span className="flex items-center justify-center size-9 rounded-md bg-[rgb(220,38,38)] text-[rgb(255,255,255)]"><GoogleMark /></span>
              Sign in with Google
            </Button>
            <Button variant="outline" className="w-full flex items-center justify-start gap-3 mt-3">
              <span className="flex items-center justify-center size-9 rounded-md bg-[rgb(59,130,246)] text-[rgb(255,255,255)]"><UserRound className="size-5" /></span>
              Sign in with Campus ID
            </Button>
          </div>

          <div className="border-t border-border/50 mt-6 pt-4">
            <p className="text-center text-sm text-muted-foreground">— or —</p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {signup && <AuthField label="Full name" placeholder="Your full name" icon={UserRound} delay={60} />}
            <AuthField label="Email" type="email" placeholder="you@campus.edu" icon={Mail} delay={120} />
            <AuthField label="Password" type="password" placeholder="••••••••" icon={LockKeyhole} delay={180} />
            {signup && (
              <div className="animate-rise flex items-center gap-3 rounded-lg border border-border bg-muted/60 p-3" style={{ animationDelay: "240ms" }}>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><UserRound /></span>
                <div><p className="text-sm font-semibold">Role: Student</p><p className="text-xs text-muted-foreground">Personnel and admin accounts are assigned separately by the school.</p></div>
              </div>
            )}
            {!signup && (
              <div className="animate-rise flex items-center justify-between text-sm" style={{ animationDelay: "240ms" }}>
                <label className="flex cursor-pointer items-center gap-2 font-medium text-muted-foreground"><input type="checkbox" className="size-4 accent-[var(--color-primary)]" defaultChecked />Remember me</label>
                <Link href="/forgot-password" className="font-semibold text-primary hover:underline">Forgot password?</Link>
              </div>
            )}
            <div className="animate-rise" style={{ animationDelay: "300ms" }}>
              <Button className="h-11 w-full text-base" type="submit" disabled={busy}>
                {busy ? <><LoaderCircle className="size-4 animate-spin" />{signup ? "Creating account…" : "Signing you in…"}</> : <>{signup ? "Create account" : "Log in"}<ArrowRight className="size-4" /></>}
              </Button>
            </div>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">{signup ? "Already have an account? " : "Don’t have an account? "}<Link className="font-semibold text-primary hover:underline" href={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Sign up"}</Link></p>
        </div>
      </div>
    </div>
  );
}
function ForgotPassword(){const[sent,setSent]=useState(false);return <div className="auth-bg flex min-h-screen flex-col"><div className="px-5 pt-5 sm:px-8"><Brand/></div><div className="flex flex-1 items-center justify-center px-5 py-12"><div className="auth-card animate-rise">{sent?<div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success"><CheckCircle2 className="size-7"/></span><h1 className="mt-5 text-2xl font-bold">Check your email</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">If an account matches that address, we sent instructions to reset your password.</p><Button className="mt-7 w-full" asChild><Link href="/login"><ArrowLeft/>Back to login</Link></Button></div>:<><div className="text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary-soft text-primary"><KeyRound/></span><h1 className="mt-5 text-2xl font-bold">Reset your password</h1><p className="mt-2 text-sm text-muted-foreground">Enter your campus email and we’ll send reset instructions.</p></div><form className="mt-7 space-y-5" onSubmit={e=>{e.preventDefault();setSent(true)}}><AuthField label="Campus email" type="email" placeholder="you@campus.edu" icon={Mail}/><Button className="h-11 w-full" type="submit">Send reset link<ArrowRight/></Button></form><Link href="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-primary"><ArrowLeft/>Back to login</Link></>}</div></div></div>}
function Landing() {
  const [announcementsData, setAnnouncementsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setAnnouncementsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="bg-background"><PublicNav/><main><div className="min-h-screen flex items-center justify-center">Loading...</div></main></div>;
  if (error) return <div className="bg-background"><PublicNav/><main><div className="min-h-screen flex items-center justify-center">Error: {error}</div></main></div>;

  return <div className="bg-background"><PublicNav/><main><section className="hero-section"><div className="hero-grid mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="animate-rise"><span className="eyebrow"><Sparkles/>Your campus, connected</span><h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[1.08] sm:text-6xl lg:text-7xl">All your campus updates, <span className="text-primary">in one place.</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Stay informed, join events, raise concerns, and reconnect lost items with one trusted campus hub.</p><div className="mt-8 flex flex-wrap gap-3"><Button size="lg" asChild><Link href="/login">Log in</Link></Button><Button size="lg" variant="outline" asChild><Link href="/signup">Sign up</Link></Button></div><div className="mt-12 flex flex-wrap gap-6 text-sm text-muted-foreground"><span className="flex items-center gap-2"><CheckCircle2 className="text-success"/>Verified campus updates</span><span className="flex items-center gap-2"><CheckCircle2 className="text-success"/>Fast service requests</span></div></div><div className="hero-preview animate-float"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Good morning, Maya</p><h2 className="text-xl font-bold">Campus overview</h2></div><span className="grid size-10 place-items-center rounded-full bg-primary-soft font-semibold text-primary">MS</span></div><div className="space-y-3">{announcementsData.slice(0,3).map((a,i)=><div className="flex gap-3 rounded-md border border-border bg-background p-4" key={a.id}><span className={cn("grid size-10 shrink-0 place-items-center rounded-md",i===0?"bg-primary-soft text-primary":i===1?"bg-success-soft text-success":"bg-warning-soft text-warning")}><Megaphone/></span><div><p className="text-sm font-semibold">{a.title}</p><p className="mt-1 text-xs text-muted-foreground">{a.date}</p></div></div>)}</div></div></div></section><section className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="mb-10 max-w-2xl"><p className="eyebrow">Everything you need</p><h2 className="mt-4 text-3xl font-bold sm:text-4xl">Campus life, simplified.</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[[Megaphone,"Announcements","Never miss an important campus update."],[CalendarDays,"Events","Discover and register for campus activities."],[MessageSquareText,"Concerns","Reach the right team and track progress."],[PackageSearch,"Lost & Found","Report and recover misplaced items."]].map(([Icon,t,d]:any)=><div className="feature-card" key={t}><span className="feature-icon"><Icon/></span><h3 className="mt-5 font-bold">{t}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{d}</p></div>)}</div></section><section className="border-y border-border bg-muted/45"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="mb-8 flex items-end justify-between"><div><p className="eyebrow">From the campus</p><h2 className="mt-3 text-3xl font-bold">Latest announcements</h2></div><Link href="/announcements" className="hidden font-semibold text-primary sm:block">View all →</Link></div><div className="grid gap-4 md:grid-cols-3">{announcementsData.slice(0,3).map(a=><article className="content-card" key={a.id}><span className="category-badge">{a.category}</span><h3 className="mt-4 font-bold">{a.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{a.excerpt}</p></article>)}</div></div></section></main><footer className="border-t border-border"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-5 py-10 sm:flex-row lg:px-8"><div><Brand/><p className="mt-3 text-sm text-muted-foreground">Northbridge University · Student Services</p></div><div className="text-sm text-muted-foreground"><p className="font-semibold text-foreground">Need help?</p><p className="mt-2">studentservices@northbridge.edu</p><p>+65 6123 4567</p></div></div></footer></div>;
}
function PublicList({eventsPage=false}:{eventsPage?:boolean}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [eventsPage]);

  const fetchData = async () => {
    try {
      if (eventsPage) {
        // Fetch events
        const { data: eventData, error } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setData(eventData);
      } else {
        // Fetch announcements
        const { data: announcementData, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setData(announcementData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen"><PublicNav/><main className="mx-auto max-w-7xl px-5 py-12 lg:px-8"><div className="min-h-screen flex items-center justify-center">Loading...</div></main></div>;
  if (error) return <div className="min-h-screen"><PublicNav/><main className="mx-auto max-w-7xl px-5 py-12 lg:px-8"><div className="min-h-screen flex items-center justify-center">Error: {error}</div></main></div>;

  return <div className="min-h-screen"><PublicNav/><main className="mx-auto max-w-7xl px-5 py-12 lg:px-8"><PageHeader title={eventsPage?"Campus events":"Announcements"} text={eventsPage?"Discover workshops, activities, and moments to connect.":"News and important information from across the university."}/><Filters search={eventsPage?"Search events":"Search announcements"}/>{eventsPage?<EventCards items={data}/> : <AnnouncementCards items={data}/>}<div className="mt-8 flex justify-center gap-2"><Button variant="outline" size="icon">1</Button><Button variant="ghost" size="icon">2</Button><Button variant="ghost" size="icon">3</Button></div></main></div>;
}
function StudentDashboard() {
  const [announcementsData, setAnnouncementsData] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch announcements
      const { data: announcementData, error: announcementError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (announcementError) throw announcementError;
      setAnnouncementsData(announcementData);

      // Fetch events
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true })
        .limit(3);

      if (eventError) throw eventError;
      setEventsData(eventData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <AppShell role="student" title="Good afternoon, Maya" subtitle="Here’s what’s happening around campus today."><div className="min-h-screen flex items-center justify-center">Loading...</div></AppShell>;
  if (error) return <AppShell role="student" title="Good afternoon, Maya" subtitle="Here’s what’s happening around campus today."><div className="min-h-screen flex items-center justify-center">Error: {error}</div></AppShell>;

  return <AppShell role="student" title="Good afternoon, Maya" subtitle="Here’s what’s happening around campus today."><div className="mb-6 grid gap-4 sm:grid-cols-3"><StatCard label="Unread announcements" value="4" icon={Megaphone}/><StatCard label="Upcoming events" value="3" icon={CalendarCheck}/><StatCard label="Open concerns" value="2" icon={MessageSquareText}/></div><div className="grid gap-6 xl:grid-cols-2"><Section title="Recent announcements" action={<Link href="/announcements" className="section-link">View all</Link>}><div className="divide-y divide-border">{announcementsData.slice(0,3).map(a=><div className="py-3 first:pt-0" key={a.id}><span className="category-badge">{a.category}</span><p className="mt-2 font-semibold">{a.title}</p><p className="mt-1 text-xs text-muted-foreground">{a.date}</p></div>)}</div></Section><Section title="Upcoming events" action={<Link href="/events" className="section-link">View all</Link>}><div className="space-y-3">{eventsData.slice(0,3).map(e=><div className="flex items-center gap-3" key={e.id}><span className="grid size-12 shrink-0 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary">{e.day}</span><div><p className="font-semibold">{e.title}</p><p className="text-xs text-muted-foreground">{e.location}</p></div></div>)}</div></Section><div className="xl:col-span-2"><Section title="My open concerns" action={<Link href="/concerns" className="section-link">View all</Link>}><ConcernsTable/></Section></div></div></AppShell>;
}
function useGuest(){const[signedIn,setSignedIn]=useState(false);useEffect(()=>{setSignedIn(window.location.search.includes("view=student")||window.sessionStorage.getItem("cc-session")==="1")},[]);return !signedIn}
function Frame({title,subtitle,actions,children}:{title:string;subtitle?:string;actions?:ReactNode;children:ReactNode}){const guest=useGuest();if(!guest)return <AppShell role="student" title={title} {...(subtitle?{subtitle}:{})} actions={actions}>{children}</AppShell>;return <PublicShell><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end animate-rise"><div><h1 className="page-title">{title}</h1>{subtitle&&<p className="mt-2 text-muted-foreground">{subtitle}</p>}</div><Button variant="outline" asChild><Link href="/login">Log in for full access<ArrowRight/></Link></Button></div>{children}</PublicShell>}
function loginPrompt(){toast.info("Please log in to continue",{action:{label:"Log in",onClick:()=>{window.location.href="/login"}}})}
function AnnouncementDetail(){return <Frame title="Enrollment schedule for Term 2" subtitle="Academic · Posted Sep 24, 2026"><Link href="/announcements" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft/>Back to announcements</Link><article className="section-panel max-w-4xl"><span className="category-badge">Academic</span><div className="mt-6 overflow-hidden rounded-md bg-event-blue p-10 text-center"><BookOpen className="mx-auto size-16 text-primary"/></div><div className="prose-copy"><p>Online enrollment for Term 2 opens on Monday, September 28. Students are encouraged to review their assigned enrollment schedule and adviser notes in advance.</p><h2>Before you enroll</h2><p>Confirm that all outstanding academic and financial clearances are reflected in your student portal. Contact Student Services if any requirement appears incorrectly.</p><p>Enrollment help desks will be available in the Learning Commons from 8:00 AM to 5:00 PM throughout the week.</p></div></article></Frame>}
function EventDetail(){const guest=useGuest();const[registered,setRegistered]=useState(false);return <Frame title="Innovation Week 2026" subtitle="A week of ideas, making, and collaboration."><div className="grid gap-6 xl:grid-cols-[1fr_340px]"><article className="section-panel"><div className="mb-6 flex h-64 items-center justify-center rounded-md bg-event-blue"><Sparkles className="size-20 text-primary"/></div><h2 className="section-title">About this event</h2><p className="mt-4 leading-7 text-muted-foreground">Join students, faculty, and industry mentors for hands-on workshops, startup showcases, design challenges, and conversations about the future of technology.</p></article><aside className="section-panel h-fit"><div className="space-y-4"><p className="flex gap-3"><CalendarDays className="text-primary"/><span><strong className="block">October 4, 2026</strong><small className="text-muted-foreground">9:00 AM – 5:00 PM</small></span></p><p className="flex gap-3"><MapPin className="text-primary"/><span><strong className="block">University Hall</strong><small className="text-muted-foreground">Main campus</small></span></p></div><div className="my-6 border-t border-border pt-5"><div className="mb-2 flex justify-between text-sm"><span className="font-medium">42 / 60 registered</span><span className="text-muted-foreground">18 spots left</span></div><Progress value={70}/></div><Button className="w-full" size="lg" variant={registered?"secondary":"default"} onClick={()=>{if(guest){loginPrompt();return}setRegistered(!registered);toast.success(registered?"Registration cancelled":"You’re registered!")}}>{registered?<><Check/>Registered</>:"Register for this event"}</Button></aside></div></Frame>}
export function LostFound({ items }: { items?: LostFoundRow[] }) {
  const [tab, setTab] = useState<ItemType>(ITEM_TYPES.LOST);
  const [q, setQ] = useState("");
  const rows = items ?? [];

  // `type` is stored lowercase in Postgres; compare against the DB value, not the label.
  const list = rows.filter(x =>
    x.type === tab.toLowerCase() &&
    (x.name ?? "").toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <Frame
      title="Lost & Found"
      subtitle="Browse recent reports or help return an item."
      actions={<Button asChild><Link href="/lost-found/new"><Plus/>Report an item</Link></Button>}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="segmented">
          {ITEM_STATUS_TAB_ORDER.map(x => (
            <Button
              key={x}
              variant={tab === x ? "default" : "ghost"}
              onClick={() => setTab(x)}
            >
              {x} items
            </Button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={`Search ${tab.toLowerCase()} items`}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {list.length === 0 ? (
          <div className="sm:col-span-2 xl:col-span-4">
            <EmptyState title="No lost & found reports" text="Try another search or switch tabs." />
          </div>
        ) : (
          list.map(x => (
            <Link
              href={`/lost-found/${x.id}`}
              className="event-card"
              key={x.id}
            >
              <div className="grid h-44 place-items-center bg-muted">
                <PackageSearch className="size-12 text-muted-foreground" />
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <StatusBadge status={toItemStatusLabel(x.status)} />
                  <span className="text-xs text-muted-foreground">{formatAnnouncementDate(x.date)}</span>
                </div>
                <h2 className="mt-3 font-bold">{x.name}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin />
                  {x.location}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </Frame>
  );
}
function LostDetail(){const guest=useGuest();return <Frame title="Blue insulated bottle" subtitle="Lost item · Reported Sep 24"><div className="grid gap-6 xl:grid-cols-[1fr_420px]"><div className="grid min-h-96 place-items-center rounded-md bg-muted text-9xl">🥤</div><Section title="Item details"><StatusBadge status="Open"/><p className="mt-5 leading-7 text-muted-foreground">A navy blue insulated bottle with several small travel stickers. Last seen after the afternoon laboratory session.</p><dl className="detail-list mt-6"><div><dt>Location</dt><dd>Science Building, Room 205</dd></div><div><dt>Date reported</dt><dd>Sep 24, 2026</dd></div><div><dt>Category</dt><dd>Personal item</dd></div></dl><Button className="mt-6 w-full" size="lg" onClick={()=>guest?loginPrompt():toast.success("Message request sent")}><Mail/>Message reporter</Button></Section></div></Frame>}
function Profile(){return <AppShell role="student" title="My profile" subtitle="Keep your contact information up to date."><div className="max-w-3xl"><Section title="Profile information"><div className="mb-7 flex items-center gap-4"><span className="relative grid size-20 place-items-center rounded-full bg-primary-soft text-xl font-bold text-primary">MS<button className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><Camera className="size-4"/></button></span><div><p className="font-bold">Maya Santos</p><StatusBadge status="Student"/></div></div><form className="grid gap-5 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();toast.success("Profile saved")}}><FormField label="Full name"><Input defaultValue="Maya Santos"/></FormField><FormField label="Email" note="Managed by your school account"><Input defaultValue="maya.santos@campus.edu" readOnly/></FormField><FormField label="Contact number"><Input defaultValue="+65 9123 4567"/></FormField><FormField label="Account role"><Input defaultValue="Student" readOnly/></FormField><div className="sm:col-span-2"><Button type="submit">Save changes</Button></div></form></Section></div></AppShell>}
function Notifications(){const { notifications, loading, error, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  if (loading) return <AppShell role="student" title="Notifications" subtitle="Updates that need your attention." actions={<Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}><Check/>Mark all as read</Button>}><div className="section-panel p-0 text-center py-8">Loading notifications...</div></AppShell>;
  if (error) return <AppShell role="student" title="Notifications" subtitle="Updates that need your attention." actions={<Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}><Check/>Mark all as read</Button>}><div className="section-panel p-0">Error loading notifications: {error}</div></AppShell>;

  return (
    <AppShell role="student" title="Notifications" subtitle="Updates that need your attention." actions={<Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}><Check/>Mark all as read</Button>}>
      <div className="section-panel p-0 space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border rounded-lg p-4 hover:border-primary/20 transition-border ${
                  !notification.read ? 'bg-primary/5' : ''
                }`}
                onClick={() => {
                  if (!notification.read) {
                    markAsRead(notification.id);
                  }
                }}
                style={{ cursor: notification.href ? 'pointer' : 'default' }}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-primary/20 text-primary">
                    {notification.type === 'announcement' && 'A'}
                    {notification.type === 'concern' && 'C'}
                    {notification.type === 'event' && 'E'}
                    {notification.type === 'lost_found' && 'L'}
                    {notification.type === 'system' && 'S'}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold">{notification.title}</h3>
                      <time className="text-xs text-muted-foreground">
                        {new Date(notification.time).toLocaleString()}
                      </time>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.body}</p>
                    {!notification.read && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        Unread
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </AppShell>
  );
}
function StaffDashboard(){return <AppShell role="staff" title="Personnel dashboard" subtitle="Manage incoming requests and assigned work."><div className="mb-6 grid gap-4 sm:grid-cols-3"><StatCard label="Open concerns" value="24" icon={AlertCircle}/><StatCard label="In progress" value="11" icon={Clock3}/><StatCard label="Resolved this week" value="36" icon={CheckCircle2} trend="12% vs last week"/></div><Section title="Needs attention"><ConcernsTable staff/></Section></AppShell>}
function StaffLost(){return <AppShell role="staff" title="Lost & Found management" subtitle="Review reports and update item status."><Filters search="Search reported items"/><ManagementTable kind="lost"/></AppShell>}
function AdminList({kind}:{kind:"announcements"|"events"|"concerns"|"lost"|"users"}) {const labels={announcements:"Announcements",events:"Events",concerns:"Concerns",lost:"Lost & Found",users:"Users"};const title=labels[kind];return <AppShell role="admin" title={`Manage ${title}`} subtitle={`Review and manage ${title.toLowerCase()} across campus.`} actions={kind==="announcements"||kind==="events"?<CreateDialog kind={kind}/>:undefined}><Filters search={`Search ${title.toLowerCase()}`}/>{kind==="concerns"?<ConcernsTable admin/>:<ManagementTable kind={kind}/>}</AppShell>}

function CreateDialog({kind}:{kind:"announcements"|"events"}) {
  const ev = kind === "events";
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [publish, setPublish] = useState(true);
  const [img, setImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const save = async (draft: boolean) => {
    if (!title.trim()) {
      toast.error("Please add a title");
      return;
    }

    setLoading(true);
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (ev) {
        // Create event
        const eventData = {
          title,
          category: "Academic", // Default, should come from form
          location: "University Hall", // Default, should come from form
          description: "", // Default, should come from form
          start_time: new Date().toISOString(), // Default, should come from form
          end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // Default 2 hours later
          capacity: 60, // Default, should come from form
          cover_image_url: img ?? null,
          created_by: user.id,
          status: publish ? "Published" : "Draft"
        };

        const { data, error } = await supabase.from('events').insert(eventData).select().single();
        if (error) throw error;

        toast.success(`${draft ? "Event saved as draft" : "Event published!"}`);
      } else {
        // Create announcement
        const announcementData = {
          title,
          category: "Academic", // Default, should come from form
          body: "", // Default, should come from form
          status: publish ? "Published" : "Draft",
          audience: "Everyone", // Default, should come from form
          image_url: img ?? null,
          created_by: user.id
        };

        const { data, error } = await supabase.from('announcements').insert(announcementData).select().single();
        if (error) throw error;

        toast.success(`${draft ? "Announcement saved as draft" : "Announcement published!"}`);
      }

      setOpen(false);
      setTitle("");
      setImg(null);
    } catch (err) {
      toast.error(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus/>New {ev ? "Event" : "Announcement"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create {ev ? "event" : "announcement"}</DialogTitle>
          <DialogDescription>Fill in the details below. Save as a draft or publish right away.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Title">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={ev ? "e.g. Innovation Week 2026" : "e.g. Enrollment schedule for Term 2"}/>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category">
              <select className="field-select w-full">
                {(ev ? ["Academic", "Arts & Culture", "Sports", "Careers", "Community"] : ["Academic", "Campus Life", "Financial Aid", "Facilities", "Safety"]).map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FormField>
            {ev ? (
              <>
                <FormField label="Capacity">
                  <Input type="number" min={1} defaultValue={60}/>
                </FormField>
                <FormField label="Audience">
                  <select className="field-select w-full">
                    <option>Everyone (public)</option>
                    <option>Students only</option>
                    <option>Personnel only</option>
                  </select>
                </FormField>
              </>
            ) : (
              <FormField label="Audience">
                <select className="field-select w-full">
                  <option>Everyone (public)</option>
                  <option>Students only</option>
                  <option>Personnel only</option>
                </select>
              </FormField>
            )}
          </div>
          {ev && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Start date & time">
                  <Input type="datetime-local"/>
                </FormField>
                <FormField label="End date & time">
                  <Input type="datetime-local"/>
                </FormField>
              </div>
              <FormField label="Location">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                  <Input className="pl-9" placeholder="e.g. University Hall"/>
                </div>
              </FormField>
            </>
          )}
          <FormField label={ev ? "Description" : "Body"}>
            <div className="rounded-md border border-input">
              <div className="flex gap-1 border-b border-border p-1.5">
                {["B", "I", "U", "• List", "Link"].map(t => (
                  <button type="button" key={t} className="rounded px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => toast(`${t} formatting applied`)}>{t}</button>
                ))}
              </div>
              <Textarea className="min-h-32 border-0 shadow-none focus-visible:ring-0" placeholder={ev ? "What will attendees do and learn?" : "Write the full announcement…"}/>
            </div>
          </FormField>
          <FormField label={ev ? "Cover image" : "Attached image (optional)"}>
            <label className="upload-zone flex cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center">
              {img ? <img src={img} alt="Preview" className="max-h-40 rounded-md object-cover"/> : null}
              <ImagePlus className="size-8 text-primary"/>
              <span className="text-sm font-semibold">Click to upload</span>
              <span className="text-xs text-muted-foreground">PNG or JPG, up to 5 MB</span>
            </label>
            <input type="file" accept="image/*" className="sr-only" onChange={e => {
              const f = e.target.files?.[0];
              if (f) setImg(URL.createObjectURL(f));
            }}/>
          </FormField>
          <label className="flex items-center justify-between rounded-md border border-border p-4">
            <span>
              <strong className="block text-sm">Publish immediately</strong>
              <small className="text-muted-foreground">{publish ? "Visible to your audience as soon as you save." : "Saved as a draft only admins can see."}</small>
            </span>
            <button type="button" role="switch" aria-checked={publish} onClick={() => setPublish(!publish)} className={cn("relative h-6 w-11 rounded-full transition-colors", publish ? "bg-primary" : "bg-muted")}>
              <span className={cn("absolute top-0.5 size-5 rounded-full bg-background shadow transition-all", publish ? "left-[22px]" : "left-0.5")}/>
            </button>
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => save(true)} disabled={loading}>
            Save draft
          </Button>
          <Button onClick={() => save(false)} disabled={loading}>
            {publish ? "Publish" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
type RegistrantRow = {
  id: string;
  registered_at: string;
  student: { full_name: string | null; email: string | null }[] | null;
};

function Registrants() {
  const [registrants, setRegistrants] = useState<RegistrantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistrants();
  }, []);

  const fetchRegistrants = async () => {
    try {
      // For now, we'll get registrants for a specific event (Innovation Week)
      // In a real app, this might be parameterized or we might show registrants for all events
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          registered_at,
          student:users!event_registrations_student_id_fkey (
            full_name,
            email
          )
        `)
        .eq('event_id', 'innovation-week-2026') // This would need to be the actual event ID
        .order('registered_at', { ascending: true });

      if (error) throw error;
      setRegistrants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load registrants');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CampusPage page="registrants" />;
  if (error) return <CampusPage page="registrants" >Error loading registrants: {error}</CampusPage>;

  return (
    <AppShell role="admin" title="Innovation Week registrants" subtitle={`${registrants.length} of 60 seats filled.`} actions={<Button onClick={()=>toast.success("Registrant list downloaded")}><Download/>Export list</Button>}>
      <Filters search="Search registered students" extra={false}/>
      <div className="table-shell">
        {registrants.map((reg, i)=><div className="data-grid-row md:grid-cols-3" key={reg.id}>
          <strong>{reg.student?.[0]?.full_name}</strong>
          <span>{reg.student?.[0]?.email}</span>
          <span>{new Date(reg.registered_at).toLocaleDateString()}</span>
        </div>)}
      </div>
    </AppShell>
  );
}
function MyEvents(){const [rows,setRows]=useState<EventRow[]>([]);const [loading,setLoading]=useState(true);const {user}=useUser();useEffect(()=>{if(!user){setLoading(false);return}void (async()=>{try{const {data,error}=await supabase.from("events").select("id, title, description, category, location, start_time, end_time, capacity, cover_image_url, created_by, created_at").eq("created_by",user.id).order("start_time",{ascending:true});if(error)throw error;setRows(data??[])}catch{setRows([])}finally{setLoading(false)}})()},[user]);if(loading)return <AppShell role="student" title="My events" subtitle="Review and manage your registrations."><div className="section-panel p-0 py-8 text-center text-muted-foreground">Loading your events…</div></AppShell>;if(!rows.length)return <AppShell role="student" title="My events" subtitle="Review and manage your registrations." actions={<Button asChild><Link href="/events"><Plus/>Browse events</Link></Button>}><EmptyState title="You're not registered for any events" text="Browse campus events and register for the ones you want to attend."/></AppShell>;return <AppShell role="student" title="My events" subtitle="Review and manage your registrations."><div className="space-y-4">{rows.map((e,i)=>{const startsAt=new Date(e.start_time);const past=startsAt.getTime()<Date.now();return <div className="content-card flex flex-col justify-between gap-4 sm:flex-row sm:items-center" key={e.id}><div className="flex items-center gap-4"><span className="grid size-14 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary">{startsAt.toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span><div><h2 className="font-bold">{e.title}</h2><p className="mt-1 text-sm text-muted-foreground">{startsAt.toLocaleString()} · {e.location}</p></div></div><div className="flex items-center gap-3"><StatusBadge status={past?"Past":"Upcoming"}/>{!past&&<Button variant="outline" onClick={()=>toast.success("Registration cancelled")}>Cancel registration</Button>}</div></div>})}</div></AppShell>}
function AccessDenied(){return <div className="grid min-h-screen place-items-center bg-app px-5"><div className="max-w-md text-center"><span className="mx-auto grid size-20 place-items-center rounded-full bg-danger-soft text-danger"><LockKeyhole className="size-9"/></span><h1 className="mt-6 text-3xl font-bold">Access denied</h1><p className="mt-3 text-muted-foreground">Your account doesn’t have permission to view this area. Return to your dashboard to continue.</p><Button className="mt-7" asChild><Link href="/dashboard">Back to dashboard</Link></Button></div></div>}
/**
 * Shell configuration for routes that supply their own body via `children`
 * instead of rendering one of the built-in page components above.
 */
const pageShells: Record<string, { role: Role; title: string; subtitle?: string }> = {
  "concern-new": { role: "student", title: "Submit a concern", subtitle: "Tell us what happened and the right team will follow up." },
  "concern-detail": { role: "student", title: "Concern", subtitle: "Track this request from submission to resolution." },
  "lost-new": { role: "student", title: "Report a lost or found item", subtitle: "Help reunite campus items with their owners." },
  "staff-concern-detail": { role: "staff", title: "Concern", subtitle: "Review, update, and respond to this concern." },
  "admin-announcements": { role: "admin", title: "Manage announcements", subtitle: "Review and manage announcements across campus." },
};

export function CampusPage({ page, children }: { page: PageKey; children?: ReactNode }) {
  if (children !== undefined) {
    const shell = pageShells[page] ?? { role: "student" as Role, title: "CampusConnect" };
    return (
      <AppShell role={shell.role} title={shell.title} {...(shell.subtitle ? { subtitle: shell.subtitle } : {})}>
        {children}
      </AppShell>
    );
  }
  if(page==="forgot")return <ForgotPassword/>; if(page==="login")return <AuthPage/>; if(page==="signup")return <AuthPage signup/>; if(page==="announcements")return <PublicList/>; if(page==="events")return <PublicList eventsPage/>; if(page==="dashboard")return <StudentDashboard/>; if(page==="announcement-detail")return <AnnouncementDetail/>; if(page==="event-detail")return <EventDetail/>; if(page==="my-events")return <MyEvents/>; if(page==="concern-new")return <FormPage/>; if(page==="concern-detail")return <Thread/>; if(page==="lost-new")return <FormPage lost/>; if(page==="lost-found")return <LostFound/>; if(page==="lost-detail")return <LostDetail/>; if(page==="profile")return <Profile/>; if(page==="notifications")return <Notifications/>; if(page==="staff-dashboard")return <StaffDashboard/>; if(page==="staff-concerns")return <AppShell role="staff" title="All concerns" subtitle="Review, update, and respond to student concerns."><Filters search="Search concerns"/><ConcernsTable staff/></AppShell>; if(page==="staff-concern-detail")return <Thread staff/>; if(page==="staff-lost")return <StaffLost/>; if(page==="admin-dashboard")return <AdminDashboard/>; if(page==="admin-announcements")return <AdminList kind="announcements"/>; if(page==="admin-events")return <AdminList kind="events"/>; if(page==="admin-concerns")return <AdminList kind="concerns"/>; if(page==="admin-lost")return <AdminList kind="lost"/>; if(page==="admin-users")return <AdminList kind="users"/>; if(page==="registrants")return <Registrants/>; if(page==="reports")return <AdminDashboard reports/>; if(page==="denied")return <AccessDenied/>; if(page==="concerns")return <AppShell role="student" title="My concerns" subtitle="Track every request from submission to resolution." actions={<Button asChild><Link href="/concerns/new"><Plus/>Submit concern</Link></Button>}><Filters search="Search my concerns"/><ConcernsTable/></AppShell>;
  return <Landing/>;
}
