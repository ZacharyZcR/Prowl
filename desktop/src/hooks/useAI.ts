import { api } from "@/lib/api";
import { buildApiUrl } from "@/lib/request-url";
import { useAuthStore } from "@/stores/auth";
import { useAIStore } from "@/stores/ai";
import { useConnectionStore } from "@/stores/connection";

export function useLoadConversations() {
  const setConversations = useAIStore((s) => s.setConversations);
  return async () => {
    const { data } = await api.get("/api/v1/ai/conversations");
    setConversations(data ?? []);
  };
}

export function useCreateConversation() {
  const setConversations = useAIStore((s) => s.setConversations);
  const setActiveConversation = useAIStore((s) => s.setActiveConversation);
  const setMessages = useAIStore((s) => s.setMessages);
  return async (title = "New Chat") => {
    const { data } = await api.post("/api/v1/ai/conversations", { title });
    const { data: list } = await api.get("/api/v1/ai/conversations");
    setConversations(list ?? []);
    setActiveConversation(data.id);
    setMessages([]);
    return data.id as number;
  };
}

export function useLoadMessages() {
  const setMessages = useAIStore((s) => s.setMessages);
  return async (conversationId: number) => {
    const { data } = await api.get(
      `/api/v1/ai/conversations/${conversationId}/messages`,
    );
    setMessages(data ?? []);
  };
}

export function useDeleteConversation() {
  const setConversations = useAIStore((s) => s.setConversations);
  const setActiveConversation = useAIStore((s) => s.setActiveConversation);
  const setMessages = useAIStore((s) => s.setMessages);
  return async (id: number) => {
    await api.delete(`/api/v1/ai/conversations/${id}`);
    const { data: list } = await api.get("/api/v1/ai/conversations");
    setConversations(list ?? []);
    setActiveConversation(null);
    setMessages([]);
  };
}

export function sendMessage(conversationId: number, message: string) {
  const store = useAIStore.getState();
  const token = useAuthStore.getState().token;
  const serverUrl = useConnectionStore.getState().serverUrl;

  store.addMessage({ role: "user", content: message });
  store.addMessage({ role: "assistant", content: "" });
  store.setStreaming(true);

  fetch(buildApiUrl(`/api/v1/ai/conversations/${conversationId}/chat`, serverUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  })
    .then(async (resp) => {
      if (!resp.ok || !resp.body) {
        useAIStore
          .getState()
          .appendToLastMessage("Error: Failed to connect to AI service");
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "content") {
              useAIStore.getState().appendToLastMessage(event.content);
            } else if (event.type === "error") {
              useAIStore
                .getState()
                .appendToLastMessage(`\n\nError: ${event.content}`);
            }
          } catch {
            /* skip malformed SSE */
          }
        }
      }
    })
    .catch((err) => {
      useAIStore
        .getState()
        .appendToLastMessage(`\n\nError: ${String(err)}`);
    })
    .finally(() => {
      useAIStore.getState().setStreaming(false);
    });
}
