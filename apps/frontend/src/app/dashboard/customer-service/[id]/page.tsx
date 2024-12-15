"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter, useParams } from "next/navigation";
import apiClient from "@/lib/api/client";
import type { ApiTicketResponse } from "@/lib/types/api";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/ToastProvider";
import { getErrorMessage } from "@/lib/utils/errors";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  responses: ApiTicketResponse[];
}

export default function TicketDetailPage() {
  const { user } = useAuthStore();
  const { notify } = useToast();
  const router = useRouter();
  const params = useParams();
  const ticketId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;

    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get(`/tickets/${ticketId}`);
      setTicket(data);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load ticket."));
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!user || !ticketId) {
      router.push("/login");
      return;
    }

    void loadTicket();
  }, [ticketId, user, router, loadTicket]);

  const handleAddResponse = async () => {
    if (!responseText.trim()) return;
    try {
      await apiClient.post(`/tickets/${ticketId}/response`, { message: responseText });
      setResponseText("");
      void loadTicket();
    } catch (error) {
      notify(getErrorMessage(error, "Failed to add response."), "error");
    }
  };

  if (loading) return <LoadingState rows={4} />;

  if (error || !ticket) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <ErrorState
          message={error || "Ticket not found."}
          onRetry={loadTicket}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <button onClick={() => router.back()} className="btn-secondary mb-6">&larr; Back</button>

      <div className="card p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-semibold">{ticket.subject}</h1>
            <p className="text-gray-600 mt-2">{ticket.description}</p>
          </div>
          <div className="text-right">
            <span className={`badge ${ticket.status === "RESOLVED" ? "badge-success" : "badge-warning"}`}>
              {ticket.status}
            </span>
            <p className="text-sm text-gray-600 mt-2">{ticket.priority} Priority</p>
          </div>
        </div>
        <p className="text-sm text-gray-500">Created: {new Date(ticket.createdAt).toLocaleString()}</p>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Responses</h2>
        <div className="space-y-4 mb-6">
          {ticket.responses && ticket.responses.length > 0 ? (
            ticket.responses.map((r) => (
              <div key={r.id} className="border border-black/10 p-4 rounded-lg">
                <p className="text-sm text-gray-600">{r.message}</p>
                <p className="text-xs text-gray-500 mt-2">{new Date(r.createdAt).toLocaleString()}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No responses yet.</p>
          )}
        </div>

        <div className="space-y-2">
          <textarea
            placeholder="Add your response..."
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            className="w-full rounded-xl border border-black/10 px-4 py-2 h-24"
          />
          <button onClick={handleAddResponse} className="btn-primary">Send Response</button>
        </div>
      </div>
    </div>
  );
}
