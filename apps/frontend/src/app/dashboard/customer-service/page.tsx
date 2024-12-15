"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import Link from "next/link";
import { useToast } from "@/components/ui/ToastProvider";
import { getErrorMessage } from "@/lib/utils/errors";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  issueType: string;
  createdAt: string;
  userId: string;
}

const TICKET_PAGE_SIZE = 8;

export default function CustomerServiceDashboard() {
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    issueType: "GENERAL",
    subject: "",
    description: "",
    priority: "MEDIUM",
  });
  const loadTickets = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError("");
    try {
      const endpoint =
        user.role === "ADMIN" || user.role === "CUSTOMER_SERVICE"
          ? "/tickets"
          : "/tickets/my";
      const { data } = await apiClient.get(
        `${endpoint}?page=${currentPage}&pageSize=${TICKET_PAGE_SIZE}`,
      );
      setTickets(getPaginatedItems<Ticket>(data));
      setPaginationMeta(getPaginationMeta<Ticket>(data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load tickets."));
    } finally {
      setLoading(false);
    }
  }, [currentPage, user]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push("/login");
      return;
    }
    void loadTickets();
  }, [user, isHydrated, router, loadTickets]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/tickets", formData);
      setFormData({ issueType: "GENERAL", subject: "", description: "", priority: "MEDIUM" });
      setShowForm(false);
      setCurrentPage(1);
      notify("Support ticket created.", "success");
      void loadTickets();
    } catch (error) {
      notify(getErrorMessage(error, "Failed to create ticket."), "error");
    }
  };

  if (!isHydrated) {
    return <LoadingState />;
  }

  if (loading) return <LoadingState rows={4} />;

  const totalItems = paginationMeta?.totalItems ?? tickets.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-semibold mb-8">Customer Support</h1>

      {!showForm && user?.role !== "CUSTOMER_SERVICE" && user?.role !== "ADMIN" ? (
        <button onClick={() => setShowForm(true)} className="btn-primary mb-6">
          Create New Ticket
        </button>
      ) : showForm ? (
        <div className="card p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Create Support Ticket</h2>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <select
              value={formData.issueType}
              onChange={(e) => setFormData({ ...formData, issueType: e.target.value })}
              className="w-full rounded-xl border border-black/10 px-4 py-2"
            >
              <option value="ORDER">Order Issue</option>
              <option value="PRODUCT">Product Issue</option>
              <option value="PAYMENT">Payment Issue</option>
              <option value="COMPLAINT">Complaint</option>
              <option value="GENERAL">General</option>
            </select>

            <input
              type="text"
              placeholder="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full rounded-xl border border-black/10 px-4 py-2"
              required
            />

            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl border border-black/10 px-4 py-2 h-32"
              required
            />

            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full rounded-xl border border-black/10 px-4 py-2"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                Submit Ticket
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {error ? (
        <ErrorState className="mt-6" message={error} onRetry={loadTickets} />
      ) : (
      <div className="card p-6">
        <h2 className="text-2xl font-semibold mb-6">Your Tickets</h2>
        {tickets.length === 0 ? (
          <p className="text-gray-500">No tickets yet.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Link key={ticket.id} href={`/dashboard/customer-service/${ticket.id}`}>
                <div className="p-4 border border-black/10 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{ticket.subject}</h3>
                      <p className="text-sm text-gray-600">{ticket.description.substring(0, 100)}...</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`badge ${ticket.status === "RESOLVED" ? "badge-success" : "badge-warning"}`}>
                        {ticket.status}
                      </span>
                      <p className="text-xs text-gray-600 mt-1">{ticket.priority}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            <PaginationControls
              currentPage={currentPage}
              itemLabel="tickets"
              pageSize={TICKET_PAGE_SIZE}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
      )}
    </div>
  );
}
