"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface Conversation {
  id: string;
  otherId: string;
  otherName: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

export default function Messages() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setConversations(data || []);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/messages/${conversationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setMessages(data || []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: selectedConversation,
          content: newMessage,
        }),
      });
      setNewMessage("");
      fetchMessages(selectedConversation);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  if (loading) return <div className="text-center py-20">Loading messages...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 h-screen flex flex-col">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 border-r overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-gray-500 py-4">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedConversation(conv.otherId);
                  fetchMessages(conv.id);
                }}
                className={`w-full p-4 text-left border-b hover:bg-gray-50 transition ${
                  selectedConversation === conv.otherId ? "bg-blue-50 border-l-4 border-blue-600" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold">{conv.otherName}</h3>
                  {conv.unread > 0 && (
                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                      {conv.unread}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                <p className="text-xs text-gray-400">{new Date(conv.lastMessageTime).toLocaleString()}</p>
              </button>
            ))
          )}
        </div>

        {/* Messages Display */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg mb-4 p-6 space-y-4">
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No messages yet. Start the conversation!</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs p-4 rounded-lg ${
                          msg.senderId === user?.id
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-gray-300"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className="text-xs mt-2 opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input Field */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold"
                >
                  Send
                </button>
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
