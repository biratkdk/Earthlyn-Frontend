"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import Link from "next/link";

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

export default function CustomerServiceDashboard() {
  const { user, isHydrated } = useAuthStore();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    issueType: "GENERAL",
    subject: "",
    description: "",
    priority: "MEDIUM",
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    loadTickets();
  }, [user, isHydrated]);

  const loadTickets = async () => {
    try {
      const { data } = await apiClient.get("/tickets/my");
      setTickets(data || []);
    } catch (error) {
      console.error("Failed to load tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/tickets", formData);
      setFormData({ issueType: "GENERAL", subject: "", description: "", priority: "MEDIUM" });
      setShowForm(false);
      loadTickets();
    } catch (error) {
      console.error("Failed to create ticket:", error);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  
  if (!isHydrated) {
    return <div className="max-w-7xl mx-auto px-4 py-10">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-semibold mb-8">Customer Support</h1>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-primary mb-6">
          Create New Ticket
        </button>
      ) : (
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
      )}

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
          </div>
        )}
      </div>
    </div>
  );
}




