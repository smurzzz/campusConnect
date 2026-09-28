"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CampusPage } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Send } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/campus-page";
import { toast } from "sonner";

export default function ConcernDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const [concern, setConcern] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyLoading, setReplyLoading] = useState(false);
  // Controlled rather than ref-based: reading `ref.current` during render to
  // decide whether the send button is enabled meant the button never re-rendered
  // as the user typed, so it stayed disabled.
  const [reply, setReply] = useState("");

  useEffect(() => {
    if (!id || !user) {
      setError("Missing concern ID or user not authenticated");
      setLoading(false);
      return;
    }
    fetchConcern(user.id);
    fetchMessages();
  }, [id, user]);

  const fetchConcern = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('concerns')
        .select(`
          id,
          subject,
          category,
          description,
          status,
          created_at,
          student_id,
          assigned_to,
          attachment_url,
          student:users!concerns_student_id_fkey (full_name, email),
          assignee:users!concerns_assigned_to_fkey (full_name)
        `)
        .eq('id', id)
        .eq('student_id', studentId) // Ensure the concern belongs to the current student
        .single();

      if (error) throw error;
      if (!data) {
        setError("Concern not found or access denied");
        setLoading(false);
        return;
      }
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

  const handleReplySubmit = async () => {
    const text = reply.trim();
    if (!text || !concern || !user) return;
    setReplyLoading(true);
    try {
      const { error } = await supabase
        .from('concern_messages')
        .insert({
          concern_id: id,
          sender_id: user.id,
          message: text,
        });

      if (error) throw error;
      setReply("");
      // Refetch messages to include the new one
      await fetchMessages();
      toast.success("Reply sent");
    } catch (err) {
      toast.error("Failed to send reply");
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading) return <CampusPage page="concern-detail" />;
  if (error) return <CampusPage page="concern-detail" >{error}</CampusPage>;
  if (!concern) return <CampusPage page="concern-detail" >Concern not found</CampusPage>;

  return (
    <CampusPage page="concern-detail">
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
              <p className="text-base">{new Date(concern.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assigned to</p>
              <p className="text-base">
                {concern.assignee?.[0]?.full_name ?? 'Unassigned'}
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
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                disabled={replyLoading || !reply.trim()}
                onClick={handleReplySubmit}
                className="w-[120px]"
              >
                {replyLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2"/>
                    Send Reply
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </CampusPage>
  );
}