"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";

export default function Messages() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    try {
      const { data } = await apiClient.get("/messages/conversations");
      setConversations(data || []);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherId: string) => {
    try {
      const { data } = await apiClient.get(`/messages/conversation/${otherId}`);
      setMessages(data || []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;

    try {
      await apiClient.post("/messages", {
        receiverId: selectedUserId,
        content: newMessage,
      });
      setNewMessage("");
      fetchMessages(selectedUserId);
      fetchConversations();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  if (loading) return <div className="text-center py-20">Loading messages...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 h-[calc(100vh-120px)] flex flex-col">
      <h1 className="text-4xl mb-6">Messages</h1>

      <div className="flex gap-6 flex-1 overflow-hidden">
        <div className="w-80 border-r overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-gray-500 py-4">No conversations yet</p>
          ) : (
            conversations.map((conv) => {
              const otherId = conv.senderId === user?.id ? conv.receiverId : conv.senderId;
              const otherName = conv.senderId === user?.id ? conv.receiver?.name : conv.sender?.name;
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedUserId(otherId);
                    fetchMessages(otherId);
                  }}
                  className={`w-full p-4 text-left border-b hover:bg-gray-50 transition ${
                    selectedUserId === otherId ? "bg-[var(--accent)]/10" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{otherName || "User"}</h3>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conv.content}</p>
                  <p className="text-xs text-gray-400">{new Date(conv.createdAt).toLocaleString()}</p>
                </button>
              );
            })
          )}
        </div>

        <div className="flex-1 flex flex-col">
          {selectedUserId ? (
            <>
              <div className="flex-1 overflow-y-auto bg-white/60 rounded-lg mb-4 p-6 space-y-4">
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No messages yet. Start the conversation!</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs p-4 rounded-2xl ${
                          msg.senderId === user?.id
                            ? "bg-[var(--accent)] text-white"
                            : "bg-white border border-black/10"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className="text-xs mt-2 opacity-70">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 rounded-xl border border-black/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
                <button onClick={handleSendMessage} className="btn-primary">Send</button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
