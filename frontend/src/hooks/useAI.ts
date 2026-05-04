import { useCallback } from "react";
import { api } from "@/lib/api";
import i18n from "@/i18n";
import { buildApiUrl } from "@/lib/server-url";
import { useAuthStore } from "@/stores/auth";
import { useAIStore } from "@/stores/ai";

export function useLoadConversations() {
  const activeConversationId = useAIStore((s) => s.activeConversationId);
  const setConversations = useAIStore((s) => s.setConversations);
  const setActiveConversation = useAIStore((s) => s.setActiveConversation);
  const setMessages = useAIStore((s) => s.setMessages);
  return useCallback(async () => {
    const { data } = await api.get("/api/v1/ai/conversations");
    const list = data ?? [];
    setConversations(list);

    if (list.length === 0) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    const hasActive = activeConversationId != null && list.some((item: { id: number }) => item.id === activeConversationId);
    if (!hasActive) {
      setActiveConversation(list[0].id);
    }
  }, [activeConversationId, setActiveConversation, setConversations, setMessages]);
}

export function useCreateConversation() {
  const setConversations = useAIStore((s) => s.setConversations);
  const setActiveConversation = useAIStore((s) => s.setActiveConversation);
  const setMessages = useAIStore((s) => s.setMessages);
  return useCallback(async (title = i18n.t("ai.newChat")) => {
    const { data } = await api.post("/api/v1/ai/conversations", { title });
    const { data: list } = await api.get("/api/v1/ai/conversations");
    setConversations(list ?? []);
    setActiveConversation(data.id);
    setMessages([]);
    return data.id as number;
  }, [setActiveConversation, setConversations, setMessages]);
}

export function useLoadMessages() {
  const setMessages = useAIStore((s) => s.setMessages);
  return useCallback(async (conversationId: number) => {
    const { data } = await api.get(
      `/api/v1/ai/conversations/${conversationId}/messages`,
    );
    setMessages(data ?? []);
  }, [setMessages]);
}

export function useDeleteConversation() {
  const setConversations = useAIStore((s) => s.setConversations);
  const setActiveConversation = useAIStore((s) => s.setActiveConversation);
  const setMessages = useAIStore((s) => s.setMessages);
  return useCallback(async (id: number) => {
    const activeConversationId = useAIStore.getState().activeConversationId;
    await api.delete(`/api/v1/ai/conversations/${id}`);
    const { data: list } = await api.get("/api/v1/ai/conversations");
    setConversations(list ?? []);

    if (activeConversationId !== id) {
      return;
    }

    setActiveConversation(list?.[0]?.id ?? null);
    setMessages([]);
  }, [setActiveConversation, setConversations, setMessages]);
}

export function sendMessage(conversationId: number, message: string) {
  const store = useAIStore.getState();
  const token = useAuthStore.getState().token;
  const appendError = (content: string) => {
    useAIStore.getState().appendToLastMessage(`\n\n${i18n.t("ai.errorPrefix", { error: content })}`);
  };
  const handleEventLine = (line: string) => {
    if (!line.startsWith("data: ")) return;

    try {
      const event = JSON.parse(line.slice(6));
      if (event.type === "content") {
        useAIStore.getState().appendToLastMessage(event.content);
      } else if (event.type === "error") {
        appendError(event.content);
      }
    } catch {
      /* skip malformed SSE */
    }
  };

  store.addMessage({ role: "user", content: message });
  store.addMessage({ role: "assistant", content: "" });
  store.setStreaming(true);

  if (!token) {
    appendError(i18n.t("ai.authRequired"));
    store.setStreaming(false);
    return;
  }

  fetch(buildApiUrl(`/api/v1/ai/conversations/${conversationId}/chat`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  })
    .then(async (resp) => {
      if (!resp.ok || !resp.body) {
        appendError(i18n.t("ai.connectionFailed"));
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
          handleEventLine(line);
        }
      }

      if (buffer) {
        handleEventLine(buffer);
      }
    })
    .catch((err) => {
      appendError(err instanceof Error ? err.message : String(err));
    })
    .finally(() => {
      useAIStore.getState().setStreaming(false);
    });
}
