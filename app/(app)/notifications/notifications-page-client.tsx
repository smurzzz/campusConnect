"use client";

import { useEffect } from "react";

import { CampusPage } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  const { notifications, loading, error, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  useEffect(() => {
    // Document title update for unread count
    const updateTitle = () => {
      document.title = unreadCount > 0
        ? `(${unreadCount}) Notifications — CampusConnect`
        : "Notifications — CampusConnect";
    };

    updateTitle();

    // Update title when unread count changes
    const handler = () => updateTitle();
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [unreadCount]);

  if (loading) return <CampusPage page="notifications" />;
  if (error) return <CampusPage page="notifications" >Error loading notifications: {error}</CampusPage>;

  return (
    <CampusPage page="notifications">
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Notifications</h1>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-medium">
                {unreadCount}
              </span>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={markAllAsRead}
              className="p-1"
              disabled={unreadCount === 0}
            >
              <Bell className="h-4 w-4" />
              <span className="sr-only">Mark all as read</span>
            </Button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
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
                  // Navigate to href if available
                  if (notification.href) {
                    // In a real app, we'd use useRouter() here
                    // For now, we'll just mark as read and let user navigate manually
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
          </div>
        )}
      </div>
    </CampusPage>
  );
}