"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import type { ApiMessage } from "@/lib/types/api";
import { io, type Socket } from "socket.io-client";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/ToastProvider";
import { getErrorMessage } from "@/lib/utils/errors";
import { getPublicBackendUrl } from "@/lib/config/public-env";
import { getPaginatedItems } from "@/lib/api/pagination";
import { registerMessagesSocketDisconnect } from "@/lib/socket/messages-socket";

type SocketMessagePayload = Partial<ApiMessage> & {
  message?: string;
  recipientId?: string;
};

type SocketStatus = "idle" | "connecting" | "connected" | "error";

function normalizeSocketMessage(payload: SocketMessagePayload): ApiMessage {
  return {
    id: payload.id || `${payload.senderId}-${payload.receiverId || payload.recipientId}-${Date.now()}`,
    senderId: payload.senderId || "",
    receiverId: payload.receiverId || payload.recipientId || "",
    content: payload.content || payload.message || "",
    createdAt: payload.createdAt || new Date().toISOString(),
    isRead: payload.isRead ?? false,
    readAt: payload.readAt ?? null,
    unreadCount: payload.unreadCount,
    sender: payload.sender,
    receiver: payload.receiver,
  };
}

export default function Messages() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const [conversations, setConversations] = useState<ApiMessage[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [conversationError, setConversationError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("idle");
  const [socketError, setSocketError] = useState("");
  const [socketRetryKey, setSocketRetryKey] = useState(0);
  const currentUserIdRef = useRef<string | null>(null);
  const selectedUserIdRef = useRef<string | null>(null);
  const initialTargetLoadedRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketErrorNotifiedRef = useRef(false);

  useEffect(() => {
    currentUserIdRef.current = user?.id || null;
  }, [user?.id]);

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  useEffect(
    () =>
      registerMessagesSocketDisconnect(() => {
        socketRef.current?.disconnect();
        socketRef.current = null;
        setSocketStatus("idle");
      }),
    [],
  );

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setConversationError("");
    try {
      const { data } = await apiClient.get("/messages/conversations");
      setConversations(getPaginatedItems<ApiMessage>(data));
    } catch (error) {
      setConversationError(
        getErrorMessage(error, "Failed to fetch conversations."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push("/login");
      return;
    }
    void fetchConversations();
  }, [isHydrated, user, router, fetchConversations]);

  const getOtherUserId = useCallback(
    (message: ApiMessage) =>
      message.senderId === currentUserIdRef.current
        ? message.receiverId
        : message.senderId,
    [],
  );

  const markLocalConversationRead = useCallback(
    (otherId: string) => {
      const readAt = new Date().toISOString();
      setConversations((current) =>
        current.map((conv) =>
          getOtherUserId(conv) === otherId
            ? { ...conv, isRead: true, readAt, unreadCount: 0 }
            : conv,
        ),
      );
      setMessages((current) =>
        current.map((msg) =>
          msg.senderId === otherId && msg.receiverId === currentUserIdRef.current
            ? { ...msg, isRead: true, readAt }
            : msg,
        ),
      );
    },
    [getOtherUserId],
  );

  const markLocalConversationUnread = useCallback(
    (otherId: string) => {
      setConversations((current) =>
        current.map((conv) =>
          getOtherUserId(conv) === otherId
            ? { ...conv, isRead: false, readAt: null, unreadCount: 1 }
            : conv,
        ),
      );
      setMessages((current) =>
        current.map((msg) =>
          msg.senderId === otherId && msg.receiverId === currentUserIdRef.current
            ? { ...msg, isRead: false, readAt: null }
            : msg,
        ),
      );
    },
    [getOtherUserId],
  );

  const markConversationRead = useCallback(
    async (otherId: string) => {
      try {
        await apiClient.post(`/messages/conversation/${otherId}/read`);
        markLocalConversationRead(otherId);
      } catch (error) {
        notify(getErrorMessage(error, "Failed to mark conversation as read."), "error");
      }
    },
    [markLocalConversationRead, notify],
  );

  const markConversationUnread = useCallback(
    async (otherId: string) => {
      try {
        await apiClient.post(`/messages/conversation/${otherId}/unread`);
        markLocalConversationUnread(otherId);
      } catch (error) {
        notify(getErrorMessage(error, "Failed to mark conversation as unread."), "error");
      }
    },
    [markLocalConversationUnread, notify],
  );

  const appendMessage = useCallback(
    (payload: SocketMessagePayload) => {
      const message = normalizeSocketMessage(payload);
      const otherId = getOtherUserId(message);
      const isSelectedConversation = selectedUserIdRef.current === otherId;
      const isIncoming = message.receiverId === currentUserIdRef.current;
      const displayMessage =
        isIncoming && isSelectedConversation
          ? { ...message, isRead: true, readAt: new Date().toISOString() }
          : message;

      setConversations((current) => {
        const existing = current.find((conv) => getOtherUserId(conv) === otherId);
        const unreadCount =
          isIncoming && !isSelectedConversation
            ? (existing?.unreadCount || 0) + 1
            : existing?.unreadCount || displayMessage.unreadCount || 0;

        return [
          {
            ...displayMessage,
            unreadCount: isIncoming && isSelectedConversation ? 0 : unreadCount,
          },
          ...current.filter((conv) => getOtherUserId(conv) !== otherId),
        ];
      });

      if (isSelectedConversation) {
        setMessages((current) =>
          current.some((existing) => existing.id === displayMessage.id)
            ? current
            : [...current, displayMessage],
        );
      }

      if (isIncoming && isSelectedConversation) {
        void apiClient
          .post(`/messages/conversation/${otherId}/read`)
          .then(() => markLocalConversationRead(otherId))
          .catch(() => undefined);
      }
    },
    [getOtherUserId, markLocalConversationRead],
  );

  useEffect(() => {
    if (!isHydrated || !user) {
      setSocketStatus("idle");
      return;
    }

    let disconnected = false;
    setSocketStatus("connecting");
    setSocketError("");

    const socket = io(getPublicBackendUrl(), {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    socketRef.current = socket;

    const handleConnect = () => {
      if (disconnected) return;
      socketErrorNotifiedRef.current = false;
      setSocketStatus("connected");
      setSocketError("");
    };

    const handleConnectError = (error: Error) => {
      if (disconnected) return;
      setSocketStatus("error");
      setSocketError(error.message || "Messaging connection failed.");
      if (!socketErrorNotifiedRef.current) {
        notify("Messaging connection failed. Retrying...", "error");
        socketErrorNotifiedRef.current = true;
      }
    };

    const handleReconnectAttempt = () => {
      if (!disconnected) {
        setSocketStatus("connecting");
      }
    };

    const handleReconnectFailed = () => {
      if (disconnected) return;
      setSocketStatus("error");
      setSocketError("Messaging is offline. Retry when the server is available.");
      notify("Messaging is offline. Retry when the server is available.", "error");
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("new_message", appendMessage);
    socket.on("new-message", appendMessage);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);
    socket.io.on("reconnect_failed", handleReconnectFailed);

    return () => {
      disconnected = true;
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("new_message", appendMessage);
      socket.off("new-message", appendMessage);
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
      socket.io.off("reconnect_failed", handleReconnectFailed);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [appendMessage, isHydrated, notify, socketRetryKey, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, selectedUserId]);

  const fetchMessages = useCallback(async (otherId: string) => {
    setMessageError("");
    try {
      const { data } = await apiClient.get(`/messages/conversation/${otherId}`);
      const loadedMessages = getPaginatedItems<ApiMessage>(data).map((msg) =>
        msg.senderId === otherId && msg.receiverId === currentUserIdRef.current
          ? { ...msg, isRead: true, readAt: msg.readAt || new Date().toISOString() }
          : msg,
      );
      setMessages(loadedMessages);
      await markConversationRead(otherId);
    } catch (error) {
      setMessageError(getErrorMessage(error, "Failed to fetch messages."));
    }
  }, [markConversationRead]);

  useEffect(() => {
    if (!isHydrated || !user || initialTargetLoadedRef.current) return;

    const targetUserId = new URLSearchParams(window.location.search).get("userId");
    initialTargetLoadedRef.current = true;
    if (!targetUserId || targetUserId === user.id) return;

    setSelectedUserId(targetUserId);
    void fetchMessages(targetUserId);
  }, [fetchMessages, isHydrated, user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;

    try {
      const { data } = await apiClient.post<ApiMessage>("/messages", {
        receiverId: selectedUserId,
        content: newMessage,
      });
      setNewMessage("");
      appendMessage(data);
    } catch (error) {
      notify(getErrorMessage(error, "Failed to send message."), "error");
    }
  };

  const selectedConversation = selectedUserId
    ? conversations.find((conv) => getOtherUserId(conv) === selectedUserId)
    : undefined;
  const selectedUnreadCount = selectedConversation
    ? selectedConversation.unreadCount ||
      (selectedConversation.receiverId === user?.id &&
      selectedConversation.isRead === false
        ? 1
        : 0)
    : 0;

  if (!isHydrated || loading) return <LoadingState rows={5} />;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-7xl flex-col px-4 py-8">
      <h1 className="text-4xl mb-6">Messages</h1>

      {socketStatus === "error" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{socketError || "Messaging connection failed."}</span>
          <button
            type="button"
            onClick={() => setSocketRetryKey((current) => current + 1)}
            className="rounded-full border border-red-300 px-3 py-1 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-6 overflow-hidden md:flex-row">
        <div className="max-h-72 w-full overflow-y-auto border-b pb-4 md:max-h-none md:w-80 md:border-b-0 md:border-r md:pb-0">
          {conversationError ? (
            <ErrorState
              className="mr-4"
              message={conversationError}
              onRetry={fetchConversations}
            />
          ) : conversations.length === 0 ? (
            <p className="text-gray-500 py-4">No conversations yet</p>
          ) : (
            conversations.map((conv) => {
              const otherId = getOtherUserId(conv);
              const otherName = conv.senderId === user?.id ? conv.receiver?.name : conv.sender?.name;
              const unreadCount =
                conv.unreadCount ||
                (conv.receiverId === user?.id && conv.isRead === false ? 1 : 0);
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedUserId(otherId);
                    void fetchMessages(otherId);
                  }}
                  className={`w-full p-4 text-left border-b hover:bg-gray-50 transition ${
                    selectedUserId === otherId ? "bg-[var(--accent)]/10" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{otherName || "User"}</h3>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conv.content}</p>
                  <p className="text-xs text-gray-400">{new Date(conv.createdAt).toLocaleString()}</p>
                </button>
              );
            })
          )}
        </div>

        <div className="flex min-h-[32rem] flex-1 flex-col">
          {selectedUserId ? (
            <>
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    selectedUnreadCount > 0
                      ? void markConversationRead(selectedUserId)
                      : void markConversationUnread(selectedUserId)
                  }
                  className="rounded-full border border-black/10 px-3 py-1 text-sm font-semibold hover:bg-gray-50"
                >
                  {selectedUnreadCount > 0 ? "Mark all read" : "Mark unread"}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-white/60 rounded-lg mb-4 p-6 space-y-4">
                {messageError ? (
                  <ErrorState
                    message={messageError}
                    onRetry={() => fetchMessages(selectedUserId)}
                  />
                ) : messages.length === 0 ? (
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
                <div ref={messagesEndRef} />
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
