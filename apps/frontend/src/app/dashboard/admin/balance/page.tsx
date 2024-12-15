"use client";
import { useCallback, useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
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

interface UserBalance { id: string; name: string; email: string; role: string; balance?: number; }
const USER_PAGE_SIZE = 20;

export default function BalancePage() {
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const router = useRouter();
  const [users, setUsers] = useState<UserBalance[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(USER_PAGE_SIZE),
      });
      if (search.trim()) params.set("search", search.trim());

      const { data } = await apiClient.get(`/admin/users?${params.toString()}`);
      setUsers(getPaginatedItems<UserBalance>(data));
      setPaginationMeta(getPaginationMeta<UserBalance>(data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => {
    if (!isHydrated) return;
    
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    void fetchUsers();
  }, [user, isHydrated, router, fetchUsers]);

  const handleAdjustment = async (type: "CREDIT" | "DEBIT") => {
    if (!selectedUserId || !amount) {
      notify("Select a user and amount.", "error");
      return;
    }

    try {
      await apiClient.post("/admin/manage-balance", {
        userId: selectedUserId,
        amount,
        type,
        reason: reason || "Admin adjustment",
      });
      notify(`Balance ${type === "CREDIT" ? "credited" : "debited"}.`, "success");
      setAmount(0);
      setReason("");
      setSelectedUserId("");
      void fetchUsers();
    } catch (error) {
      notify(getErrorMessage(error, "Failed to update balance"), "error");
    }
  };

  if (!isHydrated) {
    return <LoadingState />;
  }

  if (loading) return <LoadingState rows={4} />;

  const selectedUser = users.find((candidate) => candidate.id === selectedUserId);
  const totalItems = paginationMeta?.totalItems ?? users.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Balance Management</h1>
      {error ? (
        <ErrorState className="mt-6" message={error} onRetry={fetchUsers} />
      ) : (
      <div className="card p-6 mt-6">
        <form
          className="mb-4 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setCurrentPage(1);
            setSearch(searchDraft);
          }}
        >
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search users by name or email"
            className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2"
          />
          <button type="submit" className="btn-secondary">
            Search
          </button>
        </form>
        <div className="grid md:grid-cols-4 gap-4">
          <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="rounded-xl border border-black/10 px-3 py-2">
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
          <input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Amount" className="rounded-xl border border-black/10 px-3 py-2" />
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="rounded-xl border border-black/10 px-3 py-2" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleAdjustment("CREDIT")}
              className="btn-primary"
            >
              Credit
            </button>
            <button
              type="button"
              onClick={() => void handleAdjustment("DEBIT")}
              className="btn-secondary"
            >
              Debit
            </button>
          </div>
        </div>
        {selectedUser && (
          <div className="mt-4 rounded-lg bg-[var(--muted)] px-4 py-3 text-sm text-[var(--ink)]">
            Current balance for {selectedUser.name}: $
            {Number(selectedUser.balance || 0).toFixed(2)}
          </div>
        )}
        <PaginationControls
          currentPage={currentPage}
          itemLabel="users"
          pageSize={USER_PAGE_SIZE}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
      )}
    </div>
  );
}
