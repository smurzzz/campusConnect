"use client";

import { CampusPage } from "@/components/campus-page";
import { EventManager } from "@/components/events/event-manager";

export default function AdminEventsPage() {
  return (
    <CampusPage page="admin-events">
      <EventManager />
    </CampusPage>
  );
}
