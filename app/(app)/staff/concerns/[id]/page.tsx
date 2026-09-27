import type { Metadata } from "next";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { CampusPage } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Send } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/campus-page";
import { useToast } from "@/hooks/use-toast"; // Assuming we have a toast hook, otherwise use sonner directly

// We'll create a simple toast function if the hook doesn't exist
// For now, we'll import sonner directly
import { toast } from "sonner";

export const metadata: Metadata = {
  title: "Concern — CampusConnect",
  description: "Reply to the student and update the status.",
};

export default function StaffConcernDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [concern, setConcern] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyLoading, setReplyLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Concern ID is missing");
      setLoading(false);
      return;
    }
    fetchConcern();
    fetchMessages();
  }, [id]);

  const fetchConcern = async () => {
    try {
      const { data, error } = await supabase
        .from('concerns')
        .select(`
          id,
          subject,
          category,
          description,
          status,
          submittedAt,
          updatedAt,
          student_id,
          assigned_to,
          attachment_url,
          student:users!concerns_student_id_fkey (full_name, email),
          assignee:users!concerns_assigned_to_fkey (full_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setConcern(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load concern');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('concern_messages')
        .select(`
          id,
          message,
          created_at,
          sender_id,
          sender:users!concern_messages_sender_id_fkey (full_name)
        `)
        .eq('concern_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data);
    } catch (err) {
      // Don't set error for messages as it's not critical
      console.error("Failed to load messages:", err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!concern) return;
    setStatusLoading(true);
    try {
      const { error } = await supabase
        .from('concerns')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      // Update local state
      setConcern(prev => ({ ...prev, status: newStatus }));
      toast.success("Status updated");
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAssignChange = async (assigneeId: string | null) => {
    if (!concern) return;
    setAssignLoading(true);
    try {
      const { error } = await supabase
        .from('concerns')
        .update({ assigned_to: assigneeId })
        .eq('id', id);

      if (error) throw error;
      // Update local state
      setConcern(prev => ({ ...prev, assigned_to: assigneeId }));
      toast.success("Assignee updated");
    } catch (err) {
      toast.error("Failed to update assignee");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleReplySubmit = async (reply: string) => {
    if (!reply.trim() || !concern) return;
    setReplyLoading(true);
    try {
      // Get the current user (staff) ID from Clerk
      const { useUser } = await import("@clerk/nextjs");
      const { user: currentUser } = useUser();

      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from('concern_messages')
        .insert({
          concern_id: id,
          sender_id: currentUser.id,
          message: reply,
        });

      if (error) throw error;
      // Clear the reply textarea (we'll reset the form via ref)
      // And refetch messages
      await fetchMessages();
      toast.success("Reply sent");
    } catch (err) {
      toast.error("Failed to send reply");
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading) return <CampusPage page="staff-concern-detail" />;
  if (error) return <CampusPage page="staff-concern-detail" >{error}</CampusPage>;
  if (!concern) return <CampusPage page="staff-concern-detail" >Concern not found</CampusPage>;

  return (
    <CampusPage page="staff-concern-detail">
      <div className="space-y-6">
        {/* Concern details */}
        <section className="border rounded-lg p-4">
          <h2 className="mb-4 text-lg font-semibold">{concern.subject}</h2>
          <div className="grid gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Category</p>
              <p className="text-base">{concern.category}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <StatusBadge status={concern.status as any} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Submitted</p>
              <p className="text-base">{new Date(concern.submittedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Student</p>
              <p className="text-base truncate">
                {concern.student?.[0]?.full_name} ({concern.student?.[0]?.email})
              </p>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
            <p className="text-base text-muted-foreground">{concern.description}</p>
          </div>
          {concern.attachment_url && (
            <div className="mb-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Attachment</p>
              <a
                href={concern.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View attachment
              </a>
            </div>
          )}
          {/* Action buttons for staff */}
          <div className="flex flex-col sm:flex-row sm:gap-4">
            <div className="flex-1">
              <Label htmlFor="status-update">Update Status</Label>
              <select
                id="status-update"
                className="field-select w-full"
                disabled={statusLoading}
                value={concern.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
              {statusLoading && (
                <span className="ml-2 h-4 w-4 animate-spin">
                  <Loader2 className="h-4 w-4" />
                </span>
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="assignee-update">Assign to</Label>
              <select
                id="assignee-update"
                className="field-select w-full"
                disabled={assignLoading}
                value={concern.assigned_to ?? ""}
                onChange={(e) => handleAssignChange(e.target.value || null)}
              >
                <option value="">Unassigned</option>
                <option value="facilities-team">Facilities Team</option>
                <option value="student-services">Student Services</option>
                <option value="safety-office">Safety Office</option>
                <option value="academic-affairs">Academic Affairs</option>
              </select>
              {assignLoading && (
                <span className="ml-2 h-4 w-4 animate-spin">
                  <Loader2 className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Conversation */}
        <section className="border rounded-lg p-4">
          <h2 className="mb-4 text-lg font-semibold">Conversation</h2>
          {messages.length === 0 ? (
            <p className="text-muted-foreground">No replies yet.</p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                  <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                    {msg.sender?.[0]?.full_name?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{msg.sender?.[0]?.full_name ?? 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-base text-muted-foreground">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-border">
            <Label htmlFor="reply-input">Reply</Label>
            <Textarea
              id="reply-input"
              placeholder="Write your reply..."
              className="min-h-[100px]"
              disabled={replyLoading}
            />
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                disabled={replyLoading || !replyInputRef.current?.value.trim()}
                onClick={() => {
                  const reply = replyInputRef.current?.value.trim();
                  if (reply) {
                    handleReplySubmit(reply);
                    replyInputRef.current.value = "";
                  }
                }}
                className="w-[120px]"
              >
                {replyLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    Sending...
                  </>
                ) : (
                  <Send className="mr-2"/>
                  Send Reply
                )}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </CampusPage>
  );
}

// We'll use a ref for the textarea to clear it after sending
const replyInputRef = useRef<HTMLTextAreaElement>(null);